


"use strict";



const cookie       = require("cookie");
const cookieparser = require("cookie-parser");

const error        = require("./error");



module.exports = auth;
//module.exports.verify_client     = verify_client;
module.exports.get_session_token = get_session_token;
module.exports.session           = session;
//module.exports.session_socket    = session_socket;
module.exports.admin             = admin;



var app = null;



function auth(app_ref)
{
   app = app_ref;
   return module.exports;
}



////////////////////////////////////
/////  AUTHORIZATION FUNCTIONS /////
////////////////////////////////////



/*
// verify_client authorizes the client via session token cookie
//    It's called by ws early in the game, on the initial HTTP GET request for a websocket connection.

function verify_client(info, callback)
{
//   applog("auth.verify_client", info.origin + info.req.url);
   applog("auth.verify_client", (info.req.method + " " + info.req.url + "                ").substring(0, REQ_PADDING) + info.req.headers["user-agent"]);
//dir(info.req);
//dir(info.req.headers);
//log(info.req.headers.cookie);

//   error.handler("Token not found", "auth.verify_client", error.msg.login);
//   callback(false, 403, error.msg.login, null);
//   return;

   var session_token = get_session_token(info.req);

   if (!session_token) { error.handler("Missing session token", "auth.verify_client"); callback(false, 403, error.msg.login, null); return true; }

   // Look up the token:
   app.db.query("SELECT NULL FROM tokens WHERE token = ?",
                [ session_token ],
   function(err, token_rows)
   {
      if (error.handler(err,                           "auth.verify_client", error.msg.internal))                            { callback(false, 500, error.msg.internal, null); return true; }
      if (token_rows.info.numRows == 0) {
          error.handler("Token not found",             "auth.verify_client", error.msg.login   ); delete_session_cookie(res);  callback(false, 403, error.msg.login,    null); return true; }
      if (token_rows.info.numRows  > 1) {
          error.handler("BUG: Duplicate tokens found", "auth.verify_client", error.msg.internal); delete_token(session_token); callback(false, 500, error.msg.internal, null); return true; }
//      if (socket.request.headers["user-agent"] != token_rows[0].ua_prev) {
//          error.handler("User-Agent mismatch",         "auth.verify_client", error.msg.login   ); delete_token(session_token); callback(false, 403, error.msg.login, null); return true; }

      callback(true, 200, "You're the best!", null);
   });
}
*/



// get_session_token retrieves the session token from a signed cookie in an HTTP request.
//    It checks for previously parsed signed cookies and if not found, will manually parse the raw cookie header.
//
//    req   Object   HTTP request object.
//
// Returns the session token as a string.

function get_session_token(req)
{
//   return req.sessionID;

   if (!req)                                                { applog("get_session_token", "No req"                 ); return null; }
   if (!req.headers)                                        { applog("get_session_token", "No headers"             ); return null; }
   if (!req.headers.cookie)                                 { applog("get_session_token", "No cookies"             ); return null; }

   // Check for and return the session token:
   if (req.signedCookies) {
      if (!req.signedCookies[app.cfg.srv.session_cookie_name]) { applog("get_session_token", "No session_token cookie"); return null; }
      return req.signedCookies[app.cfg.srv.session_cookie_name];
   }
   // Manually parse cookies if cookie parser wasn't automatically run:
   else {
      req.cookies = cookie.parse(req.headers.cookie);
      if (!req.cookies[app.cfg.srv.session_cookie_name])       { applog("get_session_token", "No session_token cookie"); return null; }
      return cookieparser.signedCookie(req.cookies[app.cfg.srv.session_cookie_name], app.cfg.srv.cookie_secret);
   }
}



// auth.session validates the session token given in an HTTP request via cookies.
//    Any failures are handled here and the callback is not called.
//
//    req        Object     HTTP request object.
//    res        Object     HTTP response object.
//    callback   Function   Called only on success.

