


var current_user = null;



//////////////////////////
/////  LOGIN EVENTS  /////
//////////////////////////



// When the page is refreshed, the app tries to log in with a session token.
//    If this is successful, a socket connection is made, and the server sends app_start to set everything up.

$document.ready(function()
{

   $("#welcome").click(function(event)
   {
      login_dialog_show();
      return false;
   });



   // Trying to detect an unauthorized login doesn't seem possible via the socket connection process.
   //    It doesn't seem possible to return a socket close code from the ws verifyClient function
   //    and it's not possible to get any HTTP error or socket close information from here.
   //    Therefore using an HTTP login beforehand to set the session token before connection the socket.
   user_login_token();
//   socket.connect();



});



// socket.online is triggered whenever the app goes offline or online.

socket.on("online", function(connected)
{
   // Clear the mark as read lock on connection:
   //    It's possible the connection was lost before receiving msg_read as confirmation
   //    of marking messages as read, and this allows it to be done again.
   if (connected && current_cnv) {
      current_cnv.msg_read_all_lock = false;
//      cnv_send_messages();
   }
   if (user_logged_in()) {
      ui_update();
   }
});



// app_start is sent by the server to say go ahead.
//    This can occur on any new socket connection (after page load, or reconnect).

socket.on("app_start", function(callback)
{
   applog("socket.app_start", "", LOG_FLAGS.INIT);

   ui_load_indicator_show();
   callback();
   app_update_push_sub();
   socket.emit("user_load", function(user)
   {
      applog("socket.user_load", "", LOG_FLAGS.USER);
      user_load(user);
   });
});



// user_update is sent by the server when user info changes.
//    Currently only used to update the user's display name if it changes.

socket.on("user_update", function(user, callback)
{
   applog("socket.user_update", user.name, LOG_FLAGS.USER);

   // Currently only the user's display name is used in any way.

   // Update the user's display name if it changed:
   if (current_cnv && (user.prev_name != user.name)) {
      for (var i in current_cnv.users) {
         if (current_cnv.users[i].name == user.prev_name) {
            current_cnv.users[i].name = user.name;
            break;
         }
      }
      // Recreate the participants string:
      cnv_set(current_cnv);
      ui_update();
   }
   callback();
});



/////////////////////////////
/////  LOGIN FUNCTIONS  /////
/////////////////////////////



// login_dialog_show prompts the user for a username/password.

function login_dialog_show()
{
   dialogbox_show($("#app_login").html(), {

      init:           function($dialog)
      {
         $dialog.find("#login_username").on("keydown", function(event)
         {
            if (event.keyCode == KEY_ENTER) {
               $dialog.find("#login_password").focus();
               return false;
            }
         });
      },

      ok_button:      function($dlg_button)
      {
         var $dialog  = $dlg_button.parents(".dialogbox");
         var username = $dialog.find("#login_username").val().trim();
         var password = $dialog.find("#login_password").val().trim();

         if (username == "") {
            $dialog.find("#login_message").html("Try really hard to enter a username.");
            $dialog.find("#username").focus();
         }
         else if (password == "") {
            $dialog.find("#login_message").html("Try really hard to enter a password.");
            $dialog.find("#password").focus();
         }
         else {
            user_login(username, password, $dialog)
         }

         // The login dialog box is closed in user_load if successful:
         return false;
      },

      cancel_button:  true,

      default_button: "ok_button",
      escape_button:  "cancel_button",

   })
   .find("#login_username").focus();
}



// user_login logs a user in via username/password.
//    This is done with an AJAX POST to /login with JSON data.
//
//    username       String   Probably what you think it is.  It could be something else, but not likely.
//    password       String   Might be what you think it is.  It could be something else, but maybe not.
//    login_dlg_id   String   Optional: ID of the dialog box to close if the login is successful.

