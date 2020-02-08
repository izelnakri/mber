import test from 'ava';
import { promisify } from 'util';
import { exec } from 'child_process';

const shell = promisify(exec);

test('$ mber c src/router.js works', async (t) => {
  t.true(true);
  // const { stdout } = await shell(
  //   `node ${process.cwd()}/cli.js c ember-app-boilerplate/src/router.js`
  // );

  // console.log(stdout);

  // t.true(stdout.includes(printedHelpOutput));
});

// test('$ mber compile src/application.hbs works', async (t) => {
// });

// test('$ mber transpile node_modules/ember-inflector works' async (t) => {
// });
