#!/usr/bin/env node



"use strict";



const app = {
   info:        {},
   // Log configuration:
   log:         {},
   // General configuration:
   cfg:         {},
   // File system paths to various locations:
   path:        {},

//   // User information cache:
//   //    Currently only used in auth.session() to get the current conversation to reduce database access.
//   users:       {}, // { <user_id>: <user_object> }

   // Push subscriptions cache:
   //    This is the main cache and is only updated at login/logout.
   //    It is indexed with a subscription hash since a single user can have multiple subscriptions for various devices.
   //    It is more efficient to search this cache for unique entries than to seach the entire conversation cache for every occurance.
   //    Clearing the subscription here will clear all references to it from the conversation cache.
   //    Those can be deleted as they are found when sending notifications.
   push_subs:   {}, // { <sub_hash>: { user: <user_object>, sub: <push_sub_object> } }
   // Conversation push subscriptions cache:
   //    This allows easy lookup of push subscriptions for a given conversation.
   cnv_subs:    {}, // { <cnv_id>: { <sub_hash>: { user: <user_object>, sub: <push_sub_object> } } }

   // Conversation sockets cache (facilitates broadcasting):
   cnv_sockets: {}, // { <cnv_id>: { <socket_id>: <socket_object> } }
   // Temporary message IDs:
//   msgs: {
//      uuid_id: {},
//      id_uuid: {},
//   },
};



// Restrict permissions to the current user only:
//    Remember umask bits are opposite of chmod.  1 disables the permission and 0 allows it.
process.umask(0o077);



// The order of these matters:
require("./constants")();
require("./log"      )(app);
require("./auth"     )(app);
require("./main"     )(app);
require("./db"       )(app);
require("./srv"      )(app);
require("./routes"   )(app);
require("./ws"       )(app);



