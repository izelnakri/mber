import fs from 'fs-extra';
import findProjectRoot from '../lib/utils/find-project-root';
import convertESModuletoAMD from '../lib/transpilers/convert-es-module-to-amd';
import transpileNPMImport from '../lib/transpilers/transpile-npm-imports';

const removeFetch = `
  (function() {
    window.fetch = undefined;
  })();
`;

async function build() {
  const PROJECT_PATH = await findProjectRoot();
  const MODULE_PATH = `${PROJECT_PATH}/node_modules`;
  const VENDOR_PATH = `${PROJECT_PATH}/vendor`;

  return Promise.all([
    fs.readFile(`${MODULE_PATH}/whatwg-fetch/fetch.js`),
    transpileNPMImport('memserver/model', `${MODULE_PATH}/memserver/model.js`),
    transpileNPMImport('memserver', `${MODULE_PATH}/memserver/lib/mem-server-cjs.js`)
  ]).then(async ([fetchReplacement, memServerModelModule, memServerModule]) => {
    const memserverResponseModule = await convertESModuletoAMD(`
      export default function(statusCode=200, data={}, headers={}) {
        return [
          statusCode,
          Object.assign({ 'Content-Type': 'application/json' }, headers),
          JSON.stringify(data)
        ];
      }
    `, { moduleName: 'memserver/response' });

    return Promise.all([
      fs.copy(`${PROJECT_PATH}/scripts/memserver/initializers/ajax.js`, `${VENDOR_PATH}/memserver/fastboot/initializers/ajax.js`),
      fs.writeFile(`${VENDOR_PATH}/memserver.js`, `
        ${removeFetch}

        ${fetchReplacement}

        ${memServerModelModule}

        ${memserverResponseModule}

        ${memServerModule}
      `)
    ])
  });
}

build().then(() => console.log('memserver.js built'));

// NOTE: chalk adds thousands lines of code that isnt used
// NOTE: node util adds strange code via browserify
// NOTE: chalk gets add up twice
// NOTE: node util, 'inflections' shit again
// TODO: maybe minify this
