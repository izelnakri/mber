import fs from 'fs-extra';
import test from 'ava';
import mockProcessCWD from '../helpers/mock-process-cwd';
import buildCSS from '../../lib/builders/build-css.js';

const CWD = process.cwd();
const APPLICATION_CSS_OUTPUT_PATH = `${CWD}/ember-app-boilerplate/tmp/assets/application.css`;
const APPLICATION_CSS_TARGET_BYTE_SIZE = 2150;
const APPLICATION_CSS_COMPRESSED_TARGET_BYTE_SIZE = 1797;

test.beforeEach(async () => {
  await fs.remove(APPLICATION_CSS_OUTPUT_PATH);
});

test.serial('buildCSS() works', async (t) => {
  t.plan(5);

  t.true(!(await fs.exists(APPLICATION_CSS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, size } = await buildCSS();
  const timeTakenForBuild = message.match(/application\.css in \d+ms/g)[0]
    .replace('application.css in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < 500);

  const applicationCSSStats = await fs.stat(APPLICATION_CSS_OUTPUT_PATH);

  t.true(applicationCSSStats.size === APPLICATION_CSS_TARGET_BYTE_SIZE);
  t.true(size === APPLICATION_CSS_TARGET_BYTE_SIZE);

  t.true(/BUILT: application\.css in \d+ms \[0\.00 MB\] Environment: development/g.test(message));

  mock.removeMock();
});
test.serial('buildCSS(development) works', async (t) => {
  t.plan(5);

  t.true(!(await fs.exists(APPLICATION_CSS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, size } = await buildCSS('development');
  const timeTakenForBuild = message.match(/application\.css in \d+ms/g)[0]
    .replace('application.css in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < 500);

  const applicationCSSStats = await fs.stat(APPLICATION_CSS_OUTPUT_PATH);

  t.true(applicationCSSStats.size === APPLICATION_CSS_TARGET_BYTE_SIZE);
  t.true(size === APPLICATION_CSS_TARGET_BYTE_SIZE);

  t.true(/BUILT: application\.css in \d+ms \[0\.00 MB\] Environment: development/g.test(message));

  mock.removeMock();
});
test.serial('buildCSS(custom) works', async (t) => {
  t.plan(5);

  t.true(!(await fs.exists(APPLICATION_CSS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, size } = await buildCSS('custom');
  const timeTakenForBuild = message.match(/application\.css in \d+ms/g)[0]
    .replace('application.css in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < 500);

  const applicationCSSStats = await fs.stat(APPLICATION_CSS_OUTPUT_PATH);

  t.true(applicationCSSStats.size === APPLICATION_CSS_TARGET_BYTE_SIZE);
  t.true(size === APPLICATION_CSS_TARGET_BYTE_SIZE);

  t.true(/BUILT: application\.css in \d+ms \[0\.00 MB\] Environment: custom/g.test(message));

  mock.removeMock();
});
test.serial('buildCSS(production) works', async (t) => {
  t.plan(5);

  t.true(!(await fs.exists(APPLICATION_CSS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, size } = await buildCSS('production');
  const timeTakenForBuild = message.match(/application\.css in \d+ms/g)[0]
    .replace('application.css in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < 500);

  const applicationCSSStats = await fs.stat(APPLICATION_CSS_OUTPUT_PATH);

  t.true(applicationCSSStats.size === APPLICATION_CSS_COMPRESSED_TARGET_BYTE_SIZE);
  t.true(size === APPLICATION_CSS_COMPRESSED_TARGET_BYTE_SIZE);

  t.true(/BUILT: application\.css in \d+ms \[0\.00 MB\] Environment: production/g.test(message));

  mock.removeMock();
});
test.serial('buildCSS(demo) works', async (t) => {
  t.plan(5);

  t.true(!(await fs.exists(APPLICATION_CSS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const { message, size } = await buildCSS('demo');
  const timeTakenForBuild = message.match(/application\.css in \d+ms/g)[0]
    .replace('application.css in ', '')
    .replace('ms', '')

  t.true(Number(timeTakenForBuild) < 500);

  const applicationCSSStats = await fs.stat(APPLICATION_CSS_OUTPUT_PATH);

  t.true(applicationCSSStats.size === APPLICATION_CSS_COMPRESSED_TARGET_BYTE_SIZE);
  t.true(size === APPLICATION_CSS_COMPRESSED_TARGET_BYTE_SIZE);

  t.true(/BUILT: application\.css in \d+ms \[0\.00 MB\] Environment: demo/g.test(message));

  mock.removeMock();
});
test.serial('buildCSS() styles/folder css gets written first, then application css', async (t) => {
  t.plan(3);

  t.true(!(await fs.exists(APPLICATION_CSS_OUTPUT_PATH)));

  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  await buildCSS();

  const applicationCSSBuffer = await fs.readFile(APPLICATION_CSS_OUTPUT_PATH);
  const CSS = applicationCSSBuffer.toString();

  t.true(CSS.startsWith('#test'));
  t.true(CSS.includes('#ember-welcome-page-id-selector'));

  mock.removeMock();
});
