


/////////////////////////////
/////  SETTINGS EVENTS  /////
/////////////////////////////

$document.ready(function()
{

   $app_settings.find(".section-heading").on("click", function(event)
   {
      $(this).next().toggle();
      return false;
   });

   var test_num = 1;

   $app_settings.find("#test_notifications").on("click", function(event)
   {
      ui_show_notification({
         tag:   NOTIFICATION_TAG_MSG_TEST,
         title: "Test notification " + test_num++,
         body:  "Testing, testing, 1, 2, 3...",
      });
      return false;
   });

/*
   $app_settings.find("#settings_display_background_color").on("keydown", function(event)
   {
log(event.keyCode);
      var key_char = String.fromCharCode(event.keyCode).toUpperCase();
log("\"" + key_char + "\"");

      if (HEX_COLOUR_CHARS.indexOf(key_char) == -1) {
         return false;
      }
   });
*/

   $app_settings.find("#settings_display_background_color").on("change", function(event)
   {
      $app_settings.find("#settings_display_background_color_picker").val($(this).val());
   });

   $app_settings.find("#settings_display_background_color_picker").on("change", function(event)
   {
      $app_settings.find("#settings_display_background_color").val($(this).val().toUpperCase());
   });

   $app_settings.find("#settings_profile_avatar_preview").on("click", function(event)
   {
      return false;
   });



   socket.on("user_save_settings_successful", function(user)
   {
      applog("socket.user_save_settings_successful", "", LOG_FLAGS.USER);
   });

});



////////////////////////////////
/////  SETTINGS FUNCTIONS  /////
////////////////////////////////

function app_settings_show()
{
   dialogbox_show($app_settings, {
      fullwidth:      true,
      fullheight:     true,

      init:           app_settings_init,
      close:          app_settings_close,

      save_button:    app_settings_save,
      cancel_button:  true,
      default_button: "save_button",
      escape_button:  "cancel_button",
   });
}



function app_settings_init($dialog)
{
   // Profile settings:
               $app_settings.find("#settings_profile_username")                .val(current_user.username);
               $app_settings.find("#settings_profile_display_name")            .val(current_user.name);
               $app_settings.find("#settings_profile_avatar")                  .val(current_user.avatar);
               $app_settings.find("#settings_profile_public")                  .val(current_user.public);

   // Display settings:
//             $app_settings.find("#settings_display_theme");
               $app_settings.find("#settings_display_background_color")        .val(current_user.settings.display.background_color         );
               $app_settings.find("#settings_display_background_color_picker") .val(current_user.settings.display.background_color         );
               $app_settings.find("#settings_display_background_wallpaper")    .val(current_user.settings.display.background_wallpaper     );
   set_checked($app_settings.find("#settings_display_large_titlebar"),              current_user.settings.display.large_titlebar           );
   set_checked($app_settings.find("#settings_display_message_headers"),             current_user.settings.display.message_headers          );
               $app_settings.find("#settings_display_timestamp_format")        .val(current_user.settings.display.timestamp_format         );
   set_checked($app_settings.find("#settings_display_avatars"),                     current_user.settings.display.avatars                  );
// set_checked($app_settings.find("#settings_display_right_handed"),                current_user.settings.display.right_handed             );
   set_checked($app_settings.find("#settings_display_always_show_common_emojis"),   current_user.settings.display.always_show_common_emojis);
// set_checked($app_settings.find("#settings_display_always_show_recent_emojis"),   current_user.settings.display.always_show_recent_emojis);
   set_checked($app_settings.find("#settings_display_single_click_emojis"),         current_user.settings.display.single_click_emojis      );
               $app_settings.find("#settings_display_emoji_scale")             .val(current_user.settings.display.emoji_scale              );
   set_checked($app_settings.find("#settings_display_special_fx"),                  current_user.settings.display.special_fx               );

   // Messages settings:
   set_checked($app_settings.find("#settings_messages_send_on_enter"),              current_user.settings.messages.send_on_enter           );
   set_checked($app_settings.find("#settings_messages_send_button"),                current_user.settings.messages.send_button             );
   set_checked($app_settings.find("#settings_messages_emoji_button"),               current_user.settings.messages.emoji_button            );
   set_checked($app_settings.find("#settings_messages_show_others_typing"),         current_user.settings.messages.show_others_typing      );
   set_checked($app_settings.find("#settings_messages_tell_others_typing"),         current_user.settings.messages.tell_others_typing      );
   set_checked($app_settings.find("#settings_messages_notifications"),              current_user.settings.messages.notifications           );
   set_checked($app_settings.find("#settings_messages_notifications_show_content"), current_user.settings.messages.notifications_content   );
   set_checked($app_settings.find("#settings_messages_previews"),                   current_user.settings.messages.previews                );
   set_checked($app_settings.find("#settings_messages_new_msg_indicator"),          current_user.settings.messages.new_msg_indicator       );
   set_checked($app_settings.find("#settings_messages_delivery_confirmation"),      current_user.settings.messages.delivery_confirmation   );
   set_checked($app_settings.find("#settings_messages_read_on_mousemove"),          current_user.settings.messages.read_on_mousemove       );
   set_checked($app_settings.find("#settings_messages_read_on_typing"),             current_user.settings.messages.read_on_typing          );

   // Media settings:
// set_checked($app_settings.find("#settings_media_audio"),                         current_user.settings.media.audio                      );
// set_checked($app_settings.find("#settings_media_video"),                         current_user.settings.media.video                      );
// set_checked($app_settings.find("#settings_media_click_to_load"),                 current_user.settings.media.click_to_load              );
   set_checked($app_settings.find("#settings_media_show_filename"),                 current_user.settings.media.show_filename              );
// set_checked($app_settings.find("#settings_media_show_info"),                     current_user.settings.media.show_info                  );
}



