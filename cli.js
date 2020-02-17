#! /usr/bin/env node
import chalk from 'ansi-colors';
import Console from './lib/utils/console.js';

process.title = 'mber';
global.mainContext = global; // NOTE: needed for ember-template-compiler

let shouldRunCommand = false;

const CLI = {
  async default(commandHandler) {
    if (!process.argv[2]) {
      shouldRunCommand = true;

      return await commandHandler();
    }
  },
  async command(commandName, commandHandler) {
    const commandMatchesArray = Array.isArray(commandName) && commandName.includes(process.argv[2]);

    if (commandMatchesArray || commandName === process.argv[2]) {
      shouldRunCommand = true;

      return await commandHandler();
    }
  }
};

(async () => {
  CLI.default(async () => await runCommand('./lib/commands/index.js'));
  CLI.command(['serve', 'server', 's'], async () => await runCommand('./lib/commands/serve.js')); // TODO: add proxy
  CLI.command(['test', 't'], async () => await runCommand('./lib/commands/test.js')); // TODO: add --proxy
  CLI.command(['build', 'b'], async () => await runCommand('./lib/commands/build.js')); // TODO: add --proxy
  CLI.command(['compile', 'transpile', 'c'], async () => await runCommand('./lib/commands/compile.js'));
  CLI.command(['console'], async () => await runCommand('./lib/commands/console.js'));
  CLI.command(['help', 'h', 'print', 'p'], async () => await runCommand('./lib/commands/index.js'));
  CLI.command(['init', 'new'], async () => await runCommand('./lib/commands/new.js'));
  CLI.command(['generate', 'g', 'create'], async () => {
    return (await import('./lib/commands/generate.js')).default(process.argv[3], process.argv[4])
  });
  CLI.command(['delete', 'd', 'destroy', 'remove'], async () => {
    (await import('./lib/commands/delete.js')).default(process.argv[3], process.argv[4]);
  });

  if (!shouldRunCommand) {
    Console.log(chalk.red('unknown command. Available options are:'));
    await runCommand('./lib/commands/index.js');
    setTimeout(() => process.exit(1), 100);
  }
})();

async function runCommand(commandPath) {
  return (await import(commandPath)).default();
}
// NOTE: maybe merge server and console commands in future?
