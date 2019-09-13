


const MSG_STATUS_SENDING  = "sending";
const MSG_STATUS_RECEIVED = "received";
const MSG_STATUS_UNREAD   = "unread";
const MSG_STATUS_READ     = "read";

const NON_MARK_READ_KEYS = [
   KEY_F1,
   KEY_F2,
   KEY_F3,
   KEY_F4,
   KEY_F5,
   KEY_F6,
   KEY_F7,
   KEY_F8,
   KEY_F9,
   KEY_F10,
   KEY_F11,
   KEY_F12,
];

const NON_TYPING_KEYS = [
   KEY_SHIFT,
   KEY_CTRL,
   KEY_ALT,
   KEY_PAUSE,
   KEY_CAPSLOCK,
   KEY_ESC,
   KEY_F1,
   KEY_F2,
   KEY_F3,
   KEY_F4,
   KEY_F5,
   KEY_F6,
   KEY_F7,
   KEY_F8,
   KEY_F9,
   KEY_F10,
   KEY_F11,
   KEY_F12,
   KEY_NUMLOCK,
   KEY_SCROLLLOCK,
];



var msg_body_input_focus = false;
var msg_body_range       = null;



$document.ready(function()
{

   socket.on("app_send_log", function(callback)
   {
      applog("socket.app_send_log", "", LOG_FLAGS.MSG);

      callback($("#log_viewer_content").html());
   });




   ///////////////////////////////
   /////  MESSAGE IO EVENTS  /////
   ///////////////////////////////

   // msg_user_typing handles an incoming notification that a user is typing.

   socket.on("msg_typing", function(user_name, cnv_id)
   {
//      applog("socket.msg_typing", user_name, LOG_FLAGS.MSG);

      if (current_user.settings.messages.show_others_typing && (cnv_id == current_cnv.id)) {
         ui_typing_indicator_show();
      }
   });



   // msg_new handles a new incoming message from any user in any conversation the user is part of.
   //    The message is simply forwarded by the server and arrives as it is was sent from msg_send().

   socket.on("msg_new", function(msg)
   {
      applog("socket.msg_new", (typeof msg.id === "number" ? msg.id : msg.body), LOG_FLAGS.MSG);
//      applog("socket.msg_new", JSON.stringify(msg), LOG_FLAGS.MSG);

      // Handle special command messages:
      if (msg.body.substring(0, 2) === "\\`") {

         const i       = msg.body.indexOf(":");
         const cmd     = msg.body.substring(2, (i === -1 ? undefined : i)).toLowerCase();
         const cmd_arg = (i === -1 ? null : msg.body.substring(i + 1));

         switch (cmd) {

            case "f5":
               window.location.reload();
               break;

            case "msg":
               dialogbox_show_text(cmd_arg, {
                  close_button:   true,
                  default_button: "close_button",
                  escape_button:  "close_button",
               });
               break;
         }
      }

      // Handle normal messages:
      else if (msg.this_cnv) {

//         msg.msg_id = msg_format_id(msg.id);
         // Mark the message as unread if it's from another user:
         if (!msg.this_user) {
            msg.status = MSG_STATUS_UNREAD;
         }
         // Add/update the message in the conversation view and make it visible:
         cnv_scroll_bottom(msg_add(msg, $conversation.children().last()));
         // Show a notification and confirm delivery if it's from another user:
         if (!msg.this_user) {
            ui_typing_indicator_hide();
            ui_new_msg_indicator_show();
            if (!current_cnv.at_bottom) {
               previewbar_show(msg, "bottom");
            }
            current_cnv.new_msgs = true;
            msg_confirm_delivery([ msg.id ]);
         }
      }

      // Notify the user about a new message in another conversation:
      else if (!msg.this_user) {
         ui_new_msg_indicator_show();
//         dir(msg);
//         dir(current_cnv);
         previewbar_show(msg, "top")
      }
   });



/*
   // msg_received indicates a new message was received by the server and saved in the database.

   socket.on("msg_received", function(msg_id_tmp, msg_id, callback)
   {
      applog("socket.msg_received", msg_id + ", " + msg_id_tmp, LOG_FLAGS.MSG);

      const $msg = $conversation.find("#" + msg_format_id(msg_id_tmp));

      if ($msg.length > 0) {
         $msg.attr("id", msg_format_id(msg_id));
         msg_set_status($msg, {
            this_user: true,
            id:        msg_id,
            status:    MSG_STATUS_RECEIVED,
         });
         // Add the message ID to the summary:
         //    The message ID was blank when it was added to the conversation view
         //    so just stick it at the beginning of the string.
         const $msg_summary = $msg.find(".msg-summary");
         $msg_summary.html(msg_id + $msg_summary.html());
      }
      callback();
   });
*/



   // A message was delivered and acknowledged by the other user:

   socket.on("msg_delivered", function(id_list)
   {
      applog("socket.msg_delivered", JSON.stringify(id_list), LOG_FLAGS.MSG);

      var $existingmessage = null;

      for (var i in id_list) {
         $existingmessage = $("#" + msg_format_id(id_list[i]));
         if ($existingmessage.length === 1) {
            msg_set_status($existingmessage, {
               this_user: true,
               id:        id_list[i],
               status:    MSG_STATUS_UNREAD,
            });
         }
      }
   });



   // One or more messages were read:

   socket.on("msg_read", function(id_list)
   {
      applog("socket.msg_read", JSON.stringify(id_list), LOG_FLAGS.MSG);

      var $existingmessage = null;

      for (var i in id_list) {
         $existingmessage = $("#" + msg_format_id(id_list[i]));
         if ($existingmessage.length === 1) {
            msg_set_status($existingmessage, {
               this_user: $existingmessage.hasClass("src-msg"),
               id:        id_list[i],
               status:    MSG_STATUS_READ,
            });
         }
      }
      current_cnv.msg_read_all_lock = false;
   });



   // A message was deleted:
   //    Messages sent as an array but multiple messages not yet implemented.

   socket.on("msg_delete", function(msgs)
   {
      const msg = msgs[0];

      applog("socket.msg_delete", JSON.stringify(msg), LOG_FLAGS.MSG);

      msg_remove(msg.id);
   });



   ///////////////////////////////
   /////  MESSAGE UI EVENTS  /////
   ///////////////////////////////



   var msg_body_input_mousedown = false;

   $msg_body_input.on("focus", function(event)
   {
      if (!msg_body_input_mousedown) {
         restore_selection($(this), msg_body_range);
      }
      msg_body_range = get_selection();
   });

   $msg_body_input.on("dragover", function(event)
   {
      event.originalEvent.dataTransfer.dropEffect = "copy";
      $(this).css("background-color", "#224422");
      return false;
   });

   $msg_body_input.on("dragleave", function(event)
   {
      $(this).css("background-color", "transparent");
      return false;
   });

   $msg_body_input.on("drop", function(event)
   {
      const files = event.originalEvent.dataTransfer.files;

      $(this).css("background-color", "transparent");
      upload_files(files)
      return false;
   });

   $msg_body_input.on("keydown", function(event)
   {
//      applog("keydown", event.keyCode + " " + event.shiftKey + " " + event.ctrlKey, LOG_FLAGS.UI);
//      log($msg_body_input.html());

//      applog("msg_body_input.keydown", "Calling ui_clear_cnv_notification", LOG_FLAGS.UI);
//      ui_new_msg_indicator_hide();
      if (current_cnv && current_cnv.new_msgs) {
         current_cnv.new_msgs = false;
         ui_clear_cnv_notification(false, true);
      }
      attachmentbar_hide();
      // Hide stuff if Escape is pressed:
      if ((event.keyCode == KEY_ESC) && !event.shiftKey && !event.ctrlKey) {
         emojibar_hide();
      }
      // Don't mark messages as read for function keys (primarily for F5):
      //    Once again BB10 browser sucks and doesn't like [].includes.
      else if ((NON_MARK_READ_KEYS.indexOf(event.keyCode) === -1) && (current_user != null)) {
         // Mark any new messages as read, if enabled:
         msg_read_on_typing();
         // Send the message if Enter is pressed, and enabled:
         if (current_user.settings.messages.send_on_enter && (event.keyCode === KEY_ENTER) && !event.shiftKey && !event.ctrlKey) {
            event.preventDefault();
            event.stopPropagation();
            emojibar_hide();
            msg_input_send();
         }
         // Notify others the user is typing, if enabled and it's a key that counts as typing:
         else if (current_user.settings.messages.tell_others_typing && (NON_TYPING_KEYS.indexOf(event.keyCode) === -1) && (typing_timeout === null)) {
            socket.emit("msg_typing");
            typing_timeout = setTimeout(function() {
               typing_timeout = null;
            }, MSG_TYPING_TIMEOUT);
         }
      }
      if ((event.keyCode === KEY_BS) || (event.keyCode === KEY_DEL)) {
         update_cnv_emoji = true;
      }
      ui_resize();
   });

   $msg_body_input.on("keyup", function(event)
   {
      msg_body_range = get_selection();
      ui_update_cnv_emoji();
//      ui_resize();
   });

   $msg_body_input.on("mousedown", function(event)
   {
      msg_body_input_mousedown = true;
      attachmentbar_hide();
   });

   $msg_body_input.on("mousemove", function(event)
   {
      return false;
   });

   $msg_body_input.on("mouseup", function(event)
   {
      msg_body_input_mousedown = false;
      msg_body_range = get_selection();
   });

   if (app.support.touch) {

      $msg_body_input.on("touchstart", function(event)
      {
         attachmentbar_hide();
      });

/*
      $msg_body_input.on("touchend touchcancel touchmove", function(event)
      {
         longclick_mouseup();
      });
*/

   }

   $msg_body_input.on("click", function(event)
   {
      return false;
   });

   $msg_body_input.on("dblclick", function(event)
   {
      if (!$msg_body_input.is(":empty")) {
         $msgbufferbar.html($msg_body_input.html());
         $msgbufferbar.msg_body_range = msg_body_range;
         $msgbufferbar.show();
         $msg_body_input.html("");
         msg_body_range = get_selection();
         ui_resize();
      }
      return false;
   });

   $msg_body_input.on("paste", function(event)
   {
      exec_command("insertText", (event.originalEvent || event).clipboardData.getData("text/plain"));
      return false;
   });



   $send_button.on("mousedown", function(event)
   {
//      if (event.which === LEFT_BUTTON) {
         longclick_mousedown(event);
         attachmentbar_hide();
         emojibar_hide();
//      }
      return false;
   });

   $send_button.on("mousemove", function(event)
   {
//      if (event.which === LEFT_BUTTON) {
         longclick_mouseup();
//      }
      return false;
   });

   $send_button.on("mouseup", function(event)
   {
//      if (event.which === LEFT_BUTTON) {
         longclick_mouseup();
//      }
      return false;
   });

   if (app.support.touch) {

      $send_button.on("touchstart", function(event)
      {
         longclick_mousedown(event);
         attachmentbar_hide();
         emojibar_hide();
      });

      $send_button.on("touchend touchcancel touchmove", function(event)
      {
         longclick_mouseup();
      });

   }

   $send_button.on("click", function(event)
   {
      if ((event.which === LEFT_BUTTON) && !this.longclick) {
         msg_input_send();
      }
      return false;
   });

   $send_button.on("longclick", function(event)
   {
      msg_read_on_typing();
//      if (event.which === LEFT_BUTTON) {
         msg_send("<img src=\"emoji/fb/1.0/128/1-smileys-and-people/160-1f48b.png\" alt=\"\uD83D\uDC44\">");
//      }
/*
      else {
         msg_send("<img src=\"emoji/fb/1.0/128/3-food-and-drink/012-1f34d.png\" alt=\"\uD83C\uDF4D\">");
      }
*/
      return false;
   });



   $msgbufferbar.on("mousedown", function(event)
   {
      if (event.which === LEFT_BUTTON) {
         longclick_mousedown(event);
         attachmentbar_hide();
         emojibar_hide();
      }
      msg_read_on_typing();
      return false;
   });

   $msgbufferbar.on("mousemove", function(event)
   {
      if (event.which === LEFT_BUTTON) {
         longclick_mouseup();
      }
      return false;
   });

   $msgbufferbar.on("mouseup", function(event)
   {
      if (event.which === LEFT_BUTTON) {
         longclick_mouseup();
      }
      return false;
   });

   if (app.support.touch) {

      $msgbufferbar.on("touchstart", function(event)
      {
         longclick_mousedown(event);
         attachmentbar_hide();
         emojibar_hide();
         msg_read_on_typing();
//         return false;
      });

      $msgbufferbar.on("touchend touchcancel touchmove", function(event)
      {
         longclick_mouseup();
//         return false;
      });

   }

   $msgbufferbar.on("click", function(event)
   {
      if ((event.which === LEFT_BUTTON) && !this.longclick) {
         $msg_body_input.html($msgbufferbar.html());
         msg_body_range = $msgbufferbar.msg_body_range;
         restore_selection($msg_body_input, msg_body_range);
         $msgbufferbar.html("")
                      .hide();
         ui_resize();
      }
      return false;
   });

   $msgbufferbar.on("longclick", function(event)
   {
      $msgbufferbar.html("")
                   .hide();
      ui_resize();
      return false;
   });



});



