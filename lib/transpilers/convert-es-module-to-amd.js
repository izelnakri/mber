export default async function(codeString, { moduleName = null }) {
  const { createRequire } = await import('module');
  const { fileURLToPath } = await import('url');
  const requireModule = global.require ? require : createRequire(fileURLToPath(import.meta.url));

  const HTMLBarsCompiler = await requireModule('../../vendor/ember-template-compiler');
  const DebugToolsPlugin = await requireModule('babel-plugin-debug-macros');
  const HTMLBarsInlinePrecompile = await requireModule('babel-plugin-htmlbars-inline-precompile');
  const { transformAsync } = await requireModule('@babel/core');
  const { resolveModules } = await requireModule('amd-name-resolver');

  const resolver = resolveModules({ moduleRoot: moduleName.slice(0, moduleName.indexOf('/')) });

  // TODO: move from targets.js test and app
  const { code } = await transformAsync(codeString.toString(), {
    filename: moduleName,
    moduleId: moduleName,
    inputSourceMap: false,
    presets: [
      [
        '@babel/preset-env',
        {
          targets: ['and_chr 70', 'and_uc 11.8', 'chrome 70', 'firefox 63', 'ios_saf 12.0-12.1'],
          exclude: ['transform-async-to-generator', 'transform-regenerator']
        }
      ]
    ], // TODO: add browserlist here
    plugins: [
      [HTMLBarsInlinePrecompile, { precompile: HTMLBarsCompiler.precompile }],
      ['module:babel6-plugin-strip-heimdall'],
      [
        DebugToolsPlugin,
        {
          debugTools: {
            isDebug: !(process.env.EMBER_ENV === 'production'),
            source: '@ember/debug'
          },
          flags: [
            {
              source: '@glimmer/env',
              flags: { DEBUG: !(process.env.EMBER_ENV === 'production'), CI: false }
            }
          ],
          externalizeHelpers: {
            global: 'Ember'
          }
        }
      ],
      [
        'ember-modules-api-polyfill',
        { blacklist: { '@ember/debug': ['assert', 'deprecate', 'warn', 'instrument'] } }
      ],
      [
        'filter-imports',
        {
          imports:
            process.env.EMBER_ENV === 'production'
              ? {
                  'ember-data/-debug': ['instrument', 'assertPolymorphicType', 'default']
                }
              : {}
        }
      ],
      ['@babel/plugin-transform-modules-amd', { noInterop: true }],
      [
        'babel-plugin-module-resolver',
        {
          resolvePath: (dependencyPath) => resolver(dependencyPath, moduleName) // NOTE: investigate if we can ditch amd-name-resolver
        }
      ],
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-proposal-class-properties', { loose: true }],
      '@babel/plugin-transform-typescript'
    ]
  });

  return code;
}
