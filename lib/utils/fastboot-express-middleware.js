// TODO: this module is ugly rewrite it with heavy tests
import FastBoot from 'fastboot';

export default function(distPath, opts={}) {
  const OPTIONS = typeof distPath === 'string' ? Object.assign({
    distPath: distPath
  }, opts) : distPath;
  const fastboot = OPTIONS.fastboot || new FastBoot({
    distPath: OPTIONS.distPath,
    resilient: OPTIONS.resilient === false ? false : true
  });

  return (req, res, next) => {
    let result;
    fastboot.visit(req.path, { request: req, response: res }).then((res) => {
      result = res;

      return OPTIONS.chunkedResponse ? result.chunks() : result.html();
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

      // TODO: on debug, show fastboot render times
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
