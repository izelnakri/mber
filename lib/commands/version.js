import chalk from 'chalk';

export default function() {
  console.log(chalk.cyan('[mber CLI]'), require('../../package.json').version);
}
