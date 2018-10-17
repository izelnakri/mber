import DebugToolsPlugin from 'babel-plugin-debug-macros';
import HTMLBarsInlinePrecompile from 'babel-plugin-htmlbars-inline-precompile';
import { resolveModules } from 'amd-name-resolver';
import { transformSync } from '@babel/core'; // TODO: move this to async:
import HTMLBarsCompiler from '../../vendor/ember-template-compiler';

export default function(codeString, { moduleName=null }) {
  const resolver = resolveModules({ moduleRoot: moduleName.slice(0, moduleName.indexOf('/')) });

  const { code } = transformSync(codeString.toString(), {
    filename: moduleName,
    moduleId: moduleName,
    presets: [['@babel/preset-env', { loose: true, modules: false }]], // TODO: add browserlist here
    plugins: [
      ["babel-plugin-module-resolver", {
        resolvePath: (dependencyPath) => resolver(dependencyPath, moduleName) // NOTE: investigate if we can ditch amd-name-resolver
      }],
      [HTMLBarsInlinePrecompile, { precompile: HTMLBarsCompiler.precompile }],
      ['module:babel6-plugin-strip-heimdall'],
      [DebugToolsPlugin, {
        debugTools: {
          isDebug: !(process.env.EMBER_ENV === 'production'),
          source: '@ember/debug'
        },
        flags: [{
          source: '@glimmer/env',
          flags: { DEBUG: !(process.env.EMBER_ENV === 'production'), CI: false }
        }],
        externalizeHelpers: {
          global: 'Ember'
        }
      }],
      [
        'ember-modules-api-polyfill',
        { blacklist: { '@ember/debug': ['assert', 'deprecate', 'warn', 'instrument']} }
      ],
      [
        '@babel/plugin-transform-modules-amd',
        { noInterop: true, loose: true }
      ],
      ['filter-imports', {
        imports: process.env.EMBER_ENV === 'production' ? {
          'ember-data/-debug': ['instrument', 'assertPolymorphicType', 'default']
        } : {}
      }]
    ],
  });

  return code;
}
