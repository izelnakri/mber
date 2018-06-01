import chalk from 'chalk';
import chokidar from 'chokidar';
import WebSocket from 'ws';
import buildApplication from '../builders/build-application';
import buildCSS from '../builders/build-css';
import buildDist from '../builders/build-dist';
import buildTests from '../builders/build-tests';
import buildVendor from '../builders/build-vendor';
import Console from './console';
import findProjectRoot from './find-project-root';

// TODO: allow this to serve /tests on every environment

const PROJECT_ROOT = findProjectRoot();

export default function(environment='development', socketPort=65511, options={
  buildDist: false, entryPoint: `${PROJECT_ROOT}/index.html`
}) {
  const WebSocketServer = new WebSocket.Server({
    port: socketPort
  });

  chokidar.watch(`${PROJECT_ROOT}/index.js`, { ignoreInitial: true }).on('all', (event, path) => {
    Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

    WebSocketServer.send(`${event}: ${path}`);

    options.buildDist ? buildDist(options.entryPoint) : null;
  });

  chokidar.watch(`${PROJECT_ROOT}/index.html`, { ignoreInitial: true }).on('all', (event, path) => {
    Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

    WebSocketServer.send(`${event}: ${path}`);

    options.buildDist ? buildDist(options.entryPoint) : null;
  });

  chokidar.watch(`${PROJECT_ROOT}/src`, { ignoreInitial: true }).on('all', (event, path) => {
    Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

    if (path.endsWith('scss')) {
      return buildCSS(environment).then(() => {
        WebSocketServer.send(`${event}: ${path}`)

        options.buildDist ? buildDist(options.entryPoint) : null;
      }).catch((error) => Console.log(chalk.red('ERROR:'), error));
    }

    buildApplication(environment).then(() => {
      WebSocketServer.send(`${event}: ${path}`)

      options.buildDist ? buildDist(options.entryPoint) : null;
    }).catch((error) => Console.log(chalk.red('ERROR:'), error));
  });

  chokidar.watch(`${PROJECT_ROOT}/vendor`, { ignoreInitial: true }).on('all', (event, path) => {
    Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

    if (path.endsWith('scss')) {
      return buildCSS(environment).then(() => {
        WebSocketServer.send(`${event}: ${path}`);

        options.buildDist ? buildDist(options.entryPoint) : null;
      }).catch((error) => Console.log(chalk.red('ERROR:'), error));
    }

    buildApplication(environment).then(() => {
      WebSocketServer.send(`${event}: ${path}`);

      options.buildDist ? buildDist(options.entryPoint) : null;
    }).catch((error) => Console.log(chalk.red('ERROR:'), error));
  });

  if (environment === 'test') {
    chokidar.watch(`${PROJECT_ROOT}/tests/index.html`, { ignoreInitial: true }).on('all', (event, path) => {
      Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

      WebSocketServer.send(`${event}: ${path}`);
    });

    chokidar.watch(`${PROJECT_ROOT}/tests`, { ignoreInitial: true }).on('all', (event, path) => {
      Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

      if (path.endsWith('scss')) {
        return buildCSS(environment).then(() => WebSocketServer.send(`${event}: ${path}`))
          .catch((error) => Console.log(chalk.red('ERROR:'), error));
      } else if (path.endsWith('test.js')) {
        return buildTests(environment).then(() => WebSocketServer.send(`${event}: ${path}`))
          .catch((error) => Console.log(chalk.red('ERROR:'), error));
      }

      buildApplication(environment).then(() => WebSocketServer.send(`${event}: ${path}`))
        .catch((error) => Console.log(chalk.red('ERROR:'), error));
    });

  } else if (environment === 'memserver') {
    watchMemServerFolder(environment, WebSocketServer, options);
  }
}

function getEventColor(event) {
  console.log('event is', event);

  if (event === 'change') {
    return chalk.yellow('CHANGED:');
  } else if (event === 'added' || event === 'adddir') {
    return chalk.green('ADDED:');
  } else if (event === 'removed') {
    return chalk.red('REMOVED:');
  }
}

function watchMemServerFolder(environment, webSockerServer, options) {
  chokidar.watch(`${PROJECT_ROOT}/memserver`, { ignoreInitial: true }).on('all', (event, path) => {
    Console.log(getEventColor(event), path.split(PROJECT_ROOT)[1]);

    buildVendor(environment).then(() => {
      webSockerServer.send(`${event}: ${path}`);

      options.buildDist ? buildDist(options.entryPoint) : null;
    }).catch((error) => Console.log(chalk.red('ERROR:'), error));
  });
}
