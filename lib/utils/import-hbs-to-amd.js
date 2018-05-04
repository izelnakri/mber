import HTMLBarsCompiler from '../../../vendor/ember-template-compiler';

export default function(moduleName, hbsContent) {
  const hbsInJS = HTMLBarsCompiler.precompile(hbsContent.toString(), { moduleName: moduleName }); // NOTE: also get .hbs here

  return `define(${moduleName}, ["exports"], function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    exports.default = Ember.HTMLBars.template(${hbsInJS});
  })`
}
