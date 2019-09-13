


"use strict";



const fs     = require("fs"     );
const path   = require("path"   );
const uuidv4 = require("uuid/v4");



//////////////////////////////
/////  UTILITY FUNCTIONS /////
//////////////////////////////



exports.merge_object_exclusive = function(obj1, obj2)
{
   var obj_dest;

   if (typeof obj1 !== "undefined") {
      obj_dest = {};
      if (typeof obj2 === "undefined") {
         obj2 = null;
      }

      (function merge(obj_dest, obj1, obj2)
      {
         for (var p in obj1) {
            if (obj1[p].constructor == Object) {
               obj_dest[p] = {};
               if ((obj2 !== null) && (typeof obj2[p] === "object")) {
                  merge(obj_dest[p], obj1[p], obj2[p]);
               }
               else {
                  merge(obj_dest[p], obj1[p], null);
               }
            }
            else if ((obj2 !== null) && (typeof obj2[p] !== "undefined")) {
               obj_dest[p] = obj2[p];
            }
            else {
               obj_dest[p] = obj1[p];
            }
         }
      })(obj_dest, obj1, obj2);
   }

   return obj_dest;
};



//   case_sensitive:   false,
//   match_whole_name: false,
//   recursive:        false,

exports.find_file = function(pathspec, filename, options, callback)
{
//   log(pathspec);

   var i        = 0;
   var filespec = "";
   var results  = [];

   if (!options.case_sensitive) {
      filename = filename.toUpperCase();
   }
   fs.readdir(pathspec, function(err, list)
   {
      if (err) return callback(err, null);

      (function next()
      {
         if (i < list.length) {
            filespec = path.resolve(pathspec, list[i++]);
//            log(filespec);
            fs.stat(filespec, function(err, stat)
            {
               if (err || !stat) return callback(err, null);
               if (stat.isDirectory()) {
                  if (options.recursive) {
                     exports.find_file(filespec, filename, options, function(err, res)
                     {
                        results = results.concat(res);
                        next();
                     });
                  }
               }
               else {
                  if (options.match_whole_name) {
                     if ( (options.case_sensitive  && (filespec               == filename)) ||
                          (!options.case_sensitive && (filespec.toUpperCase() == filename)) ) {
                        results.push(filespec);
//                        callback(null, filespec);
                     }
                  }
                  else {
                     if ( (options.case_sensitive  && (filespec.              indexOf(filename) != -1)) ||
                          (!options.case_sensitive && (filespec.toUpperCase().indexOf(filename) != -1)) ) {
//                        log(filespec);
                        results.push(filespec);
//                        callback(null, filespec);
                     }
                  }
                  next();
               }
            });
         }
         else {
            callback(null, results);
//            callback("\"" + filename + "\" not found in \"" + pathspec + "\"", null);
         }
      })();
   });
};



// find_files returns a list of all files in a directory and optionally its subdirectories.
//
//    pathspec   String     Directory to search.
//    options    Object     Any of the following options:
//
//       basepath    String    If specified, results will be relative to this path.
//       recursive   Boolean   Whether or not to recurse into subdirectories.
//       prepend     String    Text to prepend to each result.
//       append      String    Text to append to each result.
//
//    callback   Function   Callback to execute upon completion.

exports.find_files = function(pathspec, options, callback)
{
   if (typeof options.basepath !== "string") {
      options.basepath = "";
   }
   if (typeof options.prepend !== "string") {
      options.prepend = "";
   }
   if (typeof options.append !== "string") {
      options.append = "";
   }

   var i        = 0;
   var results  = [];
   var filespec = "";

   fs.readdir(pathspec, function(err, list)
   {
      if (err) return callback(err, null);

      (function next()
      {
         if (i < list.length) {
            filespec = path.resolve(pathspec, list[i++]);
//            log(filespec);
            fs.stat(filespec, function(err, stat)
            {
               if (err || !stat) return callback(err, null);
               if (options.recursive && stat.isDirectory()) {
//                  log("\n\n" + filespec);
                  find_files(filespec, true, function(err, res)
                  {
//                     dir(res);
                     results = results.concat(res);
                     next();
                  });
               }
               else {
//                  log(options.basepath ? path.relative(options.basepath, filespec) : filespec);
                  results.push(options.prepend + (options.basepath ? path.relative(options.basepath, filespec) : filespec) + options.append);
                  next();
               }
            });
         }
         else {
//            dir(results);
            callback(null, results);
         }
      })();
   });
};

/*
function find_files_sync(base_path, callback)
{
//      console.log(base_path);
   var pathspec = path.resolve(base_path);
   var results = [];
   fs.readdir(pathspec, function(err, list)
   {
      if (err) return callback(err);
      var pending = list.length;
      if (pending == 0) return callback(null, results);
      list.forEach(function(file)
      {
         file = path.resolve(pathspec, file);
         fs.stat(file, function(err, stat)
         {
            if (stat && stat.isDirectory()) {
               find_files(file, function(err, res)
               {
                  results = results.concat(res);
                  if (!--pending) callback(null, results);
               });
            }
            else {
               results.push(file);
               if (!--pending) done(null, results);
            }
         });
      });
   });
};
*/



exports.new_uuid = function()
{
   return uuidv4().replace(/-/g, "").toUpperCase();
}



