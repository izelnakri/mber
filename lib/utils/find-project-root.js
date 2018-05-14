import searchInParentDirectories from './search-in-parent-directories';

export default function() {
  // TODO: if there is node_modules in the path then move
  const packageJSONPath = searchInParentDirectories('.', 'package.json');

  return packageJSONPath.replace('/package.json', '');
}
