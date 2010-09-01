path = require('path')
fs = require('fs')

module.exports = (directory, pattern, matchCallback, finalCallback) ->
  pathMatches = {}
  waitingFiles = 0
  
  listFiles = (root, segments, callback) ->
    waitingFiles += 1
    fs.readdir root, (error, files) ->
      waitingFiles -= 1
      for filename in files
        return if filename[0] == '.'
        waitingFiles += 1
        filename = path.join root, filename
        fs.stat filename, (error, stats) ->
          waitingFiles -= 1
          if stats.isDirectory()
            listFiles filename, segments + 1, callback
          else
            callback filename, segments
  
  withoutBasedir = (path) -> path.replace directory + '/', ''
  
  buildResult = (match, segments) ->
    runs = []
    insideRuns = []
    lastRun = false
    insideChars = 0
    totalChars = 0
    index = 0
    
    match.shift
    for capture, index in match
      if capture.length
        inside = index % 2 != 0
        capture = capture.replace '/', ''
        totalChars += capture.length
        insideChars += capture.length if inside
        
        if lastRun && lastRun.inside == inside
          lastRun.string += capture
        else
          lastRun = { string: capture, inside: inside }
          runs.push lastRun
          insideRuns.push lastRun if inside
    
    charRatio = if totalChars > 0 then insideChars / totalChars else 1
    runRatio = if insideRuns.length > 0 then segments / insideRuns.length else 1
    
    { score: runRatio * charRatio, result: runs, missed: false }
  
  matchPath = (filename, segments) ->
    dirname = path.dirname filename
    if pathMatches[dirname]?
      return pathMatches[dirname]
    
    if pathRegex?
      match = pathRegex.exec withoutBasedir(filename)
      if match
        pathMatches[dirname] = buildResult match, segments
      else
        pathMatches[dirname] = { score: 1, result: withoutBasedir(dirname), missed: true }
    else
      pathMatches[dirname] = { score: 1, result: withoutBasedir(dirname), missed: false }
  
  matchFile = (filename, pathMatch) ->
    basename = path.basename filename
    dirname = path.dirname filename
    match = fileRegex.exec basename
    if match
      matchResult = buildResult match, 1
      {
        path: withoutBasedir(filename),
        dirname: withoutBasedir(dirname),
        name: basename,
        pathRuns: pathMatch.result,
        fileRuns: matchResult.result,
        score: pathMatch.score * matchResult.score
      }
    else
      false
  
  makePattern = (part) ->
    fun = (pattern, character) ->
      pattern += '([^/]*?)' if pattern.length
      pattern += '(' + character + ')'
    part.split('').reduce fun, ''

  pattern = pattern.replace(/ /g, '')
  parts = pattern.split '/'
  parts.push '' if pattern.match /\/$/
  filePart = parts.pop()
  if parts.length
    pathRegex = new RegExp '^(.*?)' + parts.map(makePattern).join('(.*?/.*?)') + '(.*?)$', 'i'
  
  fileRegex = /^(.*?)#{makePattern(filePart)}(.*)$/i
  listFiles directory, 1, (filename, segments) ->
    pathMatch = matchPath filename, segments
    if !pathMatch.missed
      fileMatch = matchFile filename, pathMatch
      matchCallback fileMatch if fileMatch
      finalCallback() if waitingFiles == 0