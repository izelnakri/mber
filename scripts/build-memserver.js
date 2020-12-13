import fs from 'fs/promises';
import findProjectRoot from '../lib/utils/find-project-root.js';
import convertESModuletoAMD from '../lib/transpilers/convert-es-module-to-amd.js';
import transpileNPMImport from '../lib/transpilers/transpile-npm-imports.js';

async function build() {
  const PROJECT_PATH = await findProjectRoot();
  const MODULE_PATH = `${PROJECT_PATH}/node_modules`;
  const VENDOR_PATH = `${PROJECT_PATH}/vendor`;

  return Promise.all([
    transpileNPMImport('memserver/model', `${MODULE_PATH}/memserver/model.js`),
    transpileNPMImport('memserver/server', `${MODULE_PATH}/memserver/server.js`)
  ]).then(async ([fetchReplacement, memServerModelModule, memServerServerModule]) => {
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
      fs.copyFile(`${PROJECT_PATH}/scripts/memserver/initializers/ajax.js`, `${VENDOR_PATH}/memserver/fastboot/initializers/ajax.js`),
      fs.writeFile(`${VENDOR_PATH}/memserver.js`, `
        ${fetchReplacement}

        ${memServerModelModule}

        ${memserverResponseModule}

        ${memServerServerModule}
      `)
    ])
  });
}

build().then(() => console.log('memserver.js built'));
