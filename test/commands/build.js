import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import test from 'ava';
import rimraf from 'rimraf';
import createDummyApp from '../helpers/create-dummy-app';

const shell = promisify(exec);
const CWD = process.cwd();

test.beforeEach(() => {
  if (fs.existsSync('testapp')) {
    rimraf.sync('testapp');
  }
});

test.afterEach.always(() => {
  if (fs.existsSync('testapp')) {
    rimraf.sync('testapp');
  }
});

// TODO: if parent doesnt exist throw error
// TODO: do all the build both on the parent dir and current dir
// TODO: check stdout, file exists and maybe the contents and the filesize
// TODO: test environments
test.serial('$ mber build -> builds successfully', async (t) => {
  await createDummyApp();
  const { stdout, stderr } = await shell(`cd testapp && node ${CWD}/cli.js build`);

  console.log('stdout is', stdout);
  console.log('stderr is', stderr);
  // check size and content length > 0

  // load the js and assert that it has Ember, Ember.Object, jQuery, requirejs, require, define and DS
  // size checks

  t.true(true);
});


// TODO: test production build

// TODO: test test build
