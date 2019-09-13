


/*
$document.ready(function()
{
//   log("document ready: global");
   var scroll_timeout;

   $content.scroll(function() {
      clearTimeout(scroll_timeout);
      scroll_timeout = setTimeout(function() {
         update_current_state();
      }, 100);
   });
});
*/



function get_scroll_pos()
{
   return $content.scrollTop();
}

function scroll_to(scrollpos, animate, callback)
{
//   log("scroll_to: " + scrollpos);
   if (scrollpos != null) {
      if (animate) {
         $content.animate({
            scrollTop: scrollpos
         }, 150, callback);
      }
      else {
         $content.scrollTop(scrollpos);
      }
   }
}

function scroll_to_top()
{
   scroll_to(0, true, null);
}

function scroll_to_bottom()
{
   scroll_to($("#content_pad").position().top + $content.scrollTop(), true, null);
}

function scroll_to_element(element, align_middle, animate)
{
   var $element = null;

   if (typeof element === "object") {
      $element = element;
   }
   else if (typeof element === "string") {
      $element = $("#" + element);
   }
   if ($element != null) {
      $element.show();
      scroll_to($element.position().top + get_scroll_pos() - (align_middle ? (($content.height() - $element.height()) / 2) : 0), animate);
   }
}

function scroll_to_row(row_id, align_middle, animate)
{
   scroll_to_element("list_row_" + row_id, align_middle, animate);
}

function highlight_element(element, highlight, animate)
{
   var $element = null;

   if (typeof element === "object") {
      $element = element;
   }
   else if (typeof element === "string") {
      $element = $("#" + element);
   }
   if ($element != null) {
      $element.stop(true, true);
      if (highlight) {
         if (animate) {
            $element.effect("highlight", { color: "#FFFFE0" }, 2000);
         }
         else {
            $element.addClass("highlight");
         }
      }
      else {
         $element.removeClass("highlight");
      }
   }
}

function highlight_row(item_id, highlight, animate)
{
   highlight_element("list_row_" + item_id, highlight, animate);
}

function jump_to_element(element)
{
   hide_datalist();
   scroll_to_element(element, true, true);
   highlight_element(element, true, true);
}

function jump_to_row(row_id)
{
   hide_datalist();
   scroll_to_element("list_row_" + row_id, true, true);
   highlight_element("list_row_" + row_id, true, true);
}



