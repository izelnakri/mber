import chalk from 'chalk';
import chokidar from 'chokidar';
import WebSocket from 'ws';
import buildApplication from '../builders/build-application';
import buildCSS from '../builders/build-css';
import buildTests from '../builders/build-tests';
import buildMemserver from '../builders/build-memserver';
import buildAssets from '../builders/build-assets';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';

// TODO: fix runners
// TODO: maybe allow this to serve /tests on every environment
export default async function(buildConfig={
  applicationName: null,
  buildCache: {
    vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: ''
  },
  cliArguments: null,
  ENV: null,
  indexHTMLInjections: {},
  projectRoot: null,
  testing: false
}) {
  const APPLICATION_NAME = buildConfig.applicationName || 'frontend';
  const PROJECT_ROOT = buildConfig.projectRoot || await findProjectRoot();
  const CLI_ARGUMENTS = buildConfig.cliArguments || {};
  const ENV = buildConfig.ENV || {
    environment: 'development', modulePrefix: APPLICATION_NAME
  };
  const WebSocketServer = new WebSocket.Server({ port: CLI_ARGUMENTS.socketPort || 65511 });
  const watcher = buildWatchers();

  return Object.assign(WebSocketServer, {
    killWatchers: () => cleanWatchers(watcher)
  });

  function buildWatchers(watcher={}) {
    Object.assign(watcher, {
      indexJS: watch(
        `${PROJECT_ROOT}/index.js`,
        () => buildAssets(buildConfig),
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
            return buildCSS(buildConfig);
          } else if (path.endsWith('-test.js')) {
            return buildTests(buildConfig);
          }

          return buildApplication(buildConfig);
        },
        (path, event) => reloadApplicationWithMessage(path, event)
      ),
      vendor: watch(`${PROJECT_ROOT}/vendor`, (path) => {
        if (path.endsWith('.scss')) {
          return buildCSS(buildConfig);
        }

        return buildAssets(buildConfig);
      }, (path, event) => reloadApplicationWithMessage(path, event))
    });

    if (buildConfig.testing) {
      Object.assign(watcher, {
        tests: watch(
          `${PROJECT_ROOT}/tests`,
          () => buildTests(buildConfig),
          (path, event) => broadcastMessage(WebSocketServer, `${event}: ${path}`)
        )
      });
    }

    if (ENV.memserver && ENV.memserver.enabled) {
      Object.assign(watcher, {
        memserver: watch(
          `${PROJECT_ROOT}/memserver`,
          () => buildMemserver(buildConfig),
          (path, event) => reloadApplicationWithMessage(path, event)
        )
      });
    }

    return watcher;
  }

  function reloadApplicationWithMessage(path, event) {
    reloadFastboot(CLI_ARGUMENTS.fastboot);

    broadcastMessage(WebSocketServer, `${event}: ${path}`);

    // options.buildDist ? buildDistFolder(entryPoint, buildConfig, options) : null;
  }

  function watch(watchPath, buildFunction, callback) {
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
}

function cleanWatchers(watcher) {
  Object.keys(watcher).forEach((watcherKey) => watcher[watcherKey].close());

  return watcher;
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