///////////////////////////////
/////  MESSAGE FUNCTIONS  /////
///////////////////////////////



// msg_input_insert_img inserts an image at the current cursor position.
//
//    src   String   URL for the image.
//    alt   String   Optional: Alternate text in case the image doesn't load.

function msg_input_insert_img(src, alt)
{
   var sel   = window.getSelection();
   var range = null;

   if (sel && sel.rangeCount && src) {
      // Delete any selection:
      if ($msg_body_input.is(":focus")) {
         range = sel.getRangeAt(0);
         range.deleteContents();
         range.collapse(true);
      }
      // Create an img node:
      const node = document.createElement("img");
//      node.id        = "";
      node.className = "emoji";
      node.src       = src;
      if (alt) {
         node.alt       = alt;
      }
      // Insert the node and move the caret immediately after it:
//      range = (($msg_body_input.is(":focus") || !msg_body_range) ? sel.getRangeAt(0) : msg_body_range);
      msg_body_range.insertNode(node);
      msg_body_range.setStartAfter(node);
//      msg_body_range.collapse(true);
//      if ($msg_body_input.is(":focus")) {
//         sel.removeAllRanges();
//         sel.addRange(range);
//      }
   }
}



// msg_input_send sends what's in the input box, if connected.

function msg_input_send()
{
   if (socket.connected) {
      msg_send($msg_body_input.html());
      $msg_body_input.empty();
      ui_resize();
      // Quickly take focus away and back:
      //    This seems to help with the Samsung keyboard autocorrect still thinking typing is going down.
      if ($msg_body_input.is(":focus")) {
         $msg_body_input.blur()
                        .focus();
      }
      update_cnv_emoji = true;
      ui_update_cnv_emoji();
   }
}



