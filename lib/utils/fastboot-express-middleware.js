import FastBoot from 'fastboot';

export default function(distPath, opts={}) {
  return (req, res, next) => {
    if (!req.path.includes('.') || req.path.includes('.html')) {
      const distPathObject = typeof distPath === 'string' ? { distPath: distPath } : distPath;
      const options = Object.assign(opts, distPathObject);
      const fastboot = options.fastboot || new FastBoot({
        distPath: options.distPath,
        resilient: options.resilient
      });

      let result;
      fastboot.visit(req.path, { request: req, response: res }).then((res) => {
        result = res;

        return options.chunkedResponse ? result.chunks() : result.html();
      }, (error) => console.log('error is', error)).then((body) => {
        let headers = result.headers;
        let statusMessage = result.error ? 'NOT OK ' : 'OK ';

        for (var pair of headers.entries()) {
          res.set(pair[0], pair[1]);
        }

        if (result.error) {
          console.log('RESILIENT MODE CAUGHT:', result.error.stack);
          console.log(result.error);

          next(result.error);
        }

        log(result.statusCode, statusMessage + req.path);
        res.status(result.statusCode);

        if (typeof body === 'string') {
          res.send(body);
        } else if (result.error) {
          res.send(body[0]);
        } else {
          body.forEach(chunk => res.write(chunk));
          res.end();
        }
      }).catch((error) => {
        console.log('error is', error);

        if (error.name === "UnrecognizedURLError") {
          next();
        } else {
          res.status(500);
          next(error);
        }
      });
    } else {
      next();
    }
  }
}

let chalk;

function log(statusCode, message, startTime) {
  chalk = chalk || require('chalk');
  let color = statusCode === 200 ? 'green' : 'red';
  let now = new Date();

  if (startTime) {
    let diff = Date.now() - startTime;
    message = message + chalk.blue(" " + diff + "ms");
  }

  console.log(chalk.blue(now.toISOString()) + " " + chalk[color](statusCode) + " " + message);
}
