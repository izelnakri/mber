import Controller from '@ember/controller';
import { action } from '@ember/object';

export default class DocumentationComponentsDemoController extends Controller {
  isShowing = false;

  @action
  toggleIsShowing() {
    this.isShowing = !this.isShowing;
  }
}
