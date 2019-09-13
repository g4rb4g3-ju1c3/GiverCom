


/////////////////////////////
/////  LIGHTBOX EVENTS  /////
/////////////////////////////

$document.ready(function()
{

   $("#lightbox").on("keydown", function(event)
   {
      switch (event.keyCode) {
         case KEY_ENTER:
         case KEY_ESC:
            history.back();
//            lightbox_hide();
            return false;
      }
   });

   $("#lightbox_info_button").on("click", function(event)
   {
      var $lightbox_info = $("#lightbox_info");

      if ($lightbox_info.html() == "") {
         socket.emit("app_media_info", $lightbox_info.attr("media-id"), function(exif_info)
         {
//            log(exif_info);
            $lightbox_info.html(exif_info);
         });
      }
      $lightbox_info.toggleClass("hidden");
      return false;
   });

   $("#lightbox_content").on("click", function(event)
   {
      history.back();
//      lightbox_hide();
      return false;
   });

   $("#lightbox_image").on("click", function(event)
   {
      if ($("#lightbox_image").css("max-width") == "100%") {
         $("#lightbox_image").css("max-width",  "")
                             .css("max-height", "");
      }
      else {
         $("#lightbox_image").css("max-width",  "100%")
                             .css("max-height", "100%");
      }
      return false;
   });

   $("#lightbox_open_button").on("click", function(event)
   {
      window.open($("#lightbox_image").attr("src"), "_blank");
      return false;
   });

   $("#lightbox_close_button").on("click", function(event)
   {
      history.back();
//      lightbox_hide();
      $("#lightbox_image").attr("src", "");
      return false;
   });

});



////////////////////////////////
/////  LIGHTBOX FUNCTIONS  /////
////////////////////////////////

function lightbox_show(media_id)
{
   $msg_body_input.blur();
   $("#lightbox_image").attr("src", media_url(media_id))
                       .css("max-width",  "100%")
                       .css("max-height", "100%");
   $("#lightbox_info").attr("media-id", media_id);
   $("#lightbox").show()
                 .focus();
   history.pushState({ location: "lightbox" }, "", "");
}



function lightbox_hide()
{
   $("#lightbox").hide();
   $("#lightbox_image").attr("src", "");
   $("#lightbox_info").html("");
   $("#lightbox_info").toggleClass("hidden", true);
   if (msg_body_input_focus) {
      $msg_body_input.focus();
   }
}



