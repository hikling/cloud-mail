import app from '../hono/hono';
import telegramService from '../service/telegram-service';

app.get('/telegram/getEmail/:token', async (c) => {
	const { html, nonce } = await telegramService.getEmailContent(c, c.req.param());
	c.header('Cache-Control', 'private, no-store');
	c.header('Referrer-Policy', 'no-referrer');
	c.header(
		'Content-Security-Policy',
		`default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'`
	);
	return c.html(html);
});

