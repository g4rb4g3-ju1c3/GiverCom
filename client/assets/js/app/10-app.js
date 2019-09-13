


console.log();
info("10-app.js", "APP_ENV_DEVELOPMENT: " + APP_ENV_DEVELOPMENT,  LOG_FLAGS.INIT);
info("10-app.js", "navigator.userAgent: " + navigator.userAgent,  LOG_FLAGS.INIT);
info("10-app.js", "window.location:     " + window.location,      LOG_FLAGS.INIT);
info("10-app.js", "window.navigator.onLine: " + navigator.onLine, LOG_FLAGS.INIT);



app = {};

app.support = {};
app.support.touch         = (("ontouchstart" in window) || (navigator.MaxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0));
app.support.filereader    = (("File"         in window) && ("FileReader" in window) && ("FileList" in window) && ("Blob" in window));
app.support.notifications = ("Notification"  in window);
app.support.serviceworker = ("serviceWorker" in navigator);
app.support.pushmanager   = ("PushManager"   in window);
app.support.websocket     = ("WebSocket"     in window);
info("10-app.js", "app.support: " + JSON.stringify(app.support), LOG_FLAGS.INIT);

app.info = {};
app.info.name         = $("meta[name=app_name]")       .attr("content");
app.info.version      = $("meta[name=app_version]")    .attr("content");
app.info.author       = $("meta[name=app_author]")     .attr("content");
app.info.copyright    = $("meta[name=app_copyright]")  .attr("content");
app.info.description  = $("meta[name=app_description]").attr("content");
app.info.device_type  = $("meta[name=app_device_type]").attr("content");
app.info.touch_device = app.support.touch;
info("10-app.js", "app.info: " + JSON.stringify(app.info), LOG_FLAGS.INIT);
console.log();



if (!app.support.websocket) alert("You need a browser that supports WebSockets.\n\n" +
                                  "It's " + (new Date()).getFullYear() + ".  They're not hard to find.  I'm not even sure how you found one that doesn't.");



const DEVICE_TYPE_DESKTOP = "desktop";
const DEVICE_TYPE_ANDROID = "android";
const DEVICE_TYPE_BB10    = "bb10";



// Maximum number of messages to load when showing the latest messages in a conversation:
const CNV_MSG_LOAD_LIMIT = 100;

// Message spacing time intervals:
//    These are used to determine the thickness of a message spacer in the conversation view.
const MSG_INTERVAL_1 =  5;
const MSG_INTERVAL_2 = 15;
const MSG_INTERVAL_3 = 30;
const MSG_INTERVAL_4 = 60;

// Minimum interval to send typing messages at:
//    A new typing message is only sent once this timer expires.
const MSG_TYPING_TIMEOUT           = 1000;
// Maximum time to show the typing indicator:
//    This timer is reset every time a typing message is received.
const MSG_TYPING_INDICATOR_TIMEOUT = 2500;

// Interval to flash the new message indicator in the title bar:
const MSG_NEW_INDICATOR_INTERVAL   =  750;

const MSG_NEW_PREVIEW_TIMEOUT      = 5000;

// Notification IDs:
//    These are used by the service worker to renotify or clear notifications.
const NOTIFICATION_TAG_MSG_TEST = "msg_notification_test";
const NOTIFICATION_TAG_MSG      = "msg_notification_cnv_";     // Conversation ID is appended to this.

// Reference size in _app.scss:
const CSS_REF_SIZE = 0.9;  // cm



//var $css_link = $("#css_link");
var $window                 = $(window);
var $document               = $(document);
var $body                   = null;
var $load_indicator         = null;
var $page_cover             = null;
//var $ping_status            = null;
var $header                 = null;
var $previewbar             = null;
var $titlebar               = null;
var $titlebar_min           = null;
var $hamburgermenu          = null;
var $footer                 = null;
var $content                = null;
var $content_holding        = null;
var $welcome                = null;
var $conversation           = null;
var $msgbufferbar           = null;
var $inputbar               = null;
var $attachment_button      = null;
var $attachmentbar          = null;
var $emojibar               = null;
var $available_emojis       = null;
var $emoji_button           = null;
var $msg_body_input         = null;
var $typing_indicator       = null;
var $send_button            = null;
var $date_header_template   = null;
var $message_group_template = null;
var $message_template       = null;
var $media_item_template    = null;
var $dialogbox              = null;
var $app_login              = null;
var $app_settings           = null;
var $app_about              = null;



var instagram_js_loaded = false;



/*
if (app.support.touch) {
   $css_link.attr("href", "css/large.css");
}
else {
   $css_link.attr("href", "css/normal.css");
}
*/



