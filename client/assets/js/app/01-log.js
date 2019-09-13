


// Set to true to enable logging regardless of application environment:
const FORCE_LOG = true;

const LOG_FLAGS = {
   NONE:   0x0000, // 0b000000000000000000,
   INIT:   0x0001, // 0b000000000000000001,
   SW:     0x0002, // 0b000000000000000010,
   WS:     0x0004, // 0b000000000000000100,
   LOGIN:  0x0008, // 0b000000000000001000,
   USER:   0x0010, // 0b000000000000010000,
   CNV:    0x0020, // 0b000000000000100000,
   MSG:    0x0040, // 0b000000000001000000,
   UPLOAD: 0x0080, // 0b000000000010000000,
   UI:     0x0100, // 0b000000000100000000,
   ALL:    0xFFFF, // 0b111111111111111111,
};

const LOG_FLAGS_ENABLED =
   LOG_FLAGS.INIT   |
   LOG_FLAGS.SW     |
   LOG_FLAGS.WS     |
//   LOG_FLAGS.LOGIN  |
//   LOG_FLAGS.USER   |
//   LOG_FLAGS.CNV    |
//   LOG_FLAGS.MSG    |
//   LOG_FLAGS.UPLOAD |
//   LOG_FLAGS.UI     |
   LOG_FLAGS.ALL    |

   LOG_FLAGS.NONE
;

const TIMESTAMP_FORMAT      = "YYYY-MM-DD HH:mm:ss.SSS";
const ORIGIN_COLUMN_WIDTH   = 30;
const ORIGIN_COLUMN_PADDING = new Array(ORIGIN_COLUMN_WIDTH + 1).join(" ");



//var applog = "";
var log_at_bottom = true;



function applog(origin, text, log_flags)
{
   if (typeof log_flags === "undefined") {
      warn("applog", "log_flags undefined");
      log_flags = LOG_FLAGS.ALL;
   }
   if (typeof log_flags !== "number") return;

   if ((APP_ENV_DEVELOPMENT || FORCE_LOG) && (log_flags & LOG_FLAGS_ENABLED)) {
      text = format_log_entry(origin, text);
      console.log(text);
//      applog += text + "\n";
      $("#log_viewer_content").append(text + "\n");
   }
}



function log(text)
{
   if (APP_ENV_DEVELOPMENT || FORCE_LOG) {
      console.log(text);
//      applog += text + "\n";
      $("#log_viewer_content").append(text + "\n");
   }
}



function info(origin, text)
{
   if (APP_ENV_DEVELOPMENT || FORCE_LOG) {
      if (typeof text === "undefined") {
         text   = origin;
         origin = "";
      }
      text = format_log_entry(origin, text);
      console.info(text);
//      applog += text + "\n";
      $("#log_viewer_content").append(text + "\n");
   }
}



function warn(origin, text)
{
   if (APP_ENV_DEVELOPMENT || FORCE_LOG) {
      if (typeof text === "undefined") {
         text   = origin;
         origin = "";
      }
      text = format_log_entry(origin, text);
      console.warn(text);
//      applog += text + "\n";
      $("#log_viewer_content").append(text + "\n");
   }
}



function error(origin, text)
{
   if (APP_ENV_DEVELOPMENT || FORCE_LOG) {
      if (typeof text === "undefined") {
         text   = origin;
         origin = "";
      }
      text = format_log_entry(origin, text);
      console.error(text);
//      applog += text + "\n";
      $("#log_viewer_content").append(text + "\n");
   }
}



function dir(origin, object)
{
   if (APP_ENV_DEVELOPMENT || FORCE_LOG) {
      if (typeof object === "undefined") {
         object = origin;
         origin = "";
      }
      console.dir(object);
//      applog += format_log_entry(origin, JSON.stringify(object)) + "\n";
      $("#log_viewer_content").append(format_log_entry(origin, JSON.stringify(object)) + "\n");
   }
}



function format_log_entry(origin, text)
{
   if (typeof origin !== "string") {
       origin = "";
   }
   if (typeof text === "undefined") {
      text = "";
   }
   else {
      text = "" + text;
   }
   return (moment().format(TIMESTAMP_FORMAT) + "   " + (origin + ORIGIN_COLUMN_PADDING).substring(0, ORIGIN_COLUMN_WIDTH) + text).trim();

}



function showlog()
{
   dialogbox_show($("#log_viewer_content"), {
      fullwidth:      true,
      fullheight:     true,

      init_visible:   function($dialog)
      {
         $dialog_message = $dialog.find(".dialog-message");
         $log_viewer     = $dialog.find("#log_viewer_content");
         $dialog_message.scrollTop($dialog_message.outerHeight());

         $content.on("scroll", function(event)
         {
            event.stopPropagation();
            // Include being within 10 pixels of the bottom so being a few pixels away isn't flagged as not at the bottom:
            log_at_bottom = ($dialog_message.scrollTop() >= Math.floor($log_viewer.height() - $dialog_message.height() - 10));
         });

      },

/*
      save_button:    function() {
//         dir($("#log_download"));
         $("#log_download").attr("href",     "data:text/plain," + encodeURIComponent(applog));
         $("#log_download").attr("download", "log-" + moment().format("YYYY-MM-DD HH:mm:ss") + ".txt");
         $("#log_download").click();
      },
*/
      close_button:   true,

      default_button: "close_button",
      escape_button:  "close_button",
   });
}



function log_scroll_bottom()
{
   $dialog_message.scrollTop($dialog_message.outerHeight());
}



