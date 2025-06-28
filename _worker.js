addEventListener('fetch', event => {
  event.passThroughOnException(); // 官方推荐，发生异常时回源
  event.respondWith(handleRequest(event.request));
})

/**
 * 处理请求的核心函数
 * @param {Request} request
 */
async function handleRequest(request) {
  const url = new URL(request.url);

  // 检查用户是否直接访问代理地址的根路径
  if (url.pathname === '/' || url.pathname === '/proxy/') {
    return createLandingPage();
  }

  // 从路径中提取真实的目标URL
  // 例如: 从 /proxy/https://example.com 提取 https://example.com
  const actualUrlStr = url.pathname.substring(url.pathname.indexOf('/', 1) + 1) + url.search + url.hash;

  // 校验提取的URL是否合法
  if (!actualUrlStr || !actualUrlStr.startsWith('http')) {
      return new Response('无效的URL。请确保以 http 或 https 开头。', { status: 400 });
  }

  try {
    const actualUrl = new URL(actualUrlStr);

    // 创建一个指向目标URL的新请求
    // 注意：这里我们不能直接复制所有原始请求头，特别是 host 头
    const modifiedRequest = new Request(actualUrl, {
      headers: request.headers,
      method: request.method,
      body: request.body,
      redirect: 'follow'
    });

    // 发起子请求到目标服务器
    const response = await fetch(modifiedRequest);

    // 创建一个新的响应副本，以便修改响应头
    const modifiedResponse = new Response(response.body, response);

    // 添加允许跨域访问的响应头
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    modifiedResponse.headers.append('Vary', 'Origin'); // 建议添加，用于改善缓存

    return modifiedResponse;

  } catch (e) {
    return new Response(e.message || '请求处理出错', { status: 500 });
  }
}

/**
 * 创建引导页面的函数
 */
function createLandingPage() {
  const html = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>边缘代理服务</title>
    <style>
      body { background-color: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
      .container { text-align: center; }
      h1 { color: #333; }
      .form-wrapper { background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
      input[type="text"] { width: 100%; max-width: 400px; box-sizing: border-box; font-size: 16px; padding: 12px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 20px; }
      button { padding: 12px 20px; background-color: #0052d9; color: white; font-size: 16px; border: none; border-radius: 4px; cursor: pointer; width: 100%; transition: background-color 0.3s; }
      button:hover { background-color: #003cab; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="form-wrapper">
        <h1>输入您想访问的网址</h1>
        <form id="proxy-form">
          <input type="text" id="url" name="url" placeholder="https://example.com" required />
          <button type="submit">访问</button>
        </form>
      </div>
    </div>
    <script>
      const form = document.getElementById('proxy-form');
      form.addEventListener('submit', event => {
        event.preventDefault();
        const input = document.getElementById('url');
        const actualUrl = input.value;
        // 使用当前页面的 origin 作为代理前缀
        const proxyUrl = window.location.origin + '/proxy/' + actualUrl;
        window.location.href = proxyUrl;
      });
    </script>
  </body>
  </html>
  `;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
