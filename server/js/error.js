


"use strict";



exports.msg = {
   internal     : "Internal error.  Tell that guy who wrote this crap to check the logs.",
   login        : "Nice try.",
   unauthorized : "Nope.",
   not_found    : "WTF?",
};

exports.handler = error_handler;



// error_handler handles errors.
//
//    error     Any      The error message or object.  Checked for truthiness (i.e. undefined, null, 0 and "" are false and indicate no error).
//    source    String   Optional: The source of the error e.g. function name, or null to use "error_handler".
//    message   String   Optional: Human readable error message.  Sent to the client if a socket is given.
//    socket    Object   Optional: A socket to emit an error message to.
//
// Returns true if there was an error, or false if not (or error was omitted).

function error_handler(error, source, message, socket)
{
   if (error) {
      if (typeof source !== "string") {
         source = "error_handler";
      }
//      console.error("*** ERROR");
      applog(source, "*** ERROR" + (message && (typeof message === "string") ? ": " + message : ""));
//      applog("",     "*** " + JSON.stringify(error));
      dir(error);
      // Send an error message to the client if a socket was specified:
      //    If message was omitted, it will be the socket object.
      if ((typeof message === "object") && (typeof message.emit === "function")) {
         message.emit("app_error", "An error occurred but the dumbass developers didn't add an error message.  You should contact them and say, \"WTF?  Stop being like Microsoft!\"");
      }
      else if ((typeof socket === "object") && (typeof socket.emit === "function")) {
         socket.emit("app_error", (typeof message === "string" ? message : JSON.stringify(message)));
      }
      return true;
   }
   else {
      return false;
   }
}



