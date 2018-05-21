import chalk from 'chalk';
import injectBrowserToNode from '../utils/inject-browser-to-node';

// TODO: make injection dynamic along with environments
export default function() {
  // NOTE: check if parcel is running

  injectBrowserToNode('./ember-app-boilerplate/dist/index.html');

  const repl = require('repl');

  console.log(chalk.cyan('[mber CLI]'), 'Your browser console in node.js ;) Try window.Ember.Object');

  // proxy to window if not found
  repl.start('> ');
}
