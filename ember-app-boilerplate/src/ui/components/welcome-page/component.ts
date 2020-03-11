// @ts-nocheck
import { VERSION } from '@ember/version';
import Component from '@glimmer/component';

export default class WelcomePageComponent extends Component {
  get emberVersion() {
    const [major, minor] = VERSION.split('.');

    return `${major}.${minor}.0`;
  }
}
