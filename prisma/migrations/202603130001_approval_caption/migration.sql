-- Caption from admin (short); assignee may edit into user_edited_caption
ALTER TABLE `approvals` ADD COLUMN `caption` VARCHAR(2000) NOT NULL DEFAULT '';
ALTER TABLE `approvals` ADD COLUMN `user_edited_caption` TEXT NULL;
