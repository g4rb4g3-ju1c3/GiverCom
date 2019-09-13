


"use strict";



const os         = require("os"        );
const http       = require("http"      );
const express    = require("express"   );
const express_ws = require("express-ws");



module.exports = function(app)
{



   ////////////////////////////////////////////////////////////////////////////////
   // Set up the web server:
   ////////////////////////////////////////////////////////////////////////////////

   app.exp = express();
   app.srv = http.Server(app.exp);
   app.wss = express_ws(app.exp, app.srv, {
      wsOptions: {
//         verifyClient:   auth.verify_client,
         clientTracking: true,   // Sockets added to app.wss.clients set
      }
   }).getWss();
   app.exp.server_name = app.info.name;
   app.exp.set("trust proxy", "loopback");
   app.exp.set("views",       "client/views");
   app.exp.set("view engine", "html");
   app.exp.engine("html", require("ejs").renderFile);
   app.exp.set("x-powered-by", false);
//   app.exp.use(require("compression")());

if (app.cfg.env_prd) {

   applog("main", "app.exp using brotli-giver");
   app.exp.use(require("./brotli-giver")("client/assets", {
      allow_cache: false,
   }));

} // app.cfg.env_prd

   app.exp.use(function(req, res, next)
   {
      res.set("Server", app.exp.server_name);
      next();
   });

   app.exp.use(express.static("client/assets", {
      dotfiles:   "ignore",
      etag:       false,
      extensions: ["html"],
      index:      false,
      maxAge:     "1d",
      redirect:   false,
/*
      setHeaders: function(res, path, stat)
      {
//         applog("main", res + "\n" + path + "\n" + stat);
         res.set("Server", app.exp.server_name);
//         res.set("x-timestamp", Date.now());
      },
*/
   }));

   app.exp.use(require("body-parser").json());
   app.exp.use(require("cookie-parser")(app.cfg.srv.cookie_secret));
/*
   app.exp.use(require("express-session")({
      name:              "express_session_id",
      secret:            app.cfg.srv.cookie_secret,
      saveUninitialized: false,
      resave:            false,
      rolling:           true,
//      store:             new FileStore(),
//      proxy:             true,   // Leave undefined to use express "trust proxy" setting above.
      cookie: {
//         domain:   app.info.domain,
//         path:     app.cfg.srv.session_cookie_path,
         expires:  new Date(Date.now() + app.cfg.srv.session_cookie_expiry),
         httpOnly: true,
         secure:   true,
         sameSite: "strict",
      },
   }));
*/



   ////////////////////////////////////////////////////////////////////////////////
   // Setup push messages:
   ////////////////////////////////////////////////////////////////////////////////

   app.push = require("web-push");
   if (!app.cfg.srv.vapid_public_key || !app.cfg.srv.vapid_private_key) {
      applog("You must set app.cfg.srv.vapid_public_key and app.cfg.srv.vapid_private_key in the configuration file.  You can use these:");
      dir(app.push.generateVAPIDKeys());
   }
   else {
      app.push.setVapidDetails(
         app.info.url,
         app.cfg.srv.vapid_public_key,
         app.cfg.srv.vapid_private_key,
      );
   }



   app.srv.listen(app.cfg.srv.port);
   applog("main", "Listening at http://" + os.hostname().toLowerCase() + ":" + app.cfg.srv.port);

   log("");



}



