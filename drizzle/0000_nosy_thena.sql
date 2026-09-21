CREATE TABLE `spotify_app_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`client_secret` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spotify_auth_attempts` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`role` text NOT NULL,
	`verifier` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spotify_connections` (
	`owner_id` text NOT NULL,
	`role` text NOT NULL,
	`spotify_account_id` text NOT NULL,
	`display_name` text,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`connected_at` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `role`)
);
--> statement-breakpoint
CREATE INDEX `idx_spotify_connections_account` ON `spotify_connections` (`spotify_account_id`);