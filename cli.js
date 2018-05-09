#! /usr/bin/env node
require('babel-register')({
  presets: ['env']
});
require('babel-polyfill');

process.title = 'mber';

let shouldRunCommand = false;

const chalk = require('chalk');
const Console = require('./lib/utils/console').default;
const printCommand = () => require('./lib/commands').default();

const CLI = {
  default(commandHandler) {
    if (!process.argv[2]) {
      shouldRunCommand = true;

      return commandHandler();
    }
  },
  command(commandName, commandHandler) {
    const commandMatchesArray = Array.isArray(commandName) && commandName.includes(process.argv[2]);

    if (commandMatchesArray || (commandName === process.argv[2])) {
      shouldRunCommand = true;

      return commandHandler();
    }
  }
};

CLI.default(() => printCommand());
CLI.command(['help', 'h'], () => printCommand());
CLI.command(['print', 'p'], () => printCommand());
CLI.command(['init', 'new'], () => require('./lib/commands/new').default());
CLI.command(['serve', 'server', 's'], () => require('./lib/commands/serve').default());
CLI.command(['build', 'b'], () => require('./lib/commands/build').default());
CLI.command(['console', 'c'], () => require('./lib/commands/console').default());
CLI.command(['test', 't'], () => require('./lib/commands/test').default());

if (!shouldRunCommand) {
  Console.log(chalk.red('unknown command. Available options are:'));
  printCommand();
}
