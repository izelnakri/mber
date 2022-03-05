import fs from 'fs/promises';
import test from 'ava';
import codeIncludesAMDModule from '../helpers/code-includes-amd-module.js';
import mockProcessCWD from '../helpers/mock-process-cwd.js';
import buildApplication from '../../lib/builders/build-application.js';
import WorkerPool from '../../lib/worker-pool/index.js';
import pathExists from '../../lib/utils/path-exists.js';
import { APPLICATION_JS_BUILD_TIME_THRESHOLD } from '../helpers/asset-build-thresholds.js';
import {
  APPLICATION_JS_TARGET_BYTE_SIZE,
  APPLICATION_JS_COMPRESSED_TARGET_BYTE_SIZE
} from '../helpers/asset-sizes.js';

const CWD = process.cwd();
const PROJECT_ROOT = `${CWD}/ember-app-boilerplate`;
const APPLICATION_JS_OUTPUT_PATH = `${PROJECT_ROOT}/tmp/assets/application.js`;

test.beforeEach(async () => {
  global.MBER_THREAD_POOL = WorkerPool.start();

  await fs.rm(`${PROJECT_ROOT}/tmp`, { recursive: true, force: true });
  await fs.mkdir(`${PROJECT_ROOT}/tmp/assets`, { recursive: true });
});

test.afterEach.always(async () => {
  global.MBER_THREAD_POOL.workers.forEach((worker) => worker.terminate());
});

