


const SHUTDOWN_GRACE_PERIOD = 1000;

const WS_INTERVAL_PING      = 15 * 1000;
//const WS_TIMEOUT_PING       =  3 * 1000;
const WS_INTERVAL_RECONNECT =  1 * 1000;
const WS_TIMEOUT_RECONNECT  = 15 * 1000;
const WS_MSG_ACK_TIMEOUT    = 10 * 1000;



// WebSocket close codes:

//const WS_CC_DESCRIPTION = {};

const WS_CC_NORMAL               = 1000;
const WS_CC_GOING_AWAY           = 1001;
const WS_CC_PROTOCOL_ERROR       = 1002;
const WS_CC_INVALID_DATA         = 1003;
const WS_CC_RESERVED             = 1004;
const WS_CC_NO_STATUS            = 1005;
const WS_CC_ABNORMAL             = 1006;
const WS_CC_INVALID_MESSAGE_DATA = 1007;
const WS_CC_GENERIC              = 1008;
const WS_CC_MESSAGE_TOO_LARGE    = 1009;
const WS_CC_NO_EXTENSIONS        = 1010;
const WS_CC_INTERNAL_ERROR       = 1011;
const WS_CC_TLS_ERROR            = 1015;

//WS_CC_DESCRIPTION[WS_CC_NORMAL               = "Normal closure";
//WS_CC_DESCRIPTION[WS_CC_GOING_AWAY           = "Going away";
//WS_CC_DESCRIPTION[WS_CC_PROTOCOL_ERROR       = "Protocol error";
//WS_CC_DESCRIPTION[WS_CC_INVALID_DATA         = "Invalid data";
//WS_CC_DESCRIPTION[WS_CC_RESERVED             = "Reserved";
//WS_CC_DESCRIPTION[WS_CC_NO_STATUS            = "No status";
//WS_CC_DESCRIPTION[WS_CC_ABNORMAL             = "Abnormal closure";
//WS_CC_DESCRIPTION[WS_CC_INVALID_MESSAGE_DATA = "Invalid message data";
//WS_CC_DESCRIPTION[WS_CC_POLICY_VIOLATION     = "Policy violation";
//WS_CC_DESCRIPTION[WS_CC_MESSAGE_TOO_LARGE    = "Message too large";
//WS_CC_DESCRIPTION[WS_CC_NO_EXTENSIONS        = "No extensions returned by server";
//WS_CC_DESCRIPTION[WS_CC_INTERNAL_ERROR       = "Internal error";
//WS_CC_DESCRIPTION[WS_CC_TLS_ERROR            = "TLS error";

const WS_CC_SERVER_SHUTDOWN      = 4000;
//const WS_CC_SERVER_PING_TIMEOUT  = 4001;

//WS_CC_DESCRIPTION[WS_CC_SERVER_SHUTDOWN      ] = "Server shutdown";
////WS_CC_DESCRIPTION[WS_CC_SERVER_PING_TIMEOUT  ] = "Server ping timeout";

const WS_CC_FORBIDDEN             = 4403;
const WS_CC_INTERNAL_SERVER_ERROR = 4500;

const WS_CC_CLIENT_RECONNECT      = 4900;
const WS_CC_CLIENT_PING_TIMEOUT   = 4901;
const WS_CC_CLIENT_OFFLINE        = 4904;
const WS_CC_CLIENT_LOGOUT         = 4905;



const socket = {
   listeners:     {},      // Object that stores event listeners, indexed by event name.
   ws:            null,    // Reference to the current WebSocket object, if any.
   ws_sockets:    {},      // Object that stores all open WebSocket objects.
   new_socket_id: 0,       // Socket ID.
   connected:     false,   // Flag indicating the socket is connected and open.
   net_timer:     null,    // Reference to any running timer used to ping or reconnect.
   xhr_reconnect: null,    // Reference to any pending request.
};



$window.on("online", function()
{
   applog("window.online", "ONLINE", LOG_FLAGS.WS);

   if (user_logged_in()) {
      socket.reconnect();
   }
});



$window.on("offline", function()
{
   applog("window.offline", "OFFLINE", LOG_FLAGS.WS);

   if (socket.connected) {
      socket.close(WS_CC_CLIENT_OFFLINE, "Offline");
   }
});



socket.on = function(event, listener)
{
   if (typeof event    !== "string"  ) { warn("socket.on: Invalid event",              LOG_FLAGS.WS); return; }
   if (       event    === ""        ) { warn("socket.on: Empty event",                LOG_FLAGS.WS); return; }
   if (typeof listener !== "function") { warn("socket.on: Listener is not a function", LOG_FLAGS.WS); return; }

   socket.listeners[event] = listener;
};



// trigger_event calls the listener for the specified event.
//
//    event   String   Event being triggered.
//    args    Array    Arguments to pass to the listener.  If args is not an array, the arguments array is passed instead.

