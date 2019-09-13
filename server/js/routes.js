


"use strict";



const moment     = require("moment"       );
const spawn      = require("child_process");
const fs         = require("fs"           );
const path       = require("path"         );
const bcrypt     = require("bcrypt"       );
const uid        = require("uid-safe"     ).sync;
const formidable = require("formidable"   );

                   require("./constants")();
const error      = require("./error"    );
const util       = require("./util"     );
const auth       = require("./auth"     );



module.exports = function(app)
{



/*
   /////////////////////////
   /////  HTTP SERVER  /////
   /////////////////////////



   app.srv.on("checkContinue", function(req, res)
   {
      applog("app.srv.checkContinue");
   });



   app.srv.on("checkExpectation", function(req, res)
   {
      applog("app.srv.checkExpectation");
   });



   app.srv.on("clientError", function(err, socket)
   {
      applog("app.srv.clientError");
   });



   app.srv.on("close", function()
   {
      applog("app.srv.close");
   });



   app.srv.on("connect", function(req, socket, head)
   {
      applog("app.srv.connect");
   });



   app.srv.on("connection", function(socket)
   {
//      applog("app.srv.connection");
   });



   app.srv.on("request", function(req, res)
   {
//      applog("app.srv.request");
   });



   app.srv.on("upgrade", function(req, socket, head)
   {
      applog("app.srv.upgrade");
   });
*/



   /////////////////////////
   /////  HTTP ROUTES  /////
   /////////////////////////



   app.exp.get("/info", function(req, res)
//   app.exp.post("/info", function(req, res)
   {
//dir(req.body);
      applog("app.exp.get /info", (req.method + "  " + req.url + REQ_PADDING).substring(0, REQ_PADDING_WIDTH) + "   " + (req.headers["x-forwarded-for"] + "        ").substring(0, 15) + "   " + req.headers["user-agent"]);
//      applog("app.exp.post /info", (req.method + " " + req.url + REQ_PADDING).substring(0, REQ_PADDING_WIDTH) + "   " + (req.headers["x-forwarded-for"] + "        ").substring(0, 15) + "   " + req.headers["user-agent"]);
//      applog("app.exp.post /info", JSON.stringify(req.body));

      res.status(200).end();
   });



   app.exp.get("/share", function(req, res)
   {
      applog("app.exp.get /share", (req.method + "  " + req.url + REQ_PADDING).substring(0, REQ_PADDING_WIDTH) + "   " + (req.headers["x-forwarded-for"] + "        ").substring(0, 15) + "   " + req.headers["user-agent"]);

      res.status(404).send("<br><br><br>" + req.url).end();
   });



   // Get the main page:

   app.exp.get("/", function(req, res)
   {
      applog("app.exp.get /", ((req.method + "  ").substring(0, 5) + req.url + REQ_PADDING).substring(0, REQ_PADDING_WIDTH) + "   " + (req.headers["x-forwarded-for"] + "        ").substring(0, 15) + "   " + req.headers["user-agent"]);
//logreq("app.exp.get /", req);
//dir(req.headers);
//dir(req.url);

      var user_agent = req.headers["user-agent"];

      app.info.device_type = DEVICE_TYPE_DESKTOP;
      if (user_agent) {
         user_agent = user_agent.toLowerCase();
         if (user_agent.indexOf("bb10") !== -1) {
            app.info.device_type = DEVICE_TYPE_BB10;
         }
         else if (user_agent.indexOf("android") !== -1) {
            app.info.device_type = DEVICE_TYPE_ANDROID;
         }
      }

//      applog("app.exp.get /", req.method + " " + req.url + "   Device type: " + app.info.device_type);

      res.setHeader("Link",
         "<css/normal.css>; as=style; rel=preload, " +
         (app.cfg.env_prd ? "<js/app.min.js>; as=script; rel=preload, " : "") +
         "<js/lib/jquery.min.js>; as=script; rel=preload, " +
         "<js/lib/moment.min.js>; as=script; rel=preload, " +
         "<js/lib/imagesloaded.pkgd.min.js>; as=script; rel=preload"
//         "<img/icons/Pineapple_icon-icons.com_68707-edit1.png>; as=image; rel=preload"
      );

      res.render("app", {
         APP_ENV_DEVELOPMENT: app.cfg.env_dev,
         app_info:            app.info,
         app_name:            app.info.name,
         app_version:         app.info.version,
         app_author:          app.info.author,
         app_copyright:       app.info.copyright,
         app_description:     app.info.description,
         app_device_type:     app.info.device_type,
      });
   });



/*
   // Get the dynamically generated constants JS file:

   app.exp.get("/js/app/constants.js", function(req, res)
   {
      applog("app.exp.get /js/app/constants.js", ((req.method + "  ").substring(0, 5) + req.url + REQ_PADDING).substring(0, REQ_PADDING_WIDTH) + "   " + (req.headers["x-forwarded-for"] + "        ").substring(0, 15) + "   " + req.headers["user-agent"]);
//logreq("app.exp.get /", req);
//dir(req.headers);
//dir(req.url);

      res.status(200).send("const i_am = \"\"").end();
   });
*/



   // Log in with a username and password:

   app.exp.post("/login", function(req, res)
   {
      applog("app.exp.post /login", (req.method + " " + req.url + REQ_PADDING).substring(0, REQ_PADDING_WIDTH) + "   " + (req.headers["x-forwarded-for"] + "        ").substring(0, 15) + "   " + req.headers["user-agent"]);

////      res.req.session.cookie.path = "/gc";
//      res.req.session.cookie.path = app.cfg.srv.session_cookie_path;
//dir(req.session);
//res.sendStatus(403).end();
//return;

      // Look up the username:
      app.db.query("SELECT id, password FROM users WHERE username = ?",
                   [ req.body.username ],
      function(err, user_rows)
      {
         if (                               error.handler(err,                                                    "app.exp.post /login", error.msg.internal)) { res.status(500).send(error.msg.internal).end(); return true; }
         if (user_rows.info.numRows == 0) { error.handler("Username not found: " + req.body.username,             "app.exp.post /login", error.msg.login,  );   res.status(403).send(error.msg.login   ).end(); return true; }
         if (user_rows.info.numRows  > 1) { error.handler("BUG: Duplicate usernames found: " + req.body.username, "app.exp.post /login", error.msg.internal);   res.status(500).send(error.msg.internal).end(); return true; }

         // Check the password:
         bcrypt.compare(req.body.password, user_rows[0].password, function(err, password_match)
         {
            if (                   error.handler(err,                  "app.exp.post /login", error.msg.internal)) { res.status(500).send(error.msg.internal).end(); return true; }
            if (!password_match) { error.handler("Incorrect password", "app.exp.post /login", error.msg.login,  );   res.status(403).send(error.msg.login   ).end(); return true; }

/*
            req.session.user_id = parseInt(user_rows[0].id);
            req.session.user_agent = req.headers["user-agent"];
            req.session.save();
            res.status(200).send("You're the best!").end();

            return false;
*/

            // Generate a new session token and save it in the database:
            const new_session_token = uid(48);
            app.db.query("INSERT INTO tokens(token, user_id, description) VALUES(?, ?, ?)",
                         [ new_session_token, user_rows[0].id, req.headers["user-agent"] ],
            function(err, insert_info)
            {
               if (error.handler(err, "app.exp.post /login: insert token: " + new_session_token, error.msg.internal)) { res.status(500).send(error.msg.internal).end(); return true; }

               // Report success so the client can log in with the new token:
               res.cookie(app.cfg.srv.session_cookie_name, new_session_token, {
                  signed:   true,
                  expires:  new Date(Date.now() + app.cfg.srv.session_cookie_expiry),
                  path:     app.cfg.srv.session_cookie_path,
                  httpOnly: true,
                  secure:   true,
                  sameSite: "strict",
               });
               res.status(200).send("You're the best!").end();

               return false;
            });
         });
      });
   });



   // Log in with a session token:

   app.exp.get("/login", function(req, res)
   {
      applog("app.exp.get /login", (req.method + "  " + req.url + REQ_PADDING).substring(0, REQ_PADDING_WIDTH) + "   " + (req.headers["x-forwarded-for"] + "        ").substring(0, 15) + "   " + req.headers["user-agent"]);

////      res.req.session.cookie.path = "/gc";
//      res.req.session.cookie.path = "/";
//log("req.session.user_id:    " + req.session.user_id);
//log("req.session.user_agent: " + req.session.user_agent);
//      if (req.session.user_id) {
//         res.status(200).send("You're the best!").end();
//      }
//      else {
//         res.status(403).send(error.msg.login).end();
//      }

      const session_token = auth.get_session_token(req);
      if (!session_token) { res.status(403).send("It's OK if you're not one of us though.").end(); return true; }

      // auth.session args not used and cnv_id may be null anyway if the user hasn't been added to app.users yet:
//      auth.session_socket(req, res, false, function(user_id, cnv_id)
      auth.session(req, res, function(user_id, cnv_id)
      {
         // Generate a new login token and save it in the database:
         const new_session_token = uid(48);
         // tokens.current_cnv defaults to 0:
         app.db.query("UPDATE tokens SET token = ?, description = ?, updated = CURRENT_TIMESTAMP(6) WHERE token = ?",
                      [ new_session_token, req.headers["user-agent"], session_token ],
         function(err, update_info)
         {
            error.handler(err, "app.exp.get /login: update token: ", session_token + " -> " + new_session_token);

            res.cookie(app.cfg.srv.session_cookie_name, new_session_token, {
               signed:   true,
               expires:  new Date(Date.now() + app.cfg.srv.session_cookie_expiry),
               path:     app.cfg.srv.session_cookie_path,
               httpOnly: true,
               secure:   true,
               sameSite: "strict",
            });
            res.status(200).send("You're the best!").end();
         });
      });
   });



   // Log out with a session token:

   app.exp.get("/logout", function(req, res)
   {
      applog("app.exp.get /logout", (req.method + "  " + req.url + REQ_PADDING).substring(0, REQ_PADDING_WIDTH) + "   " + (req.headers["x-forwarded-for"] + "        ").substring(0, 15) + "   " + req.headers["user-agent"]);

/*
      req.session.destroy(function(err)
      {
         if (error.handler(err, "app.exp.get /logout")) { res.status(500).send(error.msg.internal).end(); return true; }

         res.req.session.cookie.expires = new Date(0);
         res.status(200).send("See ya.").end();
      });
*/

      const session_token = auth.get_session_token(req);
      if (!session_token) { res.status(403).send(error.msg.login).end(); return true; }

//      delete_token(session_token);
      app.db.query("DELETE FROM tokens WHERE token = ?",
                   [ session_token ],
      function(err, delete_rows)
      {
         error.handler(err, "app.exp.get /logout: delete token");

         res.cookie(app.cfg.srv.session_cookie_name, "", {
            expires:  new Date(0),
            path:     app.cfg.srv.session_cookie_path,
         });
         res.status(200).send("See ya.").end();
      });
   });



   // Push stuff:



   app.exp.get("/vpk", function(req, res)
   {
      applog("app.exp.get /vpk", (req.method + "  " + req.url + REQ_PADDING).substring(0, REQ_PADDING_WIDTH) + "   " + (req.headers["x-forwarded-for"] + "        ").substring(0, 15) + "   " + req.headers["user-agent"]);

      res.send(app.cfg.srv.vapid_public_key);
   });



   // Upload files to a conversation:

   app.exp.post("/upload", function(req, res)
   {
//      applog("app.exp.post /upload", req.method + " " + req.url);
//      logreq("app.exp.post /upload", req);

//      auth.session_socket(req, res, true, function(user_id, cnv_id)
      auth.session(req, res, function(user_id, cnv_id)
      {
         applog("app.exp.post /upload: auth.session", "uid " + user_id + ", cnv " + cnv_id + ": " + req.method + " " + req.url);

         var upload_dir = "";

         // Conversation file upload:
         if (cnv_id) {
            // Make sure the conversation upload directory exists:
            upload_dir = path.join(app.path.upload_cnv, cnv_id.toString());
            fs.mkdir(upload_dir, function(err)
            {
               if (!err) {
                  applog("app.exp.post /upload", "Conversation upload directory created: " + upload_dir);
               }
               else {
                  if (err.code === "EEXIST") {
//                     applog("app.exp.post /upload", "Conversation upload directory exists: " + upload_dir);
                  }
                  else {
                     applog("app.exp.post /upload", "Conversation upload directory create failed: " + upload_dir);
                     dir(err);
                     return;
                  }
               }
            });
            form_upload(req, res, upload_dir);
         }
         // User file upload:
         else {
            // Make sure the user upload directory exists:
            upload_dir = path.join(app.path.upload_usr, user_id);
            fs.mkdir(upload_dir, function(err)
            {
               if (!err) {
                  applog("app.exp.post /upload", "User upload directory created: " + upload_dir);
               }
               else {
                  if (err.code === "EEXIST") {
//                     applog("app.exp.post /upload", "User upload directory exists: " + upload_dir);
                  }
                  else {
                     applog("app.exp.post /upload", "User upload directory create failed: " + upload_dir);
                     dir(err);
                     return;
                  }
               }
            });
            form_upload(req, res, upload_dir);
         }
      });
   });



   function form_upload(req, res, upload_dir)
   {
      var form    = new formidable.IncomingForm();
      var uploads = [];

      // Parse the form data:
      //    This will start transferring the files to a temporary directory.
      form.multiples      = true;
      form.keepExtensions = false;
      form.uploadDir      = app.path.upload_tmp;
      form.parse(req, function(err, fields, files)
      {
         if (error.handler(err, "app.exp.post /upload form_upload")) return;
      });



      // File transfer started:

      form.on("fileBegin", function(name, file)
      {
         applog("app.exp.post /upload: form.fileBegin", file.path);
      });

      // File transfer progress (causes lots of logging):

//      form.on("progress", function(bytesReceived, bytesExpected)
//      {
//         applog("app.exp.post /upload: form.progress", bytesReceived + " / " + bytesExpected);
//      });



      // File transfer complete:

      form.on("file", function(name, file)
      {
         applog("app.exp.post /upload: form.file", "\"" + file.name + "\"   " + file.size + "   " + file.type);

         uploads.push(file);
      });



      // Form processing complete:
      //    All files are moved to the destination upload directory and renamed,
      //    and the results are returned to the client for processing into a message.

      form.on("end", function()
      {
//         applog("app.exp.post /upload: form.end");

         var i               = 0;
         var media_uuid      = "";
         var media_filespec  = "";
         var mime_type       = "";
         var mime_subtype    = "";
         var results         = [];

         // Loop through the uploads:
         (function next_upload()
         {
            // Generate a UUID for the file and move/rename it:
            media_uuid = util.new_uuid();
            media_filespec = path.join(upload_dir, moment().format("YYYY-MM-DD_HH-mm-ss") + "_" +
                                                   ("000" + i).slice(-3) + "_" +
                                                   media_uuid + "__" +
                                                   uploads[i].name);
            applog("app.exp.post /upload: form.end", media_filespec);
            fs.rename(uploads[i].path, media_filespec, function(err)
            {
               // Errors are logged but ignored to process all uploads:
               if (err) {
                  error.handler("File rename failed: " + uploads[i].path + " -> " + media_filespec, "app.exp.post /upload: form.end");
                  dir(err);
               }
               else {
                  mime_type    = uploads[i].type;
                  mime_subtype = mime_type.substring(mime_type.indexOf("/") + 1);
                  mime_type    = mime_type.substring(0, mime_type.indexOf("/"));

                  // Run exiftran on images to lossless rotate according to EXIF orientation tag because browsers are stupid:
                  //    This is run synchronously so exiftool reads the right information afterwards.
                  //    -a rotates automatically by EXIF orientation tag.
                  //    -i edits the file in place (doesn't create a separate output file).
                  if (mime_type === "image") {
                     try {
                        spawn.execSync("exiftran -ai \"" + media_filespec + "\"", {
                           cwd:     upload_dir,
                           timeout: 3000,
                        });
//                        applog(err, "app.exp.post /upload: form.end", "exiftran succeeded");
                     }
                     catch (err) {
                        error.handler(err, "app.exp.post /upload: form.end", "exiftran failed: " + media_filespec);
                     }
                  }

                  var exifout_filespec = media_filespec + "__i.txt";
                  // Create a text file with EXIF information:
                  //    This is done asynchronously since it will very unlikely be needed before it's done:
                  try {
                     // Open the EXIF output file:
                     var exifout = fs.createWriteStream(exifout_filespec, {
                        flags: "w",
                        mode:  0o600,
                     });
                     // Run exiftool, omitting tags the client user shouldn't see:
                     try {
                        var exiftool = spawn.exec("exiftool --filename --directory --filepermissions \"" + media_filespec + "\"", {
                           cwd:     upload_dir,
                           timeout: 3000,
                        });
                        exiftool.stdout.pipe(exifout);
                        exiftool.stderr.pipe(exifout);

                        exiftool.on("close", function(exitcode) {
                           if (exitcode !== 0){
                              applog("app.exp.post /upload: form.end", "exiftool exit code: " + exitcode);
                           }
                           exifout.close();
                        });
                     }
                     catch (err) {
                        error.handler(err, "app.exp.post /upload: form.end", "exiftool failed: " + media_filespec);
                        exifout.close();
                     }
                  }
                  catch (err) {
                     error.handler(err, "app.exp.post /upload: form.end", "Create exif output file failed: " + exifout_filespec);
                  }

                  // Generate a thumbnail for images:
                  //    [0] after the source filename indicates the first frame only, if animated (typically GIF).
                  //    Errors are logged but ignored since if no thumbnail is generated, it will fallback to displaying the full image.
                  if (mime_type === "image") {
                     try {
                        const thumbnail_filespec = media_filespec + "__t.jpg";
                        // [0] after the filename fails on some files (was failing on som PNG files):
                        spawn.execSync("convert -strip -format jpg -quality 50 -thumbnail 500x500 \"" + media_filespec + (mime_subtype === "gif" ? "[0]" : "") + "\" \"" + thumbnail_filespec + "\"", {
                           cwd:     upload_dir,
                           timeout: 3000,
                        });
                     }
                     catch (err) {
                        error.handler(err, "app.exp.post /upload: form.end", "imagemagick failed to create thumbnail: " + media_filespec);
                     }
                  }

                  // Convert video to MP4 if necessary and generate a thumbnail:
                  //    WebM doesn't work in BB10, but then I won't be looking for them on there anyway, so whatever.
                  else if (mime_type === "video") {
                     if ((mime_subtype !== "mp4") && (mime_subtype !== "webm")) {
                        applog("app.exp.post /upload: form.end", "Converting " + mime_type + "/" + mime_subtype + " to MP4");
                        // Convert the video to H.264 MP4:
                        try {
//                           spawn.execSync("ffmpeg -i \"" + media_filespec + "\" -c h264 \"" + media_filespec + ".mp4\"", {
                           spawn.execSync("ffmpeg -i \"" + media_filespec + "\" -vcodec libx264 -crf 24 -acodec libvo_aacenc -b:a 128k -map_metadata -1 \"" + media_filespec + ".mp4\"", {
                              cwd:     upload_dir,
                              timeout: 600000,
                           });
                           // Delete the original file:
                           fs.unlinkSync(media_filespec);
                           // Update the filename:
                           media_filespec += ".mp4"
                        }
                        catch (err) {
                           error.handler(err, "app.exp.post /upload: form.end", "ffmpeg failed to convert video to MP4: " + media_filespec);
                        }
                     }
                     // Create a thumbnail for the video:
                     try {
                        spawn.execSync("ffmpeg -i \"" + media_filespec + "\" -ss 1 -vframes 1 " + media_filespec + "__t.jpg", {
                           cwd:     upload_dir,
                           timeout: 3000,
                        });
                     }
                     catch (err) {
                        error.handler(err, "app.exp.post /upload: form.end", "ffmpeg failed to create video thumbnail: " + media_filespec);
                     }
                  }

                  // Convert audio to MP3 if necessary:
                  else if ((mime_type === "audio") && (mime_subtype !== "mpeg")) {
                     // Convert the audio to MP3:
                     try {
                        spawn.execSync("ffmpeg -i \"" + media_filespec + "\" \"" + media_filespec + ".mp3\"", {
                           cwd:     upload_dir,
                           timeout: 600000,
                        });
                        // Delete the original file:
                        fs.unlinkSync(media_filespec);
                        // Update the filename:
                        media_filespec += ".mp3"
                     }
                     catch (err) {
                        error.handler(err, "app.exp.post /upload: form.end", "ffmpeg failed to convert audio to MP3: " + media_filespec);
                     }
                  }

                  // Add the file info to the results array:
                  //    .type is the MIME content type/subtype and .name is the filename without path.
                  results.push({
                     id:   media_uuid,
                     type: uploads[i].type,
                     name: uploads[i].name,
                  });
               }
               // Process the next upload or send the results to the client if done:
               i++;
               if (i < uploads.length) {
                  next_upload();
               }
               else {
                  res.json(results).end();
               }
            });
         })();
      });



      form.on("aborted", function()
      {
         applog("app.exp.post /upload: form.aborted");
      });



      form.on("error", function(err)
      {
         error.handler(err, "app.exp.post /upload: form.error");
      });
   }



   // Get a media file by ID:
   //
   // URL parameters:
   //
   //    f     Media file UUID.
   //    [t]   Type of file to retrieve:
   //             Omitted:       The media file itself.
   //             "info":        Meta data about the media file (i.e. EXIF info from exiftool).
   //             "thumb[nail]": Thumbnail image for the media file.
   //          Only the first n characters of the type are checked, so anything else is only for readability or whatever.

   app.exp.get("/media", function(req, res)
   {
//      applog("app.exp.get /media", req.method + "  " + req.url + (req.headers.range ? ": " + req.headers.range : ""));
//      logreq("app.exp.get /media", req);
//      dir(req.headers);

//      auth.session_socket(req, res, true, function(user_id, cnv_id)
      auth.session(req, res, function(user_id, cnv_id)
      {
         applog("app.exp.get /media: auth.session", "uid " + user_id + ", cnv " + cnv_id + ": " + req.method + " " + req.url + (req.headers.range ? ": " + req.headers.range : ""));

         // Find a file with the specified media ID in it:
         //    This may not be the desired file (i.e. the main file exists but the thumbnail is wanted and missing),
         //    but it will get a path and filename to work with.
         var pathspec = path.join(app.path.upload_cnv, cnv_id.toString());
         util.find_file(pathspec, req.query.f, {
            case_sensitive:   false,
            match_whole_name: false,
            recursive:        false,
         },
         function(err, results)
         {
            if (error.handler(err, "app.exp.get /media")) { res.status(404).send(error.msg.not_found).end(); return true; }
            if (!results || results.length === 0)         { res.status(404).send(error.msg.not_found).end(); return true; }

            var filespec          = results[0];
            var filespec_fallback = "";
            var filename          = "";
            var i                 = filespec.indexOf("__");
            var j                 = filespec.length - 7;

            // Remove any suffix in case that was the file that was found with the UUID:
            if (i !== -1) {
               switch (filespec.substring(j)) {
                  case "__i.txt":
                  case "__t.jpg":
                     filespec = filespec.substring(0, j);
                     break;
               }
            }
            // Default to fall back to the original file:
            filespec_fallback = filespec;
            // Now add any suffix back lol:
            if (req.query.t) {
               if (req.query.t.substring(0, 4) == "info") {
                  filespec += "__i.txt";
                  // Don't fall back to the original file for info:
                  filespec_fallback = filespec;
               }
               else if (req.query.t.substring(0, 5) == "thumb") {
                  filespec += "__t.jpg";
               }
            }
            filename = path.basename(filespec);
            filename = filename.substring(filename.indexOf("__") + 2);

            // Verify the desired file exists:
            //    Stats are also needed for streaming.
            fs.stat(filespec, function(err, stats)
            {
               if (error.handler(err, "app.exp.get /media: fs.stat")) { res.status(404).send(error.msg.not_found).end(); return true; }

               // Send the file if no range header is present:
               if (!req.headers.range) {

                  const options = {
                     acceptRanges: false,
                     headers:      {
                        "Content-Type":        "application/octet-stream",
                        "Content-Disposition": "inline; filename=\"" + filename + "\"",
                     }
                  }
                  try {
                     res.sendFile(filespec, options, function(err)
                     {
                        if (error.handler(err, "app.exp.get /media: res.sendFile", filespec)) return true;

//                        applog("app.exp.get /media: sendFile", filespec);
                     });
                  }
                  catch (err) {
                     res.status(404).send(error.msg.not_found).end();
                     error.handler(err, "app.exp.get /media: res.sendFile", filespec);
                     return true;
                  }
               }

               // Stream the file if a range header is present:
               else {

                  var positions = req.headers.range.replace(/bytes=/, "").split("-");
                  var start     = parseInt(positions[0]);
                  var end       = (positions[1] ? parseInt(positions[1]) : stats.size - 1);

//                  dir(positions);
//                  log("start: " + start + "   end: " + end + "   size: " + stats.size);
                  if (start > end) { error.handler("Invalid range header", "app.exp.get /media"); res.status(416).send(error.msg.not_found).end(); return true; }   // 416 Range Not Satisfiable

                  res.writeHead(206, { // 206 Partial Content
                     "Content-Range":       "bytes " + start + "-" + end + "/" + stats.size,
                     "Accept-Ranges":       "bytes",
                     "Content-Length":      (end - start) + 1,
//                     "Content-Type":        "video/mp4"
                     "Content-Type":        "application/octet-stream",
                     // e.g. 1999-09-11_04-20-00_666_27F9B3AAD7CB468DB184B7DF5DCAA2B6__filename.txt
                     "Content-Disposition": "inline; filename=\"" + path.basename(filespec).substring(57) + "\"",
                  });

                  try {
                     var stream = fs.createReadStream(filespec, {
                        start:     start,
                        end:       end,
                        autoClose: true,
                     });
                  }
                  catch (err) {
                     error.handler(err, "app.exp.get /media: createReadStream");
                     return true;
                  }

                  stream.on("open", function()
                  {
//                     applog("app.exp.get /media: stream.open", filespec);
                     stream.pipe(res);
                  });

//                  // Lots o' logging:
//                  stream.on("data", function(chunk)
//                  {
//                     applog("app.exp.get /media: stream.data", chunk.length + ": " + filespec);
////                     dir(chunk);
//                  });

                  stream.on("end", function()
                  {
//                     applog("app.exp.get /media: stream.end", filespec);
                  });

                  stream.on("close", function()
                  {
//                     applog("app.exp.get /media: stream.close", filespec);
                  });

                  stream.on("error", function(err)
                  {
                     error.handler(err, "app.exp.get /media: stream.error", filespec);
                     res.end;
                  });

               }

            });
         });
      });
   });



   // Get an emoji:

   app.exp.get("/emoji/*", function(req, res)
   {
//      // Lots o' logging:
//      applog("app.exp.get /emoji", req.method + "  " + req.url);
//      logreq("app.exp.get /emoji", req);

      // Send the file:
      var filespec = path.join(app.path.emoji + "/..", req.url);
      res.sendFile(filespec, function(err) {
         error.handler(err, "app.exp.get /emoji: res.sendFile", (filespec != "" ? filespec : "No filespec")); return;
      });
   });



   // Content Security Policy report from a browser:

   app.exp.post("/csp", function(req, res)
   {
      applog("app.exp.post /csp", req.method + " " + req.url);
//      logreq("app.exp.post /csp", req);

      // Log the report:
      dir(req.body);
      res.status(200).end();
   });



}



