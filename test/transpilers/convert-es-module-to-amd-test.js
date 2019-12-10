import test from 'ava';
import convertESModuletoAMD from '../../lib/transpilers/convert-es-module-to-amd.js';

test('convertESModuletoAMD(code, { moduleName }) works', async (t) => {
  const code = `import EmberRouter from '@ember/routing/router';
import DocumentationRouter from 'mber-documentation';
import ENV from '../config/environment';

const Router = EmberRouter.extend({
  location: ENV.locationType,
  rootURL: ENV.rootURL
});

Router.map(function() {
  this.route('index', { path: '/' });

  if (ENV.documentation && ENV.documentation.enabled) {
    DocumentationRouter.apply(this, [ENV]);
  }

  this.route('not-found', { path: '/*path' });
});

export default Router;`;

  t.true(
    (await convertESModuletoAMD(code, { moduleName: 'src/router' })).trim() ===
      `define("src/router", ["exports", "mber-documentation", "config/environment"], function (_exports, _mberDocumentation, _environment) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = void 0;
  const Router = Ember.Router.extend({
    location: _environment.default.locationType,
    rootURL: _environment.default.rootURL
  });
  Router.map(function () {
    this.route('index', {
      path: '/'
    });

    if (_environment.default.documentation && _environment.default.documentation.enabled) {
      _mberDocumentation.default.apply(this, [_environment.default]);
    }

    this.route('not-found', {
      path: '/*path'
    });
  });
  var _default = Router;
  _exports.default = _default;
});`
  );
});
