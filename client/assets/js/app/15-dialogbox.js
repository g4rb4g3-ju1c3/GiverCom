


var dialogs      = {};
var dialog_index = 1;



/////////////////////////////////
/////  DIALOGBOX FUNCTIONS  /////
/////////////////////////////////

// dialogbox_show shows a dialog box.
//
//    content   Mixed    The content to show.  This can be text or HTML, which is better because there is no padding.
//                          Use dialogbox_show_text for simple text messages.
//    args      Object   Dialog box parameters.  All are optional:
//
//       init             Function           Code to execute before the dialog box is shown.  It is passed a reference to the JQuery dialog object.
//       init_visible     Function           Code to execute after the dialog box is shown.  It is passed a reference to the JQuery dialog object.
//       close            Function           Code to execute before the dialog box is destroyed.  It is passed a reference to the JQuery dialog object.
//       fullwidth        Boolean            True to fill the full width of the page content.
//       fullheight       Boolean            True to fill the full height of the page content.
//       scroll           Boolean            True to force vertical scrollbar.
//       no_buttons       Boolean            True to hide buttons.  This will override showing any buttons,
//                                             and the dialog is closed by clicking on it or the background, or by pressing Enter or Esc.
//       ok_button        Boolean/Function   If present, the OK button is shown.
//       cancel_button    Boolean/Function   If present, the Cancel button is shown.
//       close_button     Boolean/Function   If present, the Close button is shown.
//       save_button      Boolean/Function   If present, the Save button is shown.
//       delete_button    Boolean/Function   If present, the Delete button is shown.
//       discard_button   Boolean/Function   If present, the Discard button is shown.
//                                             For any button, if a function is given, it is executed on the click event and passed a reference to the JQuery button object ($dialog).
//                                             Return true to close the dialog or false to keep it open.
//       default_button   String             Button ID to click when Enter is pressed.  This should probably be one that's visible.
//       escape_button    String             Button ID to click when Esc is pressed.  This should probably be one that's visible.

function dialogbox_show(content, args)
{
   const $dialog         = $dialogbox_template.clone();
   const dlg_id          = "dialogbox_" + dialog_index++;
   const $dialog_message = $dialog.find(".dialog-message");

   $dialog.attr("id", dlg_id);
   dialogs[dlg_id] = {
      $dialog:           $dialog,
      args:              args,
      return_to_holding: false,
   };

   if (args.fullwidth) {
      $dialog.find(".dialogbox-content").css("width", "100%");
   }
   if (args.fullheight) {
      $dialog.find(".dialogbox-content").css("height", "100%");
   }
   if (args.scroll) {
      $dialog_message.css("overflow-y", "scroll");
   }
   if (typeof content === "string") {
      $dialog_message.html(content);
   }
   else if (content instanceof jQuery) {
      dialogs[dlg_id].return_to_holding = true;
      $dialog_message.append(content);
   }
   else {
      $dialog_message.html("Invalid dialog box content");
   }

   if (args.no_buttons) {
      $dialog.find(".dialog-buttons").remove();
   }
   else {
      $dialog.find(".dialog-buttons").toggleClass("border-thin-top", (args.scroll === true));
      $dialog.find("#ok_button")     .toggle((typeof args.ok_button      !== "undefined") && (args.ok_button      !== false));
      $dialog.find("#cancel_button") .toggle((typeof args.cancel_button  !== "undefined") && (args.cancel_button  !== false));
      $dialog.find("#close_button")  .toggle((typeof args.close_button   !== "undefined") && (args.close_button   !== false));
      $dialog.find("#save_button")   .toggle((typeof args.save_button    !== "undefined") && (args.save_button    !== false));
      $dialog.find("#delete_button") .toggle((typeof args.delete_button  !== "undefined") && (args.delete_button  !== false));
      $dialog.find("#discard_button").toggle((typeof args.discard_button !== "undefined") && (args.discard_button !== false));
   }

   $dialog.on("keydown", function(event)
   {
//      log("dialogs[" + dlg_id + "].keydown: keyCode: " + event.keyCode);
      const $this  = $(this);
      const dlg_id = $this.attr("id");

      if (dialogs[dlg_id].args.no_buttons) {
         switch (event.keyCode) {

            case KEY_ENTER:
            case KEY_ESC:
               dialogbox_hide(dlg_id);
               return false;
         }
      }
      else {
         switch (event.keyCode) {

            case KEY_ENTER:
               dialogbox_click_button($this.find("#" + dialogs[dlg_id].args.default_button));
               return false;

            case KEY_ESC:
               dialogbox_click_button($this.find("#" + dialogs[dlg_id].args.escape_button));
               return false;
         }
      }
   });

   $dialog.find(".dialog-buttons .dialog-button").each(function(i)
   {
      const $this = $(this);

      if (args[$this.attr("id")]) {
         $this.on("click", function(event)
         {
            dialogbox_click_button($this);
            return false;
         });
      }
   });
   $("#dialogboxes").append($dialog);
   if (typeof args.init === "function") {
      args.init($dialog);
   }
   $dialog.show().focus();
   dialogbox_resize(dlg_id);
   if (typeof args.init_visible === "function") {
      args.init_visible($dialog);
   }

   return $dialog;
}



