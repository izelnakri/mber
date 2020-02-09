import test from 'ava';
import parseCLIArguments from '../../lib/utils/parse-cli-arguments';

test('--env argument could be read', (t) => {
  t.plan(3);

  const mock = mockProcessARGV(['--env=development']);

  t.deepEqual(parseCLIArguments(), { environment: 'development' });

  mockProcessARGV(['--env=production']);

  t.deepEqual(parseCLIArguments(), { environment: 'production' });

  mockProcessARGV(['--env=test']);

  t.deepEqual(parseCLIArguments(), { environment: 'test' });

  mock.removeMock();
});

test('--port argument could be read', (t) => {
  t.plan(3);

  const mock = mockProcessARGV(['--port=4200']);

  t.deepEqual(parseCLIArguments(), { port: 4200 });

  mockProcessARGV(['--port=3000']);

  t.deepEqual(parseCLIArguments(), { port: 3000 });

  mockProcessARGV(['--port=8888']);

  t.deepEqual(parseCLIArguments(), { port: 8888 });

  mock.removeMock();
});

test('--watch argument could be read', (t) => {
  t.plan(2);

  const mock = mockProcessARGV(['--watch=true']);

  t.deepEqual(parseCLIArguments(), { watch: true });

  mockProcessARGV(['--watch=false']);

  t.deepEqual(parseCLIArguments(), { watch: false });

  mock.removeMock();
});

test('--proxy argument could be read', (t) => {
  t.plan(2);

  const mock = mockProcessARGV(['--proxy=localhost:3000']);

  t.deepEqual(parseCLIArguments(), { proxy: 'http://localhost:3000' });

  mockProcessARGV(['--proxy=https://api.twitter.com']);

  t.deepEqual(parseCLIArguments(), { proxy: 'https://api.twitter.com' });

  mock.removeMock();
});

test('--fastboot argument could be read', (t) => {
  t.plan(2);

  const mock = mockProcessARGV(['--fastboot=true']);

  t.deepEqual(parseCLIArguments(), { fastboot: true });

  mockProcessARGV(['--fastboot=false']);

  t.deepEqual(parseCLIArguments(), { fastboot: false });

  mock.removeMock();
});

test('--server argument could be read', (t) => {
  t.plan(3);

  const mock = mockProcessARGV(['--server=localhost:3000']);

  t.deepEqual(parseCLIArguments(), { proxy: 'http://localhost:3000' });

  mockProcessARGV(['--server=https://api.twitter.com']);

  t.deepEqual(parseCLIArguments(), { proxy: 'https://api.twitter.com' });

  mockProcessARGV(['--server']);

  t.deepEqual(parseCLIArguments(), { watch: true });

  mock.removeMock();
});

test('--debug argument could be read', (t) => {
  t.plan(2);

  const mock = mockProcessARGV(['--debug=true']);

  t.deepEqual(parseCLIArguments(), { debug: true });

  mockProcessARGV(['--debug=false']);

  t.deepEqual(parseCLIArguments(), { debug: false });

  mock.removeMock();
});

test('all arguments could be read', (t) => {
  t.plan(2);

  const mock = mockProcessARGV([
    '--env=production', '--fastboot=true', '--watch=true', '--proxy=http://localhost:3000',
    '--debug=true'
  ]);

  t.deepEqual(parseCLIArguments(), {
    environment: 'production',
    fastboot: true,
    watch: true,
    proxy: 'http://localhost:3000',
    debug: true
  });

  mockProcessARGV([
    '--env=test', '--fastboot=false', '--watch=false', '--proxy=https://api.mapbox.com',
    '--debug=false'
  ]);

  t.deepEqual(parseCLIArguments(), {
    environment: 'test',
    fastboot: false,
    watch: false,
    proxy: 'https://api.mapbox.com',
    debug: false
  });

  mock.removeMock();
});

test('none arguments could be read', (t) => {
  const mock = mockProcessARGV([]);

  t.deepEqual(parseCLIArguments(), {});

  mock.removeMock();
});

test('some arguments could be read', (t) => {
  t.plan(2);

  const mock = mockProcessARGV(['--env=memserver', '--fastboot=true']);

  t.deepEqual(parseCLIArguments(), { environment: 'memserver', fastboot: true });

  mockProcessARGV(['--fastboot=false', '--watch=true']);

  t.deepEqual(parseCLIArguments(), { fastboot: false, watch: true });

  mock.removeMock();
});

function mockProcessARGV(arrayOfArguments) {
  const oldProcessARGV = process.argv;

  process.argv = ['/bin/node', '/Users/izelnakri/mber/cli.js', 'b'].concat(arrayOfArguments);

  return {
    removeMock() {
      process.argv = oldProcessARGV;
    }
  }
}
