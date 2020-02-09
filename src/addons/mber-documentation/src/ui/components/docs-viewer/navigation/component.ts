import Component from '@ember/component';
import { computed } from '@ember/object';
import { inject as service } from '@ember/service';

export default Component.extend({
  docsRoute: service(),
  tagName: '',
  navigationClass: computed('docsRoute.mobileToggle', 'docsRoute.isMobile', function() {
    if (this.docsRoute.isMobile && !this.docsRoute.mobileToggle) {
      return 'docs-toggle-hide';
    }

    return 'docs-toggle-show';
  }),
  actions: {
    toggleMobileNavigation() {
      this.set('docsRoute.mobileToggle', !this.docsRoute.mobileToggle);
    }
  }
});
