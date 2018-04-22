import fs from 'fs-extra';

export default function() {
  // check if the app already exists
  fs.copySync('./ember-app-boilerplate', `${process.cwd()}/${process.argv[3]}`);
  // copy files
  // create package.json
  // do yarn install
}
