import fs from 'fs-extra';
import test from 'ava';
import mockProcessCWD from '../helpers/mock-process-cwd';
import createDummyApp from '../helpers/create-dummy-app';
import buildAssets from '../../lib/builders/build-assets';
import buildDistFolder from '../../lib/builders/build-dist-folder';
import countTime from '../../lib/utils/count-time';

const CWD = process.cwd();
const PROJECT_ROOT = `${CWD}/myapp`;
const environmentFunc = require(`${CWD}/ember-app-boilerplate/config/environment.js`);
const TIME_TO_BUILD_DIST_TRESHOLD = 1000;
const INITIAL_BUILD_FILES = ['application.css', 'application.js', 'vendor.js'];
const INDEX_HTML_OUTPUT_PATH = `${PROJECT_ROOT}/dist/index.html`;

test.beforeEach(async () => {
  await fs.remove(`${CWD}/myapp`);
  await createDummyApp('myapp');
  await Promise.all([
    fs.remove(`${PROJECT_ROOT}/dist`),
    fs.remove(`${PROJECT_ROOT}/tmp`)
  ]);
});

test.afterEach.always(async () => {
  if (await fs.exists(PROJECT_ROOT)) {
    await fs.remove(PROJECT_ROOT);
  }
});

test.serial('buildDistFolder() works', async (t) => {
  t.plan(22);

  const mock = mockProcessCWD(PROJECT_ROOT);

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist`)));
  const ENV = environmentFunc('development');

  await buildAssets(PROJECT_ROOT, { ENV: ENV, entrypoint: `${PROJECT_ROOT}/index.html` });

  const timer = countTime();
  const files = await buildDistFolder(`${PROJECT_ROOT}/tmp/index.html`, {
    applicationName: 'myapp',
    ENV: ENV
  });
  const timePassed = timer.stop();

  t.true(files.length === 3);
  t.true(timePassed < TIME_TO_BUILD_DIST_TRESHOLD);

  const fileNames = files.map((file) => file.fileName);
  const outputHTML = (await fs.readFile(INDEX_HTML_OUTPUT_PATH)).toString();
  const fileContents = await Promise.all([
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.css`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/vendor.js`)
  ]);
  const hashedFileContents = await Promise.all(fileNames.map((fileName) => {
    const targetFileName = fileName.replace('./', '');

    t.true(outputHTML.includes(targetFileName.replace('dist/', '/')));

    return fs.readFile(`${PROJECT_ROOT}/${targetFileName}`);
  }));

  hashedFileContents.forEach((hashedFileContent) => {
    t.truthy(fileContents.find((fileContent) => fileContent.length === hashedFileContent.length));
  });
  files.forEach((file) => {
    t.truthy(!INITIAL_BUILD_FILES.find((fileName) => file.fileName.endsWith(fileName)));
    t.true((file.gzipSize > 0) && (file.gzipSize < file.size));
  });

  t.true(await fs.exists(`${PROJECT_ROOT}/dist/package.json`));

  const assetMap = JSON.parse(await fs.readFile(`${PROJECT_ROOT}/dist/assets/assetMap.json`));

  t.true(assetMap.prepend === '');
  t.true(Object.keys(assetMap.assets).length === 4);
  t.true(assetMap.assets['assets/assetMap.json'] === 'assets/assetMap.json');

  const targetFileNames = fileNames.map((fileName) => fileName.replace('./dist/', ''));

  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/application.css']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/application.js']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/vendor.js']))

  mock.removeMock();
});
test.serial('buildDistFolder() works for different applicationName and memserver mode', async (t) => {
  t.plan(27);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const ENV = environmentFunc('memserver');

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist`)));

  await buildAssets(PROJECT_ROOT, { ENV: ENV, entrypoint: `${PROJECT_ROOT}/index.html` });

  const timer = countTime();
  const files = await buildDistFolder(`${PROJECT_ROOT}/tmp/index.html`, {
    applicationName: 'myapp',
    ENV: ENV
  });
  const timePassed = timer.stop();

  t.true(files.length === 4);
  t.true(timePassed < TIME_TO_BUILD_DIST_TRESHOLD);

  const fileNames = files.map((file) => file.fileName);
  const outputHTML = (await fs.readFile(INDEX_HTML_OUTPUT_PATH)).toString();
  const fileContents = await Promise.all([
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.css`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/vendor.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/memserver.js`),
  ]);
  const hashedFileContents = await Promise.all(fileNames.map((fileName) => {
    const targetFileName = fileName.replace('./', '');

    t.true(outputHTML.includes(targetFileName.replace('dist/', '/')));

    return fs.readFile(`${PROJECT_ROOT}/${targetFileName}`);
  }));

  hashedFileContents.forEach((hashedFileContent) => {
    t.truthy(fileContents.find((fileContent) => fileContent.length === hashedFileContent.length));
  });
  files.forEach((file) => {
    t.truthy(!INITIAL_BUILD_FILES.find((fileName) => file.fileName.endsWith(fileName)));
    t.true((file.gzipSize > 0) && (file.gzipSize < file.size));
  });

  t.true(await fs.exists(`${PROJECT_ROOT}/dist/package.json`));

  const assetMap = JSON.parse(await fs.readFile(`${PROJECT_ROOT}/dist/assets/assetMap.json`));

  t.true(assetMap.prepend === '');
  t.true(Object.keys(assetMap.assets).length === 5);
  t.true(assetMap.assets['assets/assetMap.json'] === 'assets/assetMap.json');

  const targetFileNames = fileNames.map((fileName) => fileName.replace('./dist/', ''));

  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/application.css']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/application.js']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/vendor.js']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/memserver.js']))

  mock.removeMock();
});
test.serial('buildDistFolder() works for fastboot: false', async (t) => {
  t.plan(22);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const ENV = environmentFunc('development');

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist`)));

  await buildAssets(PROJECT_ROOT, { ENV: ENV, entrypoint: `${PROJECT_ROOT}/index.html` });

  const timer = countTime();
  const files = await buildDistFolder(`${PROJECT_ROOT}/tmp/index.html`, {
    applicationName: 'myapp',
    ENV: ENV
  }, { fastboot: false });
  const timePassed = timer.stop();

  t.true(files.length === 3);
  t.true(timePassed < TIME_TO_BUILD_DIST_TRESHOLD);

  const fileNames = files.map((file) => file.fileName);
  const outputHTML = (await fs.readFile(INDEX_HTML_OUTPUT_PATH)).toString();
  const fileContents = await Promise.all([
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.css`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/vendor.js`)
  ]);
  const hashedFileContents = await Promise.all(fileNames.map((fileName) => {
    const targetFileName = fileName.replace('./', '');

    t.true(outputHTML.includes(targetFileName.replace('dist/', '/')));

    return fs.readFile(`${PROJECT_ROOT}/${targetFileName}`);
  }));

  hashedFileContents.forEach((hashedFileContent) => {
    t.truthy(fileContents.find((fileContent) => fileContent.length === hashedFileContent.length));
  });
  files.forEach((file) => {
    t.truthy(!INITIAL_BUILD_FILES.find((fileName) => file.fileName.endsWith(fileName)));
    t.true((file.gzipSize > 0) && (file.gzipSize < file.size));
  });

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist/package.json`)));

  const assetMap = JSON.parse(await fs.readFile(`${PROJECT_ROOT}/dist/assets/assetMap.json`));

  t.true(assetMap.prepend === '');
  t.true(Object.keys(assetMap.assets).length === 4);
  t.truthy(assetMap.assets['assets/assetMap.json'] === 'assets/assetMap.json');

  const targetFileNames = fileNames.map((fileName) => fileName.replace('./dist/', ''));

  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/application.css']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/application.js']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/vendor.js']))

  mock.removeMock();

});
// test.serial('buildDistFolder() works for different applicationName and memserver mode with fastboot: false', async (t) => {
//
// });

// test.serial('buildDistFolder() resets dist when it exists or doesnt exists')

// NOTE:
// different index.html endpoints(one from /tmp one from /dist)
// different buildConfig( { ENV, applicationName })
// test that buildDist resets /dist folder
