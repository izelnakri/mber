import test from 'ava';
import { promisify } from 'util';
import { exec } from 'child_process';

const shell = promisify(exec);

// // execute new with all the files in the readdirSync + contents check + stdout
// // cannot call without applicationName
//
// // if applicationName exists it should throw error
// // if applicationName exists in lower level directory it should throw error

// TODO: remove testapp directory before and after each

test('$ mber new -> creates', (t) => {
  // TODO: change directory
  const { stdout } = await shell(`node ${process.cwd()}/cli.js new`);

  console.log('stdout is', stdout);

  // TODO: stdout check
  // TODO: fs.readdirSync
  // TODO: content check
  t.true(true);
});

// test('$ mber new -> throws error if applicationName folder already exists', (t) => {
// });
//
// test('$ mber new -> throws error if applicationName folder already exists in a parent dir', (t) => {
// });