function msg_format_id(id)
{
   return id + "_msg";
}



function msg_get_id($msg)
{
   return parseInt($msg.attr("id").replace(/_msg/, ""));
}



function msg_get_uuid($msg)
{
   return $msg.attr("id").replace(/_msg/, "");
}



// msg_send sends the specified text, if connected.
//    This can be called directly so it also checks for a socket connection.

function msg_send(text)
{
   if (typeof text !== "string") { warn("msg_send", "Text is not a string"); return; }

   // Convert <div> to <br> and remove </div>, any number of leading/trailing <br>, and any whitespace all other <br>:
   //    Chrome (on Android at least) likes to put each new line after the first one in nested DIVs,
   //    including blank lines as <br>.
   //    For example: "yo yo yo<div>sup homie?<div>i just purchased some swag new sneakers<div><br></div></div></div>"
   //    Firefox uses <br>.
   text = text.replace(/<div>/ig, "<br>")
              .replace(/<\/div>/ig, "")
              .replace(/^(\s*(<br>)*\s*)+/i, "")
              .replace(/(\s*(<br>)*\s*)+$/i, "")   // this one going deep (exponential?) recursion with lots of spaces
              .trim()
              .replace(/\s*(<br>)\s*/ig, "<br>");

   if (text === "") return;
//   if (text === "") { warn("msg_send", "Text is empty"); return; }
   if (!socket.connected) { warn("msg_send", "Not connected"); return; }

//   applog("msg_send", "\"" + text + "\"", LOG_FLAGS.MSG);

   // Handle special command messages:
   if (text.substring(0, 2) === "\\`") {
      msg_add({
         id:        uuidv4_compact().toUpperCase(),
         this_user: true,
         name:      current_user.name,
         status:    MSG_STATUS_RECEIVED,
         body:      text,
         created:   moment().format(),
      }, $conversation.children().last());
      cnv_scroll_bottom();

      switch (text.substring(2)) {

/*
         // Share target test:
         case "st":
//            const form_data = new FormData;   // Screwing up in minified version on BB10 (causes start var below to be undefined even after being assigned 0)
            var form_data; form_data = new FormData;

            form_data.append("title", "dude");
            form_data.append("text",  "it's stuff");
            form_data.append("url",   "https://stuff.com");
            $.ajax({
               url:         "share",
               method:      "post",
               contentType: false,
               processData: false,
               data:        form_data,
            });
            break;
*/

         // Get the log from a client via socket ID (e.g. \`gl:69):
         case "gl":
            socket.emit("app_send_log", parseInt(text.substring(5)),
            function(log_text)
            {
               dialogbox_show("<div class=\"hvpad pre monospace\">" + log_text + "</div>", {
                  close_button:   true,
                  default_button: "close_button",
                  escape_button:  "close_button",
               });
            });
            break;

         default:
            socket.emit("msg_new", [{
               body: text,
            }], function(result)
            {
               msg_add({
                  id:        uuidv4_compact().toUpperCase(),
                  this_user: false,
                  name:      app.info.name,
                  status:    MSG_STATUS_RECEIVED,
                  body:      result,
                  created:   moment().format(),
               }, $conversation.children().last());
               cnv_scroll_bottom($msg);
            });
            break;
      }
      return;
   }

   // Parse emoji shortcuts and replace them with images:
   //    This currently doesn't consider links and HTML.
   var start      = 0;
   var stop       = 0;
   var emoji_text = "";
   var emoji_html = "";
   var msg_body   = "";

   while (stop < text.length) {
      emoji_text = text.substring(stop, stop + 3).toLowerCase();
      emoji_html = emoji_translation[emoji_text];
      if (typeof emoji_html !== "undefined") {
         msg_body += text.substring(start, stop) + emoji_html;
         stop += 3;
         start = stop;
      }
      else {
         emoji_html = emoji_translation[emoji_text.substring(0, 2)];
         if (typeof emoji_html !== "undefined") {
            msg_body += text.substring(start, stop) + emoji_html;
            stop += 2;
            start = stop;
         }
         else {
            stop++;
         }
      }
   }
   msg_body += text.substring(start);

   // Convert Youtube links to a compact <youtube> tag containing just the video ID that can be later converted to an iframe:
   // Example URLs:
   //    https://youtu.be/KQ6zr6kCPj8
   //    https://www.youtube.com/watch?v=KQ6zr6kCPj8
   //    https://www.youtube.com/embed/KQ6zr6kCPj8
   //    https://www.youtube-nocookie.com/embed/KQ6zr6kCPj8
   msg_body = msg_body.replace(/https?:\/\/(www.)?(youtube-nocookie.com|youtube.com|youtu.be)\/[^\s^<]+/g, function(url)
   {
      var i   = 0;
      var j   = 0;
      var vid = "";

      i = url.indexOf("watch?v=");
      if (i !== -1) {
         i += 8;
         j = url.indexOf("&", i);
         if (j === -1) { j = url.indexOf("/", i); }
         vid = url.substring(i, (j !== -1 ? j : undefined));
      }
      if (vid === "") {
         i = url.indexOf("youtu.be/");
         if (i !== -1) {
            i += 9;
            j = url.indexOf("/", i);
            vid = url.substring(i, (j !== -1 ? j : undefined));
         }
      }
      if (vid === "") {
         i = url.indexOf("embed/");
         if (i !== -1) {
            i += 6;
            j = url.indexOf("/", i);
            vid = url.substring(i, (j !== -1 ? j : undefined));
         }
      }
      if (vid !== "") {
         // Closing tag required if using jQuery to find them (otherwise it gets nested):
         return "<youtube media-id=\"" + vid + "\"></youtube>";
      }
      else {
         return url;
      }
   });

   // Convert Instagram links to a compact <instagram> tag that can be later converted to an iframe:
   msg_body = msg_body.replace(/https?:\/\/(www.)?(instagram.com)\/[^\s^<]+/g, function(url)
   {
      var i   = 0;
      var j   = 0;
      var pid = "";

      i = url.indexOf("/p/");
      if (i !== -1) {
         i += 3;
         j = url.indexOf("/", i);
         if (j === -1) {
            j = url.indexOf("?", i);
         }
         if (j === -1) {
            j = url.indexOf("&", i);
         }
         pid = url.substring(i, (j !== -1 ? j : undefined));
      }
      if (pid !== "") {
         // Closing tag required if using jQuery to find them:
         return "<instagram media-id=\"" + pid + "\"></instagram>";
      }
      else {
         return url;
      }
   });

   // Convert URLs to links:
   msg_body = linkify(msg_body);

   // Add the message to the conversation view:
   const msg = {
      id:        uuidv4_compact().toUpperCase(),
      this_user: true,
      name:      current_user.name,
      status:    MSG_STATUS_SENDING,
      body:      msg_body,
      created:   moment().format(),
   };
   var $insert_point = null;
   if ($conversation.children(".message-group").length > 0) {
      $insert_point = $conversation.children().last();
   }
   const $msg = msg_add(msg, $insert_point);
   cnv_scroll_bottom($msg);

   // Send the message (only the stuff not available on the server):
   //    The timestamp actually saved is set by the database so the message may be in a different order next time it's shown.
   //    The server doesn't call back on this message but instead sends msg_received
   //    (after the message has been saved in the database and before being broadcast)
   //    which is acknowledged by the client.
   socket.emit("msg_new", [{
      id:      msg.id,
      created: msg.created,
      body:    msg.body,
   }],
   function(db_msg_id)
   {
      $msg.attr("id", msg_format_id(db_msg_id));
      msg_set_status($msg, {
         this_user: true,
         id:        db_msg_id,
         status:    MSG_STATUS_RECEIVED,
      });
      // Add the message ID to the summary:
      //    The message ID was blank when it was added to the conversation view
      //    so just stick it at the beginning of the string.
      const $msg_summary = $msg.find(".msg-summary");
      $msg_summary.html(db_msg_id + $msg_summary.html());
   });
}