function trigger_event(event, args)
{
//   applog("trigger_event", event, LOG_FLAGS.WS);

   if ((typeof event !== "string") || (event === "")) { warn("trigger_event", "No event", LOG_FLAGS.WS); return; }

   if (socket.listeners[event]) {
      // Call the listener with no arguments:
      if (typeof args === "undefined") {
         socket.listeners[event]();
      }
      else {
         // Call the listener with the args array:
         if (Array.isArray(args)) {
            socket.listeners[event].apply(null, args);
         }
         // Call the listener with the arguments array:
         else {
            //const args_array = [...arguments];
            //const args_array = Array.from(arguments);
            const args_array = Array.prototype.slice.call(arguments);
            args_array.shift();
            socket.listeners[event].apply(null, args_array);
         }
      }
   }
};



function net_timer_start(action, interval)
{
   if (socket.net_timer !== null) {
      clearTimeout(socket.net_timer);
   }
   socket.net_timer = setInterval(action, interval);
}



function net_timer_stop()
{
   if (socket.net_timer !== null) {
      clearTimeout(socket.net_timer);
      socket.net_timer = null;
   }
   if (socket.xhr_reconnect !== null) {
      socket.xhr_reconnect.abort();
   }
}



function set_online(connected)
{
   if (socket.connected !== connected) {
      applog("socket.online", connected, LOG_FLAGS.WS);
      socket.connected = connected;
      trigger_event("online", connected);
   }
}



// socket.connect creates and opens a new WebSocket connection.
//    This is generally used when it is nearly certain the connection can be made,
//    i.e. after logging in or doing a HEAD check.
//    socket.reconnect should be used otherwise.

