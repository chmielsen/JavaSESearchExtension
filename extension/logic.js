
/**
 * Matches queryPartsLower with elements in searchSpace
 */
function matchFullname(queryPartsLower, searchSpace) {
  var matchedClasses = [];
  for (var i = 0; i < searchSpace.length; i++) {
    var currentClass = searchSpace[i];
    var textLower = (currentClass.fullname).toLowerCase();
    for (var j = 0; j < queryPartsLower.length; j++) {
      if (!queryPartsLower[j]) {
        continue;
      }

      if (textLower.indexOf(queryPartsLower[j]) >= 0) {
        matchedClasses.push(currentClass);
        break;
      }
    }
  }
  return matchedClasses;
}
