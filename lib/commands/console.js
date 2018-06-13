import chalk from 'chalk';
import findProjectRoot from '../utils/find-project-root';
import injectBrowserToNode from '../utils/inject-browser-to-node';

// TODO: make injection dynamic along with environments
const PROJECT_ROOT = findProjectRoot();

export default function() {
  // run the server if its not running
  injectBrowserToNode(`${PROJECT_ROOT}/dist/index.html`);

  const repl = require('repl');

  console.log(chalk.cyan('[mber CLI]'), 'Your browser console in node.js ;) Try window.Ember.Object');

  // proxy to window if not found
  repl.start('> ');
}
