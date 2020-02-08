import DS from 'ember-data';
import { pluralize } from 'ember-inflector';
// import { computed } from '@ember/object';
import { dasherize } from '@ember/string';
import ENV from '../../../../config/environment';

const { RESTAdapter, InvalidError, errorsHashToArray } = DS;

export default class ApplicationAdapter extends RESTAdapter {
  // @service session;
  // @tracked this.session.authenticationToken;
  host = ENV.APP.API_HOST;
  coalesceFindRequests = true;

  pathForType(type) {
    return pluralize(dasherize(type));
  }
  // get headers() {
  //   if (this.session.authenticationToken) {
  //     return { Authorization: `Bearer ${this.session.authenticationToken}` };
  //   }
  // }
  handleResponse(status, headers, payload) {
    if (this.isInvalid(status, headers, payload)) {
      const errors = errorsHashToArray(payload.errors);

      return new InvalidError(errors);
    }

    return super.handleResponse(...arguments);
  }
}
