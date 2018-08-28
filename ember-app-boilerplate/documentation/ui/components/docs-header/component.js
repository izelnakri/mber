import Component from '@ember/component';
import ENV from '../../../../config/environment';

export default Component.extend({
  tagName: '',
  logo: '/images/ember-cli.svg',
  repository: 'https://github.com/izelnakri/mber',
  name: ENV.modulePrefix
});
// NOTE: normally resets search input
