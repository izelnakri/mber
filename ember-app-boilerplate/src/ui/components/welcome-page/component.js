import Ember from 'ember';
import Component from '@glimmer/component';

export default class WelcomePageComponent extends Component {
  get emberVersion() {
    const [major, minor] = Ember.VERSION.split('.');

    return `${major}.${minor}.0`;
  }
}
