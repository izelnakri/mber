const HTMLBarsCompiler = require('../../vendor/ember-template-compiler');

export default function(hbsContent, { moduleName=null }) {
  const hbsInJS = HTMLBarsCompiler.precompile(hbsContent.toString(), { moduleName: moduleName });

  return `define("${moduleName}", ["exports"], function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    exports.default = Ember.HTMLBars.template(${hbsInJS});
  })`
}
