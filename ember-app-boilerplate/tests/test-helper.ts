declare module "ember-test-helpers" {
  interface Element {
    querySelector: (selectorText: string) => Element;
    value: any;
    textContent: any;
    type: any;
    required: any;
    getAttribute: any;
    autofocus: any;
    previousElementSibling: any;
    nextElementSibling: any;
    placeholder: any;
    [propName: string]: any;
  }

  interface TestContext {
    [propName: string]: any;
    element: Element;
  }
}

declare global {
  interface EventTarget {
    parentElement: Element
  }
}

import 'qunit-dom';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';
import Application from '../src/main';
import ENV from '../config/environment';

setApplication(Application.create(ENV.APP));

start();
