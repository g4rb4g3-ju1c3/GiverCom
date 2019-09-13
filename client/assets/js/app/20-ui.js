


var longclick_timer = null;
var update_cnv_emoji = true;
//var $prev_content   = null;
var typing_timeout  = null;
var new_msg_timer   = null;
var emoji_height    = 40;



var mousemove_throttle_timer = null;

function mousemove_throttle_start()
{
   mousemove_throttle_timer = setTimeout(function()
   {
      mousemove_throttle_timer = null;
   }, 10000);
}

function mousemove_throttle_clear()
{
   clearTimeout(mousemove_throttle_timer);
   mousemove_throttle_timer = null;
}



$window.on("load", function(event)
{
   if (device_type(DEVICE_TYPE_ANDROID)) {
      window.history.replaceState({ location: "base" }, "", "");
      window.history.pushState   ({ location: "home" }, "", "");
   }
   else {
      window.history.replaceState({ location: "home" }, "", "");
   }

});



$window.on("popstate", function(event)
{
   applog("window.popstate", "", LOG_FLAGS.UI);
//dir(event.originalEvent.state);

   const state = event.originalEvent.state;

   switch (state.location) {
      case "base":
         window.history.pushState({ location: "home" }, "", "");
         break;
      case "home":
         if ($("#lightbox").is(":visible")) {
            lightbox_hide();
         }
         break;
   }
});



