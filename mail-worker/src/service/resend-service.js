import emailService from './email-service';
import { emailConst } from '../const/entity-const';

const resendService = {

	async webhooks(c, body) {
		const emailId = body?.data?.email_id;
		if (!emailId || !body?.type) {
			return;
		}

		const params = {
			resendEmailId: emailId,
			status: emailConst.status.SENT
		};

		if (body.type === 'email.delivered') {
			params.status = emailConst.status.DELIVERED;
			params.message = null;
		}

		if (body.type === 'email.complained') {
			params.status = emailConst.status.COMPLAINED;
			params.message = null;
		}

		if (body.type === 'email.bounced') {
			params.status = emailConst.status.BOUNCED;
			params.message = body.data?.bounce ? JSON.stringify(body.data.bounce) : null;
		}

		if (body.type === 'email.delivery_delayed') {
			params.status = emailConst.status.DELAYED;
			params.message = null;
		}

		if (body.type === 'email.failed') {
			params.status = emailConst.status.FAILED;
			params.message = body.data?.failed?.reason || 'Failed';
		}

		const emailRow = await emailService.updateEmailStatus(c, params);

		if (!emailRow) {
			console.warn(`resend webhook: unknown email_id ${params.resendEmailId}, type ${body.type}`);
		}

	}
};

export default resendService;
