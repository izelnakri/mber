import fs from 'fs';

export default function(fileOrFolder) {
  return fs.existsSync(fileOrFolder) || process.cwd().split('/').includes(fileOrFolder);
}
