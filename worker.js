// 透明反向代理：把本域名收到的路径原样转发到 zenmux.ai 的同名路径。
// ZenMux 自身兼容 chat/completions、messages、responses 等多种协议入口，
// 所以这里不做任何路径改写/协议适配，纯透传。
//   https://daiqilong.cc.cd/api/v1/chat/completions
//     -> https://zenmux.ai/api/v1/chat/completions
//   https://daiqilong.cc.cd/v1/messages
//     -> https://zenmux.ai/v1/messages
const UPSTREAM_ORIGIN = "https://zenmux.ai";

// 逐跳(header)不能跨代理透传：Workers 会根据上游 URL 自行重算 Host、
// 重新分块，沿用客户端的这些头会让上游收到矛盾/失效的元信息。
const SKIP_REQUEST_HEADERS = [
  "host",
  "content-length",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "cf-workers-preview-token"
];

export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);

    // pathname + search 原样保留，不改动任何一段路径
    const upstreamUrl = new URL(
      incomingUrl.pathname + incomingUrl.search,
      UPSTREAM_ORIGIN
    );

    const headers = new Headers(request.headers);
    for (const name of SKIP_REQUEST_HEADERS) headers.delete(name);

    const isBodyless = request.method === "GET" || request.method === "HEAD";

    const init = {
      method: request.method,
      headers,
      redirect: "manual"
    };

    if (!isBodyless) {
      // body 直接挂流，不进内存，保证 SSE 边到边转发
      init.body = request.body;
      init.duplex = "half";
    }

    const upstreamRequest = new Request(upstreamUrl.toString(), init);

    try {
      // 原样返回上游 Response，body 保持流式
      return await fetch(upstreamRequest);
    } catch {
      // 上游 DNS/连接/超时失败时，返回接口风格的 JSON 而不是 Cloudflare 错误页
      return Response.json(
        {
          error: {
            message: `Upstream request to ${UPSTREAM_ORIGIN} failed`,
            type: "proxy_error",
            code: "upstream_unavailable"
          }
        },
        { status: 502 }
      );
    }
  }
};
