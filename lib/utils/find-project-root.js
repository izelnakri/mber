import searchInParentDirectories from './search-in-parent-directories';

export default function() {
  return searchInParentDirectories('.', 'package.json').replace('/package.json', '');
}
