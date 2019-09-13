


// current_cnv stores information about the currently loaded conversation:
//
//    Returned by cnv_load:
//       current_cnv.id
//       current_cnv.name
//       current_cnv.settings
//       current_cnv.users[ name, name, ..., name, ]
//    Added in cnv_set:
//       current_cnv.participants        String    e.g. "Name 1, Name 2" for display in header, excluding the current user.
//       current_cnv.temp_msg_id         Number    Temporary message IDs used until the server returns the actual ID saved.  Starts at 1.
//       current_cnv.unread_msgs         Array     List of unread message IDs from other users.  Can be empty, but not null.
//       current_cnv.new_msgs            Boolean   Set to true if any new incoming messages have arrived, false if not.  Used to clear remote notifications and not local ones.
//       current_cnv.msg_read_all_lock   Boolean   Flag indicating that messages were marked as read but still waiting for a response from the server.
//       current_cnv.at_bottom           Boolean   Indicates if the conversation view is scrolled to the bottom or not.

var current_cnv = null;



cnv_set(null);



/////////////////////////////////
/////  CONVERSATION EVENTS  /////
/////////////////////////////////

$document.ready(function()
{

   $content.on("scroll", function(event)
   {
      // Include being within 10 pixels of the bottom so at_bottom isn't hyper picky:
      if (current_cnv) {
         current_cnv.at_bottom = ($content.scrollTop() >= Math.floor($conversation.height() - $content.height() - 10));
         if (current_cnv.at_bottom && $("#footer #previewbar").length !== 0) {
            previewbar_hide();
         }
      }
      return false;
   });

   $("#app_conversation_search #search_text_input").on("keydown", function(event)
   {
      if (event.keyCode == KEY_ENTER) {
         $("#app_conversation_search #search_button").trigger("click");
      }
   });

   $("#app_conversation_search #search_button").on("click", function(event)
   {
      cnv_search($("#app_conversation_search #search_text_input").val());
      return false;
   });
});



////////////////////////////////////
/////  CONVERSATION FUNCTIONS  /////
////////////////////////////////////

var $conversations_dialog = null;

function cnv_show_list()
{
   applog("cnv_show_list", "", LOG_FLAGS.CNV);

   socket.emit("cnv_list", function(cnv)
   {
      const $cnv_list          = $("#app_conversations #conversations");
      const $cnv_item_template = $("#templates .cnv-item");
      var $cnv_item    = null;
      var participants = "";

      $cnv_list.children().remove();
      $cnv_item = $cnv_item_template.clone();
      $cnv_item.attr("id", "0")
               .find(".cnv-item-name").html("Close current conversation");
      $cnv_list.append($cnv_item)
               .append("<hr>");
      for (var i in cnv) {
         participants = cnv[i].participants.replace(new RegExp("(, )?" + current_user.name + "(, )?", ""), "");
         $cnv_item = $cnv_item_template.clone();
         $cnv_item.attr("id", cnv[i].id);
         $cnv_item.find(".cnv-item-name").html(cnv[i].user_name !== "" ? cnv[i].user_name : cnv[i].name);
         $cnv_item.find(".cnv-item-participants").html(participants != "" ? participants : "no one");
         $cnv_list.append($cnv_item);
      }

      dialogbox_show($("#app_conversations"), {

         fullwidth:             true,

         init:                  function($dialog)
         {
            $conversations_dialog = $dialog;

            $dialog.find(".cnv-item").on("click", function(event)
            {
               dialogbox_hide($dialog.attr("id"));
               // cnv_load will update the current conversation if it hasn't changed but don't bother since it's already showing:
               var cnv_id = parseInt($(this).attr("id"));
               if (cnv_id === 0) {
                  cnv_id = null;
               }
               ui_load_indicator_show();
               cnv_load(cnv_id);
               return false;
            });

            $dialog.find("#new_conversation_name").on("keydown", function(event)
            {
               if (event.keyCode === KEY_ENTER) {
                  $dialog.find("#create_new_conversation").trigger("click");
               }
            });

            $dialog.find("#create_new_conversation").on("click", function(event)
            {
               const cnv_name = $("#new_conversation_name").val();

               if (cnv_name.trim() != "") {
                  ui_load_indicator_show();
                  cnv_create(cnv_name);
               }
               else {
                  dialogbox_show_text("Enter a name, dumbo.", {
                     ok_button:      true,
                     default_button: "ok_button",
                     escape_button:  "ok_button",
                  });
               }
               return false;
            });
         },

         close_button:          true,
         escape_button:         "close_button",
      });
   });
}