socket.connect = function()
{
   if (socket.ws) { warn("socket.connect", "Already connected", LOG_FLAGS.WS); return; }

   // Create and open a new WebSocket connection:
   socket.ws = new WebSocket(document.location.href.replace("https://", "wss://"));
   info("socket.connect", socket.ws.url, LOG_FLAGS.WS);

   socket.ws.id         = socket.new_socket_id++;
   socket.ws.new_msg_id = 0;
   socket.ws.callbacks  = {};

   socket.ws_sockets[socket.ws.id] = socket.ws;



   $(socket.ws).on("open", function(event)
   {
      event = event.originalEvent;

      applog("socket.ws.open", "sid " + this.id, LOG_FLAGS.WS);

      if (socket.ws.id !== this.id) { warn("socket.ws.open", "sid " + this.id + ": BUG: Socket opening is not socket.ws", LOG_FLAGS.WS); return; }

      // Set the connected flag and fire the event:
      set_online(true);
      trigger_event("connected", event);
      // Start the ping timer:
      net_timer_start(socket.ping, WS_INTERVAL_PING);
   });



   $(socket.ws).on("close", function(event)
   {
      event = event.originalEvent;

      applog("socket.ws.close", "sid " + this.id + ": " + event.code + ", \"" + event.reason + "\", " + (event.wasClean ? "clean" : "not clean"), LOG_FLAGS.WS);

      if (socket.ws && (socket.ws.id === this.id)) {
         set_online(false);
         net_timer_stop();
         socket.ws = null;
         delete socket.ws_sockets[this.id];
         // Reconnect if appropriate and online (I presume close could happen after going offline):
         //    Not reconnecting while hidden prevents Android 7 (at least) reconnect loops with the screen locked.  Android 8 doesn't seem to do this.
         //    Presumably, it wants to go to sleep after some time (varies, but usually one minute while plugged in) and disconnects.
         //    The immediate reconnect succeeds, only to disconnect again in another minute, resulting in a reconnect loop that fills the log with crap.
         //    Reconnecting only once visible again prevents this but there is a potentially long delay while reconnecting and loading new messages.
         //    Also, currently all devices do it, including ones that don't need this.
         //    It could be possible to limit this only to certain devices, but meh.  It's easier to just leave it like this.
         //    If reconnect attempts are running while the page is visible they are not stopped if it is hidden though.
         if (navigator.onLine && !document.hidden) {
            switch (event.code) {

               // Don't reconnect if a login failed:
               //    This prevents constant attempts to log in that always fail.
               //    Can't clear the HttpOnly session cookie from here though.
               case WS_CC_FORBIDDEN:
                  ui_page_cover_remove();
               // Don't reconnect if the network connection was lost:
               case WS_CC_CLIENT_OFFLINE:
               // Don't reconnect if the user logged out:
               case WS_CC_CLIENT_LOGOUT:
                  break;

               // Pause before reconnecting if the server shut down:
               //    This prevents pointless reconnect attempts while the server waits for a grace period before actually exiting.
               case WS_CC_SERVER_SHUTDOWN:
                  setTimeout(socket.reconnect, SHUTDOWN_GRACE_PERIOD);
                  break;

               // Otherwise reconnect immediately:
               default:
                  socket.reconnect();
                  break;
            }
         }
         trigger_event("closed", event);
      }
      else {
         delete socket.ws_sockets[this.id];
      }
   });



   $(socket.ws).on("message", function(event)
   {
      event = event.originalEvent;

//      applog("socket.ws.message", "sid " + this.id + ": " + event.data + ", " + event.origin + ", " + event.lastEventId + ", " + event.source + ", " + event.ports, LOG_FLAGS.WS);

      if (socket.ws.id !== this.id) return;
//      if (socket.ws.id !== this.id) { warn("socket.ws.message", "sid " + this.id + ": BUG: Socket message is not socket.ws: " + event.data, LOG_FLAGS.WS); return; }
      if (!event.data) { warn("socket.ws.onmessage", "sid " + this.id + ": No message", LOG_FLAGS.WS); return; }

      var msg_ws = event.data;

      // Handle simple messages first:
      switch (msg_ws) {

         // Immediately reply to a ping from the server:
         case "PING":
//            applog("socket.ws.message", "sid " + this.id + ": PING", LOG_FLAGS.WS);

            try {
               socket.ws.send("PONG");
            }
            catch (err) {
               warn("socket.ws.message", "sid " + this.id + ": readyState " + socket.ws.readyState + ", ws.send PONG error: " + JSON.stringify(err), LOG_FLAGS.WS);
            }
            return;

         // Server replied to a ping:
         //    Nothing to do but stop it from being handled below and let the ping timer run.
         case "PONG":
//            applog("socket.ws.message", "sid " + this.id + ": PONG", LOG_FLAGS.WS);
            return;
      }

      // Handle app messages:
      //    BB10 browser doesn't like spread ...[blah, blarg] or Array.from(arguments).
      try {
         msg_ws = JSON.parse(msg_ws);
      }
      catch (err) {
         warn("socket.ws.message", "Invalid app message: " + msg_ws, LOG_FLAGS.WS);
         return;
      }
//      applog("socket.ws.message", "sid " + this.id + ": " + msg_ws.type + ", " + msg_ws.msg, LOG_FLAGS.WS);

      switch (msg_ws.type) {

         // Unsolicited message from the server:
         case "MSG":
//            applog("socket.ws.message", "sid " + this.id + ": MSG: id " + msg_ws.id + ", " + msg_ws.msg + ", " + JSON.stringify(msg_ws.args), LOG_FLAGS.WS);

            const callback = function() // ...arguments
            {
//               applog("callback", "MSG: " + msg_ws.id + ", " + msg_ws.msg, LOG_FLAGS.WS);
               try {
                  socket.ws.send(JSON.stringify({
                     type: "ACK",
                     id:   msg_ws.id,
                     //args: [...arguments],    // Convert the arguments array to a real array
                     //args: Array.from(arguments),
                     args: Array.prototype.slice.call(arguments),
                  }));
               }
               catch (err) {
                  warn("socket.ws.message", "sid " + this.id + ": ws.send ACK error: " + JSON.stringify(err), LOG_FLAGS.WS);
               }
            };
            msg_ws.args.push(callback);
            trigger_event(msg_ws.msg, msg_ws.args);
            socket.ws.new_msg_id++;
            break;

         // Acknowledgement of a previous message to the server:
         case "ACK":
//            applog("socket.ws.message", "sid " + this.id + ": ACK: " + msg_ws.id, LOG_FLAGS.WS);

            if (socket.ws.callbacks[msg_ws.id]) {
               clearTimeout(socket.ws.callbacks[msg_ws.id].timeout);
               //socket.ws.callbacks[msg_ws.id](...msg_ws.args);
               socket.ws.callbacks[msg_ws.id].callback.apply(null, msg_ws.args);
               delete socket.ws.callbacks[msg_ws.id];
            }
            break;
      }
   });



   // Mostly useless:

   $(socket.ws).on("error", function(event)
   {
      event = event.originalEvent;

      applog("socket.ws.error", "sid " + this.id, LOG_FLAGS.WS);
//      dir(event);

      trigger_event("error", event);
   });



};



// socket.emit sends a WebSocket message with optional arguments.
//    If the last argument is a function, it is used as a callback when a reply is received.
//
//    message   String   The message to send.

