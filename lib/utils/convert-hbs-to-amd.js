const HTMLBarsCompiler = require('../../vendor/ember-template-compiler');

export default function(hbsContent, { moduleName=null }) {
  console.log('moduleName is', moduleName);
  const hbsInJS = HTMLBarsCompiler.precompile(hbsContent.toString(), { moduleName: moduleName }); // NOTE: also get .hbs here

  return `define("${moduleName}", ["exports"], function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    exports.default = Ember.HTMLBars.template(${hbsInJS});
  })`
}