function cnv_create(name)
{
   applog("cnv_create", name, LOG_FLAGS.CNV);

   socket.emit("cnv_create", name, function(err, cnv_id)
   {
      if (cnv_id) {
         dialogbox_hide($conversations_dialog.attr("id"));
         $conversations_dialog = null;
         $("#new_conversation_name").val("");
         cnv_load(cnv_id);
      }
      else {
         ui_load_indicator_hide();
         dialogbox_show_text(err, {
            ok_button:      true,
            default_button: "ok_button",
            escape_button:  "ok_button",
         });
      }
   });
}



function cnv_load(cnv_id)
{
   applog("cnv_load", "cnv " + cnv_id, LOG_FLAGS.CNV);

   // Clear the current conversation:
   if (cnv_id === null) {
      ui_typing_indicator_hide();
      cnv_set(null);
      $conversation.empty();
      const $msg = msg_add({
         id:        0,
         this_user: false,
         name:      app.info.name,
         status:    MSG_STATUS_SENDING,
//         body:      $("#welcome_message").clone(),
         body:      "<span id=\"open_hamburger_menu\" class=\"link\">Go to the hamburger</span> and open a conversation for maximum craziness.<br>" +
                    "<br>" +
                    "Or sit here and look at the Dumpster Grumpster:<br>" +
                    "<br>" +
                    "<img class=\"expand-x\" src=\"img/kittenkittentongue.jpg\"><br>" +
                    "<br>",
         created:   moment().format(),
      }, null);
//      $msg.find(".msg-body").append($("#welcome_message").clone());
      $msg.find("#open_hamburger_menu").on("click", function(event)
      {
         $("#hamburger_button").trigger("click");
      });
      $conversation.find(".msg-load-links").remove();
      ui_update();
      cnv_load_latest_messages();
   }
   // Update the current conversation:
   else if (current_cnv && (cnv_id == current_cnv.id)) {
      ui_update();
      cnv_load_latest_messages();
   }
   // Load a new conversation:
   else {
      socket.emit("cnv_load", cnv_id, function(err, cnv)
      {
         ui_typing_indicator_hide();
         cnv_set(cnv);
         $conversation.empty();
         ui_update();
         cnv_load_latest_messages();
         $msg_body_input.focus();
      });
   }

   function cnv_load_latest_messages()
   {
      if (current_cnv) {
         // Get the last messages of the conversation:
         cnv_load_messages("last", CNV_MSG_LOAD_LIMIT, 0, function()
         {
            ui_load_indicator_hide();
            ui_page_cover_remove();
         });
      }
      else {
         ui_load_indicator_hide();
         ui_page_cover_remove();
      }
   }

}



// cnv_set sets up conversation info that was loaded from the database.

function cnv_set(cnv)
{
   if (cnv === null || typeof cnv !== "object") {
      current_cnv = null;
   }
   else {
      // Generate a list of conversation participants in a string for display:
      var participants = "";

      for (var i in cnv.users) {
         if (cnv.users[i].name !== current_user.name) {
            participants += ((participants === "" ? "" : ", ") + cnv.users[i].name);
         }
      }
      // Override the default conversation name if there is a user-specified name:
      if (cnv.user_name !== "") {
         cnv.name = cnv.user_name;
      }
      delete cnv.user_name;
      // Set the current conversation:
      current_cnv = cnv;
      current_cnv.participants      = participants;
      current_cnv.temp_msg_id       = 1;
      current_cnv.unread_msgs       = [];
      current_cnv.msg_read_all_lock = false;
      current_cnv.at_bottom         = true;
   }
}



