/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var OMNIBOX_MAX_RESULTS = 20;
var REFERENCE_JS_URLS = [
  'classes-ref.js',
  'logic.js',
];


chrome.omnibox.setDefaultSuggestion({
  description: 'Loading JavaSE classes...'
});


/**
 * Initialization function that tries to load the REFERENCE_JS_URLS, and upon
 * failure, continually attempts to load it every 5 seconds. Once loaded,
 * runs onScriptsLoaded to continue extension initialization.
 */
(function init() {
  function _success() {
    DATA = XML_DATA;

    console.log('Successfully loaded classes reference JS.');
    onScriptsLoaded();
  }

  function _error(script) {
    console.error('Failed to load ' + script + '. Retrying in 5 seconds.');
    window.setTimeout(init, 5000);
  }

  loadScripts(REFERENCE_JS_URLS, _success, _error);
})();

/**
 * Attempts to load a set of JS scripts by adding them to the <head>. Provides
 * success and error callbacks.
 */
function loadScripts(urls, successFn, errorFn) {
  urls = urls || [];
  urls = urls.slice(); // clone

  var _loadNext = function() {
    var url = urls.shift();
    if (!url) {
      successFn();
      return;
    }
    loadScript(url, _loadNext, errorFn);
  };

  _loadNext();
}


/**
 * Attempts to load a JS script by adding it to the <head>. Provides
 * success and error callbacks.
 */
function loadScript(url, successFn, errorFn) {
  successFn = successFn || function(){};
  errorFn = errorFn || function(){};

  if (!url) {
    errorFn('(no script)');
    return;
  }

  var loadComplete = false;

  var headNode = document.getElementsByTagName('head')[0];
  var scriptNode = document.createElement('script');
  scriptNode.type = 'text/javascript';
  scriptNode.src = url;
  scriptNode.onload = scriptNode.onreadystatechange = function() {
    if ((!scriptNode.readyState ||
         'loaded' === scriptNode.readyState ||
         'complete' === scriptNode.readyState)
        && !loadComplete) {
      scriptNode.onload = scriptNode.onreadystatechange = null;
      if (headNode && scriptNode.parentNode) {
        headNode.removeChild(scriptNode);
      }
      scriptNode = undefined;
      loadComplete = true;
      successFn();
    }
  }
  scriptNode.onerror = function() {
    if (!loadComplete) {
      loadComplete = true;
      errorFn(url);
    }
  };

  headNode.appendChild(scriptNode);
}


/**
 * Second-stage initialization function. This contains all the Omnibox
 * setup features.
 */
function onScriptsLoaded() {
  chrome.omnibox.setDefaultSuggestion({
    description: 'Search JavaSE docs for <match>%s</match>'
  });

  chrome.omnibox.onInputChanged.addListener(
    function(query, suggestFn) {
      if (!query)
        return;

      suggestFn = suggestFn || function(){};
      query = query.replace(/(^ +)|( +$)/g, '');
      var queryPartsLower = query.toLowerCase().match(/[^\s]+/g) || [];

      // Filter all classes/packages.
      var searchSpace = DATA;
      var matchedClasses = matchFullname(queryPartsLower, searchSpace)

      // Rank them.
      rankResults(matchedClasses, query);

      console.clear();
      for (var i = 0; i < Math.min(20, matchedClasses.length); i++) {
        console.log(matchedClasses[i].__resultScore + '   ' + matchedClasses[i].fullname);
      }

      // Add them as omnibox results, with prettyish formatting
      // (highlighting, etc.).
      var capitalLetterRE = new RegExp(/[A-Z]/);
      var queryLower = query.toLowerCase();
      var queryAlnumDotParts = queryLower.match(/[\&\;\-\w\.]+/g) || [''];
      var queryREs = queryAlnumDotParts.map(function(q) {
        return new RegExp('(' + q.replace(/\./g, '\\.') + ')', 'ig');
      });

      var omniboxResults = [];
      for (var i = 0; i < OMNIBOX_MAX_RESULTS && i < matchedClasses.length; i++) {
        var currentClass = matchedClasses[i];

        var description = currentClass.fullname;
        var firstCap = description.search(capitalLetterRE);

        var subDescription = currentClass.type || '';
        if (subDescription) {
          description += ' %{(' + subDescription + ')}%';
        }

        for (var j = 0; j < queryREs.length; j++) {
          description = description.replace(queryREs[j], '%|$1|%');
        }

        // Remove HTML tags from description since omnibox cannot display them.
        // description = description.replace(/\</g, '&lt;').replace(/\>/g, '&gt;');

        // Convert special markers to Omnibox XML
        description = description
            .replace(/\%\{/g, '<dim>')
            .replace(/\}\%/g, '</dim>')
            .replace(/\%\|/g, '<match>')
            .replace(/\|\%/g, '</match>');

        omniboxResults.push({
          content: 'https://docs.oracle.com/javase/8/docs/api/' + currentClass.link,
          description: description,
        });
      }

      suggestFn(omniboxResults);
    }
  );

  chrome.omnibox.onInputEntered.addListener(function(text) {
    if (text.match(/^https?\:/)) {
      navigateToUrl(text);
    } else {
      search_url = 'https://search.oracle.com/search/search?group=Documentation&sw=t&q=' + encodeURIComponent(text);
      navigateToUrl(search_url);
    }
  });
}

