(function() {
  function vendorModule() {
    'use strict';

    return window.QUnitDOM;
  }

  define('qunit-dom', [], vendorModule);
})();
