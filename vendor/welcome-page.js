;define('ember-welcome-page/components/welcome-page', ['exports', 'ember-welcome-page/templates/components/welcome-page'], function (exports, _welcomePage) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = Ember.Component.extend({
    layout: _welcomePage.default,

    emberVersion: Ember.computed(function () {
      let [major, minor] = Ember.VERSION.split(".");

      return `${major}.${minor}.0`;
    })
  });
});
;define("ember-welcome-page/templates/components/welcome-page", ["exports"], function (exports) {
  "use strict";

  exports.__esModule = true;
  exports.default = Ember.HTMLBars.template({ "id": "ZIPdqfGv", "block": "{\"symbols\":[],\"statements\":[[6,\"div\"],[10,\"id\",\"ember-welcome-page-id-selector\"],[11,\"data-ember-version\",[27,[[20,\"emberVersion\"]]]],[8],[0,\"\\n  \"],[6,\"div\"],[10,\"class\",\"columns\"],[8],[0,\"\\n    \"],[6,\"div\"],[10,\"class\",\"tomster\"],[8],[0,\"\\n      \"],[6,\"img\"],[10,\"src\",\"ember-welcome-page/images/construction.png\"],[10,\"alt\",\"Under construction\"],[8],[9],[0,\"\\n    \"],[9],[0,\"\\n    \"],[6,\"div\"],[10,\"class\",\"welcome\"],[8],[0,\"\\n      \"],[6,\"h2\"],[10,\"id\",\"title\"],[8],[0,\"Congratulations, you made it!\"],[9],[0,\"\\n\\n      \"],[6,\"p\"],[8],[0,\"You’ve officially spun up your very first Ember app :-)\"],[9],[0,\"\\n      \"],[6,\"p\"],[8],[0,\"You’ve got one more decision to make: what do you want to do next? We’d suggest one of the following to help you get going:\"],[9],[0,\"\\n      \"],[6,\"ol\"],[8],[0,\"\\n        \"],[6,\"li\"],[8],[6,\"a\"],[11,\"href\",[27,[\"https://guides.emberjs.com/v\",[20,\"emberVersion\"],\"/getting-started/quick-start/\"]]],[8],[0,\"Quick Start\"],[9],[0,\" - a quick introduction to how Ember works. Learn about defining your first route, writing a UI component and deploying your application.\"],[9],[0,\"\\n        \"],[6,\"li\"],[8],[6,\"a\"],[11,\"href\",[27,[\"https://guides.emberjs.com/v\",[20,\"emberVersion\"],\"/tutorial/ember-cli/\"]]],[8],[0,\"Ember Guides\"],[9],[0,\" - this is our more thorough, hands-on intro to Ember. Your crash course in Ember philosophy, background and some in-depth discussion of how things work (and why they work the way they do).\"],[9],[0,\"\\n      \"],[9],[0,\"\\n      \"],[6,\"p\"],[8],[0,\"If you run into problems, you can check \"],[6,\"a\"],[10,\"href\",\"http://stackoverflow.com/questions/tagged/ember.js\"],[8],[0,\"Stack Overflow\"],[9],[0,\" or \"],[6,\"a\"],[10,\"href\",\"http://discuss.emberjs.com/\"],[8],[0,\"our forums\"],[9],[0,\"  for ideas and answers—someone’s probably been through the same thing and already posted an answer.  If not, you can post your \"],[6,\"strong\"],[8],[0,\"own\"],[9],[0,\" question. People love to help new Ember developers get started, and our \"],[6,\"a\"],[10,\"href\",\"https://emberjs.com/community/\"],[8],[0,\"Ember Community\"],[9],[0,\" is incredibly supportive.\"],[9],[0,\"\\n    \"],[9],[0,\"\\n  \"],[9],[0,\"\\n    \"],[6,\"p\"],[10,\"class\",\"postscript\"],[8],[0,\"To remove this welcome message, remove the \"],[6,\"code\"],[8],[0,\"{{welcome-page}}\"],[9],[0,\" component from your \"],[6,\"code\"],[8],[0,\"application.hbs\"],[9],[0,\" file.\"],[6,\"br\"],[8],[9],[0,\"You'll see this page update soon after!\"],[9],[0,\"\\n\"],[9],[0,\"\\n\"]],\"hasEval\":false}", "meta": { "moduleName": "ember-welcome-page/templates/components/welcome-page.hbs" } });
});
;
