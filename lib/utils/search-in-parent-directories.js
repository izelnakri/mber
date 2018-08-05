import fs from 'fs';

async function searchInParentDirectories(directory, targetEntry) {
  directory = directory === '.' ? process.cwd() : directory;

  if (await fs.exists(`${directory}/${targetEntry}`)) { // NOTE: move this to non-blocking
    return `${directory}/${targetEntry}`;
  } else if (directory === '') {
    return;
  }

  return searchInParentDirectories(directory.slice(0, directory.lastIndexOf('/')), targetEntry);
}

export default searchInParentDirectories;
