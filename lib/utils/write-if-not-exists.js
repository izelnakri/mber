import chalk from 'ansi-colors';
import fs from 'fs-extra';
import Console from './console';

export default function(path, content='', projectRoot) {
  return new Promise(async (resolve) => {
    const targetPath = path.replace(`${projectRoot}/`, '');

    if (await fs.exists(path)) {
      return resolve(Console.log(chalk.yellow('not changed'), targetPath));
    }

    await fs.writeFile(path, content);

    resolve(Console.log(chalk.green('created'), targetPath));
  });
}
