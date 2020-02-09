export default function(environment) {
  return serializeRegExp({
    'ember-resolver': {
      features: {
        EMBER_RESOLVER_MODULE_UNIFICATION: true
      }
    },
    modulePrefix: 'dummyapp',
    environment,
    rootURL: '/',
    locationType: 'auto',
    fastboot: {
      hostWhitelist: [/^localhost:\d+$/]
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
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. 'with-controller': true
        'ember-module-unification': true
      },
      EXTEND_PROTOTYPES: {
        // Prevent Ember Data from overriding Date.parse.
        Date: false
      }
    },
    APP: {
      API_HOST: 'http://localhost:3000'
      // Here you can pass flags/options to your application instance
      // when it is created
    }
  });
}

function serializeRegExp(object) {
  RegExp.prototype.toJSON = function() {
    return this.source;
  };

  return JSON.parse(JSON.stringify(object));
}
