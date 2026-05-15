use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{Emitter, State};
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<AiMessage>,
    stream: bool,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: Option<ChatMessage>,
    delta: Option<ChatDelta>,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatDelta {
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct StreamChunk {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ErrorResponse {
    error: Option<ErrorDetail>,
}

#[derive(Debug, Deserialize)]
struct ErrorDetail {
    message: String,
}

pub struct AiConfig {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
}

impl Default for AiConfig {
    fn default() -> Self {
        Self {
            base_url: std::env::var("LOKI_AI_BASE_URL")
                .unwrap_or_else(|_| "https://api.openai.com/v1".to_string()),
            api_key: std::env::var("LOKI_AI_API_KEY")
                .or_else(|_| std::env::var("OPENAI_API_KEY"))
                .unwrap_or_default(),
            model: std::env::var("LOKI_AI_MODEL")
                .unwrap_or_else(|_| "gpt-4o-mini".to_string()),
        }
    }
}

pub struct AiState {
    pub config: Arc<Mutex<AiConfig>>,
    pub client: reqwest::Client,
}

#[tauri::command]
pub async fn ai_set_config(
    state: State<'_, AiState>,
    base_url: Option<String>,
    api_key: Option<String>,
    model: Option<String>,
) -> Result<(), String> {
    let mut config = state.config.lock().await;
    if let Some(url) = base_url {
        config.base_url = url;
    }
    if let Some(key) = api_key {
        config.api_key = key;
    }
    if let Some(m) = model {
        config.model = m;
    }
    Ok(())
}

#[tauri::command]
pub async fn ai_chat(
    state: State<'_, AiState>,
    messages: Vec<AiMessage>,
    base_url: Option<String>,
    api_key: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let config = state.config.lock().await;
    let base_url = base_url.unwrap_or_else(|| config.base_url.clone());
    let api_key = api_key.unwrap_or_else(|| config.api_key.clone());
    let model = model.unwrap_or_else(|| config.model.clone());
    drop(config);

    let body = ChatCompletionRequest {
        model,
        messages,
        stream: false,
    };

    let resp = state.client
        .post(format!("{}/chat/completions", base_url.trim_end_matches('/')))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        let body_text = resp.text().await.unwrap_or_default();
        let msg = serde_json::from_str::<ErrorResponse>(&body_text)
            .ok()
            .and_then(|e| e.error)
            .map(|e| e.message)
            .unwrap_or_else(|| format!("HTTP {}", status));
        return Err(format!("AI error ({}): {}", status, msg));
    }

    let data: ChatCompletionResponse = resp
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    data.choices
        .first()
        .and_then(|c| c.message.as_ref())
        .map(|m| m.content.clone())
        .ok_or_else(|| "No response from AI".to_string())
}

#[tauri::command]
pub async fn ai_chat_stream(
    app_handle: tauri::AppHandle,
    state: State<'_, AiState>,
    messages: Vec<AiMessage>,
    base_url: Option<String>,
    api_key: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let config = state.config.lock().await;
    let base_url = base_url.unwrap_or_else(|| config.base_url.clone());
    let api_key = api_key.unwrap_or_else(|| config.api_key.clone());
    let model = model.unwrap_or_else(|| config.model.clone());
    drop(config);

    let stream_id = uuid::Uuid::new_v4().to_string();
    let stream_id_clone = stream_id.clone();
    let app_handle_clone = app_handle.clone();
    let client = state.client.clone();

    tokio::spawn(async move {
        let result = do_stream(&app_handle_clone, &stream_id_clone, client, base_url, api_key, model, messages).await;
        if let Err(e) = result {
            let _ = app_handle_clone.emit(
                &format!("ai:error:{}", stream_id_clone),
                e,
            );
        }
    });

    Ok(stream_id)
}

async fn do_stream(
    app_handle: &tauri::AppHandle,
    stream_id: &str,
    client: reqwest::Client,
    base_url: String,
    api_key: String,
    model: String,
    messages: Vec<AiMessage>,
) -> Result<(), String> {
    let body = ChatCompletionRequest {
        model,
        messages,
        stream: true,
    };

    let resp = client
        .post(format!("{}/chat/completions", base_url.trim_end_matches('/')))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        let body_text = resp.text().await.unwrap_or_default();
        let msg = serde_json::from_str::<ErrorResponse>(&body_text)
            .ok()
            .and_then(|e| e.error)
            .map(|e| e.message)
            .unwrap_or_else(|| format!("HTTP {}", status));
        return Err(format!("AI error ({}): {}", status, msg));
    }

    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream error: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(line_end) = buffer.find('\n') {
            let line = buffer[..line_end].trim().to_string();
            buffer = buffer[line_end + 1..].to_string();

            if line.is_empty() {
                continue;
            }
            if line == "data: [DONE]" {
                let _ = app_handle.emit(&format!("ai:done:{}", stream_id), ());
                return Ok(());
            }
            if let Some(data) = line.strip_prefix("data: ") {
                match serde_json::from_str::<StreamChunk>(data) {
                    Ok(chunk) => {
                        if let Some(delta) = chunk
                            .choices
                            .first()
                            .and_then(|c| c.delta.as_ref())
                        {
                            if let Some(ref content) = delta.content {
                                let _ = app_handle.emit(
                                    &format!("ai:chunk:{}", stream_id),
                                    content.clone(),
                                );
                            }
                        }
                    }
                    Err(_) => {
                        // Incomplete JSON — will be recombined on next complete line
                    }
                }
            }
        }
    }

    let _ = app_handle.emit(&format!("ai:done:{}", stream_id), ());
    Ok(())
}
