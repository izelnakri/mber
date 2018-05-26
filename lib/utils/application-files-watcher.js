import chalk from 'chalk';
import chokidar from 'chokidar';
import buildApplication from './build-application';
// import buildTests from './build-tests';
import Console from './console';
import findProjectRoot from './find-project-root';

export default function(environment='development') {
  const PROJECT_ROOT = findProjectRoot();

  chokidar.watch(`${PROJECT_ROOT}/src`, { ignoreInitial: true }).on('all', (event, path) => {
    Console.log(getEventColor(event), path);

    buildApplication(environment)
      .then(() => {})
      .catch((error) => Console.log(chalk.red('ERROR:'), error));
  }); // TODO: also watch /vendor and /public and index.html and index.js

  if (environment === 'test') {
    chokidar.watch(`${PROJECT_ROOT}/tests`, { ignoreInitial: true }).on('all', (event, path) => {
      Console.log(getEventColor(event), path);

      // buildTests(environment)
      //   .then(() => {})
      //   .catch((error) => Console.log(chalk.red('ERROR:'), error));
    });
  }
}

function getEventColor(event) {
  console.log('event is', event);

  if (event === 'changed') {
    return chalk.yellow('CHANGED:');
  } else if (event === 'added' || event === 'adddir') {
    return chalk.green('ADDED:');
  } else if (event === 'removed') {
    return chalk.red('REMOVED:');
  }
}


// - listen entire /src (require('broccoli-source').WatchedDir)
// - listen /tests is listen et
// - listen /src/ui/styles
// - listen /vendor
// - listen /public
// - listen index.html, and listen app.import(module) from node_modules
// ui/index.html
