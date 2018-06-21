import browserify from 'browserify';

export default async function(entrypoint, moduleName) {
  const code = await bundleBrowserify(entrypoint);

  return `
    (function() {
      function vendorModule() {
        'use strict';

        ${code}

        return {
          'default': _${moduleName},
          __esModule: true,
        };
      }

      define('${moduleName}', [], vendorModule);
    })();
  `;
}

function bundleBrowserify(entrypoint, moduleName) {
  return new Promise((resolve) => {
    let result = '';
    browserify(entrypoint, { standalone: `_${moduleName}` }).transform('babelify', {
      presets: ['babel-preset-env']
    }).bundle().on('data', (chunk) => {
      result += chunk;
    }).on('end', () => resolve(result));
  });
}
