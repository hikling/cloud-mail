const ensuredDbs = new WeakSet();
const inFlightMigrations = new WeakMap();

const SETTING_COLUMN_DEFS = [
	['register', 'INTEGER NOT NULL DEFAULT 0'],
	['receive', 'INTEGER NOT NULL DEFAULT 0'],
	['title', "TEXT NOT NULL DEFAULT ''"],
	['many_email', 'INTEGER NOT NULL DEFAULT 0'],
	['add_email', 'INTEGER NOT NULL DEFAULT 0'],
	['auto_refresh', 'INTEGER NOT NULL DEFAULT 2'],
	['send', 'INTEGER NOT NULL DEFAULT 1'],
	['r2_domain', 'TEXT'],
	['reg_key', 'INTEGER NOT NULL DEFAULT 1'],
	['background', 'TEXT'],
	['tg_bot_token', "TEXT NOT NULL DEFAULT ''"],
	['tg_chat_id', "TEXT NOT NULL DEFAULT ''"],
	['tg_bot_status', 'INTEGER NOT NULL DEFAULT 1'],
	['forward_email', "TEXT NOT NULL DEFAULT ''"],
	['forward_status', 'INTEGER NOT NULL DEFAULT 1'],
	['rule_email', "TEXT NOT NULL DEFAULT ''"],
	['rule_type', 'INTEGER NOT NULL DEFAULT 0'],
	['login_opacity', 'INTEGER DEFAULT 0.88'],
	['resend_tokens', "TEXT NOT NULL DEFAULT '{}'"],
	['notice_title', "TEXT NOT NULL DEFAULT ''"],
	['notice_content', "TEXT NOT NULL DEFAULT ''"],
	['notice_type', "TEXT NOT NULL DEFAULT ''"],
	['notice_duration', 'INTEGER NOT NULL DEFAULT 0'],
	['notice_position', "TEXT NOT NULL DEFAULT ''"],
	['notice_offset', 'INTEGER NOT NULL DEFAULT 0'],
	['notice_width', 'INTEGER NOT NULL DEFAULT 400'],
	['notice', 'INTEGER NOT NULL DEFAULT 0'],
	['no_recipient', 'INTEGER NOT NULL DEFAULT 1'],
	['login_domain', 'INTEGER NOT NULL DEFAULT 0'],
	['bucket', "TEXT NOT NULL DEFAULT ''"],
	['region', "TEXT NOT NULL DEFAULT ''"],
	['endpoint', "TEXT NOT NULL DEFAULT ''"],
	['s3_access_key', "TEXT NOT NULL DEFAULT ''"],
	['s3_secret_key', "TEXT NOT NULL DEFAULT ''"],
	['force_path_style', 'INTEGER NOT NULL DEFAULT 1'],
	['custom_domain', "TEXT NOT NULL DEFAULT ''"],
	['tg_msg_from', "TEXT NOT NULL DEFAULT 'only-name'"],
	['tg_msg_to', "TEXT NOT NULL DEFAULT 'show'"],
	['tg_msg_text', "TEXT NOT NULL DEFAULT 'hide'"],
	['min_email_prefix', 'INTEGER NOT NULL DEFAULT 0'],
	['email_prefix_filter', "TEXT NOT NULL DEFAULT ''"],
	['black_subject', "TEXT NOT NULL DEFAULT ''"],
	['black_content', "TEXT NOT NULL DEFAULT ''"],
	['black_from', "TEXT NOT NULL DEFAULT ''"],
	['ai_code', 'INTEGER NOT NULL DEFAULT 1'],
	['sync_delete', 'INTEGER NOT NULL DEFAULT 1'],
	['ai_code_filter', "TEXT NOT NULL DEFAULT ''"],
	['linuxdo_client_id', "TEXT NOT NULL DEFAULT ''"],
	['linuxdo_client_secret', "TEXT NOT NULL DEFAULT ''"],
	['linuxdo_switch', 'INTEGER NOT NULL DEFAULT 1'],
	['github_client_id', "TEXT NOT NULL DEFAULT ''"],
	['github_client_secret', "TEXT NOT NULL DEFAULT ''"],
	['github_switch', 'INTEGER NOT NULL DEFAULT 1'],
	['google_client_id', "TEXT NOT NULL DEFAULT ''"],
	['google_client_secret', "TEXT NOT NULL DEFAULT ''"],
	['google_switch', 'INTEGER NOT NULL DEFAULT 1'],
	['auto_clean_days', 'INTEGER NOT NULL DEFAULT 0'],
	['auto_clean_exclude', "TEXT NOT NULL DEFAULT ''"],
	['webhook_url', "TEXT NOT NULL DEFAULT ''"],
	['webhook_status', 'INTEGER NOT NULL DEFAULT 1'],
	['webhook_retry', 'INTEGER NOT NULL DEFAULT 0'],
	['webhook_secret', "TEXT NOT NULL DEFAULT ''"]
];

