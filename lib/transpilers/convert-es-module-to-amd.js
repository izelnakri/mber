import DebugToolsPlugin from 'babel-plugin-debug-macros';
import HTMLBarsInlinePrecompile from 'babel-plugin-htmlbars-inline-precompile';
import { resolveModules } from 'amd-name-resolver';
import { transformAsync } from '@babel/core';
import HTMLBarsCompiler from '../../vendor/ember-template-compiler';

export default async function(codeString, { moduleName=null }) {
  const resolver = resolveModules({ moduleRoot: moduleName.slice(0, moduleName.indexOf('/')) });

  // TODO: move from targets.js test and app
  const { code } = await transformAsync(codeString.toString(), {
    filename: moduleName,
    moduleId: moduleName,
    presets: [
      ['@babel/preset-env', {
        targets: [
          "and_chr 70",
          "and_uc 11.8",
          "chrome 70",
          "firefox 63",
          "ios_saf 12.0-12.1"
        ],
        exclude: [
          'transform-async-to-generator',
          'transform-regenerator'
        ]
      }]
    ], // TODO: add browserlist here
    plugins: [
      [HTMLBarsInlinePrecompile, { precompile: HTMLBarsCompiler.precompile }],
      ['module:babel6-plugin-strip-heimdall'],
      [DebugToolsPlugin, {
        debugTools: { isDebug: !(process.env.EMBER_ENV === 'production'),
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
      ['filter-imports', {
        imports: process.env.EMBER_ENV === 'production' ? {
          'ember-data/-debug': ['instrument', 'assertPolymorphicType', 'default']
        } : {}
      }],
      ['@babel/plugin-transform-modules-amd', { noInterop: true }],
      ['babel-plugin-module-resolver', {
        resolvePath: (dependencyPath) => resolver(dependencyPath, moduleName) // NOTE: investigate if we can ditch amd-name-resolver
      }],
      ['@babel/plugin-proposal-decorators', { decoratorsBeforeExport: true }],
      '@babel/plugin-proposal-class-properties',
    ],
  });

  return code;
}
