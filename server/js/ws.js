


"use strict";



const fs           = require("fs"           );
const path         = require("path"         );
const moment       = require("moment"       );
const crypto       = require("crypto"       );
const bcrypt       = require("bcrypt"       );
const cookie       = require("cookie"       );
const cookieparser = require("cookie-parser");

                     require("./constants")();
const error        = require("./error"    );
const util         = require("./util"     );
const auth         = require("./auth"     );



var new_socket_id = 0;



module.exports = function(app)
{



   function format_su(socket)
   {
      return (socket.ua_platform + UA_PADDING).substring(0, UA_PADDING_WIDTH) + "   sid " + (socket.id < 10 ? " " : "") + socket.id + ", uid " + socket.user.id;
   }



   function format_suc(socket)
   {
      return (socket.ua_platform + UA_PADDING).substring(0, UA_PADDING_WIDTH) + "   sid " + (socket.id < 10 ? " " : "") + socket.id + ", uid " + socket.user.id + ", cnv " + socket.cnv_id;
   }



   function remove_cnv_socket(socket)
   {
      // Remove the socket from any conversations:
      for (var cnv_id in app.cnv_sockets) {
         if (app.cnv_sockets[cnv_id][socket.id]) {
//log("remove_cnv_socket: cnv " + cnv_id + " socket " + socket.id);
            delete app.cnv_sockets[cnv_id][socket.id];
            if (app.cnv_sockets[cnv_id].length === 0) {
               delete app.cnv_sockets[cnv_id];
            }
         }
      }
//dir(app.cnv_sockets);
   }



   //////////////////////////////
   /////  WEBSOCKET ROUTES  /////
   //////////////////////////////



   app.exp.ws("/", function(socket, req)
   {
      applog("app.exp.ws  /", (req.method + "  " + req.url + REQ_PADDING).substring(0, REQ_PADDING_WIDTH) + "   " + (req.headers["x-forwarded-for"] + "        ").substring(0, 15) + "   " + req.headers["user-agent"]);
//dir(socket);
//dir(req);
//dir(req.headers);

      socket.timestamp = moment().format(TIMESTAMP_FORMAT);
      const session_token = auth.get_session_token(req);

      if (!session_token) {
          error.handler("No session token",            "app.exp.ws", error.msg.login);                                 socket.close(4403, error.msg.login); return; }

      // Look up the user via the token:
      app.db.query("SELECT tokens.current_cnv, tokens.description AS ua_prev, users.id, users.username, users.name, users.public, users.settings, users.current_cnv AS current_cnv_user " + // "users.hidden_msgs " +
                   "FROM users " +
                   "INNER JOIN tokens ON users.id = tokens.user_id AND tokens.token = ?",
                   [ session_token ],
      function(err, user_rows)
      {
         if (error.handler(err,                           "app.exp.ws", error.msg.internal))                            { socket.close(4500, error.msg.internal); return; }
         if (user_rows.info.numRows == 0) {
             error.handler("Token not found",             "app.exp.ws", error.msg.login,  );                              socket.close(4403, error.msg.login   ); return; }
         if (user_rows.info.numRows  > 1) {
             error.handler("BUG: Duplicate tokens found", "app.exp.ws", error.msg.internal); delete_token(session_token); socket.close(4500, error.msg.internal); return; }
//         if (req.headers["user-agent"] != user_rows[0].ua_prev) {
//             error.handler("User-Agent mismatch",         "app.exp.ws", error.msg.login,  ); delete_token(session_token); socket.close(4403, error.msg.login    ); return; }

         // Update the user agent and last used time for the token:
         //    This isn't hyper important and isn't even currently used, so ignore errors.
         app.db.query("UPDATE tokens SET description = ?, updated = CURRENT_TIMESTAMP(6) WHERE token = ?",
                      [ req.headers["user-agent"], session_token ],
         function(err, update_info)
         {
            error.handler(err, "app.exp.ws: update token");
         });

         // Initialize the socket object:
         const ua = req.headers["user-agent"];

         socket.id          = new_socket_id++;
         socket.callbacks   = {};
         socket.ip_address  = req.headers["x-forwarded-for"];
         socket.ua_platform = ua.substring(ua.indexOf("(") + 1, ua.indexOf(")"));
         socket.token       = session_token;

         socket.user = user_rows[0];
         socket.user.id               = parseInt(socket.user.id);
         socket.user.current_cnv      = parseInt(socket.user.current_cnv);
         socket.user.current_cnv_user = parseInt(socket.user.current_cnv_user);
         if ((socket.user.current_cnv === 0) && (socket.user.current_cnv_user !== 0)) {
            socket.user.current_cnv = socket.user.current_cnv_user;
            app.db.query("UPDATE tokens SET current_cnv = ? WHERE token = ?",
                         [ socket.user.current_cnv_user, session_token ],
            function(err, update_info)
            {
               error.handler(err, "app.exp.get /: update tokens.current_cnv: ", socket.user.current_cnv_user);
            });
         }
         delete socket.user.current_cnv_user;
         socket.user.hidden_msgs = {};
//         socket.user.ua_prev.ua_prev     = user_rows[0].ua_prev;
//         socket.user.ua_current  = ua;
         // Merge existing settings into default settings to introduce any that have been added but not saved yet,
         //    or just set the defaults if there is a problem (e.g. settings are empty):
         try {
            socket.user.settings = util.merge_object_exclusive(DEFAULT_USER_SETTINGS, JSON.parse(socket.user.settings));
         }
         catch (err) {
            socket.user.settings = DEFAULT_USER_SETTINGS;
         }

         // Add conversation info to the socket object for convenience:
         socket.cnv_id = socket.user.current_cnv;

//         // Add the user to the users object:
//         //    Updating this (or any) user object will be reflected in the other user objects since they are all referencing the same object.
//         app.users[socket.user.id] = socket.user;

//dir(socket);
//dir(app.wss.clients);

         socket_init(socket);
//         socket.ping_client();
         socket.emit_msg("app_start", function()
         {
            applog("socket.app_start", format_su(socket));
         });
      });

   });



   function socket_init(socket)
   {
//      socket.ping_timer        = null;
//      socket.waiting_for_reply = 0;
      socket.new_ws_msg_id     = 0;



/*
      // These events won't happen because they've already happened at this point when using express-ws:
      socket.on("listening", function() {});
      socket.on("upgrade", function(res) {});
      socket.on("connection", function() {});
      socket.on("open", function() {});
      socket.on("unexpected-response", function(req, res) {});

      // Not using these:
      socket.on("ping", function(data) {});
      socket.on("pong", function(data) {});
*/



      socket.on("close", function(code, reason)
      {
         if (!reason) {
            if (WS_CC_DESCRIPTION[code]) {
               reason = WS_CC_DESCRIPTION[code];
            }
            else {
               reason = "";
            }
         }
         applog("socket.close", format_su(socket) + ": " + code + ", " + JSON.stringify(reason));

//         clearTimeout(socket.ping_timer);
//         socket.ping_timer = null;
         remove_cnv_socket(socket);
      });



      socket.on("error", function(err)
      {
         error.handler(err, "socket.error");
      });



      socket.on("message", function(msg_ws)
      {
//         applog("socket.message", JSON.stringify(msg_ws));

         // Handle simple messages first:
         switch (msg_ws) {

            // Received a ping from the client, respond immediately:
            case "PING":
//               applog("socket.message", "<-- PING");

//               if (socket.waiting_for_reply > 1) {
//                  socket.waiting_for_reply = 0;
//                  applog("socket.message", format_su(socket) + ": <-- PING, readyState " + socket.readyState);
//               }
               if (socket.readyState === WS_STATE_OPEN) {
                  socket.send("PONG");
               }
//               else {
//                  applog("socket.message", format_su(socket) + ": --> PONG: Socket not open: readyState " + socket.readyState);
//               }
               return;

//            // Client replied with a pong, ping again in a bit:
//            case "PONG":
////               applog("socket.message", "<-- PONG");
//
//               if (socket.waiting_for_reply > 1) {
//                  applog("socket.message", format_su(socket) + ": <-- PONG");
//               }
//               socket.waiting_for_reply = 0;
//               return;
         }

         // Handle app messages:
         try {
            msg_ws = JSON.parse(msg_ws);
         }
         catch (err) {
            error.handler("Invalid message: " + msg_ws, "socket.message");
            return;
         }
//         applog("socket.message", msg_ws.type + ", " + msg_ws.msg);

         switch (msg_ws.type) {

            // Unsolicited message from the client:
            case "MSG":
//               applog("socket.message", "MSG: " + msg_ws.id + ", " + msg_ws.msg + " " + JSON.stringify(msg_ws.args));

               // Trigger the event (emit the event, not emit ws data to the client):
               //    A callback is added, but doesn't have to be used.
               socket.emit(msg_ws.msg, ...msg_ws.args, function()
               {
                  const msg_ack = JSON.stringify({
                     type: "ACK",
                     id:   msg_ws.id,
                     args: [...arguments],   // Convert the arguments array to a real array
                  });
//                  applog("socket.message", "callback: " + msg_callback);
                  if (socket.readyState === WS_STATE_OPEN) {
                     socket.send(msg_ack);
                  }
//                  else {
//                     applog("socket.message", format_su(socket) + ": MSG: Socket not open: readyState " + socket.readyState + ": ACK, id " + msg_ws.id);
//                  }
               });
               socket.new_ws_msg_id++;
               break;

            // Acknowledgement of a previous message to the client:
            case "ACK":
//               applog("socket.message", "ACK: " + msg_ws.id);

               // Maybe execute a callback previously saved in socket.emit_msg:
               if (socket.callbacks[msg_ws.id]) {
                  clearTimeout(socket.callbacks[msg_ws.id].timeout);
                  socket.callbacks[msg_ws.id].callback(...msg_ws.args);
                  delete socket.callbacks[msg_ws.id];
               }
               break;
         }
      });



/*
      // Ping the client and close the connection if the reply times out:
      socket.ping_client = function()
      {
         if (socket.readyState === WS_STATE_OPEN) {
//            applog("socket.ping_client", "--> PING");

            clearTimeout(socket.ping_timer);
            if (socket.waiting_for_reply === 0) {
               socket.send("PING");
               socket.waiting_for_reply++;
               socket.ping_timer = setTimeout(function()
               {
                  socket.ping_client();
               }, WS_TIMEOUT_PING);
            }
//            else {
//               applog("socket.ping_client", format_su(socket) + ": --> PING timeout");
//               remove_cnv_socket(socket);
//               socket.close(4001, "Ping timeout");
//            }
         }
         else if (!socket.ping_timer) {
            socket.ping_timer = setInterval(function()
            {
               socket.ping_client();
            }, WS_INTERVAL_NETMON);
         }
      }
*/



      socket.emit_msg = function(message) // ...arguments
      {
//         applog("socket.emit_msg", format_su(socket) + ": " + message);

         if (!message) { error.handler("No message to send", "socket.emit_msg"); return; }

         if (socket.readyState === WS_STATE_OPEN) {
            const args = [];
            var args_length = arguments.length;

            // Save the last argument if it's a callback function:
            if (typeof arguments[args_length - 1] === "function") {
               args_length--;
               socket.callbacks[socket.new_ws_msg_id] = {
                  callback: arguments[args_length],
                  // Delete the callback if the message acknowledgement is never called or times out:
                  timeout:  setTimeout(function(ws_msg_id)
                            {
                               delete socket.callbacks[ws_msg_id];
                            }, WS_MSG_ACK_TIMEOUT, socket.new_ws_msg_id),
               };
            }
            // Prepare an array of all the arguments
            //    except the first one (msg) and possibly the last one (callback):
            for (var i = 1; i < args_length; i++) {
               args.push(arguments[i]);
            }
            const msg_ws = JSON.stringify({
               type: "MSG",
               id:   socket.new_ws_msg_id,
               msg:  message,
               args: args,
            });
            socket.new_ws_msg_id++;
//applog("socket.emit_msg", msg_ws);
            // Send it:
            socket.send(msg_ws);
         }
//         else {
//            applog("socket.emit_msg", format_su(socket) + ": Socket not open: readyState " + socket.readyState + ": " + JSON.stringify(message));
//         }
      }



      // socket.broadcast calls socket.emit for a group of sockets.
      //
      //    [args.cnv_id]          Number    Optional: Conversation ID to broadcast to, or if null, broadcast to all conversations.
      //    args.include_sender    Boolean   If true, the message is send to the originating socket.
      //    args.include_user      Boolean   If true, the message is send to sockets with the user ID of the originating socket (except the originating socket if include_sender is false).
      //    args.include_others    Boolean   If true, the message is send to sockets other than the originating user ID.
      //    args.msg_args_is_msg   Boolean   If true, the message arguments is msg object and msg.this_user can be set accordingly.

      socket.broadcast = function(args, message) // ...arguments
      {
//         applog("socket.broadcast", format_su(socket) + ": " + JSON.stringify(args) + ", " + message);
//         applog("socket.broadcast", format_su(socket));

         // Normalize booleans:
         args.include_sender  = (args.include_sender  ? true : false);
         args.include_user    = (args.include_user    ? true : false);
         args.include_others  = (args.include_others  ? true : false);
         args.msg_args_is_msg = (args.msg_args_is_msg ? true : false);

         const msg_args = [];

         for (var i = 2; i < arguments.length; i++) {
            msg_args.push(arguments[i]);
         }
         // Broadcast to the specified conversation:
         if (typeof args.cnv_id === "number") {
            broadcast_cnv(app.cnv_sockets[args.cnv_id], args, message, msg_args);
         }
         // Broadcast to all conversations:
         else {
            for (var i in app.cnv_sockets) {
               broadcast_cnv(app.cnv_sockets[i], args, message, msg_args);
            }
         }

         function broadcast_cnv(cnv_sockets, args, message, msg_args)
         {
            var cnv_socket = null;

            for (var socket_id in cnv_sockets) {
               cnv_socket = cnv_sockets[socket_id];
               if ( ( args.include_sender && (cnv_socket         === socket)         ) ||
                    ( args.include_user   && (cnv_socket         !== socket) &&
                                             (cnv_socket.user.id === socket.user.id) ) ||
                    ( args.include_others && (cnv_socket.user.id !== socket.user.id) ) ) {
                  if (args.msg_args_is_msg) {
                     msg_args[0].this_user = (cnv_socket.user.id === socket.user.id);
                     msg_args[0].this_cnv  = (cnv_socket.cnv_id  === socket.cnv_id);
                  }
                  cnv_socket.emit_msg(message, ...msg_args);
               }
            }
         }
      }



      /////////////////////////
      /////  INIT EVENTS  /////
      /////////////////////////



      // app_update_push_sub saves subscription info for a user on a device for sending notifications later.

      socket.on("app_update_push_sub", function(push_sub)
      {
         applog("socket.app_update_push_sub", format_su(socket));

         if (!push_sub)    error.handler("Invalid push_sub",                     "socket.app_update_push_sub");
         if (!socket.user) error.handler("No socket.user for push subscription", "socket.app_update_push_sub");

         // Update the push subscription info in the socket and main cache:
         socket.push_sub = push_sub;
         const ps = {
            user:      socket.user,
            sub:       push_sub,
//            timestamp: Date.now(),
         };
         // Create an unsalted hash that's smaller than the full endpoint to use as a key
         //    and create/update the main cache entry:
         const push_sub_hash = crypto.createHash("md5").update(push_sub.endpoint).digest("hex");
         app.push_subs[push_sub_hash] = ps;

         // Update the conversation subscriptions cache with the current conversation:
         //    This is done because it's better than nothing in case the database query fails.
         if (socket.cnv_id) {
            add_cnv_push_sub(socket.cnv_id);
         }
         // Update the conversation subscriptions cache with all conversations the user is in:
         app.db.query("SELECT cnv_id AS cnv_id FROM users_conversations WHERE user_id = ?",
                      [ socket.user.id ],
         function(err, cnv_rows)
         {
            if (error.handler(err, "app_update_push_sub", error.msg.internal, socket)) return true;

            for (var i = 0; i < cnv_rows.length; i++) {
               add_cnv_push_sub(parseInt(cnv_rows[i].cnv_id));
            }
         });

         function add_cnv_push_sub(cnv_id)
         {
            if (!app.cnv_subs[cnv_id]) {
               app.cnv_subs[cnv_id] = {};
            }
            app.cnv_subs[cnv_id][push_sub_hash] = ps;
         }
      });



      /////////////////////////
      /////  USER EVENTS  /////
      /////////////////////////



      socket.on("user_load", function(callback)
      {
         applog("socket.user_load", format_suc(socket));

         // Get user info:
         app.db.query("SELECT id " +
                      "FROM conversations " +
                      "INNER JOIN users_conversations ON conversations.id = users_conversations.cnv_id " +
                      "WHERE users_conversations.user_id = ?",
                      [ socket.user.id ],
         function(err, cnv_rows)
         {
            if (error.handler(err, "user_load: join conversations", error.msg.internal, socket)) return true;

            // Join all conversations the user is in:
            var cnv_id = 0;
            for (var i = 0; i < cnv_rows.length; i++) {
//               socket.join("cnv_" + cnv_rows[i].id);
               cnv_id = parseInt(cnv_rows[i].id);
               if (!app.cnv_sockets[cnv_id]) {
                  app.cnv_sockets[cnv_id] = {};
               }
               if (!app.cnv_sockets[cnv_id][socket.id]) {
                  app.cnv_sockets[cnv_id][socket.id] = socket;
               }
            }
         });

         // Reply with certain user info (e.g. user ID is not given to the client):
         callback({
//            ua_prev:     socket.user.ua_prev,
//            ua_current:  socket.user.ua_current,
            username:    socket.user.username,
            name:        socket.user.name,
            public:      socket.user.public,
            settings:    socket.user.settings,
            current_cnv: socket.user.current_cnv,
            hidden_msgs: socket.user.hidden_msgs,
         });
      });



      socket.on("user_logout", function(callback)
      {
         applog("socket.user_logout", format_su(socket));

         // Devices that don't support push subscriptions won't have socket.push_sub:
         if (socket.push_sub) {
            const push_sub_hash = crypto.createHash("md5").update(socket.push_sub.endpoint).digest("hex");
            const push_sub      = app.push_subs[push_sub_hash];

            if (push_sub) {
               delete push_sub.user;
               delete push_sub.sub;
               delete app.push_subs[push_sub_hash];
            }
         }
         callback();
      });



/*
      socket.on("user_check_password", function(password, callback)
      {
         applog("socket.user_check_password", format_su(socket));

         app.db.query("SELECT password FROM users WHERE id = ?",
                      [ socket.user.id ],
         function(err, user_rows)
         {
            if (error.handler(err, "user_check_password: select", error.msg.internal, socket)) { return true; }

            bcrypt.compare(password, user_rows[0].password, function(err, password_match)
            {
               if (error.handler(err, "user_check_password: bcrypt", socket)) { return true; }

               password = "";
               callback(password_match);
            });
         });
      });
*/



      socket.on("user_save_settings", function(user, callback)
      {
         applog("socket.user_save_settings", format_su(socket));

         // Validate profile settings if a password was given:
         if (user.current_password) {
            // Get the current password:
            app.db.query("SELECT password FROM users WHERE id = ?",
                         [ socket.user.id ],
            function(err, user_rows)
            {
               if (error.handler(err, "user_save_settings: get current password", error.msg.internal, socket)) { return true; }

               // Check the password:
               bcrypt.compare(user.current_password, user_rows[0].password, function(err, password_match)
               {
                  if (error.handler(err, "user_save_settings: check password", error.msg.internal, socket)) { return true; }

                  // Overwrite the plaintext password with a flag indicating it's been validated:
                  user.current_password = true;
                  if (password_match) {
                     if (user.new_password) {
                        // Hash the new password:
                        bcrypt.hash(user.new_password, SALT_ROUNDS, function(err, new_password_hash)
                        {
                           if (error.handler(err, "user_save_settings: bcrypt: hash new password", socket)) { return true; }

                           // Save settings:
                           user.new_password = new_password_hash;
                           user_save_settings(user, function(err)
                           {
                              callback(err);
                           });
                        });
                     }
                     else {
                        // Save settings:
                        user_save_settings(user, function(err)
                        {
                           callback(err);
                        });
                     }
                  }
                  else {
                     callback("Wrong password numbnuts.");
                  }
               });
            });
         }
         // No profile settings:
         else {
            // Save settings:
            user.current_password = false;
            user_save_settings(user, function(err)
            {
               callback(err);
            });
         }
      });



      // Only call this after validating profile settings.

      function user_save_settings(user, callback)
      {
         var sql_string = "UPDATE users SET ";
         var sql_params = [];

         // user.current_password is now a flag indicating it's been validated
         //    and user.new_password is the new password hash:
         if (user.current_password) {
            sql_string += "username = ?, name = ?, public = ?, ";
            sql_params.push(user.username, user.name, (user.public ? SQL_TRUE : SQL_FALSE));
            if (user.new_password) {
               sql_string += "password = ?, ";
               sql_params.push(user.new_password);
            }
         }
         sql_string += "settings = ? WHERE id = ?";
         sql_params.push(JSON.stringify(user.settings), socket.user.id);
         // Save the settings in the database:
         app.db.query(sql_string, sql_params,
         function(err, rows)
         {
            if (error.handler(err, "user_save_profile: update", error.msg.internal, socket)) { callback(err); return true; }

//            // Update the cached user object:
//            const u = app.users[user.id];
//            u.username = user.username;
//            u.name     = user.name;
//            u.avatar   = user.avatar;
//            u.public   = user.public;
//            u.settings = user.settings;

            callback(null);
         });
      }



      socket.on("user_update", function(user)
      {
         applog("socket.user_update", format_su(socket));

         // Relay the info to everyone in the conversation except the sender:
         socket.broadcast({
            cnv_id:         socket.cnv_id,
            include_sender: false,
            include_user:   true,
            include_others: true,
         },
         "user_update", user);
      });



      // user_clear_notifications is used to clear notifications for the current user.
      //    This clears notifications on devices other than the one originating this message.
      //    Local notifications are cleared by the client side via its own service worker
      //    (avoids one extra push message and is more reliable).

      socket.on("user_clear_notifications", function()
      {
//         applog("socket.user_clear_notifications", format_suc(socket));

         // Loop through push subscriptions for this conversation:
         var push_sub = null;
         for (var push_sub_hash in app.cnv_subs[socket.cnv_id]) {
            push_sub = app.cnv_subs[socket.cnv_id][push_sub_hash];
            // Send a notification to each subscription for the current user (i.e. on other devices) that isn't the current one:
            //    A blank title indicates to close the notification with the specified tag.
            if (push_sub.sub) {
               if ((push_sub.user.id === socket.user.id) && (push_sub.sub !== socket.push_sub)) {
                  send_notification(push_sub.sub, JSON.stringify({
                     tag:       NOTIFICATION_TAG_MSG + socket.cnv_id,
                     timestamp: Date.now(),
                     title:     "",
                  }));
               }
            }
            // Remove any empty subscription objects left by users logging out:
            else {
               delete app.cnv_subs[socket.cnv_id][push_sub_hash];
            }
         }
      });



      // delete_token removes the specified login token from the database.
      //
      //    token   String   Unformatted UUID (32 characters) representing a device login.

      function delete_token(token)
      {
         applog("delete_token", token);

         if (typeof token === "string") {
            // Deleting the token from the database is not critical so errors are logged but don't abort anything:
            //    This will delete duplicate tokens in the event that bug arises.
            app.db.query("DELETE FROM tokens WHERE uuid = UNHEX(?)",
                         [ token ],
            function(err, delete_rows)
            {
               if (error.handler(err, "delete token")) return true;
            });
         }
      }



      /////////////////////////////////
      /////  CONVERSATION EVENTS  /////
      /////////////////////////////////



      // Get the list of conversations for a user:

      socket.on("cnv_list", function(callback)
      {
         applog("socket.cnv_list", format_su(socket));

         app.db.query("SELECT users_conversations.cnv_id AS id, users_conversations.cnv_name AS user_name, conversations.name, conversations.settings, GROUP_CONCAT(users.name SEPARATOR \", \") AS participants " +
                      "FROM users_conversations " +
                      "INNER JOIN users ON users.id = users_conversations.user_id " +
                      "INNER JOIN conversations ON conversations.id = users_conversations.cnv_id " +
                      "WHERE cnv_id IN (SELECT cnv_id " +
                                       "FROM users_conversations " +
                                       "WHERE user_id = ?) " +
                      "GROUP BY cnv_id " +
                      "ORDER BY conversations.name",
                      [ socket.user.id ],
         function(err, cnv_rows)
         {
            if (error.handler(err, "cnv_list", error.msg.internal, socket)) return true;

            callback(cnv_rows);
         });
      });



      // Create a new conversation:

      socket.on("cnv_create", function(cnv_name, callback)
      {
         applog("socket.cnv_create", format_su(socket) + ": " + cnv_name);

         if (!auth.admin(socket.user)) { callback("Nope nope nope", null); return true; }

         app.db.query("INSERT INTO conversations (name) VALUES (?)", [ cnv_name ],
         function(err, insert_info)
         {
            if (error.handler(err, "cnv_create: insert cnv", error.msg.internal, socket)) { callback(err, null); return true; }

            const new_cnv_id = parseInt(insert_info.info.insertId);

            app.db.query("INSERT INTO users_conversations (user_id, cnv_id) VALUES (?, ?)",
                         [ socket.user.id, new_cnv_id ],
            function(err, rows)
            {
               if (error.handler(err, "cnv_create: insert user_cnv", error.msg.internal, socket)) { callback(err, null); return true; }

               callback(null, new_cnv_id);
            });
         });
      });



      // Load a conversation and return it to the user:
      //
      //    The information returned is:
      //
      //       cnv.id
      //       cnv.name
      //       cnv.settings
      //       cnv.users[ name, name, ..., name, ]
      //
      //    Use cnv_load_msg_range below to load messages.

      socket.on("cnv_load", function(cnv_id, callback)
      {
         if (typeof cnv_id !== "number") {
            cnv_id = socket.cnv_id;
         }

         applog("socket.cnv_load", format_suc(socket) + (cnv_id !== socket.cnv_id ? " -> cnv " + cnv_id : ""));

         // Get conversation info:
         //    Joining users_conversations also verifies the user is a part of the conversation.
         app.db.query("SELECT users_conversations.cnv_id AS id, users_conversations.cnv_name AS user_name, conversations.name, conversations.settings, users_conversations.settings AS user_settings " +
                      "FROM users_conversations " +
                      "INNER JOIN conversations ON conversations.id = users_conversations.cnv_id " +
                      "WHERE users_conversations.user_id = ? AND users_conversations.cnv_id = ?",
                      [ socket.user.id, cnv_id ],
         function(err, cnv_rows)
         {
            if (                              error.handler(err,                                                "cnv_load", error.msg.internal, socket)) { callback(err, null); return null; }
            if (cnv_rows.info.numRows == 0) { error.handler("Conversation not found or user not a participant", "cnv_load", error.msg.internal, socket);   callback(err, null); return null; }
//            if (cnv_rows.info.numRows  > 1) { error.handler("BUG: Multiple conversations found",                "cnv_load", error.msg.internal, socket);   callback(err, null); return null; }

            const cnv = cnv_rows[0];
            cnv.id = parseInt(cnv.id);

            // Save the user's currently selected conversation if it changed (now that the ID is known to be valid):
            //    Much better than relying on cookies at the client end.
            if (cnv_id !== socket.cnv_id) {
               app.db.query("UPDATE tokens SET current_cnv = ? WHERE token = ?",
                            [ cnv_id, socket.token ],
               function(err, cnv_rows)
               {
                  error.handler(err, "cnv_load", error.msg.internal, socket);
               });
               app.db.query("UPDATE users SET current_cnv = ? WHERE id = ?",
                            [ cnv_id, socket.user.id ],
               function(err, cnv_rows)
               {
                  error.handler(err, "cnv_load", error.msg.internal, socket);
               });
            }

            // Get the users participating in the conversation:
            app.db.query("SELECT name " +
                         "FROM users " +
                         "INNER JOIN users_conversations ON users.id = users_conversations.user_id " +
                         "WHERE users_conversations.cnv_id = ? " +
                         "ORDER BY name ASC",
                         [ cnv_id ],
            function(err, user_rows)
            {
               if (error.handler(err, "cnv_load", error.msg.internal, socket)) return null;

               // Remove metadata that doesn't need to be returned to the user:
               delete user_rows.info;
               cnv.users = user_rows;
               // Save the current conversation in the socket object:
               socket.cnv_id = cnv.id;

               callback(null, cnv);
            });
         });
      });



/*
      // Update a conversation:

      socket.on("cnv_update", function(cnv, callback)
      {
         applog("socket.cnv_update", format_suc(socket));

         app.db.query("UPDATE conversations " +
                      "SET settings = ? " +
                      "WHERE id = ?",
                      [ cnv.settings, socket.cnv_id ],
         function(err, update_info)
         {
            if (error.handler(err, "cnv_update: update cnv", error.msg.internal, socket)) { callback(err); return true; }

            app.db.query("UPDATE users_conversations " +
                         "SET name = ?, settings = ? " +
                         "WHERE user_id = ? AND cnv_id = ?",
                         [ cnv.name, cnv.user_settings, socket.user.id, socket.cnv_id ],
            function(err, update_info)
            {
               if (error.handler(err, "cnv_update: update user_cnv", error.msg.internal, socket)) { callback(err); return true; }

               callback(null);
            });
         });
      });
*/



      // Load a group of messages from the current conversation and return them to the user:
      //
      //    msg_id             Mixed      Message ID to load messages from, or "first" or "last" to load from the beginning/end of the conversation.
      //    msg_count_before   Number     Number of messages before the specified message, or number of messages from the end of the conversation.
      //    msg_count_after    Number     Number of messages after the specified message.  Ignored if msg_id is null.
      //    callback           Function   Callback function to execute when done.  Arguments are:
      //       err                Mixed      An error message, or null if successful.
      //       msgs               Array      Array of message objects.
      //       msgs_preceding     Boolean    Flag indicating there are messages before the range loaded.
      //       msgs_following     Boolean    Flag indicating there are messages after the range loaded.

      socket.on("cnv_load_msg_range", function(msg_id, msg_count_before, msg_count_after, callback)
      {
         applog("socket.cnv_load_msg_range", format_suc(socket) + ": " + msg_count_before + " <- " + msg_id + " -> " + msg_count_after);

         if (typeof callback         !== "function") return;
         if (typeof msg_count_before !== "number"  ) { msg_count_before = 0; }
         if (typeof msg_count_after  !== "number"  ) { msg_count_after  = 0; }

         var sql_string = "";
         var sql_params = null;

         const select_messages = "SELECT messages.id, messages.user_id = ? AS this_user, users.name, messages.status, messages.body, messages.created " +
                                 "FROM messages " +
                                 "INNER JOIN users ON users.id = messages.user_id " +
                                 "WHERE cnv_id = ? ";

         // Handle string IDs:
         if (typeof msg_id === "string") {
            // Load messages from the end of the conversation:
            if (msg_id === "last") {
               sql_string = "SELECT msg_range.* " +
                            "FROM (" +
                               select_messages +
                               "ORDER BY messages.id DESC " +
                               "LIMIT " + msg_count_before +
                            ") AS msg_range " +
                            "ORDER BY msg_range.id ASC";
               sql_params = [ socket.user.id, socket.cnv_id ];
            }
            // Load messages from the start of the conversation:
            else if (msg_id === "first") {
               sql_string = select_messages +
                            "ORDER BY messages.id ASC " +
                            "LIMIT " + msg_count_after;
               sql_params = [ socket.user.id, socket.cnv_id ];
            }
            // Otherwise load messages from a specific date:
            else {
               sql_string = select_messages + "AND messages.created >= ? " +
                            "ORDER BY messages.id ASC " +
                            "LIMIT " + msg_count_after;
               sql_params = [ socket.user.id, socket.cnv_id, msg_id ];
            }
         }
         // Handle actual message IDs:
         else if (typeof msg_id === "number") {
            // Load a single message:
            if ((msg_count_before === 0) && (msg_count_after === 0)) {
               sql_string = select_messages + "AND messages.id = ?";
               sql_params = [ socket.user.id, socket.cnv_id, msg_id ];
            }
            // Load a message with messages only after it:
            else if (msg_count_before === 0) {
               msg_count_after++;
               sql_string = select_messages + "AND messages.id >= ? " +
                            "ORDER BY messages.id ASC " +
                            "LIMIT " + msg_count_after;
               sql_params = [ socket.user.id, socket.cnv_id, msg_id ];
            }
            // Load a message with messages only before it:
            else if (msg_count_after === 0) {
               msg_count_before++;
               sql_string = "SELECT msg_range.* " +
                            "FROM (" +
                               select_messages + "AND messages.id <= ? " +
                               "ORDER BY messages.id DESC " +
                               "LIMIT " + msg_count_before +
                            ") AS msg_range " +
                            "ORDER BY msg_range.id ASC";
               sql_params = [ socket.user.id, socket.cnv_id, msg_id ];
            }
            // Load a message with messages before and after it:
            else {
               msg_count_after++;
               sql_string = "SELECT msg_range.* " +
                            "FROM (" +
                               "(" +
                                  select_messages + "AND messages.id < ? " +
                                  "ORDER BY messages.id DESC " +
                                  "LIMIT " + msg_count_before +
                               ") " +
                               "UNION " +
                               "(" +
                                  select_messages + "AND messages.id >= ? " +
                                  "ORDER BY messages.id ASC " +
                                  "LIMIT " + msg_count_after +
                               ") " +
                            ") AS msg_range " +
                            "ORDER BY msg_range.id";
               sql_params = [ socket.user.id, socket.cnv_id, msg_id,
                               socket.user.id, socket.cnv_id, msg_id ];
            }
         }
         // If it's not a string or number, bail:
         else {
            error.handler("BUG: Invalid msg_id", "socket.cnv_load_msg_range", error.msg.internal);
            callback("BUG: Invalid msg_id");
            return true;
         }
//log(sql_string);

         // Get the message range:
         app.db.query(sql_string, sql_params,
         function(err, msg_rows)
         {
            if (error.handler(err, "cnv_load_msg_range", error.msg.internal, socket)) { callback(err, null, null, null); return null; }

            msg_rows.info.numRows = parseInt(msg_rows.info.numRows);
            // No messages is OK, just return nothing right away:
            if (msg_rows.info.numRows === 0) {
               callback(null, null, false, false);
            }
            else {
               // Convert numeric strings to numbers and SQL integer true/false to JS boolean:
               var msg_id = null;
               for (var i = 0; i < msg_rows.length; i++) {
                  msg_id = parseInt(msg_rows[i].id);
                  msg_rows[i].id        = msg_id;
                  msg_rows[i].this_user = (msg_rows[i].this_user !== "0");
/*
                  if (app.msgs.id_uuid[msg_id]) {
                     delete app.msgs.uuid_id[app.msgs.id_uuid[msg_id]];
                     delete app.msgs.id_uuid[msg_id];
                  }
*/
               }
               // Add flags indicating there are messages before and/or after the current range:
               app.db.query("SELECT id " +
                            "FROM messages " +
                            "WHERE cnv_id = ? AND id < ? " +
                            "LIMIT 1",
                            [ socket.cnv_id, msg_rows[0].id ],
               function(err, msg_row_preceding)
               {
                  if (error.handler(err, "cnv_load_msg_range", error.msg.internal, socket)) { callback(err, null, null, null); return null; }

                  app.db.query("SELECT id " +
                               "FROM messages " +
                               "WHERE cnv_id = ? AND id > ? " +
                               "LIMIT 1",
                               [ socket.cnv_id, msg_rows[msg_rows.info.numRows - 1].id ],
                  function(err, msg_row_following)
                  {
                     if (error.handler(err, "cnv_load_msg_range", error.msg.internal, socket)) { callback(err, null, null, null); return null; }

                     delete msg_rows.info;
                     msg_rows.msgs_preceding = (msg_row_preceding.info.numRows == 1);
                     msg_rows.msgs_following = (msg_row_following.info.numRows == 1);

                     callback(null, msg_rows, msg_rows.msgs_preceding, msg_rows.msgs_following);
                  });
               });

            }


         });
      });



      // Search for text in the current conversation:

      socket.on("cnv_search", function(search_text, callback)
      {
         applog("socket.cnv_search", format_suc(socket));

         const search_pattern = "%" + search_text + "%";

         app.db.query("SELECT id, body, created " +
                      "FROM messages " +
                      "WHERE cnv_id = ? AND body LIKE ?",
                      [ socket.cnv_id, search_pattern ],
         function(err, search_rows)
         {
            if (error.handler(err, "socket.cnv_search", error.msg.internal, socket)) { callback(err, null); return null; }

            delete search_rows.info;
            callback(null, search_rows);
         });
      });



      // Get all dates in the current conversation:

      socket.on("cnv_list_dates", function(callback)
      {
         applog("socket.cnv_list_dates", format_suc(socket));

         app.db.query("SELECT DISTINCT DATE_FORMAT(created, '%Y-%m-%d') AS date " +
                      "FROM messages " +
                      "WHERE cnv_id = ?",
                      [ socket.cnv_id ],
         function(err, date_rows)
         {
            if (error.handler(err, "socket.cnv_list_dates", error.msg.internal, socket)) { callback(err, null); return null; }

            delete date_rows.info;
            callback(null, date_rows);
         });
      });



      // Get all media items with a thumbnail in the current conversation:

      socket.on("cnv_list_media", function(callback)
      {
         applog("socket.cnv_list_media", format_suc(socket));

         const media_list = fs.readdirSync(app.path.upload_cnv + "/" + socket.cnv_id).filter(
         function(filename)
         {
            return (filename.indexOf("__t") !== -1);
         });

         var filename = "";
         var j        = 0;

         for (var i = 0; i < media_list.length; i++) {
            filename = media_list[i];
            j = filename.indexOf("__");
            media_list[i] = {
               media_id: filename.substring(j - 32, j),
               filename: filename.substring(j + 2, filename.indexOf("__", j + 2)),
            }
         }

         callback(null, media_list);
      });



      // Find the message ID corresponding to a media item in the current conversation:

      socket.on("cnv_find_media_item", function(media_id, callback)
      {
         applog("socket.cnv_find_media_item", format_suc(socket) + ": " + media_id);

         app.db.query("SELECT id " +
                      "FROM messages " +
                      "WHERE cnv_id = ? AND body LIKE ?",
                      [ socket.cnv_id, "%" + media_id + "%" ],
         function(err, msg_rows)
         {
            if (error.handler(err, "socket.cnv_find_media_item", error.msg.internal, socket)) { callback(err, null); return null; }
            if (!msg_rows[0]) { callback("Media ID not found in a message", null); return null; }

            callback(null, parseInt(msg_rows[0].id));
         });
      });



      // Archive the current conversation:

      socket.on("cnv_archive", function(search_text, callback)
      {
         applog("socket.cnv_archive", format_suc(socket));

         app.db.query("SELECT users.name, body, created " +
                      "FROM messages " +
                      "INNER JOIN users ON users.id = messages.user_id " +
                      "WHERE cnv_id = ?",
                      [ socket.cnv_id ],
         function(err, archive_rows)
         {
            if (error.handler(err, "socket.cnv_archive", error.msg.internal, socket)) { callback(err, null); return null; }
//dir(archive_rows);

            delete archive_rows.info;
            callback(null, archive_rows);
         });
      });



      ////////////////////////////
      /////  MESSAGE EVENTS  /////
      ////////////////////////////



      // A typing notification has been received from a user:

      socket.on("msg_typing", function()
      {
         applog("socket.msg_typing", format_suc(socket));

         // Relay the notification to the rest of the conversation:
         socket.broadcast({
            cnv_id:         socket.cnv_id,
            include_sender: false,
            include_user:   false,
            include_others: true,
         },
         "msg_typing", socket.user.name, socket.cnv_id);
      });



      // A new message has been received from a user:
      //    New messages are sent as an array of message objects, but currently only the first is processed.
      //    Looping through them hasn't been implemented yet (no means to send multiple messages from the client yet).
      //
      //    msg.id        String   Temporary UUID of the new message set by the client.
      //    msg.created   String   Timestamp of the message, set by the client.  Yeah, not the best idea.
      //    msg.body      String   The message.
      //
      //    Other information is added or updated here before relaying the message to other users:
      //
      //    msg.id        Number   Updated with the ID assigned by the database.
      //    msg.status    String   Set to MSG_STATUS_RECEIVED.
      //    msg.name      String   The user's display name.

      socket.on("msg_new", function(msgs, callback)
      {
         const msg = msgs[0];

//         applog("socket.msg_new", format_suc(socket) + ": " + (msg.id ? msg.id : msg.body));

         // Handle special command messages:
         //    These aren't saved in the database and don't require any metadata or special processing.
         if (auth.admin(socket.user) && (msg.body.substring(0, 2) === "\\`")) {
            applog("socket.msg_new: command", format_suc(socket) + ": " + (msg.body));

            const i       = msg.body.indexOf(":");
            const cmd     = msg.body.substring(2, (i === -1 ? undefined : i)).toLowerCase();
            const cmd_arg = (i === -1 ? null : msg.body.substring(i + 1));

            switch (cmd) {

               case "help":
                  callback(
                     "\\`dump\n" +
                     "\\`note:text\n" +
                     "\\`create_user:username,password,name\n" +
                     "\\`create_cnv:name\n" +
                     "\\`cnv_add_user:user_id,cnv_id,cnv_name\n" +
                     "\\`genvk\n" +
                     "\\`sigterm\n" +
                     "\\`sigkill\n"
//                     "\\`\n" +
                  );
                  break;

               // Dump stuff:
               case "dump":
//                  log("\nUSERS\n");
//                  for (var user_id in app.users) {
//                     log("   uid " + user_id + ": " + app.users[user_id].name);
//                  }
                  log("\nSOCKETS\n");
                  for (var ws_socket of app.wss.clients) {
                     log("   " + ws_socket.timestamp + "   sid " + ws_socket.id + ", uid " + ws_socket.user.id + ", cnv " + ws_socket.cnv_id + "   " + (ws_socket.ip_address + "        ").substring(0, 15) + "   " + ws_socket.ua_platform);
                  }
                  log("\nPUSH SUBSCRIPTIONS\n");
                  for (var cnv_id in app.cnv_subs) {
                     log("   cnv " + cnv_id);
                     for (var sub_hash in app.cnv_subs[cnv_id]) {
                        log("      " + sub_hash + ": uid " + app.cnv_subs[cnv_id][sub_hash].user.id + ", " + app.cnv_subs[cnv_id][sub_hash].sub.endpoint);
                     }
                  }
                  log("");
                  break;

               // Leave a note in the log:
               //    \`note:<text>
               case "note":
                  log("\nLOG NOTE\n\n" + cmd_arg.trim() + "\n");
                  break;

               // Create a user:
               //    \`create_user:username,password,name
               case "create_user":
                  const values = cmd_arg.split(",");
                  bcrypt.hash(values[1], SALT_ROUNDS, function(err, password_hash)
                  {
                     if (error.handler(err, "socket.msg_new: create_user", "bcrypt.hash error", socket)) { callback("bcrypt.hash error: " + err); return true; }

                     values[1] = password_hash;
                     dir(values);
                     app.db.query("INSERT INTO users (username, password, name) VALUES (?, ?, ?)", values,
                     function(err, rows)
                     {
                        if (error.handler(err, "socket.msg_new: create_user", "insert failed", socket)) { callback("insert failed: " + err); return true; }

                        callback(JSON.stringify(rows));
                     });
                  });
                  break;

               // Create a conversation:
               //    \`create_cnv:name
               case "create_cnv":
                  app.db.query("INSERT INTO conversations (name) VALUES (?)", [ cmd_arg ],
                  function(err, insert_info)
                  {
                     if (error.handler(err, "socket.msg_new: create_cnv", "conversations insert failed", socket)) { callback("conversations insert failed: " + err, null); return true; }

                     const new_cnv_id = parseInt(insert_info.info.insertId);

                     app.db.query("INSERT INTO users_conversations (user_id, cnv_id) VALUES (?, ?)",
                                  [ socket.user.id, new_cnv_id ],
                     function(err, rows)
                     {
                        if (error.handler(err, "socket.msg_new: create_cnv", "users_conversations insert failed", socket)) { callback("users_conversations insert failed: " + err, null); return true; }

                        callback(JSON.stringify(rows));
                     });
                  });
                  break;

               // Add users to a conversation:
               //    \`cnv_add_user:user_id,cnv_id,cnv_name
               case "cnv_add_user":
                  app.db.query("INSERT INTO users_conversations (user_id, cnv_id, cnv_name) VALUES (?, ?, ?)", cmd_arg.split(","),
                  function(err, rows)
                  {
                     if (error.handler(err, "socket.msg_new: cnv_add_users", "insert failed", socket)) { callback("insert failed: " + err); return true; }

                     callback(JSON.stringify(rows));
                  });
                  break;

               // Generate VAPID keys:
               case "genvk":
                  const vapid_keys = app.push.generateVAPIDKeys();
                  dir(vapid_keys);
                  callback(JSON.stringify(vapid_keys));
                  break;

               // Gracefully stop the server:
               case "sigterm":
                  process.kill(process.pid, "SIGTERM");
                  break;

               // Forcefully stop the server:
               case "sigkill":
                  process.kill(process.pid, "SIGKILL");
                  break;

               // Relay commands that aren't for the server:
               default:
                  socket.broadcast({
                     include_sender:  false,
                     include_user:    true,
                     include_others:  true,
                  },
                  "msg_new", msg);
                  break;
            }

            return;
         }

/*
         // Check if the message is being resent when it was actually saved:
         //    This can occur if the message was received and saved but the client
         //    didn't get or acknowledge msg_received, so just try sending it again.
         if (app.msgs.uuid_id[msg.id]) {
            applog("socket.msg_new", format_suc(socket) + ": Resending msg_received: " + app.msgs.uuid_id[msg.id] + ", " + msg.id);
            socket.emit_msg("msg_received", msg.id, app.msgs.uuid_id[msg.id], function()
            {
               // If the client acknowledges, delete the temporary ID info:
//               delete app.msgs.id_uuid[app.msgs.uuid_id[msg.id]];
               delete app.msgs.uuid_id[msg.id];
            });
            return;
         }
*/

         // Otherwise save the message in the database:
         msg.status = MSG_STATUS_RECEIVED;
         app.db.query("INSERT INTO messages (user_id, cnv_id, status, body) VALUES (?, ?, ?, ?)",
                      [ socket.user.id, socket.cnv_id, msg.status, msg.body ],
         function(err, insert_info)
         {
            if (error.handler(err, "socket.msg_new", error.msg.internal, socket)) return true;

            const msg_id = parseInt(insert_info.info.insertId);
            applog("socket.msg_new", format_suc(socket) + ": " + msg_id + ", " + msg.id);
//            app.msgs.id_uuid[msg_id] = msg.id;
//            app.msgs.uuid_id[msg.id] = msg_id;

            // Acknowledge the message and send its new ID back to the originating user:
/*
            socket.emit_msg("msg_received", msg.id, msg_id, function()
            {
               // If the client acknowledges, delete the temporary ID info:
               delete app.msgs.uuid_id[msg.id];
//               delete app.msgs.id_uuid[msg_id];
            });
*/
            callback(msg_id);

            // Update the message with the actual ID and relay the message to the other users:
            msg.id     = msg_id;
            msg.cnv_id = socket.cnv_id;
            msg.name   = socket.user.name;
            socket.broadcast({
               cnv_id:          socket.cnv_id,
               include_sender:  false,
               include_user:    true,
               include_others:  true,
               msg_args_is_msg: true,  // socket.broadcast will add msg.this_user with this flag set.
            },
            "msg_new", msg);

            // Send a notification to everyone in the conversation except the current user (on any device):
            var i        = 0;
            var j        = 0;
            var msg_body = "";
            var img_tag  = "";
            var img_src  = "";

            // Convert img tags to their alt text:
            while (true) {
               // Parse an img tag or bail if there are none/no more:
               i = msg.body.indexOf("<img", j);
               if (i === -1) {
                  // Add the rest of the message string before bailing:
                  msg_body += msg.body.substring(j);
                  break;
               }
               // Add the message string from the previous point up to the current tag:
               //    j points to the beginning of the string or the first character after the previous tag.
               msg_body += msg.body.substring(j, i);
               // Bail if the tag is incomplete:
               j = msg.body.indexOf(">", i);
               if (j === -1) break;
               j++;
               // Separate the tag:
               //    This is mostly so searching for attributes doesn't find one in another tag when it's missing in the current one.
               img_tag = msg.body.substring(i, j);
               // Get the first image src to send as the notification image:
               if (img_src === "") {
                  i = img_tag.toLowerCase().indexOf("media-id=");
                  if (i !== -1) {
                     i += 10;
                     img_src = img_tag.substring(i, img_tag.indexOf("\"", i + 1));
                     if (img_src !== "") {
                        img_src = "media?f=" + img_src + "&t=thumbnail";
                     }
                  }
               }
               // Get the alt text that replaces the img tag:
               i = img_tag.toLowerCase().indexOf("alt=");
               if (i !== -1) {
                  i += 5;
                  msg_body += img_tag.substring(i, img_tag.indexOf("\"", i + 1));
               }
            }
            // Replace <br> with \n, then strip HTML:
            msg_body = msg_body.replace(/<br>/ig, "\n")
                               .replace(/<\/?[^>]+(>|$)/g, "");

            // Loop through push subscriptions for this conversation:
            var push_sub = null;
            for (var push_sub_hash in app.cnv_subs[socket.cnv_id]) {
               push_sub = app.cnv_subs[socket.cnv_id][push_sub_hash];
               // Send a notification to each subscription, except the current user, and if it's enabled:
               //    Whether to show it or not is determined at the client end in the service worker,
               //    which currently is if the client has the focus or not.
//dir(push_sub.sub);
//dir(push_sub.user);
               if (push_sub.sub && push_sub.user) {
                  if (push_sub.user.settings.messages.notifications && (push_sub.user.id != socket.user.id)) {
//dir(push_sub.user);
                     send_notification(push_sub.sub, JSON.stringify({
                        tag:       NOTIFICATION_TAG_MSG + socket.cnv_id,
                        timestamp: Date.now(),
                        title:     msg.name,
                        body:      msg_body,
                        image:     img_src,
                        icon:      "img/G16.png",
                        badge:     "img/G128-badge.png",
                        //sound:     "audio/test.mp3",
                        renotify:  true,
                        //requireInteraction: true,
/*
                        actions: [
                           {
                              action: "notification_click_stuff",
                              title:  "Stuff",
                              icon:   "img/stuff.png",
                           },
                        ],
*/
                     }));
                  }
               }
               // Remove any empty subscription objects left by users logging out:
               else {
                  delete app.cnv_subs[socket.cnv_id][push_sub_hash];
               }
            }
         });
      });



      // One or more messages were acknowledged as delivered by the user:
      //
      //    id_list   Array   List of message IDs to mark as delivered.

      socket.on("msg_delivered", function(id_list)
      {
//         applog("socket.msg_delivered", format_suc(socket) + ": " + JSON.stringify(id_list));

         // Send the acknowledgement to the other users:
         //    All IDs are sent even if some failed to update in the database since they were in fact delivered.
         //    Any that failed can be dealt with later.
         socket.broadcast({
            cnv_id:         socket.cnv_id,
            include_sender: false,
            include_user:   false,
            include_others: true,
         },
         "msg_delivered", id_list);
         msg_update_status(id_list, MSG_STATUS_UNREAD);
      });



      // One or more messages were acknowledged as read by the user:
      //
      //    id_list   Array   List of message IDs to mark as read.

      socket.on("msg_read", function(id_list)
      {
         applog("socket.msg_read", format_suc(socket) + ": " + JSON.stringify(id_list));

         // Send an acknowledgement to everyone in the conversation, including the originating user:
         //    Messages aren't shown to be read in the conversation view until the status has been saved in the database.
         socket.broadcast({
            cnv_id:         socket.cnv_id,
            include_sender: true,
            include_user:   true,
            include_others: true,
         },
         "msg_read", id_list);
         msg_update_status(id_list, MSG_STATUS_READ);
      });



      function msg_update_status(id_list, status)
      {
         // Update the status for each message in the database:
         const pq = app.db.prepare("UPDATE messages SET status = \"" + status + "\" WHERE id = ?");
         var i = 0;
         (function next_msg_id() {
            app.db.query(pq([ id_list[i] ]),
            function(err, update_info)
            {
               error.handler(err, "msg_read: update " + id_list[i], error.msg.internal, socket);

               // Ignore errors and attempt to update all messages:
               i++;
               if (i < id_list.length) {
                  next_msg_id();
               }
            });
         })();
      }



      // A message is to be deleted by the user:
      //    Messages to delete are sent as an array of IDs, but currently only the first is deleted.
      //    Looping through them hasn't been implemented yet (no means to delete multiple messages from the client yet).
      //
      //    id_list   Array   List of message IDs to delete.

      socket.on("msg_delete", function(id_list)
      {
         return;

         const msg = id_list[0];

         applog("socket.msg_delete", format_suc(socket) + ": " + JSON.stringify(id_list));

         // Verify the current user owns the message:
         app.db.query("SELECT user_id, body FROM messages WHERE id = ?",
                      [ msg.id ],
         function(err, msg_rows)
         {
            if (                                         error.handler(err, "socket.msg_delete: check user",                                              error.msg.internal,     socket)) return true;
            if (msg_rows.info.numRows == 0)            { error.handler("Message " + msg.id + " not found",                           "socket.msg_delete", error.msg.unauthorized, socket); return true; }
            if (msg_rows[0].user_id != socket.user.id) { error.handler("User " + socket.user.id + " does not own message " + msg.id, "socket.msg_delete", error.msg.unauthorized, socket); return true; }

            // Delete any media items referenced by the message:
            var i        = 0;
            var msg_body = msg_rows[0].body.toLowerCase();

            (function next()
            {
               i = msg_body.indexOf("media-id", i);
               if (i !== -1) {
                  i += 10;
                  // Find the file (and any duplicates):
                  util.find_file(app.path.upload_cnv, msg_body.substring(i, i + 32), {
                     case_sensitive:   false,
                     match_whole_name: false,
                     recursive:        true,
                  },
                  function(err, results)
                  {
                     if (error.handler(err, "socket.msg_delete", error.msg.internal, socket)) return true;

                     for (var j = 0; j < results.length; j++) {
                        fs.unlinkSync(results[j]);
                     }
                     i += 32;
                     next();
                  });
               }
               else {
                  next();
                  return;
               }
            })();

            // Delete the message:
            app.db.query("DELETE FROM messages WHERE id = ?",
                         [ msg.id ],
            function(err, delete_rows)
            {
               if (error.handler(err, "socket.msg_delete: delete msg", error.msg.internal, socket)) return true;

               // Acknowledge/relay deletion of the message:
               socket.broadcast({
                  cnv_id:         socket.cnv_id,
                  include_sender: true,
                  include_user:   true,
                  include_others: true,
               },
               "msg_delete", [msg.id]);
            });
         });
      });



      function send_notification(push_sub, notification)
      {
//         applog("send_notification", JSON.stringify(notification));

         app.push.sendNotification(push_sub, notification, { TTL: 86400 })
         .catch(function(error) {
            applog("send_notification", JSON.stringify(notification));
            applog("send_notification", "*** ERROR");
            dir(error);
         });
      }



      /////////////////////////
      /////  MISC EVENTS  /////
      /////////////////////////



      socket.on("app_get_user_list", function(callback)
      {
         applog("socket.user_get_list", format_su(socket));

         app.db.query("SELECT id, name FROM users WHERE public = TRUE",
         function(err, user_rows)
         {
            if (error.handler(err, "user_get_list", error.msg.internal, socket)) return true;

            delete user_rows.info;
            const user_list = [];
            for (var i in user_rows) {
               user_rows[i].uuid = util.new_uuid();
               user_list.push({
                  uuid: user_rows[i].uuid,
                  name: user_rows[i].name,
               });
            }
            socket.user_list = user_rows;
            callback(user_list);
         });
      });



      socket.on("app_emoji_list", function(category, callback)
      {
         applog("socket.app_emoji_list", format_suc(socket) + ": " + category);

         var pathspec    = app.path.emoji;
         var pathspec_fb = "/fb/1.0/128";

         switch (category) {
            case "emoji_category_smileys":
               pathspec += (pathspec_fb + "/1-smileys-and-people");
               break;
            case "emoji_category_animals":
               pathspec += (pathspec_fb + "/2-animals-and-nature");
               break;
            case "emoji_category_food":
               pathspec += (pathspec_fb + "/3-food-and-drink");
               break;
            case "emoji_category_activities":
               pathspec += (pathspec_fb + "/4-activities");
               break;
            case "emoji_category_travel":
               pathspec += (pathspec_fb + "/5-travel-and-places");
               break;
            case "emoji_category_objects":
               pathspec += (pathspec_fb + "/6-objects");
               break;
            case "emoji_category_symbols":
               pathspec += (pathspec_fb + "/7-symbols");
               break;
            case "emoji_category_flags":
               pathspec += (pathspec_fb + "/8-flags");
               break;
            default:
               error.handler("BUG: Unknown emoji category: \"" + category + "\"", "socket.app_emoji_list", error.msg.internal, socket);
               return;
         }

         util.find_files(pathspec, {
            basepath:  path.resolve(app.path.emoji + "/.."),
            recursive: false,
//            prepend:   "/",
         },
         function(err, results)
         {
            if (error.handler(err, "app_emoji_list", error.msg.internal, socket)) return true;

//            dir(results);
//            socket.emit_msg("app_emoji_list", results);
            callback(results);
         });
      });



      socket.on("app_media_info", function(media_id, callback)
      {
         applog("socket.app_media_info", format_suc(socket) + ": " + media_id);

         // Find the file:
         var pathspec = path.join(app.path.upload_cnv, socket.cnv_id.toString());
         util.find_file(pathspec, media_id, {
            case_sensitive:   false,
            match_whole_name: false,
            recursive:        false,
         },
         function(err, results)
         {
            if (error.handler(err, "socket.app_media_info")) { callback(media_id + " not found"); return true; }

            for (var i in results) {
               if (results[i].indexOf("__i.txt") > 0) {
                  pathspec = results[i];
                  break;
               }
            }
            fs.readFile(pathspec, {
               encoding: "utf8",
            }, function(err, data)
            {
               if (error.handler(err, "socket.app_media_info")) { callback("Error reading " + media_id); return true; };

               callback(data);
            });
         });
      });



      socket.on("app_stats", function(callback)
      {
         applog("socket.app_stats", format_suc(socket));

         app.db.query("SELECT SUM(CASE WHEN user_id = ? AND cnv_id = ? THEN 1 ELSE 0 END) AS msgs_user_cnv, " +
                             "SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS msgs_user_total, " +
                             "SUM(CASE WHEN cnv_id = ? THEN 1 ELSE 0 END) AS msgs_cnv, " +
                             "COUNT(*) AS msgs_total " +
                      "FROM messages",
                      [ socket.user.id, socket.cnv_id, socket.user.id, socket.cnv_id ],
         function(err, stats_rows)
         {
            if (error.handler(err, "socket.app_stats", error.msg.internal, socket)) { return true; }

            delete stats_rows.info;
            callback(stats_rows[0]);
         });
      });



      socket.on("app_send_log", function(socket_id, callback)
      {
         applog("socket.app_send_log", format_su(socket) + ": socket_id " + socket_id);

         for (var ws_socket of app.wss.clients) {
            if (ws_socket.id === socket_id) {
               ws_socket.emit_msg("app_send_log", function(log_text)
               {
                  callback(log_text);
               });
               break;
            }
         }
      });



      //////////////////////////
      /////  ADMIN EVENTS  /////
      //////////////////////////



      socket.on("admin_user_create", function(user)
      {
         applog("socket.admin_user_create", socket.id);

         bcrypt.hash(user.password, SALT_ROUNDS, function(err, password_hash)
         {
            if (err) { applog("socket.admin_user_create", "Error"); dir(err); socket.emit_msg("status", err); return; }

            app.db.query("INSERT INTO users (username, password, name, settings) VALUES (?, ?, ?, ?)",
                         [ user.username, password_hash, user.name, true, JSON.stringify(DEFAULT_USER_SETTINGS) ],
            function(err, rows)
            {
               if (error.handler(err, "admin_user_create", error.msg.internal, socket)) { return true; }

               socket.emit_msg("status", rows);
            });
         });
      });



      socket.on("admin_user_delete", function(user)
      {
         applog("socket.admin_user_delete", socket.id + ", " + user.id);

         app.db.query("DELETE FROM users WHERE id = ?",
                      [ user.id ],
         function(err, rows)
         {
            if (error.handler(err, "admin_user_delete", error.msg.internal, socket)) { return true; }

            socket.emit_msg("status", rows);
         });
      });



      socket.on("admin_user_reset_settings", function(user)
      {
         applog("socket.admin_user_reset_settings", socket.id);

         app.db.query("UPDATE users SET settings = ? WHERE id = ?",
                      [ JSON.stringify(DEFAULT_USER_SETTINGS), user.id ],
         function(err, rows)
         {
            if (error.handler(err, "admin_user_reset_settings", error.msg.internal, socket)) { return true; }

            socket.emit_msg("status", rows);
         });
      });

   } // socket_init()



   //////////////////////////////
   /////  WEBSOCKET SERVER  /////
   //////////////////////////////



   app.wss.on("listening", function()
   {
      applog("app.wss.listening", "WebSocket server listening");
   });



   app.wss.on("headers", function(headers, req)
   {
//      applog("app.wss.headers", (req.method + " " + req.url + REQ_PADDING).substring(0, REQ_PADDING_WIDTH) + "   " + req.headers["user-agent"]);

      headers.push("Server: " + app.info.name);
//dir(req);
   });



   // This occurs after the route event.

   app.wss.on("connection", function(socket, req)
   {
//      applog("app.wss.connection", (req.method + " " + req.url + REQ_PADDING).substring(0, REQ_PADDING_WIDTH) + "   " + req.headers["user-agent"]);
//dir(socket);
//dir(req);
   });



   app.wss.on("close", function()
   {
      applog("app.wss.close", "WebSocket server closed");
   });



   app.wss.on("error", function(err)
   {
      applog("app.wss.error", "*** ERROR");
      dir(err);
   });



} // module.exports



