import compression from 'compression';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import http from 'http';

export default function(port=3000) {
  return new Promise((resolve) => {
    const app = express();

    app.use(cors());
    app.use(compression());
    app.use(morgan('dev'));

    app.get('/users', (req, res) => {
      res.json({
        users: [
          {
            id: 1,
            first_name: 'Izel',
            last_name: 'Nakri',
            active: true
          },
          {
            id: 2,
            first_name: 'Ash',
            last_name: 'Belmokadem',
            active: true
          },
          {
            id: 3,
            first_name: 'Constantijn',
            last_name: 'van de Wetering',
            active: true
          }
        ]
      });
    });

    let server = http.createServer(app);

    server.listen(port, () => {
      console.log(`BACKEND API Server listening on ${port}`);
      resolve(server);
    });
  })
}