const EMAIL_COLUMN_DEFS = [
	['unread', 'INTEGER NOT NULL DEFAULT 0'],
	['code', "TEXT NOT NULL DEFAULT ''"],
	['sender_email', "TEXT NOT NULL DEFAULT ''"]
];

const ACCOUNT_COLUMN_DEFS = [
	['all_receive', 'INTEGER NOT NULL DEFAULT 0'],
	['sort', 'INTEGER NOT NULL DEFAULT 0']
];

const OAUTH_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS oauth (
	oauth_id INTEGER PRIMARY KEY AUTOINCREMENT,
	oauth_user_id TEXT,
	username TEXT,
	name TEXT,
	avatar TEXT,
	active INTEGER,
	trust_level INTEGER,
	silenced INTEGER,
	create_time TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
	platform TEXT,
	user_id INTEGER DEFAULT 0 NOT NULL
)`;

const INDEX_SQLS = [
	'CREATE INDEX IF NOT EXISTS idx_attachments_key ON attachments(key)',
	'CREATE INDEX IF NOT EXISTS idx_email_user_create_time ON email(user_id, create_time)',
	'CREATE INDEX IF NOT EXISTS idx_email_create_time ON email(create_time)',
	'CREATE INDEX IF NOT EXISTS idx_email_list_user ON email(user_id, type, is_del, email_id)',
	'CREATE INDEX IF NOT EXISTS idx_email_list_account ON email(user_id, account_id, type, is_del, email_id)',
	'CREATE INDEX IF NOT EXISTS idx_star_user_email ON star(user_id, email_id)',
	'CREATE INDEX IF NOT EXISTS idx_star_email_user ON star(email_id, user_id)',
	'CREATE INDEX IF NOT EXISTS idx_email_name_nocase ON email(name COLLATE NOCASE)',
	'CREATE INDEX IF NOT EXISTS idx_email_subject_nocase ON email(subject COLLATE NOCASE)',
	'CREATE INDEX IF NOT EXISTS idx_user_email_nocase ON user(email COLLATE NOCASE)',
	'CREATE INDEX IF NOT EXISTS idx_email_to_email_nocase ON email(to_email COLLATE NOCASE)',
	'CREATE INDEX IF NOT EXISTS idx_email_send_email_nocase ON email(send_email COLLATE NOCASE)',
	'CREATE INDEX IF NOT EXISTS idx_email_noone_id ON email(email_id) WHERE status = 7',
	'CREATE INDEX IF NOT EXISTS idx_email_type_id ON email(type, email_id)',
	'CREATE INDEX IF NOT EXISTS idx_account_user_del_sort ON account(user_id, is_del, sort, account_id)',
	'CREATE INDEX IF NOT EXISTS idx_email_saving_account ON email(account_id) WHERE status = 6',
	'CREATE INDEX IF NOT EXISTS idx_email_type_name ON email(type, name)',
	'CREATE INDEX IF NOT EXISTS idx_email_type_create_time ON email(type, create_time)',
	'CREATE INDEX IF NOT EXISTS idx_user_create_time ON user(create_time)',
	'CREATE INDEX IF NOT EXISTS idx_user_type ON user(type)',
	'CREATE INDEX IF NOT EXISTS idx_attachments_email_type ON attachments(email_id, type)',
	'CREATE INDEX IF NOT EXISTS idx_role_perm_role ON role_perm(role_id)',
	'CREATE INDEX IF NOT EXISTS idx_oauth_oauth_user_id ON oauth(oauth_user_id)',
	'CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON oauth(user_id)'
];

export function isMissingColumnError(err) {
	const msg = String(err?.message || err || '').toLowerCase();
	return msg.includes('no such column');
}

function isIgnorableMigrationError(err) {
	const msg = String(err?.message || err || '').toLowerCase();
	return (
		msg.includes('duplicate column') ||
		msg.includes('already exists') ||
		msg.includes('no such table') ||
		msg.includes('no such column')
	);
}

async function runSafeSql(db, sql) {
	try {
		await db.prepare(sql).run();
	} catch (err) {
		if (!isIgnorableMigrationError(err)) {
			console.warn('Schema migration statement warning:', sql, err?.message || err);
		}
	}
}

async function getTableColumns(db, tableName) {
	try {
		const res = await db.prepare(`PRAGMA table_info('${tableName}')`).all();
		const rows = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
		return new Set(rows.map(row => row?.name).filter(Boolean));
	} catch {
		return null;
	}
}

async function ensureColumnsForTable(db, tableName, columnDefs, options = {}) {
	const cols = await getTableColumns(db, tableName);

	// Table does not exist yet (e.g. brand new uninitialized DB); skip ALTER.
	if (cols && cols.size === 0) {
		return cols;
	}

	if (options.renameFrom && cols && cols.has(options.renameFrom.from) && !cols.has(options.renameFrom.to)) {
		await runSafeSql(db, `ALTER TABLE ${tableName} RENAME COLUMN ${options.renameFrom.from} TO ${options.renameFrom.to}`);
		cols.delete(options.renameFrom.from);
		cols.add(options.renameFrom.to);
	}

	let addedEmailUnread = false;
	for (const [colName, colDef] of columnDefs) {
		if (!cols || !cols.has(colName)) {
			await runSafeSql(db, `ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDef}`);
			if (tableName === 'email' && colName === 'unread' && cols) {
				addedEmailUnread = true;
			}
		}
	}

	if (addedEmailUnread) {
		await runSafeSql(db, 'UPDATE email SET unread = 1');
	}

	return cols;
}

export async function ensureSchema(c, { force = false } = {}) {
	const db = c?.env?.db;
	if (!db || typeof db.prepare !== 'function') {
		return;
	}

	if (!force && ensuredDbs.has(db)) {
		return;
	}

	const existingPromise = inFlightMigrations.get(db);
	if (existingPromise) {
		return existingPromise;
	}

	const migrationPromise = (async () => {
		try {
			await runSafeSql(db, OAUTH_TABLE_SQL);
			await ensureColumnsForTable(db, 'setting', SETTING_COLUMN_DEFS, {
				renameFrom: { from: 'auto_refresh_time', to: 'auto_refresh' }
			});
			await ensureColumnsForTable(db, 'email', EMAIL_COLUMN_DEFS);
			await ensureColumnsForTable(db, 'account', ACCOUNT_COLUMN_DEFS);
			for (const indexSql of INDEX_SQLS) {
				await runSafeSql(db, indexSql);
			}
			ensuredDbs.add(db);
		} finally {
			inFlightMigrations.delete(db);
		}
	})();

	inFlightMigrations.set(db, migrationPromise);
	return migrationPromise;
}

export async function withSchemaRecovery(c, operation) {
	try {
		return await operation();
	} catch (err) {
		if (!isMissingColumnError(err) || !c?.env?.db) {
			throw err;
		}
		await ensureSchema(c, { force: true });
		return await operation();
	}
}
