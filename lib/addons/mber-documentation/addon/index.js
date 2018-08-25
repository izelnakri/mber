define('mber-documentation/index', ['exports'], function (exports) {
  'use strict';

  exports.__esModule = true;

  exports.default = function (ENV) {
    if (ENV.documentation && ENV.documentation.enabled && (document.location.pathname === ENV.documentation.path)) {
      var DocumentationRouter = window.require(ENV.modulePrefix + '/documentation/src/router').default;

      return DocumentationRouter ? DocumentationRouter.apply(this, [ENV]) : function () {};
    }

    return function() {};
  };
});
