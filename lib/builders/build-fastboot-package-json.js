// TODO: maybe in future index.html transpilation/building

import fs from 'fs';
import { promisify } from 'util';
import findProjectRoot from '../utils/find-project-root';

const writeFileAsync = promisify(fs.writeFile);

const PROJECT_ROOT = findProjectRoot();

export default function(assetMap, environment='development', distPath='dist') {
  const ENV = require(`${PROJECT_ROOT}/config/environment.js`)(environment);

  return writeFileAsync(`${PROJECT_ROOT}/${distPath}/package.json`, JSON.stringify({
    dependencies: {},
    fastboot: {
      appName: ENV.modulePrefix || 'frontend',
      config: {
        [ENV.modulePrefix || 'frontend']: Object.assign(ENV, {
          APP: Object.assign(ENV.APP, {
            autoboot: false,
            name: ENV.modulePrefix,
            version: "0.0.0+578db4ce"
          })
        })
      },
      hostWhitelist: [],
      manifest: {
        appFiles: [assetMap['assets/application.js']],
        htmlFile: 'index.html',
        vendorFiles: [assetMap['assets/vendor.js']]
      },
      moduleWhitelist: [],
      schemaVersion: 3
    }
  }, null, 2));
}

// NOTE: this manifest file is stupid all fastboot needs should be ENV object(or maybe even environment string) + index.html location