$document.ready(function()
{
   $body                   = $(document.body);
   $load_indicator         = $("#load_indicator");
   $page_cover             = $("#page_cover");
//   $ping_status            = $("#ping_status");
   $header                 = $("#header");
   $previewbar             = $("#previewbar");
   $titlebar               = $("#header #titlebar");
   $titlebar_min           = $("#header #titlebar_min");
   $hamburgermenu          = $("#hamburger_menu");
   $content_scroll         = $("#content_scroll");
   $content                = $("#content");
   $content_holding        = $("#content_holding");
   $welcome                = $("#welcome");
   $conversation           = $("#conversation");
   $footer                 = $("#footer");
   $attachmentbar          = $("#footer #attachmentbar");
   $emojibar               = $("#footer #emojibar");
   $available_emojis       = $("#available_emojis");
   $msgbufferbar           = $("#footer #msgbufferbar");
   $inputbar               = $("#footer #inputbar");
   $attachment_button      = $("#footer #inputbar #attachment_button");
   $emoji_button           = $("#footer #inputbar #emoji_button");
   $msg_body_input         = $("#footer #inputbar #msg_body_input");
   $typing_indicator       = $("#footer #typing_indicator");
   $send_button            = $("#footer #inputbar #send_button");
   $date_header_template   = $("#templates .date-header");
   $message_group_template = $("#templates .message-group");
   $message_template       = $("#templates .message");
   $media_item_template    = $("#templates .media-container");
   $dialogbox_template     = $("#templates .dialogbox");
   $app_login              = $("#app_login");
   $app_settings           = $("#app_settings");
   $app_about              = $("#app_about");

/*
   if (app.support.touch) {
      $body.css("overflow-y", "scroll");
      $content.css("position", "relative");
      $content.css("overflow", "auto");
   }
*/



/*
   document.body.addEventListener("online", function(event)
   {
      applog("body.online");
   });

   document.body.addEventListener("offline", function(event)
   {
      applog("body.offline");
   });
*/



/*
   var prev_timestamp = new Date().getTime();

   setInterval(function()
   {
      const now            = new Date().getTime();
      const interval_error = now - prev_timestamp - 1000;

      prev_timestamp = now;
      // Don't trigger on small errors:
      if (interval_error > 200) {
         applog("sleep_check", "Interval error: " + interval_error + "ms", LOG_FLAGS.INIT);
      }
   }, 1000);
*/

});



var deferred_install = null;

$window.on("beforeinstallprompt", function(event)
{
   applog("window.beforeinstallprompt", "", LOG_FLAGS.INIT);

   deferred_install = event.originalEvent;
   $("#hamburger_menu_install").removeClass("hidden");

   // Prevent Chrome 67 and earlier from automatically showing the prompt:
   //    stopPropagation appears to also be necessary for even the latest Chrome on Android.  Maybe not.
   return false;
});



$window.on("appinstalled", function(event)
{
   applog("window.appinstalled", "", LOG_FLAGS.INIT);

   $("#hamburger_menu_install").remove();
});



function app_install_prompt()
{
   applog("app_install_prompt", "", LOG_FLAGS.INIT);

   // Remove the install menu item since it can't be used again until the user refreshes the page:
//   $("#hamburger_menu_install").remove();
   // Show the prompt:
   deferred_install.prompt();
   // Wait for the user to respond to the prompt:
   deferred_install.userChoice
   .then(function(result)
   {
      if (result.outcome === "accepted") {
        applog("app_install_prompt", "User accepted the install prompt");
      }
      else {
        applog("app_install_prompt", "User dismissed the install prompt");
      }
      deferred_install = null;
   });
}



function device_type(type)
{
   return (app.info.device_type === type);
}



function app_show_stats()
{
   socket.emit("app_stats", function(stats)
   {
      dialogbox_show_text("<b>Messages in this conversation</b><br>" +
                          "You: <span id=\"stats_msgs_user_cnv\"></span><br>" +
                          "Them: <span id=\"stats_msgs_other_cnv\"></span><br>" +
                          "Total: <span id=\"stats_msgs_cnv\"></span><br>" +
                          "<hr>" +
                          "<b>Your messages</b><br>" +
                          "Total: <span id=\"stats_msgs_user_total\"></span><br>",
//                          "<hr>" +
//                          "<b>All messages</b><br>" +
//                          "Total: <span id=\"stats_msgs_total\"></span><br>",
      {
         init:           function($dialog)
         {
            $("#stats_msgs_user_cnv")  .html(stats.msgs_user_cnv);
            $("#stats_msgs_other_cnv") .html(stats.msgs_cnv - stats.msgs_user_cnv);
            $("#stats_msgs_cnv")       .html(stats.msgs_cnv);
            $("#stats_msgs_user_total").html(stats.msgs_user_total);
//            $("#stats_msgs_total")     .html(stats.msgs_total);
         },
         close_button:   true,
         default_button: "close_button",
         escape_button:  "close_button",
      });
   });
}



function app_show_help()
{
   var dialog_msg = "";

   dialog_msg = "<table>";
   for (var p in emoji_translation) {
      dialog_msg += ("<tr><td class=\"hpad\">" + p + "</td><td class=\"hpad\">" + emoji_translation[p] + "</td></tr>");
   }
   dialog_msg += "</table>";

   dialogbox_show_text(dialog_msg, {
      close_button:   true,
      default_button: "close_button",
      escape_button:  "close_button",
   });
}



function app_about_show()
{
   dialogbox_show($app_about, {
      fullwidth:      true,
      fullheight:     true,
      close_button:   true,
      default_button: "close_button",
      escape_button:  "close_button",
   });
}



// media_url returns the URL for a given media ID.
//
//    media_id   String   Compact UUID of the media item.
//    type       String   What version of the media item to get ("thumbnail").

function media_url(media_id, type)
{
   return ("media?f=" + media_id + (type ? "&t=" + type : ""));
}



/*
function error_handler(error)
{
   if (error) {
      dir(error);
      return true;
   }
   else {
      return false;
   }
}
*/