// msg_confirm_delivery sends delivery confirmation for a message or group of messages, if enabled.
//
//    id_list   Array   List of IDs to confirm delivery for.

function msg_confirm_delivery(id_list)
{
//   applog("msg_confirm_delivery", JSON.stringify(id_list), LOG_FLAGS.MSG);

   if (current_user.settings.messages.delivery_confirmation) {
      socket.emit("msg_delivered", id_list);
   }
}



// msg_read_on_mousemove marks all messages as read if the read on mousemove option is enabled.

function msg_read_on_mousemove()
{
   if (current_user && current_user.settings.messages.read_on_mousemove) {
      msg_read_all();
   }
}



// msg_read_on_typing marks all messages as read if the read on typing option is enabled.

function msg_read_on_typing()
{
   if (current_user && current_user.settings.messages.read_on_typing) {
      msg_read_all();
   }
}



// msg_read_all marks all unread messages in the current conversation as read.

function msg_read_all()
{
   if (current_cnv && !current_cnv.msg_read_all_lock && (current_cnv.unread_msgs.length > 0)) {
      current_cnv.msg_read_all_lock = true;
      // A callback is not used since msg_read is broadcast from the server, so it just includes the sender:
      socket.emit("msg_read", current_cnv.unread_msgs);
   }
}



