#! /usr/bin/env node
require('babel-register')({
  presets: ['env']
});
require('babel-polyfill');

const printCommand = require('./lib/commands').default;
const CLI = {
  default(commandHandler) {
    !process.argv[2] ? commandHandler() : null;
  },
  command(commandName, commandHandler) {
    if (Array.isArray(commandName)) {
      return commandName.includes(process.argv[2]) ? commandHandler() : null;
    }

    commandName === process.argv[2] ? commandHandler() : null;
  }
};

CLI.default(() => printCommand());
CLI.command(['help', 'h'], () => printCommand());
CLI.command(['init', 'new'], () => require('./lib/commands/new').default());
CLI.command(['serve', 'server', 's'], () => require('./lib/commands/serve').default());
CLI.command(['build', 'b'], () => require('./lib/commands/build').default());
CLI.command(['console', 'c'], () => require('./lib/commands/console').default());
CLI.command(['test', 't'], () => require('./lib/commands/test').default());

// TODO: add ora spinners
