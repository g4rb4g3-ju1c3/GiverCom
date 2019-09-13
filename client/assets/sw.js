


self.importScripts("idb-keyval-iife.min.js");



const ENABLE_LOG = true;

const APP_URL = "https://givercom.ml";



//log("ServiceWorker: executing");



const idb_store_app_shiznits = new idbKeyval.Store("Give\'rCom", "Shiznits");



self.addEventListener("install", function(event)   // InstallEvent
{
   log("ServiceWorker.install");
});



self.addEventListener("activate", function(event)  // ExtendableEvent
{
   log("ServiceWorker.activate");
});



self.addEventListener("fetch", function(event)     // FetchEvent
{
//   log("ServiceWorker.fetch");
//   log("ServiceWorker.fetch: " + event.request.method + " " + event.request.url);

   const url = new URL(event.request.url);
//log("ServiceWorker.fetch: " + event.request.method + " " + url.origin + " " + url.pathname);

/*
   // Handle caching:
   if (event.request.method === "GET") {
   }
*/
   // Handle GET sharing from other apps:
   if ((event.request.method === "GET") && (url.pathname.indexOf("/share") !== -1)) {
      return new Response("yuo = A-OK #1 usar!!!!11<br><br>" + url.pathname);
   }
   // Handle POST sharing from other apps:
   else if ((event.request.method === "POST") && (url.pathname.slice(-6) === "/share")) {
      event.respondWith((async function() {
         const form_data  = await event.request.formData();
         const share_data = JSON.stringify({
            title: form_data.get("title"),
            text:  form_data.get("text"),
            url:   form_data.get("url"),
         });
log("ServiceWorker.fetch: " + event.request.method + " " + url.origin + " " + url.pathname + " " + share_data);
         event.waitUntil(post_client_message("share_incoming", share_data));
         return new Response("yuo = A-OK #1 usar!!!!11");
      })());
   }
});



// Handle incoming messages from the client:

self.addEventListener("message", function(event)   // ExtendableMessageEvent
{
   if (event.data) {
      const payload = JSON.parse(event.data);
      switch (payload.msg) {

         case "user_settings":
            event.waitUntil(
               idbKeyval.set("user_settings_show_notifications", payload.user.settings.messages.notifications, idb_store_app_shiznits)
               .then(function()
               {
                  log("ServiceWorker.message: user_settings: saved user_settings_show_notifications: " + payload.user.settings.messages.notifications);
                  return Promise.resolve();
               })
               .catch(function(err)
               {
                  warn("ServiceWorker.message: user_settings: idbKeyval.set(user_settings_show_notifications) error");
                  dir(err);
                  return Promise.resolve();
               })
               .then(idbKeyval.set("user_settings_show_notifications_content", payload.user.settings.messages.notifications_content, idb_store_app_shiznits))
               .then(function()
               {
                  log("ServiceWorker.message: user_settings: saved user_settings_show_notifications_content: " + payload.user.settings.messages.notifications_content);
                  return Promise.resolve();
               })
               .catch(function(err)
               {
                  warn("ServiceWorker.message: user_settings: idbKeyval.set(user_settings_show_notifications_content) error");
                  dir(err);
                  return Promise.resolve();
               })
            );
            break;

         case "clear_notifications":
            payload.timestamp = Date.now();
            log("ServiceWorker.message: clear_notifications:  " + payload.timestamp);
            event.waitUntil(
               clear_notifications(payload.tag, payload.timestamp)
            );
            break;
      }
   }
});



// Handle incoming messages from the server via the push service:

self.addEventListener("push", function(event)      // PushEvent
{
   if (!event.data) { warn("ServiceWorker.push: No event data"); return; }
   log("ServiceWorker.push: " + JSON.stringify(event.data));

   const payload = JSON.parse(event.data.text());

   // Show a notification if there is a title:
   if (payload.title != "") {

//      log("ServiceWorker.push: Notification received: " + payload.body);

      var last_clear_notification                  = 0;
      var user_settings_show_notifications         = false;
      var user_settings_show_notifications_content = false;

      // Check the time notifications were last cleared:
      //    It's possible a notification that was sent before clearing them arrives late, after clearing them.
      event.waitUntil(
         // Get settings:
         Promise.all([
            // Get the timestamp when notifications were last cleared:
            idbKeyval.get("last_clear_notification", idb_store_app_shiznits)
            .then(function(val)
            {
               last_clear_notification = val;
               //log("ServiceWorker.push: last_clear_notification: " + val);
               return Promise.resolve();
            })
            .catch(function(err)
            {
               warn("ServiceWorker.push: idbKeyval.get(last_clear_notification) error");
               dir(err);
               return Promise.resolve();
            }),

            // Get the user's show notifications setting:
            idbKeyval.get("user_settings_show_notifications", idb_store_app_shiznits)
            .then(function(val)
            {
               user_settings_show_notifications = val;
               //log("ServiceWorker.push: user_settings_show_notifications: " + val);
               return Promise.resolve();
            })
            .catch(function(err)
            {
               warn("ServiceWorker.push: idbKeyval.get(user_settings_show_notifications) error");
               dir(err);
               return Promise.resolve();
            }),

            // Get the user's show notifications content setting:
            idbKeyval.get("user_settings_show_notifications_content", idb_store_app_shiznits)
            .then(function(val)
            {
               user_settings_show_notifications_content = val;
               //log("ServiceWorker.push: user_settings_show_notifications_content: " + val);
               return Promise.resolve();
            })
            .catch(function(err)
            {
               warn("ServiceWorker.push: idbKeyval.get(user_settings_show_notifications_content) error");
               dir(err);
               return Promise.resolve();
            }),
         ])
         .then(function()
         {
            log("ServiceWorker.push: Incoming notification:   " + payload.timestamp + ": " + (payload.timestamp - last_clear_notification));

            if (!user_settings_show_notifications)
               { log("ServiceWorker.push: Not showing notification: User setting is disabled");               return Promise.resolve(); }
            if (payload.timestamp <= last_clear_notification)
               { log("ServiceWorker.push: Not showing notification: Timestamp before notifications cleared"); return Promise.resolve(); }

            return clients.matchAll({ type: "window" })
            .then(function(clientlist)
            {
//               if (!clientlist || (clientlist[0].focused && clientlist[0].visibilityState === "visible"))
//                  { log("ServiceWorker.push: Not showing notification: Client visible and focused");             return Promise.resolve(); }

               if (!user_settings_show_notifications_content) {
                  log("ServiceWorker.push: Not showing notification content: User setting is disabled");
                  payload.body = "";
               }

               return self.registration.showNotification(payload.title, payload);
            })
            .catch(function(err)
            {
               warn("ServiceWorker.push: clients.matchAll error");
               dir(err);
               return Promise.resolve();
            });
         })
      );
   }

   // If there is no title, clear notifications with the specified tag:
   else {

      log("ServiceWorker.push: clear_notifications:     " + payload.timestamp);
      event.waitUntil(
         Promise.all([
            post_client_message("msg_clear_new_msg_indicator"),
            clear_notifications(payload.tag, payload.timestamp),
         ])
      );
   }

});



