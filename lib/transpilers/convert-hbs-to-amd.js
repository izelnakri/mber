const HTMLBarsCompiler = (async () => {
  if (!global.require) {
    const { createRequire } = await import('module');
    const { fileURLToPath } = await import('url');
    const requireModule =  global.require ? require : createRequire(fileURLToPath(import.meta.url));

    return requiremodule('../../vendor/ember-template-compiler');
  }

  return require('../../vendor/ember-template-compiler');
})();

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
