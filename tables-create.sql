


CREATE TABLE IF NOT EXISTS users
(
   id           BIGINT(20)   NOT NULL AUTO_INCREMENT,
   username     VARCHAR(30)  NOT NULL UNIQUE,
   password     VARCHAR(60)  NOT NULL,
   name         VARCHAR(100) NOT NULL DEFAULT "Anonymous",
   public       BOOLEAN      NOT NULL DEFAULT FALSE,
   settings     TEXT         NOT NULL DEFAULT "",
   current_cnv  BIGINT(20)   NOT NULL DEFAULT 0,
   created      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
   updated      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

   CONSTRAINT pk_users
      PRIMARY KEY (id)
);



CREATE TABLE IF NOT EXISTS tokens
(
   token        VARCHAR(64)  NOT NULL,
   user_id      BIGINT(20)   NOT NULL,
   current_cnv  BIGINT(20)   NOT NULL DEFAULT 0,
   description  TEXT         NOT NULL DEFAULT "",
   created      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
   updated      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

   CONSTRAINT pk_tokens
      PRIMARY KEY (token),

   CONSTRAINT fk_token_user
      FOREIGN KEY (user_id)
      REFERENCES  users(id)
      ON UPDATE RESTRICT
      ON DELETE CASCADE
);



CREATE TABLE IF NOT EXISTS conversations
(
   id           BIGINT(20)   NOT NULL AUTO_INCREMENT,
   name         VARCHAR(100) NOT NULL DEFAULT "",
   settings     TEXT         NOT NULL DEFAULT "",
   created      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
   updated      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

   CONSTRAINT pk_conversations
      PRIMARY KEY (id)
);



CREATE TABLE IF NOT EXISTS users_conversations
(
   user_id      BIGINT(20)   NOT NULL,
   cnv_id       BIGINT(20)   NOT NULL,
   cnv_name     VARCHAR(100) NOT NULL DEFAULT "",
   cnv_password VARCHAR(60)  NOT NULL DEFAULT "",
   settings     TEXT         NOT NULL DEFAULT "",
   created      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
   updated      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

   CONSTRAINT pk_users_conversations
      PRIMARY KEY (user_id, cnv_id),

   CONSTRAINT fk_users_conversations_user
      FOREIGN KEY (user_id)
      REFERENCES  users(id)
      ON UPDATE RESTRICT
      ON DELETE CASCADE,

   CONSTRAINT fk_users_conversations_conversation
      FOREIGN KEY (cnv_id)
      REFERENCES  conversations(id)
      ON UPDATE RESTRICT
      ON DELETE CASCADE
);



CREATE TABLE IF NOT EXISTS messages
(
   id           BIGINT(20)   NOT NULL AUTO_INCREMENT,
   user_id      BIGINT(20)   NOT NULL,
   cnv_id       BIGINT(20)   NOT NULL,
   status       VARCHAR(16)  NOT NULL DEFAULT "",
   body         TEXT         NOT NULL DEFAULT "",
   changes      TEXT         NOT NULL DEFAULT "",
   created      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
   updated      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

   CONSTRAINT pk_messages
      PRIMARY KEY (id),

   CONSTRAINT fk_message_user
      FOREIGN KEY (user_id)
      REFERENCES  users(id)
      ON UPDATE RESTRICT
      ON DELETE CASCADE,

   CONSTRAINT fk_message_conversation
      FOREIGN KEY (cnv_id)
      REFERENCES  conversations(id)
      ON UPDATE RESTRICT
      ON DELETE CASCADE
);



CREATE TABLE IF NOT EXISTS notifications
(
   id           BIGINT(20)   NOT NULL AUTO_INCREMENT,
   user_id      BIGINT(20)   NOT NULL,
   status       VARCHAR(16)  NOT NULL DEFAULT "",
   body         TEXT         NOT NULL DEFAULT "",
   created      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
   updated      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

   CONSTRAINT pk_notifications
      PRIMARY KEY (id),

   CONSTRAINT fk_notification_user
      FOREIGN KEY (user_id)
      REFERENCES  users(id)
      ON UPDATE RESTRICT
      ON DELETE CASCADE
);



