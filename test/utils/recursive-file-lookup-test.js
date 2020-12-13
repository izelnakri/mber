import test from 'ava';
import fs from 'fs/promises';
import lookup from '../../lib/utils/recursive-file-lookup.js';
import pathExists from '../../lib/utils/path-exists.js';

const CWD = process.cwd();

test.before(async () => {
  if (await pathExists('online-shop')) {
    await fs.rmdir('online-shop', { recursive: true });
  }

  await fs.mkdir('online-shop', { recursive: true });
  await Promise.all([
    fs.writeFile('online-shop/index.js', '// find me in online-shop/index.js'),
    fs.writeFile('online-shop/details.js', '// find me in online-shop/details.js'),
    fs.writeFile('online-shop/details.hbs', '// find me in online-shop/details.hbs'),
    fs.mkdir('online-shop/shoes', { recursive: true }),
    fs.mkdir('online-shop/shirts', { recursive: true })
  ]);
  await Promise.all([
    fs.writeFile('online-shop/shoes/shoe.js', '// find me in online-shop/shoes/shoe.js'),
    fs.writeFile('online-shop/shoes/index.js', '// find me in online-shop/shoes/index.js'),
    fs.writeFile('online-shop/shoes/brown.js', '// find me in online-shop/shoes/brown.js'),
    fs.writeFile('online-shop/shoes/brown.hbs', '// find me in online-shop/shoes/brown.hbs'),
    fs.mkdir('online-shop/shoes/shoe', { recursive: true })
  ]);
  await fs.writeFile('online-shop/shoes/shoe/brown.js', '// find me in online-shop/shoes/shoe/brown.js')
});

test.after(async () => {
  if (await pathExists('online-shop')) {
    await fs.rmdir('online-shop', { recursive: true });
  }
});

test('lookup() works for .js and .hbs by default', async (t) => {
  const onlineShopFiles = await lookup(`${CWD}/online-shop`);
  const shoesFiles = await lookup(`${CWD}/online-shop/shoes`);
  const shoeFiles = await lookup(`${CWD}/online-shop/shoes/shoe`);

  t.deepEqual(onlineShopFiles, [
    `${CWD}/online-shop/details.hbs`, `${CWD}/online-shop/details.js`,
    `${CWD}/online-shop/index.js`, `${CWD}/online-shop/shoes/brown.hbs`,
    `${CWD}/online-shop/shoes/brown.js`, `${CWD}/online-shop/shoes/index.js`,
    `${CWD}/online-shop/shoes/shoe.js`, `${CWD}/online-shop/shoes/shoe/brown.js`
  ]);
  t.deepEqual(shoesFiles, [
    `${CWD}/online-shop/shoes/brown.hbs`, `${CWD}/online-shop/shoes/brown.js`,
    `${CWD}/online-shop/shoes/index.js`, `${CWD}/online-shop/shoes/shoe.js`,
    `${CWD}/online-shop/shoes/shoe/brown.js`
  ]);
  t.deepEqual(shoeFiles, [
    `${CWD}/online-shop/shoes/shoe/brown.js`
  ]);
});

test('lookup() returns empty array when there are no files', async (t) => {
  const shirtFiles = await lookup(`${CWD}/online-shop/shirts`);

  t.deepEqual(shirtFiles, []);
});

test('lookup(folderName, extensions) works for .js and .hbs', async (t) => {
  const onlineShopJSFiles = await lookup(`${CWD}/online-shop`, 'js');
  const onlineShopHBSFiles = await lookup(`${CWD}/online-shop`, 'hbs');
  const onlineShopFiles = await lookup(`${CWD}/online-shop`, ['js', 'hbs']);
  const shoesJSFiles = await lookup(`${CWD}/online-shop/shoes`, 'js');
  const shoesHBSFiles = await lookup(`${CWD}/online-shop/shoes`, 'hbs');
  const shoesFiles = await lookup(`${CWD}/online-shop/shoes`, ['js', 'hbs']);
  const shoeFiles = await lookup(`${CWD}/online-shop/shoes/shoe`, ['js', 'hbs']);

  t.deepEqual(onlineShopJSFiles, [
    `${CWD}/online-shop/details.js`, `${CWD}/online-shop/index.js`,
    `${CWD}/online-shop/shoes/brown.js`, `${CWD}/online-shop/shoes/index.js`,
    `${CWD}/online-shop/shoes/shoe.js`, `${CWD}/online-shop/shoes/shoe/brown.js`
  ]);
  t.deepEqual(onlineShopHBSFiles, [
    `${CWD}/online-shop/details.hbs`, `${CWD}/online-shop/shoes/brown.hbs`,
  ]);
  t.deepEqual(onlineShopFiles, [
    `${CWD}/online-shop/details.hbs`, `${CWD}/online-shop/details.js`,
    `${CWD}/online-shop/index.js`, `${CWD}/online-shop/shoes/brown.hbs`,
    `${CWD}/online-shop/shoes/brown.js`, `${CWD}/online-shop/shoes/index.js`,
    `${CWD}/online-shop/shoes/shoe.js`, `${CWD}/online-shop/shoes/shoe/brown.js`
  ]);
  t.deepEqual(shoesJSFiles, [
    `${CWD}/online-shop/shoes/brown.js`, `${CWD}/online-shop/shoes/index.js`,
    `${CWD}/online-shop/shoes/shoe.js`, `${CWD}/online-shop/shoes/shoe/brown.js`
  ]);
  t.deepEqual(shoesHBSFiles, [`${CWD}/online-shop/shoes/brown.hbs`]);
  t.deepEqual(shoesFiles, [
    `${CWD}/online-shop/shoes/brown.hbs`, `${CWD}/online-shop/shoes/brown.js`,
    `${CWD}/online-shop/shoes/index.js`, `${CWD}/online-shop/shoes/shoe.js`,
    `${CWD}/online-shop/shoes/shoe/brown.js`
  ]);
  t.deepEqual(shoeFiles, [`${CWD}/online-shop/shoes/shoe/brown.js`]);
});

test('lookup(folderName, extensions) works for .hbs when there are no files', async (t) => {
  const shoeFiles = await lookup(`${CWD}/online-shop/shoes/shoe`, 'hbs');
  const shirtFiles = await lookup(`${CWD}/online-shop/shirts`, 'hbs');

  t.deepEqual(shoeFiles, []);
  t.deepEqual(shirtFiles, []);
});

test('lookup(folderName, extensions) works for .js when there are no files', async (t) => {
  const shirtFiles = await lookup(`${CWD}/online-shop/shirts`, 'js');

  t.deepEqual(shirtFiles, []);
});
