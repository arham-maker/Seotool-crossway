-- Assignee may edit heading into user_edited_title (admin `title` stays the original).
ALTER TABLE `approvals` ADD COLUMN `user_edited_title` VARCHAR(255) NULL;
