import chalk from 'chalk';
import chokidar from 'chokidar';
import WebSocket from 'ws';
import buildApplication from '../builders/build-application';
import buildCSS from '../builders/build-css';
import buildDistFolder from '../builders/build-dist-folder';
import buildTests from '../builders/build-tests';
import buildVendor from '../builders/build-vendor';
import Console from './console';
import findProjectRoot from './find-project-root';
import setupBuild from '../builders/setup-build';

// TODO: allow this to serve /tests on every environment

const PROJECT_ROOT = findProjectRoot();

export default function(environment='development', socketPort=65511, options={
  buildConfig: {}, buildDist: false, entryPoint: `${PROJECT_ROOT}/index.html`,
  fastboot: true
}) {
  let watcher = {};

  const { fastboot } = options;
  const WebSocketServer = new WebSocket.Server({ port: socketPort });

  WebSocketServer.on('connection', (webSocket) => {
    cleanWatchers(watcher);

    Object.assign(watcher, {
      indexJS: watch(
        `${PROJECT_ROOT}/index.js`,
        () => setupBuild(PROJECT_ROOT, setupBuild),
        (path, event) => {
          reloadFastboot(fastboot);

          broadcastMessage(WebSocketServer, `${event}: ${path}`)

          options.buildDist ? buildDistFolder(options.entryPoint, options) : null;
        }
      ),
      indexHTML: watch(
        `${PROJECT_ROOT}/index.html`,
        (path, event) => {
          reloadFastboot(fastboot);

          broadcastMessage(WebSocketServer, `${event}: ${path}`);

          options.buildDist ? buildDistFolder(options.entryPoint, options) : null;
        }
      ),
      src: watch(
        `${PROJECT_ROOT}/src`,
        (path) => {
          if (path.endsWith('scss')) {
            return buildCSS(environment);
          }

          return buildApplication(environment, {
            applicationPrepends: options.buildConfig.applicationPrepends,
            applicationAppends: options.buildConfig.applicationAppends
          });
        },
        (path, event) => {
          reloadFastboot(fastboot);

          broadcastMessage(WebSocketServer, `${event}: ${path}`)

          options.buildDist ? buildDistFolder(options.entryPoint, options) : null;
        }
      ),
      vendor: watch(`${PROJECT_ROOT}/vendor`, (path) => {
        if (path.endsWith('scss')) {
          return buildCSS(environment);
        }

        return setupBuild(PROJECT_ROOT, environment);
      }, (path, event) => {
        reloadFastboot(fastboot);

        broadcastMessage(WebSocketServer, `${event}: ${path}`);

        options.buildDist ? buildDistFolder(options.entryPoint, options) : null;
      })
    });

    if (environment === 'test') {
      Object.assign(watcher, {
        testsIndexHTML: watch(`${PROJECT_ROOT}/tests/index.html`, (path) => {
          broadcastMessage(WebSocketServer, `${event}: ${path}`)
        }),
        tests: watch(
          `${PROJECT_ROOT}/tests`,
          (path) => {
            if (path.endsWith('scss')) {
              return buildCSS(environment);
            } else if (path.endsWith('test.js')) {
              return buildTests(environment);
            }

            return buildApplication(environment, {
              applicationPrepends: options.buildConfig.applicationPrepends,
              applicationAppends: options.buildConfig.applicationAppends
            })
          },
          (path, event) => broadcastMessage(WebSocketServer, `${event}: ${path}`)
        )
      });
    } else if (environment === 'memserver') {
      Object.assign(watcher, {
        memserver: watch(
          `${PROJECT_ROOT}/memserver`,
          () => buildVendor(environment, {
            fastboot: options.fastboot,
            hasSocketWatching: true,
            vendorPrepends: options.buildConfig.vendorPrepends,
            vendorAppends: options.buildConfig.vendorAppends
          }),
          (path, event) => {
            reloadFastboot(fastboot);

            broadcastMessage(WebSocketServer, `${event}: ${path}`);

            options.buildDist ? buildDistFolder(options.entryPoint, options) : null;
          }
        )
      });
    }

    webSocket.on('close', () => {
      const clients = Array.from(WebSocketServer.clients)
      const aliveConnections = clients.reduce((result, webSocket) => {
        return webSocket.isAlive ? result + 1 : result;
      }, 0);

      if (aliveConnections === 0) {
        cleanWatchers(watcher);
      }

      watcher = {};
    });
  });
}

function watch(watchPath, buildFunction, callback) {
  return chokidar.watch(watchPath, { ignoreInitial: true }).on('all', (event, path) => {
    if (!global.chokidarBuild) {
      global.chokidarBuild = true;

      Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

      let result = buildFunction(path);

      if (!(result instanceof Promise)) {
        global.chokidarBuild = false

        return result
      }

      result.then(() => {
        callback ? callback(path, event) : null;
      }).finally(() => global.chokidarBuild = false);
    }
  });
}

function cleanWatchers(watcherObject) {
  Object.keys(watcherObject).forEach((watcherKey) => {
    watcherObject[watcherKey].close();
  });
}

function reloadFastboot(hasFastboot) {
  return hasFastboot ? global.fastboot.reload() : null;
}

function broadcastMessage(webSocketServer, message) {
  webSocketServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
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