function app_settings_save($dlg_button)
{
//   applog("app_settings_save", "", LOG_FLAGS.UI);

   var $dialog     = $dlg_button.parents(".dialogbox");
   var current_pw  = $app_settings.find("#settings_profile_password").val();
   var user_update = {
      name:      current_user.name,
//      avatar:    current_user.avatar,
   };
   var user        = {
      settings: {
         display:  {},
         messages: {},
         media:    {},
      }
   };

   // Profile settings:
   if (current_pw === "") {
      user.current_password                           = false;
      user.username                                   = current_user.username;
      user.name                                       = current_user.name;
//    user.avatar                                     = current_user.avatar;
      user.public                                     = current_user.public;
   }
   else {
      user.current_password = current_pw;
      user.new_password     = $app_settings.find("#settings_profile_new_password").val();
      if ((user.new_password !== "") && (user.new_password !== $app_settings.find("#settings_profile_confirm_password").val())) {
         dialogbox_show_text("Smooth move ex-lax, your new passwords don't match.  Try typing the same password in each password box this time.", {

            init:           function($dialog)
            {
               $dialog.find("#ok_button span").html("How do I computer?");
            },

            ok_button:      function($button)
            {
               $app_settings.find("#settings_profile_new_password").focus();
               return true;
            },

            default_button: "ok_button",
            escape_button:  "ok_button",
         });
         return false;
      }
      user.username                                   =            $app_settings.find("#settings_profile_username")              .val();
      user.name                                       =            $app_settings.find("#settings_profile_display_name")          .val();
//    user.avatar                                     =            $app_settings.find("#settings_profile_avatar")                .val();
      user.public                                     = is_checked($app_settings.find("#settings_profile_public"                     ));
   }

   // Display settings:
   user.settings.display.theme                     =            $app_settings.find("#settings_display_theme")                 .val();
   user.settings.display.background_wallpaper      =            $app_settings.find("#settings_display_background_wallpaper")  .val();
   user.settings.display.background_color          =            $app_settings.find("#settings_display_background_color")      .val();
   user.settings.display.large_titlebar            = is_checked($app_settings.find("#settings_display_large_titlebar"             ));
   user.settings.display.message_headers           = is_checked($app_settings.find("#settings_display_message_headers"            ));
   user.settings.display.timestamp_format          =            $app_settings.find("#settings_display_timestamp_format")      .val();
   user.settings.display.avatars                   = is_checked($app_settings.find("#settings_display_avatars"                    ));
// user.settings.display.right_handed              = is_checked($app_settings.find("#settings_display_right_handed"               ));
   user.settings.display.always_show_common_emojis = is_checked($app_settings.find("#settings_display_always_show_common_emojis"  ));
// user.settings.display.always_show_recent_emojis = is_checked($app_settings.find("#settings_display_always_show_recent_emojis"  ));
   user.settings.display.single_click_emojis       = is_checked($app_settings.find("#settings_display_single_click_emojis"        ));
   user.settings.display.emoji_scale               =            $app_settings.find("#settings_display_emoji_scale")           .val();
   user.settings.display.special_fx                = is_checked($app_settings.find("#settings_display_special_fx"                 ));

   // Messages settings:
   user.settings.messages.send_on_enter            = is_checked($app_settings.find("#settings_messages_send_on_enter"             ));
   user.settings.messages.send_button              = is_checked($app_settings.find("#settings_messages_send_button"               ));
   user.settings.messages.emoji_button             = is_checked($app_settings.find("#settings_messages_emoji_button"              ));
   user.settings.messages.show_others_typing       = is_checked($app_settings.find("#settings_messages_show_others_typing"        ));
   user.settings.messages.tell_others_typing       = is_checked($app_settings.find("#settings_messages_tell_others_typing"        ));
   user.settings.messages.notifications            = is_checked($app_settings.find("#settings_messages_notifications"             ));
   user.settings.messages.notifications_content    = is_checked($app_settings.find("#settings_messages_notifications_show_content"));
   user.settings.messages.previews                 = is_checked($app_settings.find("#settings_messages_previews"                  ));
   user.settings.messages.new_msg_indicator        = is_checked($app_settings.find("#settings_messages_new_msg_indicator"         ));
   user.settings.messages.delivery_confirmation    = is_checked($app_settings.find("#settings_messages_delivery_confirmation"     ));
   user.settings.messages.read_on_mousemove        = is_checked($app_settings.find("#settings_messages_read_on_mousemove"         ));
   user.settings.messages.read_on_typing           = is_checked($app_settings.find("#settings_messages_read_on_typing"            ));

   // Media settings:
// user.settings.media.audio                       = is_checked($app_settings.find("#settings_media_audio"                        ));
// user.settings.media.video                       = is_checked($app_settings.find("#settings_media_video"                        ));
// user.settings.media.click_to_load               = is_checked($app_settings.find("#settings_media_click_to_load"                ));
   user.settings.media.show_filename               = is_checked($app_settings.find("#settings_media_show_filename"                ));
// user.settings.media.show_info                   = is_checked($app_settings.find("#settings_media_show_info"                    ));

   socket.emit("user_save_settings", user, function(err)
   {
      if (!err) {
         const profile_changed = (user.current_password !== false);
         delete user.current_password;
         delete user.new_password;
         current_user = user;
         emoji_update_scale(user.settings.display.emoji_scale);
//         if (!user.settings.display.special_fx) {
//         }
         if (!user.settings.messages.notifications) {
            ui_clear_notification();
         }
         app_settings_close($dialog);
         dialogbox_hide($dialog.attr("id"));
         ui_update();
         // Update the service worker with user settings:
         app_sw_update_user_settings();
         // Send the user's new info to the other users if it has changed:
         if (profile_changed && (user.name !== user_update.name)) {
//         if (profile_changed && (user.name !== user_update.name) || (user.avatar !== user_update.avatar)) {
            user_update.name   = user.name;
//            user_update.avatar = user.avatar;
            socket.emit("user_update", user_update);
         }
      }
      else {
         dialogbox_show_text("Something went wrong:<br><br>" + err, {

            init:           function($dialog)
            {
               $dialog.find("#ok_button span").html("It's my fault");
            },

            ok_button:      function($button)
            {
               $app_settings.find("#settings_profile_password").focus();
               return true;
            },

            default_button: "ok_button",
            escape_button:  "ok_button",
         });
      }
   });
}



function app_settings_close($dialog)
{
   $app_settings.find("input[type=\"password\"]").val("");
}



