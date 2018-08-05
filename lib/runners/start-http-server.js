import chalk from 'chalk';
import compression from 'compression';
import express from 'express';
import Console from '../utils/console';
import FastBootExpressMiddleware from '../utils/fastboot-express-middleware';
import findProjectRoot from '../utils/find-project-root';

// TODO: test-backend should have a browser test runner
export default async function(ENV={}, options={
  fastboot: true, port: 1234, runningTests: false
}) {
  process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
  });

  const environment = ENV.environment || 'development';
  const PROJECT_ROOT = await findProjectRoot();
  const server = express();

  server.use(compression());

  // const DIST_PATH = options.buildMode ? `${PROJECT_ROOT}/dist` : `${PROJECT_ROOT}/tmp` // TODO: whats buildMode? is this deprecated?
  const DIST_PATH = `${PROJECT_ROOT}/tmp`;
  const entrypoint = `${DIST_PATH}/index.html`;

  server.use('/assets', express.static(`${DIST_PATH}/assets`));
  server.use(express.static(`${PROJECT_ROOT}/public`));

  server.get('/favicon.ico', (req, res) => {
    res.sendFile(`${DIST_PATH}/favicon.ico`);
  });

  if (options.runningTests) {
    server.get('/', (req, res) => {
      if (Object.keys(req.query).length === 0) {
        return res.redirect('/?hidepassed')
      }

      res.sendFile(entrypoint);
    });
  } else if (options.fastboot) {
    Console.log(chalk.green('App is being served by FastBoot'));

    const FastBoot = require('fastboot');

    global.fastboot = new FastBoot({
      distPath: DIST_PATH,
      resilient: true,
      shouldRender: true,
      sandboxGlobals: assignSandboxGlobals(ENV)
    });

    server.use((req, res, next) => {
      const fastbootByPassQueryParam = req.query.fastboot && (req.query.fastboot === 'false');

      if (fastbootByPassQueryParam) {
        return res.sendFile(entrypoint);
      }

      const middleware = FastBootExpressMiddleware({
        distPath: DIST_PATH,
        fastboot: global.fastboot,
        resilient: true,
        shouldRender: true
      });

      return middleware(req, res, next);
    });
  } else {
    server.get('/*', (req, res) => res.sendFile(`${DIST_PATH}/index.html`));
  }

  server.listen(options.port, () => {
    Console.log(`Server is running on http://localhost:${options.port} (Environment: ${environment})`);
  });
}

function assignSandboxGlobals(ENV) {
  const IS_MEMSERVER = ENV.memserver && ENV.memserver.enabled;

  if (IS_MEMSERVER) {
    const JSDOM = require('jsdom').JSDOM;
    const dom = new JSDOM('<p>Hello</p>', { url: 'http://localhost:3000' });

    global.window = dom.window;
    global.document = dom.window.document;
    global.self = dom.window.self;

    const MemServer = require('memserver');
    const $ = require('jquery');

    MemServer.start();

    return {
      global: global,
      window: global.window,
      document: global.document,
      location: global.window.location,
      XMLHttpRequest: global.window.XMLHttpRequest,
      $: $,
      jQuery: $,
      navigator: global.window.navigator
    };
  }

  return {};
}