// cnv_load_messages loads a block of messages from the server and adds them to the conversation view.
//    If a message already exists, only its status is updated.
//
//    msg_id             Number/String   Message ID to load from, or "first" or "last" to load from the beginning/end of the conversation, or a date to go to.
//    msg_count_before   Number          Maximum number of messages before the specified message id.
//    msg_count_after    Number          Maximum number of messages after the specified message id.
//    callback           Function        Optional: Function to call when complete.
//    callback           Function        Optional: Callback function to execute when done.  Arguments are:
//       err                Mixed           An error message, or null if successful.
//       msgs               Array           Array of message objects.
//       msgs_preceding     Boolean         Flag indicating there are messages before the range loaded.
//       msgs_following     Boolean         Flag indicating there are messages after the range loaded.

function cnv_load_messages(msg_id, msg_count_before, msg_count_after, callback)
{
   applog("cnv_load_messages", msg_count_before + " <- " + msg_id + " -> " + msg_count_after, LOG_FLAGS.CNV);

   socket.emit("cnv_load_msg_range", msg_id, msg_count_before, msg_count_after,
   function(err, msgs, msgs_preceding, msgs_following)
   {
      if (err) { warn(err); return; }

      var msg       = null;
      var id_list   = (current_user.settings.messages.delivery_confirmation ? [] : null);
      var $prev_msg = $conversation.find(".message").last();

      // Clear the jQuery object if there is already nothing, or clear it if not loading the last messages:
      //    Sending a previous message of null to msg_add indicates to insert messages at the top.
      if (($prev_msg.length === 0) || msgs_following) {
         $prev_msg = null;
      }
      // Show links to load previous messages:
      if ($conversation.find("#msg_load_links_prev").length === 0) {
         const $load_links_prev = $("#templates #msg_load_links_prev").clone();
         if (!msgs_preceding) {
            $load_links_prev.find("span").not(":last").remove();
         }
         $conversation.prepend($load_links_prev);
         $load_links_prev.find(".msg-load-link").on("click", function(event)
         {
            ui_load_indicator_show();
            const prev_msgs_link = $(this).html().toLowerCase();
            const msg_id         = msg_get_id($conversation.find(".message").first());
            $conversation.empty();
            switch (prev_msgs_link) {

               case "top":
                  current_cnv.at_bottom = false;
                  cnv_load_messages("first", 0, CNV_MSG_LOAD_LIMIT, function()
                  {
                     ui_load_indicator_hide();
                  });
                  break;

               case "bottom":
                  current_cnv.at_bottom = true;
                  cnv_load_messages("last", CNV_MSG_LOAD_LIMIT, 0, function()
                  {
                     cnv_scroll_bottom($conversation);
                     ui_load_indicator_hide();
                  });
                  break;

               default:
                  current_cnv.at_bottom = true;
                  cnv_load_messages(msg_id, parseInt(prev_msgs_link), 0, function()
                  {
                     cnv_scroll_bottom($conversation);
                     ui_load_indicator_hide();
                  });
                  break;
            }
         });
      }
      // Add the messages to the conversation view:
      //    If reconnecting, the conversation may contain new unread messages, which will be added.
      //    Existing messages will have their status updated, but otherwise skipped.
      for (var i in msgs) {
         msg = msgs[i];
         if (!msg.this_user && (msg.status === MSG_STATUS_RECEIVED)) {
            msg.status = MSG_STATUS_UNREAD;
            if (id_list !== null) {
               id_list.push(msg.id);
            }
         }
         // Timestamps come from the database in UTC as "2069-04-20 16:20:00.420666" (readable by moment with 'Z' appended):
         //    ISO UTC timestamps are "2069-04-20T16:20:00.420Z" but a space instead of 'T' and extra fractional second precision works.
//log(msg.created + "   " + moment(msg.created + "Z").format());
         msg.created = moment(msg.created + "Z").format();
         // Add the message or update its status if it exists:
         //    This will also update the unread message list (in msg_set_status).
         $prev_msg = msg_add(msg, $prev_msg);
      }
      // Remove the time from the beginning of the next group:
      if ($prev_msg) {
         const $next_group = $prev_msg.parent().next();
         if ($next_group.length === 1) {
            $next_group.children().first().remove();
         }
      }
      // Show links to load next messages:
      if (msgs_following && ($conversation.find("#msg_load_links_next").length === 0)) {
         const $load_links_next = $("#templates #msg_load_links_next").clone();
         $conversation.append($load_links_next);
         $load_links_next.find(".msg-load-link").on("click", function(event)
         {
            ui_load_indicator_show();
            const msg_id = msg_get_id($conversation.find(".message").last());
            $conversation.empty();
            const next_msgs_link = $(this).html().toLowerCase();
            switch (next_msgs_link) {

               case "top":
                  current_cnv.at_bottom = false;
                  cnv_load_messages("first", 0, CNV_MSG_LOAD_LIMIT, function()
                  {
                     ui_load_indicator_hide();
                  });
                  break;

               case "bottom":
                  current_cnv.at_bottom = true;
                  cnv_load_messages("last", CNV_MSG_LOAD_LIMIT, 0, function()
                  {
                     cnv_scroll_bottom($conversation);
                     ui_load_indicator_hide();
                  });
                  break;

               default:
                  current_cnv.at_bottom = false;
                  cnv_load_messages(msg_id, 0, parseInt(next_msgs_link), function()
                  {
                     ui_load_indicator_hide();
                  });
                  break;
            }
         });
      }
      // Keep the bottom of the conversation in view if scrolled to the bottom:
      cnv_scroll_bottom($conversation);

      setTimeout(function()
      {
/*
         // Remove all message before the first one loaded:
         //    This is primarily in case the new block is not contiguous with the current view.
         const $first_msg = $("#msg_" + msg_id_start);
         $first_msg.prevAll(".message").remove();
         $first_msg.parent(".message-group").prevAll().remove();
*/
         if ((id_list !== null) && (id_list.length > 0)) {
            msg_confirm_delivery(id_list);
         }
      }, 0);

/*
      var i = 0;
      add_msgs();

      function add_msgs()
      {
         const msg = msgs[i];
         if (!msg.this_user && (msg.status === MSG_STATUS_RECEIVED)) {
            msg.status = MSG_STATUS_UNREAD;
            if (id_list !== null) {
               id_list.push(msg.id);
            }
         }
         // Timestamps come from the database in UTC as "2069-04-20 16:20:00.420666" (readable by moment with 'Z' appended):
         //    ISO UTC timestamps are "2069-04-20T16:20:00.420Z" but a space instead of 'T' and extra fractional second precision works.
         msg.created = moment(msg.created + "Z").format();
         // Add the message or update its status if it exists:
         //    This will also update the unread message marker (in msg_set_status).
         $prev_msg = msg_add(msg, $prev_msg);
         current_cnv.at_bottom = true;
         cnv_scroll_bottom($prev_msg);
         i++;
         if (i < msgs.length) {
            setTimeout(add_msgs, 0);
         }
         else {
            setTimeout(done_adding_msgs(), 0);
         }
      }

      function done_adding_msgs()
      {
         if ((id_list !== null) && (id_list.length > 0)) {
            msg_confirm_delivery(id_list);
         }
      }
*/

      if (typeof callback === "function") {
         callback();
      }
   });
}



