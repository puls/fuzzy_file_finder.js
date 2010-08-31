# `fuzzy_file_finder.js`

`fuzzy_file_finder.js` is an almost direct JavaScript port of [Jamis Buck's Ruby FuzzyFileFinder](http://github.com/jamis/fuzzy_file_finder).

## FEATURES:

* Quickly search directory trees for files
* Simple highlighting of matches to discover how a pattern matched

## SYNOPSIS:

In a nutshell:

    var finder = require('fuzzy_file_finder');
    finder(".", "app/blogcon", function (match) {
      console.log(Math.floor(match.score * 10000) + ' ' + match.path);
    });

See FuzzyFileFinder for more documentation, and links to further information.

## INSTALL:

* `npm install fuzzy_file_finder`
