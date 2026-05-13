-- Posting instructions / suggestions (admin); assignee edits in user_edited_instructions
ALTER TABLE `approvals` ADD COLUMN `instructions` VARCHAR(5000) NOT NULL DEFAULT '';
ALTER TABLE `approvals` ADD COLUMN `user_edited_instructions` TEXT NULL;
