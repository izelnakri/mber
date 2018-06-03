import chalk from 'chalk';
import Console from '../utils/console';

export default function(projectRoot, environment) {
  const buildConfig = require(`${projectRoot}/index`)(environment);

  if (!buildConfig) {
    Console.error(`You must 'return app.build();' in your ${projectRoot}/index.js`);

    throw new Error(`You must 'return app.build();' in your ${projectRoot}/index.js`);
  }

  return buildConfig;
}
