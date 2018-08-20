import DS from 'ember-data';
import { pluralize } from 'ember-inflector';
// import { computed } from '@ember/object';
import { dasherize } from '@ember/string';
import ENV from '../../../../config/environment';

const { RESTAdapter, InvalidError, errorsHashToArray } = DS;

export default RESTAdapter.extend({
  // session: service(),
  host: ENV.APP.API_HOST,
  pathForType(type) {
    return pluralize(dasherize(type));
  },
  // headers: computed('session.{authenticationToken,currentUser.@each}', function() {
  //   if (this.session.authenticationToken) {
  //     return { Authorization: `Bearer ${this.session.authenticationToken}` };
  //   }
  // }),
  coalesceFindRequests: true,
  handleResponse(status, headers, payload) {
    if (this.isInvalid(status, headers, payload)) {
      const errors = errorsHashToArray(payload.errors);

      return new InvalidError(errors);
    }

    return this._super(...arguments);
  }
});
