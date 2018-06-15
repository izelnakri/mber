# mber: Modern Ember.js, without broccoli.

My hobby take on replacing ember-cli. I've recently rewrote ember-cli, because it uses a slow, clunky, messy broccoli build system that does too much counter-intuitive magic. One day after reading ember-cli source code, I've realized rewriting this beast from scratch is the only way to move forward.

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

Now your development server is running on http://localhost:4200

Running your test suite is same as before:

```
mber test --server
```

### Adding libraries and ember-cli-addons to your build

Instead of ```ember-cli-build.js``` you now have ```index.js``` in your project root which allows you to add 3rd party code to your application and build your application. The syntax is very similar to ember-cli. However here we are slightly more explicit and respect node.js conventions. In far future this design decision will allow node.js imports of your frontend code:

```js
// in your index.js

/* eslint-env node */
const app = require('mber');

module.exports = function(environment) {
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

#### Extra: How to exclude ember-data or jquery from your application:

add excludeEmberData or excludeJQuery to your config/environment.js:
```js
'use strict';

module.exports = function(environment) {
  let ENV = {
    modulePrefix: '{{applicationName}}',
    environment,
    excludeEmberData: true, // to exclude ember-data
    excludeJQuery: true // to exclude jQuery
  }

  // .. remaining code

  return ENV;
}
```

#### How to run your frontend app in your command line!

```mber console```

Yep, now you can.

# CREDITS
This would have been impossible without the great interop libraries, structures, conventions and the framework source code itself which is mainly developed by the ember core team and the community by large.

This library is also a message to inspire and demonstrate Embers superiority in design and community to other frontend developers who are not yet fully knowledgeable of Ember.js framework.

The software is currently in very alpha stage, expect it to become stable shortly with no backward-compatibility promises.
