import Component from '@ember/component';

export default Component.extend({
  classNames: ['docs-dummy-example'],
  actions: {
    toggleIsShowing() {
      this.toggleProperty('isShowing');
    }
  }
});
