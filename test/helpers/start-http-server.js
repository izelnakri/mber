import compression from 'compression';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { Request, Response, fetch as fetchPolyfill } from 'whatwg-fetch'
import fastbootMiddleware from '../../lib/utils/fastboot-express-middleware.js';

// NOTE: express.static() gets index.html by default
export default function(entrypoint, port=3000, options={ fastboot: true, memserver: false }) {
  return new Promise(async (resolve) => {
    const DIST_ROOT = entrypoint.replace('/index.html', '');
    const app = express();

    app.use(cors());
    app.use(compression());
    app.use(morgan('dev'));
    app.use('/assets', express.static(`${DIST_ROOT}/assets`));
    app.use('/images', express.static(`${DIST_ROOT}/images`));
    app.use('/fonts', express.static(`${DIST_ROOT}/fonts`));
    app.use('/crossdomain.xml', express.static(`${DIST_ROOT}/crossdomain.xml`));
    app.use('/robots.txt', express.static(`${DIST_ROOT}/robots.txt`));

    if (!options.memserver) {
      app.get('/users', (req, res) => {
        res.json({
          users: [
            {
              id: 1,
              first_name: 'Izel',
              last_name: 'Nakri',
              active: true
            },
            {
              id: 2,
              first_name: 'Ash',
              last_name: 'Belmokadem',
              active: true
            },
            {
              id: 3,
              first_name: 'Constantijn',
              last_name: 'van de Wetering',
              active: true
            }
          ]
        });
      });
    }

    if (options.fastboot) {
      const FastBoot = (await import('fastboot')).default;
      const sandboxGlobals = options.memserver ? await assignSandboxGlobalsForMemserverFastboot(port) : {};
      const fastboot = new FastBoot({
        distPath: DIST_ROOT,
        resilient: true,
        shouldRender: true,
        buildSandboxGlobals: (defaultGlobals) => Object.assign(defaultGlobals, sandboxGlobals)
      });

      app.use((req, res, next) => {
        const fastbootByPassQueryParam = req.query.fastboot && (req.query.fastboot === 'false');

        if (fastbootByPassQueryParam) {
          return res.sendFile(entrypoint);
        }

        const middleware = fastbootMiddleware({
          distPath: DIST_ROOT,
          fastboot: fastboot,
          resilient: true,
          shouldRender: true
        });

        return middleware(req, res, next);
      });
      } else {
      app.get('/*', (req, res) => res.sendFile(entrypoint));
    }

    let server = (await import('http')).default.createServer(app);

    server.listen(port, () => {
      console.log(`HTTP Server listening on ${port}`);
      resolve(server);
    });
  });
}

async function assignSandboxGlobalsForMemserverFastboot(port) { // TODO: maybe add PORT as argument
  const JSDOM = (await import('jsdom')).default.JSDOM;
  const dom = new JSDOM('<p>Hello</p>', {
    url: `http://localhost:${port || 3000}`,
    beforeParse(window) {
      window.fetch = fetchPolyfill;
      window.Request = Request;
      window.Response = Response;
    },
  });

  global.window = dom.window;

  dom.window.XMLHttpRequest = global.window.XMLHttpRequest;

  global.XMLHttpRequest = global.window.XMLHttpRequest;
  global.document = dom.window.document;
  global.self = dom.window.self;

  console.log('GLOBAL.WINDOW.FETCH IS', global.window.fetch);
  console.log('GLOBAL.XMLHttpRequest IS', global.XMLHttpRequest);
  console.log('WINDOW.XMLHttpRequest IS', global.window.XMLHttpRequest);
  console.log('dom.Request IS', global.window.Request);
  console.log('WINDOW.Response IS', global.window.Response);

  return {
    global: global,
    window: global.window,
    document: global.document,
    location: global.window.location,
    XMLHttpRequest: global.window.XMLHttpRequest,
    Request: global.window.Request,
    Response: global.window.Response,
    URLSearchParams: global.URLSearchParams,
    fetch: global.window.fetch,
    navigator: global.window.navigator
  };
}
