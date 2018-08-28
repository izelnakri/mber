import Component from '@ember/component';
import { computed } from '@ember/object';

export default Component.extend({
  classNames: ['docs-snippet'],
  language: 'js',
  showCopy: true,
  trimmedCode: computed('code', function() {
    if (this.code) {
      // return window.prettier.format(this.code, { parser: "babylon", prettierPlugins: prettierPlugins });
      return ('  ' + this.code.trim()).split('\n').map((x) => x.replace(/\s\s/, '')).join('\n');
    }
  }),
  didInsertElement() {
    window.hljs.highlightBlock(this.$('pre')[0]);
  },
  actions: {
    copyToClipboard() {
      window.copee.toClipboard(this.trimmedCode);
    }
  }
});
