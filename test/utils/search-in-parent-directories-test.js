import test from 'ava';
import fs from 'fs';
import { promisify } from 'util';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import mockProcessCWD from '../helpers/mock-process-cwd';
import searchInParentDirectories from '../../lib/utils/search-in-parent-directories';

const CWD = process.cwd();
const mkdir = promisify(mkdirp);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

test.beforeEach(async () => { // TODO: move this to before
  if (fs.existsSync('online-shop')) {
    await rimraf.sync('online-shop');
  }

  await mkdir('online-shop');
  await Promise.all([
    writeFileAsync('online-shop/index.js', '// find me in online-shop/index.js'),
    writeFileAsync('online-shop/details.js', '// find me in online-shop/details.js'),
    mkdir('online-shop/shoes'),
    mkdir('online-shop/shirts')
  ]);
  await Promise.all([
    writeFileAsync('online-shop/shoes/shoe.js', '// find me in online-shop/shoes/shoe.js'),
    writeFileAsync('online-shop/shoes/index.js', '// find me in online-shop/shoes/index.js'),
    writeFileAsync('online-shop/shoes/brown.js', '// find me in online-shop/shoes/brown.js'),
    mkdir('online-shop/shoes/shoe')
  ]);
  await writeFileAsync('online-shop/shoes/shoe/brown.js', '// find me in online-shop/shoes/shoe/brown.js')
});

test.after(async () => {
  if (fs.existsSync('online-shop')) {
    await rimraf.sync('online-shop');
  }
});

test('searchInParentDirectories(directory, file) works for current directory', async (t) => {
  const content = await readFileAsync(searchInParentDirectories(`${CWD}/online-shop/shoes`, 'shoe.js'));

  t.deepEqual(content.toString(), '// find me in online-shop/shoes/shoe.js');
});

test('searchInParentDirectories(directory, file) works for parent directory', async (t) => {
  const content = await readFileAsync(searchInParentDirectories(`${CWD}/online-shop/shoes`, 'details.js'));

  t.deepEqual(content.toString(), '// find me in online-shop/details.js');
});

test('searchInParentDirectories(directory, file) works for 2 level parent directory', async (t) => {
  const content = await readFileAsync(searchInParentDirectories(`${CWD}/online-shop/shoes/shoe`, 'details.js'));

  t.deepEqual(content.toString(), '// find me in online-shop/details.js');
});

test('searchInParentDirectories(directory, file) gets the right files when its duplicate in parents', async (t) => {
  const content = await readFileAsync(searchInParentDirectories(`${CWD}/online-shop/shoes`, 'index.js'));

  t.deepEqual(content.toString(), '// find me in online-shop/shoes/index.js');
});

test('searchInParentDirectories(directory, file) should return undefined when nothing is find', (t) => {
  t.deepEqual(searchInParentDirectories(`${CWD}/online-shop/shoes`, 'lol.js'), undefined);
});

test.serial('searchInParentDirectories(".", file) works for current directory', async (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes`);
  const content = await readFileAsync(searchInParentDirectories('.', 'shoe.js'));

  t.deepEqual(process.cwd(), `${CWD}/online-shop/shoes`);
  t.deepEqual(content.toString(), '// find me in online-shop/shoes/shoe.js');

  mock.removeMock();
});

test.serial('searchInParentDirectories(".", file) works for parent directory', async (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes`);
  const content = await readFileAsync(searchInParentDirectories('.', 'details.js'));

  t.deepEqual(process.cwd(), `${CWD}/online-shop/shoes`);
  t.deepEqual(content.toString(), '// find me in online-shop/details.js');

  mock.removeMock();
});

test.serial('searchInParentDirectories(".", file) works for 2 level parent directory', async (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes/shoe`);
  const content = await readFileAsync(searchInParentDirectories('.', 'details.js'));

  t.deepEqual(process.cwd(), `${CWD}/online-shop/shoes/shoe`);
  t.deepEqual(content.toString(), '// find me in online-shop/details.js');

  mock.removeMock();
});

test.serial('searchInParentDirectories(".", file) gets the right files when its duplicate in parents', async (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes`);
  const content = await readFileAsync(searchInParentDirectories('.', 'index.js'));

  t.deepEqual(process.cwd(), `${CWD}/online-shop/shoes`);
  t.deepEqual(content.toString(), '// find me in online-shop/shoes/index.js');

  mock.removeMock();
});

test('searchInParentDirectories(".", file) should return undefined when nothing is find', (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes`);

  t.deepEqual(searchInParentDirectories('.', 'lol.js'), undefined);

  mock.removeMock();
});
