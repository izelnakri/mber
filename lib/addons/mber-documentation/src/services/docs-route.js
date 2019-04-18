import { computed, observer } from '@ember/object';
import { A } from '@ember/array';
import Service, { inject as service } from '@ember/service';

export default Service.extend({
  router: service(),

  width: null,
  height: null,
  maxMobileWidthInPx: 992,
  mobileToggle: false,

  init() {
    this._super(...arguments);
    this.set('routes', A());
    this.updateDimensions();

    window.addEventListener('resize', () => this.updateDimensions());
  },
  updateDimensions() {
    this.set('width', window.innerWidth);
    this.set('height', window.innerHeight);
  },
  willDestroy() {
    window.removeEventListener('resize');
  },
  actionsOnRouteChange: observer('currentRoute', function() {
    document.querySelector('html').scrollTop = 0;
    this.set('mobileToggle', false);
  }),
  isMobile: computed('width', function() {
    return this.width <= this.maxMobileWidthInPx;
  }),
  currentRoute: computed('router.currentRouteName', 'routes.@each', function() {
    if (this.routes.length) {
      return this.routes.find((routeObject) => this.router.currentRouteName === routeObject.route);
    }
  }),
  currentRouteIndex: computed('currentRoute', 'routes.@each', function() {
    if (this.currentRoute) {
      const index = this.routes.findIndex((element) => element.route === this.currentRoute.route);

      return index >= 0 ? index : null;
    }
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
