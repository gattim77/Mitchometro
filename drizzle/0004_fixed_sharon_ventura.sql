DELETE FROM `listening_profiles` WHERE `role` = 'user' AND json_extract(`summary`, '$.source') = 'recent';--> statement-breakpoint
DROP TABLE `spotify_app_settings`;--> statement-breakpoint
DROP TABLE `spotify_auth_attempts`;--> statement-breakpoint
DROP TABLE `spotify_connections`;
