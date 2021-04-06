const INLINE_PRECOMPILE_MODULES = Object.freeze({
  'ember-cli-htmlbars': 'hbs',
  'ember-cli-htmlbars-inline-precompile': 'default',
  'htmlbars-inline-precompile': 'default',
});
const { createRequire } = await import('module');
const { fileURLToPath } = await import('url');
const requireModule = global.require ? require : createRequire(fileURLToPath(import.meta.url));

const HTMLBarsCompiler = await requireModule('../../vendor/ember-template-compiler');
const DebugToolsPlugin = await requireModule('babel-plugin-debug-macros');
const HTMLBarsInlinePrecompile = await requireModule('babel-plugin-htmlbars-inline-precompile');
const { transformAsync } = await requireModule('@babel/core');
const { resolveModules } = await requireModule('amd-name-resolver');

export default async function (codeString, { moduleName = null, emberDataRelated = false }) {
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
          targets: ['chrome 70', 'firefox 63', 'ios_saf 12.0-12.1'],
          exclude: ['transform-async-to-generator', 'transform-regenerator'],
        },
      ],
    ], // TODO: add browserlist here
    plugins: [
      ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
      [HTMLBarsInlinePrecompile, {
        precompile: HTMLBarsCompiler.precompile,
        modules: INLINE_PRECOMPILE_MODULES
      }],
      [
        DebugToolsPlugin,
        {
          debugTools: {
            isDebug: !(process.env.EMBER_ENV === 'production'),
            source: '@ember/debug',
          },
          flags: [
            {
              source: '@glimmer/env',
              flags: { DEBUG: !(process.env.EMBER_ENV === 'production'), CI: false },
            },
          ],
          externalizeHelpers: {
            global: 'Ember',
          },
        },
      ],
      [
        'ember-modules-api-polyfill',
        { blacklist: { '@ember/debug': ['assert', 'deprecate', 'warn', 'instrument'] } },
      ],
      ['@babel/plugin-transform-modules-amd', { noInterop: true }],
      [
        'babel-plugin-module-resolver',
        {
          resolvePath: (dependencyPath) => resolver(dependencyPath, moduleName), // NOTE: investigate if we can ditch amd-name-resolver
        },
      ],
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-proposal-class-properties', { loose: true }],
    ].concat(addEmberDataSpecificBabelPlugins(emberDataRelated, DebugToolsPlugin)),
  });

  return code;
}

function addEmberDataSpecificBabelPlugins(emberDataRelated, DebugToolsPlugin) {
  if (!emberDataRelated) {
    return [];
  }

  return [
    [
      DebugToolsPlugin,
      {
        flags: [
          {
            source: '@ember-data/canary-features',
            flags: {
              SAMPLE_FEATURE_FLAG: false,
              RECORD_DATA_ERRORS: false,
              RECORD_DATA_STATE: false,
              IDENTIFIERS: true,
              REQUEST_SERVICE: false,
              CUSTOM_MODEL_CLASS: false,
              FULL_LINKS_ON_RELATIONSHIPS: false,
              RECORD_ARRAY_MANAGER_IDENTIFIERS: false,
              REMOVE_RECORD_ARRAY_MANAGER_LEGACY_COMPAT: false,
            },
          },
        ],
      },
      '@ember-data/canary-features-stripping',
    ],
    [
      DebugToolsPlugin,
      {
        flags: [
          {
            source: '@ember-data/private-build-infra',
            flags: {
              HAS_EMBER_DATA_PACKAGE: true,
              HAS_STORE_PACKAGE: true,
              HAS_MODEL_PACKAGE: true,
              HAS_ADAPTER_PACKAGE: true,
              HAS_SERIALIZER_PACKAGE: true,
              HAS_DEBUG_PACKAGE: true,
              HAS_RECORD_DATA_PACKAGE: true,
            },
          },
        ],
      },
      '@ember-data/optional-packages-stripping',
    ],
    [
      DebugToolsPlugin,
      {
        flags: [
          {
            source: '@ember-data/private-build-infra/deprecations',
            flags: {
              DEPRECATE_CATCH_ALL: true,
              DEPRECATE_EVENTED_API_USAGE: true,
              DEPRECATE_RECORD_LIFECYCLE_EVENT_METHODS: true,
              DEPRECATE_MODEL_DATA: true,
              DEPRECATE_MODEL_TOJSON: true,
              DEPRECATE_LEGACY_TEST_HELPER_SUPPORT: true,
              DEPRECATE_LEGACY_TEST_REGISTRATIONS: true,
              DEPRECATE_DEFAULT_SERIALIZER: true,
              DEPRECATE_DEFAULT_ADAPTER: true,
              DEPRECATE_METHOD_CALLS_ON_DESTROY_STORE: true,
              DEPRECATE_SERIALIZER_QUERY_RECORD_ARRAY_RESPONSE: true,
              DEPRECATE_MISMATCHED_INVERSE_RELATIONSHIP_DATA: true,
              DEPRECATE_BELONGS_TO_REFERENCE_PUSH: true,
              DEPRECATE_REFERENCE_INTERNAL_MODEL: true,
              DEPRECATE_NAJAX: true
            },
          },
        ],
      },
      '@ember-data/deprecation-stripping',
    ],
    ['module:babel6-plugin-strip-heimdall'],
    [
      'filter-imports',
      {
        imports:
          process.env.EMBER_ENV === 'production'
            ? {
                'ember-data/-debug': ['instrument', 'assertPolymorphicType', 'default'],
              }
            : {},
      },
    ],
  ];
}
