window.define('mber-documentation/index', ['exports'], function (exports) {
  'use strict';

  exports.__esModule = true;

  exports.default = function (ENV) {
    if (ENV.documentation && ENV.documentation.enabled &&
      window.location && window.location.pathname.includes(ENV.documentation.path)
    ) {
      var routerModuleName = `${ENV.modulePrefix}/documentation/src/router`;
      var DocumentationRouter = window.require(routerModuleName).default;

      return DocumentationRouter ? DocumentationRouter.apply(this, [ENV]) : function () {};
    }

    return function() {};
  };
});