test.serial('buildApplication() works', async (t) => {
  t.plan(22);

  t.true(!(await pathExists(APPLICATION_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { message, stats } = await buildApplication();
  const timeTakenForBuild = message
    .match(/application\.js in \d+ms/g)[0]
    .replace('application.js in ', '')
    .replace('ms', '');

  t.true(Number(timeTakenForBuild) < APPLICATION_JS_BUILD_TIME_THRESHOLD);

  const applicationJSBuffer = await fs.readFile(APPLICATION_JS_OUTPUT_PATH);
  const applicationJSCode = applicationJSBuffer.toString().trim();

  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/main'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/resolver'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/router'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/data/models/application/adapter'));
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/data/models/application/serializer')
  );
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/components/welcome-page/component')
  );
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/components/welcome-page/template')
  );
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/application/head'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/application/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/template'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/not-found/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/not-found/template'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/config/environment'));
  t.true(
    applicationJSCode.includes(`if (typeof FastBoot !== 'undefined') {
          define('~fastboot/app-factory', ['frontend/src/main', 'frontend/config/environment'], function(App, config) {
            App = App['default'];
            config = config['default'];

            return {
              'default': function() {
                return App.create(config.APP);
              }
            };
          });
        }

        if (typeof FastBoot === 'undefined' && !runningTests) {
          require('frontend/src/main')['default'].create(require('frontend/config/environment').default);
        }`)
  );
  t.true(
    !codeIncludesAMDModule(
      applicationJSCode,
      'frontend/src/ui/components/welcome-page/integration-test'
    )
  );
  t.true(!codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/unit-test'));
  t.true(applicationJSBuffer.length >= APPLICATION_JS_TARGET_BYTE_SIZE - 1000);
  t.true(stats.size >= APPLICATION_JS_TARGET_BYTE_SIZE - 1000);
  console.log('MESSAGE WAS', message);
  t.true(/BUILT: application\.js in \d+ms \[12.\d+ kB\] Environment: development/g.test(message));

  mock.removeMock();
});
test.serial('buildApplication(development) works', async (t) => {
  t.plan(22);

  t.true(!(await pathExists(APPLICATION_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { message, stats } = await buildApplication(
    {
      ENV: { environment: 'development', modulePrefix: 'frontend' }
    },
    false
  );
  const timeTakenForBuild = message
    .match(/application\.js in \d+ms/g)[0]
    .replace('application.js in ', '')
    .replace('ms', '');

  t.true(Number(timeTakenForBuild) < APPLICATION_JS_BUILD_TIME_THRESHOLD);

  const applicationJSBuffer = await fs.readFile(APPLICATION_JS_OUTPUT_PATH);
  const applicationJSCode = applicationJSBuffer.toString().trim();

  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/main'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/resolver'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/router'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/data/models/application/adapter'));
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/data/models/application/serializer')
  );
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/components/welcome-page/component')
  );
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/components/welcome-page/template')
  );
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/application/head'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/application/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/template'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/not-found/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/not-found/template'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/config/environment'));
  t.true(
    applicationJSCode.includes(`if (typeof FastBoot !== 'undefined') {
          define('~fastboot/app-factory', ['frontend/src/main', 'frontend/config/environment'], function(App, config) {
            App = App['default'];
            config = config['default'];

            return {
              'default': function() {
                return App.create(config.APP);
              }
            };
          });
        }

        if (typeof FastBoot === 'undefined' && !runningTests) {
          require('frontend/src/main')['default'].create(require('frontend/config/environment').default);
        }`)
  );
  t.true(
    !codeIncludesAMDModule(
      applicationJSCode,
      'frontend/src/ui/components/welcome-page/integration-test'
    )
  );
  t.true(!codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/unit-test'));
  t.true(applicationJSBuffer.length >= APPLICATION_JS_TARGET_BYTE_SIZE - 1000);
  t.true(stats.size >= APPLICATION_JS_TARGET_BYTE_SIZE - 1000);
  t.true(/BUILT: application\.js in \d+ms \[12.\d+ kB\] Environment: development/g.test(message));

  mock.removeMock();
});
test.serial('buildApplication(production) works', async (t) => {
  t.plan(22);

  t.true(!(await pathExists(APPLICATION_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { message, stats } = await buildApplication(
    {
      ENV: { environment: 'production', modulePrefix: 'frontend' }
    },
    false
  );
  const timeTakenForBuild = message
    .match(/application\.js in \d+ms/g)[0]
    .replace('application.js in ', '')
    .replace('ms', '');

  t.true(Number(timeTakenForBuild) < APPLICATION_JS_BUILD_TIME_THRESHOLD);

  const applicationJSBuffer = await fs.readFile(APPLICATION_JS_OUTPUT_PATH);
  const applicationJSCode = applicationJSBuffer.toString().trim();

  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/main'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/resolver'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/router'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/data/models/application/adapter'));
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/data/models/application/serializer')
  );
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/components/welcome-page/component')
  );
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/components/welcome-page/template')
  );
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/application/head'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/application/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/template'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/not-found/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/not-found/template'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/config/environment'));
  t.true(codeIncludesAMDModule(applicationJSCode, '~fastboot/app-factory'));
  t.true(
    !codeIncludesAMDModule(
      applicationJSCode,
      'frontend/src/ui/components/welcome-page/integration-test'
    )
  );
  t.true(!codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/unit-test'));
  t.true(applicationJSBuffer.length >= APPLICATION_JS_COMPRESSED_TARGET_BYTE_SIZE - 1000);
  t.true(stats.size >= APPLICATION_JS_COMPRESSED_TARGET_BYTE_SIZE - 1000);
  t.true(/BUILT: application\.js in \d+ms \[8.\d+ kB\] Environment: production/g.test(message));

  mock.removeMock();
});
test.serial('buildApplication(test) works', async (t) => {
  t.plan(22);

  t.true(!(await pathExists(APPLICATION_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { message, stats } = await buildApplication(
    {
      ENV: { environment: 'test', modulePrefix: 'frontend' }
    },
    false
  );
  const timeTakenForBuild = message
    .match(/application\.js in \d+ms/g)[0]
    .replace('application.js in ', '')
    .replace('ms', '');

  t.true(Number(timeTakenForBuild) < APPLICATION_JS_BUILD_TIME_THRESHOLD);

  const applicationJSBuffer = await fs.readFile(APPLICATION_JS_OUTPUT_PATH);
  const applicationJSCode = applicationJSBuffer.toString().trim();

  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/main'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/resolver'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/router'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/data/models/application/adapter'));
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/data/models/application/serializer')
  );
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/components/welcome-page/component')
  );
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/components/welcome-page/template')
  );
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/application/head'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/application/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/template'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/not-found/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/not-found/template'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/config/environment'));
  t.true(
    applicationJSCode.includes(`if (typeof FastBoot !== 'undefined') {
          define('~fastboot/app-factory', ['frontend/src/main', 'frontend/config/environment'], function(App, config) {
            App = App['default'];
            config = config['default'];

            return {
              'default': function() {
                return App.create(config.APP);
              }
            };
          });
        }

        if (typeof FastBoot === 'undefined' && !runningTests) {
          require('frontend/src/main')['default'].create(require('frontend/config/environment').default);
        }`)
  );
  t.true(
    !codeIncludesAMDModule(
      applicationJSCode,
      'frontend/src/ui/components/welcome-page/integration-test'
    )
  );
  t.true(!codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/unit-test'));
  t.true(applicationJSBuffer.length >= APPLICATION_JS_TARGET_BYTE_SIZE - 1014);
  t.true(stats.size >= APPLICATION_JS_TARGET_BYTE_SIZE - 1014);
  t.true(/BUILT: application\.js in \d+ms \[12.\d+ kB\] Environment: test/g.test(message));

  mock.removeMock();
});
test.serial('buildApplication(demo) works', async (t) => {
  t.plan(22);

  t.true(!(await pathExists(APPLICATION_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { message, stats } = await buildApplication(
    {
      ENV: { environment: 'demo', modulePrefix: 'frontend' }
    },
    false
  );
  const timeTakenForBuild = message
    .match(/application\.js in \d+ms/g)[0]
    .replace('application.js in ', '')
    .replace('ms', '');

  t.true(Number(timeTakenForBuild) < APPLICATION_JS_BUILD_TIME_THRESHOLD);

  const applicationJSBuffer = await fs.readFile(APPLICATION_JS_OUTPUT_PATH);
  const applicationJSCode = applicationJSBuffer.toString().trim();

  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/main'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/resolver'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/router'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/data/models/application/adapter'));
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/data/models/application/serializer')
  );
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/components/welcome-page/component')
  );
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/components/welcome-page/template')
  );
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/application/head'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/application/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/template'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/not-found/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/not-found/template'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'frontend/config/environment'));
  t.true(codeIncludesAMDModule(applicationJSCode, '~fastboot/app-factory'));
  t.true(
    !codeIncludesAMDModule(
      applicationJSCode,
      'frontend/src/ui/components/welcome-page/integration-test'
    )
  );
  t.true(!codeIncludesAMDModule(applicationJSCode, 'frontend/src/ui/routes/index/unit-test'));
  t.true(applicationJSBuffer.length >= APPLICATION_JS_COMPRESSED_TARGET_BYTE_SIZE - 1013);
  t.true(stats.size >= APPLICATION_JS_COMPRESSED_TARGET_BYTE_SIZE - 1013);
  t.true(/BUILT: application\.js in \d+ms \[8.\d+ kB\] Environment: demo/g.test(message));

  mock.removeMock();
});
test.serial('buildApplication(custom) works', async (t) => {
  t.plan(22);

  t.true(!(await pathExists(APPLICATION_JS_OUTPUT_PATH)));

  const mock = mockProcessCWD(PROJECT_ROOT);
  const { message, stats } = await buildApplication(
    {
      applicationName: 'my-app',
      ENV: { environment: 'custom', modulePrefix: 'my-app' }
    },
    false
  );
  const timeTakenForBuild = message
    .match(/application\.js in \d+ms/g)[0]
    .replace('application.js in ', '')
    .replace('ms', '');

  t.true(Number(timeTakenForBuild) < APPLICATION_JS_BUILD_TIME_THRESHOLD);

  const applicationJSBuffer = await fs.readFile(APPLICATION_JS_OUTPUT_PATH);
  const applicationJSCode = applicationJSBuffer.toString().trim();

  t.true(codeIncludesAMDModule(applicationJSCode, 'my-app/src/main'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'my-app/src/resolver'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'my-app/src/router'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'my-app/src/data/models/application/adapter'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'my-app/src/data/models/application/serializer'));
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'my-app/src/ui/components/welcome-page/component')
  );
  t.true(
    codeIncludesAMDModule(applicationJSCode, 'my-app/src/ui/components/welcome-page/template')
  );
  t.true(codeIncludesAMDModule(applicationJSCode, 'my-app/src/ui/routes/application/head'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'my-app/src/ui/routes/application/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'my-app/src/ui/routes/index/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'my-app/src/ui/routes/index/template'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'my-app/src/ui/routes/not-found/route'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'my-app/src/ui/routes/not-found/template'));
  t.true(codeIncludesAMDModule(applicationJSCode, 'my-app/config/environment'));
  t.true(
    applicationJSCode.includes(`if (typeof FastBoot !== 'undefined') {
          define('~fastboot/app-factory', ['my-app/src/main', 'my-app/config/environment'], function(App, config) {
            App = App['default'];
            config = config['default'];

            return {
              'default': function() {
                return App.create(config.APP);
              }
            };
          });
        }

        if (typeof FastBoot === 'undefined' && !runningTests) {
          require('my-app/src/main')['default'].create(require('my-app/config/environment').default);
        }`)
  );
  t.true(
    !codeIncludesAMDModule(
      applicationJSCode,
      'my-app/src/ui/components/welcome-page/integration-test'
    )
  );
  t.true(!codeIncludesAMDModule(applicationJSCode, 'my-app/src/ui/routes/index/unit-test'));
  t.true(applicationJSBuffer.length < APPLICATION_JS_TARGET_BYTE_SIZE + 1000);
  t.true(stats.size < APPLICATION_JS_TARGET_BYTE_SIZE + 1000);
  t.true(/BUILT: application\.js in \d+ms \[12.\d+ kB\] Environment: custom/g.test(message));

  mock.removeMock();
});
test.serial('buildApplication(development, { applicationPrepends }) work', async (t) => {
  t.plan(5);

  t.true(!(await pathExists(APPLICATION_JS_OUTPUT_PATH)));

  const CODE_TO_PREPEND = '(function() { console.log("this is prepending code") })()';
  const mock = mockProcessCWD(PROJECT_ROOT);
  const { message, stats } = await buildApplication(
    {
      ENV: { environment: 'development', modulePrefix: 'frontend' },
      buildCache: { applicationPrepends: CODE_TO_PREPEND }
    },
    false
  );
  const timeTakenForBuild = message
    .match(/application\.js in \d+ms/g)[0]
    .replace('application.js in ', '')
    .replace('ms', '');

  t.true(Number(timeTakenForBuild) < APPLICATION_JS_BUILD_TIME_THRESHOLD);

  const applicationJSBuffer = await fs.readFile(APPLICATION_JS_OUTPUT_PATH);

  t.true(
    applicationJSBuffer
      .toString()
      .trim()
      .startsWith(CODE_TO_PREPEND)
  );
  t.true(applicationJSBuffer.length >= APPLICATION_JS_TARGET_BYTE_SIZE);
  t.true(stats.size >= APPLICATION_JS_TARGET_BYTE_SIZE);

  mock.removeMock();
});
test.serial('buildApplication(development, { applicationAppends }) work', async (t) => {
  t.plan(5);

  t.true(!(await pathExists(APPLICATION_JS_OUTPUT_PATH)));

  const CODE_TO_APPEND = '(function() { console.log("this is appending code") })()';
  const mock = mockProcessCWD(PROJECT_ROOT);
  const { message, stats } = await buildApplication(
    {
      ENV: { environment: 'development', modulePrefix: 'frontend' },
      buildCache: { applicationAppends: CODE_TO_APPEND }
    },
    false
  );
  const timeTakenForBuild = message
    .match(/application\.js in \d+ms/g)[0]
    .replace('application.js in ', '')
    .replace('ms', '');

  t.true(Number(timeTakenForBuild) < APPLICATION_JS_BUILD_TIME_THRESHOLD);

  const applicationJSBuffer = await fs.readFile(APPLICATION_JS_OUTPUT_PATH);

  t.true(
    applicationJSBuffer
      .toString()
      .trim()
      .endsWith(CODE_TO_APPEND)
  );
  t.true(applicationJSBuffer.length >= APPLICATION_JS_TARGET_BYTE_SIZE);
  t.true(stats.size >= APPLICATION_JS_TARGET_BYTE_SIZE);

  mock.removeMock();
});
test.serial(
  'buildApplication(development, { applicationPrepends, applicationAppends }) work',
  async (t) => {
    t.plan(6);

    t.true(!(await pathExists(APPLICATION_JS_OUTPUT_PATH)));

    const CODE_TO_PREPEND = '(function() { console.log("this is prepending code") })()';
    const CODE_TO_APPEND = '(function() { console.log("this is appending code") })()';
    const mock = mockProcessCWD(PROJECT_ROOT);
    const { message, stats } = await buildApplication(
      {
        ENV: { environment: 'development', modulePrefix: 'frontend' },
        buildCache: { applicationPrepends: CODE_TO_PREPEND, applicationAppends: CODE_TO_APPEND }
      },
      false
    );
    const timeTakenForBuild = message
      .match(/application\.js in \d+ms/g)[0]
      .replace('application.js in ', '')
      .replace('ms', '');

    t.true(Number(timeTakenForBuild) < APPLICATION_JS_BUILD_TIME_THRESHOLD);

    const applicationJSBuffer = await fs.readFile(APPLICATION_JS_OUTPUT_PATH);
    const applicationJSCode = applicationJSBuffer.toString().trim();

    t.true(applicationJSCode.startsWith(CODE_TO_PREPEND));
    t.true(applicationJSCode.endsWith(CODE_TO_APPEND));
    t.true(applicationJSBuffer.length >= APPLICATION_JS_TARGET_BYTE_SIZE);
    t.true(stats.size >= APPLICATION_JS_TARGET_BYTE_SIZE);

    mock.removeMock();
  }
);
