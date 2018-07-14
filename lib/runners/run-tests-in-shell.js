import chalk from 'chalk';
import Puppeteer from 'puppeteer';
import Console from '../utils/console';
import WebSocket from 'ws';

const defaults = { port: 4200, debug: false, socketPort: 65532 };
export default function(options={ port: 4200, debug: false, socketPort: 65532 }) {
  const OPTIONS = Object.assign({}, defaults, options);

  const WebSocketServer = new WebSocket.Server({ port: OPTIONS.socketPort });

  WebSocketServer.on('connection', (webSocket) => {
    if (!OPTIONS.debug) {
      webSocket.on('message', (message) => {
        const { event, details } = JSON.parse(message);

        if (event === 'testDone') {
          if (details.failed > 0) {
            console.log(chalk.red('✘'), details.name);
            details.assertions.forEach((assertion, index) => {
              if (assertion.result === false) {
                console.log(chalk.red('Assertion #' + index + 1, ':'), assertion.message);
              }
            });
            console.log(chalk.yellow('SOURCE:'), details.source);
            Console.error('THERE IS A FAILED TEST!');

            return process.exit(1);
          } else if (details.skipped) {
            console.log(chalk.yellow('SKIP:'), details.name);
          } else if (details.todo) {
            console.log(chalk.blue('TODO:'), details.name);
          } else if (details.passed > 0) {
            console.log(chalk.green('✔'), details.name);
          }
        } else if (event === 'moduleStart') {
          console.log(`${details.name}:`);
        }
      });
    }
  });

  (async () => {
    const browser = await Puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-gpu', '--remote-debugging-port=0', '--window-size=1440,900']
    });
    const page = await browser.newPage();

    page.on('console', async (msg) => {
      if (OPTIONS.debug) {
        const args = await Promise.all(msg.args().map((arg) => turnToObjects(arg)));

        console.log(...args);
      }
    });

    await page.goto(`http://localhost:${OPTIONS.port}`, { timeout: 0 });
    await page.evaluate(({ socketPort }) => {
      // const socketConnection = new window.WebSocket(`ws://localhost:${socketPort}`);

      QUnit.moduleStart((details) => {
        console.log('[', details.name, ']');
        window.socket.send(JSON.stringify({ event: 'moduleStart', details: details }));
      });

      QUnit.testDone((details) => {
        console.log(getTestStatusCode(details), `${details.module} |`, details.name);
        window.socket.send(JSON.stringify({ event: 'testDone', details: details }));
      });

      QUnit.done((details) => {
        window.QUNIT_RESULT = details;
      });

      function getTestStatusCode(details) {
        if (details.failed > 0) {
          return 'NOT OK -';
        } else if (details.skipped) {
          return 'SKIPPED -';
        } else if (details.todo) {
          return 'TODO -';
        } else if (details.passed > 0) {
          return 'OK -';
        }
      }
    }, { debugMode: OPTIONS.debug, socketPort: OPTIONS.socketPort });

    await page.waitForFunction('window.QUNIT_RESULT', { timeout: 0 });

    const QUNIT_RESULT = await page.evaluate(() => window.QUNIT_RESULT);

    await browser.close();

    if (QUNIT_RESULT.failed > 0) {
      Console.error('THERE IS A FAILED TEST!');

      return process.exit(1);
    }

    Console.log(chalk.green('ALL TESTS PASS!'));
    process.exit();
  })();
}

function turnToObjects(jsHandle) {
  return jsHandle.jsonValue();
}
