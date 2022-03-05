import fs from 'fs/promises';
import test from 'ava';
import mockProcessCWD from '../helpers/mock-process-cwd.js';
import buildCSS from '../../lib/builders/build-css.js';
import { APPLICATION_CSS_BUILD_TIME_THRESHOLD } from '../helpers/asset-build-thresholds.js';
import { formatSize } from '../../lib/utils/asset-reporter.js';
import pathExists from '../../lib/utils/path-exists.js';

const CWD = process.cwd();
const PROJECT_ROOT = `${CWD}/ember-app-boilerplate`;
const APPLICATION_CSS_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/application.css`;
const APPLICATION_CSS_TARGET_BYTE_SIZE = '2.15 kB';
const APPLICATION_CSS_COMPRESSED_TARGET_BYTE_SIZE = '1.78 kB';

test.beforeEach(async () => {
  await fs.rm(`${PROJECT_ROOT}/tmp`, { recursive: true, force: true });
  await fs.mkdir(`${PROJECT_ROOT}/tmp/assets`, { recursive: true });
});

test.serial('buildCSS() works', async (t) => {
  t.plan(5);

  t.true(!(await pathExists(APPLICATION_CSS_OUTPUT_PATH)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { message, size } = await buildCSS();
  const timeTakenForBuild = message.match(/application\.css in \d+ms/g)[0]
    .replace('application.css in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < APPLICATION_CSS_BUILD_TIME_THRESHOLD);

  const applicationCSSStats = await fs.stat(APPLICATION_CSS_OUTPUT_PATH);

  t.true(formatSize(applicationCSSStats.size) === APPLICATION_CSS_TARGET_BYTE_SIZE);
  t.true(formatSize(size) === APPLICATION_CSS_TARGET_BYTE_SIZE);

  t.true(/BUILT: application\.css in \d+ms \[2\.15 kB\] Environment: development/g.test(message));

  mock.removeMock();
});
test.serial('buildCSS(development) works', async (t) => {
  t.plan(5);

  t.true(!(await pathExists(APPLICATION_CSS_OUTPUT_PATH)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { message, size } = await buildCSS({
    ENV: { environment: 'development', modulePrefix: 'frontend' }
  });
  const timeTakenForBuild = message.match(/application\.css in \d+ms/g)[0]
    .replace('application.css in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < APPLICATION_CSS_BUILD_TIME_THRESHOLD);

  const applicationCSSStats = await fs.stat(APPLICATION_CSS_OUTPUT_PATH);

  t.true(formatSize(applicationCSSStats.size) === APPLICATION_CSS_TARGET_BYTE_SIZE);
  t.true(formatSize(size) === APPLICATION_CSS_TARGET_BYTE_SIZE);

  t.true(/BUILT: application\.css in \d+ms \[2\.15 kB\] Environment: development/g.test(message));

  mock.removeMock();
});
test.serial('buildCSS(custom) works', async (t) => {
  t.plan(5);

  t.true(!(await pathExists(APPLICATION_CSS_OUTPUT_PATH)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { message, size } = await buildCSS({
    ENV: { environment: 'custom', modulePrefix: 'frontend' }
  });
  const timeTakenForBuild = message.match(/application\.css in \d+ms/g)[0]
    .replace('application.css in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < APPLICATION_CSS_BUILD_TIME_THRESHOLD);

  const applicationCSSStats = await fs.stat(APPLICATION_CSS_OUTPUT_PATH);

  t.true(formatSize(applicationCSSStats.size) === APPLICATION_CSS_TARGET_BYTE_SIZE);
  t.true(formatSize(size) === APPLICATION_CSS_TARGET_BYTE_SIZE);

  t.true(/BUILT: application\.css in \d+ms \[2\.15 kB\] Environment: custom/g.test(message));

  mock.removeMock();
});
test.serial('buildCSS(production) works', async (t) => {
  t.plan(5);

  t.true(!(await pathExists(APPLICATION_CSS_OUTPUT_PATH)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { message, size } = await buildCSS({
    ENV: { environment: 'production', modulePrefix: 'frontend' }
  });
  const timeTakenForBuild = message.match(/application\.css in \d+ms/g)[0]
    .replace('application.css in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < APPLICATION_CSS_BUILD_TIME_THRESHOLD);

  const applicationCSSStats = await fs.stat(APPLICATION_CSS_OUTPUT_PATH);

  console.log(applicationCSSStats.size);
  t.true(formatSize(applicationCSSStats.size) === APPLICATION_CSS_COMPRESSED_TARGET_BYTE_SIZE);
  t.true(formatSize(size) === APPLICATION_CSS_COMPRESSED_TARGET_BYTE_SIZE);

  t.true(/BUILT: application\.css in \d+ms \[1\.78 kB\] Environment: production/g.test(message));

  mock.removeMock();
});
test.serial('buildCSS(demo) works', async (t) => {
  t.plan(5);

  t.true(!(await pathExists(APPLICATION_CSS_OUTPUT_PATH)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { message, size } = await buildCSS({
    ENV: { environment: 'demo', modulePrefix: 'frontend' }
  });
  const timeTakenForBuild = message.match(/application\.css in \d+ms/g)[0]
    .replace('application.css in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < APPLICATION_CSS_BUILD_TIME_THRESHOLD);

  const applicationCSSStats = await fs.stat(APPLICATION_CSS_OUTPUT_PATH);

  t.true(formatSize(applicationCSSStats.size) === APPLICATION_CSS_COMPRESSED_TARGET_BYTE_SIZE);
  t.true(formatSize(size) === APPLICATION_CSS_COMPRESSED_TARGET_BYTE_SIZE);

  t.true(/BUILT: application\.css in \d+ms \[1\.78 kB\] Environment: demo/g.test(message));

  mock.removeMock();
});
test.serial('buildCSS() styles/folder css gets written first, then application css', async (t) => {
  t.plan(3);

  t.true(!(await pathExists(APPLICATION_CSS_OUTPUT_PATH)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  await buildCSS();

  const applicationCSSBuffer = await fs.readFile(APPLICATION_CSS_OUTPUT_PATH);
  const CSS = applicationCSSBuffer.toString();

  t.true(CSS.startsWith('#test'));
  t.true(CSS.includes('#ember-welcome-page-id-selector'));

  mock.removeMock();
});
