import Console from '../utils/console';

export default function(projectRoot, environment) {
  return new Promise((resolve) => {
    const buildConfig = require(`${projectRoot}/index`)(environment);

    if (!buildConfig) {
      Console.error(`You must 'return app.build();' in your ${projectRoot}/index.js`);

      throw new Error(`You must 'return app.build();' in your ${projectRoot}/index.js`);
    }

    buildConfig.then((result) => resolve(result));
  });
}
