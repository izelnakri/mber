import chalk from 'ansi-colors';
import ora from 'ora';

export function error(errorText) {
  console.log(`${chalk.red.bold('ember')} ${chalk.red(errorText)}`);
  console.log(errorText);
}
export function log() {
  console.log(chalk.red.bold('ember'), ...arguments);
}
export function spinner(text) {
  process.stdout.clearLine = () => {};
  process.stdout.cursorTo = () => {};
  process.stdout.moveCursor = () => {};

  return ora({ text: text, stream: process.stdout, isEnabled: true, color: 'green', interval: 50 }).start();
}

export default { spinner, log, error };
