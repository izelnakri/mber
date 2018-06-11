import chalk from 'chalk';
import compression from 'compression';
import express from 'express';
import FastBootExpressMiddleware from './fastboot-express-middleware';
import findProjectRoot from './find-project-root';
import Console from './console';

const PROJECT_ROOT = findProjectRoot();
const DIST_PATH = `${PROJECT_ROOT}/dist`; // TODO: buildDist could be tmp

export default function(environment='development', port=1234, options={ fastboot: true }) {
  process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
  });

  const server = express();

  server.use(compression());
  // server.use('/assets', express.static(`${PROJECT_ROOT}/tmp`));
  server.use('/assets', express.static(`${PROJECT_ROOT}/dist/assets`));
  server.use(express.static(`${PROJECT_ROOT}/public`));

  if (environment === 'test') {
    server.get('/', (req, res) => {
      if (Object.keys(req.query).length === 0) {
        return res.redirect('/?hidepassed')
      }

      res.sendFile(`${PROJECT_ROOT}/tests/index.html`);
    });
  } else if (options.fastboot) {
    console.log(chalk.green('App is being served by FastBoot'));
    const FastBoot = require('fastboot');
    const fastboot = new FastBoot({
      distPath: DIST_PATH,
      resilient: true,
      shouldRender: true
    });

    const fastbootMiddleware = FastBootExpressMiddleware({
      distPath: DIST_PATH,
      fastboot: fastboot,
      resilient: true,
      shouldRender: true
    });

    server.use((req, res, next) => { // TODO: reload on filesWatcher
      if (req.path.includes('.html') || !req.path.includes('.')) {
        const fastbootByPassQueryParam = req.query.fastboot && (req.query.fastboot === 'false');

        if (fastbootByPassQueryParam) {
          return res.sendFile(`${PROJECT_ROOT}/index.html`);
        }

        return fastbootMiddleware(req, res, next);
      }

      next();
    });
  } else {
    server.get('/', (req, res) => res.sendFile(`${PROJECT_ROOT}/index.html`));
  }

  server.listen(port);

  Console.log(`Server is running on http://localhost:${port} (Environment: ${environment})\n`);
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
