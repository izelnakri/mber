import chalk from 'ansi-colors';
import chokidar from 'chokidar';
import eslint from 'eslint';
import WebSocket from 'ws';
import buildApplication from '../builders/build-application.js';
import buildCSS from '../builders/build-css.js';
import buildDocumentation from '../builders/build-documentation.js';
import buildDocumentationCSS from '../builders/build-documentation-css.js';
import buildTests from '../builders/build-tests.js';
import buildMemserver from '../builders/build-memserver.js';
import buildAssets from '../builders/build-assets.js';
import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';
import lookup from '../utils/recursive-file-lookup.js';

// TODO: maybe allow this to serve /tests on every environment
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
  const applicationName = buildConfig.applicationName || 'frontend';
  const projectRoot = buildConfig.projectRoot || await findProjectRoot();
  const cliArguments = buildConfig.cliArguments || { socketPort: 65511 };
  const ENV = buildConfig.ENV || {
    environment: 'development', modulePrefix: applicationName
  };
  const WebSocketServer = new WebSocket.Server({ port: cliArguments.socketPort });
  const watcher = buildWatchers();
  const excludeTestFiles = (item) => !item.path.endsWith('-test.js');
  const onlyTestFiles = (item) => item.path.endsWith('-test.js') || item.path.endsWith('-test.ts');

  return Object.assign(WebSocketServer, {
    killWatchers: () => cleanWatchers(watcher)
  });

  function buildWatchers(watcher={}) {
    Object.assign(watcher, {
      indexJS: watch(
        `${projectRoot}/index.js`,
        () => buildAssets(buildConfig),
        (path, event) => reloadApplicationWithMessage(path, event)
      ),
      indexHTML: watch(
        `${projectRoot}/index.html`,
        (path, event) => reloadApplicationWithMessage(path, event)
      ),
      src: watch(
        `${projectRoot}/src`,
        (path) => {
          if (path.endsWith('.scss')) {
            return buildCSS(buildConfig);
          } else if (path.endsWith('-test.js')) {
            return buildTests(buildConfig, false).then(() => {
              Promise.all([
                lookup(`${projectRoot}/tests`, ['js']),
                lookup(`${projectRoot}/src`, ['-test.js'], { filter: onlyTestFiles })
              ]).then(([testFolderFiles, appFolderTestFiles]) => {
                return global.MBER_THREAD_POOL.submit({
                  action: 'LINT_JS', fileNames: testFolderFiles.concat(appFolderTestFiles), projectRoot
                });
              });
            });
          }

          return buildApplication(buildConfig, false).then(() => {
            lookup(`${projectRoot}/src`, ['js'], { filter: excludeTestFiles }).then((fileNames) => {
              return global.MBER_THREAD_POOL.submit({ action: 'LINT_JS', fileNames, projectRoot });
            });
          });
        },
        (path, event) => reloadApplicationWithMessage(path, event)
      ),
      vendor: watch(`${projectRoot}/vendor`, (path) => {
        if (path.endsWith('.scss')) {
          return buildCSS(buildConfig);
        }

        return buildAssets(buildConfig);
      }, (path, event) => reloadApplicationWithMessage(path, event)),
      eslintRC: watch(`${projectRoot}/.eslintrc.js`, async () => {
        buildConfig.jsLinter = new eslint.CLIEngine(await import(`${projectRoot}/.eslintrc.js`));
      })
    });

    if (cliArguments.testing) {
      Object.assign(watcher, {
        tests: watch(
          `${projectRoot}/tests`,
          () => {
            return buildTests(buildConfig, false).then(() => {
              Promise.all([
                lookup(`${projectRoot}/tests`, ['js']),
                lookup(`${projectRoot}/src`, ['-test.js'], { filter: onlyTestFiles })
              ]).then(([testFolderFiles, appFolderTestFiles]) => {
                return global.MBER_THREAD_POOL.submit({
                  action: 'LINT_JS', fileNames: testFolderFiles.concat(appFolderTestFiles), projectRoot
                });
              });
            });
          },
          (path, event) => broadcastMessage(WebSocketServer, `${event}: ${path}`)
        )
      });
    }

    if (ENV.documentation && ENV.documentation.enabled) {
      Object.assign(watcher, {
        documentation: watch(
          `${projectRoot}/documentation`,
          (path) => {
            if (path.endsWith('.scss')) {
              return buildDocumentationCSS(buildConfig);
            }

            return buildDocumentation(buildConfig, false).then(() => {
              lookup(`${projectRoot}/documentation`, ['js']).then((fileNames) => {
                return global.MBER_THREAD_POOL.submit({ action: 'LINT_JS', fileNames, projectRoot });
              });
            });
          },
          (path, event) => broadcastMessage(WebSocketServer, `${event}: ${path}`)
        )
      });
    }

    if (ENV.memserver && ENV.memserver.enabled) {
      Object.assign(watcher, {
        memserver: watch(
          `${projectRoot}/memserver`,
          () => {
            return buildMemserver(buildConfig, false).then(() => {
              lookup(`${projectRoot}/memserver`, ['js']).then((fileNames) => {
                return global.MBER_THREAD_POOL.submit({ action: 'LINT_JS', fileNames, projectRoot });
              });
            });
          },
          (path, event) => reloadApplicationWithMessage(path, event)
        )
      });
    }

    return watcher;
  }

  function reloadApplicationWithMessage(path, event) {
    reloadFastboot(cliArguments.fastboot);

    broadcastMessage(WebSocketServer, `${event}: ${path}`);

    // options.buildDist ? buildDistFolder(entryPoint, buildConfig, options) : null;
  }

  function watch(watchPath, buildFunction, callback) {
    return chokidar.watch(watchPath, { ignoreInitial: true }).on('all', (event, path) => {
      if (!global.chokidarBuild) {
        global.chokidarBuild = true;

        Console.log(getEventColor(event), path.split(projectRoot)[1]);

        let result = pathIsForBuild(path) ? buildFunction(path) : null;

        if (!(result instanceof Promise)) {
          global.chokidarBuild = false

          return result
        }

        result.then(() => {
          callback ? callback(path, event) : null;
        }).catch(() => {
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
  return ['.js', '.ts', '.hbs', '.scss', '.html'].some((extension) => path.endsWith(extension));
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