$document.ready(function()
{

   const scrollbar_width = get_scrollbar_width();
   $header.css("left", "-" + scrollbar_width + "px");
   $footer.css("left", "-" + scrollbar_width + "px");

   $titlebar.hide();
   $titlebar_min.show();
   init_header({});
   ui_update_cnv_emoji();
   ui_resize();

   // Disable image resizing in contenteditable (in Firefox at least):
   exec_command("enableObjectResizing", false);



   ///////////////////////////
   /////  WINDOW EVENTS  /////
   ///////////////////////////

   $window.on("focus", function(event)
   {
//      applog("window.focus", "Calling ui_clear_cnv_notification", LOG_FLAGS.UI);

      if (current_cnv) {
         current_cnv.new_msgs = false;
         ui_new_msg_indicator_hide();
         ui_clear_cnv_notification(true, true);
      }
   });

   $window.on("resize", function(event)
   {
//      applog("window.resize", "", LOG_FLAGS.UI);

      ui_resize();
      dialogbox_resize_all();
   });

   $window.on("mousemove touchstart touchmove", function(event)
   {
      if ((mousemove_throttle_timer === null) && document.hasFocus() && current_cnv && (current_cnv.unread_msgs.length > 0)) {
//         applog("window.mousemove", "Calling ui_clear_cnv_notification", LOG_FLAGS.UI);
         mousemove_throttle_start();
//         ui_new_msg_indicator_hide();
         if (current_cnv.new_msgs) {
            current_cnv.new_msgs = false;
            ui_clear_cnv_notification(false, true);
         }
         msg_read_on_mousemove();
      }
   });

/*
   $window.on("mousedown mouseup", function(event)
   {
      if (event.which === RIGHT_BUTTON) {
         return false;
      }
   });
*/

   $window.on("click", function(event)
   {
//      applog("window.click", "", LOG_FLAGS.UI);

      if (event.which === RIGHT_BUTTON) {
//         return false;
      }
      else {
         attachmentbar_hide();
         emojibar_hide();
      }
   });

/*
   $window.on("beforeunload", function(event)
   {
      applog("window.beforeunload", "", LOG_FLAGS.UI);

      alert("beforeunload");
      allow_ui_update = false;
      event.returnValue = "blarg";
      return "blarg";
   });
*/



   /////////////////////////////
   /////  DOCUMENT EVENTS  /////
   /////////////////////////////

   // So far, document.hidden === (document.visibilityState === "hidden")
   //
   // Firefox uses all of these:
   // It does not detect if the window is obscured when it doesn't have the focus but is still on-screen.
   //
   //    Switch away from tab      blur (hasFocus false, visible) -> visibilitychange(hasFocus false, hidden )   Short delay between events
   //    Switch to tab             focus(hasFocus true,  hidden ) -> visibilitychange(hasFocus true,  visible)
   //
   //    Switch away from window   blur (hasFocus false, visible)
   //    Switch to window          focus(hasFocus true,  visible)
   //
   //    Minimize window           blur (hasFocus false, visible) -> visibilitychange(hasFocus false, hidden )
   //    Restore window            visibilitychange(hasFocus false, visible) -> focus(hasFocus true,  visible)
   //
   // Android:
   //
   //    Locking/unlocking the screen triggers the visibilitychange event.
   //
   // BB10 only uses visibilitychange:
   //
   //    Switch away from tab   visibilitychange(hasFocus false, hidden )
   //    Switch to tab          visibilitychange(hasFocus true,  visible)
   //
   //    Minimize window        visibilitychange(hasFocus true,  hidden )   hasFocus can't be trusted (set to whatever it was before)
   //    Restore window         visibilitychange(hasFocus false, visible)
   //
   //    Lock screen            visibilitychange(hasFocus false, hidden )
   //    Unlock screen          visibilitychange(hasFocus false, visible)

   $document.on("visibilitychange", function()
   {
//      applog("document.visibilitychange", "hasFocus: " + document.hasFocus() + "\t\thidden: " + document.hidden + "\tvisibilityState: " + document.visibilityState, LOG_FLAGS.UI);
//      applog("document.visibilitychange", "hasFocus: " + document.hasFocus() + ", visibilityState: " + !document.hidden, LOG_FLAGS.UI);

//      $ping_status.html((document.hasFocus() ? "focus" : "blur") + " " + (document.hidden ? "hidden" : "visible"));
      if (!document.hidden) {
//         ui_update();
         if (user_logged_in() && !socket.connected) {
            socket.reconnect();
         }
      }
   });

/*
   $document.on("focus", function()
   {
//      applog("document.focus", "hasFocus: " + document.hasFocus() + "\t\thidden: " + document.hidden + "\tvisibilityState: " + document.visibilityState, LOG_FLAGS.UI);

//      $ping_status.html("focus");
//      ui_update();
   });
*/

/*
   $document.on("blur", function()
   {
//      applog("document.blur", "hasFocus: " + document.hasFocus() + "\t\thidden: " + document.hidden + "\tvisibilityState: " + document.visibilityState, LOG_FLAGS.UI);
   });
*/



   ///////////////////////
   /////  UI EVENTS  /////
   ///////////////////////

/*
   // Stop swipes on the header and footer from scrolling the window:
   $header.on("touchstart", function(event)
   {
//      event.preventDefault();
   });

   $footer.on("touchstart", function(event)
   {
//      event.preventDefault();
   });
*/

   $("#app_about_content").click(function(event)
   {
      dialogbox_hide($(this).parents(".dialogbox").attr("id"));
      return false;
   });

});



//////////////////////////
/////  UI FUNCTIONS  /////
//////////////////////////



function exec_command(cmd, arg)
{
   window.document.execCommand(cmd, false, arg);
}



// ui_page_cover_remove gets rid of the giant purple div that covers the page.
//    This is a one-time thing that blanks out the page from when it loads
//    to after the initial token login attempt is complete (successful or not).
//    If already logged in, it hides the welcome screen and blank conversation
//    from showing briefly and annoyingly, which would create a crappy user experience.

function ui_page_cover_remove()
{
   if ($page_cover !== null) {
      $page_cover.remove();
      $page_cover = null;
   }
}



