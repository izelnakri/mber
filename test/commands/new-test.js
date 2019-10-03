import test from 'ava';
import fs from 'fs-extra';
import { promisify } from 'util';
import { exec } from 'child_process';

const shell = promisify(exec);
const CWD = process.cwd();

test.beforeEach(async () => {
  await fs.remove('testapp');
});

test.afterEach.always(async () => {
  await fs.remove('testapp');
});

test.serial('$ mber new -> throws error if applicationName not provided', async (t) => {
  const { stdout } = await shell(`node --experimental-modules ${CWD}/cli.js new`);

  t.true(stdout.includes('You forgot to include an application name! Example: mber init example-app'));
});

test.serial('$ mber new -> throws error if applicationName folder already exists', async (t) => {
  await fs.mkdirp('existingapp');

  const { stdout } = await shell(`node --experimental-modules ${CWD}/cli.js new existingapp`);

  t.true(stdout.includes('ember existingapp already exists!'));

  await fs.remove('existingapp');
});

test.serial('$ mber new -> creates', async (t) => {
  const { stdout } = await shell(`node --experimental-modules ${CWD}/cli.js new anotherapp`);

  t.true(stdout.includes('ember creating anotherapp application'));
  [
    '.dockerignore', '.editorconfig', '.eslintrc.js', '.gitignore', 'config', 'index.html',
    'package.json', 'public', 'src', 'tests', 'tmp', 'vendor'
  ].forEach((fileOrFolder) => t.true(stdout.includes(`created ${fileOrFolder}`)));

  t.true(stdout.includes('ember anotherapp ember application created. Next is to do:'));
  t.true(stdout.includes('$ cd anotherapp && npm install && mber s'));

  const directoryEntries = await fs.readdir('anotherapp');

  [
    '.dockerignore', '.editorconfig', '.eslintrc.js', '.gitignore', 'config', 'index.html',
    'package.json', 'public', 'src', 'tests', 'tmp', 'vendor'
  ].forEach((entry) => t.true(directoryEntries.includes(entry)));

  // assertContentForFile(t, '.dockerignore', ``);
  // assertContentForFile(t, '.editorconfig', ``);
  // assertContentForFile(t, '.eslintrc.js', ``);
  // assertContentForFile(t, '.gitignore', ``);

  // assertContentForFile(t, 'config', ``)

  // assertContentForFile(t, 'index.html', ``);
  // assertContentForFile(t, 'package.json', ``);

  // assertContentForFile(t, 'public', ``)

  // assertContentForFile(t, 'src', ``)

  // assertContentForFile(t, 'tests', ``)
  await fs.remove('anotherapp');
});

// function assertContentForFile(t, fileName, content) {
//   t.true(fs.readFile(`testapp/${fileName}`).toString().includes(content));
// }