/*
// cnv_send_messages sends any messages in the conversation that haven't been sent yet.
//    This could be because confirmation was never received, or they were written while offline.

function cnv_send_messages()
{
   applog("cnv_send_messages", "", LOG_FLAGS.CNV);

   const $msgs = $conversation.find(".message[msg_status*='" + MSG_STATUS_SENDING + "']");

   $msgs.each(function(i)
   {
      const $this = $(this);

      // Send the message (only the stuff not available on the server):
      //    The timestamp actually saved is set by the database so the message may be in a different order next time it's shown.
      //    The server callback occurs after the message has been saved in the database and before being broadcast.
      socket.emit("msg_new", [{
         id:      msg_get_uuid($this),
         created: $this.attr(".msg-created"),
         body:    $this.find(".msg-body").html(),
      }]);
   });
}
*/



var $search_dialog = null;

function cnv_search_show()
{
//   applog("cnv_search_show", "", LOG_FLAGS.CNV);

   if ($search_dialog === null) {
      $search_dialog = dialogbox_show($("#app_conversation_search"), {

         fullwidth:             true,
         fullheight:            true,

         close_button:          function()
         {
            $search_dialog = null;
            return true;
         },

         escape_button:         "close_button",
      });
   }
}



function cnv_search_hide()
{
   if ($search_dialog !== null) {
      dialogbox_hide($search_dialog.attr("id"));
      $search_dialog = null;
   }
}



