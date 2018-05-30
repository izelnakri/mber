import searchInParentDirectories from './search-in-parent-directories';

export default function() {
  const packageJSONPath = searchInParentDirectories('.', 'package.json');

  return packageJSONPath.replace('/package.json', '');
}
