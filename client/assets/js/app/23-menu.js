


/////////////////////////
/////  MENU EVENTS  /////
/////////////////////////

$document.ready(function()
{

   $("#hamburger_button").on("click", function(event)
   {
      $hamburgermenu.show();
      $hamburgermenu.focus();
      return false;
   });



   $hamburgermenu.on("keydown", function(event)
   {
      switch (event.keyCode) {
         case KEY_ESC:
            $hamburgermenu.hide();
            return false;
      }
   });

   $hamburgermenu.on("click", function(event)
   {
      $hamburgermenu.hide();
      return false;
   });

   $hamburgermenu.find("#hamburger_menu_content").click(function(event)
   {
      return false;
   });

   $hamburgermenu.find(".hamburger-menu-item").click(function(event)
   {
      $hamburgermenu.hide();
      switch ($(this).attr("id")) {
         case "hamburger_menu_notifications":
            notifications_show();
            break;
         case "hamburger_menu_conversations":
            cnv_show_list();
            break;
         case "hamburger_menu_search":
            cnv_search_show();
            break;
         case "hamburger_menu_go_to_date":
            cnv_go_to_date_show();
            break;
         case "hamburger_menu_images":
            cnv_media_browser_show();
            break;
         case "hamburger_menu_stats":
            app_show_stats();
            break;
         case "hamburger_menu_help":
            app_show_help();
            break;
         case "hamburger_menu_settings":
            app_settings_show();
            break;
         case "hamburger_menu_delete":
            dialogbox_show_text("hahahahaha fuuuuuuuck that!", {
               ok_button:      true,
               cancel_button:  true,
               default_button: "ok_button",
               escape_button:  "cancel_button",
            });
            break;
         case "hamburger_menu_install":
            app_install_prompt();
            break;
         case "hamburger_menu_refresh":
            window.location.reload();
            break;
         case "hamburger_menu_debug":
            showlog();
            break;
         case "hamburger_menu_positive_message":
            dialogbox_show_text("You are a terrific person!", {
               ok_button:      function($dialog) { alert("(K)"); return true; },
               cancel_button:  true,
               default_button: "ok_button",
               escape_button:  "cancel_button",
            });
            break;
         case "hamburger_menu_about":
//            ui_show_content($("#content_holding #app_about"));
            app_about_show();
            break;
         case "hamburger_menu_logout":
            user_logout();
            break;
         case "hamburger_menu_logout":
//            const win = window.open("https://youtu.be/_Uj8p6GNIRY", "_blank");
//            win.focus();
            window.open("https://youtu.be/_Uj8p6GNIRY", "_blank").focus();
            break;
      }
      return false;
   });

});



