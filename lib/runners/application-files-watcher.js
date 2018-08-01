import chalk from 'chalk';
import chokidar from 'chokidar';
import WebSocket from 'ws';
import buildApplication from '../builders/build-application';
import buildCSS from '../builders/build-css';
import buildDistFolder from '../builders/build-dist-folder';
import buildTests from '../builders/build-tests';
import buildMemserver from '../builders/build-memserver';
import buildAssets from '../builders/build-assets';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';

// TODO: maybe allow this to serve /tests on every environment
// TODO: socketPort should be sourced from buildConfig!! not as a parameter!!
export default function(environment='development', options={
  buildConfig: {}, buildDist: false, entryPoint: null,
  fastboot: true, socketPort: 65511, testing: false
}) {
  let watcher = {};

  const PROJECT_ROOT = findProjectRoot();
  const entryPoint = options.entrypoint || `${PROJECT_ROOT}/index.html`;
  const { buildConfig, fastboot } = options;
  const WebSocketServer = new WebSocket.Server({ port: options.socketPort || 65511 });
  const { ENV, buildCache } = buildConfig;

  // TODO: watcher only works currently if there has been a connection! change that
  WebSocketServer.on('connection', () => {
    cleanWatchers(watcher);

    Object.assign(watcher, {
      indexJS: watch(
        `${PROJECT_ROOT}/index.js`,
        () => buildAssets(PROJECT_ROOT, buildConfig),
        (path, event) => {
          reloadFastboot(fastboot);

          broadcastMessage(WebSocketServer, `${event}: ${path}`)

          options.buildDist ? buildDistFolder(entryPoint, buildConfig, options) : null;
        }
      ),
      indexHTML: watch(
        `${PROJECT_ROOT}/index.html`,
        (path, event) => {
          reloadFastboot(fastboot);

          broadcastMessage(WebSocketServer, `${event}: ${path}`);

          options.buildDist ? buildDistFolder(entryPoint, buildConfig, options) : null;
        }
      ),
      src: watch(
        `${PROJECT_ROOT}/src`,
        (path) => {
          if (path.endsWith('scss')) {
            return buildCSS(environment);
          } else if (path.endsWith('-test.js')) {
            return buildTests(ENV);
          }

          return buildApplication(ENV, {
            applicationPrepends: buildCache.applicationPrepends,
            applicationAppends: buildCache.applicationAppends
          });
        },
        (path, event) => {
          reloadFastboot(fastboot);

          broadcastMessage(WebSocketServer, `${event}: ${path}`)

          options.buildDist ? buildDistFolder(entryPoint, buildConfig, options) : null;
        }
      ),
      vendor: watch(`${PROJECT_ROOT}/vendor`, (path) => {
        if (path.endsWith('scss')) {
          return buildCSS(environment);
        }

        return buildAssets(PROJECT_ROOT, buildConfig);
      }, (path, event) => {
        reloadFastboot(fastboot);

        broadcastMessage(WebSocketServer, `${event}: ${path}`);

        options.buildDist ? buildDistFolder(entryPoint, buildConfig, options) : null;
      })
    });

    if (options.testing) {
      Object.assign(watcher, {
        tests: watch(`${PROJECT_ROOT}/tests`, (path) => {
          if (path.endsWith('scss')) {
            return buildCSS(environment);
          }

          return buildTests(ENV);
        }, (path, event) => broadcastMessage(WebSocketServer, `${event}: ${path}`)
        )
      });
    }

    if (ENV.memserver && ENV.memserver.enabled) {
      Object.assign(watcher, {
        memserver: watch(`${PROJECT_ROOT}/memserver`, () => {
          return buildMemserver(ENV);
        }, (path, event) => {
          reloadFastboot(fastboot);

          broadcastMessage(WebSocketServer, `${event}: ${path}`);

          options.buildDist ? buildDistFolder(entryPoint, buildConfig, options) : null;
        })
      });
    }
  });

  return Object.assign(WebSocketServer, {
    cleanWatchers() {
      return cleanWatchers(watcher)
    }
  });
}

function watch(watchPath, buildFunction, callback) {
  const PROJECT_ROOT = findProjectRoot();

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
      }).catch(() => { // error
        // TODO: make an index.html to display the error
        // error type has to be derived from the error!
      }).finally(() => global.chokidarBuild = false);
    }
  });
}

function cleanWatchers(watcherObject) {
  Object.keys(watcherObject).forEach((watcherKey) => {
    return watcherObject[watcherKey].close();
  });
}

// function reloadApplication(path, event, {
//   fastboot, WebSocketServer, entryPoint, buildConfig, options
// }) {
//   reloadFastboot(fastboot);
//
//   broadcastMessage(WebSocketServer, `${event}: ${path}`);
//
//   options.buildDist ? buildDistFolder(entryPoint, buildConfig, options) : null;
// }

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
  } else if (event === 'add' || event === 'adddir') {
    return chalk.green('ADDED:');
  } else if (event === 'unlink' || event === 'unlinkDir') {
    return chalk.red('REMOVED:');
  }
}

// NOTE: check watch libs: chokidar(bad rap seems most popular), watchman(good rep), gaze, sane(new meh),  watch, fb-watchman
