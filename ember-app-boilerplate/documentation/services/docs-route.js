import { computed } from '@ember/object';
import { A } from '@ember/array';
import Service, { inject as service } from '@ember/service';

export default Service.extend({
  router: service(),

  init() {
    this._super(...arguments);
    this.set('routes', A());
  },
  currentRoute: computed('router.currentRouteName', 'routes', 'routes.@each', function() {
    if (this.routes.length) {
      return this.routes.find((routeObject) => this.router.currentRouteName === routeObject.route);
    }
    console.log(`DocsRoutes wasn't able to correctly detect the current route. The current url is`);
  }),
  currentRouteIndex: computed('currentRoute', 'routes.@each', function() {
    const index = this.routes.findIndex((element) => element.route === this.currentRoute.route);

    return index >= 0 ? index : null;
  }),
  previousRoute: computed('currentRouteIndex', 'routes.@each', function() {
    if (this.currentRouteIndex > 0) {
      return this.routes[this.currentRouteIndex - 1];
    }
  }),
  nextRoute: computed('currentRouteIndex', 'routes.@each', function() {
    if (this.currentRouteIndex < (this.routes.length - 1)) {
      return this.routes[this.currentRouteIndex + 1];
    }
  })
});
