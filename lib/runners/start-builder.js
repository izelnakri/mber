import Console from '../utils/console';
import Mber from '../../main';

export default function(buildConfig={
  buildCache: {
    vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: ''
  },
  projectRoot: null,
  ENV: {},
  applicationName: null,
  indexHTMLInjections: {},
  entrypoint: null,
  cliArguments: {}
}) {
  const { projectRoot, ENV } = buildConfig;

  return new Promise((resolve) => {
    const buildPromise = require(`${projectRoot}/index`)(ENV);

    if (!buildPromise) {
      Console.error(`You must 'return app.build();' in your ${projectRoot}/index.js`);

      throw new Error(`You must 'return app.build();' in your ${projectRoot}/index.js`);
    }

    return buildPromise.then((result) => resolve(result));
  });
}
