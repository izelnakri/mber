#! /usr/bin/env node
require('babel-register')({
  presets: ['env']
});
require('babel-polyfill');
let shouldRunCommand = false;

const chalk = require('chalk');
const printCommand = require('./lib/commands').default;
const Console = require('./lib/utils/console').default;

const CLI = {
  default(commandHandler) {
    shouldRunCommand = !process.argv[2];

    return shouldRunCommand ? commandHandler() : null;
  },
  command(commandName, commandHandler) {
    const commandMatchesArray = Array.isArray(commandName) && commandName.includes(process.argv[2]);
    shouldRunCommand = commandMatchesArray || (commandName === process.argv[2]);

    return shouldRunCommand ? commandHandler() : null;
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
