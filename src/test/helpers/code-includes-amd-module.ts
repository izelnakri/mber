export default function(codeString, dependencyName) {
  return codeString.includes(`define("${dependencyName}",`) ||
    codeString.includes(`define('${dependencyName}',`);
}
