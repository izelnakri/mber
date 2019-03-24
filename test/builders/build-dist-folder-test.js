import fs from 'fs-extra';
import test from 'ava';
import mockProcessCWD from '../helpers/mock-process-cwd';
import createDummyApp from '../helpers/create-dummy-app';
import buildAssets from '../../lib/builders/build-assets';
import buildDistFolder from '../../lib/builders/build-dist-folder';
import countTime from '../../lib/utils/count-time';
import WorkerPool from '../../lib/worker-pool';
import { TIME_TO_BUILD_DIST_THRESHOLD } from '../helpers/asset-build-thresholds';

const CWD = process.cwd();
const PROJECT_ROOT = `${CWD}/some-app`;
const environmentFunc = require(`${CWD}/ember-app-boilerplate/config/environment.js`);
const INITIAL_BUILD_FILES = ['application.css', 'application.js', 'vendor.js'];
const INDEX_HTML_OUTPUT_PATH = `${PROJECT_ROOT}/dist/index.html`;
const TEST_HTML_OUTPUT_PATH = `${PROJECT_ROOT}/dist/tests.html`;

test.beforeEach(async () => {
  global.MBER_THREAD_POOL = WorkerPool.start();

  await fs.remove(`${CWD}/some-app`);
  await createDummyApp('some-app');
  await Promise.all([
    fs.remove(`${PROJECT_ROOT}/dist`),
    fs.remove(`${PROJECT_ROOT}/tmp`)
  ]);
});

test.afterEach.always(async () => {
  if (await fs.exists(PROJECT_ROOT)) {
    await fs.remove(PROJECT_ROOT);
  }

  global.MBER_THREAD_POOL.workers.forEach((worker) => worker.terminate());
});

test.serial('buildDistFolder() works', async (t) => {
  t.plan(43);

  const mock = mockProcessCWD(PROJECT_ROOT);

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist`)));

  const ENV = environmentFunc('development');

  await buildAssets({
    applicationName: 'some-app',
    cliArguments: { testing: true },
    ENV: ENV
  }, false);

  const timer = countTime();
  const files = await buildDistFolder({
    applicationName: 'some-app',
    ENV: ENV
  });
  const timePassed = timer.stop();

  t.true(files.length === 8);
  t.true(timePassed < TIME_TO_BUILD_DIST_THRESHOLD);

  const fileNames = files.reduce((result, file) => {
    if (!file.fileName.includes('documentation')) {
      result.push(file.fileName);
    }

    return result;
  }, []);
  const outputHTML = (await fs.readFile(INDEX_HTML_OUTPUT_PATH)).toString();
  const fileContents = await Promise.all([
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.css`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/test-support.css`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/vendor.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/test-support.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/tests.js`)
  ]);
  const targetIndexHTMLAssets = fileNames
    .filter((fileName) => {
      return !fileName.includes('tests') && !fileName.includes('test-support');
    });

  await Promise.all(targetIndexHTMLAssets.map((fileName) => {
    const targetFileName = fileName.replace('./', '');

    t.true(outputHTML.includes(targetFileName.replace('dist/', '/')));
  }));

  const testHTML = (await fs.readFile(TEST_HTML_OUTPUT_PATH)).toString();
  const testFileAssetContents = await Promise.all(fileNames.map((fileName) => {
    const targetFileName = fileName.replace('./', '');

    t.true(testHTML.includes(targetFileName.replace('dist/', '/')));

    return fs.readFile(`${PROJECT_ROOT}/${targetFileName}`);
  }));

  testFileAssetContents.forEach((hashedFileContent) => {
    t.truthy(fileContents.find((fileContent) => fileContent.length === hashedFileContent.length));
  });
  files.forEach((file) => {
    t.truthy(!INITIAL_BUILD_FILES.find((fileName) => file.fileName.endsWith(fileName)));
    t.true((file.gzipSize > 0) && (file.gzipSize < file.size));
  });

  t.true(await fs.exists(`${PROJECT_ROOT}/dist/package.json`));

  const assetMap = JSON.parse(await fs.readFile(`${PROJECT_ROOT}/dist/assets/assetMap.json`));

  t.true(assetMap.prepend === '');
  t.true(Object.keys(assetMap.assets).length === 9);
  t.true(assetMap.assets['assets/assetMap.json'] === 'assets/assetMap.json');

  const targetFileNames = fileNames.map((fileName) => fileName.replace('./dist/', ''));

  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/application.css']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/application.js']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/test-support.js']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/test-support.css']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/tests.js']))

  mock.removeMock();
});

