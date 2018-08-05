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
export default async function(options={
  buildConfig: {}, buildDist: false, entryPoint: null,
  fastboot: true, socketPort: 65511, testing: false
}) {
  const PROJECT_ROOT = await findProjectRoot();
  const entryPoint = options.entrypoint || `${PROJECT_ROOT}/index.html`;
  const { buildConfig, fastboot } = options;
  const { ENV, buildCache } = buildConfig;
  const environment = ENV.environment;
  const WebSocketServer = new WebSocket.Server({ port: options.socketPort || 65511 });
  const watcher = buildWatchers();

  return Object.assign(WebSocketServer, {
    killWatchers: () => cleanWatchers(watcher)
  });

  function buildWatchers(watcher={}) {
    Object.assign(watcher, {
      indexJS: watch(
        `${PROJECT_ROOT}/index.js`,
        () => buildAssets(PROJECT_ROOT, buildConfig),
        (path, event) => reloadApplicationWithMessage(path, event)
      ),
      indexHTML: watch(
        `${PROJECT_ROOT}/index.html`,
        (path, event) => reloadApplicationWithMessage(path, event)
      ),
      src: watch(
        `${PROJECT_ROOT}/src`,
        (path) => {
          if (path.endsWith('.scss')) {
            return buildCSS(environment);
          } else if (path.endsWith('-test.js')) {
            return buildTests(ENV);
          }

          return buildApplication(ENV, {
            applicationPrepends: buildCache.applicationPrepends,
            applicationAppends: buildCache.applicationAppends
          });
        },
        (path, event) => reloadApplicationWithMessage(path, event)
      ),
      vendor: watch(`${PROJECT_ROOT}/vendor`, (path) => {
        if (path.endsWith('.scss')) {
          return buildCSS(environment);
        }

        return buildAssets(PROJECT_ROOT, buildConfig);
      }, (path, event) => reloadApplicationWithMessage(path, event))
    });

    if (options.testing) {
      Object.assign(watcher, {
        tests: watch(
          `${PROJECT_ROOT}/tests`,
          () => buildTests(ENV),
          (path, event) => broadcastMessage(WebSocketServer, `${event}: ${path}`)
        )
      });
    }

    if (ENV.memserver && ENV.memserver.enabled) {
      Object.assign(watcher, {
        memserver: watch(
          `${PROJECT_ROOT}/memserver`,
          () => buildMemserver(ENV),
          (path, event) => reloadApplicationWithMessage(path, event)
        )
      });
    }

    return watcher;
  }

  function reloadApplicationWithMessage(path, event) {
    reloadFastboot(fastboot);

    broadcastMessage(WebSocketServer, `${event}: ${path}`);

    options.buildDist ? buildDistFolder(entryPoint, buildConfig, options) : null;
  }
}

function cleanWatchers(watcher) {
  Object.keys(watcher).forEach((watcherKey) => watcher[watcherKey].close());

  return watcher;
}

function watch(watchPath, buildFunction, callback) {
  const PROJECT_ROOT = findProjectRoot();

  return chokidar.watch(watchPath, { ignoreInitial: true }).on('all', (event, path) => {
    if (!global.chokidarBuild) {
      global.chokidarBuild = true;

      Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

      let result = pathIsForBuild(path) ? buildFunction(path) : null;

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

function pathIsForBuild(path) {
  return ['.js', '.hbs', '.scss', '.html'].some((extension) => path.endsWith(extension));
}

function getEventColor(event) {
  if (event === 'change') {
    return chalk.yellow('CHANGED:');
  } else if (event === 'add' || event === 'addDir') {
    return chalk.green('ADDED:');
  } else if (event === 'unlink' || event === 'unlinkDir') {
    return chalk.red('REMOVED:');
  }
}

// NOTE: check watch libs: chokidar(bad rap seems most popular), watchman(good rep), gaze, sane(new meh),  watch, fb-watchman
