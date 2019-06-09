export default async function(hbsContent, { moduleName=null }) {
  const { createRequire } = await import('module');
  const { fileURLToPath } = await import('url');
  const requireModule =  global.require ? require : createRequire(fileURLToPath(import.meta.url));

  const HTMLBarsCompiler = requireModule('../../vendor/ember-template-compiler');

  const hbsInJS = HTMLBarsCompiler.precompile(hbsContent.toString(), { moduleName: moduleName });

  return `define("${moduleName}", ["exports"], function (exports) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    exports.default = Ember.HTMLBars.template(${hbsInJS});
  })`
}
