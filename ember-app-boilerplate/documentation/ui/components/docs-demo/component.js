import { A } from '@ember/array';
import { computed } from '@ember/object';
import Component from '@ember/component';

export default Component.extend({
  classNames: ['docs-demo'],

  init() {
    this._super(...arguments);
    this.set('snippets', A());
  },
  activeSnippet: computed('snippets', 'snippets.@each', function() {
    return this.snippets.firstObject;
  }),
  actions: {
    changeSnippet(snippet) {
      this.set('activeSnippet', snippet);
    }
  }
});
