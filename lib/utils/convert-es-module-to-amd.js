import { transform } from 'babel-core';
import { resolveModules } from 'amd-name-resolver';

export default function(codeString, { moduleName=null }) {
  const resolver = resolveModules({ moduleRoot: moduleName.slice(0, moduleName.indexOf('/')) });
  const { code } = transform(codeString, {
    plugins: [
      ['babel6-plugin-strip-heimdall'], // TODO: make this optional for ember-data, also add handlebars hbs`` babelification!
      getDebugMacroPlugins(),
      [
        'ember-modules-api-polyfill',
        { blacklist: { '@ember/debug': ['assert', 'deprecate', 'warn', 'instrument']} }
      ],
      ['transform-es2015-modules-amd', { noInterop: true, loose: true }],
      'transform-es2015-arrow-functions',
      'transform-es2015-computed-properties',
      'transform-es2015-shorthand-properties',
      'transform-es2015-template-literals',
      'transform-es2015-parameters',
      'transform-es2015-destructuring',
      'transform-es2015-spread',
      'transform-es2015-block-scoping',
      'transform-es2015-constants',
      ['transform-es2015-classes', { loose: true }]
    ],
    moduleId: moduleName,
    resolveModuleSource: (dependencyReference) => resolver(dependencyReference, moduleName)
  });

  return code;
}

function getDebugMacroPlugins() {
  const DebugMacros = require('babel-plugin-debug-macros').default;
  const isProduction = process.env.EMBER_ENV === 'production';
  const options = {
    envFlags: {
      source: '@glimmer/env',
      flags: { DEBUG: !isProduction, CI: !!process.env.CI }
    },
    externalizeHelpers: {
      global: 'Ember'
    },
    debugTools: {
      source: '@ember/debug'
    }
  };

  return [DebugMacros, options];
}

// NOTE: in future: import('') to load stuff async
