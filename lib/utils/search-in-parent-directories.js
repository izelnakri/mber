import pathExists from './path-exists.js'; // NOTE: this could be optimized by an in-memory tree

async function searchInParentDirectories(directory, targetEntry) {
  directory = directory === '.' ? process.cwd() : directory;

  if (await pathExists(`${directory}/${targetEntry}`)) { // NOTE: move this to non-blocking
    return `${directory}/${targetEntry}`;
  } else if (directory === '') {
    return;
  }

  return await searchInParentDirectories(directory.slice(0, directory.lastIndexOf('/')), targetEntry);
}

export default searchInParentDirectories;
