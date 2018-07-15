const fs = require('fs-extra');
const http = require('http');
const JSDOM = require('jsdom').JSDOM;

const defaults = {
  html: null,
  htmlPath: null,
  url: null,
  resources: 'usable',
  runScripts: 'dangerously'
};

module.exports = async function(options={
  html: null,
  htmlPath: null,
  url: null,
  resources: 'usable',
  runScripts: 'dangerously'
}) {
  return new Promise(async (resolve) => {
    const OPTIONS = Object.assign({}, defaults, options);
    const html = await getHTML(OPTIONS);

    global.dom = new JSDOM(html, {
      url: OPTIONS.url || 'http://localhost',
      resources: OPTIONS.resources,
      runScripts: OPTIONS.runScripts
    });

    global.window = global.dom.window;
    global.mainContext = window;
    global.document = window.document;
    global.self = window.self;

    setTimeout(() => resolve(global.window), 1000); // TODO: decrease this
  })
}

function getHTML(options={ html: null, htmlPath: null, url: null }) {
  return new Promise(async (resolve, reject) => {
    if (options.html && options.html.length > 2){
      return resolve(options.html);
    } else if (options.htmlPath) {
      return resolve((await fs.readFile(options.htmlPath)).toString());
    } else if (options.url) {
      return http.get(options.url, (res) => {
        const { statusCode } = res;

        if (statusCode !== 200) {
          console.log('statusCode is', statusCode);
          console.log('response is');
          console.log(res);
          throw new Error(`Request Failed.\nStatus Code: ${statusCode}`);
        }

        res.setEncoding('utf8');
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          resolve(rawData)
        });
      }).on('error', (error) => reject(`http error: ${error.message}`));
    }

    resolve(`
      <html>
        <head>
          <title>Hello, from mber CLI</title>
        </head>
        <body>
          <h1>Welcome to future, browser inside your node.js process</h1>
        </body>
      </html>
    `);
  });
}