// Handle clicking a notification:

self.addEventListener("notificationclick", function(event)  // NotificationEvent
{
   log("ServiceWorker.notificationclick: " + event.action);

   event.notification.close();
   event.waitUntil(
      clients.matchAll({ type: "window" })
      .then(function(clientlist)
      {
         if (clientlist) {
            return clientlist[0].focus();
         }
         else {
            return clients.openWindow(APP_URL);
         }
      })
      .catch(function(err)
      {
         warn("ServiceWorker.push: clients.matchAll error");
         dir(err);
         return Promise.resolve();
      })
      .then(function()
      {
         if (event.action) {
            return post_client_message(event.action);
         }
         else {
            return Promise.resolve();
         }
      })
   );
});



//self.addEventListener("notificationclose", function(event)
//{
//   log("ServiceWorker.notificationclose");
//});



self.addEventListener("error", function(event)
{
   warn("ServiceWorker.error");
   dir(event);
});



function post_client_message(msg, payload)
{
   if ((typeof msg     !== "string") || (msg === "")) return Promise.resolve();
   if ((typeof payload !== "string"))                 payload = null;

   return clients.matchAll({ type: "window" })
   .then(function(clientlist)
   {
      if (clientlist) {
         for (var i = 0; i < clientlist.length; i++) {
            clientlist[i].postMessage({
               msg:     msg,
               payload: payload,
            });
         }
      }
      return Promise.resolve();
   })
   .catch(function(err)
   {
      warn("post_client_message: clients.matchAll error");
      dir(err);
      return Promise.resolve();
   });
}



function clear_notifications(tag, timestamp)
{
//   log("clear_notifications: " + tag + ", " + timestamp);

   if (!tag) {
      tag = "";
   }

   // Save the last clear timestamp:
   const promise_idb_save_last_clear_notification =
      idbKeyval.set("last_clear_notification", timestamp, idb_store_app_shiznits)
      .then(function()
      {
//log("last_clear_notification saved: " + last_clear_notification);
         return Promise.resolve();
      })
      .catch(function(err)
      {
         warn("clear_notifications: idbKeyval.set error");
         dir(err);
         return Promise.resolve();
      })
   ;

   // Clear notifications:
   const options = {};
   if (tag !== "") {
      options.tag = tag;
   }
   const promise_clear_notifications =
//      self.registration.showNotification("", options)
//      .then(self.registration.getNotifications(options))
      self.registration.getNotifications(options)
      .then(function(notifications)
      {
         // There should only be one with a given tag, but loop just in case:
         for (var i in notifications) {
//dir(notifications[i]);
//dir(JSON.stringify(notifications[i]));
//log(notifications[i].timestamp);
log("clear_notifications: closing: " + notifications[i].tag);
            notifications[i].close();
         }
         return Promise.resolve();
      })
      .catch(function(err)
      {
         warn("clear_notifications: registration.getNotifications error");
         dir(err);
         return Promise.resolve();
      })
   ;

   return Promise.all([
      promise_idb_save_last_clear_notification,
      promise_clear_notifications,
   ]);
}



///////////////
//  LOGGING  //
///////////////



function log(text)
{
   if (ENABLE_LOG){
      console.log(text);
   }
}



function dir(object)
{
   if (ENABLE_LOG){
      console.dir(object);
   }
}



function info(text)
{
   if (ENABLE_LOG){
      console.info(text);
   }
}



function warn(text)
{
   if (ENABLE_LOG){
      console.warn(text);
   }
}



function error(text)
{
   if (ENABLE_LOG){
      console.error(text);
   }
}



