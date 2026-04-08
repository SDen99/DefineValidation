// Custom server wrapper for Domino deployment.
// Domino's reverse proxy strips the base path before forwarding to Node,
// but SvelteKit expects routes under that base path. This re-adds the prefix.
import { handler } from './build/handler.js';
import http from 'node:http';

const BASE = '/modelproducts/69d693c153739a52ce0179c4';
const PORT = process.env.PORT || 8888;
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer((req, res) => {
	const originalUrl = req.url;
	if (req.url && !req.url.startsWith(BASE)) {
		req.url = BASE + req.url;
	}

	// Intercept the response to log status code
	const originalEnd = res.end;
	res.end = function (...args) {
		// Skip logging static assets to reduce noise
		if (!originalUrl.includes('/_app/immutable/')) {
			console.log(`[server] ${req.method} ${originalUrl} → ${req.url} :: ${res.statusCode}`);
		}
		return originalEnd.apply(this, args);
	};

	handler(req, res);
});

server.listen(PORT, HOST, () => {
	console.log(`[server] Listening on ${HOST}:${PORT}`);
	console.log(`[server] BASE_PATH = ${BASE}`);
	console.log(`[server] DOMINO_RUN_HOST_PATH = ${process.env.DOMINO_RUN_HOST_PATH || '(not set)'}`);
});
