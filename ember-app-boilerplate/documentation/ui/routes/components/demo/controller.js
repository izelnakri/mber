import Controller from '@ember/controller';
import { action } from '@ember/object';

export default class DocumentationComponentsDemoController extends Controller {
  @action
  toggleIsShowing() {
    this.set('isShowing', !this.isShowing);
  }
}
