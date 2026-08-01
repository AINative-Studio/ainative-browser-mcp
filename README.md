# @ainative/browser-mcp

AINative Browser Agent MCP Server. Gives AI agents browser automation capabilities — act on pages, extract structured data, validate content, run multi-step tasks, and enrich agent memory from the web.

Auto-detects ZeroLocal (localhost:8000) or AINative Cloud.

## Install

```bash
npx @ainative/browser-mcp
```

Or install globally:

```bash
npm install -g @ainative/browser-mcp
```

## Configure in Claude Code

```json
{
  "mcpServers": {
    "browser": {
      "command": "npx",
      "args": ["@ainative/browser-mcp"],
      "env": {
        "AINATIVE_API_KEY": "ak_your_key_here"
      }
    }
  }
}
```

## Tools

| Tool | Description | Credits |
|------|-------------|---------|
| `browser_act` | Perform an action on a web page (click, type, navigate) | 50 |
| `browser_extract` | Extract structured data from a page | 75 |
| `browser_validate` | Validate content or state on a page | 25 |
| `browser_task` | Run a multi-step automation task | 200 |
| `browser_extract_to_table` | Extract data and store in ZeroDB table | 100 |
| `browser_enrich_memory` | Extract content and store in agent memory | 100 |

## Authentication

Set one of the following:

```bash
# API key (recommended)
AINATIVE_API_KEY=ak_your_key_here

# OR username/password
AINATIVE_USERNAME=you@example.com
AINATIVE_PASSWORD=your_password
```

Get your API key from [ainative.studio/dashboard](https://ainative.studio/dashboard).

## ZeroLocal (Local-First)

The server auto-detects ZeroLocal running on `localhost:8000`. If ZeroLocal is running, it is used automatically — no configuration needed. Otherwise it falls back to AINative Cloud.

To run ZeroLocal:

```bash
pip install zerodb-local
zerodb serve
```

## Examples

**Extract product data:**

```json
{
  "tool": "browser_extract",
  "arguments": {
    "url": "https://example.com/products",
    "extract_goal": "Extract all product names and prices"
  }
}
```

**Perform an action:**

```json
{
  "tool": "browser_act",
  "arguments": {
    "url": "https://example.com",
    "instruction": "Click the sign in button",
    "max_steps": 5
  }
}
```

**Store page content in agent memory:**

```json
{
  "tool": "browser_enrich_memory",
  "arguments": {
    "url": "https://example.com/blog/post",
    "extract_goal": "Extract key facts about the product",
    "memory_type": "semantic",
    "project_id": "your-project-id"
  }
}
```

## Links

- [AINative Studio](https://ainative.studio)
- [ZeroDB](https://zerodb.ainative.studio)
- [GitHub](https://github.com/AINative-Studio/core/tree/main/packages/browser-mcp)
- [Issues](https://github.com/AINative-Studio/core/issues)