test.serial('buildDistFolder() works for different applicationName and memserver mode', async (t) => {
  t.plan(50);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const ENV = environmentFunc('memserver');

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist`)));

  await buildAssets({ ENV: ENV, cliArguments: { testing: true } }, false);
  console.log('BUILDASSETS FINISHED');

  const timer = countTime();
  const files = await buildDistFolder({
    applicationName: 'some-app',
    ENV: ENV
  });
  const timePassed = timer.stop();

  t.true(files.length === 9);
  t.true(timePassed < TIME_TO_BUILD_DIST_THRESHOLD);
  console.log('passed treshold test');

  const fileNames = files.reduce((result, file) => {
    if (!file.fileName.includes('documentation')) {
      result.push(file.fileName);
    }

    return result;
  }, []);
  const outputHTML = (await fs.readFile(INDEX_HTML_OUTPUT_PATH)).toString();
  console.log('reading file contents');
  const allFileContents = await Promise.all([
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.css`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/vendor.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/memserver.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/tests.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/test-support.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/test-support.css`)
  ]);
  const targetIndexHTMLAssets = fileNames
    .filter((fileName) => !fileName.includes('tests') && !fileName.includes('test-support'));

  console.log('read all contents');
  await Promise.all(targetIndexHTMLAssets.map((fileName) => {
    const targetFileName = fileName.replace('./', '');

    t.true(outputHTML.includes(targetFileName.replace('dist/', '/')));
  }));

  console.log('assets are inside index.html test passed');
  const testHTML = (await fs.readFile(TEST_HTML_OUTPUT_PATH)).toString();
  const hashedFileContents = await Promise.all(fileNames.map((fileName) => {
    const targetFileName = fileName.replace('./', '');

    t.true(testHTML.includes(targetFileName.replace('dist/', '/')));

    return fs.readFile(`${PROJECT_ROOT}/${targetFileName}`);
  }));

  hashedFileContents.forEach((hashedFileContent) => {
    t.truthy(allFileContents.find((fileContent) => fileContent.length === hashedFileContent.length));
  });
  files.forEach((file) => {
    t.truthy(!INITIAL_BUILD_FILES.find((fileName) => file.fileName.endsWith(fileName)));
    t.true((file.gzipSize > 0) && (file.gzipSize < file.size));
  });
  console.log('file size tests passes');

  t.true(await fs.exists(`${PROJECT_ROOT}/dist/package.json`));

  const assetMap = JSON.parse(await fs.readFile(`${PROJECT_ROOT}/dist/assets/assetMap.json`));

  t.true(assetMap.prepend === '');
  t.true(Object.keys(assetMap.assets).length === 10);
  t.true(assetMap.assets['assets/assetMap.json'] === 'assets/assetMap.json');

  const targetFileNames = fileNames.map((fileName) => fileName.replace('./dist/', ''));

  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/application.css']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/application.js']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/vendor.js']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/memserver.js']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/test-support.js']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/test-support.css']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/tests.js']))
  console.log('all passes');

  mock.removeMock();
});

test.serial('buildDistFolder() works for production', async (t) => {
  t.plan(25);

  const mock = mockProcessCWD(PROJECT_ROOT);

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist`)));

  const ENV = environmentFunc('production');

  await buildAssets({
    applicationName: 'some-app',
    cliArguments: { testing: true },
    ENV: ENV
  }, false);

  const timer = countTime();
  const files = await buildDistFolder({
    applicationName: 'some-app',
    cliArguments: { testing: true, fastboot: true },
    ENV: ENV
  });
  const timePassed = timer.stop();

  t.true(files.length === 3);
  t.true(timePassed < TIME_TO_BUILD_DIST_THRESHOLD);

  const fileNames = files.map((file) => file.fileName);
  const outputHTML = (await fs.readFile(INDEX_HTML_OUTPUT_PATH)).toString();
  const fileContents = await Promise.all([
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.css`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/vendor.js`),
  ]);
  const hashedFileContents = await Promise.all(fileNames.map((fileName) => {
    const targetFileName = fileName.replace('./', '');

    t.true(outputHTML.includes(targetFileName.replace('dist/', '/')));

    return fs.readFile(`${PROJECT_ROOT}/${targetFileName}`);
  }));

  t.true(!(await fs.exists(TEST_HTML_OUTPUT_PATH)));

  hashedFileContents.forEach((hashedFileContent) => {
    t.truthy(fileContents.find((fileContent) => fileContent.length === hashedFileContent.length));
  });
  files.forEach((file) => {
    t.truthy(!INITIAL_BUILD_FILES.find((fileName) => file.fileName.endsWith(fileName)));

    if (file.size > 5000) {
      t.true((file.gzipSize > 0) && (file.gzipSize < file.size));
    } else {
      t.true((file.gzipSize > 0));
    }
  });

  t.true(await fs.exists(`${PROJECT_ROOT}/dist/package.json`));

  const assetMap = JSON.parse(await fs.readFile(`${PROJECT_ROOT}/dist/assets/assetMap.json`));

  t.true(assetMap.prepend === '');
  t.true(Object.keys(assetMap.assets).length === 4);
  t.true(assetMap.assets['assets/assetMap.json'] === 'assets/assetMap.json');

  const targetFileNames = fileNames.map((fileName) => fileName.replace('./dist/', ''));

  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/application.css']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/application.js']))
  t.falsy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/test-support.js']))
  t.falsy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/test-support.css']))
  t.falsy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/tests.js']))

  mock.removeMock();
});

