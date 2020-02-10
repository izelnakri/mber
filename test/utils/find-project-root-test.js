import test from 'ava';
import mockProcessCWD from '../helpers/mock-process-cwd.js';
import findProjectRoot from '../../lib/utils/find-project-root.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('findProjectRoot() works for current directory project', async (t) => {
  const currentDirectory = `${__dirname}/../../ember-app-boilerplate`;
  const mock = mockProcessCWD(currentDirectory);

  t.true(await findProjectRoot() === currentDirectory);

  mock.removeMock();
});

test('findProjectRoot() works for parent directory', async (t) => {
  const currentDirectory = `${__dirname}/../../ember-app-boilerplate`;
  const mock = mockProcessCWD(`${currentDirectory}/src`);

  t.true(await findProjectRoot() === currentDirectory);

  mock.removeMock();
});

test('findProjectRoot() works for 2 level parent directory', async (t) => {
  const currentDirectory = `${__dirname}/../../ember-app-boilerplate`;
  const mock = mockProcessCWD(`${currentDirectory}/src/ui`);

  t.true(await findProjectRoot() === currentDirectory);

  mock.removeMock();
});
