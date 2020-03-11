declare module "ember-test-helpers" {
  interface TestContext {
    [propName: string]: any;
  }
}

import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';
import Application from '../src/main';
import ENV from '../config/environment';

setApplication(Application.create(ENV.APP));

start();
