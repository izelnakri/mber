import { transform } from 'babel-core';

export default function(codeString) {
  const { code, map, ast } = transform(codeString, {
    plugins: ['ember-modules-api-polyfill', 'transform-es2015-modules-amd']
  });

  console.log('code is', code);

  return code;
}
