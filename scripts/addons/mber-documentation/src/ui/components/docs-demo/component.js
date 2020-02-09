import { A } from '@ember/array';
import { computed } from '@ember/object';
import Component from '@ember/component';

export default Component.extend({
  classNames: ['docs-demo'],

  init() {
    this._super(...arguments);

    if (!this.snippets) {
      this.set('snippets', A());
    }
  },
  didInsertElement() {
    this.set('activeSnippet', this.snippets.firstObject);
  },
  actions: {
    changeSnippet(snippet) {
      this.set('activeSnippet', snippet);
    }
  }
});
