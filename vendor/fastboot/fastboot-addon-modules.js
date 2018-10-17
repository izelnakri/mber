define("ember-cli-fastboot/instance-initializers/clear-double-boot", ["exports"], function (_exports) {
  "use strict";

  _exports.__esModule = true;
  _exports.clearHtml = clearHtml;
  _exports.default = void 0;

  // When using `ember serve` when fastboot addon is installed the application
  // output will already be rendered to the DOM when the actual JavaScript
  // loads. Ember does not automatically clear its `rootElement` so this
  // leads to the "double" applications being visible at once (only the
  // "bottom" one is running via JS and is interactive).
  //
  // This removes any pre-rendered ember-view elements, so that the booting
  // application will replace the pre-rendered output
  function clearHtml() {
    var current = document.getElementById('fastboot-body-start');

    if (current) {
      var endMarker = document.getElementById('fastboot-body-end');
      var parent = current.parentElement;
      var nextNode;

      do {
        nextNode = current.nextSibling;
        parent.removeChild(current);
        current = nextNode;
      } while (nextNode && nextNode !== endMarker);

      parent.removeChild(endMarker);
    }
  }

  var _default = {
    name: "clear-double-boot",
    initialize: function initialize(instance) {
      if (typeof FastBoot === 'undefined') {
        var originalDidCreateRootView = instance.didCreateRootView;

        instance.didCreateRootView = function () {
          clearHtml();
          originalDidCreateRootView.apply(instance, arguments);
        };
      }
    }
  };
  _exports.default = _default;
});
define("ember-cli-fastboot/locations/none", ["exports"], function (_exports) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;
  var TEMPORARY_REDIRECT_CODE = 307;

  var _default = Ember.NoneLocation.extend({
    implementation: 'fastboot',
    fastboot: Ember.inject.service(),
    _config: Ember.computed(function () {
      return Ember.getOwner(this).resolveRegistration('config:environment');
    }),
    _fastbootHeadersEnabled: Ember.computed.bool('_config.fastboot.fastbootHeaders'),
    _redirectCode: Ember.computed(function () {
      return Ember.get(this, '_config.fastboot.redirectCode') || TEMPORARY_REDIRECT_CODE;
    }),
    _response: Ember.computed.readOnly('fastboot.response'),
    _request: Ember.computed.readOnly('fastboot.request'),
    setURL: function setURL(path) {
      if (Ember.get(this, 'fastboot.isFastBoot')) {
        var response = Ember.get(this, '_response');
        var currentPath = Ember.get(this, 'path');
        var isInitialPath = !currentPath || currentPath.length === 0;

        if (!isInitialPath) {
          path = this.formatURL(path);
          var isTransitioning = currentPath !== path;

          if (isTransitioning) {
            var host = Ember.get(this, '_request.host');
            var redirectURL = "//" + host + path;
            response.statusCode = this.get('_redirectCode');
            response.headers.set('location', redirectURL);
          }
        } // for testing and debugging


        if (Ember.get(this, '_fastbootHeadersEnabled')) {
          response.headers.set('x-fastboot-path', path);
        }
      }

      this._super.apply(this, arguments);
    }
  });

  _exports.default = _default;
});
define("ember-cli-fastboot/services/fastboot", ["exports"], function (_exports) {
  "use strict";

  _exports.__esModule = true;
  _exports.default = void 0;

  /* global FastBoot */
  var RequestObject = Ember.Object.extend({
    init: function init() {
      this._super.apply(this, arguments);

      var request = this.request;
      delete this.request;
      this.method = request.method;
      this.body = request.body;
      this.cookies = request.cookies;
      this.headers = request.headers;
      this.queryParams = request.queryParams;
      this.path = request.path;
      this.protocol = request.protocol;

      this._host = function () {
        return request.host();
      };
    },
    host: Ember.computed(function () {
      return this._host();
    })
  });
  var Shoebox = Ember.Object.extend({
    put: function put(key, value) {
      (true && Ember.assert('shoebox.put is only invoked from the FastBoot rendered application', this.get('fastboot.isFastBoot')));
      (true && Ember.assert('the provided key is a string', typeof key === 'string'));
      var fastbootInfo = this.get('fastboot._fastbootInfo');

      if (!fastbootInfo.shoebox) {
        fastbootInfo.shoebox = {};
      }

      fastbootInfo.shoebox[key] = value;
    },
    retrieve: function retrieve(key) {
      if (this.get('fastboot.isFastBoot')) {
        var shoebox = this.get('fastboot._fastbootInfo.shoebox');

        if (!shoebox) {
          return;
        }

        return shoebox[key];
      }

      var shoeboxItem = this.get(key);

      if (shoeboxItem) {
        return shoeboxItem;
      }

      var el = document.querySelector("#shoebox-" + key);

      if (!el) {
        return;
      }

      var valueString = el.textContent;

      if (!valueString) {
        return;
      }

      shoeboxItem = JSON.parse(valueString);
      this.set(key, shoeboxItem);
      return shoeboxItem;
    }
  });
  var FastBootService = Ember.Service.extend({
    cookies: Ember.computed.deprecatingAlias('request.cookies', {
      id: 'fastboot.cookies-to-request',
      until: '0.9.9'
    }),
    headers: Ember.computed.deprecatingAlias('request.headers', {
      id: 'fastboot.headers-to-request',
      until: '0.9.9'
    }),
    isFastBoot: typeof FastBoot !== 'undefined',
    init: function init() {
      this._super.apply(this, arguments);

      var shoebox = Shoebox.create({
        fastboot: this
      });
      this.set('shoebox', shoebox);
    },
    host: Ember.computed(function () {
      Ember.deprecate('Usage of fastboot service\'s `host` property is deprecated.  Please use `request.host` instead.', false, {
        id: 'fastboot.host-to-request',
        until: '0.9.9'
      });
      return this._fastbootInfo.request.host();
    }),
    response: Ember.computed.readOnly('_fastbootInfo.response'),
    metadata: Ember.computed.readOnly('_fastbootInfo.metadata'),
    request: Ember.computed(function () {
      if (!this.isFastBoot) return null;
      return RequestObject.create({
        request: Ember.get(this, '_fastbootInfo.request')
      });
    }),
    deferRendering: function deferRendering(promise) {
      (true && Ember.assert('deferRendering requires a promise or thennable object', typeof promise.then === 'function'));

      this._fastbootInfo.deferRendering(promise);
    }
  });
  var _default = FastBootService;
  _exports.default = _default;
});