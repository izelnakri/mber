;if (typeof FastBoot === 'undefined') {
      var preferNative = true;
      (function (global) {
  define('fetch', ['exports'], function (self) {
    'use strict';

    var Promise = global.Ember.RSVP.Promise;
    var supportProps = ['FormData', 'FileReader', 'Blob', 'URLSearchParams', 'Symbol', 'ArrayBuffer'];
    var polyfillProps = ['fetch', 'Headers', 'Request', 'Response', 'AbortController'];
    var combinedProps = supportProps;
    if (preferNative) {
      combinedProps = supportProps.concat(polyfillProps);
    }
    combinedProps.forEach(function (prop) {
      if (global[prop]) {
        Object.defineProperty(self, prop, {
          configurable: true,
          get: function () {
            return global[prop];
          },
          set: function (v) {
            global[prop] = v;
          }
        });
      }
    });

    if (!self.fetch) {
      throw new Error('fetch is not defined - maybe your browser targets are not covering everything you need?');
    }

    var pending = 0;
    function decrement(result) {
      pending--;
      return result;
    }

    if (global.Ember.Test) {
      global.Ember.Test.registerWaiter(function () {
        return pending === 0;
      });

      self['default'] = function () {
        pending++;

        return self.fetch.apply(global, arguments).then(function (response) {
          response.clone().blob().then(decrement, decrement);
          return response;
        }, function (reason) {
          decrement(reason);
          throw reason;
        });
      };
    } else {
      self['default'] = self.fetch;
    }
    supportProps.forEach(function (prop) {
      delete self[prop];
    });
  });

  define('fetch/ajax', ['exports'], function () {
    throw new Error('You included `fetch/ajax` but it was renamed to `ember-fetch/ajax`');
  });
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this);
}
;define('ember-fetch/ajax', ['exports', 'fetch'], function (exports, _fetch) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.default = ajax;
    function ajax(input, init) {
        return (0, _fetch.default)(input, init).then(response => {
            if (response.ok) {
                return response.json();
            }
            throw response;
        });
    }
});
;define('ember-fetch/mixins/adapter-fetch', ['exports', 'fetch', 'ember-fetch/utils/mung-options-for-fetch', 'ember-fetch/utils/determine-body-promise'], function (exports, _fetch, _mungOptionsForFetch, _determineBodyPromise) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.headersToObject = headersToObject;

    /**
     * Helper function to create a plain object from the response's Headers.
     * Consumed by the adapter's `handleResponse`.
     */
    function headersToObject(headers) {
        let headersObject = {};
        if (headers) {
            headers.forEach((value, key) => headersObject[key] = value);
        }
        return headersObject;
    }
    exports.default = Ember.Mixin.create({
        headers: undefined,
        /**
         * @override
         */
        ajaxOptions(url, type, options) {
            let hash = options || {};
            hash.url = url;
            hash.type = type;
            // Add headers set on the Adapter
            let adapterHeaders = Ember.get(this, 'headers');
            if (adapterHeaders) {
                hash.headers = Ember.assign(hash.headers || {}, adapterHeaders);
            }
            const mungedOptions = (0, _mungOptionsForFetch.default)(hash);
            // Mimics the default behavior in Ember Data's `ajaxOptions`, namely to set the
            // 'Content-Type' header to application/json if it is not a GET request and it has a body.
            if (mungedOptions.method !== 'GET' && mungedOptions.body && (mungedOptions.headers === undefined || !(mungedOptions.headers['Content-Type'] || mungedOptions.headers['content-type']))) {
                mungedOptions.headers = mungedOptions.headers || {};
                mungedOptions.headers['Content-Type'] = 'application/json; charset=utf-8';
            }
            return mungedOptions;
        },
        /**
         * @override
         */
        ajax(url, type, options) {
            const requestData = {
                url,
                method: type
            };
            const hash = this.ajaxOptions(url, type, options);
            return this._ajaxRequest(hash)
            // @ts-ignore
            .catch((error, response, requestData) => {
                throw this.ajaxError(this, response, null, requestData, error);
            }).then(response => {
                return Ember.RSVP.hash({
                    response,
                    payload: (0, _determineBodyPromise.default)(response, requestData)
                });
            }).then(({ response, payload }) => {
                if (response.ok) {
                    return this.ajaxSuccess(this, response, payload, requestData);
                } else {
                    throw this.ajaxError(this, response, payload, requestData);
                }
            });
        },
        /**
         * Overrides the `_ajaxRequest` method to use `fetch` instead of jQuery.ajax
         * @override
         */
        _ajaxRequest(options) {
            return this._fetchRequest(options.url, options);
        },
        /**
         * A hook into where `fetch` is called.
         * Useful if you want to override this behavior, for example to multiplex requests.
         */
        _fetchRequest(url, options) {
            return (0, _fetch.default)(url, options);
        },
        /**
         * @override
         */
        ajaxSuccess(adapter, response, payload, requestData) {
            const returnResponse = adapter.handleResponse(response.status, headersToObject(response.headers),
            // TODO: DS.RESTAdapter annotates payload: {}
            // @ts-ignore
            payload, requestData);
            // TODO: DS.RESTAdapter annotates response: {}
            // @ts-ignore
            if (returnResponse && returnResponse.isAdapterError) {
                return Ember.RSVP.reject(returnResponse);
            } else {
                return returnResponse;
            }
        },
        /**
         * Allows for the error to be selected from either the
         * response object, or the response data.
         */
        parseFetchResponseForError(response, payload) {
            return payload || response.statusText;
        },
        /**
         * @override
         */
        ajaxError(adapter, response, payload, requestData, error) {
            if (error) {
                return error;
            } else {
                const parsedResponse = adapter.parseFetchResponseForError(response, payload);
                return adapter.handleResponse(response.status, headersToObject(response.headers),
                // TODO: parseErrorResponse is DS.RESTAdapter private API
                // @ts-ignore
                adapter.parseErrorResponse(parsedResponse) || payload, requestData);
            }
        }
    });
});
;define('ember-fetch/types', ['exports'], function (exports) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.isPlainObject = isPlainObject;
    function isPlainObject(obj) {
        return Object.prototype.toString.call(obj) === '[object Object]';
    }
});
;define('ember-fetch/utils/determine-body-promise', ['exports'], function (exports) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.default = determineBodyPromise;
    /**
     * Function that always attempts to parse the response as json, and if an error is thrown,
     * returns `undefined` if the response is successful and has a status code of 204 (No Content),
     * or 205 (Reset Content) or if the request method was 'HEAD', and the plain payload otherwise.
     */
    function determineBodyPromise(response, requestData) {
        return response.text().then(function (payload) {
            let ret = payload;
            try {
                ret = JSON.parse(payload);
            } catch (error) {
                if (!(error instanceof SyntaxError)) {
                    throw error;
                }
                const status = response.status;
                if (response.ok && (status === 204 || status === 205 || requestData.method === 'HEAD')) {
                    ret = undefined;
                } else {
                    console.warn('This response was unable to be parsed as json.', payload);
                }
            }
            return ret;
        });
    }
});
;define('ember-fetch/utils/mung-options-for-fetch', ['exports', 'ember-fetch/utils/serialize-query-params', 'ember-fetch/types'], function (exports, _serializeQueryParams, _types) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.default = mungOptionsForFetch;

    /**
     * Helper function that translates the options passed to `jQuery.ajax` into a format that `fetch` expects.
     */
    function mungOptionsForFetch(options) {
        const hash = Ember.assign({
            credentials: 'same-origin'
        }, options);
        // Default to 'GET' in case `type` is not passed in (mimics jQuery.ajax).
        hash.method = (hash.method || hash.type || 'GET').toUpperCase();
        if (hash.data) {
            // GET and HEAD requests can't have a `body`
            if (hash.method === 'GET' || hash.method === 'HEAD') {
                // If no options are passed, Ember Data sets `data` to an empty object, which we test for.
                if (Object.keys(hash.data).length) {
                    // Test if there are already query params in the url (mimics jQuey.ajax).
                    const queryParamDelimiter = hash.url.indexOf('?') > -1 ? '&' : '?';
                    hash.url += `${queryParamDelimiter}${(0, _serializeQueryParams.serializeQueryParams)(hash.data)}`;
                }
            } else {
                // NOTE: a request's body cannot be a POJO, so we stringify it if it is.
                // JSON.stringify removes keys with values of `undefined` (mimics jQuery.ajax).
                // If the data is not a POJO (it's a String, FormData, etc), we just set it.
                // If the data is a string, we assume it's a stringified object.
                if ((0, _types.isPlainObject)(hash.data)) {
                    hash.body = JSON.stringify(hash.data);
                } else {
                    hash.body = hash.data;
                }
            }
        }
        return hash;
    }
});
;define('ember-fetch/utils/serialize-query-params', ['exports', 'ember-fetch/types'], function (exports, _types) {
    'use strict';

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.serializeQueryParams = serializeQueryParams;

    const RBRACKET = /\[\]$/;
    /**
     * Helper function that turns the data/body of a request into a query param string.
     * This is directly copied from jQuery.param.
     */
    function serializeQueryParams(queryParamsObject) {
        var s = [];
        function buildParams(prefix, obj) {
            var i, len, key;
            if (prefix) {
                if (Array.isArray(obj)) {
                    for (i = 0, len = obj.length; i < len; i++) {
                        if (RBRACKET.test(prefix)) {
                            add(s, prefix, obj[i]);
                        } else {
                            buildParams(prefix + '[' + (typeof obj[i] === 'object' ? i : '') + ']', obj[i]);
                        }
                    }
                } else if ((0, _types.isPlainObject)(obj)) {
                    for (key in obj) {
                        buildParams(prefix + '[' + key + ']', obj[key]);
                    }
                } else {
                    add(s, prefix, obj);
                }
            } else if (Array.isArray(obj)) {
                for (i = 0, len = obj.length; i < len; i++) {
                    add(s, obj[i].name, obj[i].value);
                }
            } else {
                for (key in obj) {
                    buildParams(key, obj[key]);
                }
            }
            return s;
        }
        return buildParams('', queryParamsObject).join('&').replace(/%20/g, '+');
    }
    /**
     * Part of the `serializeQueryParams` helper function.
     */
    function add(s, k, v) {
        // Strip out keys with undefined value and replace null values with
        // empty strings (mimics jQuery.ajax)
        if (v === undefined) {
            return;
        } else if (v === null) {
            v = '';
        }
        v = typeof v === 'function' ? v() : v;
        s[s.length] = `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    }
    exports.default = serializeQueryParams;
});
