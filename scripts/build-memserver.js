import fs from 'fs-extra';
import findProjectRoot from '../lib/utils/find-project-root.js';
import convertESModuletoAMD from '../lib/transpilers/convert-es-module-to-amd.js';
import transpileNPMImport from '../lib/transpilers/transpile-npm-imports.js';

// const removeFetch = `
//   (function() {
//     window.fetch = undefined;
//   })();
// `;

async function build() {
  const PROJECT_PATH = await findProjectRoot();
  const MODULE_PATH = `${PROJECT_PATH}/node_modules`;
  const VENDOR_PATH = `${PROJECT_PATH}/vendor`;

  return Promise.all([
    // fs.readFile(`${MODULE_PATH}/whatwg-fetch/dist/fetch.umd.js`),
    transpileNPMImport('memserver/model', `${MODULE_PATH}/memserver/model.js`),
    transpileNPMImport('memserver/server', `${MODULE_PATH}/memserver/server.js`)
  ]).then(async ([memServerModelModule, memServerServerModule]) => {
    const memserverResponseModule = await convertESModuletoAMD(`
      export default function(statusCode=200, data={}, headers={}) {
        return [
          statusCode,
          Object.assign({ 'Content-Type': 'application/json' }, headers),
          JSON.stringify(data)
        ];
      }
    `, { moduleName: 'memserver/response' });

    // NOTE: cant remove fetch replacements because ember-fetch injection doesnt take into account the possiblity of fetch mocking in node.js
    return Promise.all([
      fs.copy(`${PROJECT_PATH}/scripts/memserver/initializers/ajax.js`, `${VENDOR_PATH}/memserver/fastboot/initializers/ajax.js`),
      fs.writeFile(`${VENDOR_PATH}/memserver.js`, `
        ${memServerModelModule}

        ${memserverResponseModule}

        ${memServerServerModule}
      `)
    ])
  });
}

build().then(() => console.log('memserver.js built'));
