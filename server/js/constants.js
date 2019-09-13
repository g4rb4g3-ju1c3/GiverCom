


"use strict";



module.exports = function()
{



   // this does not point to global here with use strict.



   global.SHUTDOWN_GRACE_PERIOD = 1000;



   global.SQL_TRUE  = 1;
   global.SQL_FALSE = 0;



   global.TIMESTAMP_FORMAT = "YYYY-MM-DD HH:mm:ss.SSS";



   global.REQ_PADDING_WIDTH = 30;
   global.REQ_PADDING       = new Array(REQ_PADDING_WIDTH + 1).join(" ");
   global.UA_PADDING_WIDTH  = 30;
   global.UA_PADDING        = new Array(UA_PADDING_WIDTH + 1).join(" ");



   global.WS_STATE_CONNECTING = 0;   // The connection is not yet open.
   global.WS_STATE_OPEN       = 1;   // The connection is open and ready to communicate.
   global.WS_STATE_CLOSING    = 2;   // The connection is in the process of closing.
   global.WS_STATE_CLOSED     = 3;   // The connection is closed.

/*
RFC 6455                 The WebSocket Protocol            December 2011

7.4.1.  Defined Status Codes

   Endpoints MAY use the following pre-defined status codes when sending
   a Close frame.

   1000

      1000 indicates a normal closure, meaning that the purpose for
      which the connection was established has been fulfilled.

   1001

      1001 indicates that an endpoint is "going away", such as a server
      going down or a browser having navigated away from a page.

   1002

      1002 indicates that an endpoint is terminating the connection due
      to a protocol error.

   1003

      1003 indicates that an endpoint is terminating the connection
      because it has received a type of data it cannot accept (e.g., an
      endpoint that understands only text data MAY send this if it
      receives a binary message).

   1004

      Reserved.  The specific meaning might be defined in the future.

   1005

      1005 is a reserved value and MUST NOT be set as a status code in a
      Close control frame by an endpoint.  It is designated for use in
      applications expecting a status code to indicate that no status
      code was actually present.

   1006

      1006 is a reserved value and MUST NOT be set as a status code in a
      Close control frame by an endpoint.  It is designated for use in
      applications expecting a status code to indicate that the
      connection was closed abnormally, e.g., without sending or
      receiving a Close control frame.

   1007

      1007 indicates that an endpoint is terminating the connection
      because it has received data within a message that was not
      consistent with the type of the message (e.g., non-UTF-8 [RFC3629]
      data within a text message).

   1008

      1008 indicates that an endpoint is terminating the connection
      because it has received a message that violates its policy.  This
      is a generic status code that can be returned when there is no
      other more suitable status code (e.g., 1003 or 1009) or if there
      is a need to hide specific details about the policy.

   1009

      1009 indicates that an endpoint is terminating the connection
      because it has received a message that is too big for it to
      process.

   1010

      1010 indicates that an endpoint (client) is terminating the
      connection because it has expected the server to negotiate one or
      more extension, but the server didn't return them in the response
      message of the WebSocket handshake.  The list of extensions that
      are needed SHOULD appear in the /reason/ part of the Close frame.
      Note that this status code is not used by the server, because it
      can fail the WebSocket handshake instead.

   1011

      1011 indicates that a server is terminating the connection because
      it encountered an unexpected condition that prevented it from
      fulfilling the request.

   1015

      1015 is a reserved value and MUST NOT be set as a status code in a
      Close control frame by an endpoint.  It is designated for use in
      applications expecting a status code to indicate that the
      connection was closed due to a failure to perform a TLS handshake
      (e.g., the server certificate can't be verified).

7.4.2.  Reserved Status Code Ranges

   0-999

      Status codes in the range 0-999 are not used.

   1000-2999

      Status codes in the range 1000-2999 are reserved for definition by
      this protocol, its future revisions, and extensions specified in a
      permanent and readily available public specification.

   3000-3999

      Status codes in the range 3000-3999 are reserved for use by
      libraries, frameworks, and applications.  These status codes are
      registered directly with IANA.  The interpretation of these codes
      is undefined by this protocol.

   4000-4999

      Status codes in the range 4000-4999 are reserved for private use
      and thus can't be registered.  Such codes can be used by prior
      agreements between WebSocket applications.  The interpretation of
      these codes is undefined by this protocol.
*/

   // WebSocket close codes:

   global.WS_CC_DESCRIPTION = {};

   global.WS_CC_NORMAL               = 1000;
   global.WS_CC_GOING_AWAY           = 1001;
   global.WS_CC_PROTOCOL_ERROR       = 1002;
   global.WS_CC_INVALID_DATA         = 1003;
   global.WS_CC_RESERVED             = 1004;
   global.WS_CC_NO_STATUS            = 1005;
   global.WS_CC_ABNORMAL             = 1006;
   global.WS_CC_INVALID_MESSAGE_DATA = 1007;
   global.WS_CC_GENERIC              = 1008;
   global.WS_CC_MESSAGE_TOO_LARGE    = 1009;
   global.WS_CC_NO_EXTENSIONS        = 1010;
   global.WS_CC_INTERNAL_ERROR       = 1011;
   global.WS_CC_TLS_ERROR            = 1015;

   global.WS_CC_DESCRIPTION[ global.WS_CC_NORMAL               ] = "Normal closure";
   global.WS_CC_DESCRIPTION[ global.WS_CC_GOING_AWAY           ] = "Going away";
   global.WS_CC_DESCRIPTION[ global.WS_CC_PROTOCOL_ERROR       ] = "Protocol error";
   global.WS_CC_DESCRIPTION[ global.WS_CC_INVALID_DATA         ] = "Invalid data";
   global.WS_CC_DESCRIPTION[ global.WS_CC_RESERVED             ] = "Reserved";
   global.WS_CC_DESCRIPTION[ global.WS_CC_NO_STATUS            ] = "No status";
   global.WS_CC_DESCRIPTION[ global.WS_CC_ABNORMAL             ] = "Abnormal closure";
   global.WS_CC_DESCRIPTION[ global.WS_CC_INVALID_MESSAGE_DATA ] = "Invalid message data";
   global.WS_CC_DESCRIPTION[ global.WS_CC_POLICY_VIOLATION     ] = "Policy violation";
   global.WS_CC_DESCRIPTION[ global.WS_CC_MESSAGE_TOO_LARGE    ] = "Message too large";
   global.WS_CC_DESCRIPTION[ global.WS_CC_NO_EXTENSIONS        ] = "No extensions returned by server";
   global.WS_CC_DESCRIPTION[ global.WS_CC_INTERNAL_ERROR       ] = "Internal error";
   global.WS_CC_DESCRIPTION[ global.WS_CC_TLS_ERROR            ] = "TLS error";

   global.WS_CC_SERVER_SHUTDOWN      = 4000;
//   global.WS_CC_SERVER_PING_TIMEOUT  = 4001;

   global.WS_CC_DESCRIPTION[ global.WS_CC_SERVER_SHUTDOWN      ] = "Server shutdown";
//   global.WS_CC_DESCRIPTION[ global.WS_CC_SERVER_PING_TIMEOUT  ] = "Server ping timeout";

//   global.WS_CC_FORBIDDEN             = 4403;
//   global.WS_CC_INTERNAL_SERVER_ERROR = 4500;

//   global.WS_CC_CLIENT_RECONNECT      = 4900;
//   global.WS_CC_CLIENT_PING_TIMEOUT   = 4901;
//   global.WS_CC_CLIENT_OFFLINE        = 4904;
//   global.WS_CC_CLIENT_LOGOUT         = 4905;

//   global.WS_INTERVAL_NETMON =  1 * 1000;
//   global.WS_TIMEOUT_PING    = 10 * 1000;
   global.WS_MSG_ACK_TIMEOUT = 10 * 1000;



   global.DEVICE_TYPE_DESKTOP = "desktop";
   global.DEVICE_TYPE_ANDROID = "android";
   global.DEVICE_TYPE_BB10    = "bb10";



   global.DEFAULT_USER_SETTINGS = {
      display: {
         theme:                     "1337",
         background_wallpaper:      "",
         background_color:          "#112211",
         large_titlebar:            true,
         message_headers:           true,
         timestamp_format:          "ddd HH:mm",
         avatars:                   true,
//         right_handed:              false,
         always_show_common_emojis: false,
//         always_show_recent_emojis: false,
         single_click_emojis:       false,
         emoji_scale:               "medium",
         special_fx:                true,
      },
      messages: {
         send_on_enter:             true,
         send_button:               true,
         emoji_button:              true,
         show_others_typing:        true,
         tell_others_typing:        true,
         notifications:             true,
         notifications_content:     true,
         previews:                  true,
         new_msg_indicator:         true,
         delivery_confirmation:     true,
         read_on_mousemove:         true,
         read_on_typing:            true,
      },
      media: {
//         audio:                     true,
//         video:                     true,
//         click_to_load:             true,
         show_filename:             false,
//         show_info:                 false,
      },
   }

   global.SALT_ROUNDS = 10;

   // Message statuses:

   global.MSG_STATUS_SENDING  = "sending";
   global.MSG_STATUS_RECEIVED = "received";
   global.MSG_STATUS_UNREAD   = "unread";
   global.MSG_STATUS_READ     = "read";

   global.NOTIFICATION_TAG_MSG = "msg_notification_cnv_";  // Conversation ID is appended to this.



}