function session(req, res, callback)
{
//   applog("auth.session", (req.method + " " + req.url + "                ").substring(0, REQ_PADDING) + req.headers["user-agent"]);
//   applog("auth.session", "Cookie: " + req.headers.cookie);

   var session_token = this.get_session_token(req);

   if (!session_token) { error.handler("No session token", "auth.session"); res.status(403).send(error.msg.login).end(); return true; }

   // Look up the token:
//   app.db.query("SELECT user_id, current_cnv, description AS ua_prev FROM tokens WHERE token = ?",
   app.db.query("SELECT user_id, current_cnv FROM tokens WHERE token = ?",
                [ session_token ],
   function(err, token_rows)
   {
      if (error.handler(err,                           "auth.session", error.msg.internal))                            { res.status(500).send(error.msg.internal).end(); return true; }
      if (token_rows.info.numRows == 0) {
          error.handler("Token not found",             "auth.session", error.msg.login   ); delete_session_cookie(res);  res.status(403).send(error.msg.login   ).end(); return true; }
      if (token_rows.info.numRows  > 1) {
          error.handler("BUG: Duplicate tokens found", "auth.session", error.msg.internal); delete_token(session_token); res.status(500).send(error.msg.internal).end(); return true; }
//      if (req.headers["user-agent"] != token_rows[0].ua_prev) {
//          error.handler("User-Agent mismatch",         "auth.session", error.msg.login   ); delete_token(session_token); res.status(403).send(error.msg.login   ).end(); return true; }

//      token_rows[0].user_id     = parseInt(token_rows[0].user_id    );
//      token_rows[0].current_cnv = parseInt(token_rows[0].current_cnv);
//      const user = app.users[token_rows[0].user_id];
//      callback(token_rows[0].user_id, (user ? user.current_cnv : null));
      callback(parseInt(token_rows[0].user_id), parseInt(token_rows[0].current_cnv));
   });
}



/*
// auth.session_socket validates the session token and optionally the socket ID given in an HTTP request via cookies.
//    Any failures are handled here and the callback is not called.
//
//    req           Object     HTTP request object.
//    res           Object     HTTP response object.
//    auth_socket   Boolean    Set to true to validate the socket ID in the socket_id cookie, false to ignore it.
//    callback      Function   Called only on success.

function session_socket(req, res, auth_socket, callback)
{
   var socket = null;

   // Verify the socket ID first since it's faster and isn't a database query:
   if (auth_socket) {
      if (!req.cookies.socket_id) { error.handler("No socket",                               "auth.session_socket"); res.status(403).send(error.msg.unauthorized).end(); return true; }
      socket = app.io.sockets.connected[req.cookies.socket_id];
      if (!socket)                { error.handler("Unknown socket " + req.cookies.socket_id, "auth.session_socket"); res.status(403).send(error.msg.unauthorized).end(); return true; }
   }

//   if (req.session.user_id) {
//      callback(req.session.user_id, (socket ? socket.cnv_id : null));
//   }

   var session_token = this.get_session_token(req);

   if (!session_token) { error.handler("No session token", "auth.session_socket"); res.status(403).send(error.msg.login).end(); return true; }

   // Look up the token:
//   app.db.query("SELECT user_id, description AS ua_prev FROM tokens WHERE token = ?",
   app.db.query("SELECT user_id FROM tokens WHERE token = ?",
                [ session_token ],
   function(err, token_rows)
   {
      if (error.handler(err,                           "auth.session_socket", error.msg.internal))                            { res.status(500).send(error.msg.internal).end(); return true; }
      if (token_rows.info.numRows == 0) {
          error.handler("Token not found",             "auth.session_socket", error.msg.login   ); delete_session_cookie(res);  res.status(403).send(error.msg.login   ).end(); return true; }
      if (token_rows.info.numRows  > 1) {
          error.handler("BUG: Duplicate tokens found", "auth.session_socket", error.msg.internal); delete_token(session_token); res.status(500).send(error.msg.internal).end(); return true; }
//      if (socket.request.headers["user-agent"] != token_rows[0].ua_prev) {
//          error.handler("User-Agent mismatch",         "auth.session_socket", error.msg.login   ); delete_token(session_token); res.status(403).send(error.msg.login   ).end(); return true; }
      if (socket) {
         if (socket.user.id != token_rows[0].user_id) {
             error.handler("BUG: user_id discrepancy",    "auth.session_socket", error.msg.internal); delete_token(session_token); res.status(500).send(error.msg.internal).end(); return true; }
      }

      callback(token_rows[0].user_id, (socket ? socket.cnv_id : null));
   });
}
*/



function delete_session_cookie(res)
{
   res.cookie(app.cfg.srv.session_cookie_name, "", {
      expires: new Date(0),
//      path:    "/gc",
      path:    "/",
   });
}



function admin(user)
{
   return (user ? user.id === 1 : false);
}



