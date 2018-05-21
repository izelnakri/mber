import chalk from 'chalk';

export function formatTimePassed(timePassed) {
  return chalk.yellow(`${timePassed}ms`);
}

export function formatSize(sizeInBytes) {
  const sizeInMb = (sizeInBytes % 1000000) > 0

  if (sizeInMb) {
    return `${(sizeInBytes / 1000000).toFixed(2)} MB`;
  }

  return `${(sizeInBytes / 1000).toFixed(2)} kB`;
}

export default { formatTimePassed, formatSize }
