// TODO: better console
export default async function resolvePortNumberFor(service, portNumber) {
  if (await portIsAvailable(portNumber)) {
    return portNumber;
  }

  console.log(`${portNumber} is already in use. Trying port ${portNumber + 1} for ${service}`);

  return (await resolvePortNumberFor(service, portNumber + 1));
}

function portIsAvailable(portNumber) {
  return new Promise((resolve) => {
    const net = require('net');
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
