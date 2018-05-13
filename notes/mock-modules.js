global.require = require('esm')(module);

const fs = require('fs');
const mock = require('mock-require');

// const Ember = require('./ember.js/dist/ember.prod.js');
const references = fs.readdirSync('./ember.js/dist/es/@ember').forEach((directory) => {
  const firstLevelFiles = fs.readdirSync(`./ember.js/dist/es/@ember/${directory}`).forEach((file) => {
    if (file.endsWith('.js')) {
      const code = require('babel-core').transform(
        fs.readFileSync(`./ember.js/dist/es/@ember/${directory}/${file}`).toString(),
        {
          plugins: ['transform-es2015-modules-commonjs']
        }
      ).code;

      if (!fs.existsSync(`./mock/@ember/${directory}`)) {
        fs.mkdirSync(`./mock/@ember/${directory}`);
      }

      fs.writeFile(`./mock/@ember/${directory}/${file}`, code);
    }
  });
});

// lol = require('babel-core').transform(fs.readFileSync('./ember.js/packages/@ember/application/index.js').toString(), {
//   plugins: ['transform-es2015-modules-amd']
// });
// NOTE: Module Unification shimming is either in lib/broccoli | lib/models | | lib/tasks | lib/utilities

// NOTE: maybe   let plugin = require('babel-plugin-transform-es2015-modules-amd');
// NOTE: read ember-resolver !!!!
//       emberShims = ember.paths.shims;

// NOTE: ember-resolver/mu-trees/addon/ember-config.js

// packageApplicationJs(tree) {
//   let inputFiles = [`${this.name}/**/*.js`];
//   let headerFiles = [
//     'vendor/ember-cli/app-prefix.js',
//   ];
//   let footerFiles = [
//     'vendor/ember-cli/app-suffix.js',
//     'vendor/ember-cli/app-config.js',
//     'vendor/ember-cli/app-boot.js',
//   ];

// export { getOwner, setOwner } from 'ember-owner';
// export { onLoad, runLoadHooks, _loaded } from './lib/lazy_load';
// export { default } from './lib/application';

// mock('@ember/application', {
//   default:
// })

// const references = fs
//   .readdirSync('./ember.js/dist/es')
//   .filter((moduleName) => ['loader', 'node-module', 'internal-test-helpers', 'external-helpers']);
//
// console.log('modules are', references);

// [
//   'ember-utils',
//   '@ember/polyfills',
//   'ember-environment',
//   'ember-browser-environment',
//   '@ember/error',
//   '@ember/debug',
//   '@ember/canary-features',
//   'backburner',
//   // '@ember/runloop'
//   'ember-metal'
//   // 'ember-error-handling'
//   // 'ember-owner',
//   // '@ember/application'
// ].forEach((moduleName) => mock(moduleName, require(`./ember.js/dist/es/${moduleName}`)));

// mock('ember-utils', require('./ember.js/dist/es/ember-utils'));
// mock('@ember/polyfills', require('./ember.js/dist/es/@ember/polyfills'));
// mock('ember-environment', require('./ember.js/dist/es/ember-environment'));
// mock('ember-browser-environment', ;
// mock('@ember/debug', require('./ember.js/dist/es/@ember/debug'));
// mock('container', require('./ember.js/dist/es/container'));

// lol = require('./ember.js/dist/es/ember-runtime');
// console.log('lol is', lol);
// references.forEach((moduleName) => mock(moduleName, require(`./ember.js/dist/es/${moduleName}`)));
