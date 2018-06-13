import { promisify } from 'util';
import chalk from 'chalk';
import Mustache from 'mustache';
import fs from 'fs-extra';
import Console from '../utils/console';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const copyAsync = promisify(fs.copy);

const CWD = process.cwd();

export default async function() {
  const applicationName = process.argv[3];

  if (!applicationName) {
    return Console.error('You forgot to include an application name! Example: mber init example-app');
  } else if (CWD.split().includes(applicationName) || fs.readdirSync(CWD).includes(applicationName)) {
    return Console.error(`${applicationName} already exists!`);
  }

  Console.log(`creating ${applicationName} application`);

  let spinner = Console.spinner('Creating');

  const TARGET_DIRECTORY = `${CWD}/${applicationName}`;
  const ENVIRONMENT_PATH = `${TARGET_DIRECTORY}/config/environment.js`;
  const PACKAGE_JSON_PATH = `${TARGET_DIRECTORY}/package.json`;
  const TEST_HTML_PATH = `${TARGET_DIRECTORY}/tests/index.html`;
  const ENTRYPOINT_PATH = `${TARGET_DIRECTORY}/index.js`;

  await copyAsync(`${__dirname}/../../ember-app-boilerplate`, TARGET_DIRECTORY);

  Promise.all([
    readFileAsync(ENTRYPOINT_PATH),
    readFileAsync(ENVIRONMENT_PATH),
    readFileAsync(PACKAGE_JSON_PATH),
    readFileAsync(TEST_HTML_PATH),
  ]).then(([indexJSSource, environmentSource, packageSource, testHTMLSource]) => {
    const packageVersion = require(`{__dirname}/../../package.json`).version;

    return Promise.all([
      writeFileAsync(ENTRYPOINT_PATH, indexJSSource.toString().replace(
        `const app = require('../index.js');`, `const app = require('mber');`
      )),
      writeFileAsync(ENVIRONMENT_PATH, Mustache.render(environmentSource.toString(), { applicationName })),
      writeFileAsync(PACKAGE_JSON_PATH, Mustache.render(packageSource.toString(), {
        applicationName: applicationName, mberVersion: packageVersion
      })),
      writeFileAsync(TEST_HTML_PATH, Mustache.render(testHTMLSource.toString(), { applicationName })),
      writeFileAsync(`${TARGET_DIRECTORY}/.gitignore`, `.cache
      dist
      node_modules
      npm-debug.log*
      yarn-error.log
      tmp`)
    ]);
  }).then(() => {
    spinner.stop();

    fs.readdir(TARGET_DIRECTORY).then((fileAndFolders) => {
      fileAndFolders.forEach((fileOrFolder) => console.log(chalk.green('created'), fileOrFolder));
      Console.log(chalk.green(`${applicationName} ember application created. Next is to do:`));
      console.log(`$ cd ${applicationName} && yarn install && mber s`);
    });
  }).catch((error) => {
    spinner.stop();

    Console.error(error);
  });
}