function cnv_search(search_text)
{
   applog("cnv_search", search_text, LOG_FLAGS.CNV);

   if (typeof search_text !== "string") return;
   if (       search_text === ""      ) return;

   socket.emit("cnv_search", search_text,
   function(err, results)
   {
      if (err) { warn(err); return; }

      const $search_results = $("#app_conversation_search #search_results");

      if (results.length > 0) {
         var $search_item = null;

         $search_results.empty();
         for (var i in results) {
            // Timestamps come from the database in UTC as "2069-04-20 16:20:00.420666" (readable by moment with 'Z' appended):
            //    ISO UTC timestamps are "2069-04-20T16:20:00.420Z" but a space instead of 'T' and extra fractional second precision works.
            results[i].created = moment(results[i].created + "Z").format();
            $search_item = $("#templates .search-item").clone();
            $search_item.attr("msg_id", results[i].id);
            $search_item.find(".search-item-date").html(results[i].created);
            $search_item.find(".search-item-body").html(results[i].body);
            $search_item.on("click", function(event)
            {
               cnv_search_hide();
               $conversation.empty();
               cnv_load_messages(parseInt($(this).attr("msg_id")), CNV_MSG_LOAD_LIMIT / 2, CNV_MSG_LOAD_LIMIT / 2);
            });
            $search_results.append($search_item);
         }
      }
      else {
         $search_results.html("Nothing to show");
      }
   });
}



var $go_to_date_dialog = null;

function cnv_go_to_date_show()
{
//   applog("cnv_go_to_date_show", "", LOG_FLAGS.CNV);

   if ($go_to_date_dialog === null) {
      $go_to_date_dialog = dialogbox_show($("#app_conversation_go_to_date"), {

         fullwidth:             true,
         fullheight:            true,

         init:                  function()
         {
            cnv_list_dates();
         },

         close_button:          function()
         {
            $go_to_date_dialog = null;
            return true;
         },

         escape_button:         "close_button",
      });
   }
}



function cnv_go_to_date_hide()
{
   if ($go_to_date_dialog !== null) {
      dialogbox_hide($go_to_date_dialog.attr("id"));
      $go_to_date_dialog = null;
   }
}



function cnv_list_dates()
{
   applog("cnv_list_dates", "", LOG_FLAGS.CNV);

   socket.emit("cnv_list_dates",
   function(err, results)
   {
      if (err) { warn(err); return; }

      const $date_results = $("#app_conversation_go_to_date #date_results");

      if (results.length > 0) {
         var $date_item = null;
         var date       = "";

         $date_results.empty();
         for (var i in results) {
            date = results[i].date;
            $date_item = $("#templates .date-item").clone();
            $date_item.attr("date", date)
                      .html(date + " &mdash; " + moment(date).format("MMMM D, YYYY"));
            $date_item.on("click", function(event)
            {
               cnv_go_to_date_hide();
               $conversation.empty();
               current_cnv.at_bottom = false;
               cnv_load_messages(moment($(this).attr("date")).utc().format(), 0, CNV_MSG_LOAD_LIMIT);
            });
            $date_results.append($date_item);
         }
      }
      else {
         $date_results.html("Nothing to show");
      }
   });
}



