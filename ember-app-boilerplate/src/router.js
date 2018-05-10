import EmberRouter from '@ember/routing/router';
import ENV from './config/environment';

const Router = EmberRouter.extend({
  location: ENV.locationType,
  rootURL: ENV.rootURL
});

Router.map(function() {
  this.route('index', { path: '/' });
  this.route('not-found', { path: '/*path' });
});

export default Router;
