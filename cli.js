#! /usr/bin/env node
require('babel-register')({
  presets: ['env']
});

const chalk = require('chalk');
const printCommand = require('./lib/commands').default;
const serveCommand = require('./lib/commands/serve').default;
const newCommand = require('./lib/commands/new').default;
const versionCommand = require('./lib/commands/version').default;

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

CLI.default(printCommand);
CLI.command(['help', 'h'], printCommand);
CLI.command(['init', 'new'], newCommand);
CLI.command(['serve', 'server', 's'], serveCommand);
ClI.command(['version', 'v'], versionCommand);
// TODO: add ora spinners
