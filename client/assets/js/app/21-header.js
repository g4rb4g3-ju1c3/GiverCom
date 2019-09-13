


///////////////////////////
/////  HEADER EVENTS  /////
///////////////////////////

$document.ready(function()
{

   $("#avatar").on("click", function(event)
   {
      cnv_show_list();
      return false;
   });

/*
   $("#titlebar").on("click", function(event)
   {
      $header.find("#avatar").toggleClass("icon-settings");
//      $("#toolbar #
      $header.children("#toolbar").toggle();
      ui_resize();
      return false;
   });
*/



/*
   $("#sound_player #play_pause").on("click", function(event)
   {
      var $mediaplayer = $("#sound_player #media_player")[0]
      if ($mediaplayer.paused) {
         $mediaplayer.play();
         $("#sound_player #play_pause").html("II");
      }
      else {
         $mediaplayer.pause();
         $("#sound_player #play_pause").html(">");
      }
      return false;
   });
*/

});



//////////////////////////////
/////  HEADER FUNCTIONS  /////
//////////////////////////////

function init_header(args)
{
   $titlebar    .toggle((current_user == null) || current_user.settings.display.large_titlebar);
   $titlebar_min.toggle((current_user != null) && !current_user.settings.display.large_titlebar);
   $("#header #title")       .html(typeof args.title    === "string" ? (args.title    == "" ? "&nbsp;" : args.title   ) : "&nbsp;");
   $("#header #subtitle")    .html(typeof args.subtitle === "string" ? (args.subtitle == "" ? "&nbsp;" : args.subtitle) : "&nbsp;");
   $titlebar_min             .html(typeof args.subtitle === "string" ? (args.subtitle == "" ? "&nbsp;" : args.subtitle) : "&nbsp;");
//   $("#media_player")[0].volume = 0.1;
}



