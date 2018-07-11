import chalk from 'chalk';
import startBuilder from '../runners/start-builder';
import Console from '../utils/console';
import parseCLIArguments from '../utils/parse-cli-arguments';
import findProjectRoot from '../utils/find-project-root';
import injectBrowserToNode from '../utils/inject-browser-to-node';

export default async function(defaults={
  environment: 'development', port: 1234
}) {
  const PROJECT_ROOT = findProjectRoot();
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());

  let spinner = Console.spinner('Building application...');

  spinner.stop();

  getPort(OPTIONS.port).then(() => {
    startREPL(`${PROJECT_ROOT}/tmp/index.html`);
  }).catch(async () => { // TODO: needs startbuilder
    const ENTRYPOINT = `${PROJECT_ROOT}/index.html`;
    const ENV = require(`${PROJECT_ROOT}/config/environment`)(OPTIONS.environment);

    return startBuilder({
      ENV: ENV,
      projectRoot: PROJECT_ROOT,
      entrypoint: ENTRYPOINT
    }).then(() => {
      console.log('Assets built');

      startREPL(`${PROJECT_ROOT}/tmp/index.html`, OPTIONS.PORT);
    }).catch((error) => console.log('error', error));
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

function startREPL(indexPath, PORT) {
  injectBrowserToNode({ htmlPath: indexPath, url: `http://localhost:${PORT}` });

  const repl = require('repl');

  console.log(chalk.cyan('[mber CLI]'), 'Your browser console in node.js ;) Try window.Ember.Object');

  repl.start('> ');
}
