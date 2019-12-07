import Controller from '@ember/controller';

export default Controller.extend({
  actions: {
    toggleIsShowing() {
      this.set('isShowing', !this.isShowing);
    }
  }
});
