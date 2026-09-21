CREATE TABLE `evaluation_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`band_rules` text NOT NULL,
	`messages` text NOT NULL,
	`updated_at` integer NOT NULL
);
