import { transform } from 'babel-core';
import { moduleResolve, resolveModules } from 'amd-name-resolver';

export default function(codeString, moduleName=null) {
  const resolver = moduleName ? resolveModules({ moduleRoot: moduleName }) : null;

  const { code } = transform(codeString, {
    plugins: [
      ['ember-modules-api-polyfill', { blacklist: { '@ember/debug': ['assert', 'deprecate', 'warn']} }],
      ['transform-es2015-modules-amd', { noInterop: true, loose: true }]
    ],
    moduleId: moduleName,
    resolveModuleSource: moduleName ? resolver : null
  });

  // TODO: amd-name-resolver should work correctly with parameters provided

  // console.log('code is', code);

  return code;
}
// for module ids: https://babeljs.io/docs/usage/api/
