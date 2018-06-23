import fs from 'fs';
import { promisify } from 'util';
import findProjectRoot from '../utils/find-project-root';

const writeFileAsync = promisify(fs.writeFile);

const PROJECT_ROOT = findProjectRoot();

export default function(assetMap, ENV={}, distPath='dist') {
  const APPLICATION_NAME = ENV.modulePrefix || 'frontend';
  const APPLICATION_PATH = assetMap['assets/application.js'];
  const MEMSERVER_ENABLED = ENV.memserver && ENV.memserver.enabled;

  return writeFileAsync(`${PROJECT_ROOT}/${distPath}/package.json`, JSON.stringify({
    dependencies: {},
    fastboot: {
      appName: APPLICATION_NAME,
      config: {
        [APPLICATION_NAME]: Object.assign(ENV, {
          APP: Object.assign(ENV.APP, {
            autoboot: false,
            name: ENV.modulePrefix,
            version: "0.0.0+578db4ce"
          })
        })
      },
      hostWhitelist: [],
      manifest: {
        appFiles: MEMSERVER_ENABLED ?
          [assetMap['assets/memserver.js'], APPLICATION_PATH] : [APPLICATION_PATH],
        htmlFile: 'index.html',
        vendorFiles: [assetMap['assets/vendor.js']]
      },
      moduleWhitelist: [],
      schemaVersion: 3
    }
  }, null, 2));
}

// NOTE: this manifest file is stupid all fastboot needs should be ENV object(or maybe even environment string) + index.html location
