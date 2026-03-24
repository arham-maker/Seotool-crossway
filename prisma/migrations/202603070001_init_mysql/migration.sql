-- CreateTable
CREATE TABLE `users` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` TEXT NOT NULL,
  `name` VARCHAR(255) NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'user',
  `site_link` VARCHAR(512) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT false,
  `email_verified` BOOLEAN NOT NULL DEFAULT false,
  `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
  `email_verified_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,

  UNIQUE INDEX `users_email_key`(`email`),
  INDEX `users_role_idx`(`role`),
  INDEX `users_is_active_idx`(`is_active`),
  INDEX `users_created_by_idx`(`created_by`),
  INDEX `users_site_link_idx`(`site_link`),
  INDEX `users_status_verification_created_idx`(`status`, `email_verified`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_accessible_sites` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `site_link` VARCHAR(512) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `user_site_unique`(`user_id`, `site_link`),
  INDEX `user_accessible_sites_site_link_idx`(`site_link`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `used` BOOLEAN NOT NULL DEFAULT false,
  `used_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `password_reset_tokens_token_key`(`token`),
  INDEX `password_reset_tokens_email_idx`(`email`),
  INDEX `password_reset_tokens_expires_at_idx`(`expires_at`),
  INDEX `password_reset_tokens_used_idx`(`used`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verification_tokens` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `used` BOOLEAN NOT NULL DEFAULT false,
  `used_at` DATETIME(3) NULL,
  `invalidated_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `email_verification_tokens_token_key`(`token`),
  INDEX `email_verification_tokens_email_idx`(`email`),
  INDEX `email_verification_tokens_expires_at_idx`(`expires_at`),
  INDEX `email_verification_tokens_used_idx`(`used`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_logs` (
  `id` VARCHAR(191) NOT NULL,
  `token` VARCHAR(255) NULL,
  `email` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NULL,
  `success` BOOLEAN NOT NULL,
  `reason` VARCHAR(100) NULL,
  `ip` VARCHAR(255) NULL,
  `attempted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `verification_logs_email_idx`(`email`),
  INDEX `verification_logs_attempted_at_idx`(`attempted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users`
ADD CONSTRAINT `users_created_by_fkey`
FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_accessible_sites`
ADD CONSTRAINT `user_accessible_sites_user_id_fkey`
FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `verification_logs`
ADD CONSTRAINT `verification_logs_user_id_fkey`
FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
