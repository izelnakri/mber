import Component from '@ember/component';
import { inject as service } from '@ember/service';
import EmberObject from '@ember/object';

export default Component.extend({
  docsRoute: service(),
  tagName: '',
  didInsertElement() {
    this.docsRoute.routes.pushObject(EmberObject.create({
      label: this.label,
      route: this.route,
      model: this.model
    }));
  }
}).reopenClass({
  positionalParams: ['label', 'route', 'model']
})
