import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';

export const spotifyConnections = sqliteTable('spotify_connections', {
  ownerId: text('owner_id').notNull(),
  role: text('role', { enum: ['user', 'master'] }).notNull(),
  spotifyAccountId: text('spotify_account_id').notNull(),
  displayName: text('display_name'),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: integer('expires_at').notNull(),
  connectedAt: integer('connected_at').notNull(),
}, table => [
  primaryKey({ columns: [table.ownerId, table.role] }),
  index('idx_spotify_connections_account').on(table.spotifyAccountId),
]);

export const spotifyAuthAttempts = sqliteTable('spotify_auth_attempts', {
  stateHash: text('state_hash').primaryKey(),
  ownerId: text('owner_id').notNull(),
  role: text('role', { enum: ['user', 'master'] }).notNull(),
  verifier: text('verifier').notNull(),
  expiresAt: integer('expires_at').notNull(),
});

export const spotifyAppSettings = sqliteTable('spotify_app_settings', {
  id: integer('id').primaryKey(),
  clientId: text('client_id').notNull(),
  clientSecret: text('client_secret').notNull(),
});

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
