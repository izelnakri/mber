import chalk from 'ansi-colors';
import fs from 'fs/promises';
import Console from './console.js';
import pathExists from './utils.js';

export default function(path, content='', projectRoot) {
  return new Promise(async (resolve) => {
    const targetPath = path.replace(`${projectRoot}/`, '');

    if (await pathExists(path)) {
      return resolve(Console.log(chalk.yellow('not changed'), targetPath));
    }

    await fs.writeFile(path, content);

    resolve(Console.log(chalk.green('created'), targetPath));
  });
}
