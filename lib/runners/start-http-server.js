import chalk from 'chalk';
import compression from 'compression';
import express from 'express';
import Console from '../utils/console';
import FastBootExpressMiddleware from '../utils/fastboot-express-middleware';
import findProjectRoot from '../utils/find-project-root';

const PROJECT_ROOT = findProjectRoot();

export default function(environment='development', ENV, options={
  fastboot: true, port: 1234, buildMode: false
}) {
  process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
  });

  const server = express();

  server.use(compression());

  const DIST_PATH = options.buildMode ? `${PROJECT_ROOT}/dist` : `${PROJECT_ROOT}/tmp`

  server.use('/assets', express.static(`${DIST_PATH}/assets`));
  server.use(express.static(`${PROJECT_ROOT}/public`));

  if (environment === 'test') {
    server.get('/', (req, res) => {
      if (Object.keys(req.query).length === 0) {
        return res.redirect('/?hidepassed')
      }

      res.sendFile(`${PROJECT_ROOT}/tmp/index.html`);
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

    const fastbootMiddleware = FastBootExpressMiddleware({
      distPath: DIST_PATH,
      fastboot: global.fastboot,
      resilient: true,
      shouldRender: true
    });

    server.use((req, res, next) => { // TODO: reload on filesWatcher
      if (req.path.includes('.html') || !req.path.includes('.')) {
        const fastbootByPassQueryParam = req.query.fastboot && (req.query.fastboot === 'false');

        if (fastbootByPassQueryParam) {
          return res.sendFile(`${DIST_PATH}/index.html`);
        }

        return fastbootMiddleware(req, res, next);
      }

      next();
    });
  } else {
    server.get('/*', (req, res) => res.sendFile(`${DIST_PATH}/index.html`));
  }

  server.listen(options.port);

  Console.log(`Server is running on http://localhost:${options.port} (Environment: ${environment})`);
}

function assignSandboxGlobals(ENV) {
  const IS_MEMSERVER = ENV.memserver && ENV.memserver.enabled;

  if (IS_MEMSERVER) {
    const JSDOM = require('jsdom').JSDOM;
    const dom = new JSDOM('<p>Hello</p>', { url: 'http://localhost' });

    global.window = dom.window;
    global.document = window.document;
    global.self = window.self;

    return {
      global: global,
      window: global.window,
      document: global.document,
      location: global.window.location,
      XMLHttpRequest: global.window.XMLHttpRequest,
      navigator: global.window.navigator
    };
  }

  return {};
}

// add pause button


// app.use((req, resp, next) => {
//   const fastbootQueryParam = (req.query.hasOwnProperty('fastboot') && req.query.fastboot === 'false') ? false : true;
//   const enableFastBootServe = !process.env.FASTBOOT_DISABLED && fastbootQueryParam;
//   const broccoliHeader = req.headers['x-broccoli'];
//   const outputPath = broccoliHeader['outputPath'];
//
//   if (req.serveUrl && enableFastBootServe) {
//     // if it is a base page request, then have fastboot serve the base page
//     if (!this.fastboot) {
//       // TODO(future): make this configurable for allowing apps to pass sandboxGlobals
//       // and custom sandbox class
//       this.ui.writeLine(chalk.green('App is being served by FastBoot'));
//       this.fastboot = new FastBoot({
//         distPath: outputPath
//       });
//     }
//
//     let fastbootMiddleware = FastBootExpressMiddleware({
//       fastboot: this.fastboot
//     });
//
//     fastbootMiddleware(req, resp, next);
//   } else {
//     // forward the request to the next middleware (example other assets, proxy etc)
//     next();
//   }
// });
