


// Screws up BB10 browser (of course):
//"use strict";



// Defined if in development mode in app.html via EJS:
//    The presence of the meta tag is enough to indicate development.
const APP_ENV_DEVELOPMENT = ($("meta[name=app_env_development]").length === 1);



const KEY_BS         =   8;
const KEY_TAB        =   9;
const KEY_ENTER      =  13;
const KEY_SHIFT      =  16;
const KEY_CTRL       =  17;
const KEY_ALT        =  18;
const KEY_PAUSE      =  19;
const KEY_CAPSLOCK   =  20;
const KEY_ESC        =  27;
const KEY_DEL        =  46;
const KEY_F1         = 112;
const KEY_F2         = 113;
const KEY_F3         = 114;
const KEY_F4         = 115;
const KEY_F5         = 116;
const KEY_F6         = 117;
const KEY_F7         = 118;
const KEY_F8         = 119;
const KEY_F9         = 120;
const KEY_F10        = 121;
const KEY_F11        = 122;
const KEY_F12        = 123;
const KEY_NUMLOCK    = 144;
const KEY_SCROLLLOCK = 145;

const LEFT_BUTTON   = 1;
const MIDDLE_BUTTON = 2;
const RIGHT_BUTTON  = 3;

const LONGCLICK_TIMEOUT = 500;

const HEX_CHARS        = "0123456789ABCDEF"
const HEX_COLOUR_CHARS = "0123456789ABCDEF#"

//const URL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~:/?#[]@!$&'()*+,;=";

const SQL_TRUE  = 1;
const SQL_FALSE = 0;



function get_selection()
{
   // Not IE:
   if (window.getSelection) {
      return window.getSelection().getRangeAt(0);
   }
   // IE:
   else if (document.selection) {
      return document.selection.createRange();
   }
}



function restore_selection($element, range)
{
//   document.getElementById($element.attr("id")).focus();
   if (msg_body_range != null) {
      var sel = window.getSelection();
      // non IE, with selection
      if (sel) {
         if (sel.rangeCount > 0) {
            sel.removeAllRanges();
         }
         sel.addRange(range);
      }
      // non IE, no selection
      else if (document.createRange) {
         sel.addRange(range);
      }
      // IE
      else if (document.selection) {
         range.select();
      }
   }
}



function longclick_mousedown(event, timeout)
{
   if (typeof timeout !== "number") {
      timeout = LONGCLICK_TIMEOUT;
   }
   event.target.longclick = false;
   longclick_timer = setTimeout(function()
   {
      const longclick_event = new Event("longclick");
      longclick_event.which = event.which;
      longclick_timer = null;
      event.target.longclick = true;
      event.target.dispatchEvent(longclick_event);
   }, timeout);
}



function longclick_mouseup()
{
   // If the timer is still running it's not a long click:
   if (longclick_timer) {
      clearTimeout(longclick_timer);
      longclick_timer = null;
      return false;
   }
   else {
      return true;
   }
}



/*
function cookie_set(name, value, days)
{
   var expires = "";

   if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
   }
   document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}



function cookie_get(name)
{
   var cookies = document.cookie.split(';');
   var cookie  = "";

   name += "=";
   for (var i = 0; i < cookies.length; i++) {
      cookie = cookies[i];
      while (cookie.charAt(0) == " ") {
         cookie = cookie.substring(1, cookie.length);
      }
      if (cookie.indexOf(name) == 0) {
         return cookie.substring(nameEQ.length, cookie.length);
      }
   }

   return null;
}



function cookie_clear(name)
{
   document.cookie = name + '=; Max-Age=-99999999;';
}
*/



function uuidv4()
{
   // 079cc81a-cf12-4046-9770-1ed443f6a08d
   return generate_uuidv4([1e7] + -1e3 + -4e3 + -8e3 + -1e11);
}



function uuidv4_compact()
{
   // 079cc81acf12404697701ed443f6a08d
   return generate_uuidv4([1e7] + 1e3 + 4e3 + 8e3 + 1e11);
}



function generate_uuidv4(format_string)
{
   return format_string.replace(/[018]/g, function(c)
   {
      return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
   });
/*
   var d = new Date().getTime();
   if ((typeof performance !== "undefined") && (typeof performance.now === "function")) {
      d += performance.now();
   }
   return format_string.replace(/[xy]/g, function(c)
   {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c == "x" ? r : (r & 0x3 | 0x8)).toString(16);
   });
*/
}



function urlBase64ToUint8Array(base64_string)
{
   var padding  = "=".repeat((4 - base64_string.length % 4) % 4);
   var base64   = (base64_string + padding)
                  .replace(/\-/g, "+")
                  .replace(/_/g,  "/");
   var raw_data = window.atob(base64);
   var output   = new Uint8Array(raw_data.length);

   for (var i = 0; i < raw_data.length; i++) {
      output[i] = raw_data.charCodeAt(i);
   }

   return output;
}



const html_entity_map = {
   "&": "&amp;",
   "<": "&lt;",
   ">": "&gt;",
   '"': "&quot;",
   "'": "&#x27;",
   "/": "&#x2F;",
   "`": "&#x60;",
   "=": "&#x3D;"
};

