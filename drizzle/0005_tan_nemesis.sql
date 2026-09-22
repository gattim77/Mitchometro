CREATE TABLE `admin_identity` (
	`id` integer PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`email` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_transfers` (
	`id` integer PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`email` text NOT NULL,
	`requested_by` text NOT NULL,
	`password_salt` text,
	`password_hash` text,
	`totp_secret` text,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);
