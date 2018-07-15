import require from 'require';
import { classify} from '@ember/string';
import { singularize } from 'ember-inflector';
import MEMSERVER from 'memserver';

export default {
  name: 'memserver',
  initialize() {
    if (typeof FastBoot === 'undefined') {
      startMemServer();
    }
  }
}

export function startMemServer() {
  const APP_MODULES = Object.keys(window.requirejs.entries);

  const modelFixtureTree = APP_MODULES.reduce((result, moduleReference) => {
    if (/\/memserver\/fixtures/g.test(moduleReference)) {
      const modelName = classify(singularize(moduleReference.split('/').slice(-1)[0]));
      const fixtures = require(moduleReference, null, null, true).default;

      if (!fixtures) {
        throw new Error(`[MemServer] ${moduleReference} cannot be loaded, please check if you are exporting an array!`)
      }

      result[modelName] = Object.assign(result[modelName] || {}, { fixtures: fixtures });
    } else if (/\/memserver\/models/g.test(moduleReference)) {
      const modelName = classify(moduleReference.split('/').slice(-1)[0]);
      const model = require(moduleReference, null, null, true).default;

      if (!model) {
        throw new Error(`[MemServer] ${moduleReference} cannot be loaded, please check if you are the model correctly!`)
      }

      result[modelName] = Object.assign(result[modelName] || {}, { model: model });
    }

    return result;
  }, {});

  const initializerPath = APP_MODULES.find((entry) => entry.endsWith('memserver/initializer'));
  const MemServerInitializer = initializerPath ? require(initializerPath).default : function() {};
  const serverPath = APP_MODULES.find((entry) => entry.endsWith('memserver/server'));

  if (!serverPath) {
    throw new Error('/memserver/server.js doesn\'t exist for this application!');
  }

  const Server = require(serverPath).default

  window.MemServer = MEMSERVER(modelFixtureTree, Server, MemServerInitializer);
  window.MemServer.start();

  return window.MemServer;
}
