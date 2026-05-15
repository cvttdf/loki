<p align="center">
  <img src="loki/src-tauri/icons/loki-transparent.svg" width="128" alt="Loki Terminal">
</p>

<h1 align="center">Loki</h1>

<p align="center">
  <strong>Open-source AI terminal — local-first, privacy-friendly, extensible</strong>
</p>

<p align="center">
  <a href="https://github.com/cvttdf/loki/actions/workflows/ci.yml"><img src="https://github.com/cvttdf/loki/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/cvttdf/loki/releases"><img src="https://img.shields.io/github/v/release/cvttdf/loki?include_prereleases" alt="Release"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

---

## Why Loki?

Warp showed what AI-native terminals can do — but it's AGPL, cloud-dependent, and subscription-gated. Loki is the open alternative.

| | **Loki** | Warp | Ghostty | Alacritty |
|---|---|---|---|---|
| License | **MIT** | AGPL | MIT | Apache |
| AI built-in | ✅ | ✅ | ❌ | ❌ |
| Local models (Ollama) | **✅** | ❌ | — | — |
| BYOK (bring your own key) | ✅ | ✅ | — | — |
| Block-based output | ✅ | ✅ | ❌ | ❌ |
| Size | ~15MB | ~100MB | ~5MB | ~5MB |

---

## Features

### 🤖 AI-Native

- **Error analysis** — auto-diagnose failed commands and suggest fixes
- **Command suggestions** — AI-powered completions based on context
- **Context awareness** — AI knows your directory, git status, and project type
- **Multi-model** — OpenAI, Anthropic, DeepSeek, Ollama — switch instantly
- **One-click retry** — re-run failed commands without retyping

### 📦 Block-Based Output

Every command is a self-contained block:
- Click to select · copy · collapse/expand
- In-block search · error highlighting · exit codes
- Virtual scrolling — stays smooth with 1000+ blocks

### 🔒 Privacy First

- **Local models** — Ollama support, your data never leaves your machine
- **BYOK** — use your own API keys, no middleman
- **No telemetry** — zero data collection
- **MIT license** — safe for enterprise use

### 🎨 Beautiful by Default

4 built-in themes: Tokyo Night · Catppuccin Mocha · Nord · GitHub Light. Custom themes supported.

### 🔌 Extensible

- **Plugin system** — event-driven architecture, custom commands
- **MCP protocol** — connect external AI tools and services
- **Config import/export** — backup and restore all settings

---

## Quick Start

### Download

Grab the latest from [Releases](https://github.com/cvttdf/loki/releases):

| Platform | Format |
|----------|--------|
| macOS (Apple Silicon) | `.dmg` |
| Linux | `.AppImage` |
| Windows | `.msi` |

### Build from Source

```bash
# Prerequisites: Node.js 20+, Rust stable

git clone https://github.com/cvttdf/loki.git
cd loki
npm install

# Dev mode (hot reload)
npm run tauri dev

# Build desktop app
npm run tauri build
```

---

## Keyboard Shortcuts

| Action | macOS | Windows / Linux |
|--------|-------|-----------------|
| New tab | `Cmd+T` | `Ctrl+T` |
| Close tab | `Cmd+W` | `Ctrl+W` |
| AI chat | `Cmd+D` | `Ctrl+D` |
| Settings | `Cmd+,` | `Ctrl+,` |
| Switch theme | `Cmd+Shift+T` | `Ctrl+Shift+T` |
| Search blocks | `Cmd+F` | `Ctrl+F` |
| Switch model | `Cmd+M` | `Ctrl+M` |
| Zoom in | `Cmd+=` | `Ctrl+=` |
| Zoom out | `Cmd+-` | `Ctrl+-` |

> All shortcuts are customizable in Settings.

---

## Tech Stack

```
┌─────────────────────────────────────────┐
│           React + TypeScript            │
│    xterm.js · Zustand · Tailwind CSS    │
├─────────────────────────────────────────┤
│             Tauri 2 (IPC)              │
├─────────────────────────────────────────┤
│             Rust Backend               │
│    portable-pty · reqwest · tokio       │
└─────────────────────────────────────────┘
```

---

## Contributing

Contributions welcome! Please read [loki/CONTRIBUTING.md](loki/CONTRIBUTING.md) first.

```bash
# 1. Fork this repo
# 2. Create a feature branch
git checkout -b feat/amazing-feature
# 3. Commit your changes
git commit -m 'feat: add amazing feature'
# 4. Push
git push origin feat/amazing-feature
# 5. Open a PR
```

---

## License

[MIT License](loki/LICENSE) — enterprise-friendly, embeddable anywhere.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/cvttdf">cvttdf</a>
</p>
