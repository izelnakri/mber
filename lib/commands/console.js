import chalk from 'ansi-colors';
import WorkerPool from '../worker-pool';
import startBuilder from '../runners/start-builder';
import startHTTPServer from '../runners/start-http-server';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import injectBrowserToNode from '../utils/inject-browser-to-node';
import parseCLIArguments from '../utils/parse-cli-arguments';

export default async function(defaults={
  environment: 'development', talk: true, fastboot: true, port: 1234, socketPort: 65511
}) {
  let spinner = Console.spinner('Building application...');

  global.MBER_DISABLE_SOCKETS = true;
  global.MBER_THREAD_POOL = WorkerPool.start();

  const PROJECT_ROOT = await findProjectRoot();
  const { environment, port } = Object.assign({}, defaults, parseCLIArguments());

  spinner.stop();

  getPort(port).then(() => {
    const ENV = require(`${PROJECT_ROOT}/config/environment`)(environment);

    return startBuilder(PROJECT_ROOT, ENV).then(async (buildConfig) => {
      Console.log('APPLICATION BUNDLED');

      await startHTTPServer(buildConfig);
      await startREPL(`${PROJECT_ROOT}/tmp/index.html`, port);
    }).catch((error) => console.log('error', error));
  }).catch(async () => {
    Console.log('INJECTING A RUNNING APPLICATION:');

    await startREPL(`${PROJECT_ROOT}/tmp/index.html`, port);
  });
}

function getPort(portNumber) {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer();

    server.once('error', function(err) {
      if (err.code === 'EADDRINUSE') {
        reject();
      }
    });

    server.once('listening', function() {
      server.close();
      resolve();
    });

    server.listen(portNumber);
  });
}

async function startREPL(indexPath, port) {
  await injectBrowserToNode({
    htmlPath: indexPath,
    url: `http://localhost:${port}`
  });

  const repl = require('repl');

  console.log(chalk.cyan('[mber CLI]'), 'Your browser console in node.js ;) Try window.Ember.Object');

  repl.start('> ');
}
