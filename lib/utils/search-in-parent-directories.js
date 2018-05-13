import fs from 'fs';

function searchInParentDirectories(directory, targetEntry) {
  directory = directory === '.' ? process.cwd() : directory;

  if (fs.existsSync(`${directory}/${targetEntry}`)) {
    return `${directory}/${targetEntry}`;
  } else if (directory === '') {
    return;
  }

  return searchInParentDirectories(directory.slice(0, directory.lastIndexOf('/')), targetEntry);
}

export default searchInParentDirectories;
