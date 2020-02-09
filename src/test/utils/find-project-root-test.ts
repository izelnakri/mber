import test from 'ava';
import mockProcessCWD from '../helpers/mock-process-cwd';
import findProjectRoot from '../../utils/find-project-root';

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
