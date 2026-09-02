const UPSTREAM_ORIGIN = "https://opencode.ai";

export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);

    // /zen/go/... -> /zen/...
    const rewrittenPath = incomingUrl.pathname.replace(
      /^\/zen\/go(?=\/|$)/,
      "/zen"
    );

    const upstreamUrl = new URL(
      rewrittenPath + incomingUrl.search,
      UPSTREAM_ORIGIN
    );

    const headers = new Headers(request.headers);

    // 避免转发不适合直接复用的请求头
    headers.delete("host");
    headers.delete("content-length");
    headers.delete("cf-workers-preview-token");

    // SSE/API 请求不要缓存
    headers.set("cache-control", "no-store");

    const upstreamRequest = new Request(upstreamUrl.toString(), {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : request.body,
      redirect: "manual"
    });

    return fetch(upstreamRequest);
  }
};