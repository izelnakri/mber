import Component from '@ember/component';
import EmberObject from '@ember/object';

export default Component.extend({
  tagName: '',
  init() {
    this._super(...arguments);

    if (this.snippets) {
      const code = this.code || '';

      this.snippets.pushObject(EmberObject.create({
        title: this.title || 'Example',
        code: code,
        trimmedCode: code.trim()
      }));
    }
  }
}).reopenClass({
  positionalParams: ['name']
});
