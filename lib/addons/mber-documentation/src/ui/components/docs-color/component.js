import Component from '@ember/component';
import { computed } from '@ember/object';
import { htmlSafe } from '@ember/string';

export default Component.extend({
  tagName: '',
  color: null,
  escapedStyles: computed('color', function() {
    if (this.color) {
      return htmlSafe(`background: ${this.color}`);
    }
  })
});
