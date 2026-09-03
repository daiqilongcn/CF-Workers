# CF-Workers Transparent Proxy

一个基于 [Cloudflare Workers](https://workers.cloudflare.com/) 的轻量级透明反向代理，可将任意路径与请求原样转发到指定上游，适用于 API 代理、跨域加速等场景。

## 特性

- **零路径改写**：请求的路径（pathname）和查询参数（search）原样透传，不改动任何 URL 片段。
- **流式转发**：请求/响应 Body 直接挂流，不读入内存，支持 SSE 等长连接场景。
- **自动清理逐跳头**：自动移除 `Host`、`Content-Length`、`Connection` 等不能跨代理透传的 Header，避免上游收到冲突元信息。
- **多协议兼容**：上游只要兼容标准 HTTP/HTTPS 即可，天然适配 OpenAI (`/v1/chat/completions`)、Anthropic Messages (`/v1/messages`)、OpenAI Responses (`/v1/responses`) 等主流 LLM API 格式，以及 SSE、JSON-RPC 等通用协议。
- **边缘部署**：利用 Cloudflare 全球边缘节点，就近接入，低延迟高可用。

## 项目结构

```
.
├── worker.js        # 主入口：透明代理逻辑
├── wrangler.jsonc   # Wrangler 配置文件
└── .gitignore
```

## 快速开始

### 1. 前置要求

- [Node.js](https://nodejs.org/) >= 18
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

```bash
npm install -g wrangler
```

### 2. 配置上游地址

编辑 `worker.js`，将 `UPSTREAM_ORIGIN` 修改为你需要代理的目标地址：

```javascript
const UPSTREAM_ORIGIN = "https://your-upstream.example.com";
```

> 示例请求：
> ```
> https://<your-worker-domain>/api/v1/chat/completions
>   -> https://your-upstream.example.com/api/v1/chat/completions
> ```

### 3. 本地预览

```bash
wrangler dev
```

### 4. 部署上线

```bash
wrangler deploy
```

## 自定义部署区域（可选）

如果希望 Worker 的执行节点更靠近上游，可在 `wrangler.jsonc` 中调整 `placement.region`：

```jsonc
{
  "placement": {
    "region": "aws:ap-southeast-1"
  }
}
```

可选区域参考：
- `aws:ap-southeast-1` — 新加坡
- `gcp:asia-east1` — 台湾
- `aws:ap-northeast-1` — 东京
- `aws:ap-east-1` — 香港

## 使用示例

部署后，所有发往 Worker 子域名的请求都会被透明转发到配置的上游。由于采用纯透传策略，上游支持的任意 API 端点均可直接使用：

**OpenAI Chat Completions**
```bash
curl -X POST https://<your-worker-domain>/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "hello"}]}'
```

**Anthropic Messages**
```bash
curl -X POST https://<your-worker-domain>/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model": "claude-3-opus-20240229", "max_tokens": 1024, "messages": [{"role": "user", "content": "hello"}]}'
```

**OpenAI Responses**
```bash
curl -X POST https://<your-worker-domain>/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"model": "gpt-4o", "input": "hello"}'
```

以上请求分别等效于直接访问上游对应路径，Worker 不做任何路径或协议层面的修改。

## 许可证

[MIT](LICENSE)