function escape_html(string)
{
   if (typeof string !== "string") return string;

   return string.replace(/[&<>"'`=\/]/g, function(char) {
      return html_entity_map[char];
   });
}



function linkify(string)
{
   if (typeof string !== "string") return string;

//   var url_regex = /(https?:\/\/[^\s]+)/g;

   return string.replace(/(https?:\/\/[^\s^<]+)/g, function(url)
   {
      return "<a href=\"" + url + "\" target=\"_blank\">" + url + "</a>";
//      return text.replace(url_regex, "<a href="$1">$1</a>")
   })
   .replace(/(magnet:[^\s^<]+)/g, function(url)
   {
      return "<a href=\"" + url + "\">" + url + "</a>";
   });
}



function utf16_escaped(code_point)
{
//   const TEN_BITS = parseInt("1111111111", 2);

   function u(code_unit) {
      return "\\u" + code_unit.toString(16).toUpperCase();
   }

   if (code_point <= 0xFFFF) {
      return u(code_point);
   }
   else {
      code_point -= 0x10000;
      return u(0xD800 + (code_point >> 10)) + u(0xDC00 + (code_point & parseInt("1111111111", 2)));
//      // Shift right to get to most significant 10 bits:
//      const lead_surrogate = 0xD800 + (code_point >> 10);
//      // Mask to get least significant 10 bits:
//      const tail_surrogate = 0xDC00 + (code_point & TEN_BITS);
//      return u(lead_surrogate) + u(tail_surrogate);
   }
}



function utf16_string(code_point)
{
   if (code_point <= 0xFFFF) {
      return String.fromCodePoint(code_point);
   }
   else {
      code_point -= 0x10000;
      return String.fromCodePoint(0xD800 + (code_point >> 10)) + String.fromCodePoint(0xDC00 + (code_point & parseInt("1111111111", 2)));
   }
}



/*
function alphanumeric(text)
{
   return text.replace(/\W/g, "");
}
*/



/*
function cursor_at_eol(element)
{
   element.selectionStart = element.selectionEnd = element.value.length;
}
*/



/*
function select_text(element)
{
   var range = null;

   if (document.selection) {
      range = document.body.createTextRange();
      range.moveToElementText(element);
      range.select();
   }
   else if (window.getSelection) {
      range = document.createRange();
      range.selectNodeContents(element);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
   }
}
*/



/*
function get_offset_rect(element)
{
   var box = element.getBoundingClientRect();

   var body    = document.body;
   var docElem = document.documentElement;

   var scrollTop  = window.pageYOffset || docElem.scrollTop  || body.scrollTop;
   var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;

   var clientTop  = docElem.clientTop  || body.clientTop  || 0;
   var clientLeft = docElem.clientLeft || body.clientLeft || 0;

   var top  = box.top  + scrollTop  - clientTop;
   var left = box.left + scrollLeft - clientLeft;

   return { top: Math.round(top), left: Math.round(left) };
}
*/



/*
function remove_whitespace_nodes($element)
{
   $element.contents().each(function()
   {
      if (this.nodeType === 3 && !$.trim(this.nodeValue)) {
         $(this).remove();
      }
   });
}
*/



/*
function pasteHtmlAtCaret(html, selectPastedContent)
{
   var sel, range;

   if (window.getSelection) {
      // IE9 and non-IE
      sel = window.getSelection();
      if (sel.getRangeAt && sel.rangeCount) {
         range = sel.getRangeAt(0);
         range.deleteContents();

         // Range.createContextualFragment() would be useful here but is
         // only relatively recently standardized and is not supported in
         // some browsers (IE9, for one)
         var el = document.createElement("div");
         el.innerHTML = html;
         var frag = document.createDocumentFragment(), node, lastNode;
         while (node = el.firstChild) {
            lastNode = frag.appendChild(node);
         }
         var firstNode = frag.firstChild;
         range.insertNode(frag);

         // Preserve the selection
         if (lastNode) {
             range = range.cloneRange();
             range.setStartAfter(lastNode);
             if (selectPastedContent) {
                 range.setStartBefore(firstNode);
             }
             else {
                 range.collapse(true);
             }
             sel.removeAllRanges();
             sel.addRange(range);
         }
      }
   }
   else if ((sel = document.selection) && sel.type != "Control") {
      // IE < 9
      var originalRange = sel.createRange();
      originalRange.collapse(true);
      sel.createRange().pasteHTML(html);
      if (selectPastedContent) {
         range = sel.createRange();
         range.setEndPoint("StartToStart", originalRange);
         range.select();
      }
   }
}
*/



function get_scrollbar_width()
{
   const outer = document.createElement("div");
   outer.style.visibility = "hidden";
   outer.style.overflow   = "scroll";
   // Needed for WinJS apps:
   outer.style.msOverflowStyle = "scrollbar";
   document.body.appendChild(outer);
   const inner = document.createElement("div");
   outer.appendChild(inner);
   const scrollbar_width = (outer.offsetWidth - inner.offsetWidth);
   outer.parentNode.removeChild(outer);

   return scrollbar_width;
}



