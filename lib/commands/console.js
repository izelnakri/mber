// TODO: this should be able to use puppeteer directly instead of jsdom
import chalk from 'ansi-colors';
import startBuilder from '../runners/start-builder.js';
import startHTTPServer from '../runners/start-http-server.js';
import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';
import injectBrowserToNode from '../utils/inject-browser-to-node.js';
import parseCLIArguments from '../utils/parse-cli-arguments.js';

export default async function(defaults={
  environment: 'development', talk: true, fastboot: true, port: 1234, socketPort: 65511
}) {
  let spinner = Console.spinner('Building application...');

  global.MBER_DISABLE_SOCKETS = true;

  const PROJECT_ROOT = await findProjectRoot();
  const { environment, port } = Object.assign({}, defaults, parseCLIArguments());

  spinner.stop();

  getPort(port).then(async () => {
    const ENV = (await import(`${PROJECT_ROOT}/config/environment.js`)).default(environment);

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
  return new Promise(async (resolve, reject) => {
    const net = (await import('net')).default;
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

  const repl = await import('repl');

  console.log(chalk.cyan('[mber CLI]'), 'Your browser console in node.js ;) Try window.Ember.Object');

  repl.start('> ');
}
