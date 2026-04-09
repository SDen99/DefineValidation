import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	const path = event.url.pathname;

	// Immutable hashed assets — cache forever
	if (path.startsWith('/_app/immutable/')) {
		response.headers.set('cache-control', 'public, max-age=31536000, immutable');
	}
	// Other static assets — cache with revalidation
	else if (
		path.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)$/)
	) {
		response.headers.set('cache-control', 'public, max-age=3600, stale-while-revalidate=86400');
	}

	return response;
};
