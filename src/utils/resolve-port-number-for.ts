import Console from './console.js';

export default async function resolvePortNumberFor(service, portNumber) {
  if (await portIsAvailable(portNumber)) {
    return portNumber;
  }

  Console.log(`[${service}] ${portNumber} is already in use. Trying port ${portNumber + 1}`);

  return (await resolvePortNumberFor(service, portNumber + 1));
}

function portIsAvailable(portNumber) {
  return new Promise(async (resolve) => {
    const net = await import('net');
    const server = net.createServer();

    server.once('error', function(err) {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      }
    });

    server.once('listening', function() {
      server.close();
      resolve(true);
    });

    server.listen(portNumber);
  });
}
