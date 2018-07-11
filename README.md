# mber: Modern Ember.js, without broccoli.

This build system uses [Module Unification RFC](https://github.com/emberjs/rfcs/blob/master/text/0143-module-unification.md) and [fastboot](https://www.ember-fastboot.com/) by default. I've recently rewrote ember-cli, because it uses a slow, clunky, messy broccoli build system that does too much counter-intuitive magic. One day after reading ember-cli source code, I've realized rewriting this beast from scratch is the only way to move forward.

It currently looks like I've made a good long term investment by taking the painful path to salvation.

<p>
  WARNING: This is highly experimental, you've been warned. Also no guarantee given for backward compatibility with ember-cli.

  <a href="https://circleci.com/gh/izelnakri/mber/">
    <img src="https://circleci.com/gh/izelnakri/mber/tree/master.png" alt="Build Status">
  </a>
</p>


## Installation

Make sure you have node.js v10+ installed. Then install mber CLI:

```
npm install -g mber
```

Check mber CLI commands:

```
mber
```

Create an mber application:

```
mber new [your-app-name]
```

run mber server:

```
mber s
```

Now your development server is running on http://localhost:1234

### Testing

Running your application test suite is same as before:

```
mber test --server
```

You can now view your tests in your browser afterwards.

If you are running your tests in the terminal and CI servers you can use the following:

```
mber test
```

If you want to view/debug the browser output:

```
mber test --debug=true
```

Currently tests only run on the actual google chrome for CI. In future I might implement CI mode support for other browsers.

### Adding libraries and ember-cli-addons to your build

Instead of ```ember-cli-build.js``` you now have ```index.js``` in your project root which allows you to add 3rd party code to your application and build your application. The syntax is very similar to ember-cli. However here we are slightly more explicit and respect node.js conventions. In far future this design decision will allow node.js imports of your frontend code:

```js
// in your index.js

/* eslint-env node */
const app = require('mber');

module.exports = function(ENV) {
  const { environment } = ENV;

  if (!environment !== 'somecustomenvironment') {
    app.import('node_modules/yourlibrary/dist/', { type: 'vendor '});

    app.import('node_modules/chart.js/dist/Chart.min.js', {
      type: 'application', prepend: true, using: [{
        transformation: 'fastbootShim'
      }]
    }); // NOTE: same sytax as documented in ember-cli docs
  }

  // NOTE: Your addons are now not magically imported for the sake of explicitness and control.
  // Instead, for example you can import your code via:
  app.importAddon('ember-cli-moment', {
    type: 'vendor', using: [{ transformation: 'fastbootShim' }]
  });

  return app.build(environment);
}

```

### Whitelisting npm modules

Mber supports importing npm modules and browser javascript as AMD modules. However you need to explicitly state these imports in your build config(index.js). The reason why this is needed is explained [here](https://github.com/izelnakri/mber/blob/master/npm-import-explanation.md):

```js
// in your index.js

/* eslint-env node */
const app = require('mber');

module.exports = function(ENV) {
  const { environment } = ENV;

  app.importAsAMDModule('moment', 'node_modules/moment/min/moment.min.js', {
    type: 'vendor'
  });

  app.importAsAMDModule('bip39', {
    type: 'vendor', using: [{ transformation: 'fastbootShim' }]
  });

  return app.build(environment);
}

// then in your application code you can simply import these modules

import Component from '@ember/component';
import moment from 'moment';
import bip39 from 'bip39';

export default Component.extend({
  phrase: bip39.generateMnemonic()
});
```

### Adding dynamic inline-content to your index.html

./index.html supports dynamic inline-content based on your environment configuration:

```html
<!-- in your index.html -->

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">

    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

    <meta name="description" content="">
    <!-- EMBER_CLI_FASTBOOT_TITLE --><!-- EMBER_CLI_FASTBOOT_HEAD -->

    <link rel="stylesheet" href="/assets/application.css">
  </head>
  <body>
    <!-- EMBER_CLI_FASTBOOT_BODY -->

    <script src="/assets/vendor.js"></script>
    <script src="/assets/application.js"></script>

    {{google-analytics}}

    {{sentry}}
  </body>
</html>
```

```js
// in your index.js

/* eslint-env node */
const app = require('mber');

module.exports = function(ENV) {
  const { environment } = ENV;

  if (environment === 'production') {
    app.injectInlineContent('googleAnalytics', `
      <script>
        window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
        ga('create', '${ENV.googleAnalyticsId}', 'auto');
      </script>
      <script async src='https://www.google-analytics.com/analytics.js'></script>
    `);
  }

  if (ENV.sentry.url) {
    app.injectInlineContent('sentry', `
      <script>
        Raven.config('${ENV.sentry.url}', {
          ignoreUrls: [${ENV.sentry.ignoreUrls}],
          ignoreErrors: ${JSON.stringify(ENV.sentry.ignoreErrors)}
        }).addPlugin(Raven.Plugins.Ember).install();
      </script>
    `);
  }

  return app.build(environment);
}
```

#### Extra: How to exclude ember-data from your application:

By default mber builds an ember application without jQuery. If want jquery in your application do this:

```js
const app = require('mber');

module.exports = function(ENV) {
  const { environment } = ENV;

  // your other configuration ..

  app.import('node_modules/jquery/dist/jquery.min.js', {
    type: 'vendor', prepend: true
  });

  return app.build(environment);
}
```

If you want to exclude EmberData from your application. Add excludeEmberData to your config/environment.js:

```js
'use strict';

module.exports = function(environment) {
  let ENV = {
    modulePrefix: '{{applicationName}}',
    environment,
    excludeEmberData: true // to exclude ember-data
  }

  // .. remaining code

  return ENV;
}
```

#### Hipster feature: You can now run your frontend app from your command line:

```mber console```

Yep, now you can.


#### Using ember-i18n with mber

Currently ember-i18n has legacy folder/code under addon directory that gets filtered during ember-cli builds. Until that issue gets resolved you can use mber-i18n instead. Example:

```js
// in your index.js

/* eslint-env node */
const app = require('mber');

module.exports = function(ENV) {
  const { environment } = ENV;

  app.importAddon('ember-i18n', 'mber-i18n', { type: 'vendor' }); // here we are telling mber to inject addon code of mber-i18n npm module, however use ember-i18n module name during AMD transpilation
}
```

#### Using sinon with mber tests

Sinon is a very large javascript project with 10k+ lines of code, this can make your initial build noticibly slow for tests. When you `importAsAMDModule(file)`, mber by default runs the target javascript file through babel and browserify. In order to disable this transpilation you can use: { transpile: false } option, therefore maintain the exceptional initial build speed:

```js
/* eslint-env node */
const app = require('mber');

module.exports = function(ENV) {
  const { environment } = ENV;

  if (environment === 'test') {
    app.importAsAMDModule('sinon', 'node_modules/sinon/pkg/sinon-no-sourcemaps.js', {
      type: 'vendor', transpile: false
    });
  }

  return app.build(environment);
}
```

#### Enabling Ember optional features

Currently ember-source builds toggle two features based on environment configurations. You can toggle them in your `environment.js`:

```js
module.exports = function(environment) {
  let ENV = {
    _APPLICATION_TEMPLATE_WRAPPER: false, // NOTE: true by default
    _TEMPLATE_ONLY_GLIMMER_COMPONENTS: true // NOTE: false by default
  }
};
```

# CREDITS
This would have been impossible without the great interop libraries, structures, conventions and the framework source code itself which is mainly developed by the ember core team and the community by large.

This library is also a message to inspire and demonstrate Embers superiority in design and community to other frontend developers who are not yet fully knowledgeable of Ember.js framework.

The software is currently in very alpha stage, expect it to become stable shortly with no backward-compatibility promises.