test.serial('buildDistFolder() works for different applicationName and memserver mode with fastboot: false', async (t) => {
  t.plan(34);

  const mock = mockProcessCWD(PROJECT_ROOT);

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist`)));

  const ENV = Object.assign({}, environmentFunc('memserver'), { modulePrefix: 'some-app' });

  await buildAssets({
    applicationName: 'some-app',
    cliArguments: { fastboot: false, testing: false },
    ENV: ENV
  }, false);

  const timer = countTime();
  const files = await buildDistFolder({
    applicationName: 'some-app',
    cliArguments: { fastboot: false, testing: false },
    ENV: ENV
  });
  const timePassed = timer.stop();

  t.true(files.length === 6);
  t.true(timePassed < TIME_TO_BUILD_DIST_THRESHOLD);

  const fileNames = files.reduce((result, file) => {
    if (!file.fileName.includes('documentation')) {
      result.push(file.fileName);
    }

    return result;
  }, []);
  const outputHTML = (await fs.readFile(INDEX_HTML_OUTPUT_PATH)).toString();
  const fileContents = await Promise.all([
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.css`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/application.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/vendor.js`),
    fs.readFile(`${PROJECT_ROOT}/tmp/assets/memserver.js`)
  ]);
  const hashedFileContents = await Promise.all(fileNames.map((fileName) => {
    const targetFileName = fileName.replace('./', '');

    t.true(outputHTML.includes(targetFileName.replace('dist/', '/')));

    return fs.readFile(`${PROJECT_ROOT}/${targetFileName}`);
  }));

  t.true(!(await fs.exists(TEST_HTML_OUTPUT_PATH)));

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
  t.true(Object.keys(assetMap.assets).length === 7);
  t.true(assetMap.assets['assets/assetMap.json'] === 'assets/assetMap.json');

  const targetFileNames = fileNames.map((fileName) => fileName.replace('./dist/', ''));

  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/application.css']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/application.js']))
  t.truthy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/memserver.js']))
  t.falsy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/test-support.js']))
  t.falsy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/test-support.css']))
  t.falsy(targetFileNames.find((fileName) => fileName === assetMap.assets['assets/tests.js']))

  mock.removeMock();
});

test.serial('buildDistFolder() resets dist', async (t) => {
  t.plan(3);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const ENV = environmentFunc('memserver');

  await fs.mkdirp(`${PROJECT_ROOT}/dist/assets`);
  await fs.writeFile(`${PROJECT_ROOT}/dist/assets/izel.js`, 'console.log("hello")');

  t.true(await fs.exists(`${PROJECT_ROOT}/dist`));
  t.true(await fs.exists(`${PROJECT_ROOT}/dist/assets/izel.js`));

  await buildAssets({ projectRoot: PROJECT_ROOT, ENV: ENV }, false);

  await buildDistFolder({
    applicationName: 'frontend',
    cliArguments: { testing: false },
    ENV: ENV,
  });

  t.true(!(await fs.exists(`${PROJECT_ROOT}/dist/assets/izel.js`)));

  mock.removeMock();
});
