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
