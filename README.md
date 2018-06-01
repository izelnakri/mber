# mber: Modern Ember.js, without broccoli.

I just rewrote ember-cli, because it uses a slow, clunky, messy broccoli build system that does too much magic. I hoped I wouldnt need to do this but ember-cli has always been getting in to the way of my productivity. I've realized one day rewriting it from scratch is the only way to move forward. It currently looks like I've made a good long term investment by taking the painful path to salvation.

<p>
  WARNING: This is highly experimental, you've been warned.
  <a href="https://circleci.com/gh/izelnakri/mber/">
    <img src="https://circleci.com/gh/izelnakri/mber/tree/master.png" alt="Build Status">
  </a>
</p>

My hobby take on replacing ember-cli with parcel sometime in far future.


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

# CREDITS
This would have been impossible without the great interop libraries, structures, conventions and the framework source code itself which is mainly developed by the ember core team and the community by large.

This library is also a message to inspire and demonstrate Embers superiority in design and community to other frontend developers who are not yet fully knowledgeable of Ember.js framework.

The software is currently in very alpha stage, expect it to become stable shortly with no backward-compatibility promises.