socket.emit = function(message) // ...arguments
{
//   applog("socket.emit", "sid " + socket.ws.id + ": readyState " + socket.ws.readyState, LOG_FLAGS.WS);

   if (!message)                                { warn("socket.emit", "Invalid message",     LOG_FLAGS.WS); return; }
   if (!socket.ws)                              { warn("socket.emit", "No socket.ws object", LOG_FLAGS.WS); return; }
   if (socket.ws.readyState !== WebSocket.OPEN) { warn("socket.emit", "Not connected",       LOG_FLAGS.WS); return; }

   const args = [];
   var args_length = arguments.length;

   // Save the last argument if it's a callback function:
   if (typeof arguments[args_length - 1] === "function") {
      // Don't send it as one of the arguments though:
      args_length--;
      socket.ws.callbacks[socket.ws.new_msg_id] = {
         callback: arguments[args_length],
         // Delete the callback if the message acknowledgement is never called or times out,
         //    or the socket closed and the callback object is gone:
         timeout:  setTimeout(function(ws_msg_id)
                   {
                      if (!socket.ws) return;
                      delete socket.ws.callbacks[ws_msg_id];
                   }, WS_MSG_ACK_TIMEOUT, socket.ws.new_msg_id),
      };
   }
   // Prepare an array of all the arguments
   //    except the first one (msg) and possibly the last one (callback):
   //    This is probably faster than popping and shifting.
   for (var i = 1; i < args_length; i++) {
      args.push(arguments[i]);
   }
   const msg_ws = JSON.stringify({
      type: "MSG",
      id:   socket.ws.new_msg_id,
      msg:  message,
      args: args,
   });
//   applog("socket.emit", "sid " + socket.ws.id + ": readyState " + socket.ws.readyState + ", " + msg_ws, LOG_FLAGS.WS);
   try {
      socket.ws.send(msg_ws);
   }
   catch (err) {
      warn("socket.emit", "sid " + socket.ws.id + ": ws.send error: " + JSON.stringify(err), LOG_FLAGS.WS);
   }
   socket.ws.new_msg_id++;
};



// socket.ping simply pings the server to keep the connection alive.
//    It is used with the net timer and runs indefinitely until stopped.

socket.ping = function()
{
//   applog("socket.ping", "sid " + socket.ws.id + ": PING", LOG_FLAGS.WS);

   try {
      socket.ws.send("PING");
   }
   catch (err) {
      warn("socket.ping", "sid " + socket.ws.id + ": ws.send error: " + JSON.stringify(err), LOG_FLAGS.WS);
   }
};



// socket.reconnect repeatedly tests the server and opens a new WebSocket connection when successful.
//    HEAD requests are used and will continue indefinitely until there is success or the net timer is stopped.
//    The request times out after WS_TIMEOUT_RECONNECT milliseconds, and retries after WS_INTERVAL_RECONNECT on errors other than abort.

var last_net_log  = "";    // Used to prevent log flooding from errors.

socket.reconnect = function()
{
   // Stop the net timer and abort any previous request:
   //    This allows an immediate reconnect to override a pending one.
   net_timer_stop();
   // Make a new request:
   socket.xhr_reconnect = $.ajax({
      // Random parameter in case of caching:
      //    Math.random returns 0 >= value < 1.
      url:     document.location.href + "?fuc=" + ("00000000000" + Math.floor(Math.random() * 1000000000000)).slice(-12),
      method:  "head",
      timeout: WS_TIMEOUT_RECONNECT,
      //cache:   false, // Adds random _ parameter, but I like mine better.

      success: function(data, status, xhr)
      {
         last_net_log = "";
         socket.xhr_reconnect = null;
         applog("socket.reconnect", "HEAD: success: " + status + ": " + xhr.status + " " + xhr.statusText, LOG_FLAGS.WS);
         socket.connect();
      },

      error:   function(xhr, status, error)
      {
         const log_entry = "HEAD: error: " + status + ": " + xhr.status + " " + xhr.statusText;
         if (last_net_log !== log_entry) {
            last_net_log = log_entry;
            applog("socket.reconnect", log_entry, LOG_FLAGS.WS);
         }
         socket.xhr_reconnect = null;
         if (xhr.status !== "abort") {
            socket.net_timer = setTimeout(socket.reconnect, WS_INTERVAL_RECONNECT);
         }
      },
   });
};



// socket.close closes the socket connection.
//    Reconnect attempts are started in socket.ws.close if necessary, depending on the code.

socket.close = function(code, reason)
{
   if (typeof code   !== "number") code   = 1001;  // Going away
   if (typeof reason !== "string") reason = "";

   applog("socket.close", "sid " + socket.ws.id + ": " + code + ", \"" + reason + "\"", LOG_FLAGS.WS);

   if (!socket.ws) { warn("socket.close", "sid " + socket.ws.id + ": No socket.ws object", LOG_FLAGS.WS); return; }

   try {
      socket.ws.close(code, reason);
   }
   catch (err) {
      warn("socket.close", "sid " + socket.ws.id + ": ws.close error: " + JSON.stringify(err), LOG_FLAGS.WS);
   }
   trigger_event("closing", code, reason);
};