function dialogbox_show_text(message, args)
{
   dialogbox_show("<div class=\"hvpad cursor-default\">" + message.replace(/\n/g, "<br>") + "</div>", args)
}



function dialogbox_hide(dlg_id)
{
   if (typeof dlg_id === "string") {
      const dialog = dialogs[dlg_id];
      if (dialog.return_to_holding) {
         $content_holding.append(dialog.$dialog.find(".dialog-message").children());
      }
      if (typeof dialog.args.close === "function") {
         dialog.args.close(dialog.$dialog);
      }
      dialog.$dialog.remove();
      delete dialogs[dlg_id];
   }
}



function dialogbox_resize_all()
{
   $("#dialogboxes .dialogbox").each(function(i)
   {
      dialogbox_resize($(this).attr("id"));
   });
}



function dialogbox_resize(dlg_id)
{
//   log("dialogbox_resize: " + dlg_id);

   const $dlg         = dialogs[dlg_id].$dialog;
   const $dlg_content = $dlg.find(".dialogbox-content");
   const $dlg_message = $dlg.find(".dialog-message");
   const $dlg_buttons = $dlg.find(".dialog-buttons");

   $dlg_content.css("max-width", $content.width() * 1.25);
   $dlg_message.height($dlg_content.innerHeight() - $dlg_buttons.outerHeight(true));
/*
   $dlg_message.css("max-height", $dlg_content.height() - $dlg_buttons.outerHeight(true));
   $dlg_content.css("min-width", $content.width() / 2.0)
               .css("max-width", $content.width() * 1.5)
               .height($dlg_message.outerHeight(true) + $dlg_buttons.outerHeight(true));
   if (dlg.args != null && dlg.args.fullwidth === true) {
      $dlg_content.css("min-width", $content.width());
   }
   $dlg_message.css("max-width", $content.width())
               .css("max-height", $window.height() - $dlg_buttons.outerHeight(true));
   $dlg_content.height(Math.min($dlg_message.outerHeight(true) + $dlg_buttons.outerHeight(true), $window.height()));
*/
}



function dialogbox_click_button($dlg_button)
{
   const dlg_id         = $dlg_button.parents(".dialogbox").attr("id");
   const button_action  = dialogs[dlg_id].args[$dlg_button.attr("id")];
   var hide_dialogbox = true;

   if (typeof button_action === "function") {
      hide_dialogbox = button_action($dlg_button);
   }
   if (hide_dialogbox) {
      dialogbox_hide(dlg_id);
   }
}



