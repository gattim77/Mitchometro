import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';

export const evaluationSettings = sqliteTable('evaluation_settings', {
  id: integer('id').primaryKey(),
  bandRules: text('band_rules').notNull(),
  messages: text('messages').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const adminCredentials = sqliteTable('admin_credentials', {
  id: integer('id').primaryKey(),
  passwordSalt: text('password_salt').notNull(),
  passwordHash: text('password_hash').notNull(),
  totpSecret: text('totp_secret').notNull(),
  lastTotpStep: integer('last_totp_step').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const adminPendingSetup = sqliteTable('admin_pending_setup', {
  id: integer('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  passwordSalt: text('password_salt').notNull(),
  passwordHash: text('password_hash').notNull(),
  totpSecret: text('totp_secret').notNull(),
  expiresAt: integer('expires_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
});

export const adminSessions = sqliteTable('admin_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  ownerId: text('owner_id').notNull(),
  expiresAt: integer('expires_at').notNull(),
}, table => [index('idx_admin_sessions_owner').on(table.ownerId)]);

export const adminLoginLimits = sqliteTable('admin_login_limits', {
  ownerId: text('owner_id').primaryKey(),
  failedCount: integer('failed_count').notNull(),
  lockedUntil: integer('locked_until').notNull(),
});

export const listeningProfiles = sqliteTable('listening_profiles', {
  ownerId: text('owner_id').notNull(),
  role: text('role', { enum: ['user', 'master'] }).notNull(),
  summary: text('summary').notNull(),
  uploadedAt: integer('uploaded_at').notNull(),
  plays: integer('plays').notNull(),
}, table => [primaryKey({ columns: [table.ownerId, table.role] })]);
