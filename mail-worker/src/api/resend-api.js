import resendService from '../service/resend-service';
import app from '../hono/hono';

app.post('/webhooks', async (c) => {
	const rawBody = await c.req.text();
	const verified = await resendService.verifyWebhookRequest(c, rawBody);
	if (!verified) {
		return c.text('Unauthorized', 401);
	}

	let body;
	try {
		body = JSON.parse(rawBody);
	} catch {
		return c.text('Invalid JSON', 400);
	}

	try {
		await resendService.webhooks(c, body);
		return c.text('success', 200);
	} catch {
		return c.text('Internal error', 500);
	}
});

