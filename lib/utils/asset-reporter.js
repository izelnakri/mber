import fs from 'fs';
import zlib from 'zlib';
import { promisify } from 'util';
import chalk from 'chalk';

const readFileAsync = promisify(fs.readFile);
const gzipAsync = promisify(zlib.gzip);

export function formatTimePassed(timePassed) {
  return chalk.yellow(`${timePassed}ms`);
}

export function formatSize(sizeInBytes) {
  if (sizeInBytes > 999994) {
    return `${(sizeInBytes / 1000000).toFixed(2)} MB`;
  }

  return `${(sizeInBytes / 1000).toFixed(2)} kB`;
}

export function reportFile(filePath) {
  return new Promise(async (resolve) => {
    const fileBuffer = await readFileAsync(filePath);

    return gzipAsync(fileBuffer).then((gzipBuffer) => {
      console.log(
        chalk.blue(` - ./${filePath}:`),
        chalk.yellow(formatSize(fileBuffer.length)),
        chalk.green(`[${formatSize(gzipBuffer.length)} gzipped]`)
      );
      resolve();
    }).catch((error) => console.log('error', error));
  });
}

export default { formatTimePassed, formatSize, reportFile };
