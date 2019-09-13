


--ALTER TABLE users               DROP INDEX       IF EXISTS `PRIMARY`;
ALTER TABLE users               DROP INDEX       IF EXISTS `pk_users`;

ALTER TABLE tokens              DROP FOREIGN KEY IF EXISTS fk_token_user;
ALTER TABLE tokens              DROP INDEX       IF EXISTS fk_token_user;
ALTER TABLE tokens              DROP INDEX       IF EXISTS `PRIMARY`;
ALTER TABLE tokens              DROP INDEX       IF EXISTS `pk_tokens`;

ALTER TABLE notifications       DROP FOREIGN KEY IF EXISTS fk_notification_user;
ALTER TABLE notifications       DROP INDEX       IF EXISTS fk_notification_user;
--ALTER TABLE notifications       DROP INDEX       IF EXISTS `PRIMARY`;
ALTER TABLE notifications       DROP INDEX       IF EXISTS `pk_notifications`;

ALTER TABLE users_conversations DROP FOREIGN KEY IF EXISTS fk_users_conversations_user;
ALTER TABLE users_conversations DROP FOREIGN KEY IF EXISTS fk_users_conversations_conversation;
ALTER TABLE users_conversations DROP INDEX       IF EXISTS fk_users_conversations_user;
ALTER TABLE users_conversations DROP INDEX       IF EXISTS fk_users_conversations_conversation;
ALTER TABLE users_conversations DROP INDEX       IF EXISTS `PRIMARY`;
ALTER TABLE users_conversations DROP INDEX       IF EXISTS `pk_users_conversations`;

--ALTER TABLE conversations       DROP INDEX       IF EXISTS `PRIMARY`;
ALTER TABLE conversations       DROP INDEX       IF EXISTS `pk_conversations`;

ALTER TABLE messages            DROP FOREIGN KEY IF EXISTS fk_message_user;
ALTER TABLE messages            DROP FOREIGN KEY IF EXISTS fk_message_conversation;
ALTER TABLE messages            DROP INDEX       IF EXISTS fk_message_user;
ALTER TABLE messages            DROP INDEX       IF EXISTS fk_message_conversation;
--ALTER TABLE messages            DROP INDEX       IF EXISTS `PRIMARY`;
ALTER TABLE messages            DROP INDEX       IF EXISTS `pk_messages`;

DROP TABLE IF EXISTS messages, users_conversations, conversations, notifications, tokens, users;



