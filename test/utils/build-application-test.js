import test from 'ava';

test('buildApplication() works', (t) => {
  t.true(true); // TODO: do this
});
test.todo('buildApplication(development) works');
test.todo('buildApplication(production) works');
test.todo('buildApplication(test) works');
test.todo('buildApplication(custom) works');
test.todo('buildApplication() raises error when unknown environment is used');
test.todo('buildApplication() raises error when config/environment.js does not exist');
test.todo('buildApplication() raises error when src/router.js does not exist');
test.todo('buildApplication() raises error when src/resolver.js does not exist');
test.todo('buildApplication() raises error when src/main.js does not exist');

// TODO: maybe also do linting test etc.
