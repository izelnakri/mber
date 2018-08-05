import chalk from 'chalk';
import startBuilder from '../runners/start-builder';
import startHTTPServer from '../runners/start-http-server';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';
import injectBrowserToNode from '../utils/inject-browser-to-node';
import parseCLIArguments from '../utils/parse-cli-arguments';

export default async function(defaults={
  environment: 'development', port: 1234
}) {
  const PROJECT_ROOT = await findProjectRoot();
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());

  let spinner = Console.spinner('Building application...');

  spinner.stop();

  getPort(OPTIONS.port).then(() => {
    const ENTRYPOINT = `${PROJECT_ROOT}/index.html`;
    const ENV = require(`${PROJECT_ROOT}/config/environment`)(OPTIONS.environment);

    return startBuilder({
      ENV: ENV,
      projectRoot: PROJECT_ROOT,
      entrypoint: ENTRYPOINT
    }).then(async () => {
      Console.log('APPLICATION BUNDLED');

      await startHTTPServer(ENV, { port: OPTIONS.port });
      await startREPL(`${PROJECT_ROOT}/tmp/index.html`, OPTIONS.port);
    }).catch((error) => console.log('error', error));
  }).catch(async () => {
    Console.log('INJECTING A RUNNING APPLICATION:');

    await startREPL(`${PROJECT_ROOT}/tmp/index.html`, OPTIONS.port);
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
