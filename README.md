# Kimi Search MCP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

基于 [Model Context Protocol](https://modelcontextprotocol.io) 的搜索服务，提供网络搜索和网页获取功能。兼容任何支持 MCP 的客户端。

---

**⚠️ 重要声明**

本项目仅供学习研究和技术交流使用。如涉及任何侵权问题，请通过 [GitHub Issues](https://github.com/wys010812/Kimi-Search-MCP/issues) 与我联系，我将第一时间核实并下架处理。

---

## 功能

| 工具 | 功能 |
|------|------|
| `kimi_search` | 单关键词搜索 |
| `kimi_fetch` | 获取单个网页内容 |
| `kimi_batch_search` | 批量多关键词搜索（最多 5 个） |
| `kimi_batch_fetch` | 批量获取多个网页（最多 5 个） |

> 💡 **特色功能**：`kimi_batch_search` 和 `kimi_batch_fetch` 是本项目的扩展功能，原生工具并不支持批量操作。

> ⚠️ **测试状态**
>
> | 客户端 | 测试状态 |
> |--------|----------|
> | Claude Code | ✅ 已测试 |
> | Claude Desktop | ⚠️ 未测试 |
> | OpenCode | ⚠️ 未测试 |
> | Codex | ⚠️ 未测试 |
> | Cline | ⚠️ 未测试 |
> | Continue | ⚠️ 未测试 |
>
> 欢迎提交 Issue 或 PR 分享其他客户端的测试结果。

## 安装

### 1. 获取 API Key

从 KimiCode 获取 API Key（注意：不是 Kimi 开放平台的 Key）

### 2. 构建

```bash
git clone <repository-url>
cd kimi-search-mcp
npm install
npm run build
```

### 3. 添加到客户端

<details>
<summary><b>Claude Code</b></summary>

```bash
# 安装
claude mcp add kimi-search node "$(pwd)/dist/index.js" -e KIMI_CODE_API_KEY=your-api-key

# 验证
claude mcp list

# 卸载
claude mcp remove kimi-search
```
</details>

<details>
<summary><b>Claude Desktop</b></summary>

编辑配置文件：
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "kimi-search": {
      "command": "node",
      "args": ["/path/to/kimi-search-mcp/dist/index.js"],
      "env": {
        "KIMI_CODE_API_KEY": "your-api-key"
      }
    }
  }
}
```
</details>

<details>
<summary><b>OpenCode</b></summary>

编辑 `~/.config/opencode/config.json`：

```json
{
  "mcpServers": {
    "kimi-search": {
      "command": "node",
      "args": ["/path/to/kimi-search-mcp/dist/index.js"],
      "env": {
        "KIMI_CODE_API_KEY": "your-api-key"
      }
    }
  }
}
```
</details>

<details>
<summary><b>Codex (OpenAI)</b></summary>

编辑 `~/.codex/config.json`：

```json
{
  "mcpServers": {
    "kimi-search": {
      "command": "node",
      "args": ["/path/to/kimi-search-mcp/dist/index.js"],
      "env": {
        "KIMI_CODE_API_KEY": "your-api-key"
      }
    }
  }
}
```
</details>

<details>
<summary><b>Cline (VS Code 插件)</b></summary>

在 Cline 设置中找到 "MCP Servers"，添加：

```json
{
  "mcpServers": {
    "kimi-search": {
      "command": "node",
      "args": ["/path/to/kimi-search-mcp/dist/index.js"],
      "env": {
        "KIMI_CODE_API_KEY": "your-api-key"
      },
      "disabled": false
    }
  }
}
```
</details>

<details>
<summary><b>Continue</b></summary>

编辑 `~/.continue/config.json`：

```json
{
  "mcpServers": [
    {
      "name": "kimi-search",
      "command": "node",
      "args": ["/path/to/kimi-search-mcp/dist/index.js"],
      "env": {
        "KIMI_CODE_API_KEY": "your-api-key"
      }
    }
  ]
}
```
</details>

<details>
<summary><b>其他 MCP 客户端</b></summary>

通用配置参数：
- **命令**: `node`
- **参数**: `/path/to/kimi-search-mcp/dist/index.js`
- **环境变量**: `KIMI_CODE_API_KEY=your-api-key`
</details>

## 配置

| 环境变量 | 必需 | 说明 |
|----------|------|------|
| `KIMI_CODE_API_KEY` | ✅ | KimiCode API Key |

## 使用示例

### 搜索

```json
{
  "query": "MCP 协议介绍",
  "limit": 10
}
```

### 获取网页

```json
{
  "url": "https://modelcontextprotocol.io"
}
```

### 批量搜索

```json
{
  "queries": [
    { "query": "Docker 部署", "limit": 5 },
    { "query": "Node.js 教程", "limit": 5 }
  ]
}
```

## 开发

```bash
# 编译
npm run build

# 监听模式
npm run dev

# 测试（需要设置 KIMI_CODE_API_KEY）
npm test

# MCP Inspector 调试
npm run inspect
```

## 协议

MIT
