import Component from '@ember/component';
import { inject as service } from '@ember/service';

export default Component.extend({
  tagName: '',
  docsRoute: service()
});

// TODO: select all h tags ang generate links for them