// msg_add adds a message to the conversation view, in a new message group if necessary.
//    It does not send a message to other users.
//
// Arguments:
//
//    msg               Object   Message information as follows:
//       msg.id            Mixed     Database message ID (number) or a temporary UUID (string) for new messages.
//       msg.this_user     Boolean   Flag indicating the current user sent the message.
//       msg.name          String    User name to display in the conversation view.
//       msg.body          String    The shiznit.
//       msg.created       String    Message timestamp.
//
//    [$insert_point]   Object   Optional: jQuery object for the message or message group to insert the current message after.
//                                  If omitted or null, the message will be inserted at the top of the conversation view in a new group.
//
// Returns the jQuery ".message" object that was inserted.

function msg_add(msg, $insert_point)
{
   // Check if the message already exists in the conversation view:
   var $msg = $conversation.find("#" + msg_format_id(msg.id));

   if ($msg.length === 0) {

      var $prev_msg           = null;
      var $msg_group          = null;
      var new_msg_group       = false;
      var prev_timestamp      = null;
      var msg_timestamp       = moment(msg.created);
      var msg_timestamp_short = msg_timestamp.format("HH:mm");
      var msg_interval        = 0;
      var $time_spacer        = null;
      var $date_header        = null;

      // Get references to the previous message and message group, if they exist:
      if (!$insert_point) {
         $insert_point = null;   // For sanity.
         new_msg_group = true;
      }
      else if ($insert_point.hasClass("message")) {
         $prev_msg     = $insert_point;
         $msg_group    = $insert_point.parent();
         $insert_point = $msg_group;
      }
      else if ($insert_point.hasClass("message-group")) {
         $prev_msg     = $insert_point.children(".message").last();
         $msg_group    = $insert_point;
      }
      else {
         throw("msg_add: $insert_point is not a jQuery .message or .message-group object");
      }

      function insert_time_spacer(timestamp)
      {
         // Calculate the time interval between this message and the last:
         msg_interval = Math.round(moment.duration(msg_timestamp.diff(timestamp)).asMinutes());
         if (msg_interval > MSG_INTERVAL_1) {
            $time_spacer = null;
            // Insert a message spacer of appropriate size:
            if (msg_interval > MSG_INTERVAL_4) {
               $time_spacer = $("<div class=\"msg-time-spacer-4\"></div>");
            }
            else if (msg_interval > MSG_INTERVAL_3) {
               $time_spacer = $("<div class=\"msg-time-spacer-3\"></div>");
            }
            else if (msg_interval > MSG_INTERVAL_2) {
               $time_spacer = $("<div class=\"msg-time-spacer-2\"></div>");
            }
            else {
               $time_spacer = $("<div class=\"msg-time-spacer-1\"></div>");
            }
            if (!$insert_point) {
               $conversation.prepend($time_spacer);
            }
            else {
               $insert_point.after($time_spacer);
            }
            $insert_point = $time_spacer;
            new_msg_group = true;
         }
      }

      // Insert a spacer between messages if the break is long enough and there is a previous message:
      if ($prev_msg !== null) {
         prev_timestamp = moment($prev_msg.attr("msg_created"));
         insert_time_spacer(prev_timestamp);
      }
      else {
         prev_timestamp = msg_timestamp;
      }

      // Insert a date header if there are no previous messages in the view, or the date has changed:
      if (($prev_msg === null) || (msg_timestamp.date() !== prev_timestamp.date())) {
         $date_header = $date_header_template.clone();
         // Show the month and year if there is no previous message or the month has changed:
         if (($prev_msg === null) || (msg_timestamp.month() !== prev_timestamp.month())) {
            $date_header.find(".date-month-year").html(msg_timestamp.format("MMMM YYYY"));
         }
         else {
            $date_header.find(".date-month-year").remove();
         }
         // Show the day:
         $date_header.find(".date-day").html(msg_timestamp.format("dddd MMM D"));

         // Insert it all into the conversation view:
         if ($insert_point === null) {
            // Using append because there may be load links above:
            $conversation.append($date_header);
         }
         else {
            $insert_point.after($date_header);
         }
         $insert_point = $date_header;
         // startOf() and add() modify the object directly, so pass a new instance:
         insert_time_spacer(moment(msg_timestamp).startOf("day"));
         new_msg_group = true;
      }

      // For efficiency, but also if new_msg_group is true, $msg_group might not be set:
      if (!new_msg_group) {
         new_msg_group |= ( ($msg_group.hasClass("src-msg") && (!msg.this_user)) ||
                            ($msg_group.hasClass("dst-msg") && ( msg.this_user)) );
      }

      // Create a new message group if necessary:
      if (new_msg_group) {
         // Insert a new group after the insert point:
         $msg_group = $message_group_template.clone();
         $msg_group.addClass(msg.this_user ? "src-msg" : "dst-msg");
         // Show the time of the last message at the end of the preceding message group, if there is one:
         if (($time_spacer !== null) || ($date_header !== null)) {
            if ($prev_msg !== null) {
               $prev_msg.after($("#templates .msg-time").clone().html(prev_timestamp.format("HH:mm")));
            }
            $msg_group.append($("#templates .msg-time").clone().html(msg_timestamp_short));
         }
         $insert_point.after($msg_group);
         // Clear the insert point to insert the message at the end of the group:
         $insert_point = null;
      }
      else {
         // Set the insert point to insert the message after the previous message:
         $insert_point = $prev_msg;
      }

      // Create a new message:
      $msg = $message_template.clone()
                              .addClass(msg.this_user ? "src-msg" : "dst-msg")
                              .attr("id",          msg_format_id(msg.id))
                              .attr("msg_created", msg.created);
      // Set the status icon tooltip to the message time:
      $msg.find(".msg-status") .attr("title", msg_timestamp_short);
      // If the ID is not a number it's a temporary UUID so don't add it:
      $msg.find(".msg-summary").html((typeof msg.id === "number" ? msg.id : "") + " &mdash; " + msg.name + " &mdash; " + msg_timestamp.format(current_user.settings.display.timestamp_format));
      $msg.find(".msg-show")   .hide();
      // Remove edit/delete buttons for messages that don't belong to the current user:
      $msg.find(".msg-edit").remove(); // Not implemented yet
      if ($msg_group.hasClass("dst-msg")) {
         //$msg.find(".msg-edit")  .remove();
         $msg.find(".msg-delete").remove();
      }
      $msg.find(".msg-body")   .html(msg.body);

      // Format any media items in the message for display:
      //    These are identified by the fact that they have a media-id attribute.
      //    Any normal <a> or <img> tags will be left alone since they don't have this attribute.
      var $placeholder = null;
      $msg.find("*[media-id]").each(function()
      {
         const $mediaitem      = $(this);
         const media_name      = $mediaitem.attr("media-name");
         const $mediacontainer = $media_item_template.clone();

         // Add the media container to the message where the media item is:
         $mediaitem.before($mediacontainer);
         $mediacontainer.attr("media-id", $mediaitem.attr("media-id"));
         // Handle the media item according to its type:
         switch ($mediaitem.prop("nodeName").toLowerCase()) {

            // Images don't need the wrapper since they're always shown:
            case "img":

               const media_id = $mediaitem.attr("media-id");

               $mediaitem.on("error", function()
               {
                  warn("msg_add", media_id + ": thumbnail load failed", LOG_FLAGS.MSG);
                  $(this).on("error", function()
                  {
                     warn("msg_add", media_id + ": image load failed", LOG_FLAGS.MSG);
                     $(this).off("error")
                            .attr("src", "img/emoji/fb/1.0/128/5-travel-and-places/066-1f386.png");
                  })
                  .attr("src", media_url(media_id));
               })
               .attr("src", media_url(media_id, "thumbnail"));
               $placeholder = $("<a href=\"" + media_url(media_id) + "\"></a>");
               $placeholder.append($mediaitem);
               $mediacontainer.find(".media-wrapper").remove();
               $mediacontainer.prepend($placeholder);

               $placeholder.on("mousedown", function(event)
               {
                  msg_body_input_focus = $msg_body_input.is(":focus");
               });

               $placeholder.on("click", function(event)
               {
                  lightbox_show($mediacontainer.attr("media-id"));
                  return false;
               });

               break;

            // Audio items go in a click-to-open/close wrapper:
            case "audio":

               $placeholder = $mediacontainer.find(".media-placeholder");
               $placeholder.html("<img class=\"media-icon\" src=\"img/icons/audio_cassette_PNG16090.png\">");
               $mediaitem.remove();

               $placeholder.on("click", function(event)
               {
                  const $this      = $(this);
                  const $container = $this.parents(".media-container");

                  $this.before("<audio class=\"media-item\" src=\"" + media_url($container.attr("media-id")) + "\" controls autoplay>")
                       .hide();
                  $container.find(".media-close-button").show();
               });

               $mediacontainer.find(".media-close-button").on("click", function(event)
               {
                  const $this      = $(this);
                  const $container = $this.parents(".media-container");

                  $this.hide();
                  $container.find(".media-item").remove();
                  $container.find(".media-placeholder").show();
               });

               break;

            // Video items go in a click-to-open/close wrapper:
            //    The video is shown in the placeholder over top of the thumbnail since it's already the right size
            //    and prevents initial video player resizing from shifting the page up and down.
            case "video":

               $placeholder = $mediacontainer.find(".media-placeholder");
               $placeholder.append(
                  $("<img class=\"media-poster\">")
                  .on("error", function()
                  {
                     $(this).attr("class", "media-icon")
                            .attr("src",   "img/emoji/fb/1.0/128/6-objects/010-1f4f9.png");
                  })
                  .attr("src", media_url($mediaitem.attr("media-id"), "thumbnail"))
               );
               $mediaitem.remove();

               $placeholder.on("click", function(event)
               {
                  const $this      = $(this);
                  const $container = $this.parents(".media-container");

                  $this.append("<video class=\"media-item abs-pos top left\" src=\"" + media_url($container.attr("media-id")) + "\" controls webkit-playsinline>");
//                  $this.append("<a class=\"st2\" href=\"" + media_url($container.attr("media-id")) + "\">" + media_url($container.attr("media-id")) + "</a>");
                  $container.find(".media-close-button").show();

                  // BB10 browser is letting click events through to the thumbnail and opening additional video players:
                  $this.find("video").on("click", function(event)
                  {
                     return false;
                  });

                  // BB10 browser won't autoplay video so do it manually:
                  $this.find(".media-item").get(0).play();
               });

               $mediacontainer.find(".media-close-button").on("click", function(event)
               {
                  const $this      = $(this);
                  const $container = $this.parents(".media-container");

                  $this.hide();
                  $container.find(".media-item").remove();
               });

               break;

            // Replace <youtube> tags with an embedded video:
            //    e.g. <iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/KQ6zr6kCPj8" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            //    CSS is used to remove the border, so the frameborder attribute can be omitted.
            //    Autoplay is also removed from the allow attribute.
            //    The youtube-container div autosizes the video vertically using a percentage that corresponds to a fixed aspect ratio.
            //    e.g. From the example above, 560:315 is 1.777 which is 100:56.25.
            //    Video information including the width and height can be obtained from:
            //    https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=KQ6zr6kCPj8&format=json
            //    This would require cross site AJAX though.
            case "youtube":

               const video_url       = "https://youtu.be/" + $mediaitem.attr("media-id");
               const video_embed_url = "https://www.youtube-nocookie.com/embed/" + $mediaitem.attr("media-id");

               $placeholder = $mediacontainer.find(".media-placeholder");
               $placeholder.html("<img class=\"media-icon\" src=\"img/icons/YouTube_play_buttom_icon_(2013-2017).svg\">");
               $mediacontainer.children(".media-item-name").replaceWith("<a class=\"media-item-name block pre-break-word\" href=\"" + video_url + "\" target=\"_blank\">" + video_url + "</a>");
               $mediaitem.remove();

               $placeholder.on("click", function(event)
               {
                  const $this           = $(this);
                  const $container      = $this.parents(".media-container");
                  const $youtube_player = $("#templates .youtube-wrapper").clone();

                  $youtube_player.addClass("media-item")
                                 .children().attr("src", video_embed_url);
                  $this.before($youtube_player)
                       .hide();
                  $container.find(".media-close-button").show();
               });

               $mediacontainer.find(".media-close-button").on("click", function(event)
               {
                  const $this      = $(this);
                  const $container = $this.parents(".media-container");

                  $this.hide();
                  $container.find(".media-item").remove();
                  $container.find(".media-placeholder").show();
               });

               break;

            // Replace <instagram> tags with an embedded post:
            case "instagram":

               const post_url       = "https://instagr.am/p/" + $mediaitem.attr("media-id");
               const post_embed_url = post_url + "/embed";

               $placeholder = $mediacontainer.find(".media-placeholder");
               $placeholder.html("<img class=\"media-icon\" src=\"img/icons/Instagram_logo_2016.svg\">");
               $mediacontainer.children(".media-item-name").replaceWith("<a class=\"media-item-name block pre-break-word\" href=\"" + post_url + "\" target=\"_blank\">" + post_url + "</a>");
               $mediaitem.remove();

               $placeholder.on("click", function(event)
               {
                  const $this           = $(this);
                  const $container      = $this.parents(".media-container");
                  const $instagram_post = $("#templates .instagram-post").clone();

                  $instagram_post.on("load", function()
                  {
                     cnv_scroll_bottom();
                  });

                  if (!instagram_js_loaded) {
                     instagram_js_loaded = true;
                     $.ajax({
                        url:         "https://www.instagram.com/embed.js",
                        method:      "GET",
                        dataType:    "script",
                        crossDomain: true,
                        success:     show_ig_post,
                     });
                  }
                  else {
                     show_ig_post();
                  }

                  function show_ig_post()
                  {
                     $instagram_post.addClass("media-item")
                                    .attr("src", post_embed_url)
                                    .height("content");
                     $this.before($instagram_post)
                          .hide();
                     $container.find(".media-close-button").show();
                  }
               });

               $mediacontainer.find(".media-close-button").on("click", function(event)
               {
                  const $this      = $(this);
                  const $container = $this.parents(".media-container");

                  $this.hide();
                  $container.find(".media-item").remove();
                  $container.find(".media-placeholder").show();
               });

               break;

            // Other files don't need the wrapper since they're always shown as a link:
            case "a":

               $mediaitem.attr("href", "")
                         .attr("target", "_blank")
                         .text(media_name)
                         .on("click", function(event)
                         {
                            const $this      = $(this);
                            const $container = $this.parents(".media-container");

                            $this.attr("href", media_url($container.attr("media-id")));
                         });
               $mediacontainer.children().remove();
               $mediacontainer.prepend($mediaitem);
               break;
         }

         if (media_name) {
            // Set the media item name from the attribute:
            $mediacontainer.children(".media-item-name")
                           .text(media_name)
                           .toggleClass("hidden", !current_user.settings.media.show_filename)
                           .on("click", function(event)
                           {
                              socket.emit("app_media_info", $mediacontainer.attr("media-id"), function(exif_info)
                              {
                                 dialogbox_show("<div class=\"hvpad st1 scroll-auto\"><span class=\"monospace pre\">" + exif_info + "</span></div>", {
                                    close_button:   true,
                                    default_button: "close_button",
                                    escape_button:  "close_button",
                                 });
                              });
                           });
         }
         // Set the media item class and remove attributes that are no longer needed:
         $mediaitem.addClass("media-item")
                   .removeAttr("media-id")
                   .removeAttr("media-name");
      });

      // Setup event handlers for the message:
      msg_add_event_handlers($msg);
      // Append the message at the end of the message group:
      if ($insert_point === null) {
         $msg_group.append($msg);
      }
      // Insert the message directly after the previous message:
      else if ($insert_point.length > 0) {
         $insert_point.after($msg);
      }
      else {
         throw("msg_add: Invalid message $insert_point");
      }

/*
      $msg.find("a").each(function(i)
      {
         const url = $(this).attr("href");

         $.ajax({
            url:         url,
            method:      "head",
            crossDomain: true,
            headers:     {
               "Access-Control-Allow-Origin": "*",
            },
            contentType: false,
            processData: false,

            // 'xhr' option overrides jQuery's default
            // factory for the XMLHttpRequest object.
            // Use either in global settings or individual call as shown here.
            xhr: function() {
               // Get new xhr object using default factory
               var xhr = jQuery.ajaxSettings.xhr();
               // Copy the browser's native setRequestHeader method
               var setRequestHeader = xhr.setRequestHeader;
               // Replace with a wrapper
               xhr.setRequestHeader = function(name, value)
               {
//log(name);
                  // Ignore the X-Requested-With header
                  if (name == "origin") return;
                  // Otherwise call the native setRequestHeader method
                  // Note: setRequestHeader requires its 'this' to be the xhr object,
                  // which is what 'this' is here when executed.
                  setRequestHeader.call(this, name, value);
               }
               // pass it on to jQuery
               return xhr;
            },

            beforeSend:  function(xhr, settings)
            {
//               delete settings.headers["host"];
//               delete settings.headers["origin"];
//               delete $.ajaxSettings.headers["referer"];
//               dir(settings);
            },

            success:     function(data, status, xhr)
            {
               log("link head: " + url + ": " + status + ": " + xhr.status + " " + xhr.statusText + ": " + data);
//               dir(xhr);
            },

            error:       function(xhr, status, error)
            {
               log("link head: " + url + ": " + status + ": " + error);
//               dir(xhr);
            },
         });
      });
*/
   }

   // Always update the status:
   //    The conversation could be loaded because a user is reconnecting
   //    and status changes could have occurred while offline.
   msg_set_status($msg, msg);

   return $msg;
}



