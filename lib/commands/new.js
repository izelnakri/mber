import fs from 'fs-extra';
import chalk from 'chalk';

export default function() {
  const applicationName = process.argv[3];

  if (!applicationName) {
    throw new Error(chalk.red(`[mber] You forgot to include an application name! Example: mber init example-app`));
  }

  // check if the app already exists

  fs.copySync(`${__dirname}/../../ember-app-boilerplate`, `${process.cwd()}/${applicationName}`);
  // print all the structure in a nice way
  // create package.json
  // do yarn install
  console.log(chalk.green(`[mber] ${applicationName} ember application created`));
}
