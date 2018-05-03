import { transform } from 'babel-core';
import { resolveModules } from 'amd-name-resolver';

export default function(codeString, { moduleName=null, libraryPath, fileAbsolutePath }) {
  const resolver = resolveModules({ moduleRoot: moduleName.slice(0, moduleName.indexOf('/')) });
  // const modulePath = fileAbsolutePath.replace(libraryPath, moduleName);
  // const moduleRelativeDir = modulePath.slice(moduleName.length + 1, modulePath.lastIndexOf('/'));

  // console.log('moduleName is', moduleName);
  // console.log('libraryPath is', libraryPath);
  // console.log('fileAbsolutePath is', fileAbsolutePath);
  // console.log('modulePath is', modulePath);
  // console.log('moduleRelativeDir is', moduleRelativeDir);

  const { code } = transform(codeString, {
    plugins: [
      getDebugMacroPlugins(),
      ['ember-modules-api-polyfill', { blacklist: { '@ember/debug': ['assert', 'deprecate', 'warn']} }],
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
    resolveModuleSource: (dependencyReference) => {
      return resolver(dependencyReference, moduleName);
    }
  });

  return code;
}

function getDebugMacroPlugins() {
  const DebugMacros = require('babel-plugin-debug-macros').default;
  const isProduction = process.env.EMBER_ENV === 'production';

  let options = {
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
