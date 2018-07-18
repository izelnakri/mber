import fs from 'fs-extra';

async function searchInParentDirectories(directory, targetEntry) {
  directory = directory === '.' ? process.cwd() : directory;

  if (await fs.exists(`${directory}/${targetEntry}`)) {
    return `${directory}/${targetEntry}`;
  } else if (directory === '') {
    return;
  }

  return searchInParentDirectories(directory.slice(0, directory.lastIndexOf('/')), targetEntry);
}

export default searchInParentDirectories;
