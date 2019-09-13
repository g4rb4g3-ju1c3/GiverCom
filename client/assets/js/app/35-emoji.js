


const fb_emoji_path = "emoji/fb/1.0/128";

const emoji_translation = {
   ":k:" : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/067-1f638.png\" alt=\"\uD83D\uDE38\">",
   ":^:" : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/058-1f4a9.png\" alt=\"\uD83D\uDCA9\">",
   ":*"  : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/160-1f48b.png\" alt=\"\uD83D\uDC44\">",
   ":)"  : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/011-1f642.png\" alt=\"\uD83D\uDE42\">",
   ":("  : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/030-1f61e.png\" alt=\"\uD83D\uDE1E\">",
   ";)"  : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/009-1f609.png\" alt=\"\uD83D\uDE09\">",
   ":d"  : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/004-1f603.png\" alt=\"\uD83D\uDE03\">",
   ":o"  : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/041-1f62e.png\" alt=\"\uD83D\uDE2E\">",
   ":p"  : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/022-1f61b.png\" alt=\"\uD83D\uDE1B\">",
   ":s"  : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/053-1f635.png\" alt=\"\uD83D\uDE35\">",
   ":|"  : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/026-1f610.png\" alt=\"\uD83D\uDE10\">",
   ":\\" : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/035-1f615.png\" alt=\"\uD83D\uDE15\">",
   ":((" : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/001-1f62c.png\" alt=\"\uD83D\uDE2C\">",
   ":$"  : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/029-1f633.png\" alt=\"\uD83D\uDE33\">",
   ":x"  : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/055-1f637.png\" alt=\"\uD83D\uDE37\">",
   ":@"  : "<img class=\"emoji\" src=\"" + fb_emoji_path + "/1-smileys-and-people/033-1f621.png\" alt=\"\uD83D\uDE21\">",
};

// Test string:
// :&::G::K::!::*:):(;):D:O:P:S:|:\:$:X:@



var current_category = "";
var emoji_scale      = 0.941;
var emoji_rows       = 6;


$document.ready(function()
{
   var $emoji_views = $("#emojibar #emoji_views");

   // Create emoji views for each category:

   $("#emojibar #emoji_categories .emoji-category-button").each(function(i)
   {
      $emoji_views.append("<div cat-id=\"" + $(this).attr("id") + "\"></div>");
   });

   current_category = $("#emojibar #emoji_categories").children().first().attr("id");



   // Show the emoji bar:

   $emoji_button.on("mousedown", function(event)
   {
      if (event.which === LEFT_BUTTON) {
         longclick_mousedown(event);
         attachmentbar_hide();
      }
      return false;
   });

   $emoji_button.on("mousemove", function(event)
   {
      if (event.which === LEFT_BUTTON) {
         longclick_mouseup();
      }
      return false;
   });

   $emoji_button.on("mouseup", function(event)
   {
      if (event.which === LEFT_BUTTON) {
         longclick_mouseup();
      }
      return false;
   });

   if (app.support.touch) {

      $emoji_button.on("touchstart", function(event)
      {
         longclick_mousedown(event);
         attachmentbar_hide();
      });

      $emoji_button.on("touchend touchcancel touchmove", function(event)
      {
         longclick_mouseup();
      });

   }

   $emoji_button.on("click", function(event)
   {
      if (!this.longclick) {
         attachmentbar_hide();
         emojibar_toggle();
      }
      return false;
   });

/*
   $emoji_button.on("longclick", function(event)
   {
      msg_read_on_typing();
      msg_send("<img src=\"emoji/fb/1.0/128/2-animals-and-nature/050-1f410.png\" alt=\"\uD83D\uDC10\">");
      return false;
   });
*/



   // Select emoji category:

   $emojibar.on("mousedown mouseup click", function(event)
   {
      return false;
   });

   $("#emojibar .emoji-category-button").on("mousedown mouseup", function(event)
   {
      return false;
   });

   $("#emojibar .emoji-category-button").on("click", function()
   {
      emoji_view_show($(this).attr("id"));
   });



   // Common emojis:

   emoji_set_event_handlers($("#emojibar #common_emojis .emoji"));
/*
   $("#emojibar #common_emojis .emoji").on("click", function(event)
   {
      emoji_click($(this));
      if (current_user.settings.display.single_click_emojis) {
         msg_read_on_typing();
         msg_input_send();
      }
      return false;
   });
*/

});



