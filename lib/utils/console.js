import chalk from 'chalk'
import ora from 'ora';

export function error(errorText) {
  console.log(`${chalk.hex('#F72635').bold('ember')} ${chalk.red(errorText)}`);
  console.log(errorText);
}
export function log() {
  console.log(chalk.hex('#F72635').bold('ember'), ...arguments);
}
export function spinner(text) {
  process.stdout.clearLine = () => {};
  process.stdout.cursorTo = () => {};
  process.stdout.moveCursor = () => {};

  const spinner = ora({ text: text, stream: process.stdout }).start();

  spinner.isEnabled = true; // TODO: maybe take this out
  spinner.color = 'green';
  spinner.interval = 50;

  return spinner;
}

export default { spinner, log, error };