var $images_dialog = null;

function cnv_media_browser_show()
{
//   applog("cnv_media_browser_show", "", LOG_FLAGS.CNV);

   if ($images_dialog === null) {
      $images_dialog = dialogbox_show($("#app_media_browser"), {

         fullwidth:             true,
         fullheight:            true,

         init:                  function()
         {
            cnv_list_media();
         },

         close_button:          function()
         {
            $images_dialog = null;
            return true;
         },

         escape_button:         "close_button",
      });
   }
}



function cnv_media_browser_hide()
{
   if ($images_dialog !== null) {
      dialogbox_hide($images_dialog.attr("id"));
      $images_dialog = null;
   }
}



function cnv_list_media()
{
   applog("cnv_list_media", "", LOG_FLAGS.CNV);

   socket.emit("cnv_list_media",
   function(err, results)
   {
      if (err) { warn("cnv_list_media", err); return; }
//dir(results);

      const $media_results = $("#app_media_browser #media_results");

      if (results.length > 0) {
         var media_id   = "";
         var filename   = "";
         var $mediaitem = null;

         $media_results.empty();
         for (var i in results) {
            media_id = results[i].media_id;
            filename = results[i].filename;

            $mediaitem = $("#templates .media-browser-item").clone();

            $mediaitem.find("a").attr("href", media_url(media_id))

            $mediaitem.find(".media-browser-item-thumbnail").attr("media_id", media_id)
                                                            .attr("src", media_url(media_id, "thumbnail"))
            .on("click", function(event)
            {
               lightbox_show($(this).attr("media_id"));
               return false;
            });

            $mediaitem.find(".media-browser-item-filename").html(filename);

            $mediaitem.find(".media-browser-item-message-link").attr("media_id", media_id)
            .on("click", function(event)
            {
               ui_load_indicator_show();
               cnv_media_browser_hide();
               socket.emit("cnv_find_media_item", $(this).attr("media_id"), function(err, msg_id)
               {
                  if (err) { warn("cnv_list_media", err); ui_load_indicator_hide(); return; }

                  $conversation.empty();
                  current_cnv.at_bottom = false;
                  cnv_load_messages(msg_id, 10, CNV_MSG_LOAD_LIMIT - 10, function()
                  {
                     ui_load_indicator_hide();
                  });
               });
               return false;
            });

            $media_results.append($mediaitem);
         }
      }
      else {
         $media_results.html("Nothing to show");
      }
   });
}



// cnv_scroll_bottom scrolls to the bottom of the conversation view, if that's where it was.
//    To force it, set current_cnv.at_bottom to true before calling it.
//    This will trigger the scroll event.
//
//    $object   jQuery object   Specifies an object that may contain images to wait for loading.

function cnv_scroll_bottom($object)
{
//   applog("cnv_scroll_bottom", current_cnv.at_bottom, LOG_FLAGS.CNV);

   if (current_cnv && current_cnv.at_bottom) {
      // Waiting for images to load appears to be necessary in FF desktop and Android Chrome for example.
      if ($object) {
         $object.find("img").on("load", scroll_bottom);
//         $object.find("img").imagesLoaded(scroll_bottom);
      }
      // This one seems to be necessary for the BB10 browser.
      setTimeout(scroll_bottom, 0);
   }

   function scroll_bottom()
   {
//      $content_scroll.scrollTop($conversation.height() + 1 - $content.height());
      $content_scroll.scrollTop($conversation.height());
   }
}



/*
function cnv_settings_show()
{
}
*/



