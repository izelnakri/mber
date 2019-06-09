import chalk from 'ansi-colors';
import compression from 'compression';
import express from 'express';
import Console from '../utils/console.js';
import FastBootExpressMiddleware from '../utils/fastboot-express-middleware.js';
import findProjectRoot from '../utils/find-project-root.js';

export default async function(buildConfig={
  applicationName: null,
  buildCache: {
    vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: '',
    testPrepends: '', testAppends: ''
  },
  cliArguments: null,
  ENV: null,
  indexHTMLInjections: {},
  projectRoot: null
}) {
  process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
  });

  const projectRoot = buildConfig.projectRoot || await findProjectRoot();
  const cliArguments = buildConfig.cliArguments || {
    fastboot: true,
    port: 1234,
    socketPort: 65511
  };
  const distPath = `${projectRoot}/tmp`;
  const ENV = buildConfig.ENV || {};
  const environment = ENV.environment || 'development';
  const port = cliArguments.port;
  const shouldServeTests = environment !== 'production';
  const server = express();

  server.use(compression());
  server.use('/assets', express.static(`${distPath}/assets`));
  server.use(express.static(`${projectRoot}/public`));

  server.get('/favicon.ico', (req, res) => {
    res.sendFile(`${distPath}/favicon.ico`);
  });

  if (shouldServeTests) {
    server.get('/tests', (req, res) => {
      if (Object.keys(req.query).length === 0) {
        return res.redirect('/tests?hidepassed');
      }

      return res.sendFile(`${distPath}/tests.html`);
    });
  }

  if (ENV.documentation && ENV.documentation.enabled) {
    server.use(`${ENV.documentation.path}`, (req, res) => {
      return res.sendFile(`${distPath}/${ENV.documentation.path}.html`);
    });
  }

  if (cliArguments.fastboot) {
    Console.log(chalk.green('App is being served by FastBoot'));

    const FastBoot = (await import('fastboot')).default;

    global.fastboot = new FastBoot({
      distPath: distPath,
      resilient: true,
      shouldRender: true,
      sandboxGlobals: await assignSandboxGlobals(ENV)
    });

    server.use((req, res, next) => {
      const fastbootByPassQueryParam = req.query.fastboot && (req.query.fastboot === 'false');

      if (fastbootByPassQueryParam) {
        return res.sendFile(`${distPath}/index.html`);
      }

      const middleware = FastBootExpressMiddleware({
        distPath: distPath,
        fastboot: global.fastboot,
        resilient: true,
        shouldRender: true
      });

      return middleware(req, res, next);
    });
  } else {
    server.get('/*', (req, res) => res.sendFile(`${distPath}/index.html`));
  }

  server.listen(port, () => {
    Console.log(`Server is running on http://localhost:${port} (Environment: ${environment})`);

    if (shouldServeTests) {
      Console.log(chalk.green(`You can visit http://localhost:${port}/tests to run your tests`));
    }

    if (ENV.documentation && ENV.documentation.enabled) {
      Console.log(chalk.green(`Your styleguide/documentation app runs on http://localhost:${port}${ENV.documentation.path}`));
    }
  });
}

async function assignSandboxGlobals(ENV) {
  const IS_MEMSERVER = ENV.memserver && ENV.memserver.enabled;

  if (IS_MEMSERVER) {
    const JSDOM = (await import('jsdom')).JSDOM;
    const dom = new JSDOM('<p>Hello</p>', { url: 'http://localhost:3000' }); // TODO: could this be simply index.html?

    global.window = dom.window;
    global.document = dom.window.document;
    global.self = dom.window.self;

    const MemServer = await import('memserver');
    const $ = await import('jquery');

    MemServer.start();

    return {
      global: global,
      window: global.window,
      document: global.document,
      location: global.window.location,
      XMLHttpRequest: global.window.XMLHttpRequest,
      $: $,
      jQuery: $,
      fetch: global.window.fetch,
      navigator: global.window.navigator
    };
  }

  return {};
}
