


var previewbar_timeout = null;



/////////////////////////////////
/////  NOTIFICATION EVENTS  /////
/////////////////////////////////

$document.ready(function()
{

   $previewbar.on("click", function(event)
   {
      const cnv_id = parseInt($previewbar.attr("cnv_id"));

      previewbar_hide();
      if (cnv_id === current_cnv.id) {
         current_cnv.at_bottom = true;
         cnv_scroll_bottom();
      }
      else {
         cnv_load(cnv_id);
      }
      return false;
   });

   $previewbar.on("mousemove", function(event)
   {
      if (previewbar_timeout !== null) {
         clearTimeout(previewbar_timeout);
         previewbar_timeout = null;
      }
      return false;
   });

   $previewbar.on("mouseout", function(event)
   {
      previewbar_timeout = setTimeout(function()
      {
         previewbar_hide();
      }, MSG_NEW_PREVIEW_TIMEOUT);
      return false;
   });

});



////////////////////////////////////
/////  NOTIFICATION FUNCTIONS  /////
////////////////////////////////////

function previewbar_show(msg, position)
{
   if (current_user.settings.messages.previews) {
      if ((position === "top") || (typeof position === "undefined")) {
         $header.append($previewbar);
      }
      else if (position === "bottom") {
         $footer.prepend($previewbar);
      }
      $previewbar.html("<span class=\"st1 bold\">" + msg.name + "</span><br>" + msg.body)
                 .attr("cnv_id", (typeof msg.cnv_id === "number" ? msg.cnv_id : ""))
                 .show();
      clearTimeout(previewbar_timeout);
      previewbar_timeout = setTimeout(function()
      {
         previewbar_hide();
      }, MSG_NEW_PREVIEW_TIMEOUT);
   }
}



function previewbar_hide()
{
   if (previewbar_timeout === null) {
      clearTimeout(previewbar_timeout);
      previewbar_timeout = null;
   }
   $previewbar.hide();
}



function notifications_show()
{
   dialogbox_show($("#app_notifications").html(), {
      fullwidth:             true,
      scroll:                true,

      populate:              function()
      {
      },

      close_button:          true,

      escape_button:         "close_button",
   });
}