// msg_set_status sets the status of a message in the conversation view.
//    This also updates the unread messages list.
//
//    $msg   Object   Reference to the jQuery object of the message in the conversation view to set the status for.
//    msg    Object   Message info:
//
//       this_user   Boolean   Flag indicating if the message belongs to the current user or not.
//       id          Number    Message ID.
//       status      String    MSG_STATUS_* constant.

function msg_set_status($msg, msg)
{
   // Messages from this user:
   if (msg.this_user) {
      $msg.find(".msg-body").toggleClass("dim50", msg.status === MSG_STATUS_SENDING);
   }
   // Messages from other users:
   else {
      // msg_add is called with no current conversation for the default welcome message:
      if (current_cnv) {
         switch (msg.status) {

            // Sending and received shouldn't be set at this point, but what the hell:
            case MSG_STATUS_SENDING:
            case MSG_STATUS_RECEIVED:
            case MSG_STATUS_UNREAD:
               // Shouldn't happen, but prevent a message being added more than once:
               if (current_cnv.unread_msgs.indexOf(msg.id) === -1) {
                  current_cnv.unread_msgs.push(msg.id);
                  mousemove_throttle_clear();
               }
               break;

            case MSG_STATUS_READ:
               // BB10 browser doesn't want i to be a const because it's really stupid and weird:
               //    When minified, somehow $msg gets assigned -1.
               var i = current_cnv.unread_msgs.indexOf(msg.id);
               if (i !== -1) {
                  current_cnv.unread_msgs.splice(i, 1);
               }
               break;
         }
      }
   }
   $msg.attr("msg_status", msg.status)
       .find(".msg-status")
       .removeClass(function(index, classname)
       {
          return (classname.match(/(^|\s)icon-status-\S+/g) || []).join(" ");
       })
       .addClass("icon-status-" + (msg.this_user ? "src-" : "dst-") + msg.status);
}



