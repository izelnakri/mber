import chalk from 'chalk';
import Mustache from 'mustache';
import fs from 'fs-extra';
import Console from '../utils/console';

const CWD = process.cwd();

export default async function() {
  const applicationName = process.argv[3];

  if (!applicationName) {
    return Console.error('You forgot to include an application name! Example: mber init example-app');
  } else if (CWD.split().includes(applicationName) || (await fs.readdir(CWD)).includes(applicationName)) {
    return Console.error(`${applicationName} already exists!`);
  }

  Console.log(`creating ${applicationName} application`);

  let spinner = Console.spinner('Creating\n');

  const TARGET_DIRECTORY = `${CWD}/${applicationName}`;
  const ENVIRONMENT_PATH = `${TARGET_DIRECTORY}/config/environment.js`;
  const PACKAGE_JSON_PATH = `${TARGET_DIRECTORY}/package.json`;
  const TEST_HTML_PATH = `${TARGET_DIRECTORY}/tests/index.html`;
  const ENTRYPOINT_PATH = `${TARGET_DIRECTORY}/index.js`;

  await fs.copy(`${__dirname}/../../ember-app-boilerplate`, TARGET_DIRECTORY);

  Promise.all([
    fs.readFile(ENTRYPOINT_PATH),
    fs.readFile(ENVIRONMENT_PATH),
    fs.readFile(PACKAGE_JSON_PATH),
    fs.readFile(TEST_HTML_PATH),
  ]).then(([indexJSSource, environmentSource, packageSource, testHTMLSource]) => {
    const packageVersion = require(`{__dirname}/../../package.json`).version;

    return Promise.all([
      fs.writeFile(ENTRYPOINT_PATH, indexJSSource.toString().replace(
        `const app = require('../index.js');`, `const app = require('mber');`
      )),
      fs.writeFile(ENVIRONMENT_PATH, Mustache.render(environmentSource.toString(), { applicationName })),
      fs.writeFile(PACKAGE_JSON_PATH, Mustache.render(packageSource.toString(), {
        applicationName: applicationName, mberVersion: packageVersion
      })),
      fs.writeFile(TEST_HTML_PATH, Mustache.render(testHTMLSource.toString(), { applicationName })),
      fs.writeFile(`${TARGET_DIRECTORY}/.gitignore`, `.cache
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
      console.log(`$ cd ${applicationName} && npm install && mber s`);
    });
  }).catch((error) => {
    spinner.stop();

    Console.error(error);
  });
}
