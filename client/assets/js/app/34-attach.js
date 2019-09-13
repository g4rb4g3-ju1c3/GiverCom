


$document.ready(function()
{

   ///////////////////////////////
   /////  ATTACHMENT EVENTS  /////
   ///////////////////////////////

   $attachment_button.on("mousedown", function(event)
   {
      if (event.which === LEFT_BUTTON) {
         longclick_mousedown(event);
      }
      return false;
   });

   $attachment_button.on("mouseup mouseout", function(event)
   {
      if (event.which === LEFT_BUTTON) {
         longclick_mouseup();
      }
      return false;
   });

   if (app.support.touch) {

      $attachment_button.on("touchstart", function(event)
      {
         longclick_mousedown(event);
      });

      $attachment_button.on("touchend touchcancel touchmove", function(event)
      {
         longclick_mouseup();
      });

   }

   $attachment_button.on("click", function(event)
   {
      if (!this.longclick) {
         $("#attachmentbar #attach_image").click();
      }
      return false;
   });

   $attachment_button.on("longclick", function(event)
   {
      attachmentbar_show();
      return false;
   });



   $attachmentbar.on("mousedown mouseup click", function(event)
   {
      return false;
   });

   $(".attachment-type").on("mousedown mouseup", function(event)
   {
      return false;
   });

   $(".attachment-type").on("click", function(event)
   {
      attachmentbar_hide();
      show_file_select_dialog($(this).attr("attach"));
      return false;
   });

   $("#attach_file_input").on("change", function(event)
   {
      var files = $(this).get(0).files;

      upload_files(files);
   });

});



//////////////////////////////////
/////  ATTACHMENT FUNCTIONS  /////
//////////////////////////////////

function attachmentbar_show()
{
   if (!$attachmentbar.is(":visible")) {
      $attachmentbar.show();
      ui_resize();
   }
}



function attachmentbar_hide()
{
   if ($attachmentbar.is(":visible")) {
      $attachmentbar.hide();
      ui_resize();
   }
}



function show_file_select_dialog(accept_type)
{
   if (typeof accept_type !== "string") {
      accept_type = "";
   }
   attachmentbar_hide();
   $("#attach_file_input").attr("accept", accept_type);
   $("#attach_file_input").click();
}



function upload_files(files)
{
   if (files.length > 0) {
      var form_data = new FormData();

      attachmentbar_hide();
      emojibar_hide();
      msg_read_on_typing();

      for (var i = 0; i < files.length; i++) {
         form_data.append("uploads[]", files[i], files[i].name);
      }
      dir(form_data);
      $.ajax({
         url:         "upload",
         method:      "post",
         contentType: false,
         data:        form_data,
         processData: false,

         // Show upload progress:
         xhr:         function()
         {
            var xhr       = new XMLHttpRequest();
            var $progress = $("#footer #progressbar #progress");
            var progress  = 0;

            xhr.upload.addEventListener("progress", function(event)
            {
               if (event.lengthComputable) {
                  progress = Math.round((event.loaded / event.total) * 100);
                  $progress.width(progress < 100 ? progress + "%" : "0");
               }
            }, false);

            return xhr;
         },

         // A JSON file list is returned on success:
         success:     function(data, status, xhr)
         {
            applog("form file upload", status + ": " + xhr.status + " " + xhr.statusText + ": " + data, LOG_FLAGS.UPLOAD);

            var file     = null;
            var msg_body = "";

            for (i in xhr.responseJSON) {
               file = xhr.responseJSON[i];
               type = file.type.substring(0, file.type.indexOf("/"))
               if (type != "") {
                  msg_body += (msg_body == "" ? "<" : " <");
                  switch (type) {
                     case "image":
                        msg_body += "img";
                        break;
                     case "audio":
                        msg_body += "audio";
                        break;
                     case "video":
                        msg_body += "video";
                        break;
                     default:
                        msg_body += "a"
                        break;
                  }
                  msg_body += " media-id=\"" + file.id + "\" media-name=\"" + escape_html(file.name) + "\">";
//log(msg_body);
               }
            }
            msg_send(msg_body);
         },

         // Show an error message:
         error:       function(xhr, status, error)
         {
            warn("form file upload", status + ": " + error, LOG_FLAGS.UPLOAD);
            dialogbox_show_text("Upload failed:<br><br>" +
                                xhr.status + ": " + error + "<br><br>" +
                                JSON.stringify(xhr).replace(/"\n"/g, "<br>"), {
               close_button:   true,
               default_button: "close_button",
               escape_button:  "close_button",
            });
         },
      });

   }
}



