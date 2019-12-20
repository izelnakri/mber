import EmberRouter from '@ember/routing/router';
import DocumentationRouter from 'mber-documentation';
import ENV from '../config/environment';

export default class Router extends EmberRouter {
  location = ENV.locationType;
  rootURL = ENV.rootURL;
}

Router.map(function() {
  this.route('index', { path: '/' });

  if (ENV.documentation && ENV.documentation.enabled) {
    DocumentationRouter.apply(this, [ENV]);
  }

  this.route('not-found', { path: '/*path' });
});
