import Component from '@ember/component';
import ENV from '../../../../config/environment';

export default Component.extend({
  tagName: '',
  name: ENV.modulePrefix
});
// NOTE: normally resets search input
