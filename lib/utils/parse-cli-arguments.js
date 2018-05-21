export default function() {
  return process.argv.slice(3).reduce((result, arg) => {
    if (arg.startsWith('--env=') || arg.startsWith('--environment=')) {
      return Object.assign(result, { environment: arg.split('=')[1] });
    } else if (arg.startsWith('--proxy=') || arg.startsWith('--server=')) {
      return Object.assign(result, { proxy: parseEndpoint(arg.split('=')[1]) });
    } else if (arg.startsWith('--server')) {
      return Object.assign(result, { watch: true });
    } else if (arg.startsWith('--fastboot=')) {
      return Object.assign(result, { fastboot: parseBoolean(arg.split('=')[1]) });
    } else if (arg.startsWith('--watch=')) {
      return Object.assign(result, { watch: parseBoolean(arg.split('=')[1]) });
    }

    return result;
  }, {});
}

function parseBoolean(result) {
  if (result === 'true') {
    return true;
  } else if (result === 'false') {
    return false;
  }
}

function parseEndpoint(result) {
  if (!result) {
    return;
  } else if (!result.startsWith('http://') && !result.startsWith('https://')) {
    return `http://${result}`;
  }

  return result;
}
