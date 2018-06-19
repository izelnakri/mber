import Console from '../utils/console';

export default function(projectRoot, environment) {
  return new Promise((resolve) => {
    const ENV = require(`${projectRoot}/config/environment`)(environment);
    const buildPromise = require(`${projectRoot}/index`)(ENV);

    if (!buildPromise) {
      Console.error(`You must 'return app.build();' in your ${projectRoot}/index.js`);

      throw new Error(`You must 'return app.build();' in your ${projectRoot}/index.js`);
    }

    return buildPromise.then((result) => resolve(result));
  });
}
