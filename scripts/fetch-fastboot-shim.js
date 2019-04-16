/* globals define FastBoot */
define('fetch', ['exports'], function(exports) {
  var httpRegex = /^https?:\/\//;
  var protocolRelativeRegex = /^\/\//;

  var AbortControllerPolyfill = FastBoot.require(
    'abortcontroller-polyfill/dist/cjs-ponyfill'
  );
  var nodeFetch = FastBoot.require('node-fetch');

  /**
   * Build the absolute url if it's not, can handle:
   * - protocol-relative URL (//can-be-http-or-https.com/)
   * - path-relative URL (/file/under/root)
   *
   * @param {string} url
   * @param {string} protocol
   * @param {string} host
   * @returns {string}
   */
  function buildAbsoluteUrl(url, protocol, host) {
    if (protocolRelativeRegex.test(url)) {
      url = host + url;
    } else if (!httpRegex.test(url)) {
      if (!host) {
        throw new Error(
          'You are using using fetch with a path-relative URL, but host is missing from Fastboot request. Please set the hostWhitelist property in your environment.js.'
        );
      }
      url = protocol + '//' + host + url;
    }
    return url;
  }

  var FastbootHost, FastbootProtocol;

  /**
   * Isomorphic `fetch` API for both browser and fastboot
   *
   * node-fetch doesn't allow relative URLs, we patch it with Fastboot runtime info.
   * Before instance-initializers Absolute URL is still not allowed, in this case
   * node-fetch will throw error.
   * `FastbootProtocol` and `FastbootHost` are re-set for every instance during its
   * initializers through calling `setupFastboot`.
   *
   * @param {String|Object} input
   * @param {Object} [options]
   */
  exports.default = function fetch(input, options) {
    if (typeof input === 'object') {
      input.url = buildAbsoluteUrl(input.url, FastbootProtocol, FastbootHost);
    } else {
      input = buildAbsoluteUrl(input, FastbootProtocol, FastbootHost);
    }
    return nodeFetch(input, options);
  };
  /**
   * Assign the local protocol and host being used for building absolute URLs
   * @private
   */
  exports.setupFastboot = function setupFastboot(protocol, host) {
    FastbootProtocol = protocol;
    FastbootHost = host;
  }
  exports.Request = nodeFetch.Request;
  exports.Headers = nodeFetch.Headers;
  exports.Response = nodeFetch.Response;
  exports.AbortController = AbortControllerPolyfill.AbortController;
});

define('fetch/ajax', ['exports'], function() {
  throw new Error(
    'You included `fetch/ajax` but it was renamed to `ember-fetch/ajax`'
  );
});

define("{{applicationName}}/initializers/ajax", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  const {
    get
  } = Ember;

  var nodeAjax = function (options) {
    let httpRegex = /^https?:\/\//;
    let protocolRelativeRegex = /^\/\//;
    let protocol = get(this, 'fastboot.request.protocol');

    if (protocolRelativeRegex.test(options.url)) {
      options.url = protocol + options.url;
    } else if (!httpRegex.test(options.url)) {
      try {
        options.url = protocol + '//' + get(this, 'fastboot.request.host') + options.url;
      } catch (fbError) {
        throw new Error('You are using Ember Data with no host defined in your adapter. This will attempt to use the host of the FastBoot request, which is not configured for the current host of this request. Please set the hostWhitelist property for in your environment.js. FastBoot Error: ' + fbError.message);
      }
    }

    if (najax) {
      najax(options);
    } else {
      throw new Error('najax does not seem to be defined in your app. Did you override it via `addOrOverrideSandboxGlobals` in the fastboot server?');
    }
  };

  var _default = {
    name: 'ajax-service',
    initialize: function (application) {
      application.register('ajax:node', nodeAjax, {
        instantiate: false
      });
      application.inject('adapter', '_ajaxRequest', 'ajax:node');
      application.inject('adapter', 'fastboot', 'service:fastboot');
    }
  };
  _exports.default = _default;
});
define("{{applicationName}}/initializers/error-handler", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  /**
   * Initializer to attach an `onError` hook to your app running in fastboot. It catches any run loop
   * exceptions and other errors and prevents the node process from crashing.
   *
   */
  var _default = {
    name: 'error-handler',
    initialize: function (application) {
      if (!Ember.onerror) {
        // if no onerror handler is defined, define one for fastboot environments
        Ember.onerror = function (err) {
          let errorMessage = `There was an error running your app in fastboot. More info about the error: \n ${err.stack || err}`;
          Ember.Logger.error(errorMessage);
        };
      }
    }
  };
  _exports.default = _default;
});
define("{{applicationName}}/instance-initializers/setup-fetch", ["exports", "fetch"], function (_exports, _fetch) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;

  /**
   * To allow relative URLs for Fastboot mode, we need the per request information
   * from the fastboot service. Then we set the protocol and host to fetch module.
   */
  function patchFetchForRelativeURLs(instance) {
    const fastboot = instance.lookup('service:fastboot');
    const request = fastboot.get('request'); // Prember is not sending protocol

    const protocol = request.protocol === 'undefined:' ? 'http:' : request.protocol; // host is cp

    (0, _fetch.setupFastboot)(protocol, request.get('host'));
  }

  var _default = {
    name: 'fetch',
    initialize: patchFetchForRelativeURLs
  };
  _exports.default = _default;
});
