import Console from '../utils/console';
import Mber from '../../main';

export default function(projectRoot, buildConfig) {
  return new Promise((resolve) => {
    if (buildConfig.buildCache) {
      return Mber.buildWithCache(buildConfig).then((result) => resolve(result));
    }

    const buildPromise = require(`${projectRoot}/index`)(buildConfig.ENV);

    if (!buildPromise) {
      Console.error(`You must 'return app.build();' in your ${projectRoot}/index.js`);

      throw new Error(`You must 'return app.build();' in your ${projectRoot}/index.js`);
    }

    return buildPromise.then((result) => resolve(result));
  });
}
