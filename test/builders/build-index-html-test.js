import fs from 'fs-extra';
import test from 'ava';
import buildIndexHTML from '../../lib/builders/build-index-html.js';
import mockProcessCWD from '../helpers/mock-process-cwd.js';

const CWD = process.cwd();
const PROJECT_ROOT = `${CWD}/ember-app-boilerplate`;
const DEFAULT_ENDPOINT = `${PROJECT_ROOT}/index.html`;
const OUTPUT_HTML_PATH = `${PROJECT_ROOT}/tmp/index.html`;
const OUTPUT_TESTS_PATH = `${PROJECT_ROOT}/tmp/tests.html`;

test.beforeEach(async () => {
  await fs.remove(`${PROJECT_ROOT}/tmp`);
  await fs.mkdirp(`${PROJECT_ROOT}/tmp`);
});

test.serial('buildIndexHTML() works', async (t) => {
  t.plan(11);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const result = await buildIndexHTML(DEFAULT_ENDPOINT);

  t.true(result);

  const html = (await fs.readFile(OUTPUT_HTML_PATH)).toString();

  t.true(html.includes('assets/application.css'));
  t.true(html.includes('assets/application.js'));
  t.true(html.includes('assets/vendor.js'));
  t.true(!html.includes('assets/test-support.css'));
  t.true(!html.includes('assets/test-support.js'));
  t.true(!html.includes('assets/tests.js'));
  t.true(!html.includes('assets/memserver.js'));
  t.true(html.includes('<!-- EMBER_CLI_FASTBOOT_TITLE -->'));
  t.true(html.includes('<!-- EMBER_CLI_FASTBOOT_HEAD -->'));
  t.true(html.includes('<!-- EMBER_CLI_FASTBOOT_BODY -->'));

  mock.removeMock();
});

test.serial('buildIndexHTML() works for different endpoint', async (t) => {
  t.plan(8);

  const mock = mockProcessCWD(PROJECT_ROOT);
  const result = await buildIndexHTML(`${PROJECT_ROOT}/tests/index.html`);

  t.true(result);

  const html = (await fs.readFile(OUTPUT_TESTS_PATH)).toString();

  t.true(html.includes('assets/application.css'));
  t.true(html.includes('assets/application.js'));
  t.true(html.includes('assets/vendor.js'));
  t.true(!html.includes('assets/memserver.js'));
  t.true(html.includes('assets/test-support.css'));
  t.true(html.includes('assets/test-support.js'));
  t.true(html.includes('assets/tests.js'));

  mock.removeMock();
});

test.serial(
  'buildIndexHTML() works for different application, indexHTMLInjections and with memserver',
  async (t) => {
    t.plan(12);

    const GOOGLE_ANALYTICS_INJECTION = "<script>console.log('googleAnalytics comes here')</script>";
    const mock = mockProcessCWD(PROJECT_ROOT);
    const result = await buildIndexHTML(DEFAULT_ENDPOINT, {
      ENV: { modulePrefix: 'izelapp', memserver: { enabled: true } },
      indexHTMLInjections: { googleAnalytics: GOOGLE_ANALYTICS_INJECTION }
    });

    t.true(result);

    const html = (await fs.readFile(OUTPUT_HTML_PATH)).toString();

    t.true(html.includes('assets/application.css'));
    t.true(html.includes('assets/application.js'));
    t.true(html.includes('assets/vendor.js'));
    t.true(!html.includes('assets/test-support.css'));
    t.true(!html.includes('assets/test-support.js'));
    t.true(!html.includes('assets/tests.js'));
    t.true(html.includes('assets/memserver.js'));
    t.true(html.includes('<!-- EMBER_CLI_FASTBOOT_TITLE -->'));
    t.true(html.includes('<!-- EMBER_CLI_FASTBOOT_HEAD -->'));
    t.true(html.includes('<!-- EMBER_CLI_FASTBOOT_BODY -->'));
    t.true(html.includes(GOOGLE_ANALYTICS_INJECTION));

    mock.removeMock();
  }
);
