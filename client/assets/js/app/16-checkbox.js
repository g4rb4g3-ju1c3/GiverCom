


function set_checked($checkbox, value)
{
   $checkbox.prop("checked", value);
}

/*
function toggle_checked($checkbox)
{
   $checkbox.toggleClass("checked");
}
*/

function is_checked($checkbox)
{
   return $checkbox.is(":checked");
}

function any_checked($search_element)
{
   var any_checked = false;

   $search_element.find(".checkbox").each(function(i, element) {
      any_checked = (element.className.search("checked") != -1);
      return !any_checked;
   });

   return any_checked;
}

function check_all($checkbox, $search_element, checkbox_class)
{
   var checked = $checkbox.hasClass("checked");

   $search_element.find(".checkbox" + (typeof checkbox_class === "string" ? "." + checkbox_class : "")).each(function(i, element) {
      $(element).toggleClass("checked", checked);
   });
}

function get_checked_count($search_element, checkbox_class)
{
   var selected_count = 0;

   $search_element.find(".checkbox" + (typeof checkbox_class === "string" ? "." + checkbox_class : "")).each(function(i, element) {
      if ($(element).hasClass("checked")) {
         selected_count++;
      }
   });

   return selected_count;
}

function get_checked_id_list($search_element, checkbox_class, id_attribute)
{
   var id_list = "";

   $search_element.find(".checkbox" + (typeof checkbox_class === "string" ? "." + checkbox_class : "")).each(function(i, element) {
      if ($(element).hasClass("checked")) {
         id_list += "|" + element.getAttribute(id_attribute);
      }
   });
   if (id_list != "") {
      id_list += "|";
   }

   return id_list;
}



