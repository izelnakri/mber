import test from 'ava';
import mockProcessCWD from '../helpers/mock-process-cwd';
import findProjectRoot from '../../lib/utils/find-project-root';

test('findProjectRoot() works for current directory project', (t) => {
  const currentDirectory = `${__dirname}/../../ember-app-boilerplate`;
  const mock = mockProcessCWD(currentDirectory);

  t.true(findProjectRoot() === currentDirectory);

  mock.removeMock();
});

test('findProjectRoot() works for parent directory', (t) => {
  const currentDirectory = `${__dirname}/../../ember-app-boilerplate`;
  const mock = mockProcessCWD(`${currentDirectory}/src`);

  t.true(findProjectRoot() === currentDirectory);

  mock.removeMock();
});

test('findProjectRoot() works for 2 level parent directory', (t) => {
  const currentDirectory = `${__dirname}/../../ember-app-boilerplate`;
  const mock = mockProcessCWD(`${currentDirectory}/src/ui`);

  t.true(findProjectRoot() === currentDirectory);

  mock.removeMock();
});
