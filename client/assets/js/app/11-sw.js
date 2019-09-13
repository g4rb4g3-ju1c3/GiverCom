


force_subscription = false;



// Register the service worker:
if (app.support.serviceworker && app.support.pushmanager) {

   applog("navigator.sw.register", (APP_ENV_DEVELOPMENT ? "sw.js" : "sw.min.js"), LOG_FLAGS.SW);

   navigator.serviceWorker.register((APP_ENV_DEVELOPMENT ? "sw.js" : "sw.min.js"), { scope: "./" })
   .then(function(registration)
   {
      applog("navigator.sw.register", "Scope: " + registration.scope, LOG_FLAGS.SW);
      if (registration.installing) {
         applog("navigator.sw.register", "installing", LOG_FLAGS.SW);
      }
      else if (registration.waiting) {
         applog("navigator.sw.register", "installed", LOG_FLAGS.SW);
      }
      else if (registration.active) {
         applog("navigator.sw.register", "active", LOG_FLAGS.SW);
      }

      // Get current or register push subscription with the server:
      registration.pushManager.getSubscription()
      .then(function(subscription)
      {
         // Update with the current subscription:
         if (!force_subscription && subscription) {
            app.push_sub = subscription;
         }
         // Get a new subscription:
         else {
            fetch("vpk")
            .then(function(res)
            {
               res.text()
               .then(function(data)
               {
                  // userVisibleOnly: true is required for Chrome:
                  //    https://docs.google.com/document/d/13VxFdLJbMwxHrvnpDm8RXnU41W2ZlcP0mdWWe9zXQT8/edit
                  subscription = registration.pushManager.subscribe({
                     userVisibleOnly:      true,
                     applicationServerKey: urlBase64ToUint8Array(data),
                  })
                  .then(function(subscription)
                  {
                     app.push_sub = subscription;
                  })
                  .catch(function(err)
                  {
                     warn("navigator.sw.register", "pushManager.getSubscription: subscribe failed: " + err, LOG_FLAGS.SW);
                  });
               });
            })
            .catch(function(err)
            {
               warn("navigator.sw.register", "pushManager.getSubscription: fetch failed: " + err, LOG_FLAGS.SW);
            });
         }
      })
      .catch(function(err)
      {
         warn("navigator.sw.register", "pushManager.getSubscription failed: " + err, LOG_FLAGS.SW);
      });



      // Handler for messages coming from the service worker:
      navigator.serviceWorker.addEventListener("message", function(event)
      {
         applog("navigator.sw.message", JSON.stringify(event.data), LOG_FLAGS.SW);

         switch (event.data.msg) {

//            // A notification was shown:
//            //    Showing new message indications is done when the message arrives.
//            //    This just allows a delayed notification to be cleared if new message indications have already been cleared.
//            case "msg_new_notification":
//               break;

            // Clear the new message indicator:
            case "msg_clear_new_msg_indicator":
               ui_new_msg_indicator_hide();
               break;

//            // Switch the conversation view to the one clicked:
//            case "notification_click_select_cnv":
//               break;

            // Get the suuuper important thing people feel the need to spread:
            case "share_incoming":
//               const payload = JSON.parse(event.data.payload);
               break;
         }
      });

   })
   .catch(function(err)
   {
      warn("11-sw.js", "navigator.sw.register failed: " + err, LOG_FLAGS.SW);
   });

}
else {
   warn("11-sw.js", "ServiceWorker not supported");
}



// app_update_push_sub updates the push subscription info with the server for the current login.
//    Push subscriptions are tied to the browser instance.

function app_update_push_sub()
{
   applog("app_update_push_sub", "", LOG_FLAGS.SW);
//   log("app_update_push_sub: socket.connected: " + socket.connected + ", app.push_sub: " + JSON.stringify(app.push_sub));

   if (app.support.serviceworker && socket.connected && app.push_sub) {
      socket.emit("app_update_push_sub", app.push_sub);
   }
}



// app_sw_message sends a message to the service worker.

function app_sw_message(msg)
{
   if (app.support.serviceworker && navigator.serviceWorker.controller && current_user) {
//      applog("app_sw_message", msg.msg, LOG_FLAGS.SW);
      navigator.serviceWorker.controller.postMessage(JSON.stringify(msg));
   }
}



// app_sw_update_user_settings sends the current user settings to the service worker.
//    Currently only used for the show notifications setting.

function app_sw_update_user_settings()
{
   if (current_user) {
      app_sw_message({
         msg:  "user_settings",
         user: current_user,
      });
   }
}



