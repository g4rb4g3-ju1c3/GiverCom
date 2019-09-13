


"use strict";



const fs   = require("fs"  );
const path = require("path");



module.exports = function(app)
{



   // process.umask is called very early in app.js.



   process.on("warning", function(warning)
   {
      applog("process.warning", "*** WARNING");
      dir(warning);
   });



/*
   process.on("uncaughtException", function(err)
   {
      applog("process.uncaughtException", "*** EXCEPTION");
      dir(err);
      console.trace();
//      process.exit(666);
   });
*/



   // Terminate:
   process.on("SIGTERM", function()
   {
      applog("process.SIGTERM");
      shutdown(0);
   });

   // Interrupt (Ctrl+C):
   process.on("SIGINT", function()
   {
      applog("process.SIGINT");
      shutdown(0);
   });

   // Windows Ctrl+Break:
   process.on("SIGBREAK", function()
   {
      applog("process.SIGBREAK");
      shutdown(0);
   });

   // Windows close console window:
   process.on("SIGHUP", function()
   {
      applog("process.SIGHUP");
      shutdown(0);
   });

   function shutdown(exitcode)
   {
      // Close all sockets:
      for (var ws_socket of app.wss.clients) {
         applog("shutdown", "Closing socket: sid " + ws_socket.id + ", uid " + ws_socket.user.id + ", cnv " + ws_socket.cnv_id);
         ws_socket.close(WS_CC_SERVER_SHUTDOWN, "Server shutting down");
      }
      // Exit after a grace period to allow sockets to close cleanly:
      applog("shutdown", "Waiting for grace period...");
      setTimeout(function()
      {
         process.exit(exitcode)
      }, SHUTDOWN_GRACE_PERIOD);
   }



   process.on("exit", function(exitcode)
   {
      applog("process.exit", "Exit code: " + exitcode);

      log("");
      applog("process.exit", app.info.name + " " + app.info.version + " no longer givin'er");
      log("");
      log_close();
      syslog(app.info.name + " " + app.info.version + " process exit");
   });



   if (!process.env.NODE_ENV) { log("\nERROR: Environment variable NODE_ENV not set, can't handle it, committing suicide\n"); process.exit(1); }

   // Initialize for the environment before anything:
   app.cfg.env        = process.env.NODE_ENV;
   app.cfg.env_dev    = (app.cfg.env === "development");
   app.cfg.env_prd    = (app.cfg.env === "production");
   app.log.filename   = "";   // Just so it shows up first in the log
   app.log.to_console = app.cfg.env_dev;
   app.log.to_file    = true;
   switch (app.cfg.env) {
      case "development":
         app.log.filename   = "dev.log";
         app.cfg.filename   = "dev.conf";
         break;
      case "production":
         app.log.to_console = false;
         app.log.filename   = "prd.log";
         app.cfg.filename   = "prd.conf";
         break;
      default:
         applog("main", "ERROR: Environment variable NODE_ENV not set properly, can't handle it, committing suicide");
         process.exit(1);
   }
   log_init();
/*
const uid = require("uid-safe").sync;
for (var i = 0; i < 100; i++) {
log(uid(48));
}
*/
   // TODO: Add log flags.

   log("");
   applog("main", "Givin'er in " + app.cfg.env + " mode");
   log("");

   app.path.base = path.join(__dirname, "../..");

   // Set app config defaults:
   app.info.name                     = "Asdf Messenger";
   app.info.version                  = "0.0.0";
   app.info.author                   = "Dr. Fewa Jiop";
   app.info.copyright                = "Copy this if you want.";
   app.info.licence                  = "Unlicensed";
   app.info.description              = "Asdf asdf.";
   app.info.url                      = "http://localhost";

   app.cfg.srv = {};
   app.cfg.srv.port                  = 1337;
   app.cfg.srv.session_cookie_name   = "session_token";
   app.cfg.srv.session_cookie_path   = "/";
   app.cfg.srv.session_cookie_expiry = 7 * 24 * 60 * 60 * 1000;
   app.cfg.srv.cookie_secret         = "";
   app.cfg.srv.vapid_private_key     = "";
   app.cfg.srv.vapid_public_key      = "";

   app.cfg.db = {};
   app.cfg.db.host                   = "localhost";
   app.cfg.db.port                   = 3306;
   app.cfg.db.user                   = "";
   app.cfg.db.pw                     = "";
   app.cfg.db.name                   = "";
   app.cfg.db.end_timeout            = 5 * 60 * 1000;

   // Load whatever from package.json:
   var package_json = null;
   try {
      package_json = JSON.parse(fs.readFileSync("package.json", "utf8"));
   }
   catch {
      // Oh well.
   }
   if (package_json !== null) {
      if (package_json.version ) app.info.version = package_json.version;
      if (package_json.author  ) app.info.author  = package_json.author.name;
      if (package_json.homepage) app.info.url     = package_json.homepage;
      if (package_json.license ) app.info.license = package_json.license;
   }
   delete global.package_json;

   // Load configuration:
   var arg = "";
   var val = "";
   var i   = -1;
   fs.readFileSync(app.cfg.filename).toString().split("\n").forEach(function(line) {
      line = line.trim();
      i = line.indexOf(":");
      // Skip blank lines and lines that begin with a comment:
      if ((line !== "") && (line.substring(0, 1) !== "#") && (i !== -1)) {
         arg = line.substring(0, i).trim().toLowerCase();
         val = line.substring(i + 1).trim();
         // Remove any trailing comment:
         i = val.indexOf("#");
         if (i !== -1) {
            val = val.substring(0, i).trim();
         }
         // Set the option:
         switch (arg) {

            case "app.info.name":
               app.info.name = val;
//               process.title = val;
               break;
            case "app.info.version":
               app.info.version = val;
               break;
            case "app.info.author":
               app.info.author = val;
               break;
            case "app.info.description":
               app.info.description = val;
               break;
            case "app.info.url":
               app.info.url = val;
               break;
            case "app.info.license":
               app.info.license = val;
               break;
            case "app.info.copyright":
               app.info.copyright = val;
               break;

            case "app.cfg.srv.port":
               app.cfg.srv.port = parseInt(val);
               break;
            case "app.cfg.srv.session_cookie_path":
               app.cfg.srv.session_cookie_path = val;
               break;
            case "app.cfg.srv.session_cookie_expiry":
               app.cfg.srv.session_cookie_expiry = parseInt(val);
               break;
            case "app.cfg.srv.cookie_secret":
               app.cfg.srv.cookie_secret = val;
               break;
            case "app.cfg.srv.vapid_private_key":
               app.cfg.srv.vapid_private_key = val;
               break;
            case "app.cfg.srv.vapid_public_key":
               app.cfg.srv.vapid_public_key = val;
               break;

            case "app.cfg.db.host":
               app.cfg.db.host = val;
               break;
            case "app.cfg.db.port":
               app.cfg.db.port = parseInt(val);
               break;
            case "app.cfg.db.user":
               app.cfg.db.user = val;
               break;
            case "app.cfg.db.pw":
               app.cfg.db.pw = val;
               break;
            case "app.cfg.db.name":
               app.cfg.db.name = val;
               break;
            case "app.cfg.db.end_timeout":
               app.cfg.db.end_timeout = parseInt(val);
               break;

            default:
               applog("main", app.cfg.filename + ": Unrecognized option: " + arg + ": " + val);
               break;
         }
      }
   });

   // Log startup:
   syslog(app.info.name + " " + app.info.version + " in " + app.cfg.env + " mode ");

   applog("main", "app:     " + app.info.name + " " + app.info.version);
   applog("main", "process: " + process.title + " " + process.version + " " + process.platform);
   applog("main", process.release.sourceUrl);
   applog("main", process.release.headersUrl);
   applog("main", "PPID: " + process.ppid + "   PID: " + process.pid + "   Owner: " + process.getuid() + ":" + process.getgid());
//   dir(process.config);
//   dir(process.versions);
//   dir(process.env);
   applog("main", "__dirname:             " + __dirname);
   applog("main", "__filename:            " + __filename);
   applog("main", "require.main.filename: " + require.main.filename);
   applog("main", "process.execPath: " + process.execPath);
   applog("main", "process.execArgv: " + process.execArgv);
   process.argv.forEach(function(val, i, array) {
      applog("main", "process.argv[" + i + "]: " + val);
   });
   applog("main", "process.env.NODE_ENV: " + process.env.NODE_ENV);

   // Initialize app paths:
   applog("main", "app.path.base:         " + app.path.base);
   app.path.emoji = path.join(app.path.base, "client/assets/img/emoji");
   applog("main", "app.path.emoji:        " + app.path.emoji);
   app.path.upload     = path.join(app.path.base, "uploads");
   app.path.upload_tmp = path.join(app.path.upload, "tmp");
   app.path.upload_usr = path.join(app.path.upload, "usr");
   app.path.upload_cnv = path.join(app.path.upload, "cnv");

   // Create directories:
   //    Using the recursive option with mkdirSync causes it to not throw EEXIST errors.
   try {
      fs.mkdirSync(app.path.upload, { mode: 0o700 });
      applog("main", "app.path.upload:       Created: " + app.path.upload);
   }
   catch (err) {
      if (err.code === "EEXIST") {
         applog("main", "app.path.upload:       Exists:  " + app.path.upload);
      }
      else {
         applog("main", "app.path.upload:       Create failed: " + app.path.upload);
         dir(err);
      }
   }

   try {
      fs.mkdirSync(app.path.upload_tmp, { mode: 0o700 });
      applog("main", "app.path.upload_tmp:   Created: " + app.path.upload_tmp);
   }
   catch (err) {
      if (err.code === "EEXIST") {
         applog("main", "app.path.upload_tmp:   Exists:  " + app.path.upload_tmp);
      }
      else {
         applog("main", "app.path.upload_tmp:   Create failed: " + app.path.upload_tmp);
         dir(err);
      }
   }

   try {
      fs.mkdirSync(app.path.upload_usr, { mode: 0o700 });
      applog("main", "app.path.upload_usr:   Created: " + app.path.upload_usr);
   }
   catch (err) {
      if (err.code === "EEXIST") {
         applog("main", "app.path.upload_usr:   Exists:  " + app.path.upload_usr);
      }
      else {
         applog("main", "app.path.upload_usr:   Create failed: " + app.path.upload_usr);
         dir(err);
      }
   }

   try {
      fs.mkdirSync(app.path.upload_cnv, { mode: 0o700 });
      applog("main", "app.path.upload_cnv:   Created: " + app.path.upload_cnv);
   }
   catch (err) {
      if (err.code === "EEXIST") {
         applog("main", "app.path.upload_cnv:   Exists:  " + app.path.upload_cnv);
      }
      else {
         applog("main", "app.path.upload_cnv:   Create failed: " + app.path.upload_cnv);
         dir(err);
      }
   }

   // Log configuration:
   log_object("app.info",    app.info);
   log_object("app.log",     app.log);
   log_object("app.cfg",     app.cfg);
   log_object("app.cfg.srv", app.cfg.srv);
   log_object("app.cfg.db",  app.cfg.db);

   function log_object(prefix, object)
   {
      for (var key in object) {
         if (object.hasOwnProperty(key) && (typeof object[key] !== "object")) {
            switch (prefix + "." + key) {
               case "app.cfg.srv.cookie_secret":
               case "app.cfg.srv.vapid_private_key":
               case "app.cfg.db.pw":
                  applog("main", prefix + "." + key + ": nopenopenope");
                  break;

               default:
                  applog("main", prefix + "." + key + ": " + object[key]);
                  break;
            }
          }
      }
   }



}



