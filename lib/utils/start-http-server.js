import Console from './console';

export default function(environment='development', port=1234) { // NOTE: add options={}
  const server = require('express')();

  server.listen(port);

  // if (environment === 'test') {
  //
  // }

  // add gzip middleware + server static /public and /tmp as /assets

  Console.log(`Server is running on http://localhost:${port} (Environment: ${environment})\n`);

}
// redirect / to /?hidepassed for tests
// add pause button
