import Console from '../utils/console.js';

export default function(projectRoot, ENV={}) {
  return new Promise(async (resolve) => {
    const buildPromise = (await import(`${projectRoot}/index.js`)).default(ENV);

    if (!buildPromise) {
      Console.error(`You must 'return app.build();' in your ${projectRoot}/index.js`);

      throw new Error(`You must 'return app.build();' in your ${projectRoot}/index.js`);
    }

    return buildPromise.then((result) => resolve(result));
  });
}
