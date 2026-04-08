// Custom server wrapper for Domino deployment.
// Domino's reverse proxy strips the base path before forwarding to Node,
// but SvelteKit expects routes under that base path. This re-adds the prefix.
import { handler } from './build/handler.js';
import http from 'node:http';

const BASE = '/modelproducts/69d693c153739a52ce0179c4';
const PORT = process.env.PORT || 8888;
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer((req, res) => {
	if (req.url && !req.url.startsWith(BASE)) {
		req.url = BASE + req.url;
	}
	handler(req, res);
});

server.listen(PORT, HOST, () => {
	console.log(`Listening on ${HOST}:${PORT}`);
});
