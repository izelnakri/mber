import express from 'express';
import compression from 'compression';
import findProjectRoot from './find-project-root';
import Console from './console';

const PROJECT_ROOT = findProjectRoot();

export default function(environment='development', port=1234) { // NOTE: add options={}
  const server = express();

  server.use(compression());
  server.use('/assets', express.static(`${PROJECT_ROOT}/tmp`));
  server.use(express.static(`${PROJECT_ROOT}/public`));

  if (environment === 'test') {
    server.get('/', (req, res) => {
      if (Object.keys(req.query).length === 0) {
        return res.redirect('/?hidepassed')
      }

      res.sendFile(`${PROJECT_ROOT}/tests/index.html`);
    });
  } else {
    // TODO: add fastboot handling
    
    server.get('/', (req, res) => res.sendFile(`${PROJECT_ROOT}/index.html`));
  }

  server.listen(port);

  Console.log(`Server is running on http://localhost:${port} (Environment: ${environment})\n`);
}

// add pause button
