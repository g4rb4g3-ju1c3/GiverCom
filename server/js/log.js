


"use strict";



const fs     = require("fs"    );
const moment = require("moment");

var logfile   = null;
var log_count = 1;



module.exports = function(app)
{



   global.log_init = function()
   {
      if (app.log.to_file) {
         logfile = fs.createWriteStream(app.log.filename, {
            mode:  0o600,
            flags: "a",
         });

         logfile.on("error", function(err)
         {
            console.log("logfile error: " + err);
         });
      }
   }

   global.log_close = function()
   {
      if (typeof logfile == "number") {
         fs.closeSync(logfile);
         logfile = null;
      }
   }

   global.tp_init = function()
   {
      log_count = 1;
   }

   global.tp = function(text)
   {
      if (app.log.to_console) {
         console.log("tp " + log_count++ + (text ? ": " + text : ""));
      }
      if (app.log.to_file) {
         logfile.write("tp " + log_count++ + (text ? ": " + text : "") + "\n");
      }
   }

   global.log = function(text)
   {
      if (app.log.to_console) {
         console.log(text);
      }
      if (app.log.to_file) {
         logfile.write(text + "\n");
      }
   }

   global.syslog = function(text)
   {
      if (app.cfg.env_prd) {
         console.log(text);
      }
   }

   global.tlog = function(text)
   {
      text = moment().format(TIMESTAMP_FORMAT) + "   " + text;
      if (app.log.to_console) {
         console.log(text);
      }
      if (app.log.to_file) {
         logfile.write(text + "\n");
      }
   }

   global.applog = function(origin, message)
   {
      if (typeof origin != "string") {
         origin = "";
      }
      if (!message) {
         message = "";
      }
      else if (typeof message != "string") {
         message = "" + message;
      }
      message = moment().format(TIMESTAMP_FORMAT) + "   " +
                (origin + "                                        ").substring(0, 40) +
                message.replace(/\n/g, "\n                                                            ")
      if (app.log.to_console) {
         console.log(message);
      }
      if (app.log.to_file) {
         logfile.write(message + "\n");
      }
   }

   global.dir = function(object)
   {
      if (app.log.to_console) {
         console.dir(object);
      }
      if (app.log.to_file) {
         logfile.write(JSON.stringify(object, null, 3) + "\n");
      }
   }

   global.logreq = function(origin, req)
   {
      applog(origin,
         "hostname:    " + req.hostname                + "\n" +
         "ip:          " + req.ip                      + "\n" +
//         "ips:         " + req.ips                     + "\n" +
         "secure:      " + req.secure                  + "\n" +
         "protocol:    " + req.protocol                + "\n" +
         "method:      " + req.method                  + "\n" +
         "xhr:         " + req.xhr                     + "\n" +
         "baseUrl:     " + req.baseUrl                 + "\n" +
//         "originalUrl: " + req.originalUrl             + "\n" +
         "path:        " + req.path                    + "\n" +
         "route:       " + JSON.stringify(req.route)   + "\n" +
         "params:      " + JSON.stringify(req.params)  + "\n" +
         "query:       " + JSON.stringify(req.query)   + "\n" +
         "body:        " + JSON.stringify(req.body)    + "\n" +
         "cookies:     " + JSON.stringify(req.cookies) + "\n" +
         "fresh:       " + req.fresh                   + "\n" +
         "stale:       " + req.stale
      );
   }



}



