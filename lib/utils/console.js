import chalk from 'chalk'
import ora from 'ora';

export function error(errorText) {
  throw new Error(`${chalk.hex('#F72635').bold('ember')} ${chalk.red(errorText)}`);
}
export function log() {
  console.log(chalk.hex('#F72635').bold('ember'), ...arguments);
}
export function spinner(text) {
  const spinner = ora(text).start();

  spinner.color = 'green';
  spinner.interval = 50;

  return spinner;
}

export default { spinner, log, error };
