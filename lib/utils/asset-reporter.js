import fs from 'fs/promises';
import zlib from 'zlib';
import { promisify } from 'util';
import chalk from 'ansi-colors';

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
    const fileBuffer = await fs.readFile(filePath);

    return gzipAsync(fileBuffer).then((gzipBuffer) => {
      const fileObject = {
        fileName: stripProcessCWD(filePath),
        size: fileBuffer.length,
        gzipSize: gzipBuffer.length
      }

      console.log(
        chalk.blue(` - ${fileObject.fileName}:`),
        chalk.yellow(formatSize(fileObject.size)),
        chalk.green(`[${formatSize(fileObject.gzipSize)} gzipped]`)
      );

      resolve(fileObject);
    }).catch((error) => console.log('error', error));
  });
}

export default { formatTimePassed, formatSize, reportFile };

function stripProcessCWD(filePath) {
  if (filePath.includes(process.cwd())) {
    return filePath.replace(process.cwd(), '.');
  }

  return filePath;
}
