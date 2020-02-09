import Console from '../utils/console.js';
import findProjectRoot from '../utils/find-project-root.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async function(abstractionType, name) {
  const PROJECT_ROOT = await findProjectRoot();
  const commandAbstranctionType = [
    'component',
    'controller',
    'helper',
    'initializer',
    'instance-initializer',
    'mixin',
    'model',
    'modifier',
    'route',
    'service',
    'util'
  ].find((abstraction) => abstractionType === abstraction);

  if (!commandAbstranctionType) {
    Console.error(`${commandAbstranctionType} is not a valid ember abstraction to generate`);
    process.exit(1);
  } else if (!name) {
    Console.error(`$ mber g ${abstractionType} [name] missing a name!`);
    process.exit(1);
  }

  const environment = (await import(`${PROJECT_ROOT}/config/environment.js`)).default;
  const applicationName = environment('development').modulePrefix;

  return (await import(`${__dirname}/../generators/${commandAbstranctionType}.js`)).default(
    name,
    PROJECT_ROOT,
    applicationName
  );
}