function ui_resize()
{
//   applog("ui_resize", "", LOG_FLAGS.UI);

//   var window_height   = $window.height();
   var content_height  = $window.height();
   var header_height   = 0;
   var footer_height   = 0;
   var emojibar_height = $emojibar.height();

/*
   // Automatically show/hide header stuff based on window size
   //    and calculate the header size:
   if (window_height < 250) {
      if ($titlebar.is(":visible")) {
         $titlebar.hide();
      }
   }
   else {
      if (!$titlebar.is(":visible")) {
         $titlebar.show();
      }
   }
*/
   header_height = $header.outerHeight();

/*
   // Automatically show/hide footer stuff based on window size
   //    and calculate the footer size:
   if (window_height < 350) {
      if ($footer.is(":visible")) {
         $footer.hide();
      }
   }
   else {
      if (!$footer.is(":visible")) {
         $footer.show();
      }
      footer_height = $footer.outerHeight();
   }
*/
   footer_height = $footer.outerHeight() - emojibar_height;

   content_height -= (header_height + footer_height);
   $available_emojis.height(Math.min(emoji_height * emoji_rows + parseInt($(".emoji").css("padding-bottom")), content_height - (emojibar_height - $available_emojis.height())));
   emojibar_height = $emojibar.height();
   content_height -= emojibar_height;
   footer_height  += emojibar_height;

   $content_scroll.css("top",    header_height  + "px")
                  .css("bottom", footer_height  + "px");
   $welcome       .css("min-height", content_height + "px");
   $conversation  .css("min-height", content_height + "px");
   // Set the automatic width to a fixed with for the message input box width so wrapping works:
//   $msg_body_input.width("auto");
//   $msg_body_input.width($msg_body_input.width());

   // Keep the bottom of the conversation in view if scrolled to the bottom:
   //    Secondary delayed call for slowass BB10 browser to let the keyboard finish sliding into view.
   //    Also because image placeholders may be shown but not loaded.
   cnv_scroll_bottom();
/*
   if (device_type(DEVICE_TYPE_BB10)) {
      setTimeout(cnv_scroll_bottom, 100);
   }
*/
}



/*
function body_height()
{
   return ($window.height() - $header.outerHeight() - $footer.outerHeight() - ($inputbar.is(":visible") ? $inputbar.outerHeight() : 0));
}
*/



function ui_show_content($element)
{
//   $prev_content = $content.children();
//   $content_holding.append($prev_content);
   $content_holding.append($content.children());
   $content.append($element);
}



/*
function ui_restore_content()
{
   if ($prev_content !== null) {
      $content_holding.append($content.children());
      $content.append($prev_content);
      $prev_content = null;
   }
}
*/



function ui_update()
{
   const logged_in = user_logged_in();
   const connected = socket.connected;

//applog("ui_update", "connected: " + connected + ", logged_in: " + logged_in, LOG_FLAGS.UI);
//log("ui_update");
//console.trace();

   $header.toggleClass("disconnected", logged_in && !connected)
          .css("height", "auto");
   init_header({
      // "&#127821;&#x1F9C0;&#x01F414;&#x01F410;&#x01F415;&#x01F408; " + app.info.name + " &#x01F408;&#x01F415;&#x01F410;&#x01F414;&#x1F9C0;&#x1F34D;"
      // "&#127821;&#x1F9C0;&#x01F414;&#x01F410;&#x01F415;&#x01F408;"
      title:    (logged_in ? (current_cnv ? current_cnv.name         : "Are you talking to yourself?") : app.info.name),
      subtitle: (logged_in ? (current_cnv ? current_cnv.participants : "Kinda looks like you're talking to yourself") : "Chat with crazy people"),
   });
   $("#header #avatar").toggleClass("icon-about",        !logged_in)
                       .toggleClass("icon-conversations", logged_in);
   $("#hamburger_menu_username").html("Hamburger menu" + (logged_in && connected ? " for " + current_user.name : ""));
   $("#hamburger_menu_notifications").toggle(logged_in);
   $("#hamburger_menu_conversations").toggle(logged_in);
   $("#hamburger_menu_search")       .toggle(logged_in);
   $("#hamburger_menu_go_to_date")   .toggle(logged_in);
   $("#hamburger_menu_images")       .toggle(logged_in);
   $("#hamburger_menu_stats")        .toggle(logged_in);
   $("#hamburger_menu_settings")     .toggle(logged_in);
   $("#hamburger_menu_logout")       .toggle(logged_in);
   $("#footer #progressbar")         .toggle(logged_in);
   $("#footer #inputbar")            .toggle(logged_in);
   ui_show_content(logged_in ? $conversation : $welcome);
   if (logged_in) {
      $("#footer #emojibar #common_emojis").toggle(current_cnv ? current_user.settings.display.always_show_common_emojis : false);
      if (connected) {
         // Disallow background images on BB10 devices because they're too slow:
         if (device_type(DEVICE_TYPE_BB10)) {
            $body.css("background-color", current_user.settings.display.background_color);
         }
         else {
            $body.css("background", current_user.settings.display.background_color + " url(\"" + window.location.pathname + current_user.settings.display.background_wallpaper + "\") top left / 100% 100% no-repeat fixed");
         }
         $("#footer #inputbar #emoji_button_container").toggle(current_user.settings.messages.emoji_button);
         $("#footer #inputbar #send_button_container") .toggle(current_user.settings.messages.send_button);
         $conversation.find(".media-item-name").toggleClass("hidden", !current_user.settings.media.show_filename);
//         $conversation.find(".media-item-info").toggleClass("hidden", !current_user.settings.media.show_info);
      }
      $("#footer #inputbar #attachment_button").toggleClass("dim50", !connected)
                                               .prop("disabled", !connected);
      $("#footer #inputbar #send_button").toggleClass("dim50", !connected)
                                         .prop("disabled", !connected);
      if (!connected) {
         attachmentbar_hide();
      }
      ui_update_cnv_emoji();
//      $msg_body_input.focus();
   }
   else {
      $body.css("background-color", "black");
      $body.css("background-image", "none");
   }
   ui_resize();
}



