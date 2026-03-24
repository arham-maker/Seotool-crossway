ALTER TABLE `users`
  ADD COLUMN `facebook_page_id` VARCHAR(191) NULL,
  ADD COLUMN `instagram_user_id` VARCHAR(191) NULL;

CREATE INDEX `users_facebook_page_id_idx` ON `users`(`facebook_page_id`);
CREATE INDEX `users_instagram_user_id_idx` ON `users`(`instagram_user_id`);
