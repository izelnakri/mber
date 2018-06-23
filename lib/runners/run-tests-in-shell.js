import chalk from 'chalk';
import Puppeteer from 'puppeteer';
import Console from '../utils/console';

export default function(defaults={ port: 4200 }) {
  (async () => {
    const browser = await Puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('Chrome:', msg.text()));

    await page.goto(`http://localhost:${defaults.port}`);
    await page.evaluate(() => {
      QUnit.done((details) => {
        window.QUNIT_RESULT = details;
      });

      QUnit.moduleStart((details) => {
        console.log('[', details.name, ']');
      });

      QUnit.testDone((details) => {
        console.log(getTestStatusCode(details), `${details.module} |`, details.name);
      });

      function getTestStatusCode(details) {
        if (details.failed > 0) {
          return 'FAILED -';
        } else if (details.skipped) {
          return 'SKIPPED -';
        } else if (details.todo) {
          return 'TODO -';
        } else if (details.passed > 0) {
          return 'OK -';
        }
      }
    });

    await page.waitForFunction('window.QUNIT_RESULT');

    const QUNIT_RESULT = await page.evaluate(() => window.QUNIT_RESULT);

    await browser.close();

    if (QUNIT_RESULT.failed > 0) {
      Console.error('THERE IS A FAILED TEST!');

      return process.exist(1);
    }

    Console.log(chalk.green('ALL TESTS PASS!'));
    process.exit();
  })();
}
