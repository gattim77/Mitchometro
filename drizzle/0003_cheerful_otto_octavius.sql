CREATE TABLE `listening_profiles` (
	`owner_id` text NOT NULL,
	`role` text NOT NULL,
	`summary` text NOT NULL,
	`uploaded_at` integer NOT NULL,
	`plays` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `role`)
);
