import fs from 'fs';
import chalk from 'chalk';

export default function() {
  // NOTE: check if parcel is running

  const JSDOM = require('jsdom').JSDOM;

  const dom = new JSDOM(fs.readFileSync('./ember-app-boilerplate/dist/index.html').toString(), {
    url: 'http://localhost:1234',
    resources: 'usable',
    runScripts: 'dangerously'
  });

  global.window = dom.window;
  global.mainContext = window;

  global.document = window.document;
  global.self = window.self;

  const repl = require('repl');

  console.log(chalk.cyan('[mber CLI]'), 'Your browser console in node.js ;)');

  // proxy to window if not found
  repl.start('> ');
}
