/*global require, module */

var path = require('path'),
    fs = require('fs'),
    _ = require('underscore')._;

var fuzzyMatcher = function (directory, pattern, methodCallback) {
  var pathMatches = {},
      pathRegex, fileRegex, parts, filePart,
      makePattern, listFiles, buildResult, matchPath, matchFile;
  
  makePattern = function (part) {
    return part.split('').reduce(function (pattern, character) {
      if (pattern.length) {
        pattern += "([^/]*?)";
      }
      pattern += '(' + character + ')';
      return pattern;
    }, '');
  };
  
  listFiles = function (root, segments, callback) {
    fs.readdir(root, function (error, files) {
      _.each(files, function (filename) {
        if (filename[0] === '.') {
          return;
        }
        filename = path.join(root, filename);
        fs.stat(filename, function (error, stats) {
          if (stats.isDirectory()) {
            listFiles(filename, segments + 1, callback);
          } else {
            callback(filename, segments);
          }
        });
      });
    });
  };
  
  buildResult = function (match, segments) {
    var runs = [], insideRuns = [], lastRun = false,
        insideChars = 0, totalChars = 0, index = 0,
        runRatio, charRatio;
    match.shift();
    _.each(match, function (capture) {
      if (capture.length) {
        var inside = (index % 2 !== 0);
        capture = capture.replace('/', '');
        totalChars += capture.length;
        if (inside) {
          insideChars += capture.length;
        }
        
        if (lastRun && lastRun.inside === inside) {
          lastRun.string += capture;
        } else {
          lastRun = { string: capture, inside: inside };
          runs.push(lastRun);
          if (inside) {
            insideRuns.push(lastRun);
          }
        }
      }
      index += 1;
    });
    
    runRatio = insideRuns.length ? segments / insideRuns.length : 1;
    charRatio = totalChars > 0 ? insideChars / totalChars : 1;
    return {
      score: runRatio * charRatio,
      result: runs,
      missed: false
    };
  };
  
  matchPath = function (filename, segments, callback) {
    var match, dirname = path.dirname(filename);
    if (typeof pathMatches[dirname] !== 'undefined') {
      return pathMatches[dirname];
    }
    
    if (pathRegex) {
      match = pathRegex.exec(dirname);
      if (match) {
        pathMatches[dirname] = buildResult(match, segments);
      } else {
        pathMatches[dirname] = { score: 1, result: dirname, missed: true };
      }
    } else {
      pathMatches[dirname] = { score: 1, result: dirname, missed: false };
    }
    return pathMatches[dirname];
  };
  
  matchFile = function (filename, pathMatch) {
    var basename = path.basename(filename),
        dirname = path.dirname(filename),
        match, matchResult;
    match = fileRegex.exec(basename);
    if (match) {
      matchResult = buildResult(match, 1);
      return {
        path: filename,
        directory: dirname,
        name: basename,
        pathRuns: pathMatch.result,
        fileRuns: matchResult.result,
        score: pathMatch.score * matchResult.score
      };
    }
    return false;
  };
  
  pattern = pattern.replace(/ /g, '');
  parts = pattern.split('/');
  if (pattern.match(/\/$/)) {
    parts.push('');
  }
  
  filePart = parts.pop();
  if (parts.length) {
    pathRegex = "^(.*?)" + _.map(parts, function (part) {
      return makePattern(part);
    }).join("(.*?/.*?)") + "(.*?)$";
    pathRegex = new RegExp(pathRegex, 'i');
  }
  
  fileRegex = new RegExp("^(.*?)" + makePattern(filePart) + "(.*)$", 'i');
  
  listFiles(directory, 1, function (filename, segments) {
    var pathMatch, fileMatch;
    pathMatch = matchPath(filename, segments);
    if (!pathMatch.missed) {
      fileMatch = matchFile(filename, pathMatch);
      if (fileMatch) {
        methodCallback(fileMatch);
      }
    }
  });
};
module.exports = fuzzyMatcher;