function ui_update_cnv_emoji()
{
//   applog("ui_update_cnv_emoji", "", LOG_FLAGS.UI);
//   log("\"" + $msg_body_input.html().trim() + "\"");

/*
   if (update_cnv_emoji) {
//      if ($msg_body_input.html() === "") {
      if ($msg_body_input.is(":empty")) {
         $send_button.toggleClass("icon-send-msg", false);
         $send_button.toggleClass("icon-cnv-emoji", true);
      }
      else {
         $send_button.toggleClass("icon-cnv-emoji", false);
         $send_button.toggleClass("icon-send-msg", true);
         update_cnv_emoji = false;
      }
   }
*/
}



const LOAD_INDICATOR_DELAY = 250;

var load_indicator_timer = null;

function ui_load_indicator_show(delay)
{
   if (typeof delay !== "number") {
      delay = LOAD_INDICATOR_DELAY;
   }
   load_indicator_timer = setTimeout(function()
   {
      load_indicator_timer = null;
      $load_indicator.show();
   }, delay);
}



function ui_load_indicator_hide()
{
   if (load_indicator_timer !== null) {
      clearTimeout(load_indicator_timer);
      load_indicator_timer = null;
   }
   $load_indicator.hide();
}



const TYPING_ANIMATION_TIMER = 10;

var typing_indicator_opacity   = 0.0;
var typing_indicator_direction = 0.0;
var typing_indicator_timer     = null;
var typing_indicator_timeout   = null;



function ui_typing_indicator_show()
{
   // No timeout running so start the typing indicator animation timer:
   if (typing_indicator_timeout === null) {
      //    The initial opacity and direction are set to fade it in fast
      //    and slow down while pulsating normally.
      //    The opacity is not initialized since it could be in the middle of fading out.
      //    It will be zero if initialized above, or a previous fade out completed,
      //    or will just start fading back in if partway through a fade out.
      typing_indicator_direction = 0.05;
      $typing_indicator.css("opacity", typing_indicator_opacity);
      $typing_indicator.show();
      if (typing_indicator_timer !== null) {
         clearTimeout(typing_indicator_timer);
      }
      typing_indicator_timer = setInterval(function()
      {
         typing_indicator_opacity += typing_indicator_direction;
         $typing_indicator.css("opacity", typing_indicator_opacity);
         if (typing_indicator_opacity <= 0.00) {
            typing_indicator_direction = 0.01;
         }
         else if (typing_indicator_opacity >= 1.00) {
            typing_indicator_direction = -0.01;
         }
      }, TYPING_ANIMATION_TIMER);
   }
   // Reset the typing indicator timeout:
   else {
      clearTimeout(typing_indicator_timeout);
   }
   // Start the typing indicator timeout:
   typing_indicator_timeout = setTimeout(function() {
      typing_indicator_timeout = null;
      ui_typing_indicator_hide();
   }, MSG_TYPING_INDICATOR_TIMEOUT);
}



