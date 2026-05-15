use portable_pty::{Child, CommandBuilder, NativePtySystem, PtySize, PtySystem};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use uuid::Uuid;

/// 单个 PTY 实例
struct PtyInstance {
    #[allow(dead_code)]
    id: String,
    write_tx: mpsc::Sender<Vec<u8>>,
    master: Box<dyn portable_pty::MasterPty + Send>,
    child: Arc<Mutex<Box<dyn Child + Send + Sync>>>,
}

/// PTY 管理器
pub struct PtyManager {
    instances: Arc<Mutex<HashMap<String, PtyInstance>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            instances: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 创建 PTY 并启动读取/写入线程
    pub fn create_pty(
        &self,
        shell: Option<String>,
        app_handle: tauri::AppHandle,
    ) -> Result<String, String> {
        let id = Uuid::new_v4().to_string();

        let shell = shell.unwrap_or_else(|| {
            if cfg!(target_os = "windows") {
                std::env::var("COMSPEC").unwrap_or_else(|_| "powershell.exe".to_string())
            } else {
                std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
            }
        });

        let pty_system = NativePtySystem::default();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to create PTY: {}", e))?;

        let mut cmd = CommandBuilder::new(&shell);
        cmd.cwd(std::env::current_dir().unwrap_or_default());

        let child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn: {}", e))?;
        let child = Arc::new(Mutex::new(child));

        drop(pair.slave);

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone reader: {}", e))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to get writer: {}", e))?;
        let writer = Arc::new(Mutex::new(writer));

        // 写入队列 (使用 std::sync::mpsc，不是 tokio)
        let (write_tx, write_rx) = mpsc::channel::<Vec<u8>>();
        let writer_clone = writer.clone();
        std::thread::spawn(move || {
            while let Ok(data) = write_rx.recv() {
                let mut w = writer_clone.lock().unwrap_or_else(|e| e.into_inner());
                let _ = w.write_all(&data);
                let _ = w.flush();
            }
        });

        // 读取线程
        let id_clone = id.clone();
        let app_handle_clone = app_handle.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 8192];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let data = buf[..n].to_vec();
                        let _ = app_handle_clone.emit(&format!("pty-output:{}", id_clone), data);
                    }
                    Err(_) => break,
                }
            }
            let _ = app_handle_clone.emit(&format!("pty-exit:{}", id_clone), ());
        });

        let instance = PtyInstance {
            id: id.clone(),
            write_tx,
            master: pair.master,
            child,
        };

        self.instances
            .lock()
            .map_err(|e| format!("Lock poisoned: {}", e))?
            .insert(id.clone(), instance);
        Ok(id)
    }

    /// 同步写入 (不再需要 async)
    pub fn write(&self, id: &str, data: Vec<u8>) -> Result<(), String> {
        let instances = self
            .instances
            .lock()
            .map_err(|e| format!("Lock poisoned: {}", e))?;
        let instance = instances.get(id).ok_or("PTY not found")?;
        instance
            .write_tx
            .send(data)
            .map_err(|e| format!("Write error: {}", e))
    }

    /// 调整 PTY 大小
    pub fn resize(&self, id: &str, rows: u16, cols: u16) -> Result<(), String> {
        let instances = self
            .instances
            .lock()
            .map_err(|e| format!("Lock poisoned: {}", e))?;
        let instance = instances.get(id).ok_or("PTY not found")?;
        instance
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Resize failed: {}", e))
    }

    /// Kill all PTY instances — used on app exit
    pub fn kill_all(&self) {
        let mut instances = self.instances.lock().unwrap_or_else(|e| e.into_inner());
        for (_, instance) in instances.drain() {
            let child_arc = instance.child;
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

    /// 销毁 PTY — kill child process then remove from map
    pub fn kill(&self, id: &str) -> Result<(), String> {
        let mut instances = self
            .instances
            .lock()
            .map_err(|e| format!("Lock poisoned: {}", e))?;
        if let Some(instance) = instances.remove(id) {
            let child_arc = instance.child;
            let mut child_guard = child_arc
                .lock()
                .map_err(|e| format!("Lock poisoned: {}", e))?;
            let _ = child_guard.kill();
            drop(child_guard);
            match Arc::try_unwrap(child_arc) {
                Ok(mutex) => {
                    let mut child = mutex.into_inner().map_err(|e| format!("Lock poisoned: {}", e))?;
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
        Ok(())
    }
}

impl Drop for PtyManager {
    fn drop(&mut self) {
        let mut instances = self.instances.lock().unwrap_or_else(|e| e.into_inner());
        for (_, instance) in instances.drain() {
            let child_arc = instance.child;
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
}
