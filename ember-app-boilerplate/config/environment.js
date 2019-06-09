export default function(environment) {
  let ENV = {
    modulePrefix: '{{applicationName}}',
    environment,
    rootURL: '/',
    locationType: 'auto',
    documentation: {
      path: '/styleguide',
      enabled: ['development', 'test', 'memserver', 'demo'].includes(environment),
    },
    'ember-resolver': {
      features: {
        EMBER_RESOLVER_MODULE_UNIFICATION: true
      }
    },
    excludeEmberData: false,
    fastboot: {
      hostWhitelist: ['localhost:1234', 'localhost:3000', /^localhost:\d+$/]
    },
    'ember-devtools': {
      global: true,
      enabled: ['development', 'memserver', 'test'].includes(environment)
    },
    memserver: {
      minify: ['demo', 'production'].includes(environment),
      enabled: ['demo', 'test', 'memserver'].includes(environment)
    },
    EmberENV: {
      _JQUERY_INTEGRATION: false,
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. 'with-controller': true
        'ember-module-unification': true,
        EMBER_MODULE_UNIFICATION: true
      },
      EXTEND_PROTOTYPES: {
        // Prevent Ember Data from overriding Date.parse.
        Date: false
      }
    },

    APP: {
      // Here you can pass flags/options to your application instance
      // when it is created
    }
  };

  ENV.APP.API_HOST = 'http://localhost:3000';

  if (environment === 'development') {
    // ENV.APP.LOG_RESOLVER = true;
    // ENV.APP.LOG_ACTIVE_GENERATION = true;
    // ENV.APP.LOG_TRANSITIONS = true;
    // ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
    // ENV.APP.LOG_VIEW_LOOKUPS = true;
  }

  if (environment === 'test') {
    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.autoboot = false;
    ENV.APP.rootElement = '#ember-testing';
  }

  if (environment === 'production') {

  }

  return ENV;
};
