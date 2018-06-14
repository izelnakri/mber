import { promisify } from 'util';
import chalk from 'chalk';
import fs from 'fs-extra';
import setupBuild from '../builders/setup-build';
import Console from '../utils/console';
import parseCLIArguments from '../utils/parse-cli-arguments';
import findProjectRoot from '../utils/find-project-root';
import injectBrowserToNode from '../utils/inject-browser-to-node';

const ensureDirAsync = promisify(fs.ensureDir);

const PROJECT_ROOT = findProjectRoot();

export default async function(defaults={
  environment: 'development', port: 1234
}) {
  const OPTIONS = Object.assign({}, defaults, parseCLIArguments());

  let spinner = Console.spinner('Building application...');

  spinner.stop();

  getPort(OPTIONS.port).then(() => {
    startREPL(`${PROJECT_ROOT}/tmp/index.html`);
  }).catch(async () => {
    console.log('building');
    Promise.all([
      setupBuild(PROJECT_ROOT, OPTIONS.environment),
      ensureDirAsync(`${PROJECT_ROOT}/tmp/assets`)
    ]).then(() => {
      console.log('called2');

      startREPL(`${PROJECT_ROOT}/tmp/index.html`);
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

function startREPL(indexPath) {
  injectBrowserToNode(indexPath);

  console.log('injected');
  const repl = require('repl');

  console.log(chalk.cyan('[mber CLI]'), 'Your browser console in node.js ;) Try window.Ember.Object');

  repl.start('> ');
}
