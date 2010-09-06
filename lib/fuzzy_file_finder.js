(function() {
  var fs, path;
  path = require('path');
  fs = require('fs');
  module.exports = function(directory, pattern, matchCallback, finalCallback) {
    var buildResult, filePart, fileRegex, listFiles, makePattern, matchFile, matchPath, parts, pathMatches, pathRegex, waitingFiles, withoutBasedir;
    pathMatches = {};
    waitingFiles = 0;
    listFiles = function(root, segments, callback) {
      waitingFiles += 1;
      return fs.readdir(root, function(error, files) {
        waitingFiles -= 1;
        return files.forEach(function(filename) {
          if (filename[0] === '.') {
            return null;
          }
          waitingFiles += 1;
          filename = path.join(root, filename);
          return fs.stat(filename, function(error, stats) {
            waitingFiles -= 1;
            return stats.isDirectory() ? listFiles(filename, segments + 1, callback) : callback(filename, segments);
          });
        });
      });
    };
    withoutBasedir = function(path) {
      return path.replace(directory + '/', '');
    };
    buildResult = function(match, segments) {
      var _a, _b, capture, charRatio, index, inside, insideChars, insideRuns, lastRun, runRatio, runs, totalChars;
      runs = [];
      insideRuns = [];
      lastRun = false;
      insideChars = 0;
      totalChars = 0;
      index = 0;
      match.shift;
      _a = match;
      for (index = 0, _b = _a.length; index < _b; index++) {
        capture = _a[index];
        if (capture.length) {
          inside = index % 2 !== 0;
          capture = capture.replace('/', '');
          totalChars += capture.length;
          if (inside) {
            insideChars += capture.length;
          }
          if (lastRun && lastRun.inside === inside) {
            lastRun.string += capture;
          } else {
            lastRun = {
              string: capture,
              inside: inside
            };
            runs.push(lastRun);
            if (inside) {
              insideRuns.push(lastRun);
            }
          }
        }
      }
      charRatio = totalChars > 0 ? insideChars / totalChars : 1;
      runRatio = insideRuns.length > 0 ? segments / insideRuns.length : 1;
      return {
        score: runRatio * charRatio,
        result: runs,
        missed: false
      };
    };
    matchPath = function(filename, segments) {
      var _a, dirname, match;
      dirname = path.dirname(filename);
      if (typeof (_a = pathMatches[dirname]) !== "undefined" && _a !== null) {
        return pathMatches[dirname];
      }
      if (typeof pathRegex !== "undefined" && pathRegex !== null) {
        match = pathRegex.exec(withoutBasedir(filename));
        return match ? (pathMatches[dirname] = buildResult(match, segments)) : (pathMatches[dirname] = {
          score: 1,
          result: withoutBasedir(dirname),
          missed: true
        });
      } else {
        return (pathMatches[dirname] = {
          score: 1,
          result: withoutBasedir(dirname),
          missed: false
        });
      }
    };
    matchFile = function(filename, pathMatch) {
      var basename, dirname, match, matchResult;
      basename = path.basename(filename);
      dirname = path.dirname(filename);
      match = fileRegex.exec(basename);
      if (match) {
        matchResult = buildResult(match, 1);
        return {
          path: withoutBasedir(filename),
          dirname: withoutBasedir(dirname),
          name: basename,
          pathRuns: pathMatch.result,
          fileRuns: matchResult.result,
          score: pathMatch.score * matchResult.score
        };
      } else {
        return false;
      }
    };
    makePattern = function(part) {
      var charToPattern;
      charToPattern = function(pattern, character) {
        if (pattern.length) {
          pattern += '([^/]*?)';
        }
        return pattern += '(' + character + ')';
      };
      return part.split('').reduce(charToPattern, '');
    };
    pattern = pattern.replace(/ /g, '');
    parts = pattern.split('/');
    if (pattern.match(/\/$/)) {
      parts.push('');
    }
    filePart = parts.pop();
    if (parts.length) {
      pathRegex = new RegExp('^(.*?)' + parts.map(makePattern).join('(.*?/.*?)') + '(.*?)$', 'i');
    }
    fileRegex = (new RegExp("^(.*?)" + (makePattern(filePart)) + "(.*)$", "i"));
    return listFiles(directory, 1, function(filename, segments) {
      var fileMatch, pathMatch;
      pathMatch = matchPath(filename, segments);
      if (!pathMatch.missed) {
        console.log('trying to match ' + filename);
        fileMatch = matchFile(filename, pathMatch);
        if (fileMatch) {
          matchCallback(fileMatch);
        }
        if (waitingFiles === 0 && (typeof finalCallback !== "undefined" && finalCallback !== null)) {
          return finalCallback();
        }
      }
    });
  };
})();
