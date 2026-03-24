-- Add GTM container support on users
ALTER TABLE `users`
  ADD COLUMN `gtm_container_id` VARCHAR(64) NULL;

CREATE INDEX `users_gtm_container_id_idx` ON `users`(`gtm_container_id`);

-- Daily social media metrics collected via GTM pipeline
CREATE TABLE `social_media_daily_stats` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `site_link` VARCHAR(512) NOT NULL,
  `platform` VARCHAR(50) NOT NULL,
  `account_name` VARCHAR(191) NULL,
  `account_handle` VARCHAR(191) NULL,
  `stat_date` DATE NOT NULL,
  `followers` INTEGER NOT NULL DEFAULT 0,
  `reach` INTEGER NOT NULL DEFAULT 0,
  `engagements` INTEGER NOT NULL DEFAULT 0,
  `queued_posts` INTEGER NOT NULL DEFAULT 0,
  `queued_reels` INTEGER NOT NULL DEFAULT 0,
  `source` VARCHAR(100) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `smm_user_site_platform_date_unique`(`user_id`, `site_link`, `platform`, `stat_date`),
  INDEX `smm_site_date_idx`(`site_link`, `stat_date`),
  INDEX `smm_platform_date_idx`(`platform`, `stat_date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `social_media_daily_stats`
  ADD CONSTRAINT `social_media_daily_stats_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
