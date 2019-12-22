import Component from '@ember/component';
import EmberObject from '@ember/object';

export default Component.extend({
  tagName: '',
  name: null,
  didInsertElement() {
    if (this.snippets) {
      const code = this.code || '';

      this.snippets.pushObject(
        EmberObject.create({
          title: this.title || 'Example',
          code: code,
          trimmedCode: code.trim()
        })
      );
    }
  }
});
