import Component from '@ember/component';
import { computed } from '@ember/object';

export default Component.extend({
  classNames: ['docs-snippet'],
  showCopy: true,
  trimmedCode: computed('code', function() {
    if (this.code) {
      return ('  ' + this.code.trim()).split('\n').map((x) => x.replace(/\s\s/, '')).join('\n');
    }
  }),
  didInsertElement() {
    const element = this.element.querySelectorAll('pre')[0];

    if (this.language) {
      element.className += this.language;
    }

    window.hljs.highlightBlock(element);
  },
  actions: {
    copyToClipboard() {
      window.copee.toClipboard(this.trimmedCode);
    }
  }
});
