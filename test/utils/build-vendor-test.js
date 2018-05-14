import fs from 'fs';
import test from 'ava';
import { promisify } from 'util';
import mockProcessCWD from '../helpers/mock-process-cwd';
import buildVendor from '../../lib/utils/build-vendor';
import injectBrowserToNode from '../../lib/utils/inject-browser-to-node';

const CWD = process.cwd();
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);

test('buildVendor() works', async (t) => {
  const mock = mockProcessCWD(`${CWD}/ember-app-boilerplate`);
  const result = await buildVendor();
  const timeTakenForVendor = result.message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', '')

  t.true(1000 < Number(timeTakenForVendor) < 5000);

  await Promise.all([
    readdirAsync(`${CWD}/ember-app-boilerplate/dist`),
    readFileAsync(`${CWD}/ember-app-boilerplate/tmp/vendor.js`),
  ]).then(([dist, vendorJs]) => {
    t.true(dist.includes('index.html'));
    t.truthy(dist.find((entity) => /vendor\.\w+\.js/g.test(entity)));
    t.true(1000 < vendorJs.length < 5000);

    injectBrowserToNode();
  }).catch((error) => console.log('error is', error));

  require(`${CWD}/ember-app-boilerplate/tmp/vendor.js`);

  t.truthy(global.window.DS);

  mock.removeMock();
});
test.todo('buildVendor(development) works');
test.todo('buildVendor(production) works');
test.todo('buildVendor(test) works');
test.todo('buildVendor(custom) works');
test.todo('buildVendor() raises error when unknown environment is used');
test.todo('buildVendor() raises error when config/environment.js does not exist');
