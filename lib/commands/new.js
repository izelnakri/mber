import { promisify } from 'util';
import chalk from 'chalk';
import Mustache from 'mustache';
import fs from 'fs-extra';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

export default function() {
  // NOTE: ora spinner

  const applicationName = process.argv[3];

  if (!applicationName) {
    throw new Error(chalk.red(`[mber] You forgot to include an application name! Example: mber init example-app`));
  }

  // TODO: check if the app already exists

  console.log(`installing ${applicationName}`);

  const targetDirectory = `${process.cwd()}/${applicationName}`;
  const environmentPath = `${targetDirectory}/config/environment.js`;
  const packageJSONPath = `${targetDirectory}/package.json`;

  fs.copySync(`${__dirname}/../../ember-app-boilerplate`, targetDirectory);

  Promise.all([
    readFileAsync(environmentPath),
    readFileAsync(packageJSONPath)
  ]).then(([environmentSource, packageSource]) => {
    return Promise.all([
      writeFileAsync(environmentPath, Mustache.render(environmentSource.toString(), { applicationName })),
      writeFileAsync(packageJSONPath, Mustache.render(packageSource.toString(), { applicationName }))
    ]);
  }).then(() => {
    // print all the structure in a nice way

    console.log(chalk.green(`[mber] ${applicationName} ember application created`));

    // do yarn install
  });
}
