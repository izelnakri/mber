import { resolveModules } from 'amd-name-resolver';
import { transformSync } from '@babel/core'; // TODO: move this to async:
import HTMLBarsInlinePrecompile from 'babel-plugin-htmlbars-inline-precompile';
import HTMLBarsCompiler from '../../vendor/ember-template-compiler';

// TODO: maybe do some plugins here injected from the parameters for speed optimization
export default function(codeString, { moduleName=null }) {
  const resolver = resolveModules({ moduleRoot: moduleName.slice(0, moduleName.indexOf('/')) });

  const { code } = transformSync(codeString.toString(), {
    filename: moduleName,
    presets: ['@babel/preset-env'], // TODO: check if this is slower than previous
    plugins: [
      ["babel-plugin-module-resolver", {
        resolvePath: (dependencyPath) => resolver(dependencyPath, moduleName) // NOTE: investigate if we can ditch amd-name-resolver
      }],
      [HTMLBarsInlinePrecompile, { precompile: HTMLBarsCompiler.precompile }],

      // ['babel6-plugin-strip-heimdall'], // TODO: make this optional, only needed for ember-data
      // getDebugMacroPlugins(),
      [
        'ember-modules-api-polyfill',
        { blacklist: { '@ember/debug': ['assert', 'deprecate', 'warn', 'instrument']} }
      ],
      [
        '@babel/plugin-transform-modules-amd',
        { noInterop: true, loose: true }
      ],
    ],
  });

  return code;
}

// function getDebugMacroPlugins() {
//   const DebugMacros = require('babel-plugin-debug-macros').default;
//   const options = {
//     envFlags: {
//       source: '@glimmer/env',
//       flags: { DEBUG: !(process.env.EMBER_ENV === 'production'), CI: false }
//     },
//     externalizeHelpers: {
//       global: 'Ember'
//     },
//     debugTools: {
//       source: '@ember/debug'
//     }
//   };
//
//   return [DebugMacros, options];
// }
