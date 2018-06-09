import chalk from 'chalk';
import chokidar from 'chokidar';
import WebSocket from 'ws';
import buildApplication from '../builders/build-application';
import buildCSS from '../builders/build-css';
import buildDist from '../builders/build-dist';
import buildTests from '../builders/build-tests';
import buildVendor from '../builders/build-vendor';
import Console from './console';
import findProjectRoot from './find-project-root';
import setupBuild from '../builders/setup-build';

// TODO: allow this to serve /tests on every environment

// TODO: major refactor here for fastboot

const PROJECT_ROOT = findProjectRoot();

export default function(environment='development', socketPort=65511, options={
  buildConfig: {}, buildDist: false, entryPoint: `${PROJECT_ROOT}/index.html`
}) {
  let watcher = {};

  const WebSocketServer = new WebSocket.Server({
    port: socketPort
  });

  // TODO: refactor with chokidar shortcuts
  WebSocketServer.on('connection', (webSocket) => {
    Object.assign(watcher, {
      indexJS: chokidar.watch(`${PROJECT_ROOT}/index.js`, { ignoreInitial: true }).on('all', (event, path) => {
        Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

        setupBuild(PROJECT_ROOT, setupBuild).then(() => webSocket.send(`${event}: ${path}`));

        options.buildDist ? buildDist(options.entryPoint) : null;
      }),
      indexHTML: chokidar.watch(`${PROJECT_ROOT}/index.html`, { ignoreInitial: true }).on('all', (event, path) => {
        Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

        webSocket.send(`${event}: ${path}`);

        options.buildDist ? buildDist(options.entryPoint) : null;
      }),
      src: chokidar.watch(`${PROJECT_ROOT}/src`, { ignoreInitial: true }).on('all', (event, path) => {
        Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

        if (path.endsWith('scss')) {
          return buildCSS(environment).then(() => {
            webSocket.send(`${event}: ${path}`)

            options.buildDist ? buildDist(options.entryPoint) : null;
          });
        }

        buildApplication(environment, {
          applicationPrepends: options.buildConfig.applicationPrepends,
          applicationAppends: options.buildConfig.applicationAppends
        }).then(() => {
          webSocket.send(`${event}: ${path}`)

          options.buildDist ? buildDist(options.entryPoint) : null;
        });
      }),
      vendor: chokidar.watch(`${PROJECT_ROOT}/vendor`, { ignoreInitial: true }).on('all', (event, path) => {
        Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

        if (path.endsWith('scss')) {
          return buildCSS(environment).then(() => {
            webSocket.send(`${event}: ${path}`);

            options.buildDist ? buildDist(options.entryPoint) : null;
          });
        }

        setupBuild(PROJECT_ROOT, environment).then(() => {
          webSocket.send(`${event}: ${path}`);

          options.buildDist ? buildDist(options.entryPoint) : null;
        });
      })
    });

    if (environment === 'test') {
      Object.assign(watcher, {
        testsIndexHTML: chokidar.watch(`${PROJECT_ROOT}/tests/index.html`, { ignoreInitial: true }).on('all', (event, path) => {
          Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

          webSocket.send(`${event}: ${path}`);
        }),
        tests: chokidar.watch(`${PROJECT_ROOT}/tests`, { ignoreInitial: true }).on('all', (event, path) => {
          Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

          if (path.endsWith('scss')) {
            return buildCSS(environment).then(() => webSocket.send(`${event}: ${path}`));
          } else if (path.endsWith('test.js')) {
            return buildTests(environment).then(() => webSocket.send(`${event}: ${path}`));
          }

          buildApplication(environment, {
            applicationPrepends: options.buildConfig.applicationPrepends,
            applicationAppends: options.buildConfig.applicationAppends
          }).then(() => webSocket.send(`${event}: ${path}`));
        })
      });
    } else if (environment === 'memserver') {
      Object.assign(watcher, {
        memserver: chokidar.watch(`${PROJECT_ROOT}/memserver`, { ignoreInitial: true }).on('all', (event, path) => {
          Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

          buildVendor(environment, {
            vendorPrepends: options.buildConfig.vendorPrepends,
            vendorAppends: options.buildConfig.vendorAppends
          }).then(() => {
            webSocket.send(`${event}: ${path}`);

            options.buildDist ? buildDist(options.entryPoint) : null;
          });
        })
      });
    }
  });

  WebSocketServer.on('close', () => {
    watcher = {};
  });
}

function getEventColor(event) {
  if (event === 'change') {
    return chalk.yellow('CHANGED:');
  } else if (event === 'added' || event === 'adddir') {
    return chalk.green('ADDED:');
  } else if (event === 'removed') {
    return chalk.red('REMOVED:');
  }
}
