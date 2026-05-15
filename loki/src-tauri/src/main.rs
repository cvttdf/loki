#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod mcp;
mod pty;

use ai::AiState;
use mcp::McpManager;
use pty::PtyManager;
use std::sync::Arc;
use tauri::{Manager, State};
use tokio::sync::Mutex;

struct AppState {
    pty_manager: Arc<PtyManager>,
    mcp_manager: Arc<McpManager>,
}

#[tauri::command]
fn create_pty(
    state: State<AppState>,
    shell: Option<String>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    state.pty_manager.create_pty(shell, app_handle)
}

#[tauri::command]
fn write_pty(state: State<AppState>, id: String, data: Vec<u8>) -> Result<(), String> {
    state.pty_manager.write(&id, data)
}

#[tauri::command]
fn resize_pty(state: State<AppState>, id: String, rows: u16, cols: u16) -> Result<(), String> {
    state.pty_manager.resize(&id, rows, cols)
}

#[tauri::command]
fn kill_pty(state: State<AppState>, id: String) -> Result<(), String> {
    state.pty_manager.kill(&id)
}

#[tauri::command]
fn detect_project(path: String) -> Result<Option<serde_json::Value>, String> {
    let dir = std::path::Path::new(&path);
    if !dir.is_dir() {
        return Ok(None);
    }

    let indicators: Vec<(&str, &str)> = vec![
        ("package.json", "Node.js"),
        ("Cargo.toml", "Rust"),
        ("go.mod", "Go"),
        ("requirements.txt", "Python"),
        ("pyproject.toml", "Python"),
        ("Pipfile", "Python"),
        ("Gemfile", "Ruby"),
        ("pom.xml", "Java"),
        ("build.gradle", "Java"),
        ("build.gradle.kts", "Java"),
        ("CMakeLists.txt", "C/C++"),
        ("Makefile", "C/C++"),
        ("composer.json", "PHP"),
        ("mix.exs", "Elixir"),
        ("pubspec.yaml", "Dart/Flutter"),
        ("tsconfig.json", "TypeScript"),
    ];

    for (file, project_type) in indicators {
        if dir.join(file).exists() {
            let name = dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string();
            return Ok(Some(serde_json::json!({
                "type": project_type,
                "name": name
            })));
        }
    }

    Ok(None)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // 确保主窗口可见
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.show();
                let _ = main_window.set_focus();
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.app_handle().state::<AppState>();
                state.pty_manager.kill_all();
                state.mcp_manager.stop_all();
            }
        })
        .manage(AppState {
            pty_manager: Arc::new(PtyManager::new()),
            mcp_manager: Arc::new(McpManager::new()),
        })
        .manage(AiState {
            config: Arc::new(Mutex::new(ai::AiConfig::default())),
            client: reqwest::Client::new(),
        })
        .invoke_handler(tauri::generate_handler![
            create_pty,
            write_pty,
            resize_pty,
            kill_pty,
            detect_project,
            ai::ai_set_config,
            ai::ai_chat,
            ai::ai_chat_stream,
            mcp::mcp_start_server,
            mcp::mcp_stop_server,
            mcp::mcp_list_servers,
            mcp::mcp_send_request,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
