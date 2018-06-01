import Ember from 'ember';
import Component from '@ember/component';
import { computed } from '@ember/object';

export default Component.extend({
  emberVersion: computed(function() {
    const [ major, minor ] = Ember.VERSION.split(".");

    return `${major}.${minor}.0`;
  })
});
