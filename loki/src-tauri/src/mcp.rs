use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{mpsc, Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::Emitter;

// ── JSON-RPC 2.0 types ──

#[derive(Serialize, Debug)]
struct JsonRpcRequest {
    jsonrpc: &'static str,
    id: u64,
    method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    params: Option<serde_json::Value>,
}

#[derive(Deserialize, Debug)]
struct JsonRpcResponse {
    #[serde(default)]
    id: Option<u64>,
    #[serde(default)]
    result: Option<serde_json::Value>,
    #[serde(default)]
    error: Option<JsonRpcError>,
    // Notification fields (no id, has method)
    #[serde(default)]
    method: Option<String>,
    #[serde(default)]
    params: Option<serde_json::Value>,
}

#[derive(Deserialize, Debug)]
struct JsonRpcError {
    code: i64,
    message: String,
}

// ── Server instance ──

type PendingMap = Arc<Mutex<HashMap<u64, mpsc::Sender<Result<serde_json::Value, String>>>>>;

struct McpServerInstance {
    #[allow(dead_code)]
    id: String,
    child: Arc<Mutex<Child>>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    pending: PendingMap,
    next_id: Arc<Mutex<u64>>,
}

impl Drop for McpServerInstance {
    fn drop(&mut self) {
        let child_arc = self.child.clone();
        let mut child_guard = child_arc.lock().unwrap_or_else(|e| e.into_inner());
        let _ = child_guard.kill();
        drop(child_guard);
        match Arc::try_unwrap(child_arc) {
            Ok(mutex) => {
                let mut child = mutex.into_inner().unwrap_or_else(|e| e.into_inner());
                let (tx, rx) = std::sync::mpsc::channel();
                std::thread::spawn(move || {
                    let _ = child.wait();
                    let _ = tx.send(());
                });
                let _ = rx.recv_timeout(std::time::Duration::from_secs(5));
            }
            Err(_) => {}
        }
    }
}

// ── McpManager ──

pub struct McpManager {
    servers: Arc<Mutex<HashMap<String, McpServerInstance>>>,
}

impl McpManager {
    pub fn new() -> Self {
        Self {
            servers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn start_server(
        &self,
        id: String,
        command: String,
        args: Vec<String>,
        app_handle: tauri::AppHandle,
    ) -> Result<(), String> {
        let mut servers = self.servers.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
        if servers.contains_key(&id) {
            return Err(format!("MCP server '{}' is already running", id));
        }

        let mut child = Command::new(&command)
            .args(&args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn MCP server '{}': {}", id, e))?;

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| format!("No stdin for '{}'", id))?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| format!("No stdout for '{}'", id))?;

        let writer: Box<dyn Write + Send> = Box::new(stdin);
        let writer = Arc::new(Mutex::new(writer));
        let pending: PendingMap = Arc::new(Mutex::new(HashMap::new()));
        let next_id = Arc::new(Mutex::new(1u64));

        // Spawn reader thread (std::thread, NOT tokio::spawn)
        let pending_clone = Arc::clone(&pending);
        let server_id = id.clone();
        let reader = BufReader::new(stdout);
        std::thread::spawn(move || {
            for line in reader.lines() {
                let line = match line {
                    Ok(l) => l,
                    Err(_) => break, // pipe broken, process exited
                };
                if line.trim().is_empty() {
                    continue;
                }
                let response: JsonRpcResponse = match serde_json::from_str(&line) {
                    Ok(r) => r,
                    Err(_) => continue, // skip unparseable lines
                };

                if let Some(response_id) = response.id {
                    // Response to a pending request
                    let mut pending = pending_clone.lock().unwrap_or_else(|e| e.into_inner());
                    if let Some(sender) = pending.remove(&response_id) {
                        if let Some(result) = response.result {
                            let _ = sender.send(Ok(result));
                        } else if let Some(error) = response.error {
                            let _ = sender.send(Err(format!(
                                "MCP error {}: {}",
                                error.code, error.message
                            )));
                        }
                    }
                } else if let Some(ref method) = response.method {
                    // Notification from server
                    let _ = app_handle.emit(
                        &format!("mcp:notification:{}", server_id),
                        serde_json::json!({
                            "method": method,
                            "params": response.params,
                        }),
                    );
                }
            }
        });

        let instance = McpServerInstance {
            id: id.clone(),
            child: Arc::new(Mutex::new(child)),
            writer,
            pending,
            next_id,
        };

        servers.insert(id, instance);
        Ok(())
    }

    pub fn stop_server(&self, id: &str) -> Result<(), String> {
        let mut servers = self.servers.lock().map_err(|e| format!("Lock poisoned: {}", e))?;
        if servers.remove(id).is_some() {
            // Drop triggers kill + wait
            Ok(())
        } else {
            Err(format!("MCP server '{}' not found", id))
        }
    }

    pub fn stop_all(&self) {
        let mut servers = self.servers.lock().unwrap_or_else(|e| e.into_inner());
        servers.clear();
    }

    pub fn list_servers(&self) -> Vec<String> {
        match self.servers.lock() {
            Ok(guard) => guard.keys().cloned().collect(),
            Err(_) => Vec::new(),
        }
    }

    /// Send a JSON-RPC request and block until the response arrives.
    pub fn send_request_blocking(
        &self,
        server_id: &str,
        method: &str,
        params: Option<serde_json::Value>,
    ) -> Result<serde_json::Value, String> {
        let (tx, rx) = mpsc::channel();

        let request_id = {
            let servers = self
                .servers
                .lock()
                .map_err(|e| format!("Lock poisoned: {}", e))?;
            let server = servers
                .get(server_id)
                .ok_or_else(|| format!("MCP server '{}' not found", server_id))?;

            let mut next_id = server
                .next_id
                .lock()
                .map_err(|e| format!("Lock poisoned: {}", e))?;
            let id = *next_id;
            *next_id += 1;

            // Register pending response channel
            server
                .pending
                .lock()
                .map_err(|e| format!("Lock poisoned: {}", e))?
                .insert(id, tx);

            let request = JsonRpcRequest {
                jsonrpc: "2.0",
                id,
                method: method.to_string(),
                params,
            };

            let request_json =
                serde_json::to_string(&request).map_err(|e| format!("Serialize error: {}", e))?;

            let mut writer = server
                .writer
                .lock()
                .map_err(|e| format!("Lock poisoned: {}", e))?;
            writeln!(writer, "{}", request_json)
                .map_err(|e| format!("Write error: {}", e))?;
            writer.flush().map_err(|e| format!("Flush error: {}", e))?;

            id
        };

        // Wait for response (with timeout)
        rx.recv_timeout(Duration::from_secs(30))
            .map_err(|e| {
                // Clean up the pending entry on timeout
                if let Ok(servers) = self.servers.lock() {
                    if let Some(server) = servers.get(server_id) {
                        let _ = server
                            .pending
                            .lock()
                            .unwrap_or_else(|e| e.into_inner())
                            .remove(&request_id);
                    }
                }
                match e {
                    mpsc::RecvTimeoutError::Timeout => {
                        format!("Request to '{}' timed out after 30s", server_id)
                    }
                    mpsc::RecvTimeoutError::Disconnected => {
                        format!("MCP server '{}' disconnected", server_id)
                    }
                }
            })?
    }
}

// ── Tauri commands ──

#[tauri::command]
pub fn mcp_start_server(
    state: tauri::State<'_, crate::AppState>,
    app_handle: tauri::AppHandle,
    id: String,
    command: String,
    args: Vec<String>,
) -> Result<(), String> {
    state.mcp_manager.start_server(id, command, args, app_handle)
}

#[tauri::command]
pub fn mcp_stop_server(
    state: tauri::State<'_, crate::AppState>,
    id: String,
) -> Result<(), String> {
    state.mcp_manager.stop_server(&id)
}

#[tauri::command]
pub fn mcp_list_servers(
    state: tauri::State<'_, crate::AppState>,
) -> Result<Vec<String>, String> {
    Ok(state.mcp_manager.list_servers())
}

#[tauri::command]
pub async fn mcp_send_request(
    state: tauri::State<'_, crate::AppState>,
    server_id: String,
    method: String,
    params: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let manager = Arc::clone(&state.mcp_manager);
    tokio::task::spawn_blocking(move || {
        manager.send_request_blocking(&server_id, &method, params)
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))?
}
