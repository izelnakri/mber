import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';

export default async function(abstractionType, name) {
  const PROJECT_ROOT = findProjectRoot();
  const commandAbstranctionType = [
    'component', 'controller', 'helper', 'initializer', 'instance-initializer', 'mixin', 'model',
    'route', 'service', 'util'
  ].find((abstraction) => abstractionType === abstraction);

  if (!commandAbstranctionType) {
    Console.error(`${commandAbstranctionType} is not a valid ember abstraction to generate`);
    process.exit(1);
  } else if (!name) {
    Console.error(`$ mber g ${abstractionType} [name] missing a name!`);
    process.exit(1);
  }

  require(`${__dirname}/../generators/${commandAbstranctionType}.js`).default(name, PROJECT_ROOT);
}
