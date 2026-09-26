const { createProxyMiddleware } = require("http-proxy-middleware");

/**
 * Dev-server proxy for the Vercel AI Gateway. The gateway does not allow
 * browser (CORS) requests, and the API key must not end up in the client
 * bundle, so the browser calls /ai-gateway/* and the key is added here.
 */
module.exports = function (app) {
	app.use(
		"/ai-gateway",
		createProxyMiddleware({
			target: "https://ai-gateway.vercel.sh",
			changeOrigin: true,
			pathRewrite: { "^/ai-gateway": "" },
			onProxyReq: (proxyReq) => {
				proxyReq.setHeader("Authorization", `Bearer ${process.env.AI_GATEWAY_API_KEY}`);
				proxyReq.removeHeader("origin");
			},
		})
	);
};
