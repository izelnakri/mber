import test from 'ava';
import { promisify } from 'util';
import { exec } from 'child_process';

const shell = promisify(exec);
const VERSION = require(`${process.cwd()}/package.json`).version;
const printedHelpOutput = `[mber CLI v${VERSION}] Usage: mber <command (Default: help)>
mber init | new                    # Sets up the initial ember folder structure
mber serve | server                # Starts your ember development server [alias: "mber s"]
mber build | b                     # Builds your ember application and outputs to /dist folder
mber console | c                   # Boots your ember application with DOM in a node.js repl
mber test | t                      # Runs your ember tests (--server to run them in browser)
`;

test('$ mber -> prints options', async (t) => {
  const { stdout } = await shell(`node ${process.cwd()}/cli.js`);

  t.true(stdout.includes(printedHelpOutput));
});

test('$ mber print -> prints options', async (t) => {
  const { stdout } = await shell(`node ${process.cwd()}/cli.js print`);

  t.true(stdout.includes(printedHelpOutput));
});

test('$ mber p -> prints options', async (t) => {
  const { stdout } = await shell(`node ${process.cwd()}/cli.js p`);

  t.true(stdout.includes(printedHelpOutput));
});

test('$ mber help -> prints options', async (t) => {
  const { stdout } = await shell(`node ${process.cwd()}/cli.js help`);

  t.true(stdout.includes(printedHelpOutput));
});

test('$ mber h -> prints options', async (t) => {
  const { stdout } = await shell(`node ${process.cwd()}/cli.js h`);

  t.true(stdout.includes(printedHelpOutput));
});

test('$ mber unknown -> raises error', async (t) => {
  const { stdout } = await shell(`node ${process.cwd()}/cli.js`);

  t.true(stdout.includes('ember unknown command. Available options are:'));
  t.true(stdout.includes(printedHelpOutput));
});