function user_login(username, password, $login_dlg)
{
//   applog("user_login", "", LOG_FLAGS.LOGIN);

   $.ajax({
      url:         "login",
      method:      "post",
      data:        JSON.stringify({
         username: username,
         password: password,
      }),
      contentType: "application/json",

      success:     function(data, status, xhr)
      {
         applog("user_login", status + ": " + xhr.status + " " + xhr.statusText + ": " + data, LOG_FLAGS.LOGIN);

         if ($login_dlg) {
            dialogbox_hide($login_dlg.attr("id"));
         }
         socket.connect();
      },

      error:       function(xhr, status, error)
      {
         warn("user_login", status + ": " + xhr.status + " " + error, LOG_FLAGS.LOGIN);

//         ui_update();
         if ($login_dlg) {
            switch (xhr.status) {
               case 401:
               case 403:
                  $login_dlg.find("#login_message").html("Nice try.");
                  break;
               default:
                  $login_dlg.find("#login_message").html("Sheeeit: " + xhr.status + " " + error);
                  break;
            }
            $login_dlg.find("#password").focus();
         }
      },
   });
}



// user_login_token logs a user in via session token saved from a previous manual login.

function user_login_token()
{
//   applog("user_login_token", "", LOG_FLAGS.LOGIN);

   $.ajax({
      url:     "login",
      method:  "get",

      success: function(data, status, xhr)
      {
         applog("user_login_token", status + ": " + xhr.status + " " + xhr.statusText + ": " + data, LOG_FLAGS.LOGIN);

         socket.connect();
      },

      error:   function(xhr, status, error)
      {
         warn("user_login_token", status + ": " + xhr.status + " " + error, LOG_FLAGS.LOGIN);

         ui_update();
         ui_page_cover_remove();
//         dialogbox_show_text("Token login failed:<br><br>" +
//                             xhr.status + ": " + error + "<br><br>" +
//                             JSON.stringify(xhr).replace(/"\n"/g, "<br>"), {
//            close_button:   true,
//            default_button: "close_button",
//            escape_button:  "close_button",
//         });
      },
   });
}



// user_load sets up login and user info locally.
//
//    user   Object   User info from the database.

function user_load(user)
{
   applog("user_load", (user ? user.username + " / " + user.name : "null"), LOG_FLAGS.USER); // JSON.stringify(user));
//dir(user);

   if (user) {
      // Save the user info locally:
      current_user = user;
//      ui_update();
      app_sw_update_user_settings();
//applog("user_load", "ua_prev:    " + user.ua_prev);
//applog("user_load", "ua_current: " + user.ua_current);
//      if (user.ua_prev != user.ua_current) {
//         alert("user-agent mismatch");
//      }
      emoji_update_scale(user.settings.display.emoji_scale);
      if (user.current_cnv == 0) {
         user.current_cnv = null;
      }
      cnv_load(user.current_cnv);
      ui_page_cover_remove();
   }
   else {
      user_clear();
   }
}



// user_logout logs a user out.

function user_logout()
{
   applog("user_logout", "", LOG_FLAGS.USER);

   socket.emit("user_logout", function()
   {
      $.ajax({
         url:     "logout",
         method:  "get",

         success: function(data, status, xhr)
         {
            applog("user_logout", status + ": " + xhr.status + " " + xhr.statusText + ": " + data, LOG_FLAGS.USER);
            socket.close(WS_CC_CLIENT_LOGOUT, "User requested logout");
            user_clear();
         },

         error:   function(xhr, status, error)
         {
            warn("user_logout", status + ": " + xhr.status + " " + error, LOG_FLAGS.USER);
            ui_update();
            dialogbox_show_text("Logout failed:<br><br>" +
                                status + ": " + error + "<br><br>" +
                                JSON.stringify(xhr).replace(/"\n"/g, "<br>"), {
               close_button:   true,
               default_button: "close_button",
               escape_button:  "close_button",
            });
         },
      });
   });
}



// user_clear resets the local login and user info and updates the UI.

function user_clear()
{
//   user_set_token(null);
   current_user = null;
   attachmentbar_hide();
   emojibar_hide();
   $msgbufferbar.hide();
   ui_update();
}



/*
function user_check_password(password, callback)
{
   socket.emit("user_check_password", pw_valid, function()
   {
      callback(pw_valid);
   });
}
*/



function user_logged_in()
{
   return (current_user !== null);
}



