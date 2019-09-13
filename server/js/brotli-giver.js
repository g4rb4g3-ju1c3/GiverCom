


"use strict";



const fs   = require("fs");
const path = require("path");



module.exports = brotli_giver;



const static_file_encodings = {};

var base_path   = "";
var allow_cache = true;



function brotli_giver(assets_path, options)
{
   base_path = assets_path;
   if (options) {
      if (typeof options.allow_cache === "boolean") {
         allow_cache = options.allow_cache;
      }
   }

   return function(req, res, next)
   {
      // Check for an accept-encoding header:
      //    No point continuing if the client won't say what encodings it can handle.
      var accepted_encodings = req.headers["accept-encoding"];
      if (!accepted_encodings) { next(); return; }
      // Get the filename extension:
      //    No point continuing if it can't be parsed.
      const i = req.url.lastIndexOf(".");
      if (i === -1) { next(); return; }
      const ext = req.url.substring(i + 1);
      switch (ext) {
         case "html":
         case "css":
         case "js":
            // Convert the accepted encodings to an array now that there is a reason to:
            accepted_encodings = accepted_encodings.trim().toLowerCase().split(/[\s,]+/);
            // Get the available encodings for the file:
            var available_encodings = static_file_encodings[req.url];
            if (!available_encodings) {
               available_encodings = get_encodings(req.url);
            }
            if (accepted_encodings.includes("br") && available_encodings.includes("br")) {
               req.url += ".br";
               res.set("Content-Encoding", "br");
               set_content_type(res, ext);
            }
            else if (accepted_encodings.includes("gzip") && available_encodings.includes("gzip")) {
               req.url += ".gz";
               res.set("Content-Encoding", "gzip");
               set_content_type(res, ext);
            }
            if (!allow_cache) {
               res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            }
            break;
      }
      next();
   }
}



function get_encodings(url)
{
   const url_path  = path.join(base_path, url);
   const encodings = [];

   try {
      fs.statSync(url_path + ".br");
      encodings.push("br");
   }
   catch (err) {
      // Don't really care what the error is so carry on.
   }

   try {
      fs.statSync(url_path + ".gz");
      encodings.push("gzip");
   }
   catch (err) {
      // Don't really care what the error is so carry on.
   }

   static_file_encodings[url] = encodings;
   return encodings;
}



function set_content_type(res, ext)
{
   switch (ext) {
      case "html":
         res.set("Content-Type", "text/html");
         break;
      case "css":
         res.set("Content-Type", "text/css");
         break;
      case "js":
         res.set("Content-Type", "application/javascript");
         break;
   }
}



