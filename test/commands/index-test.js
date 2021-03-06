import test from 'ava';
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

const shell = promisify(exec);
const VERSION = JSON.parse(fs.readFileSync(`${process.cwd()}/package.json`)).version;
const printedHelpOutput = `[mber CLI v${VERSION}] Usage: mber <command (Default: help)>
mber init | new                     # Sets up the initial ember folder structure
mber serve | server                 # Starts your ember development server [alias: "mber s"]
mber build | b                      # Builds your ember application and outputs to /dist folder
mber test | t                       # Runs your ember tests (--server to run them in browser)
mber compile | transpile [path]     # Compiles/transpiles your provided file or folder path [alias: "mber c"]
mber console                        # Boots your ember application with DOM in a node.js repl
mber generate | g [type] [name]     # Generate ember files for certain abstraction type
mber delete | d [type] [name]       # Remove ember files for certain abstraction type
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
  t.plan(2);

  try {
    await shell(`node ${process.cwd()}/cli.js dasd`);
  } catch ({ stdout }) {
    t.true(stdout.includes('ember unknown command. Available options are:'));
    t.true(stdout.includes(printedHelpOutput));
  }
});
