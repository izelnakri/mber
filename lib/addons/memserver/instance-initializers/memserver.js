import require from 'require';
import { classify} from '@ember/string';
import { singularize } from 'ember-inflector';
import Memserver from 'memserver/server';

export default {
  name: 'memserver',
  initialize() {
    if (!window.DISABLE_MEMSERVER) {
      const memserverEntryPath = Object.keys(window.requirejs.entries)
        .find((entry) => entry.endsWith('memserver/index'));

      if (!memserverEntryPath) {
        throw new Error('/memserver/index.ts entrypoint doesn\'t exist for this application!');
      }

      require(memserverEntryPath).default;
    }
  }
}
