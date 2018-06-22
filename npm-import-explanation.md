# Why implementing direct npm imports is a challenge in ember build systems?

ember-source and ember-data is currently distributed as non-ES module libraries. Currently ember-cli transpiles all your `@ember/${module}` imports and turns them to global window.Ember.${module} references during babel transpilation phase via `babel-plugin-ember-modules-api-polyfill` plugin. Ember also expects your modules to be defined as special requirejs modules. This allows browsers to load base ember code optimally, allows dynamic module imports within a single requirejs module definition and allows advanced regex analysis for ember route, initializer and component template resolutions. In other words, when you import an npm module like `import moment from 'moment';` what essentially gets built in your browser javascript is:

```js
define(yourModuleNameBasedOnFilePath, ['moment'], function(moment) {
  // so this requirejs module expects a moment requirejs module definition
});
```

This means when injecting an npm module, extra amount of parsing is needed to check an import that has not yet been defined as a requirejs module. Then if the module has not yet been defined, the npm module and all its dependencies have to be converted to requirejs/AMD module definitions. During this phase one needs to make sure modules are not transpiled and defined twice to keep the file size and build times minimum.

In addition, `ember-cli` by default builds 2 javascript files namely:
- vendor.js(that has ember, ember-data and jquery and custom vendor js injections) and
- application.js(which includes all other application code).

The advantage of this convention is that browser can cache your vendor.js for longer periods since your `vendor.js` changes less often than your `application.js`. Unfortunately, this also adds additional complexity when transpiling/injecting npm modules because now your npm/requirejs transpiler has to be aware of both files and module definitions within. If you have `import $ from 'jquery'` in your `application.js`, jquery npm module has to be defined/imported only once even if your 'vendor.js' also requires jquery internally.

Despite all these challenges, I was able to implement this feature in mber while maintaining a decent build times across all types of builds and rebuilds. The only chore is that the developer has to tell mber which npm modules are used in the application and whether the module should be under vendor.js or application.js. Then mber builds the AMD definition of the module and caches it in memory for subsequent builds.

In addition, I think npm imports in mber will always be orders of magnitute faster than npm imports in `ember-cli` due to lighterweight and full asynchronous/event-loop-friendly approach to building browser javascript and in-memory caching for subsequent builds.
