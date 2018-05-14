import test from 'ava';
import fs from 'fs';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';
import { promisify } from 'util';
import { exec } from 'child_process';

const shell = promisify(exec);
const mkdir = promisify(mkdirp);
const CWD = process.cwd();

test.beforeEach(async () => {
  if (fs.existsSync('testapp')) {
    await rimraf.sync('testapp');
  }
});

test.afterEach.always(async () => {
  if (fs.existsSync('testapp')) {
    await rimraf.sync('testapp');
  }
});

test.serial('$ mber new -> throws error if applicationName not provided', async (t) => {
  const { stdout } = await shell(`node ${CWD}/cli.js new`);

  t.true(stdout.includes('You forgot to include an application name! Example: mber init example-app'));
});

test.serial('$ mber new -> throws error if applicationName folder already exists', async (t) => {
  await mkdir('existingapp');

  const { stdout } = await shell(`node ${CWD}/cli.js new existingapp`);

  t.true(stdout.includes('ember existingapp already exists!'));

  await rimraf.sync('existingapp');
});

test.serial('$ mber new -> creates', async (t) => {
  const { stdout } = await shell(`node ${CWD}/cli.js new anotherapp`);

  t.true(stdout.includes('ember creating anotherapp application'));
  [
    '.dockerignore', '.editorconfig', '.eslintrc.js', '.gitignore', 'config', 'index.html',
    'package.json', 'public', 'src', 'tests', 'tmp', 'vendor'
  ].forEach((fileOrFolder) => t.true(stdout.includes(`created ${fileOrFolder}`)));

  t.true(stdout.includes('ember anotherapp ember application created. Next is to do:'));
  t.true(stdout.includes('$ cd anotherapp && yarn install && mber s'));

  const directoryEntries = fs.readdirSync('anotherapp');

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
  rimraf.sync('anotherapp');
});

function assertContentForFile(t, fileName, content) {
  t.true(fs.readFileSync(`testapp/${fileName}`).toString().includes(content));
}
