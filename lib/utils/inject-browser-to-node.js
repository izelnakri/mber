const fs = require('fs');
const JSDOM = require('jsdom').JSDOM;

module.exports = function(indexHtmlPath, options={
  url: 'http://localhost:1234',
  resources: 'usable',
  runScripts: 'dangerously'
}) {
  const html = indexHtmlPath ? fs.readFileSync(indexHtmlPath).toString() : `
    <html>
      <head>
        <title>Hello, from mber CLI</title>
      </head>
      <body>
        <h1>Welcome to future, browser inside your node.js process</h1>
      </body>
    </html>
  `;

  global.dom = new JSDOM(html, options);
  global.window = global.dom.window;
  global.mainContext = window;
  global.document = window.document;
  global.self = window.self;
}
