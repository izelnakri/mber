import Component from '@ember/component';
import { computed } from '@ember/object';

export default Component.extend({
  tagName: '',
  language: 'js',
  trimmedCode: computed('code', function() {
    if (this.code) {
      return this.code.trim();
    }
  }),
  didInsertElement() {
    window.hljs.initHighlighting();
  }
});
