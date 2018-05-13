import { promisify } from 'util';
import chalk from 'chalk';
import Mustache from 'mustache';
import fs from 'fs-extra';
import Console from '../utils/console';
import searchInParentDirectories from '../utils/search-in-parent-directories';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const CWD = process.cwd();

export default function() {
  const applicationName = process.argv[3];

  if (!applicationName) {
    return Console.error('You forgot to include an application name! Example: mber init example-app');
  } else if (searchInParentDirectories(CWD, applicationName)) {
    return Console.error(`${applicationName} already exists!`);
  }

  Console.log(`creating ${applicationName} application`);
  let spinner = Console.spinner('creating');

  const targetDirectory = `${CWD}/${applicationName}`;
  const environmentPath = `${targetDirectory}/config/environment.js`;
  const packageJSONPath = `${targetDirectory}/package.json`;

  fs.copySync(`${__dirname}/../../ember-app-boilerplate`, targetDirectory); // TODO: optimize this one

  Promise.all([
    readFileAsync(environmentPath),
    readFileAsync(packageJSONPath)
  ]).then(([environmentSource, packageSource]) => {
    return Promise.all([
      writeFileAsync(environmentPath, Mustache.render(environmentSource.toString(), { applicationName })),
      writeFileAsync(packageJSONPath, Mustache.render(packageSource.toString(), { applicationName })),
      writeFileAsync(`${targetDirectory}/.gitignore`, `.cache
      dist
      node_modules
      npm-debug.log*
      yarn-error.log
      tmp`)
    ]);
  }).then(() => {
    spinner.stop();

    fs.readdir(targetDirectory).then((fileAndFolders) => {
      fileAndFolders.forEach((fileOrFolder) => console.log(chalk.green('created'), fileOrFolder));
      Console.log(chalk.green(`${applicationName} ember application created. Next is to do:`));
      console.log('$ cd testapp && yarn install && mber s');
    });
  }).catch((error) => {
    spinner.stop();

    Console.log(chalk.red('Error:', error));
  });
}
