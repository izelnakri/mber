#! /usr/bin/env node

import chalk from 'ansi-colors';
import Console from './lib/utils/console.js';
import printCommand from './lib/commands/index.js';
import compileCommand from './lib/commands/compile.js';
import serveCommand from './lib/commands/serve.js';
import testCommand from './lib/commands/test.js';
import buildCommand from './lib/commands/build.js';
import consoleCommand from './lib/commands/console.js';
import newCommand from './lib/commands/new.js';
import generateCommand from './lib/commands/generate.js';
import deleteCommand from './lib/commands/delete.js';

process.title = 'mber';
global.mainContext = global; // NOTE: needed for ember-template-compiler

let shouldRunCommand = false;

const CLI = {
  default(commandHandler) {
    if (!process.argv[2]) {
      shouldRunCommand = true;

      return commandHandler();
    }
  },
  command(commandName, commandHandler) {
    const commandMatchesArray = Array.isArray(commandName) && commandName.includes(process.argv[2]);

    if (commandMatchesArray || commandName === process.argv[2]) {
      shouldRunCommand = true;

      return commandHandler();
    }
  }
};

CLI.default(() => printCommand());
CLI.command(['serve', 'server', 's'], () => serveCommand()); // TODO: add proxy
CLI.command(['test', 't'], () => testCommand()); // TODO: add --proxy
CLI.command(['build', 'b'], () => buildCommand()); // TODO: add --proxy
CLI.command(['compile', 'transpile', 'c'], () => compileCommand());
CLI.command(['console'], () => consoleCommand());
CLI.command(['help', 'h', 'print', 'p'], () => printCommand());
CLI.command(['init', 'new'], () => newCommand());
CLI.command(['generate', 'g', 'create'], () => generateCommand(process.argv[3], process.argv[4]));
CLI.command(['delete', 'd', 'destroy', 'remove'], () =>
  deleteCommand(process.argv[3], process.argv[4])
);

if (!shouldRunCommand) {
  Console.log(chalk.red('unknown command. Available options are:'));
  printCommand();
  setTimeout(() => process.exit(1), 100);
}

// NOTE: maybe merge server and console commands in future?
