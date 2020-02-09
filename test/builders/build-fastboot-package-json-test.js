import fs from 'fs-extra';
import test from 'ava';
import mockProcessCWD from '../helpers/mock-process-cwd.js';
import createExampleENV from '../helpers/create-example-env.js';
import buildFastbootPackageJSON from '../../lib/builders/build-fastboot-package-json.js';

const CWD = process.cwd();
const PROJECT_ROOT = `${CWD}/ember-app-boilerplate`;
const DEFAULT_PACKAGE_JSON_PATH = `${PROJECT_ROOT}/dist/package.json`;
const TMP_PACKAGE_JSON_PATH = `${PROJECT_ROOT}/tmp/package.json`;
const EXAMPLE_ASSET_MAP = {
  'assets/application.js': 'assets/application-df0b6cbf528e46c0aa02b74f24252ffd.js',
  'assets/vendor.js': 'assets/vendor-339579265dd86542580d6f7cc296dac7.js',
  'assets/memserver.js': 'assets/memserver-zaza79265dd86542580d6f7cc296dac7'
};
const SECOND_EXAMPLE_ASSET_MAP = {
  'assets/application.js': 'assets/application-aaaa6cbf528e46c0aa02b74f24252ffd.js',
  'assets/vendor.js': 'assets/vendor-aaaa79265dd86542580d6f7cc296dac7.js'
};
const EXAMPLE_ENV = createExampleENV('development');
const SECOND_EXAMPLE_ENV = createExampleENV('production');

test.beforeEach(async () => {
  await fs.remove(`${PROJECT_ROOT}/tmp`);
  await fs.remove(`${PROJECT_ROOT}/dist`);
  await fs.mkdirp(`${PROJECT_ROOT}/tmp`);
  await fs.mkdirp(`${PROJECT_ROOT}/dist`);
});

test.serial('buildFastbootPackageJSON() works for an assetMaps and ENV', async (t) => {
  t.plan(8);

  const mock = mockProcessCWD(PROJECT_ROOT);

  t.true(!(await fs.exists(DEFAULT_PACKAGE_JSON_PATH)));

  await buildFastbootPackageJSON(EXAMPLE_ASSET_MAP, { ENV: EXAMPLE_ENV });

  const packageJSONBuffer = await fs.readFile(DEFAULT_PACKAGE_JSON_PATH);
  const packageJSON = JSON.parse(packageJSONBuffer.toString());

  t.deepEqual(packageJSON.dependencies, {
    'abortcontroller-polyfill': '^1.4.0',
    'node-fetch': '^2.6.0'
  });
  t.deepEqual(packageJSON.fastboot.appName, 'dummyapp');
  t.deepEqual(packageJSON.fastboot.config.dummyapp, Object.assign(EXAMPLE_ENV, {
    APP: Object.assign(EXAMPLE_ENV.APP, {
      autoboot: false,
      name: EXAMPLE_ENV.modulePrefix,
      version: "0.0.0+b5f80b0d"
    })
  }));
  t.deepEqual(packageJSON.fastboot.manifest, {
    appFiles: [EXAMPLE_ASSET_MAP['assets/application.js']],
    htmlFile: 'index.html',
    vendorFiles: [EXAMPLE_ASSET_MAP['assets/vendor.js']]
  })
  t.deepEqual(packageJSON.fastboot.hostWhitelist, ['^localhost:\\d+$']);
  t.deepEqual(packageJSON.fastboot.moduleWhitelist, [
    'node-fetch', 'abortcontroller-polyfill', 'abortcontroller-polyfill/dist/cjs-ponyfill'
  ]);
  t.true(packageJSON.fastboot.schemaVersion === 3);

  mock.removeMock();
});
test.serial('buildFastbootPackageJSON() works for different dist path and assetMap: tmp and ENV', async (t) => {
  t.plan(8);

  const mock = mockProcessCWD(PROJECT_ROOT);

  t.true(!(await fs.exists(TMP_PACKAGE_JSON_PATH)));

  await buildFastbootPackageJSON(SECOND_EXAMPLE_ASSET_MAP, { ENV: SECOND_EXAMPLE_ENV }, 'tmp');

  const packageJSONBuffer = await fs.readFile(TMP_PACKAGE_JSON_PATH);
  const packageJSON = JSON.parse(packageJSONBuffer.toString());

  t.deepEqual(packageJSON.dependencies, {
    'abortcontroller-polyfill': '^1.4.0',
    'node-fetch': '^2.6.0'
  });
  t.deepEqual(packageJSON.fastboot.appName, 'dummyapp');
  t.deepEqual(packageJSON.fastboot.config.dummyapp, Object.assign(SECOND_EXAMPLE_ENV, {
    APP: Object.assign(SECOND_EXAMPLE_ENV.APP, {
      autoboot: false,
      name: SECOND_EXAMPLE_ENV.modulePrefix,
      version: "0.0.0+b5f80b0d"
    })
  }));
  t.deepEqual(packageJSON.fastboot.manifest, {
    appFiles: [SECOND_EXAMPLE_ASSET_MAP['assets/application.js']],
    htmlFile: 'index.html',
    vendorFiles: [SECOND_EXAMPLE_ASSET_MAP['assets/vendor.js']]
  })
  t.deepEqual(packageJSON.fastboot.hostWhitelist, ['^localhost:\\d+$']);
  t.deepEqual(packageJSON.fastboot.moduleWhitelist, [
    'node-fetch', 'abortcontroller-polyfill', 'abortcontroller-polyfill/dist/cjs-ponyfill'
  ]);
  t.true(packageJSON.fastboot.schemaVersion === 3);

  mock.removeMock();
});
test.serial('buildFastbootPackageJSON() appends memserver path only on memserver mode', async (t) => {
  t.plan(8);

  const targetENV = createExampleENV('demo');
  const mock = mockProcessCWD(PROJECT_ROOT);

  t.true(!(await fs.exists(DEFAULT_PACKAGE_JSON_PATH)));

  await buildFastbootPackageJSON(EXAMPLE_ASSET_MAP, { ENV: targetENV });

  const packageJSONBuffer = await fs.readFile(DEFAULT_PACKAGE_JSON_PATH);
  const packageJSON = JSON.parse(packageJSONBuffer.toString());

  t.deepEqual(packageJSON.dependencies, {
    'abortcontroller-polyfill': '^1.4.0',
    'node-fetch': '^2.6.0'
  });
  t.deepEqual(packageJSON.fastboot.appName, 'dummyapp');
  t.deepEqual(packageJSON.fastboot.config.dummyapp, Object.assign(targetENV, {
    APP: Object.assign(targetENV.APP, {
      autoboot: false,
      name: targetENV.modulePrefix,
      version: "0.0.0+b5f80b0d"
    })
  }));
  t.deepEqual(packageJSON.fastboot.manifest, {
    appFiles: [EXAMPLE_ASSET_MAP['assets/application.js'], EXAMPLE_ASSET_MAP['assets/memserver.js']],
    htmlFile: 'index.html',
    vendorFiles: [EXAMPLE_ASSET_MAP['assets/vendor.js']]
  })
  t.deepEqual(packageJSON.fastboot.hostWhitelist, ['^localhost:\\d+$']);
  t.deepEqual(packageJSON.fastboot.moduleWhitelist, [
    'node-fetch', 'abortcontroller-polyfill', 'abortcontroller-polyfill/dist/cjs-ponyfill'
  ]);
  t.true(packageJSON.fastboot.schemaVersion === 3);

  mock.removeMock();
});