function emoji_set_event_handlers($emojis)
{
   $emojis.on("mousedown", function(event)
   {
      if (event.which == LEFT_BUTTON) {
         longclick_mousedown(event);
         attachmentbar_hide();
      }
      return false;
   });

   $emojis.on("mouseup", function(event)
   {
      if (event.which == LEFT_BUTTON) {
         longclick_mouseup();
      }
      return false;
   });

   if (app.support.touch) {

      $emojis.on("touchstart", function(event)
      {
         longclick_mousedown(event);
         attachmentbar_hide();
      });

      $emojis.on("touchend touchcancel touchmove", function(event)
      {
         longclick_mouseup();
      });

   }

   $emojis.on("click", function(event)
   {
      if ((event.which == LEFT_BUTTON) && !this.longclick) {
         msg_read_on_typing();
         emoji_click($(this));
/*
         if (current_user.settings.display.single_click_emojis) {
            msg_send("<img class=\"emoji\" src=\"" + $emoji_clicked.attr("src") + "\" alt=\"" + $emoji_clicked.attr("alt") + "\">");
         }
*/
      }
      return false;
   });

   $emojis.on("longclick", function(event)
   {
      emojibar_hide();
      msg_read_on_typing();
      msg_send("<img class=\"emoji\" src=\"" + $(this).attr("src") + "\" alt=\"" + $(this).attr("alt") + "\">");
      return false;
   });
}



// emojibar_toggle shows the emoji bar and loads emojis from the currently selected category
//    into the emoji view if it's empty.

function emojibar_toggle()
{
   // Prepare the emoji view before showing the emoji bar:
   if (!$emojibar.is(":visible")) {
      emoji_view_show(current_category);
      $msg_body_input.focus();
   }
   $emojibar.toggle();
   ui_resize();
}



// emojibar_hide hides the emoji bar.

function emojibar_hide()
{
   if ($emojibar.is(":visible")) {
      $emojibar.hide();
      ui_resize();
   }
}



// emoji_view_show copies the specified category's emoji view to the display view.

//var anchor_offset = 0;
//var prev_node = null;

function emoji_view_show(category)
{
   if ((category != current_category) || $("#emojibar #emoji_view").is(":empty")) {
      // Make sure the category is loaded from the server:
      emoji_load(category, function() {
         // Copy the emoji category to the main view:
         $("#emojibar #emoji_view_container").scrollTop(0);
         $("#emojibar #emoji_view").html($("#emojibar #emoji_views [cat-id='" + category + "']").html());

         // Set up event handlers for the emojis:
         emoji_set_event_handlers($("#emojibar #emoji_view .emoji"));
      });
   }
}



// emoji_load gets a list of emoji paths from the server for the specified category
//    and adds them to the category's emoji view if it's empty.
//    Otherwise it does nothing.

function emoji_load(category, callback)
{
   current_category = category;
   if ($("#emojibar #emoji_views [cat-id='" + category + "']").is(":empty")) {
      socket.emit("app_emoji_list", category, function(emoji_paths)
      {
//         applog("app_emoji_list", "", LOG_FLAGS.UI);
//         applog("app_emoji_list", emoji_paths, LOG_FLAGS.UI);

         var i, j          = 0;
         var emoji_content = "";
         var code_points   = null;
         var alt           = "";

         // Unicode in the alt text is screwing up the BB10 browser:
         if (!device_type(DEVICE_TYPE_BB10)) {
            for (i in emoji_paths) {
               alt = emoji_paths[i];
               if (alt.substring(0, 9) === "emoji/fb/") {
                  alt = alt.substring(alt.lastIndexOf("/") + 5);
                  code_points = alt.substring(0, alt.lastIndexOf(".")).split("_");
                  alt = "";
                  for (j in code_points) {
                     alt += utf16_string(parseInt(code_points[j], 16));
                  }
               }
               else {
                  alt = "";
               }
               emoji_content += "<img class=\"emoji hvpad-medium link\" src=\"" + emoji_paths[i] + (alt !== "" ? "\" alt=\"" + alt : "") + "\">";
            }
         }
         else {
            for (i in emoji_paths) {
               emoji_content += "<img class=\"emoji hvpad-medium link\" src=\"" + emoji_paths[i] + "\">";
            }
         }
         $("#emojibar #emoji_views [cat-id='" + category + "']").html(emoji_content);

         callback();
      });
   }
   else {
      callback();
   }
}



function emoji_click($emoji)
{
   msg_input_insert_img($emoji.attr("src"), $emoji.attr("alt"));
   ui_update_cnv_emoji();
}



function emoji_update_scale(emoji_scale)
{
   switch (emoji_scale) {
      case "tiny":
         emoji_scale = CSS_REF_SIZE * 0.500;
         emoji_rows  = 9;
         break;
      case "small":
         emoji_scale = CSS_REF_SIZE * 0.750;
         emoji_rows  = 7;
         break;
      case "medium":
         emoji_scale = CSS_REF_SIZE * 0.941;
         emoji_rows  = 6;
         break;
      case "large":
         emoji_scale = CSS_REF_SIZE * 1.300;
         emoji_rows  = 5;
         break;
   }
   $("head #dynamic_styles").html(".emoji { display: inline-block; width: " + emoji_scale + "cm; height: " + emoji_scale + "cm; vertical-align: middle;}");
   emoji_height = $("#emoji_categories .emoji").first().outerHeight();
}