function navigateToUrl(url) {
  chrome.tabs.getSelected(null, function(tab) {
    chrome.tabs.update(tab.id, {url: url});
  });
}


/**
 * Helper function that gets the index of the last occurence of the given
 * regex in the given string, or -1 if not found.
 */
function regexFindLast(s, re) {
  if (s == '')
    return -1;
  var l = -1;
  var tmp;
  while ((tmp = s.search(re)) >= 0) {
    if (l < 0) l = 0;
    l += tmp;
    s = s.substr(tmp + 1);
  }
  return l;
}


/**
 * Helper function that counts the occurrences of a given character in
 * a given string.
 */
function countChars(s, c) {
  var n = 0;
  for (var i=0; i<s.length; i++)
    if (s.charAt(i) == c) ++n;
  return n;
}


/**
 * Populates matches with ranking data given the query.
 */
function rankResults(matches, query) {
  query = query || '';
  matches = matches || [];

  // We replace dashes with underscores so dashes aren't treated
  // as word boundaries.
  var queryParts = query.toLowerCase().replace(/-/g, '_').match(/\w+/g) || [''];

  for (var i = 0; i < matches.length; i++) {
    var totalScore = (matches[i].extraRank || 0) * 200;

    for (var j = 0; j < queryParts.length; j++) {
      var partialAlnumRE = new RegExp(queryParts[j]);
      var exactAlnumRE = new RegExp('\\b' + queryParts[j] + '\\b');
      totalScore += resultMatchScore(exactAlnumRE, partialAlnumRE, j, matches[i]);
    }

    matches[i].__resultScore = totalScore;
  }

  matches.sort(function(a, b) {
    var n = b.__resultScore - a.__resultScore;
    if (n == 0) // lexicographical sort if scores are the same
      n = (a.fullname < b.fullname) ? -1 : 1;
    return n;
  });
}


/**
 * Scores an individual match.
 */
function resultMatchScore(exactMatchRe, partialMatchRe, order, result) {
  // scores are calculated based on exact and prefix matches,
  // and then number of path separators (dots) from the last
  // match (i.e. favoring classes and deep package names)
  var score = 1.0;
  var fullnameLower = result.fullname.toLowerCase().replace(/-/g, '_');
  if (result.type == 'docs') {
    fullnameLower += ' ' + result.type;
  }

  var t = regexFindLast(fullnameLower, exactMatchRe);
  if (t >= 0) {
    // exact part match
    var partsAfter = countChars(fullnameLower.substr(t + 1), '.');
    score *= 60 / (partsAfter + 1);
  } else {
    t = regexFindLast(fullnameLower, partialMatchRe);
    if (t >= 0) {
      // partial match
      var partsAfter = countChars(fullnameLower.substr(t + 1), '.');
      score *= 20 / (partsAfter + 1);
    }
  }

  if (!result.type.match(/ref/)) {
    // downgrade non-reference docs
    score /= 1.5;
  }

  score /= (1 + order / 2);

  return score;
}
