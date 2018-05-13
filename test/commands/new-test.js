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

test.afterEach.always(() => {
  if (fs.existsSync('testapp')) {
    rimraf.sync('testapp');
  }
});

test.serial('$ mber new -> throws error if applicationName not provided', async (t) => {
  const { stdout } = await shell(`node ${CWD}/cli.js new`);

  t.true(stdout.includes('You forgot to include an application name! Example: mber init example-app'));
});

test.serial('$ mber new -> throws error if applicationName folder already exists', async (t) => {
  if (!fs.existsSync('testapp')) {
    await mkdir('testapp');
  }

  const { stdout } = await shell(`node ${process.cwd()}/cli.js new testapp`);

  t.true(stdout.includes('ember testapp already exists!'));
});

test.serial('$ mber new -> creates', async (t) => {
  if (fs.existsSync('testapp')) {
    rimraf.sync('testapp');
  }

  const { stdout } = await shell(`node ${CWD}/cli.js new testapp`);

  t.true(stdout.includes(`ember creating testapp application
created .cache
created .dockerignore
created .editorconfig
created .eslintrc.js
created .gitignore
created TODO
created config
created dist
created index.html
created package.json
created public
created src
created tests
created tmp
created vendor
ember testapp ember application created. Next is to do:
$ cd testapp && yarn install && mber s`));

  const directoryEntries = fs.readdirSync('testapp');

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
});

function assertContentForFile(t, fileName, content) {
  t.true(fs.readFileSync(`testapp/${fileName}`).toString().includes(content));
}
