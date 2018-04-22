import chalk from 'chalk';

export default function() {
  console.log(chalk.cyan('[MemServer CLI]'), require('../../package.json').version);
}
