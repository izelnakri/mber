#! /usr/bin/env node
require = require('esm')(module)
require('babel-register')({
  presets: ['env']
});
require('babel-polyfill');

process.title = 'mber';
global.mainContext = global; // NOTE: needed for ember-template-compiler

let shouldRunCommand = false;

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
CLI.command(['serve', 'server', 's'], () => require('./lib/commands/serve').default()); // TODO: add proxy, fastboot flags
CLI.command(['test', 't'], () => require('./lib/commands/test').default()); // TODO: add --proxy, fastboot flag
CLI.command(['build', 'b'], () => require('./lib/commands/build').default()); // TODO: add --proxy, fastboot flag
CLI.command(['console', 'c'], () => require('./lib/commands/console').default());
CLI.command(['help', 'h'], () => printCommand());
CLI.command(['print', 'p'], () => printCommand());
CLI.command(['init', 'new'], () => require('./lib/commands/new').default());

if (!shouldRunCommand) {
  Console.log(require('chalk').red('unknown command. Available options are:'));
  printCommand();
}

// NOTE: maybe merge server and console commands in future?
