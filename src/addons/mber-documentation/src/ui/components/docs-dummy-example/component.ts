import Component from '@ember/component';
import { action } from '@ember/object';

export default class DocsDummyExample extends Component {
  isShowing = false;

  @action
  toggleIsShowing() {
    this.toggleProperty('isShowing');
  }
}
