import fs from 'fs';
import { promisify } from 'util';
import findProjectRoot from '../lib/utils/find-project-root';
import convertESModuletoAMD from '../lib/transpilers/convert-es-module-to-amd';
import transpileNPMImport from '../lib/transpilers/transpile-npm-imports';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const PROJECT_PATH = findProjectRoot();
const MODULE_PATH = `${PROJECT_PATH}/node_modules`;
const VENDOR_PATH = `${PROJECT_PATH}/vendor`;

const removeFetch = `
  (function() {
    window.fetch = undefined;
  })();
`;
const memserverResponseModule = convertESModuletoAMD(`
  export default function(statusCode=200, data={}, headers={}) {
    return [
      statusCode,
      Object.assign({ 'Content-Type': 'application/json' }, headers),
      JSON.stringify(data)
    ];
  }
`, { moduleName: 'memserver/response' });

console.log('memserverResponseModule is', memserverResponseModule);

function build() {
  return Promise.all([
    readFileAsync(`${MODULE_PATH}/whatwg-fetch/fetch.js`),
    transpileNPMImport('memserver/model', `${MODULE_PATH}/memserver/lib/model.js`),
    transpileNPMImport('memserver', `${MODULE_PATH}/memserver/lib/mem-server.js`)
  ]).then(([fetchReplacement, memServerModelModule, memServerModule]) => {
    // UglifyJS.minify(content, {
    //   compress: {
    //     negate_iife: false,
    //     sequences: 20
    //   },
    //   output: {
    //     semicolons: false
    //   }
    // }).code
    return writeFileAsync(`${VENDOR_PATH}/memserver.js`, `
      ${removeFetch}

      ${fetchReplacement}

      ${memServerModelModule}

      ${memserverResponseModule}

      ${memServerModule}
    `);
  })
}

build().then(() => console.log('memserver.js built'));

// NOTE: chalk adds thousands lines of code that isnt used
// NOTE: node util adds strange code via browserify
// NOTE: chalk gets add up twice
// NOTE: node util, 'inflections' shit again
// TODO: maybe minify this
