import fs from 'fs';

function searchInParentDirectories(directory=process.cwd(), targetEntry) {
  const CWD = process.cwd();

  directory = directory === '.' ? CWD : directory;

  if (fs.existsSync(`${CWD}/${targetEntry}`)) {
    return CWD;
  } else if (directory === '') {
    return;
  }

  return searchInParentDirectories(directory.slice(0, directory.lastIndexOf('/')), targetEntry);
}


export default searchInParentDirectories;
