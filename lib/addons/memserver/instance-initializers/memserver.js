import require from 'require';
import { classify} from '@ember/string';
import { singularize } from 'ember-inflector';
import Memserver from 'memserver/server';

export default {
  name: 'memserver',
  initialize() {
    if (!window.DISABLE_MEMSERVER) {
      window.MemServer ? window.MemServer.shutdown() : null;
      startMemServer();
    }
  }
}

export function startMemServer() {
  const memserverEntryPath = Object.keys(window.requirejs.entries)
    .find((entry) => entry.endsWith('memserver/index'));

  if (!memserverEntryPath) {
    throw new Error('/memserver/index.ts entrypoint doesn\'t exist for this application!');
  }

  window.MemserverModel = require('memserver/model');
  window.requirejs.unsee(memserverEntryPath);

  require(memserverEntryPath).default;

  return window.MemServer;
}
