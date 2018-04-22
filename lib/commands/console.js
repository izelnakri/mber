import chalk from 'chalk';

export default function() {
  const JSDOM = require('jsdom').JSDOM;
  const dom = new JSDOM('<p>Hello</p>', { url: 'http://localhost' });

  global.window = dom.window;
  global.document = window.document;
  global.self = window.self;

  const repl = require('repl');

  console.log(chalk.cyan('[mber CLI]'), 'Your browser console in node.js ;)');
  repl.start('> ');
}
