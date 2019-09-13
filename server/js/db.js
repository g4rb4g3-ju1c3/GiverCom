


"use strict";



const mariasql = require("mariasql");

const error = require("./error");



module.exports = function(app)
{



   ////////////////////////////////////////////////////////////////////////////////
   // The app is mostly useless without the database so connect it:
   ////////////////////////////////////////////////////////////////////////////////

   app.db = new mariasql({
      host:            app.cfg.db.host,
      port:            app.cfg.db.port,
      protocol:        "tcp",
//      connTimeout:     10,
//      pingInterval:    60,
//      compress:        false,
//      ssl:             {
//         key:                "",
//         cert:               "",
//         ca:                 "",
//         capath:             "",
//         cipher:             "",
//         rejectUnauthorized: true,
//      },
      user:            app.cfg.db.user,
      password:        app.cfg.db.pw,
      db:              app.cfg.db.name,
      multiStatements: false,
   });
//   applog("main", "MariaDB client: " + mariasql.version());

   // Add a function to close the database connection after a timeout:
   app.db.reset_end_timeout = function()
   {
      clearTimeout(app.db.end_timeout);
      app.db.end_timeout = setTimeout(function()
      {
         app.db.end();
      },
      app.cfg.db.end_timeout);
   };

   // Rename and recreate the query function as a wrapper that resets the connection timeout:
   app.db.query_orig = app.db.query;
   app.db.query = function(query, params, callback)
   {
      app.db.reset_end_timeout();
      app.db.query_orig(query, params, function(err, rows)
      {
         callback(err, rows);
      });
   };

   // When a database connection is ready, show version information once:
   app.db.version_shown = false;

   app.db.on("ready", function()
   {
      if (!app.db.version_shown) {
         applog("app.db.ready", (this.isMariaDB() ? "MariaDB!" : "not MariaDB") + "   Client: " + mariasql.version() + "   Server: " + this.serverVersion());
         app.db.version_shown = true;
      }

      // Set the database time zone to UTC:
      //    This is a per-connection setting.
      app.db.query("SET @@session.time_zone=\"+00:00\"",
      function(err, result)
      {
         error.handler(err, "app.db.ready");
      });
   });

/*
   app.db.on("end", function()
   {
      applog("app.db.end", "Connection ended");
   });

   app.db.on("close", function()
   {
      applog("app.db.close", "Connection closed");
   });
*/

   app.db.on("error", function(err)
   {
      error.handler(err, "app.db.error");
   });



}