function ui_typing_indicator_hide()
{
   // Clear the typing indicator timeout:
   if (typing_indicator_timeout !== null) {
      clearTimeout(typing_indicator_timeout);
      typing_indicator_timeout = null;
   }

   // Interrupt the typing indicator animation timer, or do nothing if it's not active:
   //    The opacity is left at whatever it currently is.
   //    The direction is set to fade it out fast.
   if (typing_indicator_timer !== null) {
      typing_indicator_direction = -0.05;
      clearTimeout(typing_indicator_timer);
      typing_indicator_timer = setInterval(function()
      {
         typing_indicator_opacity += typing_indicator_direction;
         $typing_indicator.css("opacity", typing_indicator_opacity);
         if (typing_indicator_opacity <= 0.0) {
            $typing_indicator.hide();
            clearTimeout(typing_indicator_timer);
            // It's possible for the opacity to undershoot zero:
            typing_indicator_opacity = 0.0;
            typing_indicator_timer   = null;
         }
      }, TYPING_ANIMATION_TIMER);
   }
}



function ui_new_msg_indicator_show()
{
   if (current_user.settings.messages.new_msg_indicator && !document.hasFocus()) {
      var indicator = "* ";

      if (new_msg_timer !== null) {
         clearTimeout(new_msg_timer);
      }
      document.title = indicator + app.info.name;
      new_msg_timer = setInterval(function()
      {
         indicator = (indicator === "" ? "* " : "");
         document.title = indicator + app.info.name;
      }, MSG_NEW_INDICATOR_INTERVAL);
   }
}



function ui_new_msg_indicator_hide()
{
   if (new_msg_timer !== null) {
      clearTimeout(new_msg_timer);
      new_msg_timer = null;
      document.title = app.info.name;
   }
}



function ui_show_notification(options)
{
   if (app.support.serviceworker && app.support.pushmanager) {
      Notification.requestPermission(function(result)
      {
         if (result === "granted") {
            navigator.serviceWorker.ready
            .then(function(registration)
            {
               if (typeof options.icon !== "string") {
                  options.icon = "img/G16.png";
               }
               options.renotify = true;
               registration.showNotification(options.title, options);
            });
         }
//         else {
//            warn("Notification permission denied");
//         }
      });
   }
   else if (app.support.notifications) {
      if (Notification.permission !== "granted") {
         Notification.requestPermission();
      }
      if (Notification.permission === "granted") {
         new Notification(options.title, {
            icon:  options.icon,
            image: options.image,
            body:  options.body,
         });
      }
   }
//   else {
//      warn("Notification not suported");
//   }
}



// ui_clear_cnv_notification closes any notifications for the current conversation.
//    There should only be one, but duplicates will be closed.

function ui_clear_cnv_notification(clear_local, clear_remote)
{
//   applog("ui_clear_cnv_notification", "", LOG_FLAGS.UI);

   if (current_user.settings.messages.notifications && current_cnv) {
      ui_clear_notification(NOTIFICATION_TAG_MSG + current_cnv.id, clear_local, clear_remote);
   }
}



// ui_clear_cnv_notification instructs the service worker to close notifications.
//    This function is only called directly if the option to show notifications is disabled.
//
//    tag            String    Tag of the notification to close.  If omitted, all notifications are closed.
//    clear_local    Boolean   Clear notifications on this device.
//    clear_remote   Boolean   Clear notifications on other devices.

function ui_clear_notification(tag, clear_local, clear_remote)
{
   applog("ui_clear_notification", tag, LOG_FLAGS.UI);

   if (typeof tag !== "string") {
      tag = "";
   }

   // Clear local notifications:
   if (clear_local) {
      app_sw_message({
         msg: "clear_notifications",
         tag: tag,
      });
   }
   // Clear notifications on other devices:
   if (clear_remote && socket.connected) {
      socket.emit("user_clear_notifications");
   }
}