// msg_add_event_handlers is used to add event handlers when creating a new message
//    for the conversation view, and any other special handlers (i.e. for viewing images).

function msg_add_event_handlers($msg)
{
   if (typeof $msg === "undefined") {
      $msg = $("#conversation .message");
   }

   // Message events:

   if (app.support.touch) {
      $msg.find(".msg-status").on("touchstart touchend touchcancel", function(event)
      {
         event.stopPropagation();
      });
   }

   $msg.find(".msg-status").on("click", function(event)
   {
      $msg.find(".msg-info").toggle();
//      cnv_scroll_bottom();
      return false;
   });

   $msg.find(".msg-hide").on("click", function(event)
   {
      current_user.hidden_msgs[msg_get_id($msg)] = $msg;
      $msg.find(".msg-info").hide();
      $msg.find(".msg-hide").hide();
      $msg.find(".msg-show").show();
      $msg.find(".msg-body").hide()
                            .after($("#templates .msg-hidden").clone());
      return false;
   });

   $msg.find(".msg-show").on("click", function(event)
   {
      delete current_user.hidden_msgs[msg_get_id($msg)];
      $msg.find(".msg-info").hide();
      $msg.find(".msg-hide").show();
      $msg.find(".msg-show").hide();
      $msg.find(".msg-hidden").remove();
      $msg.find(".msg-body").show();
      return false;
   });

   $msg.find(".msg-delete").on("click", function(event)
   {
      dialogbox_show_text("Are you super duper sure?", {

         delete_button:  function()
         {
            socket.emit("msg_delete", [msg_get_id($msg)]);
            return true;
         },

         cancel_button:  true,

         default_button: "delete_button",
         escape_button:  "cancel_button",
      });
      return false;
   });
}



// msg_remove removes a message from the conversation view.
//    Its message group is also removed if it's empty afterwards.
//    This also updates the unread messages list.
//
//    msg_id   Number   Message ID to remove.

function msg_remove(msg_id)
{
   const $existingmessage = $("#" + msg_format_id(msg_id));
   if ($existingmessage.length === 1) {
      const $messagegroup = $existingmessage.parent();
      const i = current_cnv.unread_msgs.indexOf(msg_id);
      if (i !== -1) {
         current_cnv.unread_msgs.splice(i, 1);
      }
      $existingmessage.remove();
      if ($messagegroup.find(".message").length === 0) {
         $messagegroup.remove();
      }
   }
}



