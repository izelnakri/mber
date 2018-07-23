import { module, test } from 'qunit';
import { setupTest } from '../../../../tests/helpers';

module('Unit | Route | index', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    const route = this.owner.lookup('route:index');

    assert.ok(route);
  });
});
