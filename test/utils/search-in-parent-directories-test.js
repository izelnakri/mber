import test from 'ava';
import fs from 'fs/promises';
import mockProcessCWD from '../helpers/mock-process-cwd.js';
import searchInParentDirectories from '../../lib/utils/search-in-parent-directories.js';
import pathExists from '../../lib/utils/path-exists.js';

const CWD = process.cwd();

test.beforeEach(async () => {
  if (await pathExists('online-shop')) {
    await fs.rm('online-shop', { recursive: true, force: true });
  }

  await fs.mkdir('online-shop', { recursive: true });
  await Promise.all([
    fs.writeFile('online-shop/index.js', '// find me in online-shop/index.js'),
    fs.writeFile('online-shop/details.js', '// find me in online-shop/details.js'),
    fs.mkdir('online-shop/shoes', { recursive: true }),
    fs.mkdir('online-shop/shirts', { recursive: true })
  ]);
  await Promise.all([
    fs.writeFile('online-shop/shoes/shoe.js', '// find me in online-shop/shoes/shoe.js'),
    fs.writeFile('online-shop/shoes/index.js', '// find me in online-shop/shoes/index.js'),
    fs.writeFile('online-shop/shoes/brown.js', '// find me in online-shop/shoes/brown.js'),
    fs.mkdir('online-shop/shoes/shoe', { recursive: true })
  ]);
  await fs.writeFile('online-shop/shoes/shoe/brown.js', '// find me in online-shop/shoes/shoe/brown.js')
});

test.after(async () => {
  if (await pathExists('online-shop')) {
    await fs.rm('online-shop', { recursive: true, force: true });
  }
});

test.serial('searchInParentDirectories(directory, file) works for current directory', async (t) => {
  const content = await fs.readFile(await searchInParentDirectories(`${CWD}/online-shop/shoes`, 'shoe.js'));

  t.deepEqual(content.toString(), '// find me in online-shop/shoes/shoe.js');
});

test.serial('searchInParentDirectories(directory, file) works for parent directory', async (t) => {
  const content = await fs.readFile(await searchInParentDirectories(`${CWD}/online-shop/shoes`, 'details.js'));

  t.deepEqual(content.toString(), '// find me in online-shop/details.js');
});

test.serial('searchInParentDirectories(directory, file) works for 2 level parent directory', async (t) => {
  const content = await fs.readFile(await searchInParentDirectories(`${CWD}/online-shop/shoes/shoe`, 'details.js'));

  t.deepEqual(content.toString(), '// find me in online-shop/details.js');
});

test.serial('searchInParentDirectories(directory, file) gets the right files when its duplicate in parents', async (t) => {
  const content = await fs.readFile(await searchInParentDirectories(`${CWD}/online-shop/shoes`, 'index.js'));

  t.deepEqual(content.toString(), '// find me in online-shop/shoes/index.js');
});

test.serial('searchInParentDirectories(directory, file) should return undefined when nothing is find', async (t) => {
  t.deepEqual(await searchInParentDirectories(`${CWD}/online-shop/shoes`, 'lol.js'), undefined);
});

test.serial('searchInParentDirectories(".", file) works for current directory', async (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes`);
  const content = await fs.readFile(await searchInParentDirectories('.', 'shoe.js'));

  t.deepEqual(process.cwd(), `${CWD}/online-shop/shoes`);
  t.deepEqual(content.toString(), '// find me in online-shop/shoes/shoe.js');

  mock.removeMock();
});

test.serial('searchInParentDirectories(".", file) works for parent directory', async (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes`);
  const content = await fs.readFile(await searchInParentDirectories('.', 'details.js'));

  t.deepEqual(process.cwd(), `${CWD}/online-shop/shoes`);
  t.deepEqual(content.toString(), '// find me in online-shop/details.js');

  mock.removeMock();
});

test.serial('searchInParentDirectories(".", file) works for 2 level parent directory', async (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes/shoe`);
  const content = await fs.readFile(await searchInParentDirectories('.', 'details.js'));

  t.deepEqual(process.cwd(), `${CWD}/online-shop/shoes/shoe`);
  t.deepEqual(content.toString(), '// find me in online-shop/details.js');

  mock.removeMock();
});

test.serial('searchInParentDirectories(".", file) gets the right files when its duplicate in parents', async (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes`);
  const content = await fs.readFile(await searchInParentDirectories('.', 'index.js'));

  t.deepEqual(process.cwd(), `${CWD}/online-shop/shoes`);
  t.deepEqual(content.toString(), '// find me in online-shop/shoes/index.js');

  mock.removeMock();
});

test.serial('searchInParentDirectories(".", file) should return undefined when nothing is find', async (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes`);

  t.deepEqual(await searchInParentDirectories('.', 'lol.js'), undefined);

  mock.removeMock();
});
