import test from 'ava';
import fs from 'fs-extra';
import mockProcessCWD from '../helpers/mock-process-cwd';
import searchInParentDirectories from '../../lib/utils/search-in-parent-directories';

const CWD = process.cwd();

test.beforeEach(async () => {
  if (await fs.existsSync('online-shop')) {
    await fs.remove('online-shop');
  }

  await fs.mkdirp('online-shop');
  await Promise.all([
    fs.writeFile('online-shop/index.js', '// find me in online-shop/index.js'),
    fs.writeFile('online-shop/details.js', '// find me in online-shop/details.js'),
    fs.mkdirp('online-shop/shoes'),
    fs.mkdirp('online-shop/shirts')
  ]);
  await Promise.all([
    fs.writeFile('online-shop/shoes/shoe.js', '// find me in online-shop/shoes/shoe.js'),
    fs.writeFile('online-shop/shoes/index.js', '// find me in online-shop/shoes/index.js'),
    fs.writeFile('online-shop/shoes/brown.js', '// find me in online-shop/shoes/brown.js'),
    fs.mkdirp('online-shop/shoes/shoe')
  ]);
  await fs.writeFile('online-shop/shoes/shoe/brown.js', '// find me in online-shop/shoes/shoe/brown.js')
});

test.after(async () => {
  if (await fs.exists('online-shop')) {
    await fs.remove('online-shop');
  }
});

test('searchInParentDirectories(directory, file) works for current directory', async (t) => {
  const content = await fs.readFile(searchInParentDirectories(`${CWD}/online-shop/shoes`, 'shoe.js'));

  t.deepEqual(content.toString(), '// find me in online-shop/shoes/shoe.js');
});

test('searchInParentDirectories(directory, file) works for parent directory', async (t) => {
  const content = await fs.readFile(searchInParentDirectories(`${CWD}/online-shop/shoes`, 'details.js'));

  t.deepEqual(content.toString(), '// find me in online-shop/details.js');
});

test('searchInParentDirectories(directory, file) works for 2 level parent directory', async (t) => {
  const content = await fs.readFile(searchInParentDirectories(`${CWD}/online-shop/shoes/shoe`, 'details.js'));

  t.deepEqual(content.toString(), '// find me in online-shop/details.js');
});

test('searchInParentDirectories(directory, file) gets the right files when its duplicate in parents', async (t) => {
  const content = await fs.readFile(searchInParentDirectories(`${CWD}/online-shop/shoes`, 'index.js'));

  t.deepEqual(content.toString(), '// find me in online-shop/shoes/index.js');
});

test('searchInParentDirectories(directory, file) should return undefined when nothing is find', (t) => {
  t.deepEqual(searchInParentDirectories(`${CWD}/online-shop/shoes`, 'lol.js'), undefined);
});

test.serial('searchInParentDirectories(".", file) works for current directory', async (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes`);
  const content = await fs.readFile(searchInParentDirectories('.', 'shoe.js'));

  t.deepEqual(process.cwd(), `${CWD}/online-shop/shoes`);
  t.deepEqual(content.toString(), '// find me in online-shop/shoes/shoe.js');

  mock.removeMock();
});

test.serial('searchInParentDirectories(".", file) works for parent directory', async (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes`);
  const content = await fs.readFile(searchInParentDirectories('.', 'details.js'));

  t.deepEqual(process.cwd(), `${CWD}/online-shop/shoes`);
  t.deepEqual(content.toString(), '// find me in online-shop/details.js');

  mock.removeMock();
});

test.serial('searchInParentDirectories(".", file) works for 2 level parent directory', async (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes/shoe`);
  const content = await fs.readFile(searchInParentDirectories('.', 'details.js'));

  t.deepEqual(process.cwd(), `${CWD}/online-shop/shoes/shoe`);
  t.deepEqual(content.toString(), '// find me in online-shop/details.js');

  mock.removeMock();
});

test.serial('searchInParentDirectories(".", file) gets the right files when its duplicate in parents', async (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes`);
  const content = await fs.readFile(searchInParentDirectories('.', 'index.js'));

  t.deepEqual(process.cwd(), `${CWD}/online-shop/shoes`);
  t.deepEqual(content.toString(), '// find me in online-shop/shoes/index.js');

  mock.removeMock();
});

test('searchInParentDirectories(".", file) should return undefined when nothing is find', (t) => {
  const mock = mockProcessCWD(`${CWD}/online-shop/shoes`);

  t.deepEqual(searchInParentDirectories('.', 'lol.js'), undefined);

  mock.removeMock();
});
