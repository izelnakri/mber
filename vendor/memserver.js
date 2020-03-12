
        
  (function() {
    window.fetch = undefined;
  })();


        (function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.WHATWGFetch = {})));
}(this, (function (exports) { 'use strict';

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob:
      'FileReader' in self &&
      'Blob' in self &&
      (function() {
        try {
          new Blob();
          return true
        } catch (e) {
          return false
        }
      })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  };

  function isDataView(obj) {
    return obj && DataView.prototype.isPrototypeOf(obj)
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ];

    var isArrayBufferView =
      ArrayBuffer.isView ||
      function(obj) {
        return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
      };
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name);
    }
    if (/[^a-z0-9\-#$%&'*+.^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift();
        return {done: value === undefined, value: value}
      }
    };

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      };
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {};

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value);
      }, this);
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1]);
      }, this);
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name]);
      }, this);
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name);
    value = normalizeValue(value);
    var oldValue = this.map[name];
    this.map[name] = oldValue ? oldValue + ', ' + value : value;
  };

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)];
  };

  Headers.prototype.get = function(name) {
    name = normalizeName(name);
    return this.has(name) ? this.map[name] : null
  };

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  };

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value);
  };

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this);
      }
    }
  };

  Headers.prototype.keys = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push(name);
    });
    return iteratorFor(items)
  };

  Headers.prototype.values = function() {
    var items = [];
    this.forEach(function(value) {
      items.push(value);
    });
    return iteratorFor(items)
  };

  Headers.prototype.entries = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push([name, value]);
    });
    return iteratorFor(items)
  };

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true;
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.onerror = function() {
        reject(reader.error);
      };
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsArrayBuffer(blob);
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsText(blob);
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf);
    var chars = new Array(view.length);

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i]);
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength);
      view.set(new Uint8Array(buf));
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false;

    this._initBody = function(body) {
      this._bodyInit = body;
      if (!body) {
        this._bodyText = '';
      } else if (typeof body === 'string') {
        this._bodyText = body;
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body;
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body;
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString();
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer);
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer]);
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body);
      } else {
        this._bodyText = body = Object.prototype.toString.call(body);
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8');
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type);
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
        }
      }
    };

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this);
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      };

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      };
    }

    this.text = function() {
      var rejected = consumed(this);
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    };

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      };
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    };

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

  function normalizeMethod(method) {
    var upcased = method.toUpperCase();
    return methods.indexOf(upcased) > -1 ? upcased : method
  }

  function Request(input, options) {
    options = options || {};
    var body = options.body;

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url;
      this.credentials = input.credentials;
      if (!options.headers) {
        this.headers = new Headers(input.headers);
      }
      this.method = input.method;
      this.mode = input.mode;
      this.signal = input.signal;
      if (!body && input._bodyInit != null) {
        body = input._bodyInit;
        input.bodyUsed = true;
      }
    } else {
      this.url = String(input);
    }

    this.credentials = options.credentials || this.credentials || 'same-origin';
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers);
    }
    this.method = normalizeMethod(options.method || this.method || 'GET');
    this.mode = options.mode || this.mode || null;
    this.signal = options.signal || this.signal;
    this.referrer = null;

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body);
  }

  Request.prototype.clone = function() {
    return new Request(this, {body: this._bodyInit})
  };

  function decode(body) {
    var form = new FormData();
    body
      .trim()
      .split('&')
      .forEach(function(bytes) {
        if (bytes) {
          var split = bytes.split('=');
          var name = split.shift().replace(/\+/g, ' ');
          var value = split.join('=').replace(/\+/g, ' ');
          form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
      });
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers();
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
    preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':');
      var key = parts.shift().trim();
      if (key) {
        var value = parts.join(':').trim();
        headers.append(key, value);
      }
    });
    return headers
  }

  Body.call(Request.prototype);

  function Response(bodyInit, options) {
    if (!options) {
      options = {};
    }

    this.type = 'default';
    this.status = options.status === undefined ? 200 : options.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = 'statusText' in options ? options.statusText : 'OK';
    this.headers = new Headers(options.headers);
    this.url = options.url || '';
    this._initBody(bodyInit);
  }

  Body.call(Response.prototype);

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  };

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''});
    response.type = 'error';
    return response
  };

  var redirectStatuses = [301, 302, 303, 307, 308];

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  };

  exports.DOMException = self.DOMException;
  try {
    new exports.DOMException();
  } catch (err) {
    exports.DOMException = function(message, name) {
      this.message = message;
      this.name = name;
      var error = Error(message);
      this.stack = error.stack;
    };
    exports.DOMException.prototype = Object.create(Error.prototype);
    exports.DOMException.prototype.constructor = exports.DOMException;
  }

  function fetch(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init);

      if (request.signal && request.signal.aborted) {
        return reject(new exports.DOMException('Aborted', 'AbortError'))
      }

      var xhr = new XMLHttpRequest();

      function abortXhr() {
        xhr.abort();
      }

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        };
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        resolve(new Response(body, options));
      };

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'));
      };

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'));
      };

      xhr.onabort = function() {
        reject(new exports.DOMException('Aborted', 'AbortError'));
      };

      xhr.open(request.method, request.url, true);

      if (request.credentials === 'include') {
        xhr.withCredentials = true;
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false;
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob';
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value);
      });

      if (request.signal) {
        request.signal.addEventListener('abort', abortXhr);

        xhr.onreadystatechange = function() {
          // DONE (success or failure)
          if (xhr.readyState === 4) {
            request.signal.removeEventListener('abort', abortXhr);
          }
        };
      }

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
    })
  }

  fetch.polyfill = true;

  if (!self.fetch) {
    self.fetch = fetch;
    self.Headers = Headers;
    self.Request = Request;
    self.Response = Response;
  }

  exports.Headers = Headers;
  exports.Request = Request;
  exports.Response = Response;
  exports.fetch = fetch;

  Object.defineProperty(exports, '__esModule', { value: true });

})));


        
      ;(function() {
        function vendorModule() {
          'use strict';

          (function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g._memserver__model = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

exports.byteLength = byteLength;
exports.toByteArray = toByteArray;
exports.fromByteArray = fromByteArray;
var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i];
  revLookup[code.charCodeAt(i)] = i;
} // Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications


revLookup['-'.charCodeAt(0)] = 62;
revLookup['_'.charCodeAt(0)] = 63;

function getLens(b64) {
  var len = b64.length;

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4');
  } // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42


  var validLen = b64.indexOf('=');
  if (validLen === -1) validLen = len;
  var placeHoldersLen = validLen === len ? 0 : 4 - validLen % 4;
  return [validLen, placeHoldersLen];
} // base64 is 4/3 + up to two characters of the original data


function byteLength(b64) {
  var lens = getLens(b64);
  var validLen = lens[0];
  var placeHoldersLen = lens[1];
  return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
}

function _byteLength(b64, validLen, placeHoldersLen) {
  return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
}

function toByteArray(b64) {
  var tmp;
  var lens = getLens(b64);
  var validLen = lens[0];
  var placeHoldersLen = lens[1];
  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
  var curByte = 0; // if there are placeholders, only get up to the last complete 4 chars

  var len = placeHoldersLen > 0 ? validLen - 4 : validLen;
  var i;

  for (i = 0; i < len; i += 4) {
    tmp = revLookup[b64.charCodeAt(i)] << 18 | revLookup[b64.charCodeAt(i + 1)] << 12 | revLookup[b64.charCodeAt(i + 2)] << 6 | revLookup[b64.charCodeAt(i + 3)];
    arr[curByte++] = tmp >> 16 & 0xFF;
    arr[curByte++] = tmp >> 8 & 0xFF;
    arr[curByte++] = tmp & 0xFF;
  }

  if (placeHoldersLen === 2) {
    tmp = revLookup[b64.charCodeAt(i)] << 2 | revLookup[b64.charCodeAt(i + 1)] >> 4;
    arr[curByte++] = tmp & 0xFF;
  }

  if (placeHoldersLen === 1) {
    tmp = revLookup[b64.charCodeAt(i)] << 10 | revLookup[b64.charCodeAt(i + 1)] << 4 | revLookup[b64.charCodeAt(i + 2)] >> 2;
    arr[curByte++] = tmp >> 8 & 0xFF;
    arr[curByte++] = tmp & 0xFF;
  }

  return arr;
}

function tripletToBase64(num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
}

function encodeChunk(uint8, start, end) {
  var tmp;
  var output = [];

  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16 & 0xFF0000) + (uint8[i + 1] << 8 & 0xFF00) + (uint8[i + 2] & 0xFF);
    output.push(tripletToBase64(tmp));
  }

  return output.join('');
}

function fromByteArray(uint8) {
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes

  var parts = [];
  var maxChunkLength = 16383; // must be multiple of 3
  // go through the array every three bytes, we'll deal with trailing stuff later

  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, i + maxChunkLength > len2 ? len2 : i + maxChunkLength));
  } // pad the end with zeros, but make sure to not forget the extra bytes


  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 0x3F] + '==');
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
    parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 0x3F] + lookup[tmp << 2 & 0x3F] + '=');
  }

  return parts.join('');
}

},{}],2:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol.for === 'function')
    ? Symbol.for('nodejs.util.inspect.custom')
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    var proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof SharedArrayBuffer !== 'undefined' &&
      (isInstance(value, SharedArrayBuffer) ||
      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
var hexSliceLookupTable = (function () {
  var alphabet = '0123456789abcdef'
  var table = new Array(256)
  for (var i = 0; i < 16; ++i) {
    var i16 = i * 16
    for (var j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
"use strict";

exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? nBytes - 1 : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];
  i += d;
  e = s & (1 << -nBits) - 1;
  s >>= -nBits;
  nBits += eLen;

  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & (1 << -nBits) - 1;
  e >>= -nBits;
  nBits += mLen;

  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : (s ? -1 : 1) * Infinity;
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }

  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
  var i = isLE ? 0 : nBytes - 1;
  var d = isLE ? 1 : -1;
  var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);

    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }

    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }

    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = e << mLen | m;
  eLen += mLen;

  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128;
};

},{}],4:[function(require,module,exports){
(function (process,global,Buffer){
'use strict';

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function unwrapExports(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
  return module = {
    exports: {}
  }, fn(module, module.exports), module.exports;
}

var isBuffer = function isBuffer(arg) {
  return arg instanceof Buffer;
};

var inherits_browser = createCommonjsModule(function (module) {
  if (typeof Object.create === 'function') {
    // implementation from standard node.js 'util' module
    module.exports = function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    };
  } else {
    // old school shim for old browsers
    module.exports = function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;

      var TempCtor = function () {};

      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    };
  }
});
var inherits = createCommonjsModule(function (module) {
  try {
    var util$1 = util;
    if (typeof util$1.inherits !== 'function') throw '';
    module.exports = util$1.inherits;
  } catch (e) {
    module.exports = inherits_browser;
  }
});
var util = createCommonjsModule(function (module, exports) {
  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to permit
  // persons to whom the Software is furnished to do so, subject to the
  // following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
  // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
  // USE OR OTHER DEALINGS IN THE SOFTWARE.
  var formatRegExp = /%[sdj%]/g;

  exports.format = function (f) {
    if (!isString(f)) {
      var objects = [];

      for (var i = 0; i < arguments.length; i++) {
        objects.push(inspect(arguments[i]));
      }

      return objects.join(' ');
    }

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function (x) {
      if (x === '%%') return '%';
      if (i >= len) return x;

      switch (x) {
        case '%s':
          return String(args[i++]);

        case '%d':
          return Number(args[i++]);

        case '%j':
          try {
            return JSON.stringify(args[i++]);
          } catch (_) {
            return '[Circular]';
          }

        default:
          return x;
      }
    });

    for (var x = args[i]; i < len; x = args[++i]) {
      if (isNull(x) || !isObject(x)) {
        str += ' ' + x;
      } else {
        str += ' ' + inspect(x);
      }
    }

    return str;
  }; // Mark that a method should not be used.
  // Returns a modified function which warns once by default.
  // If --no-deprecation is set, then it is a no-op.


  exports.deprecate = function (fn, msg) {
    // Allow for deprecating things in the process of starting up.
    if (isUndefined(commonjsGlobal.process)) {
      return function () {
        return exports.deprecate(fn, msg).apply(this, arguments);
      };
    }

    if (process.noDeprecation === true) {
      return fn;
    }

    var warned = false;

    function deprecated() {
      if (!warned) {
        if (process.throwDeprecation) {
          throw new Error(msg);
        } else if (process.traceDeprecation) {
          console.trace(msg);
        } else {
          console.error(msg);
        }

        warned = true;
      }

      return fn.apply(this, arguments);
    }

    return deprecated;
  };

  var debugs = {};
  var debugEnviron;

  exports.debuglog = function (set) {
    if (isUndefined(debugEnviron)) debugEnviron = process.env.NODE_DEBUG || '';
    set = set.toUpperCase();

    if (!debugs[set]) {
      if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
        var pid = process.pid;

        debugs[set] = function () {
          var msg = exports.format.apply(exports, arguments);
          console.error('%s %d: %s', set, pid, msg);
        };
      } else {
        debugs[set] = function () {};
      }
    }

    return debugs[set];
  };
  /**
   * Echos the value of a value. Trys to print the value out
   * in the best way possible given the different types.
   *
   * @param {Object} obj The object to print out.
   * @param {Object} opts Optional options object that alters the output.
   */

  /* legacy: obj, showHidden, depth, colors*/


  function inspect(obj, opts) {
    // default options
    var ctx = {
      seen: [],
      stylize: stylizeNoColor
    }; // legacy...

    if (arguments.length >= 3) ctx.depth = arguments[2];
    if (arguments.length >= 4) ctx.colors = arguments[3];

    if (isBoolean(opts)) {
      // legacy...
      ctx.showHidden = opts;
    } else if (opts) {
      // got an "options" object
      exports._extend(ctx, opts);
    } // set default options


    if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
    if (isUndefined(ctx.depth)) ctx.depth = 2;
    if (isUndefined(ctx.colors)) ctx.colors = false;
    if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
    if (ctx.colors) ctx.stylize = stylizeWithColor;
    return formatValue(ctx, obj, ctx.depth);
  }

  exports.inspect = inspect; // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics

  inspect.colors = {
    'bold': [1, 22],
    'italic': [3, 23],
    'underline': [4, 24],
    'inverse': [7, 27],
    'white': [37, 39],
    'grey': [90, 39],
    'black': [30, 39],
    'blue': [34, 39],
    'cyan': [36, 39],
    'green': [32, 39],
    'magenta': [35, 39],
    'red': [31, 39],
    'yellow': [33, 39]
  }; // Don't use 'blue' not visible on cmd.exe

  inspect.styles = {
    'special': 'cyan',
    'number': 'yellow',
    'boolean': 'yellow',
    'undefined': 'grey',
    'null': 'bold',
    'string': 'green',
    'date': 'magenta',
    // "name": intentionally not styling
    'regexp': 'red'
  };

  function stylizeWithColor(str, styleType) {
    var style = inspect.styles[styleType];

    if (style) {
      return '\u001b[' + inspect.colors[style][0] + 'm' + str + '\u001b[' + inspect.colors[style][1] + 'm';
    } else {
      return str;
    }
  }

  function stylizeNoColor(str, styleType) {
    return str;
  }

  function arrayToHash(array) {
    var hash = {};
    array.forEach(function (val, idx) {
      hash[val] = true;
    });
    return hash;
  }

  function formatValue(ctx, value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (ctx.customInspect && value && isFunction(value.inspect) && // Filter out the util module, it's inspect function is special
    value.inspect !== exports.inspect && // Also filter out any prototype objects using the circular check.
    !(value.constructor && value.constructor.prototype === value)) {
      var ret = value.inspect(recurseTimes, ctx);

      if (!isString(ret)) {
        ret = formatValue(ctx, ret, recurseTimes);
      }

      return ret;
    } // Primitive types cannot have properties


    var primitive = formatPrimitive(ctx, value);

    if (primitive) {
      return primitive;
    } // Look up the keys of the object.


    var keys = Object.keys(value);
    var visibleKeys = arrayToHash(keys);

    if (ctx.showHidden) {
      keys = Object.getOwnPropertyNames(value);
    } // IE doesn't make error fields non-enumerable
    // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx


    if (isError(value) && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
      return formatError(value);
    } // Some type of object without properties can be shortcutted.


    if (keys.length === 0) {
      if (isFunction(value)) {
        var name = value.name ? ': ' + value.name : '';
        return ctx.stylize('[Function' + name + ']', 'special');
      }

      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      }

      if (isDate(value)) {
        return ctx.stylize(Date.prototype.toString.call(value), 'date');
      }

      if (isError(value)) {
        return formatError(value);
      }
    }

    var base = '',
        array = false,
        braces = ['{', '}']; // Make Array say that they are Array

    if (isArray(value)) {
      array = true;
      braces = ['[', ']'];
    } // Make functions say that they are functions


    if (isFunction(value)) {
      var n = value.name ? ': ' + value.name : '';
      base = ' [Function' + n + ']';
    } // Make RegExps say that they are RegExps


    if (isRegExp(value)) {
      base = ' ' + RegExp.prototype.toString.call(value);
    } // Make dates with properties first say the date


    if (isDate(value)) {
      base = ' ' + Date.prototype.toUTCString.call(value);
    } // Make error with message first say the error


    if (isError(value)) {
      base = ' ' + formatError(value);
    }

    if (keys.length === 0 && (!array || value.length == 0)) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      } else {
        return ctx.stylize('[Object]', 'special');
      }
    }

    ctx.seen.push(value);
    var output;

    if (array) {
      output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
    } else {
      output = keys.map(function (key) {
        return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
      });
    }

    ctx.seen.pop();
    return reduceToSingleString(output, base, braces);
  }

  function formatPrimitive(ctx, value) {
    if (isUndefined(value)) return ctx.stylize('undefined', 'undefined');

    if (isString(value)) {
      var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '').replace(/'/g, "\\'").replace(/\\"/g, '"') + '\'';
      return ctx.stylize(simple, 'string');
    }

    if (isNumber(value)) return ctx.stylize('' + value, 'number');
    if (isBoolean(value)) return ctx.stylize('' + value, 'boolean'); // For some reason typeof null is "object", so special case here.

    if (isNull(value)) return ctx.stylize('null', 'null');
  }

  function formatError(value) {
    return '[' + Error.prototype.toString.call(value) + ']';
  }

  function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
    var output = [];

    for (var i = 0, l = value.length; i < l; ++i) {
      if (hasOwnProperty(value, String(i))) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
      } else {
        output.push('');
      }
    }

    keys.forEach(function (key) {
      if (!key.match(/^\d+$/)) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
      }
    });
    return output;
  }

  function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
    var name, str, desc;
    desc = Object.getOwnPropertyDescriptor(value, key) || {
      value: value[key]
    };

    if (desc.get) {
      if (desc.set) {
        str = ctx.stylize('[Getter/Setter]', 'special');
      } else {
        str = ctx.stylize('[Getter]', 'special');
      }
    } else {
      if (desc.set) {
        str = ctx.stylize('[Setter]', 'special');
      }
    }

    if (!hasOwnProperty(visibleKeys, key)) {
      name = '[' + key + ']';
    }

    if (!str) {
      if (ctx.seen.indexOf(desc.value) < 0) {
        if (isNull(recurseTimes)) {
          str = formatValue(ctx, desc.value, null);
        } else {
          str = formatValue(ctx, desc.value, recurseTimes - 1);
        }

        if (str.indexOf('\n') > -1) {
          if (array) {
            str = str.split('\n').map(function (line) {
              return '  ' + line;
            }).join('\n').substr(2);
          } else {
            str = '\n' + str.split('\n').map(function (line) {
              return '   ' + line;
            }).join('\n');
          }
        }
      } else {
        str = ctx.stylize('[Circular]', 'special');
      }
    }

    if (isUndefined(name)) {
      if (array && key.match(/^\d+$/)) {
        return str;
      }

      name = JSON.stringify('' + key);

      if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
        name = name.substr(1, name.length - 2);
        name = ctx.stylize(name, 'name');
      } else {
        name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
        name = ctx.stylize(name, 'string');
      }
    }

    return name + ': ' + str;
  }

  function reduceToSingleString(output, base, braces) {
    var length = output.reduce(function (prev, cur) {
      if (cur.indexOf('\n') >= 0) ;
      return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
    }, 0);

    if (length > 60) {
      return braces[0] + (base === '' ? '' : base + '\n ') + ' ' + output.join(',\n  ') + ' ' + braces[1];
    }

    return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
  } // NOTE: These type checking functions intentionally don't use `instanceof`
  // because it is fragile and can be easily faked with `Object.create()`.


  function isArray(ar) {
    return Array.isArray(ar);
  }

  exports.isArray = isArray;

  function isBoolean(arg) {
    return typeof arg === 'boolean';
  }

  exports.isBoolean = isBoolean;

  function isNull(arg) {
    return arg === null;
  }

  exports.isNull = isNull;

  function isNullOrUndefined(arg) {
    return arg == null;
  }

  exports.isNullOrUndefined = isNullOrUndefined;

  function isNumber(arg) {
    return typeof arg === 'number';
  }

  exports.isNumber = isNumber;

  function isString(arg) {
    return typeof arg === 'string';
  }

  exports.isString = isString;

  function isSymbol(arg) {
    return typeof arg === 'symbol';
  }

  exports.isSymbol = isSymbol;

  function isUndefined(arg) {
    return arg === void 0;
  }

  exports.isUndefined = isUndefined;

  function isRegExp(re) {
    return isObject(re) && objectToString(re) === '[object RegExp]';
  }

  exports.isRegExp = isRegExp;

  function isObject(arg) {
    return typeof arg === 'object' && arg !== null;
  }

  exports.isObject = isObject;

  function isDate(d) {
    return isObject(d) && objectToString(d) === '[object Date]';
  }

  exports.isDate = isDate;

  function isError(e) {
    return isObject(e) && (objectToString(e) === '[object Error]' || e instanceof Error);
  }

  exports.isError = isError;

  function isFunction(arg) {
    return typeof arg === 'function';
  }

  exports.isFunction = isFunction;

  function isPrimitive(arg) {
    return arg === null || typeof arg === 'boolean' || typeof arg === 'number' || typeof arg === 'string' || typeof arg === 'symbol' || // ES6 symbol
    typeof arg === 'undefined';
  }

  exports.isPrimitive = isPrimitive;
  exports.isBuffer = isBuffer;

  function objectToString(o) {
    return Object.prototype.toString.call(o);
  }

  function pad(n) {
    return n < 10 ? '0' + n.toString(10) : n.toString(10);
  }

  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; // 26 Feb 16:19:34

  function timestamp() {
    var d = new Date();
    var time = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':');
    return [d.getDate(), months[d.getMonth()], time].join(' ');
  } // log is just a thin wrapper to console.log that prepends a timestamp


  exports.log = function () {
    console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
  };
  /**
   * Inherit the prototype methods from one constructor into another.
   *
   * The Function.prototype.inherits from lang.js rewritten as a standalone
   * function (not on Function.prototype). NOTE: If this file is to be loaded
   * during bootstrapping this function needs to be rewritten using some native
   * functions as prototype setup using normal JavaScript does not work as
   * expected during bootstrapping (see mirror.js in r114903).
   *
   * @param {function} ctor Constructor function which needs to inherit the
   *     prototype.
   * @param {function} superCtor Constructor function to inherit prototype from.
   */


  exports.inherits = inherits;

  exports._extend = function (origin, add) {
    // Don't do anything if add isn't an object
    if (!add || !isObject(add)) return origin;
    var keys = Object.keys(add);
    var i = keys.length;

    while (i--) {
      origin[keys[i]] = add[keys[i]];
    }

    return origin;
  };

  function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }
});
var util_1 = util.format;
var util_2 = util.deprecate;
var util_3 = util.debuglog;
var util_4 = util.inspect;
var util_5 = util.isArray;
var util_6 = util.isBoolean;
var util_7 = util.isNull;
var util_8 = util.isNullOrUndefined;
var util_9 = util.isNumber;
var util_10 = util.isString;
var util_11 = util.isSymbol;
var util_12 = util.isUndefined;
var util_13 = util.isRegExp;
var util_14 = util.isObject;
var util_15 = util.isDate;
var util_16 = util.isError;
var util_17 = util.isFunction;
var util_18 = util.isPrimitive;
var util_19 = util.isBuffer;
var util_20 = util.log;
var util_21 = util.inherits;
var util_22 = util._extend;
var symbols = createCommonjsModule(function (module) {
  const isHyper = process.env.TERM_PROGRAM === 'Hyper';
  const isWindows = process.platform === 'win32';
  const isLinux = process.platform === 'linux';
  const common = {
    ballotDisabled: '☒',
    ballotOff: '☐',
    ballotOn: '☑',
    bullet: '•',
    bulletWhite: '◦',
    fullBlock: '█',
    heart: '❤',
    identicalTo: '≡',
    line: '─',
    mark: '※',
    middot: '·',
    minus: '－',
    multiplication: '×',
    obelus: '÷',
    pencilDownRight: '✎',
    pencilRight: '✏',
    pencilUpRight: '✐',
    percent: '%',
    pilcrow2: '❡',
    pilcrow: '¶',
    plusMinus: '±',
    section: '§',
    starsOff: '☆',
    starsOn: '★',
    upDownArrow: '↕'
  };
  const windows = Object.assign({}, common, {
    check: '√',
    cross: '×',
    ellipsisLarge: '...',
    ellipsis: '...',
    info: 'i',
    question: '?',
    questionSmall: '?',
    pointer: '>',
    pointerSmall: '»',
    radioOff: '( )',
    radioOn: '(*)',
    warning: '‼'
  });
  const other = Object.assign({}, common, {
    ballotCross: '✘',
    check: '✔',
    cross: '✖',
    ellipsisLarge: '⋯',
    ellipsis: '…',
    info: 'ℹ',
    question: '?',
    questionFull: '？',
    questionSmall: '﹖',
    pointer: isLinux ? '▸' : '❯',
    pointerSmall: isLinux ? '‣' : '›',
    radioOff: '◯',
    radioOn: '◉',
    warning: '⚠'
  });
  module.exports = isWindows && !isHyper ? windows : other;
  Reflect.defineProperty(module.exports, 'common', {
    enumerable: false,
    value: common
  });
  Reflect.defineProperty(module.exports, 'windows', {
    enumerable: false,
    value: windows
  });
  Reflect.defineProperty(module.exports, 'other', {
    enumerable: false,
    value: other
  });
});

const isObject = val => val !== null && typeof val === 'object' && !Array.isArray(val);
/* eslint-disable no-control-regex */
// this is a modified version of https://github.com/chalk/ansi-regex (MIT License)


const ANSI_REGEX = /[\u001b\u009b][[\]#;?()]*(?:(?:(?:[^\W_]*;?[^\W_]*)\u0007)|(?:(?:[0-9]{1,4}(;[0-9]{0,4})*)?[~0-9=<>cf-nqrtyA-PRZ]))/g;

const create = () => {
  const colors = {
    enabled: true,
    visible: true,
    styles: {},
    keys: {}
  };

  if ('FORCE_COLOR' in process.env) {
    colors.enabled = process.env.FORCE_COLOR !== '0';
  }

  const ansi = style => {
    let open = style.open = `\u001b[${style.codes[0]}m`;
    let close = style.close = `\u001b[${style.codes[1]}m`;
    let regex = style.regex = new RegExp(`\\u001b\\[${style.codes[1]}m`, 'g');

    style.wrap = (input, newline) => {
      if (input.includes(close)) input = input.replace(regex, close + open);
      let output = open + input + close; // see https://github.com/chalk/chalk/pull/92, thanks to the
      // chalk contributors for this fix. However, we've confirmed that
      // this issue is also present in Windows terminals

      return newline ? output.replace(/\r*\n/g, `${close}$&${open}`) : output;
    };

    return style;
  };

  const wrap = (style, input, newline) => {
    return typeof style === 'function' ? style(input) : style.wrap(input, newline);
  };

  const style = (input, stack) => {
    if (input === '' || input == null) return '';
    if (colors.enabled === false) return input;
    if (colors.visible === false) return '';
    let str = '' + input;
    let nl = str.includes('\n');
    let n = stack.length;

    if (n > 0 && stack.includes('unstyle')) {
      stack = [...new Set(['unstyle', ...stack])].reverse();
    }

    while (n-- > 0) str = wrap(colors.styles[stack[n]], str, nl);

    return str;
  };

  const define = (name, codes, type) => {
    colors.styles[name] = ansi({
      name,
      codes
    });
    let keys = colors.keys[type] || (colors.keys[type] = []);
    keys.push(name);
    Reflect.defineProperty(colors, name, {
      configurable: true,
      enumerable: true,

      set(value) {
        colors.alias(name, value);
      },

      get() {
        let color = input => style(input, color.stack);

        Reflect.setPrototypeOf(color, colors);
        color.stack = this.stack ? this.stack.concat(name) : [name];
        return color;
      }

    });
  };

  define('reset', [0, 0], 'modifier');
  define('bold', [1, 22], 'modifier');
  define('dim', [2, 22], 'modifier');
  define('italic', [3, 23], 'modifier');
  define('underline', [4, 24], 'modifier');
  define('inverse', [7, 27], 'modifier');
  define('hidden', [8, 28], 'modifier');
  define('strikethrough', [9, 29], 'modifier');
  define('black', [30, 39], 'color');
  define('red', [31, 39], 'color');
  define('green', [32, 39], 'color');
  define('yellow', [33, 39], 'color');
  define('blue', [34, 39], 'color');
  define('magenta', [35, 39], 'color');
  define('cyan', [36, 39], 'color');
  define('white', [37, 39], 'color');
  define('gray', [90, 39], 'color');
  define('grey', [90, 39], 'color');
  define('bgBlack', [40, 49], 'bg');
  define('bgRed', [41, 49], 'bg');
  define('bgGreen', [42, 49], 'bg');
  define('bgYellow', [43, 49], 'bg');
  define('bgBlue', [44, 49], 'bg');
  define('bgMagenta', [45, 49], 'bg');
  define('bgCyan', [46, 49], 'bg');
  define('bgWhite', [47, 49], 'bg');
  define('blackBright', [90, 39], 'bright');
  define('redBright', [91, 39], 'bright');
  define('greenBright', [92, 39], 'bright');
  define('yellowBright', [93, 39], 'bright');
  define('blueBright', [94, 39], 'bright');
  define('magentaBright', [95, 39], 'bright');
  define('cyanBright', [96, 39], 'bright');
  define('whiteBright', [97, 39], 'bright');
  define('bgBlackBright', [100, 49], 'bgBright');
  define('bgRedBright', [101, 49], 'bgBright');
  define('bgGreenBright', [102, 49], 'bgBright');
  define('bgYellowBright', [103, 49], 'bgBright');
  define('bgBlueBright', [104, 49], 'bgBright');
  define('bgMagentaBright', [105, 49], 'bgBright');
  define('bgCyanBright', [106, 49], 'bgBright');
  define('bgWhiteBright', [107, 49], 'bgBright');
  colors.ansiRegex = ANSI_REGEX;

  colors.hasColor = colors.hasAnsi = str => {
    colors.ansiRegex.lastIndex = 0;
    return typeof str === 'string' && str !== '' && colors.ansiRegex.test(str);
  };

  colors.alias = (name, color) => {
    let fn = typeof color === 'string' ? colors[color] : color;

    if (typeof fn !== 'function') {
      throw new TypeError('Expected alias to be the name of an existing color (string) or a function');
    }

    if (!fn.stack) {
      Reflect.defineProperty(fn, 'name', {
        value: name
      });
      colors.styles[name] = fn;
      fn.stack = [name];
    }

    Reflect.defineProperty(colors, name, {
      configurable: true,
      enumerable: true,

      set(value) {
        colors.alias(name, value);
      },

      get() {
        let color = input => style(input, color.stack);

        Reflect.setPrototypeOf(color, colors);
        color.stack = this.stack ? this.stack.concat(fn.stack) : fn.stack;
        return color;
      }

    });
  };

  colors.theme = custom => {
    if (!isObject(custom)) throw new TypeError('Expected theme to be an object');

    for (let name of Object.keys(custom)) {
      colors.alias(name, custom[name]);
    }

    return colors;
  };

  colors.alias('unstyle', str => {
    if (typeof str === 'string' && str !== '') {
      colors.ansiRegex.lastIndex = 0;
      return str.replace(colors.ansiRegex, '');
    }

    return '';
  });
  colors.alias('noop', str => str);
  colors.none = colors.clear = colors.noop;
  colors.stripColor = colors.unstyle;
  colors.symbols = symbols;
  colors.define = define;
  return colors;
};

var ansiColors = create();
var create_1 = create;
ansiColors.create = create_1;
var string_registry = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.setStrings = setStrings;
  exports.getStrings = getStrings;
  exports.getString = getString; // STATE within a module is frowned upon, this exists
  // to support Ember.STRINGS but shield ember internals from this legacy global
  // API.

  let STRINGS = {};

  function setStrings(strings) {
    STRINGS = strings;
  }

  function getStrings() {
    return STRINGS;
  }

  function getString(name) {
    return STRINGS[name];
  }
});
unwrapExports(string_registry);
var string_registry_1 = string_registry.setStrings;
var string_registry_2 = string_registry.getStrings;
var string_registry_3 = string_registry.getString;
var browserEnvironment = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.hasDOM = exports.isFirefox = exports.isChrome = exports.userAgent = exports.history = exports.location = exports.window = void 0; // check if window exists and actually is the global

  var hasDom = typeof self === 'object' && self !== null && self.Object === Object && typeof Window !== 'undefined' && self.constructor === Window && typeof document === 'object' && document !== null && self.document === document && typeof location === 'object' && location !== null && self.location === location && typeof history === 'object' && history !== null && self.history === history && typeof navigator === 'object' && navigator !== null && self.navigator === navigator && typeof navigator.userAgent === 'string';
  exports.hasDOM = hasDom;
  const window = hasDom ? self : null;
  exports.window = window;
  const location$1 = hasDom ? self.location : null;
  exports.location = location$1;
  const history$1 = hasDom ? self.history : null;
  exports.history = history$1;
  const userAgent = hasDom ? self.navigator.userAgent : 'Lynx (textmode)';
  exports.userAgent = userAgent;
  const isChrome = hasDom ? Boolean(window.chrome) && !window.opera : false;
  exports.isChrome = isChrome;
  const isFirefox = hasDom ? typeof InstallTrigger !== 'undefined' : false;
  exports.isFirefox = isFirefox;
});
unwrapExports(browserEnvironment);
var browserEnvironment_1 = browserEnvironment.hasDOM;
var browserEnvironment_2 = browserEnvironment.isFirefox;
var browserEnvironment_3 = browserEnvironment.isChrome;
var browserEnvironment_4 = browserEnvironment.userAgent;
var browserEnvironment_5 = browserEnvironment.history;
var browserEnvironment_6 = browserEnvironment.window;
var error = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = void 0;
  /**
   @module @ember/error
  */

  /**
    The JavaScript Error object used by Ember.assert.
  
    @class Error
    @namespace Ember
    @extends Error
    @constructor
    @public
  */

  var _default = Error;
  exports.default = _default;
});
unwrapExports(error);
var es5 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var DEBUG = exports.DEBUG = false;
  var CI = exports.CI = false;
});
unwrapExports(es5);
var es5_1 = es5.DEBUG;
var es5_2 = es5.CI;
var handlers = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.invoke = exports.registerHandler = exports.HANDLERS = void 0;
  let HANDLERS = {};
  exports.HANDLERS = HANDLERS;

  let registerHandler = () => {};

  exports.registerHandler = registerHandler;

  let invoke = () => {};

  exports.invoke = invoke;

  if (es5.DEBUG) {
    exports.registerHandler = registerHandler = function registerHandler(type, callback) {
      let nextHandler = HANDLERS[type] || (() => {});

      HANDLERS[type] = (message, options) => {
        callback(message, options, nextHandler);
      };
    };

    exports.invoke = invoke = function invoke(type, message, test, options) {
      if (test) {
        return;
      }

      let handlerForType = HANDLERS[type];

      if (handlerForType) {
        handlerForType(message, options);
      }
    };
  }
});
unwrapExports(handlers);
var handlers_1 = handlers.invoke;
var handlers_2 = handlers.registerHandler;
var handlers_3 = handlers.HANDLERS;
var deprecate_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.missingOptionsUntilDeprecation = exports.missingOptionsIdDeprecation = exports.missingOptionsDeprecation = exports.registerHandler = exports.default = void 0;
  /**
   @module @ember/debug
   @public
  */

  /**
    Allows for runtime registration of handler functions that override the default deprecation behavior.
    Deprecations are invoked by calls to [@ember/debug/deprecate](/ember/release/classes/@ember%2Fdebug/methods/deprecate?anchor=deprecate).
    The following example demonstrates its usage by registering a handler that throws an error if the
    message contains the word "should", otherwise defers to the default handler.
  
    ```javascript
    import { registerDeprecationHandler } from '@ember/debug';
  
    registerDeprecationHandler((message, options, next) => {
      if (message.indexOf('should') !== -1) {
        throw new Error(`Deprecation message with should: ${message}`);
      } else {
        // defer to whatever handler was registered before this one
        next(message, options);
      }
    });
    ```
  
    The handler function takes the following arguments:
  
    <ul>
      <li> <code>message</code> - The message received from the deprecation call.</li>
      <li> <code>options</code> - An object passed in with the deprecation call containing additional information including:</li>
        <ul>
          <li> <code>id</code> - An id of the deprecation in the form of <code>package-name.specific-deprecation</code>.</li>
          <li> <code>until</code> - The Ember version number the feature and deprecation will be removed in.</li>
        </ul>
      <li> <code>next</code> - A function that calls into the previously registered handler.</li>
    </ul>
  
    @public
    @static
    @method registerDeprecationHandler
    @for @ember/debug
    @param handler {Function} A function to handle deprecation calls.
    @since 2.1.0
  */

  let registerHandler = () => {};

  exports.registerHandler = registerHandler;
  let missingOptionsDeprecation;
  exports.missingOptionsDeprecation = missingOptionsDeprecation;
  let missingOptionsIdDeprecation;
  exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation;
  let missingOptionsUntilDeprecation;
  exports.missingOptionsUntilDeprecation = missingOptionsUntilDeprecation;

  let deprecate = () => {};

  if (es5.DEBUG) {
    exports.registerHandler = registerHandler = function registerHandler(handler) {
      (0, handlers.registerHandler)('deprecate', handler);
    };

    let formatMessage = function formatMessage(_message, options) {
      let message = _message;

      if (options && options.id) {
        message = message + ` [deprecation id: ${options.id}]`;
      }

      if (options && options.url) {
        message += ` See ${options.url} for more details.`;
      }

      return message;
    };

    registerHandler(function logDeprecationToConsole(message, options) {
      let updatedMessage = formatMessage(message, options);
      console.warn(`DEPRECATION: ${updatedMessage}`); // eslint-disable-line no-console
    });
    let captureErrorForStack;

    if (new Error().stack) {
      captureErrorForStack = () => new Error();
    } else {
      captureErrorForStack = () => {
        try {
          __fail__.fail();
        } catch (e) {
          return e;
        }
      };
    }

    registerHandler(function logDeprecationStackTrace(message, options, next) {
      if (environment.ENV.LOG_STACKTRACE_ON_DEPRECATION) {
        let stackStr = '';
        let error = captureErrorForStack();
        let stack;

        if (error.stack) {
          if (error['arguments']) {
            // Chrome
            stack = error.stack.replace(/^\s+at\s+/gm, '').replace(/^([^\(]+?)([\n$])/gm, '{anonymous}($1)$2').replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}($1)').split('\n');
            stack.shift();
          } else {
            // Firefox
            stack = error.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^\(/gm, '{anonymous}(').split('\n');
          }

          stackStr = `\n    ${stack.slice(2).join('\n    ')}`;
        }

        let updatedMessage = formatMessage(message, options);
        console.warn(`DEPRECATION: ${updatedMessage}${stackStr}`); // eslint-disable-line no-console
      } else {
        next(message, options);
      }
    });
    registerHandler(function raiseOnDeprecation(message, options, next) {
      if (environment.ENV.RAISE_ON_DEPRECATION) {
        let updatedMessage = formatMessage(message);
        throw new Error(updatedMessage);
      } else {
        next(message, options);
      }
    });
    exports.missingOptionsDeprecation = missingOptionsDeprecation = 'When calling `deprecate` you ' + 'must provide an `options` hash as the third parameter.  ' + '`options` should include `id` and `until` properties.';
    exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation = 'When calling `deprecate` you must provide `id` in options.';
    exports.missingOptionsUntilDeprecation = missingOptionsUntilDeprecation = 'When calling `deprecate` you must provide `until` in options.';
    /**
     @module @ember/debug
     @public
     */

    /**
      Display a deprecation warning with the provided message and a stack trace
      (Chrome and Firefox only).
         * In a production build, this method is defined as an empty function (NOP).
      Uses of this method in Ember itself are stripped from the ember.prod.js build.
         @method deprecate
      @for @ember/debug
      @param {String} message A description of the deprecation.
      @param {Boolean} test A boolean. If falsy, the deprecation will be displayed.
      @param {Object} options
      @param {String} options.id A unique id for this deprecation. The id can be
        used by Ember debugging tools to change the behavior (raise, log or silence)
        for that specific deprecation. The id should be namespaced by dots, e.g.
        "view.helper.select".
      @param {string} options.until The version of Ember when this deprecation
        warning will be removed.
      @param {String} [options.url] An optional url to the transition guide on the
        emberjs.com website.
      @static
      @public
      @since 1.0.0
    */

    deprecate = function deprecate(message, test, options) {
      (0, debug_1.assert)(missingOptionsDeprecation, Boolean(options && (options.id || options.until)));
      (0, debug_1.assert)(missingOptionsIdDeprecation, Boolean(options.id));
      (0, debug_1.assert)(missingOptionsUntilDeprecation, Boolean(options.until));
      (0, handlers.invoke)('deprecate', message, test, options);
    };
  }

  var _default = deprecate;
  exports.default = _default;
});
unwrapExports(deprecate_1);
var deprecate_2 = deprecate_1.missingOptionsUntilDeprecation;
var deprecate_3 = deprecate_1.missingOptionsIdDeprecation;
var deprecate_4 = deprecate_1.missingOptionsDeprecation;
var deprecate_5 = deprecate_1.registerHandler;
var testing_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.isTesting = isTesting;
  exports.setTesting = setTesting;
  let testing = false;

  function isTesting() {
    return testing;
  }

  function setTesting(value) {
    testing = Boolean(value);
  }
});
unwrapExports(testing_1);
var testing_2 = testing_1.isTesting;
var testing_3 = testing_1.setTesting;
var warn_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.missingOptionsDeprecation = exports.missingOptionsIdDeprecation = exports.registerHandler = exports.default = void 0;

  let registerHandler = () => {};

  exports.registerHandler = registerHandler;

  let warn = () => {};

  let missingOptionsDeprecation;
  exports.missingOptionsDeprecation = missingOptionsDeprecation;
  let missingOptionsIdDeprecation;
  /**
  @module @ember/debug
  */

  exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation;

  if (es5.DEBUG) {
    /**
      Allows for runtime registration of handler functions that override the default warning behavior.
      Warnings are invoked by calls made to [@ember/debug/warn](/ember/release/classes/@ember%2Fdebug/methods/warn?anchor=warn).
      The following example demonstrates its usage by registering a handler that does nothing overriding Ember's
      default warning behavior.
         ```javascript
      import { registerWarnHandler } from '@ember/debug';
         // next is not called, so no warnings get the default behavior
      registerWarnHandler(() => {});
      ```
         The handler function takes the following arguments:
         <ul>
        <li> <code>message</code> - The message received from the warn call. </li>
        <li> <code>options</code> - An object passed in with the warn call containing additional information including:</li>
          <ul>
            <li> <code>id</code> - An id of the warning in the form of <code>package-name.specific-warning</code>.</li>
          </ul>
        <li> <code>next</code> - A function that calls into the previously registered handler.</li>
      </ul>
         @public
      @static
      @method registerWarnHandler
      @for @ember/debug
      @param handler {Function} A function to handle warnings.
      @since 2.1.0
    */
    exports.registerHandler = registerHandler = function registerHandler(handler) {
      (0, handlers.registerHandler)('warn', handler);
    };

    registerHandler(function logWarning(message) {
      /* eslint-disable no-console */
      console.warn(`WARNING: ${message}`);
      /* eslint-enable no-console */
    });
    exports.missingOptionsDeprecation = missingOptionsDeprecation = 'When calling `warn` you ' + 'must provide an `options` hash as the third parameter.  ' + '`options` should include an `id` property.';
    exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation = 'When calling `warn` you must provide `id` in options.';
    /**
      Display a warning with the provided message.
         * In a production build, this method is defined as an empty function (NOP).
      Uses of this method in Ember itself are stripped from the ember.prod.js build.
         ```javascript
      import { warn } from '@ember/debug';
      import tomsterCount from './tomster-counter'; // a module in my project
         // Log a warning if we have more than 3 tomsters
      warn('Too many tomsters!', tomsterCount <= 3, {
        id: 'ember-debug.too-many-tomsters'
      });
      ```
         @method warn
      @for @ember/debug
      @static
      @param {String} message A warning to display.
      @param {Boolean} test An optional boolean. If falsy, the warning
        will be displayed.
      @param {Object} options An object that can be used to pass a unique
        `id` for this warning.  The `id` can be used by Ember debugging tools
        to change the behavior (raise, log, or silence) for that specific warning.
        The `id` should be namespaced by dots, e.g. "ember-debug.feature-flag-with-features-stripped"
      @public
      @since 1.0.0
    */

    warn = function warn(message, test, options) {
      if (arguments.length === 2 && typeof test === 'object') {
        options = test;
        test = false;
      }

      (0, debug_1.assert)(missingOptionsDeprecation, Boolean(options));
      (0, debug_1.assert)(missingOptionsIdDeprecation, Boolean(options && options.id));
      (0, handlers.invoke)('warn', message, test, options);
    };
  }

  var _default = warn;
  exports.default = _default;
});
unwrapExports(warn_1);
var warn_2 = warn_1.missingOptionsDeprecation;
var warn_3 = warn_1.missingOptionsIdDeprecation;
var warn_4 = warn_1.registerHandler;
var arrayUtils = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var EMPTY_ARRAY = exports.EMPTY_ARRAY = Object.freeze([]);
});
unwrapExports(arrayUtils);
var arrayUtils_1 = arrayUtils.EMPTY_ARRAY;
var assert = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.debugAssert = debugAssert;
  exports.prodAssert = prodAssert;
  exports.deprecate = deprecate; // import Logger from './logger';
  // let alreadyWarned = false;

  function debugAssert(test, msg) {
    // if (!alreadyWarned) {
    //   alreadyWarned = true;
    //   Logger.warn("Don't leave debug assertions on in public builds");
    // }
    if (!test) {
      throw new Error(msg || 'assertion failure');
    }
  }

  function prodAssert() {}

  function deprecate(desc) {
    console.warn('DEPRECATION: ' + desc);
  }

  exports.default = debugAssert;
});
unwrapExports(assert);
var assert_1 = assert.debugAssert;
var assert_2 = assert.prodAssert;
var assert_3 = assert.deprecate;
var guid = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.initializeGuid = initializeGuid;
  exports.ensureGuid = ensureGuid;
  var GUID = 0;

  function initializeGuid(object) {
    return object._guid = ++GUID;
  }

  function ensureGuid(object) {
    return object._guid || initializeGuid(object);
  }
});
unwrapExports(guid);
var guid_1 = guid.initializeGuid;
var guid_2 = guid.ensureGuid;
var collections = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.StackImpl = exports.DictSet = undefined;
  exports.dict = dict;
  exports.isDict = isDict;
  exports.isObject = isObject;

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function dict() {
    return Object.create(null);
  }

  function isDict(u) {
    return u !== null && u !== undefined;
  }

  function isObject(u) {
    return typeof u === 'object' && u !== null;
  }

  var DictSet = exports.DictSet = function () {
    function DictSet() {
      _classCallCheck(this, DictSet);

      this.dict = dict();
    }

    DictSet.prototype.add = function add(obj) {
      if (typeof obj === 'string') this.dict[obj] = obj;else this.dict[(0, guid.ensureGuid)(obj)] = obj;
      return this;
    };

    DictSet.prototype.delete = function _delete(obj) {
      if (typeof obj === 'string') delete this.dict[obj];else if (obj._guid) delete this.dict[obj._guid];
    };

    return DictSet;
  }();

  var StackImpl = exports.StackImpl = function () {
    function StackImpl() {
      _classCallCheck(this, StackImpl);

      this.stack = [];
      this.current = null;
    }

    StackImpl.prototype.push = function push(item) {
      this.current = item;
      this.stack.push(item);
    };

    StackImpl.prototype.pop = function pop() {
      var item = this.stack.pop();
      var len = this.stack.length;
      this.current = len === 0 ? null : this.stack[len - 1];
      return item === undefined ? null : item;
    };

    StackImpl.prototype.nth = function nth(from) {
      var len = this.stack.length;
      return len < from ? null : this.stack[len - from];
    };

    StackImpl.prototype.isEmpty = function isEmpty() {
      return this.stack.length === 0;
    };

    StackImpl.prototype.toArray = function toArray() {
      return this.stack;
    };

    _createClass(StackImpl, [{
      key: 'size',
      get: function get() {
        return this.stack.length;
      }
    }]);

    return StackImpl;
  }();
});
unwrapExports(collections);
var collections_1 = collections.StackImpl;
var collections_2 = collections.DictSet;
var collections_3 = collections.dict;
var collections_4 = collections.isDict;
var collections_5 = collections.isObject;
var destroy = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.isDestroyable = isDestroyable;
  exports.isStringDestroyable = isStringDestroyable;
  var DESTROY = exports.DESTROY = 'DESTROY [fc611582-3742-4845-88e1-971c3775e0b8]';

  function isDestroyable(value) {
    return !!(value && DESTROY in value);
  }

  function isStringDestroyable(value) {
    return !!(value && typeof value === 'object' && typeof value.destroy === 'function');
  }
});
unwrapExports(destroy);
var destroy_1 = destroy.isDestroyable;
var destroy_2 = destroy.isStringDestroyable;
var destroy_3 = destroy.DESTROY;
var dom = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.clearElement = clearElement;

  function clearElement(parent) {
    var current = parent.firstChild;

    while (current) {
      var next = current.nextSibling;
      parent.removeChild(current);
      current = next;
    }
  }
});
unwrapExports(dom);
var dom_1 = dom.clearElement;
var isSerializationFirstNode_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.isSerializationFirstNode = isSerializationFirstNode;
  var SERIALIZATION_FIRST_NODE_STRING = exports.SERIALIZATION_FIRST_NODE_STRING = '%+b:0%';

  function isSerializationFirstNode(node) {
    return node.nodeValue === SERIALIZATION_FIRST_NODE_STRING;
  }
});
unwrapExports(isSerializationFirstNode_1);
var isSerializationFirstNode_2 = isSerializationFirstNode_1.isSerializationFirstNode;
var isSerializationFirstNode_3 = isSerializationFirstNode_1.SERIALIZATION_FIRST_NODE_STRING;
var lifetimes = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.ListContentsDestructor = exports.DESTRUCTORS = exports.CHILDREN = exports.DROP = exports.LINKED = undefined;
  exports.isDrop = isDrop;
  exports.associate = associate;
  exports.associateDestructor = associateDestructor;
  exports.takeAssociated = takeAssociated;
  exports.destroyAssociated = destroyAssociated;
  exports.destructor = destructor;
  exports.snapshot = snapshot;
  exports.debugDropTree = debugDropTree;
  exports.printDropTree = printDropTree;
  exports.printDrop = printDrop;

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var LINKED = exports.LINKED = new WeakMap();
  var DROP = exports.DROP = 'DROP [94d46cf3-3974-435d-b278-3e60d1155290]';
  var CHILDREN = exports.CHILDREN = 'CHILDREN [7142e52a-8600-4e01-a773-42055b96630d]';
  var DESTRUCTORS = exports.DESTRUCTORS = new WeakMap();

  function isDrop(value) {
    if (value === null || typeof value !== 'object') return false;
    return DROP in value;
  }

  function associate(parent, child) {
    associateDestructor(parent, destructor(child));
  }

  function associateDestructor(parent, child) {
    var associated = LINKED.get(parent);

    if (!associated) {
      associated = new Set();
      LINKED.set(parent, associated);
    }

    associated.add(child);
  }

  function takeAssociated(parent) {
    var linked = LINKED.get(parent);

    if (linked && linked.size > 0) {
      LINKED.delete(parent);
      return linked;
    } else {
      return null;
    }
  }

  function destroyAssociated(parent) {
    var associated = LINKED.get(parent);

    if (associated) {
      associated.forEach(function (item) {
        item[DROP]();
        associated.delete(item);
      });
    }
  }

  function destructor(value) {
    var d = DESTRUCTORS.get(value);

    if (!d) {
      if ((0, destroy.isDestroyable)(value)) {
        d = new DestroyableDestructor(value);
      } else if ((0, destroy.isStringDestroyable)(value)) {
        d = new StringDestroyableDestructor(value);
      } else {
        d = new SimpleDestructor(value);
      }

      DESTRUCTORS.set(value, d);
    }

    return d;
  }

  function snapshot(values) {
    return new SnapshotDestructor(values);
  }

  var SnapshotDestructor = function () {
    function SnapshotDestructor(destructors) {
      _classCallCheck(this, SnapshotDestructor);

      this.destructors = destructors;
    }

    SnapshotDestructor.prototype[DROP] = function () {
      this.destructors.forEach(function (item) {
        return item[DROP]();
      });
    };

    SnapshotDestructor.prototype.toString = function toString() {
      return 'SnapshotDestructor';
    };

    _createClass(SnapshotDestructor, [{
      key: CHILDREN,
      get: function get() {
        return this.destructors;
      }
    }]);

    return SnapshotDestructor;
  }();

  var DestroyableDestructor = function () {
    function DestroyableDestructor(inner) {
      _classCallCheck(this, DestroyableDestructor);

      this.inner = inner;
    }

    DestroyableDestructor.prototype[DROP] = function () {
      this.inner[destroy.DESTROY]();
      destroyAssociated(this.inner);
    };

    DestroyableDestructor.prototype.toString = function toString() {
      return 'DestroyableDestructor';
    };

    _createClass(DestroyableDestructor, [{
      key: CHILDREN,
      get: function get() {
        return LINKED.get(this.inner) || [];
      }
    }]);

    return DestroyableDestructor;
  }();

  var StringDestroyableDestructor = function () {
    function StringDestroyableDestructor(inner) {
      _classCallCheck(this, StringDestroyableDestructor);

      this.inner = inner;
    }

    StringDestroyableDestructor.prototype[DROP] = function () {
      this.inner.destroy();
      destroyAssociated(this.inner);
    };

    StringDestroyableDestructor.prototype.toString = function toString() {
      return 'StringDestroyableDestructor';
    };

    _createClass(StringDestroyableDestructor, [{
      key: CHILDREN,
      get: function get() {
        return LINKED.get(this.inner) || [];
      }
    }]);

    return StringDestroyableDestructor;
  }();

  var SimpleDestructor = function () {
    function SimpleDestructor(inner) {
      _classCallCheck(this, SimpleDestructor);

      this.inner = inner;
    }

    SimpleDestructor.prototype[DROP] = function () {
      destroyAssociated(this.inner);
    };

    SimpleDestructor.prototype.toString = function toString() {
      return 'SimpleDestructor';
    };

    _createClass(SimpleDestructor, [{
      key: CHILDREN,
      get: function get() {
        return LINKED.get(this.inner) || [];
      }
    }]);

    return SimpleDestructor;
  }();

  var ListContentsDestructor = exports.ListContentsDestructor = function () {
    function ListContentsDestructor(inner) {
      _classCallCheck(this, ListContentsDestructor);

      this.inner = inner;
    }

    ListContentsDestructor.prototype[DROP] = function () {
      this.inner.forEachNode(function (d) {
        return destructor(d)[DROP]();
      });
    };

    ListContentsDestructor.prototype.toString = function toString() {
      return 'ListContentsDestructor';
    };

    _createClass(ListContentsDestructor, [{
      key: CHILDREN,
      get: function get() {
        var out = [];
        this.inner.forEachNode(function (d) {
          return out.push.apply(out, destructor(d)[CHILDREN]);
        });
        return out;
      }
    }]);

    return ListContentsDestructor;
  }();

  function debugDropTree(inner) {
    var hasDrop = isDrop(inner);
    var rawChildren = LINKED.get(inner) || null;
    var children = null;

    if (rawChildren) {
      children = [];

      for (var _iterator = rawChildren, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
          if (_i >= _iterator.length) break;
          _ref = _iterator[_i++];
        } else {
          _i = _iterator.next();
          if (_i.done) break;
          _ref = _i.value;
        }

        var child = _ref;
        children.push(debugDropTree(child));
      }
    }

    var obj = Object.create(null);
    obj.inner = inner;

    if (children) {
      obj.children = children;
    }

    obj.hasDrop = hasDrop;
    return obj;
  }

  function printDropTree(inner) {
    printDrop(destructor(inner));
  }

  function printDrop(inner) {
    console.group(String(inner));
    console.log(inner);
    var children = inner[CHILDREN] || null;

    if (children) {
      for (var _iterator2 = children, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
        var _ref2;

        if (_isArray2) {
          if (_i2 >= _iterator2.length) break;
          _ref2 = _iterator2[_i2++];
        } else {
          _i2 = _iterator2.next();
          if (_i2.done) break;
          _ref2 = _i2.value;
        }

        var child = _ref2;
        printDrop(child);
      }
    }

    console.groupEnd();
  }
});
unwrapExports(lifetimes);
var lifetimes_1 = lifetimes.ListContentsDestructor;
var lifetimes_2 = lifetimes.DESTRUCTORS;
var lifetimes_3 = lifetimes.CHILDREN;
var lifetimes_4 = lifetimes.DROP;
var lifetimes_5 = lifetimes.LINKED;
var lifetimes_6 = lifetimes.isDrop;
var lifetimes_7 = lifetimes.associate;
var lifetimes_8 = lifetimes.associateDestructor;
var lifetimes_9 = lifetimes.takeAssociated;
var lifetimes_10 = lifetimes.destroyAssociated;
var lifetimes_11 = lifetimes.destructor;
var lifetimes_12 = lifetimes.snapshot;
var lifetimes_13 = lifetimes.debugDropTree;
var lifetimes_14 = lifetimes.printDropTree;
var lifetimes_15 = lifetimes.printDrop;
var listUtils = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.EMPTY_SLICE = exports.ListSlice = exports.LinkedList = exports.ListNode = undefined;

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var ListNode = exports.ListNode = function ListNode(value) {
    _classCallCheck(this, ListNode);

    this.next = null;
    this.prev = null;
    this.value = value;
  };

  var LinkedList = exports.LinkedList = function () {
    function LinkedList() {
      _classCallCheck(this, LinkedList);

      this.clear();
    }

    LinkedList.prototype.head = function head() {
      return this._head;
    };

    LinkedList.prototype.tail = function tail() {
      return this._tail;
    };

    LinkedList.prototype.clear = function clear() {
      this._head = this._tail = null;
    };

    LinkedList.prototype.toArray = function toArray() {
      var out = [];
      this.forEachNode(function (n) {
        return out.push(n);
      });
      return out;
    };

    LinkedList.prototype.nextNode = function nextNode(node) {
      return node.next;
    };

    LinkedList.prototype.forEachNode = function forEachNode(callback) {
      var node = this._head;

      while (node !== null) {
        callback(node);
        node = node.next;
      }
    };

    LinkedList.prototype.insertBefore = function insertBefore(node) {
      var reference = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      if (reference === null) return this.append(node);
      if (reference.prev) reference.prev.next = node;else this._head = node;
      node.prev = reference.prev;
      node.next = reference;
      reference.prev = node;
      return node;
    };

    LinkedList.prototype.append = function append(node) {
      var tail = this._tail;

      if (tail) {
        tail.next = node;
        node.prev = tail;
        node.next = null;
      } else {
        this._head = node;
      }

      return this._tail = node;
    };

    LinkedList.prototype.remove = function remove(node) {
      if (node.prev) node.prev.next = node.next;else this._head = node.next;
      if (node.next) node.next.prev = node.prev;else this._tail = node.prev;
      return node;
    };

    LinkedList.prototype[lifetimes.DROP] = function () {
      this.forEachNode(function (d) {
        return (0, lifetimes.destructor)(d)[lifetimes.DROP]();
      });
    };

    _createClass(LinkedList, [{
      key: lifetimes.CHILDREN,
      get: function get() {
        var out = [];
        this.forEachNode(function (d) {
          return out.push.apply(out, (0, lifetimes.destructor)(d)[lifetimes.CHILDREN]);
        });
        return out;
      }
    }]);

    return LinkedList;
  }();

  var ListSlice = exports.ListSlice = function () {
    function ListSlice(head, tail) {
      _classCallCheck(this, ListSlice);

      this._head = head;
      this._tail = tail;
    }

    ListSlice.prototype.forEachNode = function forEachNode(callback) {
      var node = this._head;

      while (node !== null) {
        callback(node);
        node = this.nextNode(node);
      }
    };

    ListSlice.prototype.head = function head() {
      return this._head;
    };

    ListSlice.prototype.tail = function tail() {
      return this._tail;
    };

    ListSlice.prototype.toArray = function toArray() {
      var out = [];
      this.forEachNode(function (n) {
        return out.push(n);
      });
      return out;
    };

    ListSlice.prototype.nextNode = function nextNode(node) {
      if (node === this._tail) return null;
      return node.next;
    };

    return ListSlice;
  }();

  var EMPTY_SLICE = exports.EMPTY_SLICE = new ListSlice(null, null);
});
unwrapExports(listUtils);
var listUtils_1 = listUtils.EMPTY_SLICE;
var listUtils_2 = listUtils.ListSlice;
var listUtils_3 = listUtils.LinkedList;
var listUtils_4 = listUtils.ListNode;
var objectUtils = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.assign = assign;
  exports.fillNulls = fillNulls;
  exports.values = values;
  var objKeys = Object.keys;

  function assign(obj) {
    for (var i = 1; i < arguments.length; i++) {
      var assignment = arguments[i];
      if (assignment === null || typeof assignment !== 'object') continue;
      var keys = objKeys(assignment);

      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        obj[key] = assignment[key];
      }
    }

    return obj;
  }

  function fillNulls(count) {
    var arr = new Array(count);

    for (var i = 0; i < count; i++) {
      arr[i] = null;
    }

    return arr;
  }

  function values(obj) {
    var vals = [];

    for (var key in obj) {
      vals.push(obj[key]);
    }

    return vals;
  }
});
unwrapExports(objectUtils);
var objectUtils_1 = objectUtils.assign;
var objectUtils_2 = objectUtils.fillNulls;
var objectUtils_3 = objectUtils.values;
var platformUtils = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.keys = keys;
  exports.unwrap = unwrap;
  exports.expect = expect;
  exports.unreachable = unreachable;
  exports.exhausted = exhausted;

  function keys(obj) {
    return Object.keys(obj);
  }

  function unwrap(val) {
    if (val === null || val === undefined) throw new Error('Expected value to be present');
    return val;
  }

  function expect(val, message) {
    if (val === null || val === undefined) throw new Error(message);
    return val;
  }

  function unreachable() {
    var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'unreachable';
    return new Error(message);
  }

  function exhausted(value) {
    throw new Error('Exhausted ' + value);
  }

  var tuple = exports.tuple = function tuple() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return args;
  };
});
unwrapExports(platformUtils);
var platformUtils_1 = platformUtils.keys;
var platformUtils_2 = platformUtils.unwrap;
var platformUtils_3 = platformUtils.expect;
var platformUtils_4 = platformUtils.unreachable;
var platformUtils_5 = platformUtils.exhausted;
var platformUtils_6 = platformUtils.tuple;
var string = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.strip = strip;

  function strip(strings) {
    var out = '';

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    for (var i = 0; i < strings.length; i++) {
      var string = strings[i];
      var dynamic = args[i] !== undefined ? String(args[i]) : '';
      out += '' + string + dynamic;
    }

    var lines = out.split('\n');

    while (lines.length && lines[0].match(/^\s*$/)) {
      lines.shift();
    }

    while (lines.length && lines[lines.length - 1].match(/^\s*$/)) {
      lines.pop();
    }

    var min = Infinity;

    for (var _iterator = lines, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      var line = _ref;
      var leading = line.match(/^\s*/)[0].length;
      min = Math.min(min, leading);
    }

    var stripped = [];

    for (var _iterator2 = lines, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
      var _ref2;

      if (_isArray2) {
        if (_i2 >= _iterator2.length) break;
        _ref2 = _iterator2[_i2++];
      } else {
        _i2 = _iterator2.next();
        if (_i2.done) break;
        _ref2 = _i2.value;
      }

      var _line = _ref2;
      stripped.push(_line.slice(min));
    }

    return stripped.join('\n');
  }
});
unwrapExports(string);
var string_1 = string.strip;
var es5$1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'EMPTY_ARRAY', {
    enumerable: true,
    get: function () {
      return arrayUtils.EMPTY_ARRAY;
    }
  });
  Object.defineProperty(exports, 'assert', {
    enumerable: true,
    get: function () {
      return _interopRequireDefault(assert).default;
    }
  });
  Object.defineProperty(exports, 'deprecate', {
    enumerable: true,
    get: function () {
      return assert.deprecate;
    }
  });
  Object.defineProperty(exports, 'dict', {
    enumerable: true,
    get: function () {
      return collections.dict;
    }
  });
  Object.defineProperty(exports, 'DictSet', {
    enumerable: true,
    get: function () {
      return collections.DictSet;
    }
  });
  Object.defineProperty(exports, 'isDict', {
    enumerable: true,
    get: function () {
      return collections.isDict;
    }
  });
  Object.defineProperty(exports, 'isObject', {
    enumerable: true,
    get: function () {
      return collections.isObject;
    }
  });
  Object.defineProperty(exports, 'Stack', {
    enumerable: true,
    get: function () {
      return collections.StackImpl;
    }
  });
  Object.keys(destroy).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return destroy[key];
      }
    });
  });
  Object.keys(dom).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return dom[key];
      }
    });
  });
  Object.defineProperty(exports, 'ensureGuid', {
    enumerable: true,
    get: function () {
      return guid.ensureGuid;
    }
  });
  Object.defineProperty(exports, 'initializeGuid', {
    enumerable: true,
    get: function () {
      return guid.initializeGuid;
    }
  });
  Object.defineProperty(exports, 'isSerializationFirstNode', {
    enumerable: true,
    get: function () {
      return isSerializationFirstNode_1.isSerializationFirstNode;
    }
  });
  Object.defineProperty(exports, 'SERIALIZATION_FIRST_NODE_STRING', {
    enumerable: true,
    get: function () {
      return isSerializationFirstNode_1.SERIALIZATION_FIRST_NODE_STRING;
    }
  });
  Object.keys(lifetimes).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return lifetimes[key];
      }
    });
  });
  Object.defineProperty(exports, 'EMPTY_SLICE', {
    enumerable: true,
    get: function () {
      return listUtils.EMPTY_SLICE;
    }
  });
  Object.defineProperty(exports, 'LinkedList', {
    enumerable: true,
    get: function () {
      return listUtils.LinkedList;
    }
  });
  Object.defineProperty(exports, 'ListNode', {
    enumerable: true,
    get: function () {
      return listUtils.ListNode;
    }
  });
  Object.defineProperty(exports, 'ListSlice', {
    enumerable: true,
    get: function () {
      return listUtils.ListSlice;
    }
  });
  Object.defineProperty(exports, 'assign', {
    enumerable: true,
    get: function () {
      return objectUtils.assign;
    }
  });
  Object.defineProperty(exports, 'fillNulls', {
    enumerable: true,
    get: function () {
      return objectUtils.fillNulls;
    }
  });
  Object.defineProperty(exports, 'values', {
    enumerable: true,
    get: function () {
      return objectUtils.values;
    }
  });
  Object.keys(platformUtils).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return platformUtils[key];
      }
    });
  });
  Object.keys(string).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return string[key];
      }
    });
  });
  exports.assertNever = assertNever;

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function assertNever(value) {
    var desc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'unexpected unreachable branch';
    console.log('unreachable', value);
    console.trace(desc + ' :: ' + JSON.stringify(value) + ' (' + value + ')');
  }
});
unwrapExports(es5$1);
var es5_1$1 = es5$1.assertNever;
var captureRenderTree_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = captureRenderTree;
  /**
    @module @ember/debug
  */

  /**
    Ember Inspector calls this function to capture the current render tree.
  
    In production mode, this requires turning on `ENV._DEBUG_RENDER_TREE`
    before loading Ember.
  
    @private
    @static
    @method captureRenderTree
    @for @ember/debug
    @param app {ApplicationInstance} An `ApplicationInstance`.
    @since 3.14.0
  */

  function captureRenderTree(app) {
    let env = (0, es5$1.expect)(app.lookup('-environment:main'), 'BUG: owner is missing -environment:main');
    let rendererType = env.isInteractive ? 'renderer:-dom' : 'renderer:-inert';
    let renderer = (0, es5$1.expect)(app.lookup(rendererType), `BUG: owner is missing ${rendererType}`);
    return renderer.debugRenderTree.capture();
  }
});
unwrapExports(captureRenderTree_1);
var debug_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, "registerDeprecationHandler", {
    enumerable: true,
    get: function () {
      return _deprecate2.registerHandler;
    }
  });
  Object.defineProperty(exports, "isTesting", {
    enumerable: true,
    get: function () {
      return testing_1.isTesting;
    }
  });
  Object.defineProperty(exports, "setTesting", {
    enumerable: true,
    get: function () {
      return testing_1.setTesting;
    }
  });
  Object.defineProperty(exports, "registerWarnHandler", {
    enumerable: true,
    get: function () {
      return _warn2.registerHandler;
    }
  });
  Object.defineProperty(exports, "captureRenderTree", {
    enumerable: true,
    get: function () {
      return _captureRenderTree.default;
    }
  });
  exports._warnIfUsingStrippedFeatureFlags = exports.getDebugFunction = exports.setDebugFunction = exports.deprecateFunc = exports.runInDebug = exports.debugFreeze = exports.debugSeal = exports.deprecate = exports.debug = exports.warn = exports.info = exports.assert = void 0;

  var _error = _interopRequireDefault(error);

  var _deprecate2 = _interopRequireWildcard(deprecate_1);

  var _warn2 = _interopRequireWildcard(warn_1);

  var _captureRenderTree = _interopRequireDefault(captureRenderTree_1);

  function _getRequireWildcardCache() {
    if (typeof WeakMap !== "function") return null;
    var cache = new WeakMap();

    _getRequireWildcardCache = function () {
      return cache;
    };

    return cache;
  }

  function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
      return obj;
    }

    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
      return {
        default: obj
      };
    }

    var cache = _getRequireWildcardCache();

    if (cache && cache.has(obj)) {
      return cache.get(obj);
    }

    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;

    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;

        if (desc && (desc.get || desc.set)) {
          Object.defineProperty(newObj, key, desc);
        } else {
          newObj[key] = obj[key];
        }
      }
    }

    newObj.default = obj;

    if (cache) {
      cache.set(obj, newObj);
    }

    return newObj;
  }

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  } // These are the default production build versions:


  const noop = () => {};

  let assert = noop;
  exports.assert = assert;
  let info = noop;
  exports.info = info;
  let warn = noop;
  exports.warn = warn;
  let debug = noop;
  exports.debug = debug;
  let deprecate = noop;
  exports.deprecate = deprecate;
  let debugSeal = noop;
  exports.debugSeal = debugSeal;
  let debugFreeze = noop;
  exports.debugFreeze = debugFreeze;
  let runInDebug = noop;
  exports.runInDebug = runInDebug;
  let setDebugFunction = noop;
  exports.setDebugFunction = setDebugFunction;
  let getDebugFunction = noop;
  exports.getDebugFunction = getDebugFunction;

  let deprecateFunc = function () {
    return arguments[arguments.length - 1];
  };

  exports.deprecateFunc = deprecateFunc;

  if (es5.DEBUG) {
    exports.setDebugFunction = setDebugFunction = function (type, callback) {
      switch (type) {
        case 'assert':
          return exports.assert = assert = callback;

        case 'info':
          return exports.info = info = callback;

        case 'warn':
          return exports.warn = warn = callback;

        case 'debug':
          return exports.debug = debug = callback;

        case 'deprecate':
          return exports.deprecate = deprecate = callback;

        case 'debugSeal':
          return exports.debugSeal = debugSeal = callback;

        case 'debugFreeze':
          return exports.debugFreeze = debugFreeze = callback;

        case 'runInDebug':
          return exports.runInDebug = runInDebug = callback;

        case 'deprecateFunc':
          return exports.deprecateFunc = deprecateFunc = callback;
      }
    };

    exports.getDebugFunction = getDebugFunction = function (type) {
      switch (type) {
        case 'assert':
          return assert;

        case 'info':
          return info;

        case 'warn':
          return warn;

        case 'debug':
          return debug;

        case 'deprecate':
          return deprecate;

        case 'debugSeal':
          return debugSeal;

        case 'debugFreeze':
          return debugFreeze;

        case 'runInDebug':
          return runInDebug;

        case 'deprecateFunc':
          return deprecateFunc;
      }
    };
  }
  /**
  @module @ember/debug
  */


  if (es5.DEBUG) {
    /**
      Verify that a certain expectation is met, or throw a exception otherwise.
         This is useful for communicating assumptions in the code to other human
      readers as well as catching bugs that accidentally violates these
      expectations.
         Assertions are removed from production builds, so they can be freely added
      for documentation and debugging purposes without worries of incuring any
      performance penalty. However, because of that, they should not be used for
      checks that could reasonably fail during normal usage. Furthermore, care
      should be taken to avoid accidentally relying on side-effects produced from
      evaluating the condition itself, since the code will not run in production.
         ```javascript
      import { assert } from '@ember/debug';
         // Test for truthiness
      assert('Must pass a string', typeof str === 'string');
         // Fail unconditionally
      assert('This code path should never be run');
      ```
         @method assert
      @static
      @for @ember/debug
      @param {String} description Describes the expectation. This will become the
        text of the Error thrown if the assertion fails.
      @param {any} condition Must be truthy for the assertion to pass. If
        falsy, an exception will be thrown.
      @public
      @since 1.0.0
    */
    setDebugFunction('assert', function assert(desc, test) {
      if (!test) {
        throw new _error.default(`Assertion Failed: ${desc}`);
      }
    });
    /**
      Display a debug notice.
         Calls to this function are removed from production builds, so they can be
      freely added for documentation and debugging purposes without worries of
      incuring any performance penalty.
         ```javascript
      import { debug } from '@ember/debug';
         debug('I\'m a debug notice!');
      ```
         @method debug
      @for @ember/debug
      @static
      @param {String} message A debug message to display.
      @public
    */

    setDebugFunction('debug', function debug(message) {
      /* eslint-disable no-console */
      if (console.debug) {
        console.debug(`DEBUG: ${message}`);
      } else {
        console.log(`DEBUG: ${message}`);
      }
      /* eslint-ensable no-console */

    });
    /**
      Display an info notice.
         Calls to this function are removed from production builds, so they can be
      freely added for documentation and debugging purposes without worries of
      incuring any performance penalty.
         @method info
      @private
    */

    setDebugFunction('info', function info() {
      console.info(...arguments);
      /* eslint-disable-line no-console */
    });
    /**
     @module @ember/debug
     @public
    */

    /**
      Alias an old, deprecated method with its new counterpart.
         Display a deprecation warning with the provided message and a stack trace
      (Chrome and Firefox only) when the assigned method is called.
         Calls to this function are removed from production builds, so they can be
      freely added for documentation and debugging purposes without worries of
      incuring any performance penalty.
         ```javascript
      import { deprecateFunc } from '@ember/debug';
         Ember.oldMethod = deprecateFunc('Please use the new, updated method', options, Ember.newMethod);
      ```
         @method deprecateFunc
      @static
      @for @ember/debug
      @param {String} message A description of the deprecation.
      @param {Object} [options] The options object for `deprecate`.
      @param {Function} func The new function called to replace its deprecated counterpart.
      @return {Function} A new function that wraps the original function with a deprecation warning
      @private
    */

    setDebugFunction('deprecateFunc', function deprecateFunc(...args) {
      if (args.length === 3) {
        let [message, options, func] = args;
        return function (...args) {
          deprecate(message, false, options);
          return func.apply(this, args);
        };
      } else {
        let [message, func] = args;
        return function () {
          deprecate(message);
          return func.apply(this, arguments);
        };
      }
    });
    /**
     @module @ember/debug
     @public
    */

    /**
      Run a function meant for debugging.
         Calls to this function are removed from production builds, so they can be
      freely added for documentation and debugging purposes without worries of
      incuring any performance penalty.
         ```javascript
      import Component from '@ember/component';
      import { runInDebug } from '@ember/debug';
         runInDebug(() => {
        Component.reopen({
          didInsertElement() {
            console.log("I'm happy");
          }
        });
      });
      ```
         @method runInDebug
      @for @ember/debug
      @static
      @param {Function} func The function to be executed.
      @since 1.5.0
      @public
    */

    setDebugFunction('runInDebug', function runInDebug(func) {
      func();
    });
    setDebugFunction('debugSeal', function debugSeal(obj) {
      Object.seal(obj);
    });
    setDebugFunction('debugFreeze', function debugFreeze(obj) {
      // re-freezing an already frozen object introduces a significant
      // performance penalty on Chrome (tested through 59).
      //
      // See: https://bugs.chromium.org/p/v8/issues/detail?id=6450
      if (!Object.isFrozen(obj)) {
        Object.freeze(obj);
      }
    });
    setDebugFunction('deprecate', _deprecate2.default);
    setDebugFunction('warn', _warn2.default);
  }

  let _warnIfUsingStrippedFeatureFlags;

  exports._warnIfUsingStrippedFeatureFlags = _warnIfUsingStrippedFeatureFlags;

  if (es5.DEBUG && !(0, testing_1.isTesting)()) {
    if (typeof window !== 'undefined' && (browserEnvironment.isFirefox || browserEnvironment.isChrome) && window.addEventListener) {
      window.addEventListener('load', () => {
        if (document.documentElement && document.documentElement.dataset && !document.documentElement.dataset.emberExtension) {
          let downloadURL;

          if (browserEnvironment.isChrome) {
            downloadURL = 'https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi';
          } else if (browserEnvironment.isFirefox) {
            downloadURL = 'https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/';
          }

          debug(`For more advanced debugging, install the Ember Inspector from ${downloadURL}`);
        }
      }, false);
    }
  }
});
unwrapExports(debug_1);
var debug_2 = debug_1._warnIfUsingStrippedFeatureFlags;
var debug_3 = debug_1.getDebugFunction;
var debug_4 = debug_1.setDebugFunction;
var debug_5 = debug_1.deprecateFunc;
var debug_6 = debug_1.runInDebug;
var debug_7 = debug_1.debugFreeze;
var debug_8 = debug_1.debugSeal;
var debug_9 = debug_1.deprecate;
var debug_10 = debug_1.debug;
var debug_11 = debug_1.warn;
var debug_12 = debug_1.info;
var debug_13 = debug_1.assert;
var deprecatedFeatures = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.GLOBALS_RESOLVER = exports.PARTIALS = exports.EMBER_COMPONENT_IS_VISIBLE = exports.MOUSE_ENTER_LEAVE_MOVE_EVENTS = exports.FUNCTION_PROTOTYPE_EXTENSIONS = exports.APP_CTRL_ROUTER_PROPS = exports.ALIAS_METHOD = exports.JQUERY_INTEGRATION = exports.COMPONENT_MANAGER_STRING_LOOKUP = exports.ROUTER_EVENTS = exports.MERGE = exports.LOGGER = exports.EMBER_EXTEND_PROTOTYPES = exports.SEND_ACTION = void 0;
  /* eslint-disable no-implicit-coercion */
  // These versions should be the version that the deprecation was _introduced_,
  // not the version that the feature will be removed.

  const SEND_ACTION = !!'3.4.0';
  exports.SEND_ACTION = SEND_ACTION;
  const EMBER_EXTEND_PROTOTYPES = !!'3.2.0-beta.5';
  exports.EMBER_EXTEND_PROTOTYPES = EMBER_EXTEND_PROTOTYPES;
  const LOGGER = !!'3.2.0-beta.1';
  exports.LOGGER = LOGGER;
  const MERGE = !!'3.6.0-beta.1';
  exports.MERGE = MERGE;
  const ROUTER_EVENTS = !!'4.0.0';
  exports.ROUTER_EVENTS = ROUTER_EVENTS;
  const COMPONENT_MANAGER_STRING_LOOKUP = !!'3.8.0';
  exports.COMPONENT_MANAGER_STRING_LOOKUP = COMPONENT_MANAGER_STRING_LOOKUP;
  const JQUERY_INTEGRATION = !!'3.9.0';
  exports.JQUERY_INTEGRATION = JQUERY_INTEGRATION;
  const ALIAS_METHOD = !!'3.9.0';
  exports.ALIAS_METHOD = ALIAS_METHOD;
  const APP_CTRL_ROUTER_PROPS = !!'3.10.0-beta.1';
  exports.APP_CTRL_ROUTER_PROPS = APP_CTRL_ROUTER_PROPS;
  const FUNCTION_PROTOTYPE_EXTENSIONS = !!'3.11.0-beta.1';
  exports.FUNCTION_PROTOTYPE_EXTENSIONS = FUNCTION_PROTOTYPE_EXTENSIONS;
  const MOUSE_ENTER_LEAVE_MOVE_EVENTS = !!'3.13.0-beta.1';
  exports.MOUSE_ENTER_LEAVE_MOVE_EVENTS = MOUSE_ENTER_LEAVE_MOVE_EVENTS;
  const EMBER_COMPONENT_IS_VISIBLE = !!'3.15.0-beta.1';
  exports.EMBER_COMPONENT_IS_VISIBLE = EMBER_COMPONENT_IS_VISIBLE;
  const PARTIALS = !!'3.15.0-beta.1';
  exports.PARTIALS = PARTIALS;
  const GLOBALS_RESOLVER = !!'3.16.0-beta.1';
  exports.GLOBALS_RESOLVER = GLOBALS_RESOLVER;
});
unwrapExports(deprecatedFeatures);
var deprecatedFeatures_1 = deprecatedFeatures.GLOBALS_RESOLVER;
var deprecatedFeatures_2 = deprecatedFeatures.PARTIALS;
var deprecatedFeatures_3 = deprecatedFeatures.EMBER_COMPONENT_IS_VISIBLE;
var deprecatedFeatures_4 = deprecatedFeatures.MOUSE_ENTER_LEAVE_MOVE_EVENTS;
var deprecatedFeatures_5 = deprecatedFeatures.FUNCTION_PROTOTYPE_EXTENSIONS;
var deprecatedFeatures_6 = deprecatedFeatures.APP_CTRL_ROUTER_PROPS;
var deprecatedFeatures_7 = deprecatedFeatures.ALIAS_METHOD;
var deprecatedFeatures_8 = deprecatedFeatures.JQUERY_INTEGRATION;
var deprecatedFeatures_9 = deprecatedFeatures.COMPONENT_MANAGER_STRING_LOOKUP;
var deprecatedFeatures_10 = deprecatedFeatures.ROUTER_EVENTS;
var deprecatedFeatures_11 = deprecatedFeatures.MERGE;
var deprecatedFeatures_12 = deprecatedFeatures.LOGGER;
var deprecatedFeatures_13 = deprecatedFeatures.EMBER_EXTEND_PROTOTYPES;
var deprecatedFeatures_14 = deprecatedFeatures.SEND_ACTION;
var environment = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.getLookup = getLookup;
  exports.setLookup = setLookup;
  exports.getENV = getENV;
  exports.ENV = exports.context = exports.global = void 0; // from lodash to catch fake globals

  function checkGlobal(value) {
    return value && value.Object === Object ? value : undefined;
  } // element ids can ruin global miss checks


  function checkElementIdShadowing(value) {
    return value && value.nodeType === undefined ? value : undefined;
  } // export real global


  var global$1 = checkGlobal(checkElementIdShadowing(typeof commonjsGlobal === 'object' && commonjsGlobal)) || checkGlobal(typeof self === 'object' && self) || checkGlobal(typeof window === 'object' && window) || typeof mainContext !== 'undefined' && mainContext || // set before strict mode in Ember loader/wrapper
  new Function('return this')(); // eval outside of strict mode

  exports.global = global$1;

  const context = function (global, Ember) {
    return Ember === undefined ? {
      imports: global,
      exports: global,
      lookup: global
    } : {
      // import jQuery
      imports: Ember.imports || global,
      // export Ember
      exports: Ember.exports || global,
      // search for Namespaces
      lookup: Ember.lookup || global
    };
  }(global$1, global$1.Ember);

  exports.context = context;

  function getLookup() {
    return context.lookup;
  }

  function setLookup(value) {
    context.lookup = value;
  }
  /**
    The hash of environment variables used to control various configuration
    settings. To specify your own or override default settings, add the
    desired properties to a global hash named `EmberENV` (or `ENV` for
    backwards compatibility with earlier versions of Ember). The `EmberENV`
    hash must be created before loading Ember.
  
    @class EmberENV
    @type Object
    @public
  */


  const ENV = {
    ENABLE_OPTIONAL_FEATURES: false,

    /**
      Determines whether Ember should add to `Array`, `Function`, and `String`
      native object prototypes, a few extra methods in order to provide a more
      friendly API.
         We generally recommend leaving this option set to true however, if you need
      to turn it off, you can add the configuration property
      `EXTEND_PROTOTYPES` to `EmberENV` and set it to `false`.
         Note, when disabled (the default configuration for Ember Addons), you will
      instead have to access all methods and functions from the Ember
      namespace.
         @property EXTEND_PROTOTYPES
      @type Boolean
      @default true
      @for EmberENV
      @public
    */
    EXTEND_PROTOTYPES: {
      Array: true,
      Function: true,
      String: true
    },

    /**
      The `LOG_STACKTRACE_ON_DEPRECATION` property, when true, tells Ember to log
      a full stack trace during deprecation warnings.
         @property LOG_STACKTRACE_ON_DEPRECATION
      @type Boolean
      @default true
      @for EmberENV
      @public
    */
    LOG_STACKTRACE_ON_DEPRECATION: true,

    /**
      The `LOG_VERSION` property, when true, tells Ember to log versions of all
      dependent libraries in use.
         @property LOG_VERSION
      @type Boolean
      @default true
      @for EmberENV
      @public
    */
    LOG_VERSION: true,
    RAISE_ON_DEPRECATION: false,
    STRUCTURED_PROFILE: false,

    /**
      Whether to insert a `<div class="ember-view" />` wrapper around the
      application template. See RFC #280.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _APPLICATION_TEMPLATE_WRAPPER
      @for EmberENV
      @type Boolean
      @default true
      @private
    */
    _APPLICATION_TEMPLATE_WRAPPER: true,

    /**
      Whether to use Glimmer Component semantics (as opposed to the classic "Curly"
      components semantics) for template-only components. See RFC #278.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _TEMPLATE_ONLY_GLIMMER_COMPONENTS
      @for EmberENV
      @type Boolean
      @default false
      @private
    */
    _TEMPLATE_ONLY_GLIMMER_COMPONENTS: false,

    /**
      Whether to perform extra bookkeeping needed to make the `captureRenderTree`
      API work.
         This has to be set before the ember JavaScript code is evaluated. This is
      usually done by setting `window.EmberENV = { _DEBUG_RENDER_TREE: true };`
      or `window.ENV = { _DEBUG_RENDER_TREE: true };` before the "vendor"
      `<script>` tag in `index.html`.
         Setting the flag after Ember is already loaded will not work correctly. It
      may appear to work somewhat, but fundamentally broken.
         This is not intended to be set directly. Ember Inspector will enable the
      flag on behalf of the user as needed.
         This flag is always on in development mode.
         The flag is off by default in production mode, due to the cost associated
      with the the bookkeeping work.
         The expected flow is that Ember Inspector will ask the user to refresh the
      page after enabling the feature. It could also offer a feature where the
      user add some domains to the "always on" list. In either case, Ember
      Inspector will inject the code on the page to set the flag if needed.
         @property _DEBUG_RENDER_TREE
      @for EmberENV
      @type Boolean
      @default false
      @private
    */
    _DEBUG_RENDER_TREE: es5.DEBUG,

    /**
      Whether the app is using jQuery. See RFC #294.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _JQUERY_INTEGRATION
      @for EmberENV
      @type Boolean
      @default true
      @private
    */
    _JQUERY_INTEGRATION: true,

    /**
      Whether the app defaults to using async observers.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _DEFAULT_ASYNC_OBSERVERS
      @for EmberENV
      @type Boolean
      @default false
      @private
    */
    _DEFAULT_ASYNC_OBSERVERS: false,

    /**
      Controls the maximum number of scheduled rerenders without "settling". In general,
      applications should not need to modify this environment variable, but please
      open an issue so that we can determine if a better default value is needed.
         @property _RERENDER_LOOP_LIMIT
      @for EmberENV
      @type number
      @default 1000
      @private
     */
    _RERENDER_LOOP_LIMIT: 1000,
    EMBER_LOAD_HOOKS: {},
    FEATURES: {}
  };
  exports.ENV = ENV;
  let providedEnv = global$1.EmberENV;

  if (providedEnv === undefined) {
    providedEnv = global$1.ENV;
    (0, debug_1.deprecate)("Configuring Ember's boot options via `window.ENV` is deprecated, please migrate to `window.EmberENV` instead.", providedEnv === undefined, {
      id: 'ember-environment.window.env',
      until: '3.17.0'
    });
  }

  (EmberENV => {
    if (typeof EmberENV !== 'object' || EmberENV === null) return;

    for (let flag in EmberENV) {
      if (!EmberENV.hasOwnProperty(flag) || flag === 'EXTEND_PROTOTYPES' || flag === 'EMBER_LOAD_HOOKS') continue;
      let defaultValue = ENV[flag];

      if (defaultValue === true) {
        ENV[flag] = EmberENV[flag] !== false;
      } else if (defaultValue === false) {
        ENV[flag] = EmberENV[flag] === true;
      }
    }

    let {
      EXTEND_PROTOTYPES
    } = EmberENV;

    if (EXTEND_PROTOTYPES !== undefined) {
      if (typeof EXTEND_PROTOTYPES === 'object' && EXTEND_PROTOTYPES !== null) {
        ENV.EXTEND_PROTOTYPES.String = EXTEND_PROTOTYPES.String !== false;

        if (deprecatedFeatures.FUNCTION_PROTOTYPE_EXTENSIONS) {
          ENV.EXTEND_PROTOTYPES.Function = EXTEND_PROTOTYPES.Function !== false;
        }

        ENV.EXTEND_PROTOTYPES.Array = EXTEND_PROTOTYPES.Array !== false;
      } else {
        let isEnabled = EXTEND_PROTOTYPES !== false;
        ENV.EXTEND_PROTOTYPES.String = isEnabled;

        if (deprecatedFeatures.FUNCTION_PROTOTYPE_EXTENSIONS) {
          ENV.EXTEND_PROTOTYPES.Function = isEnabled;
        }

        ENV.EXTEND_PROTOTYPES.Array = isEnabled;
      }
    } // TODO this does not seem to be used by anything,
    //      can we remove it? do we need to deprecate it?


    let {
      EMBER_LOAD_HOOKS
    } = EmberENV;

    if (typeof EMBER_LOAD_HOOKS === 'object' && EMBER_LOAD_HOOKS !== null) {
      for (let hookName in EMBER_LOAD_HOOKS) {
        if (!EMBER_LOAD_HOOKS.hasOwnProperty(hookName)) continue;
        let hooks = EMBER_LOAD_HOOKS[hookName];

        if (Array.isArray(hooks)) {
          ENV.EMBER_LOAD_HOOKS[hookName] = hooks.filter(hook => typeof hook === 'function');
        }
      }
    }

    let {
      FEATURES
    } = EmberENV;

    if (typeof FEATURES === 'object' && FEATURES !== null) {
      for (let feature in FEATURES) {
        if (!FEATURES.hasOwnProperty(feature)) continue;
        ENV.FEATURES[feature] = FEATURES[feature] === true;
      }
    }

    if (es5.DEBUG) {
      ENV._DEBUG_RENDER_TREE = true;
    }
  })(providedEnv);

  function getENV() {
    return ENV;
  }
});
unwrapExports(environment);
var environment_1 = environment.getLookup;
var environment_2 = environment.setLookup;
var environment_3 = environment.getENV;
var environment_4 = environment.ENV;
var environment_5 = environment.context;
var environment_6 = environment.global;
var merge_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = merge;
  /**
    Merge the contents of two objects together into the first object.
  
    ```javascript
    import { merge } from '@ember/polyfills';
  
    merge({ first: 'Tom' }, { last: 'Dale' }); // { first: 'Tom', last: 'Dale' }
    var a = { first: 'Yehuda' };
    var b = { last: 'Katz' };
    merge(a, b); // a == { first: 'Yehuda', last: 'Katz' }, b == { last: 'Katz' }
    ```
  
    @method merge
    @static
    @for @ember/polyfills
    @param {Object} original The object to merge into
    @param {Object} updates The object to copy properties from
    @return {Object}
    @deprecated
    @public
  */

  function merge(original, updates) {
    (0, debug_1.deprecate)('Use of `merge` has been deprecated. Please use `assign` instead.', false, {
      id: 'ember-polyfills.deprecate-merge',
      until: '4.0.0',
      url: 'https://emberjs.com/deprecations/v3.x/#toc_ember-polyfills-deprecate-merge'
    });

    if (updates === null || typeof updates !== 'object') {
      return original;
    }

    let props = Object.keys(updates);
    let prop;

    for (let i = 0; i < props.length; i++) {
      prop = props[i];
      original[prop] = updates[prop];
    }

    return original;
  }
});
unwrapExports(merge_1);
var assign_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.assign = assign;
  exports.default = void 0;
  /**
   @module @ember/polyfills
  */

  /**
    Copy properties from a source object to a target object. Source arguments remain unchanged.
  
    ```javascript
    import { assign } from '@ember/polyfills';
  
    var a = { first: 'Yehuda' };
    var b = { last: 'Katz' };
    var c = { company: 'Other Company' };
    var d = { company: 'Tilde Inc.' };
    assign(a, b, c, d); // a === { first: 'Yehuda', last: 'Katz', company: 'Tilde Inc.' };
    ```
  
    @method assign
    @for @ember/polyfills
    @param {Object} target The object to assign into
    @param {Object} ...args The objects to copy properties from
    @return {Object}
    @public
    @static
  */

  function assign(target) {
    for (let i = 1; i < arguments.length; i++) {
      let arg = arguments[i];

      if (!arg) {
        continue;
      }

      let updates = Object.keys(arg);

      for (let i = 0; i < updates.length; i++) {
        let prop = updates[i];
        target[prop] = arg[prop];
      }
    }

    return target;
  } // Note: We use the bracket notation so
  //       that the babel plugin does not
  //       transform it.
  // https://www.npmjs.com/package/babel-plugin-transform-object-assign


  const {
    assign: _assign
  } = Object;

  var _default = _assign || assign;

  exports.default = _default;
});
unwrapExports(assign_1);
var assign_2 = assign_1.assign;
var weak_set = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = void 0;
  /* globals WeakSet */

  var _default = typeof WeakSet === 'function' ? WeakSet : class WeakSetPolyFill {
    constructor() {
      this._map = new WeakMap();
    }

    add(val) {
      this._map.set(val, true);

      return this;
    }

    delete(val) {
      return this._map.delete(val);
    }

    has(val) {
      return this._map.has(val);
    }

  };

  exports.default = _default;
});
unwrapExports(weak_set);
var polyfills = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, "assign", {
    enumerable: true,
    get: function () {
      return _assign.default;
    }
  });
  Object.defineProperty(exports, "assignPolyfill", {
    enumerable: true,
    get: function () {
      return _assign.assign;
    }
  });
  Object.defineProperty(exports, "_WeakSet", {
    enumerable: true,
    get: function () {
      return _weak_set.default;
    }
  });
  exports.merge = void 0;

  var _merge = _interopRequireDefault(merge_1);

  var _assign = _interopRequireWildcard(assign_1);

  var _weak_set = _interopRequireDefault(weak_set);

  function _getRequireWildcardCache() {
    if (typeof WeakMap !== "function") return null;
    var cache = new WeakMap();

    _getRequireWildcardCache = function () {
      return cache;
    };

    return cache;
  }

  function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
      return obj;
    }

    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
      return {
        default: obj
      };
    }

    var cache = _getRequireWildcardCache();

    if (cache && cache.has(obj)) {
      return cache.get(obj);
    }

    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;

    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;

        if (desc && (desc.get || desc.set)) {
          Object.defineProperty(newObj, key, desc);
        } else {
          newObj[key] = obj[key];
        }
      }
    }

    newObj.default = obj;

    if (cache) {
      cache.set(obj, newObj);
    }

    return newObj;
  }

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  let merge = deprecatedFeatures.MERGE ? _merge.default : undefined; // Export `assignPolyfill` for testing

  exports.merge = merge;
});
unwrapExports(polyfills);
var polyfills_1 = polyfills.merge;
var utils = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.symbol = symbol;
  exports.isInternalSymbol = isInternalSymbol;
  exports.dictionary = makeDictionary;
  exports.uuid = uuid;
  exports.generateGuid = generateGuid;
  exports.guidFor = guidFor;
  exports.intern = intern;
  exports.wrap = wrap;
  exports.getObservers = getObservers;
  exports.getListeners = getListeners;
  exports.setObservers = setObservers;
  exports.setListeners = setListeners;
  exports.inspect = inspect;
  exports.lookupDescriptor = lookupDescriptor;
  exports.canInvoke = canInvoke;
  exports.tryInvoke = tryInvoke;
  exports.makeArray = makeArray;
  exports.getName = getName;
  exports.setName = setName;
  exports.toString = toString;
  exports.isObject = isObject;
  exports.isProxy = isProxy;
  exports.setProxy = setProxy;
  exports.isEmberArray = isEmberArray;
  exports.setWithMandatorySetter = exports.teardownMandatorySetter = exports.setupMandatorySetter = exports.EMBER_ARRAY = exports.Cache = exports.HAS_NATIVE_PROXY = exports.HAS_NATIVE_SYMBOL = exports.ROOT = exports.checkHasSuper = exports.GUID_KEY = exports.getOwnPropertyDescriptors = exports.getDebugName = void 0;
  /**
    Strongly hint runtimes to intern the provided string.
  
    When do I need to use this function?
  
    For the most part, never. Pre-mature optimization is bad, and often the
    runtime does exactly what you need it to, and more often the trade-off isn't
    worth it.
  
    Why?
  
    Runtimes store strings in at least 2 different representations:
    Ropes and Symbols (interned strings). The Rope provides a memory efficient
    data-structure for strings created from concatenation or some other string
    manipulation like splitting.
  
    Unfortunately checking equality of different ropes can be quite costly as
    runtimes must resort to clever string comparison algorithms. These
    algorithms typically cost in proportion to the length of the string.
    Luckily, this is where the Symbols (interned strings) shine. As Symbols are
    unique by their string content, equality checks can be done by pointer
    comparison.
  
    How do I know if my string is a rope or symbol?
  
    Typically (warning general sweeping statement, but truthy in runtimes at
    present) static strings created as part of the JS source are interned.
    Strings often used for comparisons can be interned at runtime if some
    criteria are met.  One of these criteria can be the size of the entire rope.
    For example, in chrome 38 a rope longer then 12 characters will not
    intern, nor will segments of that rope.
  
    Some numbers: http://jsperf.com/eval-vs-keys/8
  
    Known Trick™
  
    @private
    @return {String} interned version of the provided string
  */

  function intern(str) {
    let obj = {};
    obj[str] = 1;

    for (let key in obj) {
      if (key === str) {
        return key;
      }
    }

    return str;
  }
  /**
    Returns whether Type(value) is Object.
  
    Useful for checking whether a value is a valid WeakMap key.
  
    Refs: https://tc39.github.io/ecma262/#sec-typeof-operator-runtime-semantics-evaluation
          https://tc39.github.io/ecma262/#sec-weakmap.prototype.set
  
    @private
    @function isObject
  */


  function isObject(value) {
    return value !== null && (typeof value === 'object' || typeof value === 'function');
  }
  /**
   @module @ember/object
  */

  /**
   Previously we used `Ember.$.uuid`, however `$.uuid` has been removed from
   jQuery master. We'll just bootstrap our own uuid now.
  
   @private
   @return {Number} the uuid
   */


  let _uuid = 0;
  /**
   Generates a universally unique identifier. This method
   is used internally by Ember for assisting with
   the generation of GUID's and other unique identifiers.
  
   @public
   @return {Number} [description]
   */

  function uuid() {
    return ++_uuid;
  }
  /**
   Prefix used for guids through out Ember.
   @private
   @property GUID_PREFIX
   @for Ember
   @type String
   @final
   */


  const GUID_PREFIX = 'ember'; // Used for guid generation...

  const OBJECT_GUIDS = new WeakMap();
  const NON_OBJECT_GUIDS = new Map();
  /**
    A unique key used to assign guids and other private metadata to objects.
    If you inspect an object in your browser debugger you will often see these.
    They can be safely ignored.
  
    On browsers that support it, these properties are added with enumeration
    disabled so they won't show up when you iterate over your properties.
  
    @private
    @property GUID_KEY
    @for Ember
    @type String
    @final
  */

  const GUID_KEY = intern(`__ember${Date.now()}`);
  /**
    Generates a new guid, optionally saving the guid to the object that you
    pass in. You will rarely need to use this method. Instead you should
    call `guidFor(obj)`, which return an existing guid if available.
  
    @private
    @method generateGuid
    @static
    @for @ember/object/internals
    @param {Object} [obj] Object the guid will be used for. If passed in, the guid will
      be saved on the object and reused whenever you pass the same object
      again.
  
      If no object is passed, just generate a new guid.
    @param {String} [prefix] Prefix to place in front of the guid. Useful when you want to
      separate the guid into separate namespaces.
    @return {String} the guid
  */

  exports.GUID_KEY = GUID_KEY;

  function generateGuid(obj, prefix = GUID_PREFIX) {
    let guid = prefix + uuid();

    if (isObject(obj)) {
      OBJECT_GUIDS.set(obj, guid);
    }

    return guid;
  }
  /**
    Returns a unique id for the object. If the object does not yet have a guid,
    one will be assigned to it. You can call this on any object,
    `EmberObject`-based or not.
  
    You can also use this method on DOM Element objects.
  
    @public
    @static
    @method guidFor
    @for @ember/object/internals
    @param {Object} obj any object, string, number, Element, or primitive
    @return {String} the unique guid for this instance.
  */


  function guidFor(value) {
    let guid;

    if (isObject(value)) {
      guid = OBJECT_GUIDS.get(value);

      if (guid === undefined) {
        guid = GUID_PREFIX + uuid();
        OBJECT_GUIDS.set(value, guid);
      }
    } else {
      guid = NON_OBJECT_GUIDS.get(value);

      if (guid === undefined) {
        let type = typeof value;

        if (type === 'string') {
          guid = 'st' + uuid();
        } else if (type === 'number') {
          guid = 'nu' + uuid();
        } else if (type === 'symbol') {
          guid = 'sy' + uuid();
        } else {
          guid = '(' + value + ')';
        }

        NON_OBJECT_GUIDS.set(value, guid);
      }
    }

    return guid;
  }

  const GENERATED_SYMBOLS = [];

  function isInternalSymbol(possibleSymbol) {
    return GENERATED_SYMBOLS.indexOf(possibleSymbol) !== -1;
  }

  function symbol(debugName) {
    // TODO: Investigate using platform symbols, but we do not
    // want to require non-enumerability for this API, which
    // would introduce a large cost.
    let id = GUID_KEY + Math.floor(Math.random() * Date.now());
    let symbol = intern(`__${debugName}${id}__`);
    GENERATED_SYMBOLS.push(symbol);
    return symbol;
  } // the delete is meant to hint at runtimes that this object should remain in
  // dictionary mode. This is clearly a runtime specific hack, but currently it
  // appears worthwhile in some usecases. Please note, these deletes do increase
  // the cost of creation dramatically over a plain Object.create. And as this
  // only makes sense for long-lived dictionaries that aren't instantiated often.


  function makeDictionary(parent) {
    let dict = Object.create(parent);
    dict['_dict'] = null;
    delete dict['_dict'];
    return dict;
  }

  let getDebugName;

  if (es5.DEBUG) {
    let getFunctionName = fn => {
      let functionName = fn.name;

      if (functionName === undefined) {
        let match = Function.prototype.toString.call(fn).match(/function (\w+)\s*\(/);
        functionName = match && match[1] || '';
      }

      return functionName.replace(/^bound /, '');
    };

    let getObjectName = obj => {
      let name;
      let className;

      if (obj.constructor && obj.constructor !== Object) {
        className = getFunctionName(obj.constructor);
      }

      if ('toString' in obj && obj.toString !== Object.prototype.toString && obj.toString !== Function.prototype.toString) {
        name = obj.toString();
      } // If the class has a decent looking name, and the `toString` is one of the
      // default Ember toStrings, replace the constructor portion of the toString
      // with the class name. We check the length of the class name to prevent doing
      // this when the value is minified.


      if (name && name.match(/<.*:ember\d+>/) && className && className[0] !== '_' && className.length > 2 && className !== 'Class') {
        return name.replace(/<.*:/, `<${className}:`);
      }

      return name || className;
    };

    let getPrimitiveName = value => {
      return String(value);
    };

    getDebugName = value => {
      if (typeof value === 'function') {
        return getFunctionName(value) || `(unknown function)`;
      } else if (typeof value === 'object' && value !== null) {
        return getObjectName(value) || `(unknown object)`;
      } else {
        return getPrimitiveName(value);
      }
    };
  }

  var getDebugName$1 = getDebugName;
  exports.getDebugName = getDebugName$1;
  let getOwnPropertyDescriptors;

  if (Object.getOwnPropertyDescriptors !== undefined) {
    getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
  } else {
    getOwnPropertyDescriptors = function (obj) {
      let descriptors = {};
      Object.keys(obj).forEach(key => {
        descriptors[key] = Object.getOwnPropertyDescriptor(obj, key);
      });
      return descriptors;
    };
  }

  var getOwnPropertyDescriptors$1 = getOwnPropertyDescriptors;
  exports.getOwnPropertyDescriptors = getOwnPropertyDescriptors$1;
  const HAS_SUPER_PATTERN = /\.(_super|call\(this|apply\(this)/;
  const fnToString = Function.prototype.toString;

  const checkHasSuper = (() => {
    let sourceAvailable = fnToString.call(function () {
      return this;
    }).indexOf('return this') > -1;

    if (sourceAvailable) {
      return function checkHasSuper(func) {
        return HAS_SUPER_PATTERN.test(fnToString.call(func));
      };
    }

    return function checkHasSuper() {
      return true;
    };
  })();

  exports.checkHasSuper = checkHasSuper;
  const HAS_SUPER_MAP = new WeakMap();
  const ROOT = Object.freeze(function () {});
  exports.ROOT = ROOT;
  HAS_SUPER_MAP.set(ROOT, false);

  function hasSuper(func) {
    let hasSuper = HAS_SUPER_MAP.get(func);

    if (hasSuper === undefined) {
      hasSuper = checkHasSuper(func);
      HAS_SUPER_MAP.set(func, hasSuper);
    }

    return hasSuper;
  }

  const OBSERVERS_MAP = new WeakMap();

  function setObservers(func, observers) {
    OBSERVERS_MAP.set(func, observers);
  }

  function getObservers(func) {
    return OBSERVERS_MAP.get(func);
  }

  const LISTENERS_MAP = new WeakMap();

  function setListeners(func, listeners) {
    if (listeners) {
      LISTENERS_MAP.set(func, listeners);
    }
  }

  function getListeners(func) {
    return LISTENERS_MAP.get(func);
  }

  const IS_WRAPPED_FUNCTION_SET = new polyfills._WeakSet();
  /**
    Wraps the passed function so that `this._super` will point to the superFunc
    when the function is invoked. This is the primitive we use to implement
    calls to super.
  
    @private
    @method wrap
    @for Ember
    @param {Function} func The function to call
    @param {Function} superFunc The super function.
    @return {Function} wrapped function.
  */

  function wrap(func, superFunc) {
    if (!hasSuper(func)) {
      return func;
    } // ensure an unwrapped super that calls _super is wrapped with a terminal _super


    if (!IS_WRAPPED_FUNCTION_SET.has(superFunc) && hasSuper(superFunc)) {
      return _wrap(func, _wrap(superFunc, ROOT));
    }

    return _wrap(func, superFunc);
  }

  function _wrap(func, superFunc) {
    function superWrapper() {
      let orig = this._super;
      this._super = superFunc;
      let ret = func.apply(this, arguments);
      this._super = orig;
      return ret;
    }

    IS_WRAPPED_FUNCTION_SET.add(superWrapper);
    setObservers(superWrapper, getObservers(func));
    setListeners(superWrapper, getListeners(func));
    return superWrapper;
  }

  const {
    toString: objectToString
  } = Object.prototype;
  const {
    toString: functionToString
  } = Function.prototype;
  const {
    isArray
  } = Array;
  const {
    keys: objectKeys
  } = Object;
  const {
    stringify
  } = JSON;
  const LIST_LIMIT = 100;
  const DEPTH_LIMIT = 4;
  const SAFE_KEY = /^[\w$]+$/;
  /**
   @module @ember/debug
  */

  /**
    Convenience method to inspect an object. This method will attempt to
    convert the object into a useful string description.
  
    It is a pretty simple implementation. If you want something more robust,
    use something like JSDump: https://github.com/NV/jsDump
  
    @method inspect
    @static
    @param {Object} obj The object you want to inspect.
    @return {String} A description of the object
    @since 1.4.0
    @private
  */

  function inspect(obj) {
    // detect Node util.inspect call inspect(depth: number, opts: object)
    if (typeof obj === 'number' && arguments.length === 2) {
      return this;
    }

    return inspectValue(obj, 0);
  }

  function inspectValue(value, depth, seen) {
    let valueIsArray = false;

    switch (typeof value) {
      case 'undefined':
        return 'undefined';

      case 'object':
        if (value === null) return 'null';

        if (isArray(value)) {
          valueIsArray = true;
          break;
        } // is toString Object.prototype.toString or undefined then traverse


        if (value.toString === objectToString || value.toString === undefined) {
          break;
        } // custom toString


        return value.toString();

      case 'function':
        return value.toString === functionToString ? value.name ? `[Function:${value.name}]` : `[Function]` : value.toString();

      case 'string':
        return stringify(value);

      case 'symbol':
      case 'boolean':
      case 'number':
      default:
        return value.toString();
    }

    if (seen === undefined) {
      seen = new polyfills._WeakSet();
    } else {
      if (seen.has(value)) return `[Circular]`;
    }

    seen.add(value);
    return valueIsArray ? inspectArray(value, depth + 1, seen) : inspectObject(value, depth + 1, seen);
  }

  function inspectKey(key) {
    return SAFE_KEY.test(key) ? key : stringify(key);
  }

  function inspectObject(obj, depth, seen) {
    if (depth > DEPTH_LIMIT) {
      return '[Object]';
    }

    let s = '{';
    let keys = objectKeys(obj);

    for (let i = 0; i < keys.length; i++) {
      s += i === 0 ? ' ' : ', ';

      if (i >= LIST_LIMIT) {
        s += `... ${keys.length - LIST_LIMIT} more keys`;
        break;
      }

      let key = keys[i];
      s += inspectKey(key) + ': ' + inspectValue(obj[key], depth, seen);
    }

    s += ' }';
    return s;
  }

  function inspectArray(arr, depth, seen) {
    if (depth > DEPTH_LIMIT) {
      return '[Array]';
    }

    let s = '[';

    for (let i = 0; i < arr.length; i++) {
      s += i === 0 ? ' ' : ', ';

      if (i >= LIST_LIMIT) {
        s += `... ${arr.length - LIST_LIMIT} more items`;
        break;
      }

      s += inspectValue(arr[i], depth, seen);
    }

    s += ' ]';
    return s;
  }

  function lookupDescriptor(obj, keyName) {
    let current = obj;

    do {
      let descriptor = Object.getOwnPropertyDescriptor(current, keyName);

      if (descriptor !== undefined) {
        return descriptor;
      }

      current = Object.getPrototypeOf(current);
    } while (current !== null);

    return null;
  }
  /**
    Checks to see if the `methodName` exists on the `obj`.
  
    ```javascript
    let foo = { bar: function() { return 'bar'; }, baz: null };
  
    Ember.canInvoke(foo, 'bar'); // true
    Ember.canInvoke(foo, 'baz'); // false
    Ember.canInvoke(foo, 'bat'); // false
    ```
  
    @method canInvoke
    @for Ember
    @param {Object} obj The object to check for the method
    @param {String} methodName The method name to check for
    @return {Boolean}
    @private
  */


  function canInvoke(obj, methodName) {
    return obj !== null && obj !== undefined && typeof obj[methodName] === 'function';
  }
  /**
    @module @ember/utils
  */

  /**
    Checks to see if the `methodName` exists on the `obj`,
    and if it does, invokes it with the arguments passed.
  
    ```javascript
    import { tryInvoke } from '@ember/utils';
  
    let d = new Date('03/15/2013');
  
    tryInvoke(d, 'getTime');              // 1363320000000
    tryInvoke(d, 'setFullYear', [2014]);  // 1394856000000
    tryInvoke(d, 'noSuchMethod', [2014]); // undefined
    ```
  
    @method tryInvoke
    @for @ember/utils
    @static
    @param {Object} obj The object to check for the method
    @param {String} methodName The method name to check for
    @param {Array} [args] The arguments to pass to the method
    @return {*} the return value of the invoked method or undefined if it cannot be invoked
    @public
  */


  function tryInvoke(obj, methodName, args) {
    if (canInvoke(obj, methodName)) {
      let method = obj[methodName];
      return method.apply(obj, args);
    }
  }

  const {
    isArray: isArray$1
  } = Array;

  function makeArray(obj) {
    if (obj === null || obj === undefined) {
      return [];
    }

    return isArray$1(obj) ? obj : [obj];
  }

  const NAMES = new WeakMap();

  function setName(obj, name) {
    if (isObject(obj)) NAMES.set(obj, name);
  }

  function getName(obj) {
    return NAMES.get(obj);
  }

  const objectToString$1 = Object.prototype.toString;

  function isNone(obj) {
    return obj === null || obj === undefined;
  }
  /*
   A `toString` util function that supports objects without a `toString`
   method, e.g. an object created with `Object.create(null)`.
  */


  function toString(obj) {
    if (typeof obj === 'string') {
      return obj;
    }

    if (null === obj) return 'null';
    if (undefined === obj) return 'undefined';

    if (Array.isArray(obj)) {
      // Reimplement Array.prototype.join according to spec (22.1.3.13)
      // Changing ToString(element) with this safe version of ToString.
      let r = '';

      for (let k = 0; k < obj.length; k++) {
        if (k > 0) {
          r += ',';
        }

        if (!isNone(obj[k])) {
          r += toString(obj[k]);
        }
      }

      return r;
    }

    if (typeof obj.toString === 'function') {
      return obj.toString();
    }

    return objectToString$1.call(obj);
  }

  const HAS_NATIVE_SYMBOL = function () {
    if (typeof Symbol !== 'function') {
      return false;
    }

    return typeof Symbol() === 'symbol';
  }();

  exports.HAS_NATIVE_SYMBOL = HAS_NATIVE_SYMBOL;
  const HAS_NATIVE_PROXY = typeof Proxy === 'function';
  exports.HAS_NATIVE_PROXY = HAS_NATIVE_PROXY;
  const PROXIES = new polyfills._WeakSet();

  function isProxy(value) {
    if (isObject(value)) {
      return PROXIES.has(value);
    }

    return false;
  }

  function setProxy(object) {
    if (isObject(object)) {
      PROXIES.add(object);
    }
  }

  class Cache {
    constructor(limit, func, store) {
      this.limit = limit;
      this.func = func;
      this.store = store;
      this.size = 0;
      this.misses = 0;
      this.hits = 0;
      this.store = store || new Map();
    }

    get(key) {
      if (this.store.has(key)) {
        this.hits++;
        return this.store.get(key);
      } else {
        this.misses++;
        return this.set(key, this.func(key));
      }
    }

    set(key, value) {
      if (this.limit > this.size) {
        this.size++;
        this.store.set(key, value);
      }

      return value;
    }

    purge() {
      this.store.clear();
      this.size = 0;
      this.hits = 0;
      this.misses = 0;
    }

  }

  exports.Cache = Cache;
  const EMBER_ARRAY = symbol('EMBER_ARRAY');
  exports.EMBER_ARRAY = EMBER_ARRAY;

  function isEmberArray(obj) {
    return obj && obj[EMBER_ARRAY];
  }

  let setupMandatorySetter;
  exports.setupMandatorySetter = setupMandatorySetter;
  let teardownMandatorySetter;
  exports.teardownMandatorySetter = teardownMandatorySetter;
  let setWithMandatorySetter;
  exports.setWithMandatorySetter = setWithMandatorySetter;

  function isElementKey(key) {
    return typeof key === 'number' ? isPositiveInt(key) : isStringInt(key);
  }

  function isStringInt(str) {
    let num = parseInt(str, 10);
    return isPositiveInt(num) && str === String(num);
  }

  function isPositiveInt(num) {
    return num >= 0 && num % 1 === 0;
  }

  if (es5.DEBUG) {
    let SEEN_TAGS = new polyfills._WeakSet();
    let MANDATORY_SETTERS = new WeakMap();

    let propertyIsEnumerable = function (obj, key) {
      return Object.prototype.propertyIsEnumerable.call(obj, key);
    };

    exports.setupMandatorySetter = setupMandatorySetter = function (tag, obj, keyName) {
      if (SEEN_TAGS.has(tag)) {
        return;
      }

      SEEN_TAGS.add(tag);

      if (Array.isArray(obj) && isElementKey(keyName)) {
        return;
      }

      let desc = lookupDescriptor(obj, keyName) || {};

      if (desc.get || desc.set) {
        // if it has a getter or setter, we can't install the mandatory setter.
        // native setters are allowed, we have to assume that they will resolve
        // to tracked properties.
        return;
      }

      if (desc && (!desc.configurable || !desc.writable)) {
        // if it isn't writable anyways, so we shouldn't provide the setter.
        // if it isn't configurable, we can't overwrite it anyways.
        return;
      }

      let setters = MANDATORY_SETTERS.get(obj);

      if (setters === undefined) {
        setters = {};
        MANDATORY_SETTERS.set(obj, setters);
      }

      desc.hadOwnProperty = Object.hasOwnProperty.call(obj, keyName);
      setters[keyName] = desc;
      Object.defineProperty(obj, keyName, {
        configurable: true,
        enumerable: propertyIsEnumerable(obj, keyName),

        get() {
          if (desc.get) {
            return desc.get.call(this);
          } else {
            return desc.value;
          }
        },

        set(value) {
          (0, debug_1.assert)(`You attempted to update ${this}.${String(keyName)} to "${String(value)}", but it is being tracked by a tracking context, such as a template, computed property, or observer. In order to make sure the context updates properly, you must invalidate the property when updating it. You can mark the property as \`@tracked\`, or use \`@ember/object#set\` to do this.`);
        }

      });
    };

    exports.teardownMandatorySetter = teardownMandatorySetter = function (obj, keyName) {
      let setters = MANDATORY_SETTERS.get(obj);

      if (setters !== undefined && setters[keyName] !== undefined) {
        Object.defineProperty(obj, keyName, setters[keyName]);
        setters[keyName] = undefined;
      }
    };

    exports.setWithMandatorySetter = setWithMandatorySetter = function (obj, keyName, value) {
      let setters = MANDATORY_SETTERS.get(obj);

      if (setters !== undefined && setters[keyName] !== undefined) {
        let setter = setters[keyName];

        if (setter.set) {
          setter.set.call(obj, value);
        } else {
          setter.value = value; // If the object didn't have own property before, it would have changed
          // the enumerability after setting the value the first time.

          if (!setter.hadOwnProperty) {
            let desc = lookupDescriptor(obj, keyName);
            desc.enumerable = true;
            Object.defineProperty(obj, keyName, desc);
          }
        }
      } else {
        obj[keyName] = value;
      }
    };
  }
  /*
   This package will be eagerly parsed and should have no dependencies on external
   packages.
  
   It is intended to be used to share utility methods that will be needed
   by every Ember application (and is **not** a dumping ground of useful utilities).
  
   Utility methods that are needed in < 80% of cases should be placed
   elsewhere (so they can be lazily evaluated / parsed).
  */

});
unwrapExports(utils);
var utils_1 = utils.symbol;
var utils_2 = utils.isInternalSymbol;
var utils_3 = utils.dictionary;
var utils_4 = utils.uuid;
var utils_5 = utils.generateGuid;
var utils_6 = utils.guidFor;
var utils_7 = utils.intern;
var utils_8 = utils.wrap;
var utils_9 = utils.getObservers;
var utils_10 = utils.getListeners;
var utils_11 = utils.setObservers;
var utils_12 = utils.setListeners;
var utils_13 = utils.inspect;
var utils_14 = utils.lookupDescriptor;
var utils_15 = utils.canInvoke;
var utils_16 = utils.tryInvoke;
var utils_17 = utils.makeArray;
var utils_18 = utils.getName;
var utils_19 = utils.setName;
var utils_20 = utils.isObject;
var utils_21 = utils.isProxy;
var utils_22 = utils.setProxy;
var utils_23 = utils.isEmberArray;
var utils_24 = utils.setWithMandatorySetter;
var utils_25 = utils.teardownMandatorySetter;
var utils_26 = utils.setupMandatorySetter;
var utils_27 = utils.EMBER_ARRAY;
var utils_28 = utils.Cache;
var utils_29 = utils.HAS_NATIVE_PROXY;
var utils_30 = utils.HAS_NATIVE_SYMBOL;
var utils_31 = utils.ROOT;
var utils_32 = utils.checkHasSuper;
var utils_33 = utils.GUID_KEY;
var utils_34 = utils.getOwnPropertyDescriptors;
var utils_35 = utils.getDebugName;
var string$1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.loc = loc;
  exports.w = w;
  exports.decamelize = decamelize;
  exports.dasherize = dasherize;
  exports.camelize = camelize;
  exports.classify = classify;
  exports.underscore = underscore;
  exports.capitalize = capitalize;
  Object.defineProperty(exports, "_getStrings", {
    enumerable: true,
    get: function () {
      return string_registry.getStrings;
    }
  });
  Object.defineProperty(exports, "_setStrings", {
    enumerable: true,
    get: function () {
      return string_registry.setStrings;
    }
  });
  /**
  @module @ember/string
  */

  const STRING_DASHERIZE_REGEXP = /[ _]/g;
  const STRING_DASHERIZE_CACHE = new utils.Cache(1000, key => decamelize(key).replace(STRING_DASHERIZE_REGEXP, '-'));
  const STRING_CAMELIZE_REGEXP_1 = /(\-|\_|\.|\s)+(.)?/g;
  const STRING_CAMELIZE_REGEXP_2 = /(^|\/)([A-Z])/g;
  const CAMELIZE_CACHE = new utils.Cache(1000, key => key.replace(STRING_CAMELIZE_REGEXP_1, (_match, _separator, chr) => chr ? chr.toUpperCase() : '').replace(STRING_CAMELIZE_REGEXP_2, (match
  /*, separator, chr */
  ) => match.toLowerCase()));
  const STRING_CLASSIFY_REGEXP_1 = /^(\-|_)+(.)?/;
  const STRING_CLASSIFY_REGEXP_2 = /(.)(\-|\_|\.|\s)+(.)?/g;
  const STRING_CLASSIFY_REGEXP_3 = /(^|\/|\.)([a-z])/g;
  const CLASSIFY_CACHE = new utils.Cache(1000, str => {
    let replace1 = (_match, _separator, chr) => chr ? `_${chr.toUpperCase()}` : '';

    let replace2 = (_match, initialChar, _separator, chr) => initialChar + (chr ? chr.toUpperCase() : '');

    let parts = str.split('/');

    for (let i = 0; i < parts.length; i++) {
      parts[i] = parts[i].replace(STRING_CLASSIFY_REGEXP_1, replace1).replace(STRING_CLASSIFY_REGEXP_2, replace2);
    }

    return parts.join('/').replace(STRING_CLASSIFY_REGEXP_3, (match
    /*, separator, chr */
    ) => match.toUpperCase());
  });
  const STRING_UNDERSCORE_REGEXP_1 = /([a-z\d])([A-Z]+)/g;
  const STRING_UNDERSCORE_REGEXP_2 = /\-|\s+/g;
  const UNDERSCORE_CACHE = new utils.Cache(1000, str => str.replace(STRING_UNDERSCORE_REGEXP_1, '$1_$2').replace(STRING_UNDERSCORE_REGEXP_2, '_').toLowerCase());
  const STRING_CAPITALIZE_REGEXP = /(^|\/)([a-z\u00C0-\u024F])/g;
  const CAPITALIZE_CACHE = new utils.Cache(1000, str => str.replace(STRING_CAPITALIZE_REGEXP, (match
  /*, separator, chr */
  ) => match.toUpperCase()));
  const STRING_DECAMELIZE_REGEXP = /([a-z\d])([A-Z])/g;
  const DECAMELIZE_CACHE = new utils.Cache(1000, str => str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase());
  /**
    Defines string helper methods including string formatting and localization.
    Unless `EmberENV.EXTEND_PROTOTYPES.String` is `false` these methods will also be
    added to the `String.prototype` as well.
  
    @class String
    @public
  */

  function _fmt(str, formats) {
    // first, replace any ORDERED replacements.
    let idx = 0; // the current index for non-numerical replacements

    return str.replace(/%@([0-9]+)?/g, (_s, argIndex) => {
      let i = argIndex ? parseInt(argIndex, 10) - 1 : idx++;
      let r = i < formats.length ? formats[i] : undefined;
      return typeof r === 'string' ? r : r === null ? '(null)' : r === undefined ? '' : String(r);
    });
  }
  /**
    Formats the passed string, but first looks up the string in the localized
    strings hash. This is a convenient way to localize text.
  
    Note that it is traditional but not required to prefix localized string
    keys with an underscore or other character so you can easily identify
    localized strings.
  
    ```javascript
    import { loc } from '@ember/string';
  
    Ember.STRINGS = {
      '_Hello World': 'Bonjour le monde',
      '_Hello %@ %@': 'Bonjour %@ %@'
    };
  
    loc("_Hello World");  // 'Bonjour le monde';
    loc("_Hello %@ %@", ["John", "Smith"]);  // "Bonjour John Smith";
    ```
  
    @method loc
    @param {String} str The string to format
    @param {Array} formats Optional array of parameters to interpolate into string.
    @return {String} formatted string
    @public
  */


  function loc(str, formats) {
    if (!Array.isArray(formats) || arguments.length > 2) {
      formats = Array.prototype.slice.call(arguments, 1);
    }

    str = (0, string_registry.getString)(str) || str;
    return _fmt(str, formats);
  }
  /**
    Splits a string into separate units separated by spaces, eliminating any
    empty strings in the process. This is a convenience method for split that
    is mostly useful when applied to the `String.prototype`.
  
    ```javascript
    import { w } from '@ember/string';
  
    w("alpha beta gamma").forEach(function(key) {
      console.log(key);
    });
  
    // > alpha
    // > beta
    // > gamma
    ```
  
    @method w
    @param {String} str The string to split
    @return {Array} array containing the split strings
    @public
  */


  function w(str) {
    return str.split(/\s+/);
  }
  /**
    Converts a camelized string into all lower case separated by underscores.
  
    ```javascript
    import { decamelize } from '@ember/string';
  
    decamelize('innerHTML');          // 'inner_html'
    decamelize('action_name');        // 'action_name'
    decamelize('css-class-name');     // 'css-class-name'
    decamelize('my favorite items');  // 'my favorite items'
    ```
  
    @method decamelize
    @param {String} str The string to decamelize.
    @return {String} the decamelized string.
    @public
  */


  function decamelize(str) {
    return DECAMELIZE_CACHE.get(str);
  }
  /**
    Replaces underscores, spaces, or camelCase with dashes.
  
    ```javascript
    import { dasherize } from '@ember/string';
  
    dasherize('innerHTML');                // 'inner-html'
    dasherize('action_name');              // 'action-name'
    dasherize('css-class-name');           // 'css-class-name'
    dasherize('my favorite items');        // 'my-favorite-items'
    dasherize('privateDocs/ownerInvoice';  // 'private-docs/owner-invoice'
    ```
  
    @method dasherize
    @param {String} str The string to dasherize.
    @return {String} the dasherized string.
    @public
  */


  function dasherize(str) {
    return STRING_DASHERIZE_CACHE.get(str);
  }
  /**
    Returns the lowerCamelCase form of a string.
  
    ```javascript
    import { camelize } from '@ember/string';
  
    camelize('innerHTML');                   // 'innerHTML'
    camelize('action_name');                 // 'actionName'
    camelize('css-class-name');              // 'cssClassName'
    camelize('my favorite items');           // 'myFavoriteItems'
    camelize('My Favorite Items');           // 'myFavoriteItems'
    camelize('private-docs/owner-invoice');  // 'privateDocs/ownerInvoice'
    ```
  
    @method camelize
    @param {String} str The string to camelize.
    @return {String} the camelized string.
    @public
  */


  function camelize(str) {
    return CAMELIZE_CACHE.get(str);
  }
  /**
    Returns the UpperCamelCase form of a string.
  
    ```javascript
    import { classify } from '@ember/string';
  
    classify('innerHTML');                   // 'InnerHTML'
    classify('action_name');                 // 'ActionName'
    classify('css-class-name');              // 'CssClassName'
    classify('my favorite items');           // 'MyFavoriteItems'
    classify('private-docs/owner-invoice');  // 'PrivateDocs/OwnerInvoice'
    ```
  
    @method classify
    @param {String} str the string to classify
    @return {String} the classified string
    @public
  */


  function classify(str) {
    return CLASSIFY_CACHE.get(str);
  }
  /**
    More general than decamelize. Returns the lower\_case\_and\_underscored
    form of a string.
  
    ```javascript
    import { underscore } from '@ember/string';
  
    underscore('innerHTML');                 // 'inner_html'
    underscore('action_name');               // 'action_name'
    underscore('css-class-name');            // 'css_class_name'
    underscore('my favorite items');         // 'my_favorite_items'
    underscore('privateDocs/ownerInvoice');  // 'private_docs/owner_invoice'
    ```
  
    @method underscore
    @param {String} str The string to underscore.
    @return {String} the underscored string.
    @public
  */


  function underscore(str) {
    return UNDERSCORE_CACHE.get(str);
  }
  /**
    Returns the Capitalized form of a string
  
    ```javascript
    import { capitalize } from '@ember/string';
  
    capitalize('innerHTML')                 // 'InnerHTML'
    capitalize('action_name')               // 'Action_name'
    capitalize('css-class-name')            // 'Css-class-name'
    capitalize('my favorite items')         // 'My favorite items'
    capitalize('privateDocs/ownerInvoice'); // 'PrivateDocs/ownerInvoice'
    ```
  
    @method capitalize
    @param {String} str The string to capitalize.
    @return {String} The capitalized string.
    @public
  */


  function capitalize(str) {
    return CAPITALIZE_CACHE.get(str);
  }

  if (environment.ENV.EXTEND_PROTOTYPES.String) {
    Object.defineProperties(String.prototype, {
      /**
        See [String.w](/ember/release/classes/String/methods/w?anchor=w).
             @method w
        @for @ember/string
        @static
        @private
      */
      w: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return w(this);
        }

      },

      /**
        See [String.loc](/ember/release/classes/String/methods/loc?anchor=loc).
             @method loc
        @for @ember/string
        @static
        @private
      */
      loc: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value(...args) {
          return loc(this, args);
        }

      },

      /**
        See [String.camelize](/ember/release/classes/String/methods/camelize?anchor=camelize).
             @method camelize
        @for @ember/string
        @static
        @private
      */
      camelize: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return camelize(this);
        }

      },

      /**
        See [String.decamelize](/ember/release/classes/String/methods/decamelize?anchor=decamelize).
             @method decamelize
        @for @ember/string
        @static
        @private
      */
      decamelize: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return decamelize(this);
        }

      },

      /**
        See [String.dasherize](/ember/release/classes/String/methods/dasherize?anchor=dasherize).
             @method dasherize
        @for @ember/string
        @static
        @private
      */
      dasherize: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return dasherize(this);
        }

      },

      /**
        See [String.underscore](/ember/release/classes/String/methods/underscore?anchor=underscore).
             @method underscore
        @for @ember/string
        @static
        @private
      */
      underscore: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return underscore(this);
        }

      },

      /**
        See [String.classify](/ember/release/classes/String/methods/classify?anchor=classify).
             @method classify
        @for @ember/string
        @static
        @private
      */
      classify: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return classify(this);
        }

      },

      /**
        See [String.capitalize](/ember/release/classes/String/methods/capitalize?anchor=capitalize).
             @method capitalize
        @for @ember/string
        @static
        @private
      */
      capitalize: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return capitalize(this);
        }

      }
    });
  }
});
unwrapExports(string$1);
var string_1$1 = string$1.loc;
var string_2 = string$1.w;
var string_3 = string$1.decamelize;
var string_4 = string$1.dasherize;
var string_5 = string$1.camelize;
var string_6 = string$1.classify;
var string_7 = string$1.underscore;
var string_8 = string$1.capitalize;
var inflections = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = void 0;
  var _default = {
    plurals: [[/$/, "s"], [/s$/i, "s"], [/^(ax|test)is$/i, "$1es"], [/(octop|vir)us$/i, "$1i"], [/(octop|vir)i$/i, "$1i"], [/(alias|status|bonus)$/i, "$1es"], [/(bu)s$/i, "$1ses"], [/(buffal|tomat)o$/i, "$1oes"], [/([ti])um$/i, "$1a"], [/([ti])a$/i, "$1a"], [/sis$/i, "ses"], [/(?:([^f])fe|([lr])f)$/i, "$1$2ves"], [/(hive)$/i, "$1s"], [/([^aeiouy]|qu)y$/i, "$1ies"], [/(x|ch|ss|sh)$/i, "$1es"], [/(matr|vert|ind)(?:ix|ex)$/i, "$1ices"], [/^(m|l)ouse$/i, "$1ice"], [/^(m|l)ice$/i, "$1ice"], [/^(ox)$/i, "$1en"], [/^(oxen)$/i, "$1"], [/(quiz)$/i, "$1zes"]],
    singular: [[/s$/i, ""], [/(ss)$/i, "$1"], [/(n)ews$/i, "$1ews"], [/([ti])a$/i, "$1um"], [/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)(sis|ses)$/i, "$1sis"], [/(^analy)(sis|ses)$/i, "$1sis"], [/([^f])ves$/i, "$1fe"], [/(hive)s$/i, "$1"], [/(tive)s$/i, "$1"], [/([lr])ves$/i, "$1f"], [/([^aeiouy]|qu)ies$/i, "$1y"], [/(s)eries$/i, "$1eries"], [/(m)ovies$/i, "$1ovie"], [/(x|ch|ss|sh)es$/i, "$1"], [/^(m|l)ice$/i, "$1ouse"], [/(bus)(es)?$/i, "$1"], [/(o)es$/i, "$1"], [/(shoe)s$/i, "$1"], [/(cris|test)(is|es)$/i, "$1is"], [/^(a)x[ie]s$/i, "$1xis"], [/(octop|vir)(us|i)$/i, "$1us"], [/(alias|status|bonus)(es)?$/i, "$1"], [/^(ox)en/i, "$1"], [/(vert|ind)ices$/i, "$1ex"], [/(matr)ices$/i, "$1ix"], [/(quiz)zes$/i, "$1"], [/(database)s$/i, "$1"]],
    irregularPairs: [["person", "people"], ["man", "men"], ["child", "children"], ["sex", "sexes"], ["move", "moves"], ["cow", "kine"], ["zombie", "zombies"]],
    uncountable: ["equipment", "information", "rice", "money", "species", "series", "fish", "sheep", "jeans", "police"]
  };
  exports.default = _default;
});
unwrapExports(inflections);
var inflector = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = void 0;

  var _inflections = _interopRequireDefault(inflections);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  const BLANK_REGEX = /^\s*$/;
  const LAST_WORD_DASHED_REGEX = /([\w/-]+[_/\s-])([a-z\d]+$)/;
  const LAST_WORD_CAMELIZED_REGEX = /([\w/\s-]+)([A-Z][a-z\d]*$)/;
  const CAMELIZED_REGEX = /[A-Z][a-z\d]*$/;

  function loadUncountable(rules, uncountable) {
    for (let i = 0, length = uncountable.length; i < length; i++) {
      rules.uncountable[uncountable[i].toLowerCase()] = true;
    }
  }

  function loadIrregular(rules, irregularPairs) {
    let pair;

    for (let i = 0, length = irregularPairs.length; i < length; i++) {
      pair = irregularPairs[i]; //pluralizing

      rules.irregular[pair[0].toLowerCase()] = pair[1];
      rules.irregular[pair[1].toLowerCase()] = pair[1]; //singularizing

      rules.irregularInverse[pair[1].toLowerCase()] = pair[0];
      rules.irregularInverse[pair[0].toLowerCase()] = pair[0];
    }
  }
  /**
    Inflector.Ember provides a mechanism for supplying inflection rules for your
    application. Ember includes a default set of inflection rules, and provides an
    API for providing additional rules.
  
    Examples:
  
    Creating an inflector with no rules.
  
    ```js
    var inflector = new Ember.Inflector();
    ```
  
    Creating an inflector with the default ember ruleset.
  
    ```js
    var inflector = new Ember.Inflector(Ember.Inflector.defaultRules);
  
    inflector.pluralize('cow'); //=> 'kine'
    inflector.singularize('kine'); //=> 'cow'
    ```
  
    Creating an inflector and adding rules later.
  
    ```javascript
    var inflector = Ember.Inflector.inflector;
  
    inflector.pluralize('advice'); // => 'advices'
    inflector.uncountable('advice');
    inflector.pluralize('advice'); // => 'advice'
  
    inflector.pluralize('formula'); // => 'formulas'
    inflector.irregular('formula', 'formulae');
    inflector.pluralize('formula'); // => 'formulae'
  
    // you would not need to add these as they are the default rules
    inflector.plural(/$/, 's');
    inflector.singular(/s$/i, '');
    ```
  
    Creating an inflector with a nondefault ruleset.
  
    ```javascript
    var rules = {
      plurals:  [
        [ /$/, 's' ]
      ],
      singular: [
        [ /\s$/, '' ]
      ],
      irregularPairs: [
        [ 'cow', 'kine' ]
      ],
      uncountable: [ 'fish' ]
    };
  
    var inflector = new Ember.Inflector(rules);
    ```
  
    @class Inflector
    @namespace Ember
  */


  function Inflector(ruleSet) {
    ruleSet = ruleSet || {};
    ruleSet.uncountable = ruleSet.uncountable || makeDictionary();
    ruleSet.irregularPairs = ruleSet.irregularPairs || makeDictionary();
    const rules = this.rules = {
      plurals: ruleSet.plurals || [],
      singular: ruleSet.singular || [],
      irregular: makeDictionary(),
      irregularInverse: makeDictionary(),
      uncountable: makeDictionary()
    };
    loadUncountable(rules, ruleSet.uncountable);
    loadIrregular(rules, ruleSet.irregularPairs);
    this.enableCache();
  }

  if (!Object.create && !Object.create(null).hasOwnProperty) {
    throw new Error("This browser does not support Object.create(null), please polyfil with es5-sham: http://git.io/yBU2rg");
  }

  function makeDictionary() {
    var cache = Object.create(null);
    cache["_dict"] = null;
    delete cache["_dict"];
    return cache;
  }

  Inflector.prototype = {
    /**
      @public
       As inflections can be costly, and commonly the same subset of words are repeatedly
      inflected an optional cache is provided.
       @method enableCache
    */
    enableCache() {
      this.purgeCache();

      this.singularize = function (word) {
        this._cacheUsed = true;
        return this._sCache[word] || (this._sCache[word] = this._singularize(word));
      };

      this.pluralize = function (numberOrWord, word, options = {}) {
        this._cacheUsed = true;
        var cacheKey = [numberOrWord, word, options.withoutCount];
        return this._pCache[cacheKey] || (this._pCache[cacheKey] = this._pluralize(numberOrWord, word, options));
      };
    },

    /**
      @public
       @method purgeCache
    */
    purgeCache() {
      this._cacheUsed = false;
      this._sCache = makeDictionary();
      this._pCache = makeDictionary();
    },

    /**
      @public
      disable caching
       @method disableCache;
    */
    disableCache() {
      this._sCache = null;
      this._pCache = null;

      this.singularize = function (word) {
        return this._singularize(word);
      };

      this.pluralize = function () {
        return this._pluralize(...arguments);
      };
    },

    /**
      @method plural
      @param {RegExp} regex
      @param {String} string
    */
    plural(regex, string) {
      if (this._cacheUsed) {
        this.purgeCache();
      }

      this.rules.plurals.push([regex, string.toLowerCase()]);
    },

    /**
      @method singular
      @param {RegExp} regex
      @param {String} string
    */
    singular(regex, string) {
      if (this._cacheUsed) {
        this.purgeCache();
      }

      this.rules.singular.push([regex, string.toLowerCase()]);
    },

    /**
      @method uncountable
      @param {String} regex
    */
    uncountable(string) {
      if (this._cacheUsed) {
        this.purgeCache();
      }

      loadUncountable(this.rules, [string.toLowerCase()]);
    },

    /**
      @method irregular
      @param {String} singular
      @param {String} plural
    */
    irregular(singular, plural) {
      if (this._cacheUsed) {
        this.purgeCache();
      }

      loadIrregular(this.rules, [[singular, plural]]);
    },

    /**
      @method pluralize
      @param {String} word
    */
    pluralize() {
      return this._pluralize(...arguments);
    },

    _pluralize(wordOrCount, word, options = {}) {
      if (word === undefined) {
        return this.inflect(wordOrCount, this.rules.plurals, this.rules.irregular);
      }

      if (parseFloat(wordOrCount) !== 1) {
        word = this.inflect(word, this.rules.plurals, this.rules.irregular);
      }

      return options.withoutCount ? word : `${wordOrCount} ${word}`;
    },

    /**
      @method singularize
      @param {String} word
    */
    singularize(word) {
      return this._singularize(word);
    },

    _singularize(word) {
      return this.inflect(word, this.rules.singular, this.rules.irregularInverse);
    },

    /**
      @protected
       @method inflect
      @param {String} word
      @param {Object} typeRules
      @param {Object} irregular
    */
    inflect(word, typeRules, irregular) {
      let inflection, substitution, result, lowercase, wordSplit, lastWord, isBlank, isCamelized, rule, isUncountable;
      isBlank = !word || BLANK_REGEX.test(word);
      isCamelized = CAMELIZED_REGEX.test(word);

      if (isBlank) {
        return word;
      }

      lowercase = word.toLowerCase();
      wordSplit = LAST_WORD_DASHED_REGEX.exec(word) || LAST_WORD_CAMELIZED_REGEX.exec(word);

      if (wordSplit) {
        lastWord = wordSplit[2].toLowerCase();
      }

      isUncountable = this.rules.uncountable[lowercase] || this.rules.uncountable[lastWord];

      if (isUncountable) {
        return word;
      }

      for (rule in irregular) {
        if (lowercase.match(rule + "$")) {
          substitution = irregular[rule];

          if (isCamelized && irregular[lastWord]) {
            substitution = (0, string$1.capitalize)(substitution);
            rule = (0, string$1.capitalize)(rule);
          }

          return word.replace(new RegExp(rule, "i"), substitution);
        }
      }

      for (var i = typeRules.length, min = 0; i > min; i--) {
        inflection = typeRules[i - 1];
        rule = inflection[0];

        if (rule.test(word)) {
          break;
        }
      }

      inflection = inflection || [];
      rule = inflection[0];
      substitution = inflection[1];
      result = word.replace(rule, substitution);
      return result;
    }

  };
  Inflector.defaultRules = _inflections.default;
  Inflector.inflector = new Inflector(_inflections.default);
  var _default = Inflector;
  exports.default = _default;
});
unwrapExports(inflector);
var string$2 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.pluralize = pluralize;
  exports.singularize = singularize;

  var _inflector = _interopRequireDefault(inflector);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function pluralize() {
    return _inflector.default.inflector.pluralize(...arguments);
  }

  function singularize(word) {
    return _inflector.default.inflector.singularize(word);
  }
});
unwrapExports(string$2);
var string_1$2 = string$2.pluralize;
var string_2$1 = string$2.singularize;
var system = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, "Inflector", {
    enumerable: true,
    get: function () {
      return _inflector.default;
    }
  });
  Object.defineProperty(exports, "pluralize", {
    enumerable: true,
    get: function () {
      return string$2.pluralize;
    }
  });
  Object.defineProperty(exports, "singularize", {
    enumerable: true,
    get: function () {
      return string$2.singularize;
    }
  });

  var _inflector = _interopRequireDefault(inflector);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }
});
unwrapExports(system);
var emberInflector = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, "defaultRules", {
    enumerable: true,
    get: function () {
      return system.defaultRules;
    }
  });
  Object.defineProperty(exports, "pluralize", {
    enumerable: true,
    get: function () {
      return system.pluralize;
    }
  });
  Object.defineProperty(exports, "singularize", {
    enumerable: true,
    get: function () {
      return system.singularize;
    }
  });
  exports.default = void 0;
  var _default = system.Inflector;
  exports.default = _default;
});
unwrapExports(emberInflector);
var utils$1 = createCommonjsModule(function (module, exports) {
  var __importDefault = commonjsGlobal && commonjsGlobal.__importDefault || function (mod) {
    return mod && mod.__esModule ? mod : {
      "default": mod
    };
  };

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  const ansi_colors_1 = __importDefault(ansiColors);

  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0,
            v = c === "x" ? r : r & 0x3 | 0x8;
      return v.toString(16);
    });
  }

  exports.generateUUID = generateUUID;

  function primaryKeyTypeSafetyCheck(targetPrimaryKeyType, primaryKey, modelName) {
    const primaryKeyType = typeof primaryKey;

    if (targetPrimaryKeyType === "id" && primaryKeyType !== "number") {
      throw new Error(ansi_colors_1.default.red(`[Memserver] ${modelName} model primaryKey type is 'id'. Instead you've tried to enter id: ${primaryKey} with ${primaryKeyType} type`));
    } else if (targetPrimaryKeyType === "uuid" && primaryKeyType !== "string") {
      throw new Error(ansi_colors_1.default.red(`[Memserver] ${modelName} model primaryKey type is 'uuid'. Instead you've tried to enter uuid: ${primaryKey} with ${primaryKeyType} type`));
    }

    return targetPrimaryKeyType;
  }

  exports.primaryKeyTypeSafetyCheck = primaryKeyTypeSafetyCheck;

  function insertFixturesWithTypechecks(modelDefinition, fixtures) {
    const modelPrimaryKey = fixtures.reduce((primaryKeys, fixture) => {
      const modelName = modelDefinition.name;
      const primaryKey = (fixture.uuid ? "uuid" : null) || (fixture.id ? "id" : null);

      if (!primaryKey) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] DATABASE ERROR: At least one of your ${modelName} fixtures missing a primary key. Please make sure all your ${modelName} fixtures have either id or uuid primaryKey`));
      } else if (primaryKeys.includes(fixture[primaryKey])) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] DATABASE ERROR: Duplication in ${modelName} fixtures with ${primaryKey}: ${fixture[primaryKey]}`));
      }

      modelDefinition.insert(fixture);
      return primaryKeys.concat([fixture[primaryKey]]);
    }, [])[0];
    return fixtures;
  }

  exports.insertFixturesWithTypechecks = insertFixturesWithTypechecks;
});
unwrapExports(utils$1);
var utils_1$1 = utils$1.generateUUID;
var utils_2$1 = utils$1.primaryKeyTypeSafetyCheck;
var utils_3$1 = utils$1.insertFixturesWithTypechecks;
var model = createCommonjsModule(function (module, exports) {
  var __importDefault = commonjsGlobal && commonjsGlobal.__importDefault || function (mod) {
    return mod && mod.__esModule ? mod : {
      "default": mod
    };
  };

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  const util_1 = __importDefault(util);

  const ansi_colors_1 = __importDefault(ansiColors);

  class MemServerModel {
    static get DB() {
      if (!this._DB[this.name]) {
        this._DB[this.name] = [];
        return this._DB[this.name];
      }

      return this._DB[this.name];
    }

    static get attributes() {
      if (!this._attributes[this.name]) {
        this._attributes[this.name] = [];
        this._modelDefinitions[this.name] = this;
        return this._attributes[this.name];
      }

      return this._attributes[this.name];
    }

    static set defaultAttributes(value) {
      Object.keys(value).forEach(key => {
        if (!this.attributes.includes(key)) {
          this.attributes.push(key);
        }
      });
      this._defaultAttributes = value;
    }

    static get defaultAttributes() {
      return this._defaultAttributes;
    }

    static set embedReferences(references) {
      this._embedReferences[this.name] = references;
    }

    static get embedReferences() {
      // NOTE: serializer concern
      if (!this._embedReferences[this.name]) {
        this._embedReferences[this.name] = {};
        return this._embedReferences[this.name];
      }

      return this._embedReferences[this.name];
    }

    static resetDatabase(fixtures) {
      this.DB.length = 0;
      this.attributes.length = 0;
      this.defaultAttributes = this.defaultAttributes;

      if (fixtures) {
        utils$1.insertFixturesWithTypechecks(this, fixtures);
      }

      return this.DB;
    }

    static count() {
      return this.DB.length;
    }

    static find(param) {
      // NOTE: turn param into an interface with id or uuid
      if (!param) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.find(id) cannot be called without a valid id`));
      } else if (Array.isArray(param)) {
        const models = Array.from(this.DB);
        return models.reduce((result, model) => {
          const foundModel = param.includes(model.id) ? model : null;
          return foundModel ? result.concat([foundModel]) : result;
        }, []);
      } else if (typeof param !== "number") {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.find(id) cannot be called without a valid id`));
      }

      const models = Array.from(this.DB);
      return models.find(model => model.id === param);
    }

    static findBy(options) {
      if (!options) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.findBy(id) cannot be called without a parameter`));
      }

      const keys = Object.keys(options);
      return this.DB.find(model => comparison(model, options, keys, 0));
    }

    static findAll(options = {}) {
      const models = Array.from(this.DB);
      const keys = Object.keys(options);

      if (keys.length === 0) {
        return models;
      }

      return models.filter(model => comparison(model, options, keys, 0));
    }

    static insert(options) {
      if (this.DB.length === 0) {
        const recordsPrimaryKey = this.primaryKey || (options.uuid ? "uuid" : "id");
        this.primaryKey = recordsPrimaryKey;
        this.attributes.push(this.primaryKey);
      }

      const defaultAttributes = this.attributes.reduce((result, attribute) => {
        if (attribute === this.primaryKey) {
          result[attribute] = this.primaryKey === "id" ? incrementId(this.DB) : utils$1.generateUUID();
          return result;
        }

        const target = this.defaultAttributes[attribute];
        result[attribute] = typeof target === "function" ? target() : target;
        return result;
      }, {});
      const target = Object.assign(defaultAttributes, options);
      utils$1.primaryKeyTypeSafetyCheck(this.primaryKey, target[this.primaryKey], this.name);
      const existingRecord = target.id ? this.find(target.id) : this.findBy({
        uuid: target.uuid
      });

      if (existingRecord) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name} ${this.primaryKey} ${target[this.primaryKey]} already exists in the database! ${this.name}.insert(${util_1.default.inspect(options)}) fails`));
      }

      Object.keys(target).filter(attribute => !this.attributes.includes(attribute)).forEach(attribute => this.attributes.push(attribute));
      this.DB.push(target);
      return target;
    }

    static update(record) {
      if (!record || !record.id && !record.uuid) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.update(record) requires id or uuid primary key to update a record`));
      }

      const targetRecord = record.id ? this.find(record.id) : this.findBy({
        uuid: record.uuid
      });

      if (!targetRecord) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.update(record) failed because ${this.name} with ${this.primaryKey}: ${record[this.primaryKey]} does not exist`));
      }

      const recordsUnknownAttribute = Object.keys(record).find(attribute => !this.attributes.includes(attribute));

      if (recordsUnknownAttribute) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.update ${this.primaryKey}: ${record[this.primaryKey]} fails, ${this.name} model does not have ${recordsUnknownAttribute} attribute to update`));
      }

      return Object.assign(targetRecord, record);
    }

    static delete(record) {
      if (this.DB.length === 0) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name} has no records in the database to delete. ${this.name}.delete(${util_1.default.inspect(record)}) failed`));
      } else if (!record) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.delete(model) model object parameter required to delete a model`));
      }

      const targetRecord = record.id ? this.find(record.id) : this.findBy({
        uuid: record.uuid
      });

      if (!targetRecord) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] Could not find ${this.name} with ${this.primaryKey} ${record[this.primaryKey]} to delete. ${this.name}.delete(${util_1.default.inspect(record)}) failed`));
      }

      if (Array.isArray(targetRecord)) {
        targetRecord.forEach(record => {
          const targetIndex = this.DB.indexOf(record);
          this.DB.splice(targetIndex, 1);
        });
        return targetRecord;
      }

      const targetIndex = this.DB.indexOf(targetRecord);
      this.DB.splice(targetIndex, 1);
      return targetRecord;
    }

    static embed(relationship) {
      // EXAMPLE: { comments: Comment }
      if (typeof relationship !== "object" || relationship.name) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.embed(relationshipObject) requires an object as a parameter: { relationshipKey: $RelationshipModel }`));
      }

      const key = Object.keys(relationship)[0];

      if (!relationship[key]) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.embed() fails: ${key} Model reference is not a valid. Please put a valid $ModelName to ${this.name}.embed()`));
      }

      return Object.assign(this.embedReferences, relationship);
    }

    static serializer(objectOrArray) {
      if (!objectOrArray) {
        return;
      } else if (Array.isArray(objectOrArray)) {
        return objectOrArray.map(object => this.serialize(object), []);
      }

      return this.serialize(objectOrArray);
    }

    static serialize(object) {
      // NOTE: add links object ?
      if (Array.isArray(object)) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.serialize(object) expects an object not an array. Use ${this.name}.serializer(data) for serializing array of records`));
      }

      const objectWithAllAttributes = this.attributes.reduce((result, attribute) => {
        if (result[attribute] === undefined) {
          result[attribute] = null;
        }

        return result;
      }, Object.assign({}, object));
      return Object.keys(this.embedReferences).reduce((result, embedKey) => {
        const embedModel = this.embedReferences[embedKey];
        const embeddedRecords = this.getRelationship(object, embedKey, embedModel);
        return Object.assign({}, result, {
          [embedKey]: embedModel.serializer(embeddedRecords)
        });
      }, objectWithAllAttributes);
    }

    static getRelationship(parentObject, relationshipName, relationshipModel) {
      if (Array.isArray(parentObject)) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.getRelationship expects model input to be an object not an array`));
      }

      const targetRelationshipModel = relationshipModel || this.embedReferences[relationshipName];
      const hasManyRelationship = emberInflector.pluralize(relationshipName) === relationshipName;

      if (!targetRelationshipModel) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${relationshipName} relationship could not be found on ${this.name} model. Please put the ${relationshipName} Model object as the third parameter to ${this.name}.getRelationship function`));
      } else if (hasManyRelationship) {
        if (parentObject.id) {
          const hasManyIDRecords = targetRelationshipModel.findAll({
            [`${string$1.underscore(this.name)}_id`]: parentObject.id
          });
          return hasManyIDRecords.length > 0 ? hasManyIDRecords : [];
        } else if (parentObject.uuid) {
          const hasManyUUIDRecords = targetRelationshipModel.findAll({
            [`${string$1.underscore(this.name)}_uuid`]: parentObject.uuid
          });
          return hasManyUUIDRecords.length > 0 ? hasManyUUIDRecords : [];
        }
      }

      const objectRef = parentObject[`${string$1.underscore(relationshipName)}_id`] || parentObject[`${string$1.underscore(relationshipName)}_uuid`] || parentObject[`${string$1.underscore(targetRelationshipModel.name)}_id`] || parentObject[`${string$1.underscore(targetRelationshipModel.name)}_uuid`];

      if (objectRef && typeof objectRef === "number") {
        return targetRelationshipModel.find(objectRef);
      } else if (objectRef) {
        return targetRelationshipModel.findBy({
          uuid: objectRef
        });
      }

      if (parentObject.id) {
        return targetRelationshipModel.findBy({
          [`${string$1.underscore(this.name)}_id`]: parentObject.id
        });
      } else if (parentObject.uuid) {
        return targetRelationshipModel.findBy({
          [`${string$1.underscore(this.name)}_uuid`]: parentObject.uuid
        });
      }
    }

  }

  exports.default = MemServerModel;
  MemServerModel._DB = {};
  MemServerModel._modelDefinitions = {};
  MemServerModel._attributes = {};
  MemServerModel._defaultAttributes = {}; // NOTE: probably a decorator here in future

  MemServerModel._embedReferences = {}; // NOTE: serializer concern

  MemServerModel.primaryKey = null; // NOTE: this might be problematic!!

  function incrementId(DB, Model) {
    if (!DB || DB.length === 0) {
      return 1;
    }

    const lastIdInSequence = DB.map(model => model.id).sort((a, b) => a - b).find((id, index, array) => index === array.length - 1 ? true : id + 1 !== array[index + 1]);
    return lastIdInSequence + 1;
  } // NOTE: if records were ordered by ID, then there could be performance benefit


  function comparison(model, options, keys, index = 0) {
    const key = keys[index];

    if (keys.length === index) {
      return model[key] === options[key];
    } else if (model[key] === options[key]) {
      return comparison(model, options, keys, index + 1);
    }

    return false;
  }
});
var model$1 = unwrapExports(model);
module.exports = model$1;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"_process":5,"buffer":2}],5:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[4])(4)
});


          
      return window['_memserver__model'];
    
        }

        define('memserver/model', [], vendorModule);
      })();
    

        define("memserver/response", ["exports"], function (_exports) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.default = _default;

  function _default(statusCode = 200, data = {}, headers = {}) {
    return [statusCode, Object.assign({
      'Content-Type': 'application/json'
    }, headers), JSON.stringify(data)];
  }
});

        
      ;(function() {
        function vendorModule() {
          'use strict';

          (function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g._memserver__server = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

exports.byteLength = byteLength;
exports.toByteArray = toByteArray;
exports.fromByteArray = fromByteArray;
var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i];
  revLookup[code.charCodeAt(i)] = i;
} // Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications


revLookup['-'.charCodeAt(0)] = 62;
revLookup['_'.charCodeAt(0)] = 63;

function getLens(b64) {
  var len = b64.length;

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4');
  } // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42


  var validLen = b64.indexOf('=');
  if (validLen === -1) validLen = len;
  var placeHoldersLen = validLen === len ? 0 : 4 - validLen % 4;
  return [validLen, placeHoldersLen];
} // base64 is 4/3 + up to two characters of the original data


function byteLength(b64) {
  var lens = getLens(b64);
  var validLen = lens[0];
  var placeHoldersLen = lens[1];
  return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
}

function _byteLength(b64, validLen, placeHoldersLen) {
  return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
}

function toByteArray(b64) {
  var tmp;
  var lens = getLens(b64);
  var validLen = lens[0];
  var placeHoldersLen = lens[1];
  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
  var curByte = 0; // if there are placeholders, only get up to the last complete 4 chars

  var len = placeHoldersLen > 0 ? validLen - 4 : validLen;
  var i;

  for (i = 0; i < len; i += 4) {
    tmp = revLookup[b64.charCodeAt(i)] << 18 | revLookup[b64.charCodeAt(i + 1)] << 12 | revLookup[b64.charCodeAt(i + 2)] << 6 | revLookup[b64.charCodeAt(i + 3)];
    arr[curByte++] = tmp >> 16 & 0xFF;
    arr[curByte++] = tmp >> 8 & 0xFF;
    arr[curByte++] = tmp & 0xFF;
  }

  if (placeHoldersLen === 2) {
    tmp = revLookup[b64.charCodeAt(i)] << 2 | revLookup[b64.charCodeAt(i + 1)] >> 4;
    arr[curByte++] = tmp & 0xFF;
  }

  if (placeHoldersLen === 1) {
    tmp = revLookup[b64.charCodeAt(i)] << 10 | revLookup[b64.charCodeAt(i + 1)] << 4 | revLookup[b64.charCodeAt(i + 2)] >> 2;
    arr[curByte++] = tmp >> 8 & 0xFF;
    arr[curByte++] = tmp & 0xFF;
  }

  return arr;
}

function tripletToBase64(num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
}

function encodeChunk(uint8, start, end) {
  var tmp;
  var output = [];

  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16 & 0xFF0000) + (uint8[i + 1] << 8 & 0xFF00) + (uint8[i + 2] & 0xFF);
    output.push(tripletToBase64(tmp));
  }

  return output.join('');
}

function fromByteArray(uint8) {
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes

  var parts = [];
  var maxChunkLength = 16383; // must be multiple of 3
  // go through the array every three bytes, we'll deal with trailing stuff later

  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, i + maxChunkLength > len2 ? len2 : i + maxChunkLength));
  } // pad the end with zeros, but make sure to not forget the extra bytes


  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    parts.push(lookup[tmp >> 2] + lookup[tmp << 4 & 0x3F] + '==');
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
    parts.push(lookup[tmp >> 10] + lookup[tmp >> 4 & 0x3F] + lookup[tmp << 2 & 0x3F] + '=');
  }

  return parts.join('');
}

},{}],2:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol.for === 'function')
    ? Symbol.for('nodejs.util.inspect.custom')
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    var proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof SharedArrayBuffer !== 'undefined' &&
      (isInstance(value, SharedArrayBuffer) ||
      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
var hexSliceLookupTable = (function () {
  var alphabet = '0123456789abcdef'
  var table = new Array(256)
  for (var i = 0; i < 16; ++i) {
    var i16 = i * 16
    for (var j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
"use strict";

exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? nBytes - 1 : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];
  i += d;
  e = s & (1 << -nBits) - 1;
  s >>= -nBits;
  nBits += eLen;

  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & (1 << -nBits) - 1;
  e >>= -nBits;
  nBits += mLen;

  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : (s ? -1 : 1) * Infinity;
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }

  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
  var i = isLE ? 0 : nBytes - 1;
  var d = isLE ? 1 : -1;
  var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);

    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }

    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }

    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = e << mLen | m;
  eLen += mLen;

  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128;
};

},{}],4:[function(require,module,exports){
(function (process,global,Buffer){
'use strict';

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function unwrapExports(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
  return module = {
    exports: {}
  }, fn(module, module.exports), module.exports;
}

var isBuffer = function isBuffer(arg) {
  return arg instanceof Buffer;
};

var inherits_browser = createCommonjsModule(function (module) {
  if (typeof Object.create === 'function') {
    // implementation from standard node.js 'util' module
    module.exports = function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    };
  } else {
    // old school shim for old browsers
    module.exports = function inherits(ctor, superCtor) {
      ctor.super_ = superCtor;

      var TempCtor = function () {};

      TempCtor.prototype = superCtor.prototype;
      ctor.prototype = new TempCtor();
      ctor.prototype.constructor = ctor;
    };
  }
});
var inherits = createCommonjsModule(function (module) {
  try {
    var util$1 = util;
    if (typeof util$1.inherits !== 'function') throw '';
    module.exports = util$1.inherits;
  } catch (e) {
    module.exports = inherits_browser;
  }
});
var util = createCommonjsModule(function (module, exports) {
  // Copyright Joyent, Inc. and other Node contributors.
  //
  // Permission is hereby granted, free of charge, to any person obtaining a
  // copy of this software and associated documentation files (the
  // "Software"), to deal in the Software without restriction, including
  // without limitation the rights to use, copy, modify, merge, publish,
  // distribute, sublicense, and/or sell copies of the Software, and to permit
  // persons to whom the Software is furnished to do so, subject to the
  // following conditions:
  //
  // The above copyright notice and this permission notice shall be included
  // in all copies or substantial portions of the Software.
  //
  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
  // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
  // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
  // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
  // USE OR OTHER DEALINGS IN THE SOFTWARE.
  var formatRegExp = /%[sdj%]/g;

  exports.format = function (f) {
    if (!isString(f)) {
      var objects = [];

      for (var i = 0; i < arguments.length; i++) {
        objects.push(inspect(arguments[i]));
      }

      return objects.join(' ');
    }

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function (x) {
      if (x === '%%') return '%';
      if (i >= len) return x;

      switch (x) {
        case '%s':
          return String(args[i++]);

        case '%d':
          return Number(args[i++]);

        case '%j':
          try {
            return JSON.stringify(args[i++]);
          } catch (_) {
            return '[Circular]';
          }

        default:
          return x;
      }
    });

    for (var x = args[i]; i < len; x = args[++i]) {
      if (isNull(x) || !isObject(x)) {
        str += ' ' + x;
      } else {
        str += ' ' + inspect(x);
      }
    }

    return str;
  }; // Mark that a method should not be used.
  // Returns a modified function which warns once by default.
  // If --no-deprecation is set, then it is a no-op.


  exports.deprecate = function (fn, msg) {
    // Allow for deprecating things in the process of starting up.
    if (isUndefined(commonjsGlobal.process)) {
      return function () {
        return exports.deprecate(fn, msg).apply(this, arguments);
      };
    }

    if (process.noDeprecation === true) {
      return fn;
    }

    var warned = false;

    function deprecated() {
      if (!warned) {
        if (process.throwDeprecation) {
          throw new Error(msg);
        } else if (process.traceDeprecation) {
          console.trace(msg);
        } else {
          console.error(msg);
        }

        warned = true;
      }

      return fn.apply(this, arguments);
    }

    return deprecated;
  };

  var debugs = {};
  var debugEnviron;

  exports.debuglog = function (set) {
    if (isUndefined(debugEnviron)) debugEnviron = process.env.NODE_DEBUG || '';
    set = set.toUpperCase();

    if (!debugs[set]) {
      if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
        var pid = process.pid;

        debugs[set] = function () {
          var msg = exports.format.apply(exports, arguments);
          console.error('%s %d: %s', set, pid, msg);
        };
      } else {
        debugs[set] = function () {};
      }
    }

    return debugs[set];
  };
  /**
   * Echos the value of a value. Trys to print the value out
   * in the best way possible given the different types.
   *
   * @param {Object} obj The object to print out.
   * @param {Object} opts Optional options object that alters the output.
   */

  /* legacy: obj, showHidden, depth, colors*/


  function inspect(obj, opts) {
    // default options
    var ctx = {
      seen: [],
      stylize: stylizeNoColor
    }; // legacy...

    if (arguments.length >= 3) ctx.depth = arguments[2];
    if (arguments.length >= 4) ctx.colors = arguments[3];

    if (isBoolean(opts)) {
      // legacy...
      ctx.showHidden = opts;
    } else if (opts) {
      // got an "options" object
      exports._extend(ctx, opts);
    } // set default options


    if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
    if (isUndefined(ctx.depth)) ctx.depth = 2;
    if (isUndefined(ctx.colors)) ctx.colors = false;
    if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
    if (ctx.colors) ctx.stylize = stylizeWithColor;
    return formatValue(ctx, obj, ctx.depth);
  }

  exports.inspect = inspect; // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics

  inspect.colors = {
    'bold': [1, 22],
    'italic': [3, 23],
    'underline': [4, 24],
    'inverse': [7, 27],
    'white': [37, 39],
    'grey': [90, 39],
    'black': [30, 39],
    'blue': [34, 39],
    'cyan': [36, 39],
    'green': [32, 39],
    'magenta': [35, 39],
    'red': [31, 39],
    'yellow': [33, 39]
  }; // Don't use 'blue' not visible on cmd.exe

  inspect.styles = {
    'special': 'cyan',
    'number': 'yellow',
    'boolean': 'yellow',
    'undefined': 'grey',
    'null': 'bold',
    'string': 'green',
    'date': 'magenta',
    // "name": intentionally not styling
    'regexp': 'red'
  };

  function stylizeWithColor(str, styleType) {
    var style = inspect.styles[styleType];

    if (style) {
      return '\u001b[' + inspect.colors[style][0] + 'm' + str + '\u001b[' + inspect.colors[style][1] + 'm';
    } else {
      return str;
    }
  }

  function stylizeNoColor(str, styleType) {
    return str;
  }

  function arrayToHash(array) {
    var hash = {};
    array.forEach(function (val, idx) {
      hash[val] = true;
    });
    return hash;
  }

  function formatValue(ctx, value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (ctx.customInspect && value && isFunction(value.inspect) && // Filter out the util module, it's inspect function is special
    value.inspect !== exports.inspect && // Also filter out any prototype objects using the circular check.
    !(value.constructor && value.constructor.prototype === value)) {
      var ret = value.inspect(recurseTimes, ctx);

      if (!isString(ret)) {
        ret = formatValue(ctx, ret, recurseTimes);
      }

      return ret;
    } // Primitive types cannot have properties


    var primitive = formatPrimitive(ctx, value);

    if (primitive) {
      return primitive;
    } // Look up the keys of the object.


    var keys = Object.keys(value);
    var visibleKeys = arrayToHash(keys);

    if (ctx.showHidden) {
      keys = Object.getOwnPropertyNames(value);
    } // IE doesn't make error fields non-enumerable
    // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx


    if (isError(value) && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
      return formatError(value);
    } // Some type of object without properties can be shortcutted.


    if (keys.length === 0) {
      if (isFunction(value)) {
        var name = value.name ? ': ' + value.name : '';
        return ctx.stylize('[Function' + name + ']', 'special');
      }

      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      }

      if (isDate(value)) {
        return ctx.stylize(Date.prototype.toString.call(value), 'date');
      }

      if (isError(value)) {
        return formatError(value);
      }
    }

    var base = '',
        array = false,
        braces = ['{', '}']; // Make Array say that they are Array

    if (isArray(value)) {
      array = true;
      braces = ['[', ']'];
    } // Make functions say that they are functions


    if (isFunction(value)) {
      var n = value.name ? ': ' + value.name : '';
      base = ' [Function' + n + ']';
    } // Make RegExps say that they are RegExps


    if (isRegExp(value)) {
      base = ' ' + RegExp.prototype.toString.call(value);
    } // Make dates with properties first say the date


    if (isDate(value)) {
      base = ' ' + Date.prototype.toUTCString.call(value);
    } // Make error with message first say the error


    if (isError(value)) {
      base = ' ' + formatError(value);
    }

    if (keys.length === 0 && (!array || value.length == 0)) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
      } else {
        return ctx.stylize('[Object]', 'special');
      }
    }

    ctx.seen.push(value);
    var output;

    if (array) {
      output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
    } else {
      output = keys.map(function (key) {
        return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
      });
    }

    ctx.seen.pop();
    return reduceToSingleString(output, base, braces);
  }

  function formatPrimitive(ctx, value) {
    if (isUndefined(value)) return ctx.stylize('undefined', 'undefined');

    if (isString(value)) {
      var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '').replace(/'/g, "\\'").replace(/\\"/g, '"') + '\'';
      return ctx.stylize(simple, 'string');
    }

    if (isNumber(value)) return ctx.stylize('' + value, 'number');
    if (isBoolean(value)) return ctx.stylize('' + value, 'boolean'); // For some reason typeof null is "object", so special case here.

    if (isNull(value)) return ctx.stylize('null', 'null');
  }

  function formatError(value) {
    return '[' + Error.prototype.toString.call(value) + ']';
  }

  function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
    var output = [];

    for (var i = 0, l = value.length; i < l; ++i) {
      if (hasOwnProperty(value, String(i))) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, String(i), true));
      } else {
        output.push('');
      }
    }

    keys.forEach(function (key) {
      if (!key.match(/^\d+$/)) {
        output.push(formatProperty(ctx, value, recurseTimes, visibleKeys, key, true));
      }
    });
    return output;
  }

  function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
    var name, str, desc;
    desc = Object.getOwnPropertyDescriptor(value, key) || {
      value: value[key]
    };

    if (desc.get) {
      if (desc.set) {
        str = ctx.stylize('[Getter/Setter]', 'special');
      } else {
        str = ctx.stylize('[Getter]', 'special');
      }
    } else {
      if (desc.set) {
        str = ctx.stylize('[Setter]', 'special');
      }
    }

    if (!hasOwnProperty(visibleKeys, key)) {
      name = '[' + key + ']';
    }

    if (!str) {
      if (ctx.seen.indexOf(desc.value) < 0) {
        if (isNull(recurseTimes)) {
          str = formatValue(ctx, desc.value, null);
        } else {
          str = formatValue(ctx, desc.value, recurseTimes - 1);
        }

        if (str.indexOf('\n') > -1) {
          if (array) {
            str = str.split('\n').map(function (line) {
              return '  ' + line;
            }).join('\n').substr(2);
          } else {
            str = '\n' + str.split('\n').map(function (line) {
              return '   ' + line;
            }).join('\n');
          }
        }
      } else {
        str = ctx.stylize('[Circular]', 'special');
      }
    }

    if (isUndefined(name)) {
      if (array && key.match(/^\d+$/)) {
        return str;
      }

      name = JSON.stringify('' + key);

      if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
        name = name.substr(1, name.length - 2);
        name = ctx.stylize(name, 'name');
      } else {
        name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
        name = ctx.stylize(name, 'string');
      }
    }

    return name + ': ' + str;
  }

  function reduceToSingleString(output, base, braces) {
    var length = output.reduce(function (prev, cur) {
      if (cur.indexOf('\n') >= 0) ;
      return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
    }, 0);

    if (length > 60) {
      return braces[0] + (base === '' ? '' : base + '\n ') + ' ' + output.join(',\n  ') + ' ' + braces[1];
    }

    return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
  } // NOTE: These type checking functions intentionally don't use `instanceof`
  // because it is fragile and can be easily faked with `Object.create()`.


  function isArray(ar) {
    return Array.isArray(ar);
  }

  exports.isArray = isArray;

  function isBoolean(arg) {
    return typeof arg === 'boolean';
  }

  exports.isBoolean = isBoolean;

  function isNull(arg) {
    return arg === null;
  }

  exports.isNull = isNull;

  function isNullOrUndefined(arg) {
    return arg == null;
  }

  exports.isNullOrUndefined = isNullOrUndefined;

  function isNumber(arg) {
    return typeof arg === 'number';
  }

  exports.isNumber = isNumber;

  function isString(arg) {
    return typeof arg === 'string';
  }

  exports.isString = isString;

  function isSymbol(arg) {
    return typeof arg === 'symbol';
  }

  exports.isSymbol = isSymbol;

  function isUndefined(arg) {
    return arg === void 0;
  }

  exports.isUndefined = isUndefined;

  function isRegExp(re) {
    return isObject(re) && objectToString(re) === '[object RegExp]';
  }

  exports.isRegExp = isRegExp;

  function isObject(arg) {
    return typeof arg === 'object' && arg !== null;
  }

  exports.isObject = isObject;

  function isDate(d) {
    return isObject(d) && objectToString(d) === '[object Date]';
  }

  exports.isDate = isDate;

  function isError(e) {
    return isObject(e) && (objectToString(e) === '[object Error]' || e instanceof Error);
  }

  exports.isError = isError;

  function isFunction(arg) {
    return typeof arg === 'function';
  }

  exports.isFunction = isFunction;

  function isPrimitive(arg) {
    return arg === null || typeof arg === 'boolean' || typeof arg === 'number' || typeof arg === 'string' || typeof arg === 'symbol' || // ES6 symbol
    typeof arg === 'undefined';
  }

  exports.isPrimitive = isPrimitive;
  exports.isBuffer = isBuffer;

  function objectToString(o) {
    return Object.prototype.toString.call(o);
  }

  function pad(n) {
    return n < 10 ? '0' + n.toString(10) : n.toString(10);
  }

  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; // 26 Feb 16:19:34

  function timestamp() {
    var d = new Date();
    var time = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join(':');
    return [d.getDate(), months[d.getMonth()], time].join(' ');
  } // log is just a thin wrapper to console.log that prepends a timestamp


  exports.log = function () {
    console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
  };
  /**
   * Inherit the prototype methods from one constructor into another.
   *
   * The Function.prototype.inherits from lang.js rewritten as a standalone
   * function (not on Function.prototype). NOTE: If this file is to be loaded
   * during bootstrapping this function needs to be rewritten using some native
   * functions as prototype setup using normal JavaScript does not work as
   * expected during bootstrapping (see mirror.js in r114903).
   *
   * @param {function} ctor Constructor function which needs to inherit the
   *     prototype.
   * @param {function} superCtor Constructor function to inherit prototype from.
   */


  exports.inherits = inherits;

  exports._extend = function (origin, add) {
    // Don't do anything if add isn't an object
    if (!add || !isObject(add)) return origin;
    var keys = Object.keys(add);
    var i = keys.length;

    while (i--) {
      origin[keys[i]] = add[keys[i]];
    }

    return origin;
  };

  function hasOwnProperty(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  }
});
var util_1 = util.format;
var util_2 = util.deprecate;
var util_3 = util.debuglog;
var util_4 = util.inspect;
var util_5 = util.isArray;
var util_6 = util.isBoolean;
var util_7 = util.isNull;
var util_8 = util.isNullOrUndefined;
var util_9 = util.isNumber;
var util_10 = util.isString;
var util_11 = util.isSymbol;
var util_12 = util.isUndefined;
var util_13 = util.isRegExp;
var util_14 = util.isObject;
var util_15 = util.isDate;
var util_16 = util.isError;
var util_17 = util.isFunction;
var util_18 = util.isPrimitive;
var util_19 = util.isBuffer;
var util_20 = util.log;
var util_21 = util.inherits;
var util_22 = util._extend;
var symbols = createCommonjsModule(function (module) {
  const isHyper = process.env.TERM_PROGRAM === 'Hyper';
  const isWindows = process.platform === 'win32';
  const isLinux = process.platform === 'linux';
  const common = {
    ballotDisabled: '☒',
    ballotOff: '☐',
    ballotOn: '☑',
    bullet: '•',
    bulletWhite: '◦',
    fullBlock: '█',
    heart: '❤',
    identicalTo: '≡',
    line: '─',
    mark: '※',
    middot: '·',
    minus: '－',
    multiplication: '×',
    obelus: '÷',
    pencilDownRight: '✎',
    pencilRight: '✏',
    pencilUpRight: '✐',
    percent: '%',
    pilcrow2: '❡',
    pilcrow: '¶',
    plusMinus: '±',
    section: '§',
    starsOff: '☆',
    starsOn: '★',
    upDownArrow: '↕'
  };
  const windows = Object.assign({}, common, {
    check: '√',
    cross: '×',
    ellipsisLarge: '...',
    ellipsis: '...',
    info: 'i',
    question: '?',
    questionSmall: '?',
    pointer: '>',
    pointerSmall: '»',
    radioOff: '( )',
    radioOn: '(*)',
    warning: '‼'
  });
  const other = Object.assign({}, common, {
    ballotCross: '✘',
    check: '✔',
    cross: '✖',
    ellipsisLarge: '⋯',
    ellipsis: '…',
    info: 'ℹ',
    question: '?',
    questionFull: '？',
    questionSmall: '﹖',
    pointer: isLinux ? '▸' : '❯',
    pointerSmall: isLinux ? '‣' : '›',
    radioOff: '◯',
    radioOn: '◉',
    warning: '⚠'
  });
  module.exports = isWindows && !isHyper ? windows : other;
  Reflect.defineProperty(module.exports, 'common', {
    enumerable: false,
    value: common
  });
  Reflect.defineProperty(module.exports, 'windows', {
    enumerable: false,
    value: windows
  });
  Reflect.defineProperty(module.exports, 'other', {
    enumerable: false,
    value: other
  });
});

const isObject = val => val !== null && typeof val === 'object' && !Array.isArray(val);
/* eslint-disable no-control-regex */
// this is a modified version of https://github.com/chalk/ansi-regex (MIT License)


const ANSI_REGEX = /[\u001b\u009b][[\]#;?()]*(?:(?:(?:[^\W_]*;?[^\W_]*)\u0007)|(?:(?:[0-9]{1,4}(;[0-9]{0,4})*)?[~0-9=<>cf-nqrtyA-PRZ]))/g;

const create = () => {
  const colors = {
    enabled: true,
    visible: true,
    styles: {},
    keys: {}
  };

  if ('FORCE_COLOR' in process.env) {
    colors.enabled = process.env.FORCE_COLOR !== '0';
  }

  const ansi = style => {
    let open = style.open = `\u001b[${style.codes[0]}m`;
    let close = style.close = `\u001b[${style.codes[1]}m`;
    let regex = style.regex = new RegExp(`\\u001b\\[${style.codes[1]}m`, 'g');

    style.wrap = (input, newline) => {
      if (input.includes(close)) input = input.replace(regex, close + open);
      let output = open + input + close; // see https://github.com/chalk/chalk/pull/92, thanks to the
      // chalk contributors for this fix. However, we've confirmed that
      // this issue is also present in Windows terminals

      return newline ? output.replace(/\r*\n/g, `${close}$&${open}`) : output;
    };

    return style;
  };

  const wrap = (style, input, newline) => {
    return typeof style === 'function' ? style(input) : style.wrap(input, newline);
  };

  const style = (input, stack) => {
    if (input === '' || input == null) return '';
    if (colors.enabled === false) return input;
    if (colors.visible === false) return '';
    let str = '' + input;
    let nl = str.includes('\n');
    let n = stack.length;

    if (n > 0 && stack.includes('unstyle')) {
      stack = [...new Set(['unstyle', ...stack])].reverse();
    }

    while (n-- > 0) str = wrap(colors.styles[stack[n]], str, nl);

    return str;
  };

  const define = (name, codes, type) => {
    colors.styles[name] = ansi({
      name,
      codes
    });
    let keys = colors.keys[type] || (colors.keys[type] = []);
    keys.push(name);
    Reflect.defineProperty(colors, name, {
      configurable: true,
      enumerable: true,

      set(value) {
        colors.alias(name, value);
      },

      get() {
        let color = input => style(input, color.stack);

        Reflect.setPrototypeOf(color, colors);
        color.stack = this.stack ? this.stack.concat(name) : [name];
        return color;
      }

    });
  };

  define('reset', [0, 0], 'modifier');
  define('bold', [1, 22], 'modifier');
  define('dim', [2, 22], 'modifier');
  define('italic', [3, 23], 'modifier');
  define('underline', [4, 24], 'modifier');
  define('inverse', [7, 27], 'modifier');
  define('hidden', [8, 28], 'modifier');
  define('strikethrough', [9, 29], 'modifier');
  define('black', [30, 39], 'color');
  define('red', [31, 39], 'color');
  define('green', [32, 39], 'color');
  define('yellow', [33, 39], 'color');
  define('blue', [34, 39], 'color');
  define('magenta', [35, 39], 'color');
  define('cyan', [36, 39], 'color');
  define('white', [37, 39], 'color');
  define('gray', [90, 39], 'color');
  define('grey', [90, 39], 'color');
  define('bgBlack', [40, 49], 'bg');
  define('bgRed', [41, 49], 'bg');
  define('bgGreen', [42, 49], 'bg');
  define('bgYellow', [43, 49], 'bg');
  define('bgBlue', [44, 49], 'bg');
  define('bgMagenta', [45, 49], 'bg');
  define('bgCyan', [46, 49], 'bg');
  define('bgWhite', [47, 49], 'bg');
  define('blackBright', [90, 39], 'bright');
  define('redBright', [91, 39], 'bright');
  define('greenBright', [92, 39], 'bright');
  define('yellowBright', [93, 39], 'bright');
  define('blueBright', [94, 39], 'bright');
  define('magentaBright', [95, 39], 'bright');
  define('cyanBright', [96, 39], 'bright');
  define('whiteBright', [97, 39], 'bright');
  define('bgBlackBright', [100, 49], 'bgBright');
  define('bgRedBright', [101, 49], 'bgBright');
  define('bgGreenBright', [102, 49], 'bgBright');
  define('bgYellowBright', [103, 49], 'bgBright');
  define('bgBlueBright', [104, 49], 'bgBright');
  define('bgMagentaBright', [105, 49], 'bgBright');
  define('bgCyanBright', [106, 49], 'bgBright');
  define('bgWhiteBright', [107, 49], 'bgBright');
  colors.ansiRegex = ANSI_REGEX;

  colors.hasColor = colors.hasAnsi = str => {
    colors.ansiRegex.lastIndex = 0;
    return typeof str === 'string' && str !== '' && colors.ansiRegex.test(str);
  };

  colors.alias = (name, color) => {
    let fn = typeof color === 'string' ? colors[color] : color;

    if (typeof fn !== 'function') {
      throw new TypeError('Expected alias to be the name of an existing color (string) or a function');
    }

    if (!fn.stack) {
      Reflect.defineProperty(fn, 'name', {
        value: name
      });
      colors.styles[name] = fn;
      fn.stack = [name];
    }

    Reflect.defineProperty(colors, name, {
      configurable: true,
      enumerable: true,

      set(value) {
        colors.alias(name, value);
      },

      get() {
        let color = input => style(input, color.stack);

        Reflect.setPrototypeOf(color, colors);
        color.stack = this.stack ? this.stack.concat(fn.stack) : fn.stack;
        return color;
      }

    });
  };

  colors.theme = custom => {
    if (!isObject(custom)) throw new TypeError('Expected theme to be an object');

    for (let name of Object.keys(custom)) {
      colors.alias(name, custom[name]);
    }

    return colors;
  };

  colors.alias('unstyle', str => {
    if (typeof str === 'string' && str !== '') {
      colors.ansiRegex.lastIndex = 0;
      return str.replace(colors.ansiRegex, '');
    }

    return '';
  });
  colors.alias('noop', str => str);
  colors.none = colors.clear = colors.noop;
  colors.stripColor = colors.unstyle;
  colors.symbols = symbols;
  colors.define = define;
  return colors;
};

var ansiColors = create();
var create_1 = create;
ansiColors.create = create_1;
var string_registry = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.setStrings = setStrings;
  exports.getStrings = getStrings;
  exports.getString = getString; // STATE within a module is frowned upon, this exists
  // to support Ember.STRINGS but shield ember internals from this legacy global
  // API.

  let STRINGS = {};

  function setStrings(strings) {
    STRINGS = strings;
  }

  function getStrings() {
    return STRINGS;
  }

  function getString(name) {
    return STRINGS[name];
  }
});
unwrapExports(string_registry);
var string_registry_1 = string_registry.setStrings;
var string_registry_2 = string_registry.getStrings;
var string_registry_3 = string_registry.getString;
var browserEnvironment = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.hasDOM = exports.isFirefox = exports.isChrome = exports.userAgent = exports.history = exports.location = exports.window = void 0; // check if window exists and actually is the global

  var hasDom = typeof self === 'object' && self !== null && self.Object === Object && typeof Window !== 'undefined' && self.constructor === Window && typeof document === 'object' && document !== null && self.document === document && typeof location === 'object' && location !== null && self.location === location && typeof history === 'object' && history !== null && self.history === history && typeof navigator === 'object' && navigator !== null && self.navigator === navigator && typeof navigator.userAgent === 'string';
  exports.hasDOM = hasDom;
  const window = hasDom ? self : null;
  exports.window = window;
  const location$1 = hasDom ? self.location : null;
  exports.location = location$1;
  const history$1 = hasDom ? self.history : null;
  exports.history = history$1;
  const userAgent = hasDom ? self.navigator.userAgent : 'Lynx (textmode)';
  exports.userAgent = userAgent;
  const isChrome = hasDom ? Boolean(window.chrome) && !window.opera : false;
  exports.isChrome = isChrome;
  const isFirefox = hasDom ? typeof InstallTrigger !== 'undefined' : false;
  exports.isFirefox = isFirefox;
});
unwrapExports(browserEnvironment);
var browserEnvironment_1 = browserEnvironment.hasDOM;
var browserEnvironment_2 = browserEnvironment.isFirefox;
var browserEnvironment_3 = browserEnvironment.isChrome;
var browserEnvironment_4 = browserEnvironment.userAgent;
var browserEnvironment_5 = browserEnvironment.history;
var browserEnvironment_6 = browserEnvironment.window;
var error = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = void 0;
  /**
   @module @ember/error
  */

  /**
    The JavaScript Error object used by Ember.assert.
  
    @class Error
    @namespace Ember
    @extends Error
    @constructor
    @public
  */

  var _default = Error;
  exports.default = _default;
});
unwrapExports(error);
var es5 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var DEBUG = exports.DEBUG = false;
  var CI = exports.CI = false;
});
unwrapExports(es5);
var es5_1 = es5.DEBUG;
var es5_2 = es5.CI;
var handlers = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.invoke = exports.registerHandler = exports.HANDLERS = void 0;
  let HANDLERS = {};
  exports.HANDLERS = HANDLERS;

  let registerHandler = () => {};

  exports.registerHandler = registerHandler;

  let invoke = () => {};

  exports.invoke = invoke;

  if (es5.DEBUG) {
    exports.registerHandler = registerHandler = function registerHandler(type, callback) {
      let nextHandler = HANDLERS[type] || (() => {});

      HANDLERS[type] = (message, options) => {
        callback(message, options, nextHandler);
      };
    };

    exports.invoke = invoke = function invoke(type, message, test, options) {
      if (test) {
        return;
      }

      let handlerForType = HANDLERS[type];

      if (handlerForType) {
        handlerForType(message, options);
      }
    };
  }
});
unwrapExports(handlers);
var handlers_1 = handlers.invoke;
var handlers_2 = handlers.registerHandler;
var handlers_3 = handlers.HANDLERS;
var deprecate_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.missingOptionsUntilDeprecation = exports.missingOptionsIdDeprecation = exports.missingOptionsDeprecation = exports.registerHandler = exports.default = void 0;
  /**
   @module @ember/debug
   @public
  */

  /**
    Allows for runtime registration of handler functions that override the default deprecation behavior.
    Deprecations are invoked by calls to [@ember/debug/deprecate](/ember/release/classes/@ember%2Fdebug/methods/deprecate?anchor=deprecate).
    The following example demonstrates its usage by registering a handler that throws an error if the
    message contains the word "should", otherwise defers to the default handler.
  
    ```javascript
    import { registerDeprecationHandler } from '@ember/debug';
  
    registerDeprecationHandler((message, options, next) => {
      if (message.indexOf('should') !== -1) {
        throw new Error(`Deprecation message with should: ${message}`);
      } else {
        // defer to whatever handler was registered before this one
        next(message, options);
      }
    });
    ```
  
    The handler function takes the following arguments:
  
    <ul>
      <li> <code>message</code> - The message received from the deprecation call.</li>
      <li> <code>options</code> - An object passed in with the deprecation call containing additional information including:</li>
        <ul>
          <li> <code>id</code> - An id of the deprecation in the form of <code>package-name.specific-deprecation</code>.</li>
          <li> <code>until</code> - The Ember version number the feature and deprecation will be removed in.</li>
        </ul>
      <li> <code>next</code> - A function that calls into the previously registered handler.</li>
    </ul>
  
    @public
    @static
    @method registerDeprecationHandler
    @for @ember/debug
    @param handler {Function} A function to handle deprecation calls.
    @since 2.1.0
  */

  let registerHandler = () => {};

  exports.registerHandler = registerHandler;
  let missingOptionsDeprecation;
  exports.missingOptionsDeprecation = missingOptionsDeprecation;
  let missingOptionsIdDeprecation;
  exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation;
  let missingOptionsUntilDeprecation;
  exports.missingOptionsUntilDeprecation = missingOptionsUntilDeprecation;

  let deprecate = () => {};

  if (es5.DEBUG) {
    exports.registerHandler = registerHandler = function registerHandler(handler) {
      (0, handlers.registerHandler)('deprecate', handler);
    };

    let formatMessage = function formatMessage(_message, options) {
      let message = _message;

      if (options && options.id) {
        message = message + ` [deprecation id: ${options.id}]`;
      }

      if (options && options.url) {
        message += ` See ${options.url} for more details.`;
      }

      return message;
    };

    registerHandler(function logDeprecationToConsole(message, options) {
      let updatedMessage = formatMessage(message, options);
      console.warn(`DEPRECATION: ${updatedMessage}`); // eslint-disable-line no-console
    });
    let captureErrorForStack;

    if (new Error().stack) {
      captureErrorForStack = () => new Error();
    } else {
      captureErrorForStack = () => {
        try {
          __fail__.fail();
        } catch (e) {
          return e;
        }
      };
    }

    registerHandler(function logDeprecationStackTrace(message, options, next) {
      if (environment.ENV.LOG_STACKTRACE_ON_DEPRECATION) {
        let stackStr = '';
        let error = captureErrorForStack();
        let stack;

        if (error.stack) {
          if (error['arguments']) {
            // Chrome
            stack = error.stack.replace(/^\s+at\s+/gm, '').replace(/^([^\(]+?)([\n$])/gm, '{anonymous}($1)$2').replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}($1)').split('\n');
            stack.shift();
          } else {
            // Firefox
            stack = error.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^\(/gm, '{anonymous}(').split('\n');
          }

          stackStr = `\n    ${stack.slice(2).join('\n    ')}`;
        }

        let updatedMessage = formatMessage(message, options);
        console.warn(`DEPRECATION: ${updatedMessage}${stackStr}`); // eslint-disable-line no-console
      } else {
        next(message, options);
      }
    });
    registerHandler(function raiseOnDeprecation(message, options, next) {
      if (environment.ENV.RAISE_ON_DEPRECATION) {
        let updatedMessage = formatMessage(message);
        throw new Error(updatedMessage);
      } else {
        next(message, options);
      }
    });
    exports.missingOptionsDeprecation = missingOptionsDeprecation = 'When calling `deprecate` you ' + 'must provide an `options` hash as the third parameter.  ' + '`options` should include `id` and `until` properties.';
    exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation = 'When calling `deprecate` you must provide `id` in options.';
    exports.missingOptionsUntilDeprecation = missingOptionsUntilDeprecation = 'When calling `deprecate` you must provide `until` in options.';
    /**
     @module @ember/debug
     @public
     */

    /**
      Display a deprecation warning with the provided message and a stack trace
      (Chrome and Firefox only).
         * In a production build, this method is defined as an empty function (NOP).
      Uses of this method in Ember itself are stripped from the ember.prod.js build.
         @method deprecate
      @for @ember/debug
      @param {String} message A description of the deprecation.
      @param {Boolean} test A boolean. If falsy, the deprecation will be displayed.
      @param {Object} options
      @param {String} options.id A unique id for this deprecation. The id can be
        used by Ember debugging tools to change the behavior (raise, log or silence)
        for that specific deprecation. The id should be namespaced by dots, e.g.
        "view.helper.select".
      @param {string} options.until The version of Ember when this deprecation
        warning will be removed.
      @param {String} [options.url] An optional url to the transition guide on the
        emberjs.com website.
      @static
      @public
      @since 1.0.0
    */

    deprecate = function deprecate(message, test, options) {
      (0, debug_1.assert)(missingOptionsDeprecation, Boolean(options && (options.id || options.until)));
      (0, debug_1.assert)(missingOptionsIdDeprecation, Boolean(options.id));
      (0, debug_1.assert)(missingOptionsUntilDeprecation, Boolean(options.until));
      (0, handlers.invoke)('deprecate', message, test, options);
    };
  }

  var _default = deprecate;
  exports.default = _default;
});
unwrapExports(deprecate_1);
var deprecate_2 = deprecate_1.missingOptionsUntilDeprecation;
var deprecate_3 = deprecate_1.missingOptionsIdDeprecation;
var deprecate_4 = deprecate_1.missingOptionsDeprecation;
var deprecate_5 = deprecate_1.registerHandler;
var testing_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.isTesting = isTesting;
  exports.setTesting = setTesting;
  let testing = false;

  function isTesting() {
    return testing;
  }

  function setTesting(value) {
    testing = Boolean(value);
  }
});
unwrapExports(testing_1);
var testing_2 = testing_1.isTesting;
var testing_3 = testing_1.setTesting;
var warn_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.missingOptionsDeprecation = exports.missingOptionsIdDeprecation = exports.registerHandler = exports.default = void 0;

  let registerHandler = () => {};

  exports.registerHandler = registerHandler;

  let warn = () => {};

  let missingOptionsDeprecation;
  exports.missingOptionsDeprecation = missingOptionsDeprecation;
  let missingOptionsIdDeprecation;
  /**
  @module @ember/debug
  */

  exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation;

  if (es5.DEBUG) {
    /**
      Allows for runtime registration of handler functions that override the default warning behavior.
      Warnings are invoked by calls made to [@ember/debug/warn](/ember/release/classes/@ember%2Fdebug/methods/warn?anchor=warn).
      The following example demonstrates its usage by registering a handler that does nothing overriding Ember's
      default warning behavior.
         ```javascript
      import { registerWarnHandler } from '@ember/debug';
         // next is not called, so no warnings get the default behavior
      registerWarnHandler(() => {});
      ```
         The handler function takes the following arguments:
         <ul>
        <li> <code>message</code> - The message received from the warn call. </li>
        <li> <code>options</code> - An object passed in with the warn call containing additional information including:</li>
          <ul>
            <li> <code>id</code> - An id of the warning in the form of <code>package-name.specific-warning</code>.</li>
          </ul>
        <li> <code>next</code> - A function that calls into the previously registered handler.</li>
      </ul>
         @public
      @static
      @method registerWarnHandler
      @for @ember/debug
      @param handler {Function} A function to handle warnings.
      @since 2.1.0
    */
    exports.registerHandler = registerHandler = function registerHandler(handler) {
      (0, handlers.registerHandler)('warn', handler);
    };

    registerHandler(function logWarning(message) {
      /* eslint-disable no-console */
      console.warn(`WARNING: ${message}`);
      /* eslint-enable no-console */
    });
    exports.missingOptionsDeprecation = missingOptionsDeprecation = 'When calling `warn` you ' + 'must provide an `options` hash as the third parameter.  ' + '`options` should include an `id` property.';
    exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation = 'When calling `warn` you must provide `id` in options.';
    /**
      Display a warning with the provided message.
         * In a production build, this method is defined as an empty function (NOP).
      Uses of this method in Ember itself are stripped from the ember.prod.js build.
         ```javascript
      import { warn } from '@ember/debug';
      import tomsterCount from './tomster-counter'; // a module in my project
         // Log a warning if we have more than 3 tomsters
      warn('Too many tomsters!', tomsterCount <= 3, {
        id: 'ember-debug.too-many-tomsters'
      });
      ```
         @method warn
      @for @ember/debug
      @static
      @param {String} message A warning to display.
      @param {Boolean} test An optional boolean. If falsy, the warning
        will be displayed.
      @param {Object} options An object that can be used to pass a unique
        `id` for this warning.  The `id` can be used by Ember debugging tools
        to change the behavior (raise, log, or silence) for that specific warning.
        The `id` should be namespaced by dots, e.g. "ember-debug.feature-flag-with-features-stripped"
      @public
      @since 1.0.0
    */

    warn = function warn(message, test, options) {
      if (arguments.length === 2 && typeof test === 'object') {
        options = test;
        test = false;
      }

      (0, debug_1.assert)(missingOptionsDeprecation, Boolean(options));
      (0, debug_1.assert)(missingOptionsIdDeprecation, Boolean(options && options.id));
      (0, handlers.invoke)('warn', message, test, options);
    };
  }

  var _default = warn;
  exports.default = _default;
});
unwrapExports(warn_1);
var warn_2 = warn_1.missingOptionsDeprecation;
var warn_3 = warn_1.missingOptionsIdDeprecation;
var warn_4 = warn_1.registerHandler;
var arrayUtils = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var EMPTY_ARRAY = exports.EMPTY_ARRAY = Object.freeze([]);
});
unwrapExports(arrayUtils);
var arrayUtils_1 = arrayUtils.EMPTY_ARRAY;
var assert = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.debugAssert = debugAssert;
  exports.prodAssert = prodAssert;
  exports.deprecate = deprecate; // import Logger from './logger';
  // let alreadyWarned = false;

  function debugAssert(test, msg) {
    // if (!alreadyWarned) {
    //   alreadyWarned = true;
    //   Logger.warn("Don't leave debug assertions on in public builds");
    // }
    if (!test) {
      throw new Error(msg || 'assertion failure');
    }
  }

  function prodAssert() {}

  function deprecate(desc) {
    console.warn('DEPRECATION: ' + desc);
  }

  exports.default = debugAssert;
});
unwrapExports(assert);
var assert_1 = assert.debugAssert;
var assert_2 = assert.prodAssert;
var assert_3 = assert.deprecate;
var guid = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.initializeGuid = initializeGuid;
  exports.ensureGuid = ensureGuid;
  var GUID = 0;

  function initializeGuid(object) {
    return object._guid = ++GUID;
  }

  function ensureGuid(object) {
    return object._guid || initializeGuid(object);
  }
});
unwrapExports(guid);
var guid_1 = guid.initializeGuid;
var guid_2 = guid.ensureGuid;
var collections = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.StackImpl = exports.DictSet = undefined;
  exports.dict = dict;
  exports.isDict = isDict;
  exports.isObject = isObject;

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function dict() {
    return Object.create(null);
  }

  function isDict(u) {
    return u !== null && u !== undefined;
  }

  function isObject(u) {
    return typeof u === 'object' && u !== null;
  }

  var DictSet = exports.DictSet = function () {
    function DictSet() {
      _classCallCheck(this, DictSet);

      this.dict = dict();
    }

    DictSet.prototype.add = function add(obj) {
      if (typeof obj === 'string') this.dict[obj] = obj;else this.dict[(0, guid.ensureGuid)(obj)] = obj;
      return this;
    };

    DictSet.prototype.delete = function _delete(obj) {
      if (typeof obj === 'string') delete this.dict[obj];else if (obj._guid) delete this.dict[obj._guid];
    };

    return DictSet;
  }();

  var StackImpl = exports.StackImpl = function () {
    function StackImpl() {
      _classCallCheck(this, StackImpl);

      this.stack = [];
      this.current = null;
    }

    StackImpl.prototype.push = function push(item) {
      this.current = item;
      this.stack.push(item);
    };

    StackImpl.prototype.pop = function pop() {
      var item = this.stack.pop();
      var len = this.stack.length;
      this.current = len === 0 ? null : this.stack[len - 1];
      return item === undefined ? null : item;
    };

    StackImpl.prototype.nth = function nth(from) {
      var len = this.stack.length;
      return len < from ? null : this.stack[len - from];
    };

    StackImpl.prototype.isEmpty = function isEmpty() {
      return this.stack.length === 0;
    };

    StackImpl.prototype.toArray = function toArray() {
      return this.stack;
    };

    _createClass(StackImpl, [{
      key: 'size',
      get: function get() {
        return this.stack.length;
      }
    }]);

    return StackImpl;
  }();
});
unwrapExports(collections);
var collections_1 = collections.StackImpl;
var collections_2 = collections.DictSet;
var collections_3 = collections.dict;
var collections_4 = collections.isDict;
var collections_5 = collections.isObject;
var destroy = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.isDestroyable = isDestroyable;
  exports.isStringDestroyable = isStringDestroyable;
  var DESTROY = exports.DESTROY = 'DESTROY [fc611582-3742-4845-88e1-971c3775e0b8]';

  function isDestroyable(value) {
    return !!(value && DESTROY in value);
  }

  function isStringDestroyable(value) {
    return !!(value && typeof value === 'object' && typeof value.destroy === 'function');
  }
});
unwrapExports(destroy);
var destroy_1 = destroy.isDestroyable;
var destroy_2 = destroy.isStringDestroyable;
var destroy_3 = destroy.DESTROY;
var dom = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.clearElement = clearElement;

  function clearElement(parent) {
    var current = parent.firstChild;

    while (current) {
      var next = current.nextSibling;
      parent.removeChild(current);
      current = next;
    }
  }
});
unwrapExports(dom);
var dom_1 = dom.clearElement;
var isSerializationFirstNode_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.isSerializationFirstNode = isSerializationFirstNode;
  var SERIALIZATION_FIRST_NODE_STRING = exports.SERIALIZATION_FIRST_NODE_STRING = '%+b:0%';

  function isSerializationFirstNode(node) {
    return node.nodeValue === SERIALIZATION_FIRST_NODE_STRING;
  }
});
unwrapExports(isSerializationFirstNode_1);
var isSerializationFirstNode_2 = isSerializationFirstNode_1.isSerializationFirstNode;
var isSerializationFirstNode_3 = isSerializationFirstNode_1.SERIALIZATION_FIRST_NODE_STRING;
var lifetimes = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.ListContentsDestructor = exports.DESTRUCTORS = exports.CHILDREN = exports.DROP = exports.LINKED = undefined;
  exports.isDrop = isDrop;
  exports.associate = associate;
  exports.associateDestructor = associateDestructor;
  exports.takeAssociated = takeAssociated;
  exports.destroyAssociated = destroyAssociated;
  exports.destructor = destructor;
  exports.snapshot = snapshot;
  exports.debugDropTree = debugDropTree;
  exports.printDropTree = printDropTree;
  exports.printDrop = printDrop;

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var LINKED = exports.LINKED = new WeakMap();
  var DROP = exports.DROP = 'DROP [94d46cf3-3974-435d-b278-3e60d1155290]';
  var CHILDREN = exports.CHILDREN = 'CHILDREN [7142e52a-8600-4e01-a773-42055b96630d]';
  var DESTRUCTORS = exports.DESTRUCTORS = new WeakMap();

  function isDrop(value) {
    if (value === null || typeof value !== 'object') return false;
    return DROP in value;
  }

  function associate(parent, child) {
    associateDestructor(parent, destructor(child));
  }

  function associateDestructor(parent, child) {
    var associated = LINKED.get(parent);

    if (!associated) {
      associated = new Set();
      LINKED.set(parent, associated);
    }

    associated.add(child);
  }

  function takeAssociated(parent) {
    var linked = LINKED.get(parent);

    if (linked && linked.size > 0) {
      LINKED.delete(parent);
      return linked;
    } else {
      return null;
    }
  }

  function destroyAssociated(parent) {
    var associated = LINKED.get(parent);

    if (associated) {
      associated.forEach(function (item) {
        item[DROP]();
        associated.delete(item);
      });
    }
  }

  function destructor(value) {
    var d = DESTRUCTORS.get(value);

    if (!d) {
      if ((0, destroy.isDestroyable)(value)) {
        d = new DestroyableDestructor(value);
      } else if ((0, destroy.isStringDestroyable)(value)) {
        d = new StringDestroyableDestructor(value);
      } else {
        d = new SimpleDestructor(value);
      }

      DESTRUCTORS.set(value, d);
    }

    return d;
  }

  function snapshot(values) {
    return new SnapshotDestructor(values);
  }

  var SnapshotDestructor = function () {
    function SnapshotDestructor(destructors) {
      _classCallCheck(this, SnapshotDestructor);

      this.destructors = destructors;
    }

    SnapshotDestructor.prototype[DROP] = function () {
      this.destructors.forEach(function (item) {
        return item[DROP]();
      });
    };

    SnapshotDestructor.prototype.toString = function toString() {
      return 'SnapshotDestructor';
    };

    _createClass(SnapshotDestructor, [{
      key: CHILDREN,
      get: function get() {
        return this.destructors;
      }
    }]);

    return SnapshotDestructor;
  }();

  var DestroyableDestructor = function () {
    function DestroyableDestructor(inner) {
      _classCallCheck(this, DestroyableDestructor);

      this.inner = inner;
    }

    DestroyableDestructor.prototype[DROP] = function () {
      this.inner[destroy.DESTROY]();
      destroyAssociated(this.inner);
    };

    DestroyableDestructor.prototype.toString = function toString() {
      return 'DestroyableDestructor';
    };

    _createClass(DestroyableDestructor, [{
      key: CHILDREN,
      get: function get() {
        return LINKED.get(this.inner) || [];
      }
    }]);

    return DestroyableDestructor;
  }();

  var StringDestroyableDestructor = function () {
    function StringDestroyableDestructor(inner) {
      _classCallCheck(this, StringDestroyableDestructor);

      this.inner = inner;
    }

    StringDestroyableDestructor.prototype[DROP] = function () {
      this.inner.destroy();
      destroyAssociated(this.inner);
    };

    StringDestroyableDestructor.prototype.toString = function toString() {
      return 'StringDestroyableDestructor';
    };

    _createClass(StringDestroyableDestructor, [{
      key: CHILDREN,
      get: function get() {
        return LINKED.get(this.inner) || [];
      }
    }]);

    return StringDestroyableDestructor;
  }();

  var SimpleDestructor = function () {
    function SimpleDestructor(inner) {
      _classCallCheck(this, SimpleDestructor);

      this.inner = inner;
    }

    SimpleDestructor.prototype[DROP] = function () {
      destroyAssociated(this.inner);
    };

    SimpleDestructor.prototype.toString = function toString() {
      return 'SimpleDestructor';
    };

    _createClass(SimpleDestructor, [{
      key: CHILDREN,
      get: function get() {
        return LINKED.get(this.inner) || [];
      }
    }]);

    return SimpleDestructor;
  }();

  var ListContentsDestructor = exports.ListContentsDestructor = function () {
    function ListContentsDestructor(inner) {
      _classCallCheck(this, ListContentsDestructor);

      this.inner = inner;
    }

    ListContentsDestructor.prototype[DROP] = function () {
      this.inner.forEachNode(function (d) {
        return destructor(d)[DROP]();
      });
    };

    ListContentsDestructor.prototype.toString = function toString() {
      return 'ListContentsDestructor';
    };

    _createClass(ListContentsDestructor, [{
      key: CHILDREN,
      get: function get() {
        var out = [];
        this.inner.forEachNode(function (d) {
          return out.push.apply(out, destructor(d)[CHILDREN]);
        });
        return out;
      }
    }]);

    return ListContentsDestructor;
  }();

  function debugDropTree(inner) {
    var hasDrop = isDrop(inner);
    var rawChildren = LINKED.get(inner) || null;
    var children = null;

    if (rawChildren) {
      children = [];

      for (var _iterator = rawChildren, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
          if (_i >= _iterator.length) break;
          _ref = _iterator[_i++];
        } else {
          _i = _iterator.next();
          if (_i.done) break;
          _ref = _i.value;
        }

        var child = _ref;
        children.push(debugDropTree(child));
      }
    }

    var obj = Object.create(null);
    obj.inner = inner;

    if (children) {
      obj.children = children;
    }

    obj.hasDrop = hasDrop;
    return obj;
  }

  function printDropTree(inner) {
    printDrop(destructor(inner));
  }

  function printDrop(inner) {
    console.group(String(inner));
    console.log(inner);
    var children = inner[CHILDREN] || null;

    if (children) {
      for (var _iterator2 = children, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
        var _ref2;

        if (_isArray2) {
          if (_i2 >= _iterator2.length) break;
          _ref2 = _iterator2[_i2++];
        } else {
          _i2 = _iterator2.next();
          if (_i2.done) break;
          _ref2 = _i2.value;
        }

        var child = _ref2;
        printDrop(child);
      }
    }

    console.groupEnd();
  }
});
unwrapExports(lifetimes);
var lifetimes_1 = lifetimes.ListContentsDestructor;
var lifetimes_2 = lifetimes.DESTRUCTORS;
var lifetimes_3 = lifetimes.CHILDREN;
var lifetimes_4 = lifetimes.DROP;
var lifetimes_5 = lifetimes.LINKED;
var lifetimes_6 = lifetimes.isDrop;
var lifetimes_7 = lifetimes.associate;
var lifetimes_8 = lifetimes.associateDestructor;
var lifetimes_9 = lifetimes.takeAssociated;
var lifetimes_10 = lifetimes.destroyAssociated;
var lifetimes_11 = lifetimes.destructor;
var lifetimes_12 = lifetimes.snapshot;
var lifetimes_13 = lifetimes.debugDropTree;
var lifetimes_14 = lifetimes.printDropTree;
var lifetimes_15 = lifetimes.printDrop;
var listUtils = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.EMPTY_SLICE = exports.ListSlice = exports.LinkedList = exports.ListNode = undefined;

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var ListNode = exports.ListNode = function ListNode(value) {
    _classCallCheck(this, ListNode);

    this.next = null;
    this.prev = null;
    this.value = value;
  };

  var LinkedList = exports.LinkedList = function () {
    function LinkedList() {
      _classCallCheck(this, LinkedList);

      this.clear();
    }

    LinkedList.prototype.head = function head() {
      return this._head;
    };

    LinkedList.prototype.tail = function tail() {
      return this._tail;
    };

    LinkedList.prototype.clear = function clear() {
      this._head = this._tail = null;
    };

    LinkedList.prototype.toArray = function toArray() {
      var out = [];
      this.forEachNode(function (n) {
        return out.push(n);
      });
      return out;
    };

    LinkedList.prototype.nextNode = function nextNode(node) {
      return node.next;
    };

    LinkedList.prototype.forEachNode = function forEachNode(callback) {
      var node = this._head;

      while (node !== null) {
        callback(node);
        node = node.next;
      }
    };

    LinkedList.prototype.insertBefore = function insertBefore(node) {
      var reference = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      if (reference === null) return this.append(node);
      if (reference.prev) reference.prev.next = node;else this._head = node;
      node.prev = reference.prev;
      node.next = reference;
      reference.prev = node;
      return node;
    };

    LinkedList.prototype.append = function append(node) {
      var tail = this._tail;

      if (tail) {
        tail.next = node;
        node.prev = tail;
        node.next = null;
      } else {
        this._head = node;
      }

      return this._tail = node;
    };

    LinkedList.prototype.remove = function remove(node) {
      if (node.prev) node.prev.next = node.next;else this._head = node.next;
      if (node.next) node.next.prev = node.prev;else this._tail = node.prev;
      return node;
    };

    LinkedList.prototype[lifetimes.DROP] = function () {
      this.forEachNode(function (d) {
        return (0, lifetimes.destructor)(d)[lifetimes.DROP]();
      });
    };

    _createClass(LinkedList, [{
      key: lifetimes.CHILDREN,
      get: function get() {
        var out = [];
        this.forEachNode(function (d) {
          return out.push.apply(out, (0, lifetimes.destructor)(d)[lifetimes.CHILDREN]);
        });
        return out;
      }
    }]);

    return LinkedList;
  }();

  var ListSlice = exports.ListSlice = function () {
    function ListSlice(head, tail) {
      _classCallCheck(this, ListSlice);

      this._head = head;
      this._tail = tail;
    }

    ListSlice.prototype.forEachNode = function forEachNode(callback) {
      var node = this._head;

      while (node !== null) {
        callback(node);
        node = this.nextNode(node);
      }
    };

    ListSlice.prototype.head = function head() {
      return this._head;
    };

    ListSlice.prototype.tail = function tail() {
      return this._tail;
    };

    ListSlice.prototype.toArray = function toArray() {
      var out = [];
      this.forEachNode(function (n) {
        return out.push(n);
      });
      return out;
    };

    ListSlice.prototype.nextNode = function nextNode(node) {
      if (node === this._tail) return null;
      return node.next;
    };

    return ListSlice;
  }();

  var EMPTY_SLICE = exports.EMPTY_SLICE = new ListSlice(null, null);
});
unwrapExports(listUtils);
var listUtils_1 = listUtils.EMPTY_SLICE;
var listUtils_2 = listUtils.ListSlice;
var listUtils_3 = listUtils.LinkedList;
var listUtils_4 = listUtils.ListNode;
var objectUtils = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.assign = assign;
  exports.fillNulls = fillNulls;
  exports.values = values;
  var objKeys = Object.keys;

  function assign(obj) {
    for (var i = 1; i < arguments.length; i++) {
      var assignment = arguments[i];
      if (assignment === null || typeof assignment !== 'object') continue;
      var keys = objKeys(assignment);

      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        obj[key] = assignment[key];
      }
    }

    return obj;
  }

  function fillNulls(count) {
    var arr = new Array(count);

    for (var i = 0; i < count; i++) {
      arr[i] = null;
    }

    return arr;
  }

  function values(obj) {
    var vals = [];

    for (var key in obj) {
      vals.push(obj[key]);
    }

    return vals;
  }
});
unwrapExports(objectUtils);
var objectUtils_1 = objectUtils.assign;
var objectUtils_2 = objectUtils.fillNulls;
var objectUtils_3 = objectUtils.values;
var platformUtils = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.keys = keys;
  exports.unwrap = unwrap;
  exports.expect = expect;
  exports.unreachable = unreachable;
  exports.exhausted = exhausted;

  function keys(obj) {
    return Object.keys(obj);
  }

  function unwrap(val) {
    if (val === null || val === undefined) throw new Error('Expected value to be present');
    return val;
  }

  function expect(val, message) {
    if (val === null || val === undefined) throw new Error(message);
    return val;
  }

  function unreachable() {
    var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'unreachable';
    return new Error(message);
  }

  function exhausted(value) {
    throw new Error('Exhausted ' + value);
  }

  var tuple = exports.tuple = function tuple() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return args;
  };
});
unwrapExports(platformUtils);
var platformUtils_1 = platformUtils.keys;
var platformUtils_2 = platformUtils.unwrap;
var platformUtils_3 = platformUtils.expect;
var platformUtils_4 = platformUtils.unreachable;
var platformUtils_5 = platformUtils.exhausted;
var platformUtils_6 = platformUtils.tuple;
var string = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.strip = strip;

  function strip(strings) {
    var out = '';

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    for (var i = 0; i < strings.length; i++) {
      var string = strings[i];
      var dynamic = args[i] !== undefined ? String(args[i]) : '';
      out += '' + string + dynamic;
    }

    var lines = out.split('\n');

    while (lines.length && lines[0].match(/^\s*$/)) {
      lines.shift();
    }

    while (lines.length && lines[lines.length - 1].match(/^\s*$/)) {
      lines.pop();
    }

    var min = Infinity;

    for (var _iterator = lines, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      var line = _ref;
      var leading = line.match(/^\s*/)[0].length;
      min = Math.min(min, leading);
    }

    var stripped = [];

    for (var _iterator2 = lines, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
      var _ref2;

      if (_isArray2) {
        if (_i2 >= _iterator2.length) break;
        _ref2 = _iterator2[_i2++];
      } else {
        _i2 = _iterator2.next();
        if (_i2.done) break;
        _ref2 = _i2.value;
      }

      var _line = _ref2;
      stripped.push(_line.slice(min));
    }

    return stripped.join('\n');
  }
});
unwrapExports(string);
var string_1 = string.strip;
var es5$1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'EMPTY_ARRAY', {
    enumerable: true,
    get: function () {
      return arrayUtils.EMPTY_ARRAY;
    }
  });
  Object.defineProperty(exports, 'assert', {
    enumerable: true,
    get: function () {
      return _interopRequireDefault(assert).default;
    }
  });
  Object.defineProperty(exports, 'deprecate', {
    enumerable: true,
    get: function () {
      return assert.deprecate;
    }
  });
  Object.defineProperty(exports, 'dict', {
    enumerable: true,
    get: function () {
      return collections.dict;
    }
  });
  Object.defineProperty(exports, 'DictSet', {
    enumerable: true,
    get: function () {
      return collections.DictSet;
    }
  });
  Object.defineProperty(exports, 'isDict', {
    enumerable: true,
    get: function () {
      return collections.isDict;
    }
  });
  Object.defineProperty(exports, 'isObject', {
    enumerable: true,
    get: function () {
      return collections.isObject;
    }
  });
  Object.defineProperty(exports, 'Stack', {
    enumerable: true,
    get: function () {
      return collections.StackImpl;
    }
  });
  Object.keys(destroy).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return destroy[key];
      }
    });
  });
  Object.keys(dom).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return dom[key];
      }
    });
  });
  Object.defineProperty(exports, 'ensureGuid', {
    enumerable: true,
    get: function () {
      return guid.ensureGuid;
    }
  });
  Object.defineProperty(exports, 'initializeGuid', {
    enumerable: true,
    get: function () {
      return guid.initializeGuid;
    }
  });
  Object.defineProperty(exports, 'isSerializationFirstNode', {
    enumerable: true,
    get: function () {
      return isSerializationFirstNode_1.isSerializationFirstNode;
    }
  });
  Object.defineProperty(exports, 'SERIALIZATION_FIRST_NODE_STRING', {
    enumerable: true,
    get: function () {
      return isSerializationFirstNode_1.SERIALIZATION_FIRST_NODE_STRING;
    }
  });
  Object.keys(lifetimes).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return lifetimes[key];
      }
    });
  });
  Object.defineProperty(exports, 'EMPTY_SLICE', {
    enumerable: true,
    get: function () {
      return listUtils.EMPTY_SLICE;
    }
  });
  Object.defineProperty(exports, 'LinkedList', {
    enumerable: true,
    get: function () {
      return listUtils.LinkedList;
    }
  });
  Object.defineProperty(exports, 'ListNode', {
    enumerable: true,
    get: function () {
      return listUtils.ListNode;
    }
  });
  Object.defineProperty(exports, 'ListSlice', {
    enumerable: true,
    get: function () {
      return listUtils.ListSlice;
    }
  });
  Object.defineProperty(exports, 'assign', {
    enumerable: true,
    get: function () {
      return objectUtils.assign;
    }
  });
  Object.defineProperty(exports, 'fillNulls', {
    enumerable: true,
    get: function () {
      return objectUtils.fillNulls;
    }
  });
  Object.defineProperty(exports, 'values', {
    enumerable: true,
    get: function () {
      return objectUtils.values;
    }
  });
  Object.keys(platformUtils).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return platformUtils[key];
      }
    });
  });
  Object.keys(string).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return string[key];
      }
    });
  });
  exports.assertNever = assertNever;

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function assertNever(value) {
    var desc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'unexpected unreachable branch';
    console.log('unreachable', value);
    console.trace(desc + ' :: ' + JSON.stringify(value) + ' (' + value + ')');
  }
});
unwrapExports(es5$1);
var es5_1$1 = es5$1.assertNever;
var captureRenderTree_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = captureRenderTree;
  /**
    @module @ember/debug
  */

  /**
    Ember Inspector calls this function to capture the current render tree.
  
    In production mode, this requires turning on `ENV._DEBUG_RENDER_TREE`
    before loading Ember.
  
    @private
    @static
    @method captureRenderTree
    @for @ember/debug
    @param app {ApplicationInstance} An `ApplicationInstance`.
    @since 3.14.0
  */

  function captureRenderTree(app) {
    let env = (0, es5$1.expect)(app.lookup('-environment:main'), 'BUG: owner is missing -environment:main');
    let rendererType = env.isInteractive ? 'renderer:-dom' : 'renderer:-inert';
    let renderer = (0, es5$1.expect)(app.lookup(rendererType), `BUG: owner is missing ${rendererType}`);
    return renderer.debugRenderTree.capture();
  }
});
unwrapExports(captureRenderTree_1);
var debug_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, "registerDeprecationHandler", {
    enumerable: true,
    get: function () {
      return _deprecate2.registerHandler;
    }
  });
  Object.defineProperty(exports, "isTesting", {
    enumerable: true,
    get: function () {
      return testing_1.isTesting;
    }
  });
  Object.defineProperty(exports, "setTesting", {
    enumerable: true,
    get: function () {
      return testing_1.setTesting;
    }
  });
  Object.defineProperty(exports, "registerWarnHandler", {
    enumerable: true,
    get: function () {
      return _warn2.registerHandler;
    }
  });
  Object.defineProperty(exports, "captureRenderTree", {
    enumerable: true,
    get: function () {
      return _captureRenderTree.default;
    }
  });
  exports._warnIfUsingStrippedFeatureFlags = exports.getDebugFunction = exports.setDebugFunction = exports.deprecateFunc = exports.runInDebug = exports.debugFreeze = exports.debugSeal = exports.deprecate = exports.debug = exports.warn = exports.info = exports.assert = void 0;

  var _error = _interopRequireDefault(error);

  var _deprecate2 = _interopRequireWildcard(deprecate_1);

  var _warn2 = _interopRequireWildcard(warn_1);

  var _captureRenderTree = _interopRequireDefault(captureRenderTree_1);

  function _getRequireWildcardCache() {
    if (typeof WeakMap !== "function") return null;
    var cache = new WeakMap();

    _getRequireWildcardCache = function () {
      return cache;
    };

    return cache;
  }

  function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
      return obj;
    }

    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
      return {
        default: obj
      };
    }

    var cache = _getRequireWildcardCache();

    if (cache && cache.has(obj)) {
      return cache.get(obj);
    }

    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;

    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;

        if (desc && (desc.get || desc.set)) {
          Object.defineProperty(newObj, key, desc);
        } else {
          newObj[key] = obj[key];
        }
      }
    }

    newObj.default = obj;

    if (cache) {
      cache.set(obj, newObj);
    }

    return newObj;
  }

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  } // These are the default production build versions:


  const noop = () => {};

  let assert = noop;
  exports.assert = assert;
  let info = noop;
  exports.info = info;
  let warn = noop;
  exports.warn = warn;
  let debug = noop;
  exports.debug = debug;
  let deprecate = noop;
  exports.deprecate = deprecate;
  let debugSeal = noop;
  exports.debugSeal = debugSeal;
  let debugFreeze = noop;
  exports.debugFreeze = debugFreeze;
  let runInDebug = noop;
  exports.runInDebug = runInDebug;
  let setDebugFunction = noop;
  exports.setDebugFunction = setDebugFunction;
  let getDebugFunction = noop;
  exports.getDebugFunction = getDebugFunction;

  let deprecateFunc = function () {
    return arguments[arguments.length - 1];
  };

  exports.deprecateFunc = deprecateFunc;

  if (es5.DEBUG) {
    exports.setDebugFunction = setDebugFunction = function (type, callback) {
      switch (type) {
        case 'assert':
          return exports.assert = assert = callback;

        case 'info':
          return exports.info = info = callback;

        case 'warn':
          return exports.warn = warn = callback;

        case 'debug':
          return exports.debug = debug = callback;

        case 'deprecate':
          return exports.deprecate = deprecate = callback;

        case 'debugSeal':
          return exports.debugSeal = debugSeal = callback;

        case 'debugFreeze':
          return exports.debugFreeze = debugFreeze = callback;

        case 'runInDebug':
          return exports.runInDebug = runInDebug = callback;

        case 'deprecateFunc':
          return exports.deprecateFunc = deprecateFunc = callback;
      }
    };

    exports.getDebugFunction = getDebugFunction = function (type) {
      switch (type) {
        case 'assert':
          return assert;

        case 'info':
          return info;

        case 'warn':
          return warn;

        case 'debug':
          return debug;

        case 'deprecate':
          return deprecate;

        case 'debugSeal':
          return debugSeal;

        case 'debugFreeze':
          return debugFreeze;

        case 'runInDebug':
          return runInDebug;

        case 'deprecateFunc':
          return deprecateFunc;
      }
    };
  }
  /**
  @module @ember/debug
  */


  if (es5.DEBUG) {
    /**
      Verify that a certain expectation is met, or throw a exception otherwise.
         This is useful for communicating assumptions in the code to other human
      readers as well as catching bugs that accidentally violates these
      expectations.
         Assertions are removed from production builds, so they can be freely added
      for documentation and debugging purposes without worries of incuring any
      performance penalty. However, because of that, they should not be used for
      checks that could reasonably fail during normal usage. Furthermore, care
      should be taken to avoid accidentally relying on side-effects produced from
      evaluating the condition itself, since the code will not run in production.
         ```javascript
      import { assert } from '@ember/debug';
         // Test for truthiness
      assert('Must pass a string', typeof str === 'string');
         // Fail unconditionally
      assert('This code path should never be run');
      ```
         @method assert
      @static
      @for @ember/debug
      @param {String} description Describes the expectation. This will become the
        text of the Error thrown if the assertion fails.
      @param {any} condition Must be truthy for the assertion to pass. If
        falsy, an exception will be thrown.
      @public
      @since 1.0.0
    */
    setDebugFunction('assert', function assert(desc, test) {
      if (!test) {
        throw new _error.default(`Assertion Failed: ${desc}`);
      }
    });
    /**
      Display a debug notice.
         Calls to this function are removed from production builds, so they can be
      freely added for documentation and debugging purposes without worries of
      incuring any performance penalty.
         ```javascript
      import { debug } from '@ember/debug';
         debug('I\'m a debug notice!');
      ```
         @method debug
      @for @ember/debug
      @static
      @param {String} message A debug message to display.
      @public
    */

    setDebugFunction('debug', function debug(message) {
      /* eslint-disable no-console */
      if (console.debug) {
        console.debug(`DEBUG: ${message}`);
      } else {
        console.log(`DEBUG: ${message}`);
      }
      /* eslint-ensable no-console */

    });
    /**
      Display an info notice.
         Calls to this function are removed from production builds, so they can be
      freely added for documentation and debugging purposes without worries of
      incuring any performance penalty.
         @method info
      @private
    */

    setDebugFunction('info', function info() {
      console.info(...arguments);
      /* eslint-disable-line no-console */
    });
    /**
     @module @ember/debug
     @public
    */

    /**
      Alias an old, deprecated method with its new counterpart.
         Display a deprecation warning with the provided message and a stack trace
      (Chrome and Firefox only) when the assigned method is called.
         Calls to this function are removed from production builds, so they can be
      freely added for documentation and debugging purposes without worries of
      incuring any performance penalty.
         ```javascript
      import { deprecateFunc } from '@ember/debug';
         Ember.oldMethod = deprecateFunc('Please use the new, updated method', options, Ember.newMethod);
      ```
         @method deprecateFunc
      @static
      @for @ember/debug
      @param {String} message A description of the deprecation.
      @param {Object} [options] The options object for `deprecate`.
      @param {Function} func The new function called to replace its deprecated counterpart.
      @return {Function} A new function that wraps the original function with a deprecation warning
      @private
    */

    setDebugFunction('deprecateFunc', function deprecateFunc(...args) {
      if (args.length === 3) {
        let [message, options, func] = args;
        return function (...args) {
          deprecate(message, false, options);
          return func.apply(this, args);
        };
      } else {
        let [message, func] = args;
        return function () {
          deprecate(message);
          return func.apply(this, arguments);
        };
      }
    });
    /**
     @module @ember/debug
     @public
    */

    /**
      Run a function meant for debugging.
         Calls to this function are removed from production builds, so they can be
      freely added for documentation and debugging purposes without worries of
      incuring any performance penalty.
         ```javascript
      import Component from '@ember/component';
      import { runInDebug } from '@ember/debug';
         runInDebug(() => {
        Component.reopen({
          didInsertElement() {
            console.log("I'm happy");
          }
        });
      });
      ```
         @method runInDebug
      @for @ember/debug
      @static
      @param {Function} func The function to be executed.
      @since 1.5.0
      @public
    */

    setDebugFunction('runInDebug', function runInDebug(func) {
      func();
    });
    setDebugFunction('debugSeal', function debugSeal(obj) {
      Object.seal(obj);
    });
    setDebugFunction('debugFreeze', function debugFreeze(obj) {
      // re-freezing an already frozen object introduces a significant
      // performance penalty on Chrome (tested through 59).
      //
      // See: https://bugs.chromium.org/p/v8/issues/detail?id=6450
      if (!Object.isFrozen(obj)) {
        Object.freeze(obj);
      }
    });
    setDebugFunction('deprecate', _deprecate2.default);
    setDebugFunction('warn', _warn2.default);
  }

  let _warnIfUsingStrippedFeatureFlags;

  exports._warnIfUsingStrippedFeatureFlags = _warnIfUsingStrippedFeatureFlags;

  if (es5.DEBUG && !(0, testing_1.isTesting)()) {
    if (typeof window !== 'undefined' && (browserEnvironment.isFirefox || browserEnvironment.isChrome) && window.addEventListener) {
      window.addEventListener('load', () => {
        if (document.documentElement && document.documentElement.dataset && !document.documentElement.dataset.emberExtension) {
          let downloadURL;

          if (browserEnvironment.isChrome) {
            downloadURL = 'https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi';
          } else if (browserEnvironment.isFirefox) {
            downloadURL = 'https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/';
          }

          debug(`For more advanced debugging, install the Ember Inspector from ${downloadURL}`);
        }
      }, false);
    }
  }
});
unwrapExports(debug_1);
var debug_2 = debug_1._warnIfUsingStrippedFeatureFlags;
var debug_3 = debug_1.getDebugFunction;
var debug_4 = debug_1.setDebugFunction;
var debug_5 = debug_1.deprecateFunc;
var debug_6 = debug_1.runInDebug;
var debug_7 = debug_1.debugFreeze;
var debug_8 = debug_1.debugSeal;
var debug_9 = debug_1.deprecate;
var debug_10 = debug_1.debug;
var debug_11 = debug_1.warn;
var debug_12 = debug_1.info;
var debug_13 = debug_1.assert;
var deprecatedFeatures = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.GLOBALS_RESOLVER = exports.PARTIALS = exports.EMBER_COMPONENT_IS_VISIBLE = exports.MOUSE_ENTER_LEAVE_MOVE_EVENTS = exports.FUNCTION_PROTOTYPE_EXTENSIONS = exports.APP_CTRL_ROUTER_PROPS = exports.ALIAS_METHOD = exports.JQUERY_INTEGRATION = exports.COMPONENT_MANAGER_STRING_LOOKUP = exports.ROUTER_EVENTS = exports.MERGE = exports.LOGGER = exports.EMBER_EXTEND_PROTOTYPES = exports.SEND_ACTION = void 0;
  /* eslint-disable no-implicit-coercion */
  // These versions should be the version that the deprecation was _introduced_,
  // not the version that the feature will be removed.

  const SEND_ACTION = !!'3.4.0';
  exports.SEND_ACTION = SEND_ACTION;
  const EMBER_EXTEND_PROTOTYPES = !!'3.2.0-beta.5';
  exports.EMBER_EXTEND_PROTOTYPES = EMBER_EXTEND_PROTOTYPES;
  const LOGGER = !!'3.2.0-beta.1';
  exports.LOGGER = LOGGER;
  const MERGE = !!'3.6.0-beta.1';
  exports.MERGE = MERGE;
  const ROUTER_EVENTS = !!'4.0.0';
  exports.ROUTER_EVENTS = ROUTER_EVENTS;
  const COMPONENT_MANAGER_STRING_LOOKUP = !!'3.8.0';
  exports.COMPONENT_MANAGER_STRING_LOOKUP = COMPONENT_MANAGER_STRING_LOOKUP;
  const JQUERY_INTEGRATION = !!'3.9.0';
  exports.JQUERY_INTEGRATION = JQUERY_INTEGRATION;
  const ALIAS_METHOD = !!'3.9.0';
  exports.ALIAS_METHOD = ALIAS_METHOD;
  const APP_CTRL_ROUTER_PROPS = !!'3.10.0-beta.1';
  exports.APP_CTRL_ROUTER_PROPS = APP_CTRL_ROUTER_PROPS;
  const FUNCTION_PROTOTYPE_EXTENSIONS = !!'3.11.0-beta.1';
  exports.FUNCTION_PROTOTYPE_EXTENSIONS = FUNCTION_PROTOTYPE_EXTENSIONS;
  const MOUSE_ENTER_LEAVE_MOVE_EVENTS = !!'3.13.0-beta.1';
  exports.MOUSE_ENTER_LEAVE_MOVE_EVENTS = MOUSE_ENTER_LEAVE_MOVE_EVENTS;
  const EMBER_COMPONENT_IS_VISIBLE = !!'3.15.0-beta.1';
  exports.EMBER_COMPONENT_IS_VISIBLE = EMBER_COMPONENT_IS_VISIBLE;
  const PARTIALS = !!'3.15.0-beta.1';
  exports.PARTIALS = PARTIALS;
  const GLOBALS_RESOLVER = !!'3.16.0-beta.1';
  exports.GLOBALS_RESOLVER = GLOBALS_RESOLVER;
});
unwrapExports(deprecatedFeatures);
var deprecatedFeatures_1 = deprecatedFeatures.GLOBALS_RESOLVER;
var deprecatedFeatures_2 = deprecatedFeatures.PARTIALS;
var deprecatedFeatures_3 = deprecatedFeatures.EMBER_COMPONENT_IS_VISIBLE;
var deprecatedFeatures_4 = deprecatedFeatures.MOUSE_ENTER_LEAVE_MOVE_EVENTS;
var deprecatedFeatures_5 = deprecatedFeatures.FUNCTION_PROTOTYPE_EXTENSIONS;
var deprecatedFeatures_6 = deprecatedFeatures.APP_CTRL_ROUTER_PROPS;
var deprecatedFeatures_7 = deprecatedFeatures.ALIAS_METHOD;
var deprecatedFeatures_8 = deprecatedFeatures.JQUERY_INTEGRATION;
var deprecatedFeatures_9 = deprecatedFeatures.COMPONENT_MANAGER_STRING_LOOKUP;
var deprecatedFeatures_10 = deprecatedFeatures.ROUTER_EVENTS;
var deprecatedFeatures_11 = deprecatedFeatures.MERGE;
var deprecatedFeatures_12 = deprecatedFeatures.LOGGER;
var deprecatedFeatures_13 = deprecatedFeatures.EMBER_EXTEND_PROTOTYPES;
var deprecatedFeatures_14 = deprecatedFeatures.SEND_ACTION;
var environment = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.getLookup = getLookup;
  exports.setLookup = setLookup;
  exports.getENV = getENV;
  exports.ENV = exports.context = exports.global = void 0; // from lodash to catch fake globals

  function checkGlobal(value) {
    return value && value.Object === Object ? value : undefined;
  } // element ids can ruin global miss checks


  function checkElementIdShadowing(value) {
    return value && value.nodeType === undefined ? value : undefined;
  } // export real global


  var global$1 = checkGlobal(checkElementIdShadowing(typeof commonjsGlobal === 'object' && commonjsGlobal)) || checkGlobal(typeof self === 'object' && self) || checkGlobal(typeof window === 'object' && window) || typeof mainContext !== 'undefined' && mainContext || // set before strict mode in Ember loader/wrapper
  new Function('return this')(); // eval outside of strict mode

  exports.global = global$1;

  const context = function (global, Ember) {
    return Ember === undefined ? {
      imports: global,
      exports: global,
      lookup: global
    } : {
      // import jQuery
      imports: Ember.imports || global,
      // export Ember
      exports: Ember.exports || global,
      // search for Namespaces
      lookup: Ember.lookup || global
    };
  }(global$1, global$1.Ember);

  exports.context = context;

  function getLookup() {
    return context.lookup;
  }

  function setLookup(value) {
    context.lookup = value;
  }
  /**
    The hash of environment variables used to control various configuration
    settings. To specify your own or override default settings, add the
    desired properties to a global hash named `EmberENV` (or `ENV` for
    backwards compatibility with earlier versions of Ember). The `EmberENV`
    hash must be created before loading Ember.
  
    @class EmberENV
    @type Object
    @public
  */


  const ENV = {
    ENABLE_OPTIONAL_FEATURES: false,

    /**
      Determines whether Ember should add to `Array`, `Function`, and `String`
      native object prototypes, a few extra methods in order to provide a more
      friendly API.
         We generally recommend leaving this option set to true however, if you need
      to turn it off, you can add the configuration property
      `EXTEND_PROTOTYPES` to `EmberENV` and set it to `false`.
         Note, when disabled (the default configuration for Ember Addons), you will
      instead have to access all methods and functions from the Ember
      namespace.
         @property EXTEND_PROTOTYPES
      @type Boolean
      @default true
      @for EmberENV
      @public
    */
    EXTEND_PROTOTYPES: {
      Array: true,
      Function: true,
      String: true
    },

    /**
      The `LOG_STACKTRACE_ON_DEPRECATION` property, when true, tells Ember to log
      a full stack trace during deprecation warnings.
         @property LOG_STACKTRACE_ON_DEPRECATION
      @type Boolean
      @default true
      @for EmberENV
      @public
    */
    LOG_STACKTRACE_ON_DEPRECATION: true,

    /**
      The `LOG_VERSION` property, when true, tells Ember to log versions of all
      dependent libraries in use.
         @property LOG_VERSION
      @type Boolean
      @default true
      @for EmberENV
      @public
    */
    LOG_VERSION: true,
    RAISE_ON_DEPRECATION: false,
    STRUCTURED_PROFILE: false,

    /**
      Whether to insert a `<div class="ember-view" />` wrapper around the
      application template. See RFC #280.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _APPLICATION_TEMPLATE_WRAPPER
      @for EmberENV
      @type Boolean
      @default true
      @private
    */
    _APPLICATION_TEMPLATE_WRAPPER: true,

    /**
      Whether to use Glimmer Component semantics (as opposed to the classic "Curly"
      components semantics) for template-only components. See RFC #278.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _TEMPLATE_ONLY_GLIMMER_COMPONENTS
      @for EmberENV
      @type Boolean
      @default false
      @private
    */
    _TEMPLATE_ONLY_GLIMMER_COMPONENTS: false,

    /**
      Whether to perform extra bookkeeping needed to make the `captureRenderTree`
      API work.
         This has to be set before the ember JavaScript code is evaluated. This is
      usually done by setting `window.EmberENV = { _DEBUG_RENDER_TREE: true };`
      or `window.ENV = { _DEBUG_RENDER_TREE: true };` before the "vendor"
      `<script>` tag in `index.html`.
         Setting the flag after Ember is already loaded will not work correctly. It
      may appear to work somewhat, but fundamentally broken.
         This is not intended to be set directly. Ember Inspector will enable the
      flag on behalf of the user as needed.
         This flag is always on in development mode.
         The flag is off by default in production mode, due to the cost associated
      with the the bookkeeping work.
         The expected flow is that Ember Inspector will ask the user to refresh the
      page after enabling the feature. It could also offer a feature where the
      user add some domains to the "always on" list. In either case, Ember
      Inspector will inject the code on the page to set the flag if needed.
         @property _DEBUG_RENDER_TREE
      @for EmberENV
      @type Boolean
      @default false
      @private
    */
    _DEBUG_RENDER_TREE: es5.DEBUG,

    /**
      Whether the app is using jQuery. See RFC #294.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _JQUERY_INTEGRATION
      @for EmberENV
      @type Boolean
      @default true
      @private
    */
    _JQUERY_INTEGRATION: true,

    /**
      Whether the app defaults to using async observers.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _DEFAULT_ASYNC_OBSERVERS
      @for EmberENV
      @type Boolean
      @default false
      @private
    */
    _DEFAULT_ASYNC_OBSERVERS: false,

    /**
      Controls the maximum number of scheduled rerenders without "settling". In general,
      applications should not need to modify this environment variable, but please
      open an issue so that we can determine if a better default value is needed.
         @property _RERENDER_LOOP_LIMIT
      @for EmberENV
      @type number
      @default 1000
      @private
     */
    _RERENDER_LOOP_LIMIT: 1000,
    EMBER_LOAD_HOOKS: {},
    FEATURES: {}
  };
  exports.ENV = ENV;
  let providedEnv = global$1.EmberENV;

  if (providedEnv === undefined) {
    providedEnv = global$1.ENV;
    (0, debug_1.deprecate)("Configuring Ember's boot options via `window.ENV` is deprecated, please migrate to `window.EmberENV` instead.", providedEnv === undefined, {
      id: 'ember-environment.window.env',
      until: '3.17.0'
    });
  }

  (EmberENV => {
    if (typeof EmberENV !== 'object' || EmberENV === null) return;

    for (let flag in EmberENV) {
      if (!EmberENV.hasOwnProperty(flag) || flag === 'EXTEND_PROTOTYPES' || flag === 'EMBER_LOAD_HOOKS') continue;
      let defaultValue = ENV[flag];

      if (defaultValue === true) {
        ENV[flag] = EmberENV[flag] !== false;
      } else if (defaultValue === false) {
        ENV[flag] = EmberENV[flag] === true;
      }
    }

    let {
      EXTEND_PROTOTYPES
    } = EmberENV;

    if (EXTEND_PROTOTYPES !== undefined) {
      if (typeof EXTEND_PROTOTYPES === 'object' && EXTEND_PROTOTYPES !== null) {
        ENV.EXTEND_PROTOTYPES.String = EXTEND_PROTOTYPES.String !== false;

        if (deprecatedFeatures.FUNCTION_PROTOTYPE_EXTENSIONS) {
          ENV.EXTEND_PROTOTYPES.Function = EXTEND_PROTOTYPES.Function !== false;
        }

        ENV.EXTEND_PROTOTYPES.Array = EXTEND_PROTOTYPES.Array !== false;
      } else {
        let isEnabled = EXTEND_PROTOTYPES !== false;
        ENV.EXTEND_PROTOTYPES.String = isEnabled;

        if (deprecatedFeatures.FUNCTION_PROTOTYPE_EXTENSIONS) {
          ENV.EXTEND_PROTOTYPES.Function = isEnabled;
        }

        ENV.EXTEND_PROTOTYPES.Array = isEnabled;
      }
    } // TODO this does not seem to be used by anything,
    //      can we remove it? do we need to deprecate it?


    let {
      EMBER_LOAD_HOOKS
    } = EmberENV;

    if (typeof EMBER_LOAD_HOOKS === 'object' && EMBER_LOAD_HOOKS !== null) {
      for (let hookName in EMBER_LOAD_HOOKS) {
        if (!EMBER_LOAD_HOOKS.hasOwnProperty(hookName)) continue;
        let hooks = EMBER_LOAD_HOOKS[hookName];

        if (Array.isArray(hooks)) {
          ENV.EMBER_LOAD_HOOKS[hookName] = hooks.filter(hook => typeof hook === 'function');
        }
      }
    }

    let {
      FEATURES
    } = EmberENV;

    if (typeof FEATURES === 'object' && FEATURES !== null) {
      for (let feature in FEATURES) {
        if (!FEATURES.hasOwnProperty(feature)) continue;
        ENV.FEATURES[feature] = FEATURES[feature] === true;
      }
    }

    if (es5.DEBUG) {
      ENV._DEBUG_RENDER_TREE = true;
    }
  })(providedEnv);

  function getENV() {
    return ENV;
  }
});
unwrapExports(environment);
var environment_1 = environment.getLookup;
var environment_2 = environment.setLookup;
var environment_3 = environment.getENV;
var environment_4 = environment.ENV;
var environment_5 = environment.context;
var environment_6 = environment.global;
var merge_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = merge;
  /**
    Merge the contents of two objects together into the first object.
  
    ```javascript
    import { merge } from '@ember/polyfills';
  
    merge({ first: 'Tom' }, { last: 'Dale' }); // { first: 'Tom', last: 'Dale' }
    var a = { first: 'Yehuda' };
    var b = { last: 'Katz' };
    merge(a, b); // a == { first: 'Yehuda', last: 'Katz' }, b == { last: 'Katz' }
    ```
  
    @method merge
    @static
    @for @ember/polyfills
    @param {Object} original The object to merge into
    @param {Object} updates The object to copy properties from
    @return {Object}
    @deprecated
    @public
  */

  function merge(original, updates) {
    (0, debug_1.deprecate)('Use of `merge` has been deprecated. Please use `assign` instead.', false, {
      id: 'ember-polyfills.deprecate-merge',
      until: '4.0.0',
      url: 'https://emberjs.com/deprecations/v3.x/#toc_ember-polyfills-deprecate-merge'
    });

    if (updates === null || typeof updates !== 'object') {
      return original;
    }

    let props = Object.keys(updates);
    let prop;

    for (let i = 0; i < props.length; i++) {
      prop = props[i];
      original[prop] = updates[prop];
    }

    return original;
  }
});
unwrapExports(merge_1);
var assign_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.assign = assign;
  exports.default = void 0;
  /**
   @module @ember/polyfills
  */

  /**
    Copy properties from a source object to a target object. Source arguments remain unchanged.
  
    ```javascript
    import { assign } from '@ember/polyfills';
  
    var a = { first: 'Yehuda' };
    var b = { last: 'Katz' };
    var c = { company: 'Other Company' };
    var d = { company: 'Tilde Inc.' };
    assign(a, b, c, d); // a === { first: 'Yehuda', last: 'Katz', company: 'Tilde Inc.' };
    ```
  
    @method assign
    @for @ember/polyfills
    @param {Object} target The object to assign into
    @param {Object} ...args The objects to copy properties from
    @return {Object}
    @public
    @static
  */

  function assign(target) {
    for (let i = 1; i < arguments.length; i++) {
      let arg = arguments[i];

      if (!arg) {
        continue;
      }

      let updates = Object.keys(arg);

      for (let i = 0; i < updates.length; i++) {
        let prop = updates[i];
        target[prop] = arg[prop];
      }
    }

    return target;
  } // Note: We use the bracket notation so
  //       that the babel plugin does not
  //       transform it.
  // https://www.npmjs.com/package/babel-plugin-transform-object-assign


  const {
    assign: _assign
  } = Object;

  var _default = _assign || assign;

  exports.default = _default;
});
unwrapExports(assign_1);
var assign_2 = assign_1.assign;
var weak_set = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = void 0;
  /* globals WeakSet */

  var _default = typeof WeakSet === 'function' ? WeakSet : class WeakSetPolyFill {
    constructor() {
      this._map = new WeakMap();
    }

    add(val) {
      this._map.set(val, true);

      return this;
    }

    delete(val) {
      return this._map.delete(val);
    }

    has(val) {
      return this._map.has(val);
    }

  };

  exports.default = _default;
});
unwrapExports(weak_set);
var polyfills = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, "assign", {
    enumerable: true,
    get: function () {
      return _assign.default;
    }
  });
  Object.defineProperty(exports, "assignPolyfill", {
    enumerable: true,
    get: function () {
      return _assign.assign;
    }
  });
  Object.defineProperty(exports, "_WeakSet", {
    enumerable: true,
    get: function () {
      return _weak_set.default;
    }
  });
  exports.merge = void 0;

  var _merge = _interopRequireDefault(merge_1);

  var _assign = _interopRequireWildcard(assign_1);

  var _weak_set = _interopRequireDefault(weak_set);

  function _getRequireWildcardCache() {
    if (typeof WeakMap !== "function") return null;
    var cache = new WeakMap();

    _getRequireWildcardCache = function () {
      return cache;
    };

    return cache;
  }

  function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
      return obj;
    }

    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
      return {
        default: obj
      };
    }

    var cache = _getRequireWildcardCache();

    if (cache && cache.has(obj)) {
      return cache.get(obj);
    }

    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;

    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;

        if (desc && (desc.get || desc.set)) {
          Object.defineProperty(newObj, key, desc);
        } else {
          newObj[key] = obj[key];
        }
      }
    }

    newObj.default = obj;

    if (cache) {
      cache.set(obj, newObj);
    }

    return newObj;
  }

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  let merge = deprecatedFeatures.MERGE ? _merge.default : undefined; // Export `assignPolyfill` for testing

  exports.merge = merge;
});
unwrapExports(polyfills);
var polyfills_1 = polyfills.merge;
var utils = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.symbol = symbol;
  exports.isInternalSymbol = isInternalSymbol;
  exports.dictionary = makeDictionary;
  exports.uuid = uuid;
  exports.generateGuid = generateGuid;
  exports.guidFor = guidFor;
  exports.intern = intern;
  exports.wrap = wrap;
  exports.getObservers = getObservers;
  exports.getListeners = getListeners;
  exports.setObservers = setObservers;
  exports.setListeners = setListeners;
  exports.inspect = inspect;
  exports.lookupDescriptor = lookupDescriptor;
  exports.canInvoke = canInvoke;
  exports.tryInvoke = tryInvoke;
  exports.makeArray = makeArray;
  exports.getName = getName;
  exports.setName = setName;
  exports.toString = toString;
  exports.isObject = isObject;
  exports.isProxy = isProxy;
  exports.setProxy = setProxy;
  exports.isEmberArray = isEmberArray;
  exports.setWithMandatorySetter = exports.teardownMandatorySetter = exports.setupMandatorySetter = exports.EMBER_ARRAY = exports.Cache = exports.HAS_NATIVE_PROXY = exports.HAS_NATIVE_SYMBOL = exports.ROOT = exports.checkHasSuper = exports.GUID_KEY = exports.getOwnPropertyDescriptors = exports.getDebugName = void 0;
  /**
    Strongly hint runtimes to intern the provided string.
  
    When do I need to use this function?
  
    For the most part, never. Pre-mature optimization is bad, and often the
    runtime does exactly what you need it to, and more often the trade-off isn't
    worth it.
  
    Why?
  
    Runtimes store strings in at least 2 different representations:
    Ropes and Symbols (interned strings). The Rope provides a memory efficient
    data-structure for strings created from concatenation or some other string
    manipulation like splitting.
  
    Unfortunately checking equality of different ropes can be quite costly as
    runtimes must resort to clever string comparison algorithms. These
    algorithms typically cost in proportion to the length of the string.
    Luckily, this is where the Symbols (interned strings) shine. As Symbols are
    unique by their string content, equality checks can be done by pointer
    comparison.
  
    How do I know if my string is a rope or symbol?
  
    Typically (warning general sweeping statement, but truthy in runtimes at
    present) static strings created as part of the JS source are interned.
    Strings often used for comparisons can be interned at runtime if some
    criteria are met.  One of these criteria can be the size of the entire rope.
    For example, in chrome 38 a rope longer then 12 characters will not
    intern, nor will segments of that rope.
  
    Some numbers: http://jsperf.com/eval-vs-keys/8
  
    Known Trick™
  
    @private
    @return {String} interned version of the provided string
  */

  function intern(str) {
    let obj = {};
    obj[str] = 1;

    for (let key in obj) {
      if (key === str) {
        return key;
      }
    }

    return str;
  }
  /**
    Returns whether Type(value) is Object.
  
    Useful for checking whether a value is a valid WeakMap key.
  
    Refs: https://tc39.github.io/ecma262/#sec-typeof-operator-runtime-semantics-evaluation
          https://tc39.github.io/ecma262/#sec-weakmap.prototype.set
  
    @private
    @function isObject
  */


  function isObject(value) {
    return value !== null && (typeof value === 'object' || typeof value === 'function');
  }
  /**
   @module @ember/object
  */

  /**
   Previously we used `Ember.$.uuid`, however `$.uuid` has been removed from
   jQuery master. We'll just bootstrap our own uuid now.
  
   @private
   @return {Number} the uuid
   */


  let _uuid = 0;
  /**
   Generates a universally unique identifier. This method
   is used internally by Ember for assisting with
   the generation of GUID's and other unique identifiers.
  
   @public
   @return {Number} [description]
   */

  function uuid() {
    return ++_uuid;
  }
  /**
   Prefix used for guids through out Ember.
   @private
   @property GUID_PREFIX
   @for Ember
   @type String
   @final
   */


  const GUID_PREFIX = 'ember'; // Used for guid generation...

  const OBJECT_GUIDS = new WeakMap();
  const NON_OBJECT_GUIDS = new Map();
  /**
    A unique key used to assign guids and other private metadata to objects.
    If you inspect an object in your browser debugger you will often see these.
    They can be safely ignored.
  
    On browsers that support it, these properties are added with enumeration
    disabled so they won't show up when you iterate over your properties.
  
    @private
    @property GUID_KEY
    @for Ember
    @type String
    @final
  */

  const GUID_KEY = intern(`__ember${Date.now()}`);
  /**
    Generates a new guid, optionally saving the guid to the object that you
    pass in. You will rarely need to use this method. Instead you should
    call `guidFor(obj)`, which return an existing guid if available.
  
    @private
    @method generateGuid
    @static
    @for @ember/object/internals
    @param {Object} [obj] Object the guid will be used for. If passed in, the guid will
      be saved on the object and reused whenever you pass the same object
      again.
  
      If no object is passed, just generate a new guid.
    @param {String} [prefix] Prefix to place in front of the guid. Useful when you want to
      separate the guid into separate namespaces.
    @return {String} the guid
  */

  exports.GUID_KEY = GUID_KEY;

  function generateGuid(obj, prefix = GUID_PREFIX) {
    let guid = prefix + uuid();

    if (isObject(obj)) {
      OBJECT_GUIDS.set(obj, guid);
    }

    return guid;
  }
  /**
    Returns a unique id for the object. If the object does not yet have a guid,
    one will be assigned to it. You can call this on any object,
    `EmberObject`-based or not.
  
    You can also use this method on DOM Element objects.
  
    @public
    @static
    @method guidFor
    @for @ember/object/internals
    @param {Object} obj any object, string, number, Element, or primitive
    @return {String} the unique guid for this instance.
  */


  function guidFor(value) {
    let guid;

    if (isObject(value)) {
      guid = OBJECT_GUIDS.get(value);

      if (guid === undefined) {
        guid = GUID_PREFIX + uuid();
        OBJECT_GUIDS.set(value, guid);
      }
    } else {
      guid = NON_OBJECT_GUIDS.get(value);

      if (guid === undefined) {
        let type = typeof value;

        if (type === 'string') {
          guid = 'st' + uuid();
        } else if (type === 'number') {
          guid = 'nu' + uuid();
        } else if (type === 'symbol') {
          guid = 'sy' + uuid();
        } else {
          guid = '(' + value + ')';
        }

        NON_OBJECT_GUIDS.set(value, guid);
      }
    }

    return guid;
  }

  const GENERATED_SYMBOLS = [];

  function isInternalSymbol(possibleSymbol) {
    return GENERATED_SYMBOLS.indexOf(possibleSymbol) !== -1;
  }

  function symbol(debugName) {
    // TODO: Investigate using platform symbols, but we do not
    // want to require non-enumerability for this API, which
    // would introduce a large cost.
    let id = GUID_KEY + Math.floor(Math.random() * Date.now());
    let symbol = intern(`__${debugName}${id}__`);
    GENERATED_SYMBOLS.push(symbol);
    return symbol;
  } // the delete is meant to hint at runtimes that this object should remain in
  // dictionary mode. This is clearly a runtime specific hack, but currently it
  // appears worthwhile in some usecases. Please note, these deletes do increase
  // the cost of creation dramatically over a plain Object.create. And as this
  // only makes sense for long-lived dictionaries that aren't instantiated often.


  function makeDictionary(parent) {
    let dict = Object.create(parent);
    dict['_dict'] = null;
    delete dict['_dict'];
    return dict;
  }

  let getDebugName;

  if (es5.DEBUG) {
    let getFunctionName = fn => {
      let functionName = fn.name;

      if (functionName === undefined) {
        let match = Function.prototype.toString.call(fn).match(/function (\w+)\s*\(/);
        functionName = match && match[1] || '';
      }

      return functionName.replace(/^bound /, '');
    };

    let getObjectName = obj => {
      let name;
      let className;

      if (obj.constructor && obj.constructor !== Object) {
        className = getFunctionName(obj.constructor);
      }

      if ('toString' in obj && obj.toString !== Object.prototype.toString && obj.toString !== Function.prototype.toString) {
        name = obj.toString();
      } // If the class has a decent looking name, and the `toString` is one of the
      // default Ember toStrings, replace the constructor portion of the toString
      // with the class name. We check the length of the class name to prevent doing
      // this when the value is minified.


      if (name && name.match(/<.*:ember\d+>/) && className && className[0] !== '_' && className.length > 2 && className !== 'Class') {
        return name.replace(/<.*:/, `<${className}:`);
      }

      return name || className;
    };

    let getPrimitiveName = value => {
      return String(value);
    };

    getDebugName = value => {
      if (typeof value === 'function') {
        return getFunctionName(value) || `(unknown function)`;
      } else if (typeof value === 'object' && value !== null) {
        return getObjectName(value) || `(unknown object)`;
      } else {
        return getPrimitiveName(value);
      }
    };
  }

  var getDebugName$1 = getDebugName;
  exports.getDebugName = getDebugName$1;
  let getOwnPropertyDescriptors;

  if (Object.getOwnPropertyDescriptors !== undefined) {
    getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
  } else {
    getOwnPropertyDescriptors = function (obj) {
      let descriptors = {};
      Object.keys(obj).forEach(key => {
        descriptors[key] = Object.getOwnPropertyDescriptor(obj, key);
      });
      return descriptors;
    };
  }

  var getOwnPropertyDescriptors$1 = getOwnPropertyDescriptors;
  exports.getOwnPropertyDescriptors = getOwnPropertyDescriptors$1;
  const HAS_SUPER_PATTERN = /\.(_super|call\(this|apply\(this)/;
  const fnToString = Function.prototype.toString;

  const checkHasSuper = (() => {
    let sourceAvailable = fnToString.call(function () {
      return this;
    }).indexOf('return this') > -1;

    if (sourceAvailable) {
      return function checkHasSuper(func) {
        return HAS_SUPER_PATTERN.test(fnToString.call(func));
      };
    }

    return function checkHasSuper() {
      return true;
    };
  })();

  exports.checkHasSuper = checkHasSuper;
  const HAS_SUPER_MAP = new WeakMap();
  const ROOT = Object.freeze(function () {});
  exports.ROOT = ROOT;
  HAS_SUPER_MAP.set(ROOT, false);

  function hasSuper(func) {
    let hasSuper = HAS_SUPER_MAP.get(func);

    if (hasSuper === undefined) {
      hasSuper = checkHasSuper(func);
      HAS_SUPER_MAP.set(func, hasSuper);
    }

    return hasSuper;
  }

  const OBSERVERS_MAP = new WeakMap();

  function setObservers(func, observers) {
    OBSERVERS_MAP.set(func, observers);
  }

  function getObservers(func) {
    return OBSERVERS_MAP.get(func);
  }

  const LISTENERS_MAP = new WeakMap();

  function setListeners(func, listeners) {
    if (listeners) {
      LISTENERS_MAP.set(func, listeners);
    }
  }

  function getListeners(func) {
    return LISTENERS_MAP.get(func);
  }

  const IS_WRAPPED_FUNCTION_SET = new polyfills._WeakSet();
  /**
    Wraps the passed function so that `this._super` will point to the superFunc
    when the function is invoked. This is the primitive we use to implement
    calls to super.
  
    @private
    @method wrap
    @for Ember
    @param {Function} func The function to call
    @param {Function} superFunc The super function.
    @return {Function} wrapped function.
  */

  function wrap(func, superFunc) {
    if (!hasSuper(func)) {
      return func;
    } // ensure an unwrapped super that calls _super is wrapped with a terminal _super


    if (!IS_WRAPPED_FUNCTION_SET.has(superFunc) && hasSuper(superFunc)) {
      return _wrap(func, _wrap(superFunc, ROOT));
    }

    return _wrap(func, superFunc);
  }

  function _wrap(func, superFunc) {
    function superWrapper() {
      let orig = this._super;
      this._super = superFunc;
      let ret = func.apply(this, arguments);
      this._super = orig;
      return ret;
    }

    IS_WRAPPED_FUNCTION_SET.add(superWrapper);
    setObservers(superWrapper, getObservers(func));
    setListeners(superWrapper, getListeners(func));
    return superWrapper;
  }

  const {
    toString: objectToString
  } = Object.prototype;
  const {
    toString: functionToString
  } = Function.prototype;
  const {
    isArray
  } = Array;
  const {
    keys: objectKeys
  } = Object;
  const {
    stringify
  } = JSON;
  const LIST_LIMIT = 100;
  const DEPTH_LIMIT = 4;
  const SAFE_KEY = /^[\w$]+$/;
  /**
   @module @ember/debug
  */

  /**
    Convenience method to inspect an object. This method will attempt to
    convert the object into a useful string description.
  
    It is a pretty simple implementation. If you want something more robust,
    use something like JSDump: https://github.com/NV/jsDump
  
    @method inspect
    @static
    @param {Object} obj The object you want to inspect.
    @return {String} A description of the object
    @since 1.4.0
    @private
  */

  function inspect(obj) {
    // detect Node util.inspect call inspect(depth: number, opts: object)
    if (typeof obj === 'number' && arguments.length === 2) {
      return this;
    }

    return inspectValue(obj, 0);
  }

  function inspectValue(value, depth, seen) {
    let valueIsArray = false;

    switch (typeof value) {
      case 'undefined':
        return 'undefined';

      case 'object':
        if (value === null) return 'null';

        if (isArray(value)) {
          valueIsArray = true;
          break;
        } // is toString Object.prototype.toString or undefined then traverse


        if (value.toString === objectToString || value.toString === undefined) {
          break;
        } // custom toString


        return value.toString();

      case 'function':
        return value.toString === functionToString ? value.name ? `[Function:${value.name}]` : `[Function]` : value.toString();

      case 'string':
        return stringify(value);

      case 'symbol':
      case 'boolean':
      case 'number':
      default:
        return value.toString();
    }

    if (seen === undefined) {
      seen = new polyfills._WeakSet();
    } else {
      if (seen.has(value)) return `[Circular]`;
    }

    seen.add(value);
    return valueIsArray ? inspectArray(value, depth + 1, seen) : inspectObject(value, depth + 1, seen);
  }

  function inspectKey(key) {
    return SAFE_KEY.test(key) ? key : stringify(key);
  }

  function inspectObject(obj, depth, seen) {
    if (depth > DEPTH_LIMIT) {
      return '[Object]';
    }

    let s = '{';
    let keys = objectKeys(obj);

    for (let i = 0; i < keys.length; i++) {
      s += i === 0 ? ' ' : ', ';

      if (i >= LIST_LIMIT) {
        s += `... ${keys.length - LIST_LIMIT} more keys`;
        break;
      }

      let key = keys[i];
      s += inspectKey(key) + ': ' + inspectValue(obj[key], depth, seen);
    }

    s += ' }';
    return s;
  }

  function inspectArray(arr, depth, seen) {
    if (depth > DEPTH_LIMIT) {
      return '[Array]';
    }

    let s = '[';

    for (let i = 0; i < arr.length; i++) {
      s += i === 0 ? ' ' : ', ';

      if (i >= LIST_LIMIT) {
        s += `... ${arr.length - LIST_LIMIT} more items`;
        break;
      }

      s += inspectValue(arr[i], depth, seen);
    }

    s += ' ]';
    return s;
  }

  function lookupDescriptor(obj, keyName) {
    let current = obj;

    do {
      let descriptor = Object.getOwnPropertyDescriptor(current, keyName);

      if (descriptor !== undefined) {
        return descriptor;
      }

      current = Object.getPrototypeOf(current);
    } while (current !== null);

    return null;
  }
  /**
    Checks to see if the `methodName` exists on the `obj`.
  
    ```javascript
    let foo = { bar: function() { return 'bar'; }, baz: null };
  
    Ember.canInvoke(foo, 'bar'); // true
    Ember.canInvoke(foo, 'baz'); // false
    Ember.canInvoke(foo, 'bat'); // false
    ```
  
    @method canInvoke
    @for Ember
    @param {Object} obj The object to check for the method
    @param {String} methodName The method name to check for
    @return {Boolean}
    @private
  */


  function canInvoke(obj, methodName) {
    return obj !== null && obj !== undefined && typeof obj[methodName] === 'function';
  }
  /**
    @module @ember/utils
  */

  /**
    Checks to see if the `methodName` exists on the `obj`,
    and if it does, invokes it with the arguments passed.
  
    ```javascript
    import { tryInvoke } from '@ember/utils';
  
    let d = new Date('03/15/2013');
  
    tryInvoke(d, 'getTime');              // 1363320000000
    tryInvoke(d, 'setFullYear', [2014]);  // 1394856000000
    tryInvoke(d, 'noSuchMethod', [2014]); // undefined
    ```
  
    @method tryInvoke
    @for @ember/utils
    @static
    @param {Object} obj The object to check for the method
    @param {String} methodName The method name to check for
    @param {Array} [args] The arguments to pass to the method
    @return {*} the return value of the invoked method or undefined if it cannot be invoked
    @public
  */


  function tryInvoke(obj, methodName, args) {
    if (canInvoke(obj, methodName)) {
      let method = obj[methodName];
      return method.apply(obj, args);
    }
  }

  const {
    isArray: isArray$1
  } = Array;

  function makeArray(obj) {
    if (obj === null || obj === undefined) {
      return [];
    }

    return isArray$1(obj) ? obj : [obj];
  }

  const NAMES = new WeakMap();

  function setName(obj, name) {
    if (isObject(obj)) NAMES.set(obj, name);
  }

  function getName(obj) {
    return NAMES.get(obj);
  }

  const objectToString$1 = Object.prototype.toString;

  function isNone(obj) {
    return obj === null || obj === undefined;
  }
  /*
   A `toString` util function that supports objects without a `toString`
   method, e.g. an object created with `Object.create(null)`.
  */


  function toString(obj) {
    if (typeof obj === 'string') {
      return obj;
    }

    if (null === obj) return 'null';
    if (undefined === obj) return 'undefined';

    if (Array.isArray(obj)) {
      // Reimplement Array.prototype.join according to spec (22.1.3.13)
      // Changing ToString(element) with this safe version of ToString.
      let r = '';

      for (let k = 0; k < obj.length; k++) {
        if (k > 0) {
          r += ',';
        }

        if (!isNone(obj[k])) {
          r += toString(obj[k]);
        }
      }

      return r;
    }

    if (typeof obj.toString === 'function') {
      return obj.toString();
    }

    return objectToString$1.call(obj);
  }

  const HAS_NATIVE_SYMBOL = function () {
    if (typeof Symbol !== 'function') {
      return false;
    }

    return typeof Symbol() === 'symbol';
  }();

  exports.HAS_NATIVE_SYMBOL = HAS_NATIVE_SYMBOL;
  const HAS_NATIVE_PROXY = typeof Proxy === 'function';
  exports.HAS_NATIVE_PROXY = HAS_NATIVE_PROXY;
  const PROXIES = new polyfills._WeakSet();

  function isProxy(value) {
    if (isObject(value)) {
      return PROXIES.has(value);
    }

    return false;
  }

  function setProxy(object) {
    if (isObject(object)) {
      PROXIES.add(object);
    }
  }

  class Cache {
    constructor(limit, func, store) {
      this.limit = limit;
      this.func = func;
      this.store = store;
      this.size = 0;
      this.misses = 0;
      this.hits = 0;
      this.store = store || new Map();
    }

    get(key) {
      if (this.store.has(key)) {
        this.hits++;
        return this.store.get(key);
      } else {
        this.misses++;
        return this.set(key, this.func(key));
      }
    }

    set(key, value) {
      if (this.limit > this.size) {
        this.size++;
        this.store.set(key, value);
      }

      return value;
    }

    purge() {
      this.store.clear();
      this.size = 0;
      this.hits = 0;
      this.misses = 0;
    }

  }

  exports.Cache = Cache;
  const EMBER_ARRAY = symbol('EMBER_ARRAY');
  exports.EMBER_ARRAY = EMBER_ARRAY;

  function isEmberArray(obj) {
    return obj && obj[EMBER_ARRAY];
  }

  let setupMandatorySetter;
  exports.setupMandatorySetter = setupMandatorySetter;
  let teardownMandatorySetter;
  exports.teardownMandatorySetter = teardownMandatorySetter;
  let setWithMandatorySetter;
  exports.setWithMandatorySetter = setWithMandatorySetter;

  function isElementKey(key) {
    return typeof key === 'number' ? isPositiveInt(key) : isStringInt(key);
  }

  function isStringInt(str) {
    let num = parseInt(str, 10);
    return isPositiveInt(num) && str === String(num);
  }

  function isPositiveInt(num) {
    return num >= 0 && num % 1 === 0;
  }

  if (es5.DEBUG) {
    let SEEN_TAGS = new polyfills._WeakSet();
    let MANDATORY_SETTERS = new WeakMap();

    let propertyIsEnumerable = function (obj, key) {
      return Object.prototype.propertyIsEnumerable.call(obj, key);
    };

    exports.setupMandatorySetter = setupMandatorySetter = function (tag, obj, keyName) {
      if (SEEN_TAGS.has(tag)) {
        return;
      }

      SEEN_TAGS.add(tag);

      if (Array.isArray(obj) && isElementKey(keyName)) {
        return;
      }

      let desc = lookupDescriptor(obj, keyName) || {};

      if (desc.get || desc.set) {
        // if it has a getter or setter, we can't install the mandatory setter.
        // native setters are allowed, we have to assume that they will resolve
        // to tracked properties.
        return;
      }

      if (desc && (!desc.configurable || !desc.writable)) {
        // if it isn't writable anyways, so we shouldn't provide the setter.
        // if it isn't configurable, we can't overwrite it anyways.
        return;
      }

      let setters = MANDATORY_SETTERS.get(obj);

      if (setters === undefined) {
        setters = {};
        MANDATORY_SETTERS.set(obj, setters);
      }

      desc.hadOwnProperty = Object.hasOwnProperty.call(obj, keyName);
      setters[keyName] = desc;
      Object.defineProperty(obj, keyName, {
        configurable: true,
        enumerable: propertyIsEnumerable(obj, keyName),

        get() {
          if (desc.get) {
            return desc.get.call(this);
          } else {
            return desc.value;
          }
        },

        set(value) {
          (0, debug_1.assert)(`You attempted to update ${this}.${String(keyName)} to "${String(value)}", but it is being tracked by a tracking context, such as a template, computed property, or observer. In order to make sure the context updates properly, you must invalidate the property when updating it. You can mark the property as \`@tracked\`, or use \`@ember/object#set\` to do this.`);
        }

      });
    };

    exports.teardownMandatorySetter = teardownMandatorySetter = function (obj, keyName) {
      let setters = MANDATORY_SETTERS.get(obj);

      if (setters !== undefined && setters[keyName] !== undefined) {
        Object.defineProperty(obj, keyName, setters[keyName]);
        setters[keyName] = undefined;
      }
    };

    exports.setWithMandatorySetter = setWithMandatorySetter = function (obj, keyName, value) {
      let setters = MANDATORY_SETTERS.get(obj);

      if (setters !== undefined && setters[keyName] !== undefined) {
        let setter = setters[keyName];

        if (setter.set) {
          setter.set.call(obj, value);
        } else {
          setter.value = value; // If the object didn't have own property before, it would have changed
          // the enumerability after setting the value the first time.

          if (!setter.hadOwnProperty) {
            let desc = lookupDescriptor(obj, keyName);
            desc.enumerable = true;
            Object.defineProperty(obj, keyName, desc);
          }
        }
      } else {
        obj[keyName] = value;
      }
    };
  }
  /*
   This package will be eagerly parsed and should have no dependencies on external
   packages.
  
   It is intended to be used to share utility methods that will be needed
   by every Ember application (and is **not** a dumping ground of useful utilities).
  
   Utility methods that are needed in < 80% of cases should be placed
   elsewhere (so they can be lazily evaluated / parsed).
  */

});
unwrapExports(utils);
var utils_1 = utils.symbol;
var utils_2 = utils.isInternalSymbol;
var utils_3 = utils.dictionary;
var utils_4 = utils.uuid;
var utils_5 = utils.generateGuid;
var utils_6 = utils.guidFor;
var utils_7 = utils.intern;
var utils_8 = utils.wrap;
var utils_9 = utils.getObservers;
var utils_10 = utils.getListeners;
var utils_11 = utils.setObservers;
var utils_12 = utils.setListeners;
var utils_13 = utils.inspect;
var utils_14 = utils.lookupDescriptor;
var utils_15 = utils.canInvoke;
var utils_16 = utils.tryInvoke;
var utils_17 = utils.makeArray;
var utils_18 = utils.getName;
var utils_19 = utils.setName;
var utils_20 = utils.isObject;
var utils_21 = utils.isProxy;
var utils_22 = utils.setProxy;
var utils_23 = utils.isEmberArray;
var utils_24 = utils.setWithMandatorySetter;
var utils_25 = utils.teardownMandatorySetter;
var utils_26 = utils.setupMandatorySetter;
var utils_27 = utils.EMBER_ARRAY;
var utils_28 = utils.Cache;
var utils_29 = utils.HAS_NATIVE_PROXY;
var utils_30 = utils.HAS_NATIVE_SYMBOL;
var utils_31 = utils.ROOT;
var utils_32 = utils.checkHasSuper;
var utils_33 = utils.GUID_KEY;
var utils_34 = utils.getOwnPropertyDescriptors;
var utils_35 = utils.getDebugName;
var string$1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.loc = loc;
  exports.w = w;
  exports.decamelize = decamelize;
  exports.dasherize = dasherize;
  exports.camelize = camelize;
  exports.classify = classify;
  exports.underscore = underscore;
  exports.capitalize = capitalize;
  Object.defineProperty(exports, "_getStrings", {
    enumerable: true,
    get: function () {
      return string_registry.getStrings;
    }
  });
  Object.defineProperty(exports, "_setStrings", {
    enumerable: true,
    get: function () {
      return string_registry.setStrings;
    }
  });
  /**
  @module @ember/string
  */

  const STRING_DASHERIZE_REGEXP = /[ _]/g;
  const STRING_DASHERIZE_CACHE = new utils.Cache(1000, key => decamelize(key).replace(STRING_DASHERIZE_REGEXP, '-'));
  const STRING_CAMELIZE_REGEXP_1 = /(\-|\_|\.|\s)+(.)?/g;
  const STRING_CAMELIZE_REGEXP_2 = /(^|\/)([A-Z])/g;
  const CAMELIZE_CACHE = new utils.Cache(1000, key => key.replace(STRING_CAMELIZE_REGEXP_1, (_match, _separator, chr) => chr ? chr.toUpperCase() : '').replace(STRING_CAMELIZE_REGEXP_2, (match
  /*, separator, chr */
  ) => match.toLowerCase()));
  const STRING_CLASSIFY_REGEXP_1 = /^(\-|_)+(.)?/;
  const STRING_CLASSIFY_REGEXP_2 = /(.)(\-|\_|\.|\s)+(.)?/g;
  const STRING_CLASSIFY_REGEXP_3 = /(^|\/|\.)([a-z])/g;
  const CLASSIFY_CACHE = new utils.Cache(1000, str => {
    let replace1 = (_match, _separator, chr) => chr ? `_${chr.toUpperCase()}` : '';

    let replace2 = (_match, initialChar, _separator, chr) => initialChar + (chr ? chr.toUpperCase() : '');

    let parts = str.split('/');

    for (let i = 0; i < parts.length; i++) {
      parts[i] = parts[i].replace(STRING_CLASSIFY_REGEXP_1, replace1).replace(STRING_CLASSIFY_REGEXP_2, replace2);
    }

    return parts.join('/').replace(STRING_CLASSIFY_REGEXP_3, (match
    /*, separator, chr */
    ) => match.toUpperCase());
  });
  const STRING_UNDERSCORE_REGEXP_1 = /([a-z\d])([A-Z]+)/g;
  const STRING_UNDERSCORE_REGEXP_2 = /\-|\s+/g;
  const UNDERSCORE_CACHE = new utils.Cache(1000, str => str.replace(STRING_UNDERSCORE_REGEXP_1, '$1_$2').replace(STRING_UNDERSCORE_REGEXP_2, '_').toLowerCase());
  const STRING_CAPITALIZE_REGEXP = /(^|\/)([a-z\u00C0-\u024F])/g;
  const CAPITALIZE_CACHE = new utils.Cache(1000, str => str.replace(STRING_CAPITALIZE_REGEXP, (match
  /*, separator, chr */
  ) => match.toUpperCase()));
  const STRING_DECAMELIZE_REGEXP = /([a-z\d])([A-Z])/g;
  const DECAMELIZE_CACHE = new utils.Cache(1000, str => str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase());
  /**
    Defines string helper methods including string formatting and localization.
    Unless `EmberENV.EXTEND_PROTOTYPES.String` is `false` these methods will also be
    added to the `String.prototype` as well.
  
    @class String
    @public
  */

  function _fmt(str, formats) {
    // first, replace any ORDERED replacements.
    let idx = 0; // the current index for non-numerical replacements

    return str.replace(/%@([0-9]+)?/g, (_s, argIndex) => {
      let i = argIndex ? parseInt(argIndex, 10) - 1 : idx++;
      let r = i < formats.length ? formats[i] : undefined;
      return typeof r === 'string' ? r : r === null ? '(null)' : r === undefined ? '' : String(r);
    });
  }
  /**
    Formats the passed string, but first looks up the string in the localized
    strings hash. This is a convenient way to localize text.
  
    Note that it is traditional but not required to prefix localized string
    keys with an underscore or other character so you can easily identify
    localized strings.
  
    ```javascript
    import { loc } from '@ember/string';
  
    Ember.STRINGS = {
      '_Hello World': 'Bonjour le monde',
      '_Hello %@ %@': 'Bonjour %@ %@'
    };
  
    loc("_Hello World");  // 'Bonjour le monde';
    loc("_Hello %@ %@", ["John", "Smith"]);  // "Bonjour John Smith";
    ```
  
    @method loc
    @param {String} str The string to format
    @param {Array} formats Optional array of parameters to interpolate into string.
    @return {String} formatted string
    @public
  */


  function loc(str, formats) {
    if (!Array.isArray(formats) || arguments.length > 2) {
      formats = Array.prototype.slice.call(arguments, 1);
    }

    str = (0, string_registry.getString)(str) || str;
    return _fmt(str, formats);
  }
  /**
    Splits a string into separate units separated by spaces, eliminating any
    empty strings in the process. This is a convenience method for split that
    is mostly useful when applied to the `String.prototype`.
  
    ```javascript
    import { w } from '@ember/string';
  
    w("alpha beta gamma").forEach(function(key) {
      console.log(key);
    });
  
    // > alpha
    // > beta
    // > gamma
    ```
  
    @method w
    @param {String} str The string to split
    @return {Array} array containing the split strings
    @public
  */


  function w(str) {
    return str.split(/\s+/);
  }
  /**
    Converts a camelized string into all lower case separated by underscores.
  
    ```javascript
    import { decamelize } from '@ember/string';
  
    decamelize('innerHTML');          // 'inner_html'
    decamelize('action_name');        // 'action_name'
    decamelize('css-class-name');     // 'css-class-name'
    decamelize('my favorite items');  // 'my favorite items'
    ```
  
    @method decamelize
    @param {String} str The string to decamelize.
    @return {String} the decamelized string.
    @public
  */


  function decamelize(str) {
    return DECAMELIZE_CACHE.get(str);
  }
  /**
    Replaces underscores, spaces, or camelCase with dashes.
  
    ```javascript
    import { dasherize } from '@ember/string';
  
    dasherize('innerHTML');                // 'inner-html'
    dasherize('action_name');              // 'action-name'
    dasherize('css-class-name');           // 'css-class-name'
    dasherize('my favorite items');        // 'my-favorite-items'
    dasherize('privateDocs/ownerInvoice';  // 'private-docs/owner-invoice'
    ```
  
    @method dasherize
    @param {String} str The string to dasherize.
    @return {String} the dasherized string.
    @public
  */


  function dasherize(str) {
    return STRING_DASHERIZE_CACHE.get(str);
  }
  /**
    Returns the lowerCamelCase form of a string.
  
    ```javascript
    import { camelize } from '@ember/string';
  
    camelize('innerHTML');                   // 'innerHTML'
    camelize('action_name');                 // 'actionName'
    camelize('css-class-name');              // 'cssClassName'
    camelize('my favorite items');           // 'myFavoriteItems'
    camelize('My Favorite Items');           // 'myFavoriteItems'
    camelize('private-docs/owner-invoice');  // 'privateDocs/ownerInvoice'
    ```
  
    @method camelize
    @param {String} str The string to camelize.
    @return {String} the camelized string.
    @public
  */


  function camelize(str) {
    return CAMELIZE_CACHE.get(str);
  }
  /**
    Returns the UpperCamelCase form of a string.
  
    ```javascript
    import { classify } from '@ember/string';
  
    classify('innerHTML');                   // 'InnerHTML'
    classify('action_name');                 // 'ActionName'
    classify('css-class-name');              // 'CssClassName'
    classify('my favorite items');           // 'MyFavoriteItems'
    classify('private-docs/owner-invoice');  // 'PrivateDocs/OwnerInvoice'
    ```
  
    @method classify
    @param {String} str the string to classify
    @return {String} the classified string
    @public
  */


  function classify(str) {
    return CLASSIFY_CACHE.get(str);
  }
  /**
    More general than decamelize. Returns the lower\_case\_and\_underscored
    form of a string.
  
    ```javascript
    import { underscore } from '@ember/string';
  
    underscore('innerHTML');                 // 'inner_html'
    underscore('action_name');               // 'action_name'
    underscore('css-class-name');            // 'css_class_name'
    underscore('my favorite items');         // 'my_favorite_items'
    underscore('privateDocs/ownerInvoice');  // 'private_docs/owner_invoice'
    ```
  
    @method underscore
    @param {String} str The string to underscore.
    @return {String} the underscored string.
    @public
  */


  function underscore(str) {
    return UNDERSCORE_CACHE.get(str);
  }
  /**
    Returns the Capitalized form of a string
  
    ```javascript
    import { capitalize } from '@ember/string';
  
    capitalize('innerHTML')                 // 'InnerHTML'
    capitalize('action_name')               // 'Action_name'
    capitalize('css-class-name')            // 'Css-class-name'
    capitalize('my favorite items')         // 'My favorite items'
    capitalize('privateDocs/ownerInvoice'); // 'PrivateDocs/ownerInvoice'
    ```
  
    @method capitalize
    @param {String} str The string to capitalize.
    @return {String} The capitalized string.
    @public
  */


  function capitalize(str) {
    return CAPITALIZE_CACHE.get(str);
  }

  if (environment.ENV.EXTEND_PROTOTYPES.String) {
    Object.defineProperties(String.prototype, {
      /**
        See [String.w](/ember/release/classes/String/methods/w?anchor=w).
             @method w
        @for @ember/string
        @static
        @private
      */
      w: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return w(this);
        }

      },

      /**
        See [String.loc](/ember/release/classes/String/methods/loc?anchor=loc).
             @method loc
        @for @ember/string
        @static
        @private
      */
      loc: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value(...args) {
          return loc(this, args);
        }

      },

      /**
        See [String.camelize](/ember/release/classes/String/methods/camelize?anchor=camelize).
             @method camelize
        @for @ember/string
        @static
        @private
      */
      camelize: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return camelize(this);
        }

      },

      /**
        See [String.decamelize](/ember/release/classes/String/methods/decamelize?anchor=decamelize).
             @method decamelize
        @for @ember/string
        @static
        @private
      */
      decamelize: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return decamelize(this);
        }

      },

      /**
        See [String.dasherize](/ember/release/classes/String/methods/dasherize?anchor=dasherize).
             @method dasherize
        @for @ember/string
        @static
        @private
      */
      dasherize: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return dasherize(this);
        }

      },

      /**
        See [String.underscore](/ember/release/classes/String/methods/underscore?anchor=underscore).
             @method underscore
        @for @ember/string
        @static
        @private
      */
      underscore: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return underscore(this);
        }

      },

      /**
        See [String.classify](/ember/release/classes/String/methods/classify?anchor=classify).
             @method classify
        @for @ember/string
        @static
        @private
      */
      classify: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return classify(this);
        }

      },

      /**
        See [String.capitalize](/ember/release/classes/String/methods/capitalize?anchor=capitalize).
             @method capitalize
        @for @ember/string
        @static
        @private
      */
      capitalize: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return capitalize(this);
        }

      }
    });
  }
});
unwrapExports(string$1);
var string_1$1 = string$1.loc;
var string_2 = string$1.w;
var string_3 = string$1.decamelize;
var string_4 = string$1.dasherize;
var string_5 = string$1.camelize;
var string_6 = string$1.classify;
var string_7 = string$1.underscore;
var string_8 = string$1.capitalize;
var inflections = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = void 0;
  var _default = {
    plurals: [[/$/, "s"], [/s$/i, "s"], [/^(ax|test)is$/i, "$1es"], [/(octop|vir)us$/i, "$1i"], [/(octop|vir)i$/i, "$1i"], [/(alias|status|bonus)$/i, "$1es"], [/(bu)s$/i, "$1ses"], [/(buffal|tomat)o$/i, "$1oes"], [/([ti])um$/i, "$1a"], [/([ti])a$/i, "$1a"], [/sis$/i, "ses"], [/(?:([^f])fe|([lr])f)$/i, "$1$2ves"], [/(hive)$/i, "$1s"], [/([^aeiouy]|qu)y$/i, "$1ies"], [/(x|ch|ss|sh)$/i, "$1es"], [/(matr|vert|ind)(?:ix|ex)$/i, "$1ices"], [/^(m|l)ouse$/i, "$1ice"], [/^(m|l)ice$/i, "$1ice"], [/^(ox)$/i, "$1en"], [/^(oxen)$/i, "$1"], [/(quiz)$/i, "$1zes"]],
    singular: [[/s$/i, ""], [/(ss)$/i, "$1"], [/(n)ews$/i, "$1ews"], [/([ti])a$/i, "$1um"], [/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)(sis|ses)$/i, "$1sis"], [/(^analy)(sis|ses)$/i, "$1sis"], [/([^f])ves$/i, "$1fe"], [/(hive)s$/i, "$1"], [/(tive)s$/i, "$1"], [/([lr])ves$/i, "$1f"], [/([^aeiouy]|qu)ies$/i, "$1y"], [/(s)eries$/i, "$1eries"], [/(m)ovies$/i, "$1ovie"], [/(x|ch|ss|sh)es$/i, "$1"], [/^(m|l)ice$/i, "$1ouse"], [/(bus)(es)?$/i, "$1"], [/(o)es$/i, "$1"], [/(shoe)s$/i, "$1"], [/(cris|test)(is|es)$/i, "$1is"], [/^(a)x[ie]s$/i, "$1xis"], [/(octop|vir)(us|i)$/i, "$1us"], [/(alias|status|bonus)(es)?$/i, "$1"], [/^(ox)en/i, "$1"], [/(vert|ind)ices$/i, "$1ex"], [/(matr)ices$/i, "$1ix"], [/(quiz)zes$/i, "$1"], [/(database)s$/i, "$1"]],
    irregularPairs: [["person", "people"], ["man", "men"], ["child", "children"], ["sex", "sexes"], ["move", "moves"], ["cow", "kine"], ["zombie", "zombies"]],
    uncountable: ["equipment", "information", "rice", "money", "species", "series", "fish", "sheep", "jeans", "police"]
  };
  exports.default = _default;
});
unwrapExports(inflections);
var inflector = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = void 0;

  var _inflections = _interopRequireDefault(inflections);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  const BLANK_REGEX = /^\s*$/;
  const LAST_WORD_DASHED_REGEX = /([\w/-]+[_/\s-])([a-z\d]+$)/;
  const LAST_WORD_CAMELIZED_REGEX = /([\w/\s-]+)([A-Z][a-z\d]*$)/;
  const CAMELIZED_REGEX = /[A-Z][a-z\d]*$/;

  function loadUncountable(rules, uncountable) {
    for (let i = 0, length = uncountable.length; i < length; i++) {
      rules.uncountable[uncountable[i].toLowerCase()] = true;
    }
  }

  function loadIrregular(rules, irregularPairs) {
    let pair;

    for (let i = 0, length = irregularPairs.length; i < length; i++) {
      pair = irregularPairs[i]; //pluralizing

      rules.irregular[pair[0].toLowerCase()] = pair[1];
      rules.irregular[pair[1].toLowerCase()] = pair[1]; //singularizing

      rules.irregularInverse[pair[1].toLowerCase()] = pair[0];
      rules.irregularInverse[pair[0].toLowerCase()] = pair[0];
    }
  }
  /**
    Inflector.Ember provides a mechanism for supplying inflection rules for your
    application. Ember includes a default set of inflection rules, and provides an
    API for providing additional rules.
  
    Examples:
  
    Creating an inflector with no rules.
  
    ```js
    var inflector = new Ember.Inflector();
    ```
  
    Creating an inflector with the default ember ruleset.
  
    ```js
    var inflector = new Ember.Inflector(Ember.Inflector.defaultRules);
  
    inflector.pluralize('cow'); //=> 'kine'
    inflector.singularize('kine'); //=> 'cow'
    ```
  
    Creating an inflector and adding rules later.
  
    ```javascript
    var inflector = Ember.Inflector.inflector;
  
    inflector.pluralize('advice'); // => 'advices'
    inflector.uncountable('advice');
    inflector.pluralize('advice'); // => 'advice'
  
    inflector.pluralize('formula'); // => 'formulas'
    inflector.irregular('formula', 'formulae');
    inflector.pluralize('formula'); // => 'formulae'
  
    // you would not need to add these as they are the default rules
    inflector.plural(/$/, 's');
    inflector.singular(/s$/i, '');
    ```
  
    Creating an inflector with a nondefault ruleset.
  
    ```javascript
    var rules = {
      plurals:  [
        [ /$/, 's' ]
      ],
      singular: [
        [ /\s$/, '' ]
      ],
      irregularPairs: [
        [ 'cow', 'kine' ]
      ],
      uncountable: [ 'fish' ]
    };
  
    var inflector = new Ember.Inflector(rules);
    ```
  
    @class Inflector
    @namespace Ember
  */


  function Inflector(ruleSet) {
    ruleSet = ruleSet || {};
    ruleSet.uncountable = ruleSet.uncountable || makeDictionary();
    ruleSet.irregularPairs = ruleSet.irregularPairs || makeDictionary();
    const rules = this.rules = {
      plurals: ruleSet.plurals || [],
      singular: ruleSet.singular || [],
      irregular: makeDictionary(),
      irregularInverse: makeDictionary(),
      uncountable: makeDictionary()
    };
    loadUncountable(rules, ruleSet.uncountable);
    loadIrregular(rules, ruleSet.irregularPairs);
    this.enableCache();
  }

  if (!Object.create && !Object.create(null).hasOwnProperty) {
    throw new Error("This browser does not support Object.create(null), please polyfil with es5-sham: http://git.io/yBU2rg");
  }

  function makeDictionary() {
    var cache = Object.create(null);
    cache["_dict"] = null;
    delete cache["_dict"];
    return cache;
  }

  Inflector.prototype = {
    /**
      @public
       As inflections can be costly, and commonly the same subset of words are repeatedly
      inflected an optional cache is provided.
       @method enableCache
    */
    enableCache() {
      this.purgeCache();

      this.singularize = function (word) {
        this._cacheUsed = true;
        return this._sCache[word] || (this._sCache[word] = this._singularize(word));
      };

      this.pluralize = function (numberOrWord, word, options = {}) {
        this._cacheUsed = true;
        var cacheKey = [numberOrWord, word, options.withoutCount];
        return this._pCache[cacheKey] || (this._pCache[cacheKey] = this._pluralize(numberOrWord, word, options));
      };
    },

    /**
      @public
       @method purgeCache
    */
    purgeCache() {
      this._cacheUsed = false;
      this._sCache = makeDictionary();
      this._pCache = makeDictionary();
    },

    /**
      @public
      disable caching
       @method disableCache;
    */
    disableCache() {
      this._sCache = null;
      this._pCache = null;

      this.singularize = function (word) {
        return this._singularize(word);
      };

      this.pluralize = function () {
        return this._pluralize(...arguments);
      };
    },

    /**
      @method plural
      @param {RegExp} regex
      @param {String} string
    */
    plural(regex, string) {
      if (this._cacheUsed) {
        this.purgeCache();
      }

      this.rules.plurals.push([regex, string.toLowerCase()]);
    },

    /**
      @method singular
      @param {RegExp} regex
      @param {String} string
    */
    singular(regex, string) {
      if (this._cacheUsed) {
        this.purgeCache();
      }

      this.rules.singular.push([regex, string.toLowerCase()]);
    },

    /**
      @method uncountable
      @param {String} regex
    */
    uncountable(string) {
      if (this._cacheUsed) {
        this.purgeCache();
      }

      loadUncountable(this.rules, [string.toLowerCase()]);
    },

    /**
      @method irregular
      @param {String} singular
      @param {String} plural
    */
    irregular(singular, plural) {
      if (this._cacheUsed) {
        this.purgeCache();
      }

      loadIrregular(this.rules, [[singular, plural]]);
    },

    /**
      @method pluralize
      @param {String} word
    */
    pluralize() {
      return this._pluralize(...arguments);
    },

    _pluralize(wordOrCount, word, options = {}) {
      if (word === undefined) {
        return this.inflect(wordOrCount, this.rules.plurals, this.rules.irregular);
      }

      if (parseFloat(wordOrCount) !== 1) {
        word = this.inflect(word, this.rules.plurals, this.rules.irregular);
      }

      return options.withoutCount ? word : `${wordOrCount} ${word}`;
    },

    /**
      @method singularize
      @param {String} word
    */
    singularize(word) {
      return this._singularize(word);
    },

    _singularize(word) {
      return this.inflect(word, this.rules.singular, this.rules.irregularInverse);
    },

    /**
      @protected
       @method inflect
      @param {String} word
      @param {Object} typeRules
      @param {Object} irregular
    */
    inflect(word, typeRules, irregular) {
      let inflection, substitution, result, lowercase, wordSplit, lastWord, isBlank, isCamelized, rule, isUncountable;
      isBlank = !word || BLANK_REGEX.test(word);
      isCamelized = CAMELIZED_REGEX.test(word);

      if (isBlank) {
        return word;
      }

      lowercase = word.toLowerCase();
      wordSplit = LAST_WORD_DASHED_REGEX.exec(word) || LAST_WORD_CAMELIZED_REGEX.exec(word);

      if (wordSplit) {
        lastWord = wordSplit[2].toLowerCase();
      }

      isUncountable = this.rules.uncountable[lowercase] || this.rules.uncountable[lastWord];

      if (isUncountable) {
        return word;
      }

      for (rule in irregular) {
        if (lowercase.match(rule + "$")) {
          substitution = irregular[rule];

          if (isCamelized && irregular[lastWord]) {
            substitution = (0, string$1.capitalize)(substitution);
            rule = (0, string$1.capitalize)(rule);
          }

          return word.replace(new RegExp(rule, "i"), substitution);
        }
      }

      for (var i = typeRules.length, min = 0; i > min; i--) {
        inflection = typeRules[i - 1];
        rule = inflection[0];

        if (rule.test(word)) {
          break;
        }
      }

      inflection = inflection || [];
      rule = inflection[0];
      substitution = inflection[1];
      result = word.replace(rule, substitution);
      return result;
    }

  };
  Inflector.defaultRules = _inflections.default;
  Inflector.inflector = new Inflector(_inflections.default);
  var _default = Inflector;
  exports.default = _default;
});
unwrapExports(inflector);
var string$2 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.pluralize = pluralize;
  exports.singularize = singularize;

  var _inflector = _interopRequireDefault(inflector);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function pluralize() {
    return _inflector.default.inflector.pluralize(...arguments);
  }

  function singularize(word) {
    return _inflector.default.inflector.singularize(word);
  }
});
unwrapExports(string$2);
var string_1$2 = string$2.pluralize;
var string_2$1 = string$2.singularize;
var system = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, "Inflector", {
    enumerable: true,
    get: function () {
      return _inflector.default;
    }
  });
  Object.defineProperty(exports, "pluralize", {
    enumerable: true,
    get: function () {
      return string$2.pluralize;
    }
  });
  Object.defineProperty(exports, "singularize", {
    enumerable: true,
    get: function () {
      return string$2.singularize;
    }
  });

  var _inflector = _interopRequireDefault(inflector);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }
});
unwrapExports(system);
var emberInflector = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, "defaultRules", {
    enumerable: true,
    get: function () {
      return system.defaultRules;
    }
  });
  Object.defineProperty(exports, "pluralize", {
    enumerable: true,
    get: function () {
      return system.pluralize;
    }
  });
  Object.defineProperty(exports, "singularize", {
    enumerable: true,
    get: function () {
      return system.singularize;
    }
  });
  exports.default = void 0;
  var _default = system.Inflector;
  exports.default = _default;
});
unwrapExports(emberInflector);
var utils$1 = createCommonjsModule(function (module, exports) {
  var __importDefault = commonjsGlobal && commonjsGlobal.__importDefault || function (mod) {
    return mod && mod.__esModule ? mod : {
      "default": mod
    };
  };

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  const ansi_colors_1 = __importDefault(ansiColors);

  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0,
            v = c === "x" ? r : r & 0x3 | 0x8;
      return v.toString(16);
    });
  }

  exports.generateUUID = generateUUID;

  function primaryKeyTypeSafetyCheck(targetPrimaryKeyType, primaryKey, modelName) {
    const primaryKeyType = typeof primaryKey;

    if (targetPrimaryKeyType === "id" && primaryKeyType !== "number") {
      throw new Error(ansi_colors_1.default.red(`[Memserver] ${modelName} model primaryKey type is 'id'. Instead you've tried to enter id: ${primaryKey} with ${primaryKeyType} type`));
    } else if (targetPrimaryKeyType === "uuid" && primaryKeyType !== "string") {
      throw new Error(ansi_colors_1.default.red(`[Memserver] ${modelName} model primaryKey type is 'uuid'. Instead you've tried to enter uuid: ${primaryKey} with ${primaryKeyType} type`));
    }

    return targetPrimaryKeyType;
  }

  exports.primaryKeyTypeSafetyCheck = primaryKeyTypeSafetyCheck;

  function insertFixturesWithTypechecks(modelDefinition, fixtures) {
    const modelPrimaryKey = fixtures.reduce((primaryKeys, fixture) => {
      const modelName = modelDefinition.name;
      const primaryKey = (fixture.uuid ? "uuid" : null) || (fixture.id ? "id" : null);

      if (!primaryKey) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] DATABASE ERROR: At least one of your ${modelName} fixtures missing a primary key. Please make sure all your ${modelName} fixtures have either id or uuid primaryKey`));
      } else if (primaryKeys.includes(fixture[primaryKey])) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] DATABASE ERROR: Duplication in ${modelName} fixtures with ${primaryKey}: ${fixture[primaryKey]}`));
      }

      modelDefinition.insert(fixture);
      return primaryKeys.concat([fixture[primaryKey]]);
    }, [])[0];
    return fixtures;
  }

  exports.insertFixturesWithTypechecks = insertFixturesWithTypechecks;
});
unwrapExports(utils$1);
var utils_1$1 = utils$1.generateUUID;
var utils_2$1 = utils$1.primaryKeyTypeSafetyCheck;
var utils_3$1 = utils$1.insertFixturesWithTypechecks;
var model = createCommonjsModule(function (module, exports) {
  var __importDefault = commonjsGlobal && commonjsGlobal.__importDefault || function (mod) {
    return mod && mod.__esModule ? mod : {
      "default": mod
    };
  };

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  const util_1 = __importDefault(util);

  const ansi_colors_1 = __importDefault(ansiColors);

  class MemServerModel {
    static get DB() {
      if (!this._DB[this.name]) {
        this._DB[this.name] = [];
        return this._DB[this.name];
      }

      return this._DB[this.name];
    }

    static get attributes() {
      if (!this._attributes[this.name]) {
        this._attributes[this.name] = [];
        this._modelDefinitions[this.name] = this;
        return this._attributes[this.name];
      }

      return this._attributes[this.name];
    }

    static set defaultAttributes(value) {
      Object.keys(value).forEach(key => {
        if (!this.attributes.includes(key)) {
          this.attributes.push(key);
        }
      });
      this._defaultAttributes = value;
    }

    static get defaultAttributes() {
      return this._defaultAttributes;
    }

    static set embedReferences(references) {
      this._embedReferences[this.name] = references;
    }

    static get embedReferences() {
      // NOTE: serializer concern
      if (!this._embedReferences[this.name]) {
        this._embedReferences[this.name] = {};
        return this._embedReferences[this.name];
      }

      return this._embedReferences[this.name];
    }

    static resetDatabase(fixtures) {
      this.DB.length = 0;
      this.attributes.length = 0;
      this.defaultAttributes = this.defaultAttributes;

      if (fixtures) {
        utils$1.insertFixturesWithTypechecks(this, fixtures);
      }

      return this.DB;
    }

    static count() {
      return this.DB.length;
    }

    static find(param) {
      // NOTE: turn param into an interface with id or uuid
      if (!param) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.find(id) cannot be called without a valid id`));
      } else if (Array.isArray(param)) {
        const models = Array.from(this.DB);
        return models.reduce((result, model) => {
          const foundModel = param.includes(model.id) ? model : null;
          return foundModel ? result.concat([foundModel]) : result;
        }, []);
      } else if (typeof param !== "number") {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.find(id) cannot be called without a valid id`));
      }

      const models = Array.from(this.DB);
      return models.find(model => model.id === param);
    }

    static findBy(options) {
      if (!options) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.findBy(id) cannot be called without a parameter`));
      }

      const keys = Object.keys(options);
      return this.DB.find(model => comparison(model, options, keys, 0));
    }

    static findAll(options = {}) {
      const models = Array.from(this.DB);
      const keys = Object.keys(options);

      if (keys.length === 0) {
        return models;
      }

      return models.filter(model => comparison(model, options, keys, 0));
    }

    static insert(options) {
      if (this.DB.length === 0) {
        const recordsPrimaryKey = this.primaryKey || (options.uuid ? "uuid" : "id");
        this.primaryKey = recordsPrimaryKey;
        this.attributes.push(this.primaryKey);
      }

      const defaultAttributes = this.attributes.reduce((result, attribute) => {
        if (attribute === this.primaryKey) {
          result[attribute] = this.primaryKey === "id" ? incrementId(this.DB) : utils$1.generateUUID();
          return result;
        }

        const target = this.defaultAttributes[attribute];
        result[attribute] = typeof target === "function" ? target() : target;
        return result;
      }, {});
      const target = Object.assign(defaultAttributes, options);
      utils$1.primaryKeyTypeSafetyCheck(this.primaryKey, target[this.primaryKey], this.name);
      const existingRecord = target.id ? this.find(target.id) : this.findBy({
        uuid: target.uuid
      });

      if (existingRecord) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name} ${this.primaryKey} ${target[this.primaryKey]} already exists in the database! ${this.name}.insert(${util_1.default.inspect(options)}) fails`));
      }

      Object.keys(target).filter(attribute => !this.attributes.includes(attribute)).forEach(attribute => this.attributes.push(attribute));
      this.DB.push(target);
      return target;
    }

    static update(record) {
      if (!record || !record.id && !record.uuid) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.update(record) requires id or uuid primary key to update a record`));
      }

      const targetRecord = record.id ? this.find(record.id) : this.findBy({
        uuid: record.uuid
      });

      if (!targetRecord) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.update(record) failed because ${this.name} with ${this.primaryKey}: ${record[this.primaryKey]} does not exist`));
      }

      const recordsUnknownAttribute = Object.keys(record).find(attribute => !this.attributes.includes(attribute));

      if (recordsUnknownAttribute) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.update ${this.primaryKey}: ${record[this.primaryKey]} fails, ${this.name} model does not have ${recordsUnknownAttribute} attribute to update`));
      }

      return Object.assign(targetRecord, record);
    }

    static delete(record) {
      if (this.DB.length === 0) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name} has no records in the database to delete. ${this.name}.delete(${util_1.default.inspect(record)}) failed`));
      } else if (!record) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.delete(model) model object parameter required to delete a model`));
      }

      const targetRecord = record.id ? this.find(record.id) : this.findBy({
        uuid: record.uuid
      });

      if (!targetRecord) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] Could not find ${this.name} with ${this.primaryKey} ${record[this.primaryKey]} to delete. ${this.name}.delete(${util_1.default.inspect(record)}) failed`));
      }

      if (Array.isArray(targetRecord)) {
        targetRecord.forEach(record => {
          const targetIndex = this.DB.indexOf(record);
          this.DB.splice(targetIndex, 1);
        });
        return targetRecord;
      }

      const targetIndex = this.DB.indexOf(targetRecord);
      this.DB.splice(targetIndex, 1);
      return targetRecord;
    }

    static embed(relationship) {
      // EXAMPLE: { comments: Comment }
      if (typeof relationship !== "object" || relationship.name) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.embed(relationshipObject) requires an object as a parameter: { relationshipKey: $RelationshipModel }`));
      }

      const key = Object.keys(relationship)[0];

      if (!relationship[key]) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.embed() fails: ${key} Model reference is not a valid. Please put a valid $ModelName to ${this.name}.embed()`));
      }

      return Object.assign(this.embedReferences, relationship);
    }

    static serializer(objectOrArray) {
      if (!objectOrArray) {
        return;
      } else if (Array.isArray(objectOrArray)) {
        return objectOrArray.map(object => this.serialize(object), []);
      }

      return this.serialize(objectOrArray);
    }

    static serialize(object) {
      // NOTE: add links object ?
      if (Array.isArray(object)) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.serialize(object) expects an object not an array. Use ${this.name}.serializer(data) for serializing array of records`));
      }

      const objectWithAllAttributes = this.attributes.reduce((result, attribute) => {
        if (result[attribute] === undefined) {
          result[attribute] = null;
        }

        return result;
      }, Object.assign({}, object));
      return Object.keys(this.embedReferences).reduce((result, embedKey) => {
        const embedModel = this.embedReferences[embedKey];
        const embeddedRecords = this.getRelationship(object, embedKey, embedModel);
        return Object.assign({}, result, {
          [embedKey]: embedModel.serializer(embeddedRecords)
        });
      }, objectWithAllAttributes);
    }

    static getRelationship(parentObject, relationshipName, relationshipModel) {
      if (Array.isArray(parentObject)) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${this.name}.getRelationship expects model input to be an object not an array`));
      }

      const targetRelationshipModel = relationshipModel || this.embedReferences[relationshipName];
      const hasManyRelationship = emberInflector.pluralize(relationshipName) === relationshipName;

      if (!targetRelationshipModel) {
        throw new Error(ansi_colors_1.default.red(`[Memserver] ${relationshipName} relationship could not be found on ${this.name} model. Please put the ${relationshipName} Model object as the third parameter to ${this.name}.getRelationship function`));
      } else if (hasManyRelationship) {
        if (parentObject.id) {
          const hasManyIDRecords = targetRelationshipModel.findAll({
            [`${string$1.underscore(this.name)}_id`]: parentObject.id
          });
          return hasManyIDRecords.length > 0 ? hasManyIDRecords : [];
        } else if (parentObject.uuid) {
          const hasManyUUIDRecords = targetRelationshipModel.findAll({
            [`${string$1.underscore(this.name)}_uuid`]: parentObject.uuid
          });
          return hasManyUUIDRecords.length > 0 ? hasManyUUIDRecords : [];
        }
      }

      const objectRef = parentObject[`${string$1.underscore(relationshipName)}_id`] || parentObject[`${string$1.underscore(relationshipName)}_uuid`] || parentObject[`${string$1.underscore(targetRelationshipModel.name)}_id`] || parentObject[`${string$1.underscore(targetRelationshipModel.name)}_uuid`];

      if (objectRef && typeof objectRef === "number") {
        return targetRelationshipModel.find(objectRef);
      } else if (objectRef) {
        return targetRelationshipModel.findBy({
          uuid: objectRef
        });
      }

      if (parentObject.id) {
        return targetRelationshipModel.findBy({
          [`${string$1.underscore(this.name)}_id`]: parentObject.id
        });
      } else if (parentObject.uuid) {
        return targetRelationshipModel.findBy({
          [`${string$1.underscore(this.name)}_uuid`]: parentObject.uuid
        });
      }
    }

  }

  exports.default = MemServerModel;
  MemServerModel._DB = {};
  MemServerModel._modelDefinitions = {};
  MemServerModel._attributes = {};
  MemServerModel._defaultAttributes = {}; // NOTE: probably a decorator here in future

  MemServerModel._embedReferences = {}; // NOTE: serializer concern

  MemServerModel.primaryKey = null; // NOTE: this might be problematic!!

  function incrementId(DB, Model) {
    if (!DB || DB.length === 0) {
      return 1;
    }

    const lastIdInSequence = DB.map(model => model.id).sort((a, b) => a - b).find((id, index, array) => index === array.length - 1 ? true : id + 1 !== array[index + 1]);
    return lastIdInSequence + 1;
  } // NOTE: if records were ordered by ID, then there could be performance benefit


  function comparison(model, options, keys, index = 0) {
    const key = keys[index];

    if (keys.length === index) {
      return model[key] === options[key];
    } else if (model[key] === options[key]) {
      return comparison(model, options, keys, index + 1);
    }

    return false;
  }
});
var model$1 = unwrapExports(model);
module.exports = model$1;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"_process":6,"buffer":2}],5:[function(require,module,exports){
(function (process,global){
'use strict';

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function unwrapExports(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
  return module = {
    exports: {}
  }, fn(module, module.exports), module.exports;
}

var symbols = createCommonjsModule(function (module) {
  const isHyper = process.env.TERM_PROGRAM === 'Hyper';
  const isWindows = process.platform === 'win32';
  const isLinux = process.platform === 'linux';
  const common = {
    ballotDisabled: '☒',
    ballotOff: '☐',
    ballotOn: '☑',
    bullet: '•',
    bulletWhite: '◦',
    fullBlock: '█',
    heart: '❤',
    identicalTo: '≡',
    line: '─',
    mark: '※',
    middot: '·',
    minus: '－',
    multiplication: '×',
    obelus: '÷',
    pencilDownRight: '✎',
    pencilRight: '✏',
    pencilUpRight: '✐',
    percent: '%',
    pilcrow2: '❡',
    pilcrow: '¶',
    plusMinus: '±',
    section: '§',
    starsOff: '☆',
    starsOn: '★',
    upDownArrow: '↕'
  };
  const windows = Object.assign({}, common, {
    check: '√',
    cross: '×',
    ellipsisLarge: '...',
    ellipsis: '...',
    info: 'i',
    question: '?',
    questionSmall: '?',
    pointer: '>',
    pointerSmall: '»',
    radioOff: '( )',
    radioOn: '(*)',
    warning: '‼'
  });
  const other = Object.assign({}, common, {
    ballotCross: '✘',
    check: '✔',
    cross: '✖',
    ellipsisLarge: '⋯',
    ellipsis: '…',
    info: 'ℹ',
    question: '?',
    questionFull: '？',
    questionSmall: '﹖',
    pointer: isLinux ? '▸' : '❯',
    pointerSmall: isLinux ? '‣' : '›',
    radioOff: '◯',
    radioOn: '◉',
    warning: '⚠'
  });
  module.exports = isWindows && !isHyper ? windows : other;
  Reflect.defineProperty(module.exports, 'common', {
    enumerable: false,
    value: common
  });
  Reflect.defineProperty(module.exports, 'windows', {
    enumerable: false,
    value: windows
  });
  Reflect.defineProperty(module.exports, 'other', {
    enumerable: false,
    value: other
  });
});

const isObject = val => val !== null && typeof val === 'object' && !Array.isArray(val);
/* eslint-disable no-control-regex */
// this is a modified version of https://github.com/chalk/ansi-regex (MIT License)


const ANSI_REGEX = /[\u001b\u009b][[\]#;?()]*(?:(?:(?:[^\W_]*;?[^\W_]*)\u0007)|(?:(?:[0-9]{1,4}(;[0-9]{0,4})*)?[~0-9=<>cf-nqrtyA-PRZ]))/g;

const create = () => {
  const colors = {
    enabled: true,
    visible: true,
    styles: {},
    keys: {}
  };

  if ('FORCE_COLOR' in process.env) {
    colors.enabled = process.env.FORCE_COLOR !== '0';
  }

  const ansi = style => {
    let open = style.open = `\u001b[${style.codes[0]}m`;
    let close = style.close = `\u001b[${style.codes[1]}m`;
    let regex = style.regex = new RegExp(`\\u001b\\[${style.codes[1]}m`, 'g');

    style.wrap = (input, newline) => {
      if (input.includes(close)) input = input.replace(regex, close + open);
      let output = open + input + close; // see https://github.com/chalk/chalk/pull/92, thanks to the
      // chalk contributors for this fix. However, we've confirmed that
      // this issue is also present in Windows terminals

      return newline ? output.replace(/\r*\n/g, `${close}$&${open}`) : output;
    };

    return style;
  };

  const wrap = (style, input, newline) => {
    return typeof style === 'function' ? style(input) : style.wrap(input, newline);
  };

  const style = (input, stack) => {
    if (input === '' || input == null) return '';
    if (colors.enabled === false) return input;
    if (colors.visible === false) return '';
    let str = '' + input;
    let nl = str.includes('\n');
    let n = stack.length;

    if (n > 0 && stack.includes('unstyle')) {
      stack = [...new Set(['unstyle', ...stack])].reverse();
    }

    while (n-- > 0) str = wrap(colors.styles[stack[n]], str, nl);

    return str;
  };

  const define = (name, codes, type) => {
    colors.styles[name] = ansi({
      name,
      codes
    });
    let keys = colors.keys[type] || (colors.keys[type] = []);
    keys.push(name);
    Reflect.defineProperty(colors, name, {
      configurable: true,
      enumerable: true,

      set(value) {
        colors.alias(name, value);
      },

      get() {
        let color = input => style(input, color.stack);

        Reflect.setPrototypeOf(color, colors);
        color.stack = this.stack ? this.stack.concat(name) : [name];
        return color;
      }

    });
  };

  define('reset', [0, 0], 'modifier');
  define('bold', [1, 22], 'modifier');
  define('dim', [2, 22], 'modifier');
  define('italic', [3, 23], 'modifier');
  define('underline', [4, 24], 'modifier');
  define('inverse', [7, 27], 'modifier');
  define('hidden', [8, 28], 'modifier');
  define('strikethrough', [9, 29], 'modifier');
  define('black', [30, 39], 'color');
  define('red', [31, 39], 'color');
  define('green', [32, 39], 'color');
  define('yellow', [33, 39], 'color');
  define('blue', [34, 39], 'color');
  define('magenta', [35, 39], 'color');
  define('cyan', [36, 39], 'color');
  define('white', [37, 39], 'color');
  define('gray', [90, 39], 'color');
  define('grey', [90, 39], 'color');
  define('bgBlack', [40, 49], 'bg');
  define('bgRed', [41, 49], 'bg');
  define('bgGreen', [42, 49], 'bg');
  define('bgYellow', [43, 49], 'bg');
  define('bgBlue', [44, 49], 'bg');
  define('bgMagenta', [45, 49], 'bg');
  define('bgCyan', [46, 49], 'bg');
  define('bgWhite', [47, 49], 'bg');
  define('blackBright', [90, 39], 'bright');
  define('redBright', [91, 39], 'bright');
  define('greenBright', [92, 39], 'bright');
  define('yellowBright', [93, 39], 'bright');
  define('blueBright', [94, 39], 'bright');
  define('magentaBright', [95, 39], 'bright');
  define('cyanBright', [96, 39], 'bright');
  define('whiteBright', [97, 39], 'bright');
  define('bgBlackBright', [100, 49], 'bgBright');
  define('bgRedBright', [101, 49], 'bgBright');
  define('bgGreenBright', [102, 49], 'bgBright');
  define('bgYellowBright', [103, 49], 'bgBright');
  define('bgBlueBright', [104, 49], 'bgBright');
  define('bgMagentaBright', [105, 49], 'bgBright');
  define('bgCyanBright', [106, 49], 'bgBright');
  define('bgWhiteBright', [107, 49], 'bgBright');
  colors.ansiRegex = ANSI_REGEX;

  colors.hasColor = colors.hasAnsi = str => {
    colors.ansiRegex.lastIndex = 0;
    return typeof str === 'string' && str !== '' && colors.ansiRegex.test(str);
  };

  colors.alias = (name, color) => {
    let fn = typeof color === 'string' ? colors[color] : color;

    if (typeof fn !== 'function') {
      throw new TypeError('Expected alias to be the name of an existing color (string) or a function');
    }

    if (!fn.stack) {
      Reflect.defineProperty(fn, 'name', {
        value: name
      });
      colors.styles[name] = fn;
      fn.stack = [name];
    }

    Reflect.defineProperty(colors, name, {
      configurable: true,
      enumerable: true,

      set(value) {
        colors.alias(name, value);
      },

      get() {
        let color = input => style(input, color.stack);

        Reflect.setPrototypeOf(color, colors);
        color.stack = this.stack ? this.stack.concat(fn.stack) : fn.stack;
        return color;
      }

    });
  };

  colors.theme = custom => {
    if (!isObject(custom)) throw new TypeError('Expected theme to be an object');

    for (let name of Object.keys(custom)) {
      colors.alias(name, custom[name]);
    }

    return colors;
  };

  colors.alias('unstyle', str => {
    if (typeof str === 'string' && str !== '') {
      colors.ansiRegex.lastIndex = 0;
      return str.replace(colors.ansiRegex, '');
    }

    return '';
  });
  colors.alias('noop', str => str);
  colors.none = colors.clear = colors.noop;
  colors.stripColor = colors.unstyle;
  colors.symbols = symbols;
  colors.define = define;
  return colors;
};

var ansiColors = create();
var create_1 = create;
ansiColors.create = create_1;
var fake_xml_http_request = createCommonjsModule(function (module, exports) {
  (function (global, factory) {
    module.exports = factory();
  })(commonjsGlobal, function () {
    /**
     * Minimal Event interface implementation
     *
     * Original implementation by Sven Fuchs: https://gist.github.com/995028
     * Modifications and tests by Christian Johansen.
     *
     * @author Sven Fuchs (svenfuchs@artweb-design.de)
     * @author Christian Johansen (christian@cjohansen.no)
     * @license BSD
     *
     * Copyright (c) 2011 Sven Fuchs, Christian Johansen
     */
    var _Event = function Event(type, bubbles, cancelable, target) {
      this.type = type;
      this.bubbles = bubbles;
      this.cancelable = cancelable;
      this.target = target;
    };

    _Event.prototype = {
      stopPropagation: function () {},
      preventDefault: function () {
        this.defaultPrevented = true;
      }
    };
    /*
      Used to set the statusText property of an xhr object
    */

    var httpStatusCodes = {
      100: "Continue",
      101: "Switching Protocols",
      200: "OK",
      201: "Created",
      202: "Accepted",
      203: "Non-Authoritative Information",
      204: "No Content",
      205: "Reset Content",
      206: "Partial Content",
      300: "Multiple Choice",
      301: "Moved Permanently",
      302: "Found",
      303: "See Other",
      304: "Not Modified",
      305: "Use Proxy",
      307: "Temporary Redirect",
      400: "Bad Request",
      401: "Unauthorized",
      402: "Payment Required",
      403: "Forbidden",
      404: "Not Found",
      405: "Method Not Allowed",
      406: "Not Acceptable",
      407: "Proxy Authentication Required",
      408: "Request Timeout",
      409: "Conflict",
      410: "Gone",
      411: "Length Required",
      412: "Precondition Failed",
      413: "Request Entity Too Large",
      414: "Request-URI Too Long",
      415: "Unsupported Media Type",
      416: "Requested Range Not Satisfiable",
      417: "Expectation Failed",
      422: "Unprocessable Entity",
      500: "Internal Server Error",
      501: "Not Implemented",
      502: "Bad Gateway",
      503: "Service Unavailable",
      504: "Gateway Timeout",
      505: "HTTP Version Not Supported"
    };
    /*
      Cross-browser XML parsing. Used to turn
      XML responses into Document objects
      Borrowed from JSpec
    */

    function parseXML(text) {
      var xmlDoc;

      if (typeof DOMParser != "undefined") {
        var parser = new DOMParser();
        xmlDoc = parser.parseFromString(text, "text/xml");
      } else {
        xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = "false";
        xmlDoc.loadXML(text);
      }

      return xmlDoc;
    }
    /*
      Without mocking, the native XMLHttpRequest object will throw
      an error when attempting to set these headers. We match this behavior.
    */


    var unsafeHeaders = {
      "Accept-Charset": true,
      "Accept-Encoding": true,
      "Connection": true,
      "Content-Length": true,
      "Cookie": true,
      "Cookie2": true,
      "Content-Transfer-Encoding": true,
      "Date": true,
      "Expect": true,
      "Host": true,
      "Keep-Alive": true,
      "Referer": true,
      "TE": true,
      "Trailer": true,
      "Transfer-Encoding": true,
      "Upgrade": true,
      "User-Agent": true,
      "Via": true
    };
    /*
      Adds an "event" onto the fake xhr object
      that just calls the same-named method. This is
      in case a library adds callbacks for these events.
    */

    function _addEventListener(eventName, xhr) {
      xhr.addEventListener(eventName, function (event) {
        var listener = xhr["on" + eventName];

        if (listener && typeof listener == "function") {
          listener.call(event.target, event);
        }
      });
    }

    function EventedObject() {
      this._eventListeners = {};
      var events = ["loadstart", "progress", "load", "abort", "loadend"];

      for (var i = events.length - 1; i >= 0; i--) {
        _addEventListener(events[i], this);
      }
    }

    EventedObject.prototype = {
      /*
        Duplicates the behavior of native XMLHttpRequest's addEventListener function
      */
      addEventListener: function addEventListener(event, listener) {
        this._eventListeners[event] = this._eventListeners[event] || [];

        this._eventListeners[event].push(listener);
      },

      /*
        Duplicates the behavior of native XMLHttpRequest's removeEventListener function
      */
      removeEventListener: function removeEventListener(event, listener) {
        var listeners = this._eventListeners[event] || [];

        for (var i = 0, l = listeners.length; i < l; ++i) {
          if (listeners[i] == listener) {
            return listeners.splice(i, 1);
          }
        }
      },

      /*
        Duplicates the behavior of native XMLHttpRequest's dispatchEvent function
      */
      dispatchEvent: function dispatchEvent(event) {
        var type = event.type;
        var listeners = this._eventListeners[type] || [];

        for (var i = 0; i < listeners.length; i++) {
          if (typeof listeners[i] == "function") {
            listeners[i].call(this, event);
          } else {
            listeners[i].handleEvent(event);
          }
        }

        return !!event.defaultPrevented;
      },

      /*
        Triggers an `onprogress` event with the given parameters.
      */
      _progress: function _progress(lengthComputable, loaded, total) {
        var event = new _Event('progress');
        event.target = this;
        event.lengthComputable = lengthComputable;
        event.loaded = loaded;
        event.total = total;
        this.dispatchEvent(event);
      }
    };
    /*
      Constructor for a fake window.XMLHttpRequest
    */

    function FakeXMLHttpRequest() {
      EventedObject.call(this);
      this.readyState = FakeXMLHttpRequest.UNSENT;
      this.requestHeaders = {};
      this.requestBody = null;
      this.status = 0;
      this.statusText = "";
      this.upload = new EventedObject();
    }

    FakeXMLHttpRequest.prototype = new EventedObject(); // These status codes are available on the native XMLHttpRequest
    // object, so we match that here in case a library is relying on them.

    FakeXMLHttpRequest.UNSENT = 0;
    FakeXMLHttpRequest.OPENED = 1;
    FakeXMLHttpRequest.HEADERS_RECEIVED = 2;
    FakeXMLHttpRequest.LOADING = 3;
    FakeXMLHttpRequest.DONE = 4;
    var FakeXMLHttpRequestProto = {
      UNSENT: 0,
      OPENED: 1,
      HEADERS_RECEIVED: 2,
      LOADING: 3,
      DONE: 4,
      async: true,
      withCredentials: false,

      /*
        Duplicates the behavior of native XMLHttpRequest's open function
      */
      open: function open(method, url, async, username, password) {
        this.method = method;
        this.url = url;
        this.async = typeof async == "boolean" ? async : true;
        this.username = username;
        this.password = password;
        this.responseText = null;
        this.response = this.responseText;
        this.responseXML = null;
        this.responseURL = url;
        this.requestHeaders = {};
        this.sendFlag = false;

        this._readyStateChange(FakeXMLHttpRequest.OPENED);
      },

      /*
        Duplicates the behavior of native XMLHttpRequest's setRequestHeader function
      */
      setRequestHeader: function setRequestHeader(header, value) {
        verifyState(this);

        if (unsafeHeaders[header] || /^(Sec-|Proxy-)/.test(header)) {
          throw new Error("Refused to set unsafe header \"" + header + "\"");
        }

        if (this.requestHeaders[header]) {
          this.requestHeaders[header] += "," + value;
        } else {
          this.requestHeaders[header] = value;
        }
      },

      /*
        Duplicates the behavior of native XMLHttpRequest's send function
      */
      send: function send(data) {
        verifyState(this);

        if (!/^(get|head)$/i.test(this.method)) {
          var hasContentTypeHeader = false;
          Object.keys(this.requestHeaders).forEach(function (key) {
            if (key.toLowerCase() === 'content-type') {
              hasContentTypeHeader = true;
            }
          });

          if (!hasContentTypeHeader && !(data || '').toString().match('FormData')) {
            this.requestHeaders["Content-Type"] = "text/plain;charset=UTF-8";
          }

          this.requestBody = data;
        }

        this.errorFlag = false;
        this.sendFlag = this.async;

        this._readyStateChange(FakeXMLHttpRequest.OPENED);

        if (typeof this.onSend == "function") {
          this.onSend(this);
        }

        this.dispatchEvent(new _Event("loadstart", false, false, this));
      },

      /*
        Duplicates the behavior of native XMLHttpRequest's abort function
      */
      abort: function abort() {
        this.aborted = true;
        this.responseText = null;
        this.response = this.responseText;
        this.errorFlag = true;
        this.requestHeaders = {};
        this.dispatchEvent(new _Event("abort", false, false, this));

        if (this.readyState > FakeXMLHttpRequest.UNSENT && this.sendFlag) {
          this._readyStateChange(FakeXMLHttpRequest.UNSENT);

          this.sendFlag = false;
        }

        if (typeof this.onerror === "function") {
          this.onerror();
        }
      },

      /*
        Duplicates the behavior of native XMLHttpRequest's getResponseHeader function
      */
      getResponseHeader: function getResponseHeader(header) {
        if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
          return null;
        }

        if (/^Set-Cookie2?$/i.test(header)) {
          return null;
        }

        header = header.toLowerCase();

        for (var h in this.responseHeaders) {
          if (h.toLowerCase() == header) {
            return this.responseHeaders[h];
          }
        }

        return null;
      },

      /*
        Duplicates the behavior of native XMLHttpRequest's getAllResponseHeaders function
      */
      getAllResponseHeaders: function getAllResponseHeaders() {
        if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
          return "";
        }

        var headers = "";

        for (var header in this.responseHeaders) {
          if (this.responseHeaders.hasOwnProperty(header) && !/^Set-Cookie2?$/i.test(header)) {
            headers += header + ": " + this.responseHeaders[header] + "\r\n";
          }
        }

        return headers;
      },

      /*
       Duplicates the behavior of native XMLHttpRequest's overrideMimeType function
       */
      overrideMimeType: function overrideMimeType(mimeType) {
        if (typeof mimeType === "string") {
          this.forceMimeType = mimeType.toLowerCase();
        }
      },

      /*
        Places a FakeXMLHttpRequest object into the passed
        state.
      */
      _readyStateChange: function _readyStateChange(state) {
        this.readyState = state;

        if (typeof this.onreadystatechange == "function") {
          this.onreadystatechange(new _Event("readystatechange"));
        }

        this.dispatchEvent(new _Event("readystatechange"));

        if (this.readyState == FakeXMLHttpRequest.DONE) {
          this.dispatchEvent(new _Event("load", false, false, this));
        }

        if (this.readyState == FakeXMLHttpRequest.UNSENT || this.readyState == FakeXMLHttpRequest.DONE) {
          this.dispatchEvent(new _Event("loadend", false, false, this));
        }
      },

      /*
        Sets the FakeXMLHttpRequest object's response headers and
        places the object into readyState 2
      */
      _setResponseHeaders: function _setResponseHeaders(headers) {
        this.responseHeaders = {};

        for (var header in headers) {
          if (headers.hasOwnProperty(header)) {
            this.responseHeaders[header] = headers[header];
          }
        }

        if (this.forceMimeType) {
          this.responseHeaders['Content-Type'] = this.forceMimeType;
        }

        if (this.async) {
          this._readyStateChange(FakeXMLHttpRequest.HEADERS_RECEIVED);
        } else {
          this.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED;
        }
      },

      /*
        Sets the FakeXMLHttpRequest object's response body and
        if body text is XML, sets responseXML to parsed document
        object
      */
      _setResponseBody: function _setResponseBody(body) {
        verifyRequestSent(this);
        verifyHeadersReceived(this);
        verifyResponseBodyType(body);
        var chunkSize = this.chunkSize || 10;
        var index = 0;
        this.responseText = "";
        this.response = this.responseText;

        do {
          if (this.async) {
            this._readyStateChange(FakeXMLHttpRequest.LOADING);
          }

          this.responseText += body.substring(index, index + chunkSize);
          this.response = this.responseText;
          index += chunkSize;
        } while (index < body.length);

        var type = this.getResponseHeader("Content-Type");

        if (this.responseText && (!type || /(text\/xml)|(application\/xml)|(\+xml)/.test(type))) {
          try {
            this.responseXML = parseXML(this.responseText);
          } catch (e) {// Unable to parse XML - no biggie
          }
        }

        if (this.async) {
          this._readyStateChange(FakeXMLHttpRequest.DONE);
        } else {
          this.readyState = FakeXMLHttpRequest.DONE;
        }
      },

      /*
        Forces a response on to the FakeXMLHttpRequest object.
         This is the public API for faking responses. This function
        takes a number status, headers object, and string body:
         ```
        xhr.respond(404, {Content-Type: 'text/plain'}, "Sorry. This object was not found.")
         ```
      */
      respond: function respond(status, headers, body) {
        this._setResponseHeaders(headers || {});

        this.status = typeof status == "number" ? status : 200;
        this.statusText = httpStatusCodes[this.status];

        this._setResponseBody(body || "");
      }
    };

    for (var property in FakeXMLHttpRequestProto) {
      FakeXMLHttpRequest.prototype[property] = FakeXMLHttpRequestProto[property];
    }

    function verifyState(xhr) {
      if (xhr.readyState !== FakeXMLHttpRequest.OPENED) {
        throw new Error("INVALID_STATE_ERR");
      }

      if (xhr.sendFlag) {
        throw new Error("INVALID_STATE_ERR");
      }
    }

    function verifyRequestSent(xhr) {
      if (xhr.readyState == FakeXMLHttpRequest.DONE) {
        throw new Error("Request done");
      }
    }

    function verifyHeadersReceived(xhr) {
      if (xhr.async && xhr.readyState != FakeXMLHttpRequest.HEADERS_RECEIVED) {
        throw new Error("No headers received");
      }
    }

    function verifyResponseBodyType(body) {
      if (typeof body != "string") {
        var error = new Error("Attempted to respond to fake XMLHttpRequest with " + body + ", which is not a string.");
        error.name = "InvalidBodyException";
        throw error;
      }
    }

    var fake_xml_http_request = FakeXMLHttpRequest;
    return fake_xml_http_request;
  });
});
var routeRecognizer = createCommonjsModule(function (module, exports) {
  (function (global, factory) {
    module.exports = factory();
  })(commonjsGlobal, function () {
    var createObject = Object.create;

    function createMap() {
      var map = createObject(null);
      map["__"] = undefined;
      delete map["__"];
      return map;
    }

    var Target = function Target(path, matcher, delegate) {
      this.path = path;
      this.matcher = matcher;
      this.delegate = delegate;
    };

    Target.prototype.to = function to(target, callback) {
      var delegate = this.delegate;

      if (delegate && delegate.willAddRoute) {
        target = delegate.willAddRoute(this.matcher.target, target);
      }

      this.matcher.add(this.path, target);

      if (callback) {
        if (callback.length === 0) {
          throw new Error("You must have an argument in the function passed to `to`");
        }

        this.matcher.addChild(this.path, target, callback, this.delegate);
      }
    };

    var Matcher = function Matcher(target) {
      this.routes = createMap();
      this.children = createMap();
      this.target = target;
    };

    Matcher.prototype.add = function add(path, target) {
      this.routes[path] = target;
    };

    Matcher.prototype.addChild = function addChild(path, target, callback, delegate) {
      var matcher = new Matcher(target);
      this.children[path] = matcher;
      var match = generateMatch(path, matcher, delegate);

      if (delegate && delegate.contextEntered) {
        delegate.contextEntered(target, match);
      }

      callback(match);
    };

    function generateMatch(startingPath, matcher, delegate) {
      function match(path, callback) {
        var fullPath = startingPath + path;

        if (callback) {
          callback(generateMatch(fullPath, matcher, delegate));
        } else {
          return new Target(fullPath, matcher, delegate);
        }
      }

      return match;
    }

    function addRoute(routeArray, path, handler) {
      var len = 0;

      for (var i = 0; i < routeArray.length; i++) {
        len += routeArray[i].path.length;
      }

      path = path.substr(len);
      var route = {
        path: path,
        handler: handler
      };
      routeArray.push(route);
    }

    function eachRoute(baseRoute, matcher, callback, binding) {
      var routes = matcher.routes;
      var paths = Object.keys(routes);

      for (var i = 0; i < paths.length; i++) {
        var path = paths[i];
        var routeArray = baseRoute.slice();
        addRoute(routeArray, path, routes[path]);
        var nested = matcher.children[path];

        if (nested) {
          eachRoute(routeArray, nested, callback, binding);
        } else {
          callback.call(binding, routeArray);
        }
      }
    }

    var map = function (callback, addRouteCallback) {
      var matcher = new Matcher();
      callback(generateMatch("", matcher, this.delegate));
      eachRoute([], matcher, function (routes) {
        if (addRouteCallback) {
          addRouteCallback(this, routes);
        } else {
          this.add(routes);
        }
      }, this);
    }; // Normalizes percent-encoded values in `path` to upper-case and decodes percent-encoded
    // values that are not reserved (i.e., unicode characters, emoji, etc). The reserved
    // chars are "/" and "%".
    // Safe to call multiple times on the same path.
    // Normalizes percent-encoded values in `path` to upper-case and decodes percent-encoded


    function normalizePath(path) {
      return path.split("/").map(normalizeSegment).join("/");
    } // We want to ensure the characters "%" and "/" remain in percent-encoded
    // form when normalizing paths, so replace them with their encoded form after
    // decoding the rest of the path


    var SEGMENT_RESERVED_CHARS = /%|\//g;

    function normalizeSegment(segment) {
      if (segment.length < 3 || segment.indexOf("%") === -1) {
        return segment;
      }

      return decodeURIComponent(segment).replace(SEGMENT_RESERVED_CHARS, encodeURIComponent);
    } // We do not want to encode these characters when generating dynamic path segments
    // See https://tools.ietf.org/html/rfc3986#section-3.3
    // sub-delims: "!", "$", "&", "'", "(", ")", "*", "+", ",", ";", "="
    // others allowed by RFC 3986: ":", "@"
    //
    // First encode the entire path segment, then decode any of the encoded special chars.
    //
    // The chars "!", "'", "(", ")", "*" do not get changed by `encodeURIComponent`,
    // so the possible encoded chars are:
    // ['%24', '%26', '%2B', '%2C', '%3B', '%3D', '%3A', '%40'].


    var PATH_SEGMENT_ENCODINGS = /%(?:2(?:4|6|B|C)|3(?:B|D|A)|40)/g;

    function encodePathSegment(str) {
      return encodeURIComponent(str).replace(PATH_SEGMENT_ENCODINGS, decodeURIComponent);
    }

    var escapeRegex = /(\/|\.|\*|\+|\?|\||\(|\)|\[|\]|\{|\}|\\)/g;
    var isArray = Array.isArray;
    var hasOwnProperty = Object.prototype.hasOwnProperty;

    function getParam(params, key) {
      if (typeof params !== "object" || params === null) {
        throw new Error("You must pass an object as the second argument to `generate`.");
      }

      if (!hasOwnProperty.call(params, key)) {
        throw new Error("You must provide param `" + key + "` to `generate`.");
      }

      var value = params[key];
      var str = typeof value === "string" ? value : "" + value;

      if (str.length === 0) {
        throw new Error("You must provide a param `" + key + "`.");
      }

      return str;
    }

    var eachChar = [];

    eachChar[0
    /* Static */
    ] = function (segment, currentState) {
      var state = currentState;
      var value = segment.value;

      for (var i = 0; i < value.length; i++) {
        var ch = value.charCodeAt(i);
        state = state.put(ch, false, false);
      }

      return state;
    };

    eachChar[1
    /* Dynamic */
    ] = function (_, currentState) {
      return currentState.put(47
      /* SLASH */
      , true, true);
    };

    eachChar[2
    /* Star */
    ] = function (_, currentState) {
      return currentState.put(-1
      /* ANY */
      , false, true);
    };

    eachChar[4
    /* Epsilon */
    ] = function (_, currentState) {
      return currentState;
    };

    var regex = [];

    regex[0
    /* Static */
    ] = function (segment) {
      return segment.value.replace(escapeRegex, "\\$1");
    };

    regex[1
    /* Dynamic */
    ] = function () {
      return "([^/]+)";
    };

    regex[2
    /* Star */
    ] = function () {
      return "(.+)";
    };

    regex[4
    /* Epsilon */
    ] = function () {
      return "";
    };

    var generate = [];

    generate[0
    /* Static */
    ] = function (segment) {
      return segment.value;
    };

    generate[1
    /* Dynamic */
    ] = function (segment, params) {
      var value = getParam(params, segment.value);

      if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS) {
        return encodePathSegment(value);
      } else {
        return value;
      }
    };

    generate[2
    /* Star */
    ] = function (segment, params) {
      return getParam(params, segment.value);
    };

    generate[4
    /* Epsilon */
    ] = function () {
      return "";
    };

    var EmptyObject = Object.freeze({});
    var EmptyArray = Object.freeze([]); // The `names` will be populated with the paramter name for each dynamic/star
    // segment. `shouldDecodes` will be populated with a boolean for each dyanamic/star
    // segment, indicating whether it should be decoded during recognition.

    function parse(segments, route, types) {
      // normalize route as not starting with a "/". Recognition will
      // also normalize.
      if (route.length > 0 && route.charCodeAt(0) === 47
      /* SLASH */
      ) {
          route = route.substr(1);
        }

      var parts = route.split("/");
      var names = undefined;
      var shouldDecodes = undefined;

      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        var flags = 0;
        var type = 0;

        if (part === "") {
          type = 4
          /* Epsilon */
          ;
        } else if (part.charCodeAt(0) === 58
        /* COLON */
        ) {
            type = 1
            /* Dynamic */
            ;
          } else if (part.charCodeAt(0) === 42
        /* STAR */
        ) {
            type = 2
            /* Star */
            ;
          } else {
          type = 0
          /* Static */
          ;
        }

        flags = 2 << type;

        if (flags & 12
        /* Named */
        ) {
            part = part.slice(1);
            names = names || [];
            names.push(part);
            shouldDecodes = shouldDecodes || [];
            shouldDecodes.push((flags & 4
            /* Decoded */
            ) !== 0);
          }

        if (flags & 14
        /* Counted */
        ) {
            types[type]++;
          }

        segments.push({
          type: type,
          value: normalizeSegment(part)
        });
      }

      return {
        names: names || EmptyArray,
        shouldDecodes: shouldDecodes || EmptyArray
      };
    }

    function isEqualCharSpec(spec, char, negate) {
      return spec.char === char && spec.negate === negate;
    } // A State has a character specification and (`charSpec`) and a list of possible
    // subsequent states (`nextStates`).
    //
    // If a State is an accepting state, it will also have several additional
    // properties:
    //
    // * `regex`: A regular expression that is used to extract parameters from paths
    //   that reached this accepting state.
    // * `handlers`: Information on how to convert the list of captures into calls
    //   to registered handlers with the specified parameters
    // * `types`: How many static, dynamic or star segments in this route. Used to
    //   decide which route to use if multiple registered routes match a path.
    //
    // Currently, State is implemented naively by looping over `nextStates` and
    // comparing a character specification against a character. A more efficient
    // implementation would use a hash of keys pointing at one or more next states.


    var State = function State(states, id, char, negate, repeat) {
      this.states = states;
      this.id = id;
      this.char = char;
      this.negate = negate;
      this.nextStates = repeat ? id : null;
      this.pattern = "";
      this._regex = undefined;
      this.handlers = undefined;
      this.types = undefined;
    };

    State.prototype.regex = function regex$1() {
      if (!this._regex) {
        this._regex = new RegExp(this.pattern);
      }

      return this._regex;
    };

    State.prototype.get = function get(char, negate) {
      var this$1 = this;
      var nextStates = this.nextStates;

      if (nextStates === null) {
        return;
      }

      if (isArray(nextStates)) {
        for (var i = 0; i < nextStates.length; i++) {
          var child = this$1.states[nextStates[i]];

          if (isEqualCharSpec(child, char, negate)) {
            return child;
          }
        }
      } else {
        var child$1 = this.states[nextStates];

        if (isEqualCharSpec(child$1, char, negate)) {
          return child$1;
        }
      }
    };

    State.prototype.put = function put(char, negate, repeat) {
      var state; // If the character specification already exists in a child of the current
      // state, just return that state.

      if (state = this.get(char, negate)) {
        return state;
      } // Make a new state for the character spec


      var states = this.states;
      state = new State(states, states.length, char, negate, repeat);
      states[states.length] = state; // Insert the new state as a child of the current state

      if (this.nextStates == null) {
        this.nextStates = state.id;
      } else if (isArray(this.nextStates)) {
        this.nextStates.push(state.id);
      } else {
        this.nextStates = [this.nextStates, state.id];
      } // Return the new state


      return state;
    }; // Find a list of child states matching the next character


    State.prototype.match = function match(ch) {
      var this$1 = this;
      var nextStates = this.nextStates;

      if (!nextStates) {
        return [];
      }

      var returned = [];

      if (isArray(nextStates)) {
        for (var i = 0; i < nextStates.length; i++) {
          var child = this$1.states[nextStates[i]];

          if (isMatch(child, ch)) {
            returned.push(child);
          }
        }
      } else {
        var child$1 = this.states[nextStates];

        if (isMatch(child$1, ch)) {
          returned.push(child$1);
        }
      }

      return returned;
    };

    function isMatch(spec, char) {
      return spec.negate ? spec.char !== char && spec.char !== -1
      /* ANY */
      : spec.char === char || spec.char === -1
      /* ANY */
      ;
    } // This is a somewhat naive strategy, but should work in a lot of cases
    // A better strategy would properly resolve /posts/:id/new and /posts/edit/:id.
    //
    // This strategy generally prefers more static and less dynamic matching.
    // Specifically, it
    //
    //  * prefers fewer stars to more, then
    //  * prefers using stars for less of the match to more, then
    //  * prefers fewer dynamic segments to more, then
    //  * prefers more static segments to more


    function sortSolutions(states) {
      return states.sort(function (a, b) {
        var ref = a.types || [0, 0, 0];
        var astatics = ref[0];
        var adynamics = ref[1];
        var astars = ref[2];
        var ref$1 = b.types || [0, 0, 0];
        var bstatics = ref$1[0];
        var bdynamics = ref$1[1];
        var bstars = ref$1[2];

        if (astars !== bstars) {
          return astars - bstars;
        }

        if (astars) {
          if (astatics !== bstatics) {
            return bstatics - astatics;
          }

          if (adynamics !== bdynamics) {
            return bdynamics - adynamics;
          }
        }

        if (adynamics !== bdynamics) {
          return adynamics - bdynamics;
        }

        if (astatics !== bstatics) {
          return bstatics - astatics;
        }

        return 0;
      });
    }

    function recognizeChar(states, ch) {
      var nextStates = [];

      for (var i = 0, l = states.length; i < l; i++) {
        var state = states[i];
        nextStates = nextStates.concat(state.match(ch));
      }

      return nextStates;
    }

    var RecognizeResults = function RecognizeResults(queryParams) {
      this.length = 0;
      this.queryParams = queryParams || {};
    };

    RecognizeResults.prototype.splice = Array.prototype.splice;
    RecognizeResults.prototype.slice = Array.prototype.slice;
    RecognizeResults.prototype.push = Array.prototype.push;

    function findHandler(state, originalPath, queryParams) {
      var handlers = state.handlers;
      var regex = state.regex();

      if (!regex || !handlers) {
        throw new Error("state not initialized");
      }

      var captures = originalPath.match(regex);
      var currentCapture = 1;
      var result = new RecognizeResults(queryParams);
      result.length = handlers.length;

      for (var i = 0; i < handlers.length; i++) {
        var handler = handlers[i];
        var names = handler.names;
        var shouldDecodes = handler.shouldDecodes;
        var params = EmptyObject;
        var isDynamic = false;

        if (names !== EmptyArray && shouldDecodes !== EmptyArray) {
          for (var j = 0; j < names.length; j++) {
            isDynamic = true;
            var name = names[j];
            var capture = captures && captures[currentCapture++];

            if (params === EmptyObject) {
              params = {};
            }

            if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS && shouldDecodes[j]) {
              params[name] = capture && decodeURIComponent(capture);
            } else {
              params[name] = capture;
            }
          }
        }

        result[i] = {
          handler: handler.handler,
          params: params,
          isDynamic: isDynamic
        };
      }

      return result;
    }

    function decodeQueryParamPart(part) {
      // http://www.w3.org/TR/html401/interact/forms.html#h-17.13.4.1
      part = part.replace(/\+/gm, "%20");
      var result;

      try {
        result = decodeURIComponent(part);
      } catch (error) {
        result = "";
      }

      return result;
    }

    var RouteRecognizer = function RouteRecognizer() {
      this.names = createMap();
      var states = [];
      var state = new State(states, 0, -1
      /* ANY */
      , true, false);
      states[0] = state;
      this.states = states;
      this.rootState = state;
    };

    RouteRecognizer.prototype.add = function add(routes, options) {
      var currentState = this.rootState;
      var pattern = "^";
      var types = [0, 0, 0];
      var handlers = new Array(routes.length);
      var allSegments = [];
      var isEmpty = true;
      var j = 0;

      for (var i = 0; i < routes.length; i++) {
        var route = routes[i];
        var ref = parse(allSegments, route.path, types);
        var names = ref.names;
        var shouldDecodes = ref.shouldDecodes; // preserve j so it points to the start of newly added segments

        for (; j < allSegments.length; j++) {
          var segment = allSegments[j];

          if (segment.type === 4
          /* Epsilon */
          ) {
              continue;
            }

          isEmpty = false; // Add a "/" for the new segment

          currentState = currentState.put(47
          /* SLASH */
          , false, false);
          pattern += "/"; // Add a representation of the segment to the NFA and regex

          currentState = eachChar[segment.type](segment, currentState);
          pattern += regex[segment.type](segment);
        }

        handlers[i] = {
          handler: route.handler,
          names: names,
          shouldDecodes: shouldDecodes
        };
      }

      if (isEmpty) {
        currentState = currentState.put(47
        /* SLASH */
        , false, false);
        pattern += "/";
      }

      currentState.handlers = handlers;
      currentState.pattern = pattern + "$";
      currentState.types = types;
      var name;

      if (typeof options === "object" && options !== null && options.as) {
        name = options.as;
      }

      if (name) {
        // if (this.names[name]) {
        //   throw new Error("You may not add a duplicate route named `" + name + "`.");
        // }
        this.names[name] = {
          segments: allSegments,
          handlers: handlers
        };
      }
    };

    RouteRecognizer.prototype.handlersFor = function handlersFor(name) {
      var route = this.names[name];

      if (!route) {
        throw new Error("There is no route named " + name);
      }

      var result = new Array(route.handlers.length);

      for (var i = 0; i < route.handlers.length; i++) {
        var handler = route.handlers[i];
        result[i] = handler;
      }

      return result;
    };

    RouteRecognizer.prototype.hasRoute = function hasRoute(name) {
      return !!this.names[name];
    };

    RouteRecognizer.prototype.generate = function generate$1(name, params) {
      var route = this.names[name];
      var output = "";

      if (!route) {
        throw new Error("There is no route named " + name);
      }

      var segments = route.segments;

      for (var i = 0; i < segments.length; i++) {
        var segment = segments[i];

        if (segment.type === 4
        /* Epsilon */
        ) {
            continue;
          }

        output += "/";
        output += generate[segment.type](segment, params);
      }

      if (output.charAt(0) !== "/") {
        output = "/" + output;
      }

      if (params && params.queryParams) {
        output += this.generateQueryString(params.queryParams);
      }

      return output;
    };

    RouteRecognizer.prototype.generateQueryString = function generateQueryString(params) {
      var pairs = [];
      var keys = Object.keys(params);
      keys.sort();

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = params[key];

        if (value == null) {
          continue;
        }

        var pair = encodeURIComponent(key);

        if (isArray(value)) {
          for (var j = 0; j < value.length; j++) {
            var arrayPair = key + "[]" + "=" + encodeURIComponent(value[j]);
            pairs.push(arrayPair);
          }
        } else {
          pair += "=" + encodeURIComponent(value);
          pairs.push(pair);
        }
      }

      if (pairs.length === 0) {
        return "";
      }

      return "?" + pairs.join("&");
    };

    RouteRecognizer.prototype.parseQueryString = function parseQueryString(queryString) {
      var pairs = queryString.split("&");
      var queryParams = {};

      for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split("="),
            key = decodeQueryParamPart(pair[0]),
            keyLength = key.length,
            isArray = false,
            value = void 0;

        if (pair.length === 1) {
          value = "true";
        } else {
          // Handle arrays
          if (keyLength > 2 && key.slice(keyLength - 2) === "[]") {
            isArray = true;
            key = key.slice(0, keyLength - 2);

            if (!queryParams[key]) {
              queryParams[key] = [];
            }
          }

          value = pair[1] ? decodeQueryParamPart(pair[1]) : "";
        }

        if (isArray) {
          queryParams[key].push(value);
        } else {
          queryParams[key] = value;
        }
      }

      return queryParams;
    };

    RouteRecognizer.prototype.recognize = function recognize(path) {
      var results;
      var states = [this.rootState];
      var queryParams = {};
      var isSlashDropped = false;
      var hashStart = path.indexOf("#");

      if (hashStart !== -1) {
        path = path.substr(0, hashStart);
      }

      var queryStart = path.indexOf("?");

      if (queryStart !== -1) {
        var queryString = path.substr(queryStart + 1, path.length);
        path = path.substr(0, queryStart);
        queryParams = this.parseQueryString(queryString);
      }

      if (path.charAt(0) !== "/") {
        path = "/" + path;
      }

      var originalPath = path;

      if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS) {
        path = normalizePath(path);
      } else {
        path = decodeURI(path);
        originalPath = decodeURI(originalPath);
      }

      var pathLen = path.length;

      if (pathLen > 1 && path.charAt(pathLen - 1) === "/") {
        path = path.substr(0, pathLen - 1);
        originalPath = originalPath.substr(0, originalPath.length - 1);
        isSlashDropped = true;
      }

      for (var i = 0; i < path.length; i++) {
        states = recognizeChar(states, path.charCodeAt(i));

        if (!states.length) {
          break;
        }
      }

      var solutions = [];

      for (var i$1 = 0; i$1 < states.length; i$1++) {
        if (states[i$1].handlers) {
          solutions.push(states[i$1]);
        }
      }

      states = sortSolutions(solutions);
      var state = solutions[0];

      if (state && state.handlers) {
        // if a trailing slash was dropped and a star segment is the last segment
        // specified, put the trailing slash back
        if (isSlashDropped && state.pattern && state.pattern.slice(-5) === "(.+)$") {
          originalPath = originalPath + "/";
        }

        results = findHandler(state, originalPath, queryParams);
      }

      return results;
    };

    RouteRecognizer.VERSION = "0.3.4"; // Set to false to opt-out of encoding and decoding path segments.
    // See https://github.com/tildeio/route-recognizer/pull/55

    RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS = true;
    RouteRecognizer.Normalizer = {
      normalizeSegment: normalizeSegment,
      normalizePath: normalizePath,
      encodePathSegment: encodePathSegment
    };
    RouteRecognizer.prototype.map = map;
    return RouteRecognizer;
  });
});
var fetch_umd = createCommonjsModule(function (module, exports) {
  (function (global, factory) {
    factory(exports);
  })(commonjsGlobal, function (exports) {
    var support = {
      searchParams: 'URLSearchParams' in self,
      iterable: 'Symbol' in self && 'iterator' in Symbol,
      blob: 'FileReader' in self && 'Blob' in self && function () {
        try {
          new Blob();
          return true;
        } catch (e) {
          return false;
        }
      }(),
      formData: 'FormData' in self,
      arrayBuffer: 'ArrayBuffer' in self
    };

    function isDataView(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj);
    }

    if (support.arrayBuffer) {
      var viewClasses = ['[object Int8Array]', '[object Uint8Array]', '[object Uint8ClampedArray]', '[object Int16Array]', '[object Uint16Array]', '[object Int32Array]', '[object Uint32Array]', '[object Float32Array]', '[object Float64Array]'];

      var isArrayBufferView = ArrayBuffer.isView || function (obj) {
        return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1;
      };
    }

    function normalizeName(name) {
      if (typeof name !== 'string') {
        name = String(name);
      }

      if (/[^a-z0-9\-#$%&'*+.^_`|~]/i.test(name)) {
        throw new TypeError('Invalid character in header field name');
      }

      return name.toLowerCase();
    }

    function normalizeValue(value) {
      if (typeof value !== 'string') {
        value = String(value);
      }

      return value;
    } // Build a destructive iterator for the value list


    function iteratorFor(items) {
      var iterator = {
        next: function () {
          var value = items.shift();
          return {
            done: value === undefined,
            value: value
          };
        }
      };

      if (support.iterable) {
        iterator[Symbol.iterator] = function () {
          return iterator;
        };
      }

      return iterator;
    }

    function Headers(headers) {
      this.map = {};

      if (headers instanceof Headers) {
        headers.forEach(function (value, name) {
          this.append(name, value);
        }, this);
      } else if (Array.isArray(headers)) {
        headers.forEach(function (header) {
          this.append(header[0], header[1]);
        }, this);
      } else if (headers) {
        Object.getOwnPropertyNames(headers).forEach(function (name) {
          this.append(name, headers[name]);
        }, this);
      }
    }

    Headers.prototype.append = function (name, value) {
      name = normalizeName(name);
      value = normalizeValue(value);
      var oldValue = this.map[name];
      this.map[name] = oldValue ? oldValue + ', ' + value : value;
    };

    Headers.prototype['delete'] = function (name) {
      delete this.map[normalizeName(name)];
    };

    Headers.prototype.get = function (name) {
      name = normalizeName(name);
      return this.has(name) ? this.map[name] : null;
    };

    Headers.prototype.has = function (name) {
      return this.map.hasOwnProperty(normalizeName(name));
    };

    Headers.prototype.set = function (name, value) {
      this.map[normalizeName(name)] = normalizeValue(value);
    };

    Headers.prototype.forEach = function (callback, thisArg) {
      for (var name in this.map) {
        if (this.map.hasOwnProperty(name)) {
          callback.call(thisArg, this.map[name], name, this);
        }
      }
    };

    Headers.prototype.keys = function () {
      var items = [];
      this.forEach(function (value, name) {
        items.push(name);
      });
      return iteratorFor(items);
    };

    Headers.prototype.values = function () {
      var items = [];
      this.forEach(function (value) {
        items.push(value);
      });
      return iteratorFor(items);
    };

    Headers.prototype.entries = function () {
      var items = [];
      this.forEach(function (value, name) {
        items.push([name, value]);
      });
      return iteratorFor(items);
    };

    if (support.iterable) {
      Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
    }

    function consumed(body) {
      if (body.bodyUsed) {
        return Promise.reject(new TypeError('Already read'));
      }

      body.bodyUsed = true;
    }

    function fileReaderReady(reader) {
      return new Promise(function (resolve, reject) {
        reader.onload = function () {
          resolve(reader.result);
        };

        reader.onerror = function () {
          reject(reader.error);
        };
      });
    }

    function readBlobAsArrayBuffer(blob) {
      var reader = new FileReader();
      var promise = fileReaderReady(reader);
      reader.readAsArrayBuffer(blob);
      return promise;
    }

    function readBlobAsText(blob) {
      var reader = new FileReader();
      var promise = fileReaderReady(reader);
      reader.readAsText(blob);
      return promise;
    }

    function readArrayBufferAsText(buf) {
      var view = new Uint8Array(buf);
      var chars = new Array(view.length);

      for (var i = 0; i < view.length; i++) {
        chars[i] = String.fromCharCode(view[i]);
      }

      return chars.join('');
    }

    function bufferClone(buf) {
      if (buf.slice) {
        return buf.slice(0);
      } else {
        var view = new Uint8Array(buf.byteLength);
        view.set(new Uint8Array(buf));
        return view.buffer;
      }
    }

    function Body() {
      this.bodyUsed = false;

      this._initBody = function (body) {
        this._bodyInit = body;

        if (!body) {
          this._bodyText = '';
        } else if (typeof body === 'string') {
          this._bodyText = body;
        } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
          this._bodyBlob = body;
        } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
          this._bodyFormData = body;
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this._bodyText = body.toString();
        } else if (support.arrayBuffer && support.blob && isDataView(body)) {
          this._bodyArrayBuffer = bufferClone(body.buffer); // IE 10-11 can't handle a DataView body.

          this._bodyInit = new Blob([this._bodyArrayBuffer]);
        } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
          this._bodyArrayBuffer = bufferClone(body);
        } else {
          this._bodyText = body = Object.prototype.toString.call(body);
        }

        if (!this.headers.get('content-type')) {
          if (typeof body === 'string') {
            this.headers.set('content-type', 'text/plain;charset=UTF-8');
          } else if (this._bodyBlob && this._bodyBlob.type) {
            this.headers.set('content-type', this._bodyBlob.type);
          } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
            this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
          }
        }
      };

      if (support.blob) {
        this.blob = function () {
          var rejected = consumed(this);

          if (rejected) {
            return rejected;
          }

          if (this._bodyBlob) {
            return Promise.resolve(this._bodyBlob);
          } else if (this._bodyArrayBuffer) {
            return Promise.resolve(new Blob([this._bodyArrayBuffer]));
          } else if (this._bodyFormData) {
            throw new Error('could not read FormData body as blob');
          } else {
            return Promise.resolve(new Blob([this._bodyText]));
          }
        };

        this.arrayBuffer = function () {
          if (this._bodyArrayBuffer) {
            return consumed(this) || Promise.resolve(this._bodyArrayBuffer);
          } else {
            return this.blob().then(readBlobAsArrayBuffer);
          }
        };
      }

      this.text = function () {
        var rejected = consumed(this);

        if (rejected) {
          return rejected;
        }

        if (this._bodyBlob) {
          return readBlobAsText(this._bodyBlob);
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer));
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as text');
        } else {
          return Promise.resolve(this._bodyText);
        }
      };

      if (support.formData) {
        this.formData = function () {
          return this.text().then(decode);
        };
      }

      this.json = function () {
        return this.text().then(JSON.parse);
      };

      return this;
    } // HTTP methods whose capitalization should be normalized


    var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

    function normalizeMethod(method) {
      var upcased = method.toUpperCase();
      return methods.indexOf(upcased) > -1 ? upcased : method;
    }

    function Request(input, options) {
      options = options || {};
      var body = options.body;

      if (input instanceof Request) {
        if (input.bodyUsed) {
          throw new TypeError('Already read');
        }

        this.url = input.url;
        this.credentials = input.credentials;

        if (!options.headers) {
          this.headers = new Headers(input.headers);
        }

        this.method = input.method;
        this.mode = input.mode;
        this.signal = input.signal;

        if (!body && input._bodyInit != null) {
          body = input._bodyInit;
          input.bodyUsed = true;
        }
      } else {
        this.url = String(input);
      }

      this.credentials = options.credentials || this.credentials || 'same-origin';

      if (options.headers || !this.headers) {
        this.headers = new Headers(options.headers);
      }

      this.method = normalizeMethod(options.method || this.method || 'GET');
      this.mode = options.mode || this.mode || null;
      this.signal = options.signal || this.signal;
      this.referrer = null;

      if ((this.method === 'GET' || this.method === 'HEAD') && body) {
        throw new TypeError('Body not allowed for GET or HEAD requests');
      }

      this._initBody(body);
    }

    Request.prototype.clone = function () {
      return new Request(this, {
        body: this._bodyInit
      });
    };

    function decode(body) {
      var form = new FormData();
      body.trim().split('&').forEach(function (bytes) {
        if (bytes) {
          var split = bytes.split('=');
          var name = split.shift().replace(/\+/g, ' ');
          var value = split.join('=').replace(/\+/g, ' ');
          form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
      });
      return form;
    }

    function parseHeaders(rawHeaders) {
      var headers = new Headers(); // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
      // https://tools.ietf.org/html/rfc7230#section-3.2

      var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
      preProcessedHeaders.split(/\r?\n/).forEach(function (line) {
        var parts = line.split(':');
        var key = parts.shift().trim();

        if (key) {
          var value = parts.join(':').trim();
          headers.append(key, value);
        }
      });
      return headers;
    }

    Body.call(Request.prototype);

    function Response(bodyInit, options) {
      if (!options) {
        options = {};
      }

      this.type = 'default';
      this.status = options.status === undefined ? 200 : options.status;
      this.ok = this.status >= 200 && this.status < 300;
      this.statusText = 'statusText' in options ? options.statusText : 'OK';
      this.headers = new Headers(options.headers);
      this.url = options.url || '';

      this._initBody(bodyInit);
    }

    Body.call(Response.prototype);

    Response.prototype.clone = function () {
      return new Response(this._bodyInit, {
        status: this.status,
        statusText: this.statusText,
        headers: new Headers(this.headers),
        url: this.url
      });
    };

    Response.error = function () {
      var response = new Response(null, {
        status: 0,
        statusText: ''
      });
      response.type = 'error';
      return response;
    };

    var redirectStatuses = [301, 302, 303, 307, 308];

    Response.redirect = function (url, status) {
      if (redirectStatuses.indexOf(status) === -1) {
        throw new RangeError('Invalid status code');
      }

      return new Response(null, {
        status: status,
        headers: {
          location: url
        }
      });
    };

    exports.DOMException = self.DOMException;

    try {
      new exports.DOMException();
    } catch (err) {
      exports.DOMException = function (message, name) {
        this.message = message;
        this.name = name;
        var error = Error(message);
        this.stack = error.stack;
      };

      exports.DOMException.prototype = Object.create(Error.prototype);
      exports.DOMException.prototype.constructor = exports.DOMException;
    }

    function fetch(input, init) {
      return new Promise(function (resolve, reject) {
        var request = new Request(input, init);

        if (request.signal && request.signal.aborted) {
          return reject(new exports.DOMException('Aborted', 'AbortError'));
        }

        var xhr = new XMLHttpRequest();

        function abortXhr() {
          xhr.abort();
        }

        xhr.onload = function () {
          var options = {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: parseHeaders(xhr.getAllResponseHeaders() || '')
          };
          options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
          var body = 'response' in xhr ? xhr.response : xhr.responseText;
          resolve(new Response(body, options));
        };

        xhr.onerror = function () {
          reject(new TypeError('Network request failed'));
        };

        xhr.ontimeout = function () {
          reject(new TypeError('Network request failed'));
        };

        xhr.onabort = function () {
          reject(new exports.DOMException('Aborted', 'AbortError'));
        };

        xhr.open(request.method, request.url, true);

        if (request.credentials === 'include') {
          xhr.withCredentials = true;
        } else if (request.credentials === 'omit') {
          xhr.withCredentials = false;
        }

        if ('responseType' in xhr && support.blob) {
          xhr.responseType = 'blob';
        }

        request.headers.forEach(function (value, name) {
          xhr.setRequestHeader(name, value);
        });

        if (request.signal) {
          request.signal.addEventListener('abort', abortXhr);

          xhr.onreadystatechange = function () {
            // DONE (success or failure)
            if (xhr.readyState === 4) {
              request.signal.removeEventListener('abort', abortXhr);
            }
          };
        }

        xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
      });
    }

    fetch.polyfill = true;

    if (!self.fetch) {
      self.fetch = fetch;
      self.Headers = Headers;
      self.Request = Request;
      self.Response = Response;
    }

    exports.Headers = Headers;
    exports.Request = Request;
    exports.Response = Response;
    exports.fetch = fetch;
    Object.defineProperty(exports, '__esModule', {
      value: true
    });
  });
});
unwrapExports(fetch_umd);
var pretender = createCommonjsModule(function (module) {
  var Pretender = function (self) {
    function getModuleDefault(module) {
      return module.default || module;
    }

    var appearsBrowserified = typeof self !== 'undefined' && typeof process !== 'undefined' && (Object.prototype.toString.call(process) === '[object Object]' || Object.prototype.toString.call(process) === '[object process]');
    var RouteRecognizer = appearsBrowserified ? getModuleDefault(routeRecognizer) : self.RouteRecognizer;
    var FakeXMLHttpRequest = appearsBrowserified ? getModuleDefault(fake_xml_http_request) : self.FakeXMLHttpRequest; // fetch related ponyfills

    var FakeFetch = appearsBrowserified ? getModuleDefault(fetch_umd) : self.WHATWGFetch;

    var Pretender = function (FakeXMLHttpRequest, FakeFetch, RouteRecognizer) {
      FakeXMLHttpRequest = FakeXMLHttpRequest && FakeXMLHttpRequest.hasOwnProperty('default') ? FakeXMLHttpRequest['default'] : FakeXMLHttpRequest;
      RouteRecognizer = RouteRecognizer && RouteRecognizer.hasOwnProperty('default') ? RouteRecognizer['default'] : RouteRecognizer;
      var commonjsGlobal$1 = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof commonjsGlobal !== 'undefined' ? commonjsGlobal : typeof self !== 'undefined' ? self : {};
      /**
       * Check if we're required to add a port number.
       *
       * @see https://url.spec.whatwg.org/#default-port
       * @param {Number|String} port Port number we need to check
       * @param {String} protocol Protocol we need to check against.
       * @returns {Boolean} Is it a default port for the given protocol
       * @api private
       */

      var requiresPort = function required(port, protocol) {
        protocol = protocol.split(':')[0];
        port = +port;
        if (!port) return false;

        switch (protocol) {
          case 'http':
          case 'ws':
            return port !== 80;

          case 'https':
          case 'wss':
            return port !== 443;

          case 'ftp':
            return port !== 21;

          case 'gopher':
            return port !== 70;

          case 'file':
            return false;
        }

        return port !== 0;
      };

      var has = Object.prototype.hasOwnProperty,
          undef;
      /**
       * Decode a URI encoded string.
       *
       * @param {String} input The URI encoded string.
       * @returns {String|Null} The decoded string.
       * @api private
       */

      function decode(input) {
        try {
          return decodeURIComponent(input.replace(/\+/g, ' '));
        } catch (e) {
          return null;
        }
      }
      /**
       * Simple query string parser.
       *
       * @param {String} query The query string that needs to be parsed.
       * @returns {Object}
       * @api public
       */


      function querystring(query) {
        var parser = /([^=?&]+)=?([^&]*)/g,
            result = {},
            part;

        while (part = parser.exec(query)) {
          var key = decode(part[1]),
              value = decode(part[2]); //
          // Prevent overriding of existing properties. This ensures that build-in
          // methods like `toString` or __proto__ are not overriden by malicious
          // querystrings.
          //
          // In the case if failed decoding, we want to omit the key/value pairs
          // from the result.
          //

          if (key === null || value === null || key in result) continue;
          result[key] = value;
        }

        return result;
      }
      /**
       * Transform a query string to an object.
       *
       * @param {Object} obj Object that should be transformed.
       * @param {String} prefix Optional prefix.
       * @returns {String}
       * @api public
       */


      function querystringify(obj, prefix) {
        prefix = prefix || '';
        var pairs = [],
            value,
            key; //
        // Optionally prefix with a '?' if needed
        //

        if ('string' !== typeof prefix) prefix = '?';

        for (key in obj) {
          if (has.call(obj, key)) {
            value = obj[key]; //
            // Edge cases where we actually want to encode the value to an empty
            // string instead of the stringified value.
            //

            if (!value && (value === null || value === undef || isNaN(value))) {
              value = '';
            }

            key = encodeURIComponent(key);
            value = encodeURIComponent(value); //
            // If we failed to encode the strings, we should bail out as we don't
            // want to add invalid strings to the query.
            //

            if (key === null || value === null) continue;
            pairs.push(key + '=' + value);
          }
        }

        return pairs.length ? prefix + pairs.join('&') : '';
      } //
      // Expose the module.
      //


      var stringify = querystringify;
      var parse = querystring;
      var querystringify_1 = {
        stringify: stringify,
        parse: parse
      };
      var slashes = /^[A-Za-z][A-Za-z0-9+-.]*:\/\//,
          protocolre = /^([a-z][a-z0-9.+-]*:)?(\/\/)?([\S\s]*)/i,
          whitespace = '[\\x09\\x0A\\x0B\\x0C\\x0D\\x20\\xA0\\u1680\\u180E\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200A\\u202F\\u205F\\u3000\\u2028\\u2029\\uFEFF]',
          left = new RegExp('^' + whitespace + '+');
      /**
       * Trim a given string.
       *
       * @param {String} str String to trim.
       * @public
       */

      function trimLeft(str) {
        return (str ? str : '').toString().replace(left, '');
      }
      /**
       * These are the parse rules for the URL parser, it informs the parser
       * about:
       *
       * 0. The char it Needs to parse, if it's a string it should be done using
       *    indexOf, RegExp using exec and NaN means set as current value.
       * 1. The property we should set when parsing this value.
       * 2. Indication if it's backwards or forward parsing, when set as number it's
       *    the value of extra chars that should be split off.
       * 3. Inherit from location if non existing in the parser.
       * 4. `toLowerCase` the resulting value.
       */


      var rules = [['#', 'hash'], // Extract from the back.
      ['?', 'query'], // Extract from the back.
      function sanitize(address) {
        // Sanitize what is left of the address
        return address.replace('\\', '/');
      }, ['/', 'pathname'], // Extract from the back.
      ['@', 'auth', 1], // Extract from the front.
      [NaN, 'host', undefined, 1, 1], // Set left over value.
      [/:(\d+)$/, 'port', undefined, 1], // RegExp the back.
      [NaN, 'hostname', undefined, 1, 1] // Set left over.
      ];
      /**
       * These properties should not be copied or inherited from. This is only needed
       * for all non blob URL's as a blob URL does not include a hash, only the
       * origin.
       *
       * @type {Object}
       * @private
       */

      var ignore = {
        hash: 1,
        query: 1
      };
      /**
       * The location object differs when your code is loaded through a normal page,
       * Worker or through a worker using a blob. And with the blobble begins the
       * trouble as the location object will contain the URL of the blob, not the
       * location of the page where our code is loaded in. The actual origin is
       * encoded in the `pathname` so we can thankfully generate a good "default"
       * location from it so we can generate proper relative URL's again.
       *
       * @param {Object|String} loc Optional default location object.
       * @returns {Object} lolcation object.
       * @public
       */

      function lolcation(loc) {
        var globalVar;
        if (typeof window !== 'undefined') globalVar = window;else if (typeof commonjsGlobal$1 !== 'undefined') globalVar = commonjsGlobal$1;else if (typeof self !== 'undefined') globalVar = self;else globalVar = {};
        var location = globalVar.location || {};
        loc = loc || location;
        var finaldestination = {},
            type = typeof loc,
            key;

        if ('blob:' === loc.protocol) {
          finaldestination = new Url(unescape(loc.pathname), {});
        } else if ('string' === type) {
          finaldestination = new Url(loc, {});

          for (key in ignore) delete finaldestination[key];
        } else if ('object' === type) {
          for (key in loc) {
            if (key in ignore) continue;
            finaldestination[key] = loc[key];
          }

          if (finaldestination.slashes === undefined) {
            finaldestination.slashes = slashes.test(loc.href);
          }
        }

        return finaldestination;
      }
      /**
       * @typedef ProtocolExtract
       * @type Object
       * @property {String} protocol Protocol matched in the URL, in lowercase.
       * @property {Boolean} slashes `true` if protocol is followed by "//", else `false`.
       * @property {String} rest Rest of the URL that is not part of the protocol.
       */

      /**
       * Extract protocol information from a URL with/without double slash ("//").
       *
       * @param {String} address URL we want to extract from.
       * @return {ProtocolExtract} Extracted information.
       * @private
       */


      function extractProtocol(address) {
        address = trimLeft(address);
        var match = protocolre.exec(address);
        return {
          protocol: match[1] ? match[1].toLowerCase() : '',
          slashes: !!match[2],
          rest: match[3]
        };
      }
      /**
       * Resolve a relative URL pathname against a base URL pathname.
       *
       * @param {String} relative Pathname of the relative URL.
       * @param {String} base Pathname of the base URL.
       * @return {String} Resolved pathname.
       * @private
       */


      function resolve(relative, base) {
        if (relative === '') return base;
        var path = (base || '/').split('/').slice(0, -1).concat(relative.split('/')),
            i = path.length,
            last = path[i - 1],
            unshift = false,
            up = 0;

        while (i--) {
          if (path[i] === '.') {
            path.splice(i, 1);
          } else if (path[i] === '..') {
            path.splice(i, 1);
            up++;
          } else if (up) {
            if (i === 0) unshift = true;
            path.splice(i, 1);
            up--;
          }
        }

        if (unshift) path.unshift('');
        if (last === '.' || last === '..') path.push('');
        return path.join('/');
      }
      /**
       * The actual URL instance. Instead of returning an object we've opted-in to
       * create an actual constructor as it's much more memory efficient and
       * faster and it pleases my OCD.
       *
       * It is worth noting that we should not use `URL` as class name to prevent
       * clashes with the global URL instance that got introduced in browsers.
       *
       * @constructor
       * @param {String} address URL we want to parse.
       * @param {Object|String} [location] Location defaults for relative paths.
       * @param {Boolean|Function} [parser] Parser for the query string.
       * @private
       */


      function Url(address, location, parser) {
        address = trimLeft(address);

        if (!(this instanceof Url)) {
          return new Url(address, location, parser);
        }

        var relative,
            extracted,
            parse,
            instruction,
            index,
            key,
            instructions = rules.slice(),
            type = typeof location,
            url = this,
            i = 0; //
        // The following if statements allows this module two have compatibility with
        // 2 different API:
        //
        // 1. Node.js's `url.parse` api which accepts a URL, boolean as arguments
        //    where the boolean indicates that the query string should also be parsed.
        //
        // 2. The `URL` interface of the browser which accepts a URL, object as
        //    arguments. The supplied object will be used as default values / fall-back
        //    for relative paths.
        //

        if ('object' !== type && 'string' !== type) {
          parser = location;
          location = null;
        }

        if (parser && 'function' !== typeof parser) parser = querystringify_1.parse;
        location = lolcation(location); //
        // Extract protocol information before running the instructions.
        //

        extracted = extractProtocol(address || '');
        relative = !extracted.protocol && !extracted.slashes;
        url.slashes = extracted.slashes || relative && location.slashes;
        url.protocol = extracted.protocol || location.protocol || '';
        address = extracted.rest; //
        // When the authority component is absent the URL starts with a path
        // component.
        //

        if (!extracted.slashes) instructions[3] = [/(.*)/, 'pathname'];

        for (; i < instructions.length; i++) {
          instruction = instructions[i];

          if (typeof instruction === 'function') {
            address = instruction(address);
            continue;
          }

          parse = instruction[0];
          key = instruction[1];

          if (parse !== parse) {
            url[key] = address;
          } else if ('string' === typeof parse) {
            if (~(index = address.indexOf(parse))) {
              if ('number' === typeof instruction[2]) {
                url[key] = address.slice(0, index);
                address = address.slice(index + instruction[2]);
              } else {
                url[key] = address.slice(index);
                address = address.slice(0, index);
              }
            }
          } else if (index = parse.exec(address)) {
            url[key] = index[1];
            address = address.slice(0, index.index);
          }

          url[key] = url[key] || (relative && instruction[3] ? location[key] || '' : ''); //
          // Hostname, host and protocol should be lowercased so they can be used to
          // create a proper `origin`.
          //

          if (instruction[4]) url[key] = url[key].toLowerCase();
        } //
        // Also parse the supplied query string in to an object. If we're supplied
        // with a custom parser as function use that instead of the default build-in
        // parser.
        //


        if (parser) url.query = parser(url.query); //
        // If the URL is relative, resolve the pathname against the base URL.
        //

        if (relative && location.slashes && url.pathname.charAt(0) !== '/' && (url.pathname !== '' || location.pathname !== '')) {
          url.pathname = resolve(url.pathname, location.pathname);
        } //
        // We should not add port numbers if they are already the default port number
        // for a given protocol. As the host also contains the port number we're going
        // override it with the hostname which contains no port number.
        //


        if (!requiresPort(url.port, url.protocol)) {
          url.host = url.hostname;
          url.port = '';
        } //
        // Parse down the `auth` for the username and password.
        //


        url.username = url.password = '';

        if (url.auth) {
          instruction = url.auth.split(':');
          url.username = instruction[0] || '';
          url.password = instruction[1] || '';
        }

        url.origin = url.protocol && url.host && url.protocol !== 'file:' ? url.protocol + '//' + url.host : 'null'; //
        // The href is just the compiled result.
        //

        url.href = url.toString();
      }
      /**
       * This is convenience method for changing properties in the URL instance to
       * insure that they all propagate correctly.
       *
       * @param {String} part          Property we need to adjust.
       * @param {Mixed} value          The newly assigned value.
       * @param {Boolean|Function} fn  When setting the query, it will be the function
       *                               used to parse the query.
       *                               When setting the protocol, double slash will be
       *                               removed from the final url if it is true.
       * @returns {URL} URL instance for chaining.
       * @public
       */


      function set(part, value, fn) {
        var url = this;

        switch (part) {
          case 'query':
            if ('string' === typeof value && value.length) {
              value = (fn || querystringify_1.parse)(value);
            }

            url[part] = value;
            break;

          case 'port':
            url[part] = value;

            if (!requiresPort(value, url.protocol)) {
              url.host = url.hostname;
              url[part] = '';
            } else if (value) {
              url.host = url.hostname + ':' + value;
            }

            break;

          case 'hostname':
            url[part] = value;
            if (url.port) value += ':' + url.port;
            url.host = value;
            break;

          case 'host':
            url[part] = value;

            if (/:\d+$/.test(value)) {
              value = value.split(':');
              url.port = value.pop();
              url.hostname = value.join(':');
            } else {
              url.hostname = value;
              url.port = '';
            }

            break;

          case 'protocol':
            url.protocol = value.toLowerCase();
            url.slashes = !fn;
            break;

          case 'pathname':
          case 'hash':
            if (value) {
              var char = part === 'pathname' ? '/' : '#';
              url[part] = value.charAt(0) !== char ? char + value : value;
            } else {
              url[part] = value;
            }

            break;

          default:
            url[part] = value;
        }

        for (var i = 0; i < rules.length; i++) {
          var ins = rules[i];
          if (ins[4]) url[ins[1]] = url[ins[1]].toLowerCase();
        }

        url.origin = url.protocol && url.host && url.protocol !== 'file:' ? url.protocol + '//' + url.host : 'null';
        url.href = url.toString();
        return url;
      }
      /**
       * Transform the properties back in to a valid and full URL string.
       *
       * @param {Function} stringify Optional query stringify function.
       * @returns {String} Compiled version of the URL.
       * @public
       */


      function toString(stringify) {
        if (!stringify || 'function' !== typeof stringify) stringify = querystringify_1.stringify;
        var query,
            url = this,
            protocol = url.protocol;
        if (protocol && protocol.charAt(protocol.length - 1) !== ':') protocol += ':';
        var result = protocol + (url.slashes ? '//' : '');

        if (url.username) {
          result += url.username;
          if (url.password) result += ':' + url.password;
          result += '@';
        }

        result += url.host + url.pathname;
        query = 'object' === typeof url.query ? stringify(url.query) : url.query;
        if (query) result += '?' !== query.charAt(0) ? '?' + query : query;
        if (url.hash) result += url.hash;
        return result;
      }

      Url.prototype = {
        set: set,
        toString: toString
      }; //
      // Expose the URL parser and some additional properties that might be useful for
      // others or testing.
      //

      Url.extractProtocol = extractProtocol;
      Url.location = lolcation;
      Url.trimLeft = trimLeft;
      Url.qs = querystringify_1;
      var urlParse = Url;
      /**
       * parseURL - decompose a URL into its parts
       * @param  {String} url a URL
       * @return {Object} parts of the URL, including the following
       *
       * 'https://www.yahoo.com:1234/mypage?test=yes#abc'
       *
       * {
       *   host: 'www.yahoo.com:1234',
       *   protocol: 'https:',
       *   search: '?test=yes',
       *   hash: '#abc',
       *   href: 'https://www.yahoo.com:1234/mypage?test=yes#abc',
       *   pathname: '/mypage',
       *   fullpath: '/mypage?test=yes'
       * }
       */

      function parseURL(url) {
        var parsedUrl = new urlParse(url);

        if (!parsedUrl.host) {
          // eslint-disable-next-line no-self-assign
          parsedUrl.href = parsedUrl.href; // IE: load the host and protocol
        }

        var pathname = parsedUrl.pathname;

        if (pathname.charAt(0) !== '/') {
          pathname = '/' + pathname; // IE: prepend leading slash
        }

        var host = parsedUrl.host;

        if (parsedUrl.port === '80' || parsedUrl.port === '443') {
          host = parsedUrl.hostname; // IE: remove default port
        }

        return {
          host: host,
          protocol: parsedUrl.protocol,
          search: parsedUrl.query,
          hash: parsedUrl.hash,
          href: parsedUrl.href,
          pathname: pathname,
          fullpath: pathname + (parsedUrl.query || '') + (parsedUrl.hash || '')
        };
      }
      /**
       * Registry
       *
       * A registry is a map of HTTP verbs to route recognizers.
       */


      var Registry =
      /** @class */
      function () {
        function Registry()
        /* host */
        {
          // Herein we keep track of RouteRecognizer instances
          // keyed by HTTP method. Feel free to add more as needed.
          this.verbs = {
            GET: new RouteRecognizer(),
            PUT: new RouteRecognizer(),
            POST: new RouteRecognizer(),
            DELETE: new RouteRecognizer(),
            PATCH: new RouteRecognizer(),
            HEAD: new RouteRecognizer(),
            OPTIONS: new RouteRecognizer()
          };
        }

        return Registry;
      }();
      /**
       * Hosts
       *
       * a map of hosts to Registries, ultimately allowing
       * a per-host-and-port, per HTTP verb lookup of RouteRecognizers
       */


      function Hosts() {
        this._registries = {};
      }
      /**
       * Hosts#forURL - retrieve a map of HTTP verbs to RouteRecognizers
       *                for a given URL
       *
       * @param  {String} url a URL
       * @return {Registry}   a map of HTTP verbs to RouteRecognizers
       *                      corresponding to the provided URL's
       *                      hostname and port
       */


      Hosts.prototype.forURL = function (url) {
        var host = parseURL(url).host;
        var registry = this._registries[host];

        if (registry === undefined) {
          registry = this._registries[host] = new Registry(host);
        }

        return registry.verbs;
      };

      function Pretender()
      /* routeMap1, routeMap2, ..., options*/
      {
        this.hosts = new Hosts();
        var lastArg = arguments[arguments.length - 1];
        var options = typeof lastArg === 'object' ? lastArg : null;
        var shouldNotTrack = options && options.trackRequests === false;
        var noopArray = {
          push: function () {},
          length: 0
        };
        this.handlers = [];
        this.handledRequests = shouldNotTrack ? noopArray : [];
        this.passthroughRequests = shouldNotTrack ? noopArray : [];
        this.unhandledRequests = shouldNotTrack ? noopArray : [];
        this.requestReferences = [];
        this.forcePassthrough = options && options.forcePassthrough === true;
        this.disableUnhandled = options && options.disableUnhandled === true; // reference the native XMLHttpRequest object so
        // it can be restored later

        this._nativeXMLHttpRequest = self.XMLHttpRequest;
        this.running = false;
        var ctx = {
          pretender: this
        };
        this.ctx = ctx; // capture xhr requests, channeling them into
        // the route map.

        self.XMLHttpRequest = interceptor(ctx); // polyfill fetch when xhr is ready

        this._fetchProps = FakeFetch ? ['fetch', 'Headers', 'Request', 'Response'] : [];

        this._fetchProps.forEach(function (name) {
          this['_native' + name] = self[name];
          self[name] = FakeFetch[name];
        }, this); // 'start' the server


        this.running = true; // trigger the route map DSL.

        var argLength = options ? arguments.length - 1 : arguments.length;

        for (var i = 0; i < argLength; i++) {
          this.map(arguments[i]);
        }
      }

      function interceptor(ctx) {
        function FakeRequest() {
          // super()
          FakeXMLHttpRequest.call(this);
        }

        FakeRequest.prototype = Object.create(FakeXMLHttpRequest.prototype);
        FakeRequest.prototype.constructor = FakeRequest; // extend

        FakeRequest.prototype.send = function send() {
          this.sendArguments = arguments;

          if (!ctx.pretender.running) {
            throw new Error('You shut down a Pretender instance while there was a pending request. ' + 'That request just tried to complete. Check to see if you accidentally shut down ' + 'a pretender earlier than you intended to');
          }

          FakeXMLHttpRequest.prototype.send.apply(this, arguments);

          if (ctx.pretender.checkPassthrough(this)) {
            this.passthrough();
          } else {
            ctx.pretender.handleRequest(this);
          }
        };

        FakeRequest.prototype.passthrough = function passthrough() {
          if (!this.sendArguments) {
            throw new Error('You attempted to passthrough a FakeRequest that was never sent. ' + 'Call `.send()` on the original request first');
          }

          var xhr = createPassthrough(this);
          xhr.send.apply(xhr, this.sendArguments);
          return xhr;
        };

        function createPassthrough(fakeXHR) {
          // event types to handle on the xhr
          var evts = ['error', 'timeout', 'abort', 'readystatechange']; // event types to handle on the xhr.upload

          var uploadEvents = []; // properties to copy from the native xhr to fake xhr

          var lifecycleProps = ['readyState', 'responseText', 'response', 'responseXML', 'responseURL', 'status', 'statusText'];
          var xhr = fakeXHR._passthroughRequest = new ctx.pretender._nativeXMLHttpRequest();
          xhr.open(fakeXHR.method, fakeXHR.url, fakeXHR.async, fakeXHR.username, fakeXHR.password);

          if (fakeXHR.responseType === 'arraybuffer') {
            lifecycleProps = ['readyState', 'response', 'status', 'statusText'];
            xhr.responseType = fakeXHR.responseType;
          } // use onload if the browser supports it


          if ('onload' in xhr) {
            evts.push('load');
          } // add progress event for async calls
          // avoid using progress events for sync calls, they will hang https://bugs.webkit.org/show_bug.cgi?id=40996.


          if (fakeXHR.async && fakeXHR.responseType !== 'arraybuffer') {
            evts.push('progress');
            uploadEvents.push('progress');
          } // update `propertyNames` properties from `fromXHR` to `toXHR`


          function copyLifecycleProperties(propertyNames, fromXHR, toXHR) {
            for (var i = 0; i < propertyNames.length; i++) {
              var prop = propertyNames[i];

              if (prop in fromXHR) {
                toXHR[prop] = fromXHR[prop];
              }
            }
          } // fire fake event on `eventable`


          function dispatchEvent(eventable, eventType, event) {
            eventable.dispatchEvent(event);

            if (eventable['on' + eventType]) {
              eventable['on' + eventType](event);
            }
          } // set the on- handler on the native xhr for the given eventType


          function createHandler(eventType) {
            xhr['on' + eventType] = function (event) {
              copyLifecycleProperties(lifecycleProps, xhr, fakeXHR);
              dispatchEvent(fakeXHR, eventType, event);
            };
          } // set the on- handler on the native xhr's `upload` property for
          // the given eventType


          function createUploadHandler(eventType) {
            if (xhr.upload) {
              xhr.upload['on' + eventType] = function (event) {
                dispatchEvent(fakeXHR.upload, eventType, event);
              };
            }
          }

          var i;

          for (i = 0; i < evts.length; i++) {
            createHandler(evts[i]);
          }

          for (i = 0; i < uploadEvents.length; i++) {
            createUploadHandler(uploadEvents[i]);
          }

          if (fakeXHR.async) {
            xhr.timeout = fakeXHR.timeout;
            xhr.withCredentials = fakeXHR.withCredentials;
          }

          for (var h in fakeXHR.requestHeaders) {
            xhr.setRequestHeader(h, fakeXHR.requestHeaders[h]);
          }

          return xhr;
        }

        FakeRequest.prototype._passthroughCheck = function (method, args) {
          if (this._passthroughRequest) {
            return this._passthroughRequest[method].apply(this._passthroughRequest, args);
          }

          return FakeXMLHttpRequest.prototype[method].apply(this, args);
        };

        FakeRequest.prototype.abort = function abort() {
          return this._passthroughCheck('abort', arguments);
        };

        FakeRequest.prototype.getResponseHeader = function getResponseHeader() {
          return this._passthroughCheck('getResponseHeader', arguments);
        };

        FakeRequest.prototype.getAllResponseHeaders = function getAllResponseHeaders() {
          return this._passthroughCheck('getAllResponseHeaders', arguments);
        };

        if (ctx.pretender._nativeXMLHttpRequest.prototype._passthroughCheck) {
          // eslint-disable-next-line no-console
          console.warn('You created a second Pretender instance while there was already one running. ' + 'Running two Pretender servers at once will lead to unexpected results and will ' + 'be removed entirely in a future major version.' + 'Please call .shutdown() on your instances when you no longer need them to respond.');
        }

        return FakeRequest;
      }

      function verbify(verb) {
        return function (path, handler, async) {
          return this.register(verb, path, handler, async);
        };
      }

      function scheduleProgressEvent(request, startTime, totalTime) {
        setTimeout(function () {
          if (!request.aborted && !request.status) {
            var elapsedTime = new Date().getTime() - startTime.getTime();
            var progressTotal;
            var body = request.requestBody;

            if (!body) {
              progressTotal = 0;
            } else {
              // Support Blob, BufferSource, USVString, ArrayBufferView
              progressTotal = body.byteLength || body.size || body.length || 0;
            }

            var progressTransmitted = totalTime <= 0 ? 0 : elapsedTime / totalTime * progressTotal; // ProgressEvent expects loaded, total
            // https://xhr.spec.whatwg.org/#interface-progressevent

            request.upload._progress(true, progressTransmitted, progressTotal);

            request._progress(true, progressTransmitted, progressTotal);

            scheduleProgressEvent(request, startTime, totalTime);
          }
        }, 50);
      }

      function isArray(array) {
        return Object.prototype.toString.call(array) === '[object Array]';
      }

      var PASSTHROUGH = {};
      Pretender.prototype = {
        get: verbify('GET'),
        post: verbify('POST'),
        put: verbify('PUT'),
        'delete': verbify('DELETE'),
        patch: verbify('PATCH'),
        head: verbify('HEAD'),
        options: verbify('OPTIONS'),
        map: function (maps) {
          maps.call(this);
        },
        register: function register(verb, url, handler, async) {
          if (!handler) {
            throw new Error('The function you tried passing to Pretender to handle ' + verb + ' ' + url + ' is undefined or missing.');
          }

          handler.numberOfCalls = 0;
          handler.async = async;
          this.handlers.push(handler);
          var registry = this.hosts.forURL(url)[verb];
          registry.add([{
            path: parseURL(url).fullpath,
            handler: handler
          }]);
          return handler;
        },
        passthrough: PASSTHROUGH,
        checkPassthrough: function checkPassthrough(request) {
          var verb = request.method.toUpperCase();
          var path = parseURL(request.url).fullpath;
          var recognized = this.hosts.forURL(request.url)[verb].recognize(path);
          var match = recognized && recognized[0];

          if (match && match.handler === PASSTHROUGH || this.forcePassthrough) {
            this.passthroughRequests.push(request);
            this.passthroughRequest(verb, path, request);
            return true;
          }

          return false;
        },
        handleRequest: function handleRequest(request) {
          var verb = request.method.toUpperCase();
          var path = request.url;

          var handler = this._handlerFor(verb, path, request);

          if (handler) {
            handler.handler.numberOfCalls++;
            var async = handler.handler.async;
            this.handledRequests.push(request);
            var pretender = this;

            var _handleRequest = function (statusHeadersAndBody) {
              if (!isArray(statusHeadersAndBody)) {
                var note = 'Remember to `return [status, headers, body];` in your route handler.';
                throw new Error('Nothing returned by handler for ' + path + '. ' + note);
              }

              var status = statusHeadersAndBody[0];
              var headers = pretender.prepareHeaders(statusHeadersAndBody[1]);
              var body = pretender.prepareBody(statusHeadersAndBody[2], headers);
              pretender.handleResponse(request, async, function () {
                request.respond(status, headers, body);
                pretender.handledRequest(verb, path, request);
              });
            };

            try {
              var result = handler.handler(request);

              if (result && typeof result.then === 'function') {
                // `result` is a promise, resolve it
                result.then(function (resolvedResult) {
                  _handleRequest(resolvedResult);
                });
              } else {
                _handleRequest(result);
              }
            } catch (error) {
              this.erroredRequest(verb, path, request, error);
              this.resolve(request);
            }
          } else {
            if (!this.disableUnhandled) {
              this.unhandledRequests.push(request);
              this.unhandledRequest(verb, path, request);
            }
          }
        },
        handleResponse: function handleResponse(request, strategy, callback) {
          var delay = typeof strategy === 'function' ? strategy() : strategy;
          delay = typeof delay === 'boolean' || typeof delay === 'number' ? delay : 0;

          if (delay === false) {
            callback();
          } else {
            var pretender = this;
            pretender.requestReferences.push({
              request: request,
              callback: callback
            });

            if (delay !== true) {
              scheduleProgressEvent(request, new Date(), delay);
              setTimeout(function () {
                pretender.resolve(request);
              }, delay);
            }
          }
        },
        resolve: function resolve(request) {
          for (var i = 0, len = this.requestReferences.length; i < len; i++) {
            var res = this.requestReferences[i];

            if (res.request === request) {
              res.callback();
              this.requestReferences.splice(i, 1);
              break;
            }
          }
        },
        requiresManualResolution: function (verb, path) {
          var handler = this._handlerFor(verb.toUpperCase(), path, {});

          if (!handler) {
            return false;
          }

          var async = handler.handler.async;
          return typeof async === 'function' ? async() === true : async === true;
        },
        prepareBody: function (body) {
          return body;
        },
        prepareHeaders: function (headers) {
          return headers;
        },
        handledRequest: function ()
        /* verb, path, request */
        {},
        passthroughRequest: function ()
        /* verb, path, request */
        {},
        unhandledRequest: function (verb, path
        /*, request */
        ) {
          throw new Error('Pretender intercepted ' + verb + ' ' + path + ' but no handler was defined for this type of request');
        },
        erroredRequest: function (verb, path, request, error) {
          error.message = 'Pretender intercepted ' + verb + ' ' + path + ' but encountered an error: ' + error.message;
          throw error;
        },
        _handlerFor: function (verb, url, request) {
          var registry = this.hosts.forURL(url)[verb];
          var matches = registry.recognize(parseURL(url).fullpath);
          var match = matches ? matches[0] : null;

          if (match) {
            request.params = match.params;
            request.queryParams = matches.queryParams;
          }

          return match;
        },
        shutdown: function shutdown() {
          self.XMLHttpRequest = this._nativeXMLHttpRequest;

          this._fetchProps.forEach(function (name) {
            self[name] = this['_native' + name];
          }, this);

          this.ctx.pretender = undefined; // 'stop' the server

          this.running = false;
        }
      };
      Pretender.parseURL = parseURL;
      Pretender.Hosts = Hosts;
      Pretender.Registry = Registry;
      return Pretender;
    }(FakeXMLHttpRequest, FakeFetch, RouteRecognizer);

    {
      module.exports = Pretender;
    }
    self.Pretender = Pretender;
    return Pretender;
  }(self);
});
var has = Object.prototype.hasOwnProperty;
var isArray = Array.isArray;

var hexTable = function () {
  var array = [];

  for (var i = 0; i < 256; ++i) {
    array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
  }

  return array;
}();

var compactQueue = function compactQueue(queue) {
  while (queue.length > 1) {
    var item = queue.pop();
    var obj = item.obj[item.prop];

    if (isArray(obj)) {
      var compacted = [];

      for (var j = 0; j < obj.length; ++j) {
        if (typeof obj[j] !== 'undefined') {
          compacted.push(obj[j]);
        }
      }

      item.obj[item.prop] = compacted;
    }
  }
};

var arrayToObject = function arrayToObject(source, options) {
  var obj = options && options.plainObjects ? Object.create(null) : {};

  for (var i = 0; i < source.length; ++i) {
    if (typeof source[i] !== 'undefined') {
      obj[i] = source[i];
    }
  }

  return obj;
};

var merge = function merge(target, source, options) {
  /* eslint no-param-reassign: 0 */
  if (!source) {
    return target;
  }

  if (typeof source !== 'object') {
    if (isArray(target)) {
      target.push(source);
    } else if (target && typeof target === 'object') {
      if (options && (options.plainObjects || options.allowPrototypes) || !has.call(Object.prototype, source)) {
        target[source] = true;
      }
    } else {
      return [target, source];
    }

    return target;
  }

  if (!target || typeof target !== 'object') {
    return [target].concat(source);
  }

  var mergeTarget = target;

  if (isArray(target) && !isArray(source)) {
    mergeTarget = arrayToObject(target, options);
  }

  if (isArray(target) && isArray(source)) {
    source.forEach(function (item, i) {
      if (has.call(target, i)) {
        var targetItem = target[i];

        if (targetItem && typeof targetItem === 'object' && item && typeof item === 'object') {
          target[i] = merge(targetItem, item, options);
        } else {
          target.push(item);
        }
      } else {
        target[i] = item;
      }
    });
    return target;
  }

  return Object.keys(source).reduce(function (acc, key) {
    var value = source[key];

    if (has.call(acc, key)) {
      acc[key] = merge(acc[key], value, options);
    } else {
      acc[key] = value;
    }

    return acc;
  }, mergeTarget);
};

var assign = function assignSingleSource(target, source) {
  return Object.keys(source).reduce(function (acc, key) {
    acc[key] = source[key];
    return acc;
  }, target);
};

var decode = function (str, decoder, charset) {
  var strWithoutPlus = str.replace(/\+/g, ' ');

  if (charset === 'iso-8859-1') {
    // unescape never throws, no try...catch needed:
    return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
  } // utf-8


  try {
    return decodeURIComponent(strWithoutPlus);
  } catch (e) {
    return strWithoutPlus;
  }
};

var encode = function encode(str, defaultEncoder, charset) {
  // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
  // It has been adapted here for stricter adherence to RFC 3986
  if (str.length === 0) {
    return str;
  }

  var string = str;

  if (typeof str === 'symbol') {
    string = Symbol.prototype.toString.call(str);
  } else if (typeof str !== 'string') {
    string = String(str);
  }

  if (charset === 'iso-8859-1') {
    return escape(string).replace(/%u[0-9a-f]{4}/gi, function ($0) {
      return '%26%23' + parseInt($0.slice(2), 16) + '%3B';
    });
  }

  var out = '';

  for (var i = 0; i < string.length; ++i) {
    var c = string.charCodeAt(i);

    if (c === 0x2D // -
    || c === 0x2E // .
    || c === 0x5F // _
    || c === 0x7E // ~
    || c >= 0x30 && c <= 0x39 // 0-9
    || c >= 0x41 && c <= 0x5A // a-z
    || c >= 0x61 && c <= 0x7A // A-Z
    ) {
        out += string.charAt(i);
        continue;
      }

    if (c < 0x80) {
      out = out + hexTable[c];
      continue;
    }

    if (c < 0x800) {
      out = out + (hexTable[0xC0 | c >> 6] + hexTable[0x80 | c & 0x3F]);
      continue;
    }

    if (c < 0xD800 || c >= 0xE000) {
      out = out + (hexTable[0xE0 | c >> 12] + hexTable[0x80 | c >> 6 & 0x3F] + hexTable[0x80 | c & 0x3F]);
      continue;
    }

    i += 1;
    c = 0x10000 + ((c & 0x3FF) << 10 | string.charCodeAt(i) & 0x3FF);
    out += hexTable[0xF0 | c >> 18] + hexTable[0x80 | c >> 12 & 0x3F] + hexTable[0x80 | c >> 6 & 0x3F] + hexTable[0x80 | c & 0x3F];
  }

  return out;
};

var compact = function compact(value) {
  var queue = [{
    obj: {
      o: value
    },
    prop: 'o'
  }];
  var refs = [];

  for (var i = 0; i < queue.length; ++i) {
    var item = queue[i];
    var obj = item.obj[item.prop];
    var keys = Object.keys(obj);

    for (var j = 0; j < keys.length; ++j) {
      var key = keys[j];
      var val = obj[key];

      if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
        queue.push({
          obj: obj,
          prop: key
        });
        refs.push(val);
      }
    }
  }

  compactQueue(queue);
  return value;
};

var isRegExp = function isRegExp(obj) {
  return Object.prototype.toString.call(obj) === '[object RegExp]';
};

var isBuffer = function isBuffer(obj) {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
};

var combine = function combine(a, b) {
  return [].concat(a, b);
};

var utils = {
  arrayToObject: arrayToObject,
  assign: assign,
  combine: combine,
  compact: compact,
  decode: decode,
  encode: encode,
  isBuffer: isBuffer,
  isRegExp: isRegExp,
  merge: merge
};
var replace = String.prototype.replace;
var percentTwenties = /%20/g;
var Format = {
  RFC1738: 'RFC1738',
  RFC3986: 'RFC3986'
};
var formats = utils.assign({
  'default': Format.RFC3986,
  formatters: {
    RFC1738: function (value) {
      return replace.call(value, percentTwenties, '+');
    },
    RFC3986: function (value) {
      return String(value);
    }
  }
}, Format);
var has$1 = Object.prototype.hasOwnProperty;
var arrayPrefixGenerators = {
  brackets: function brackets(prefix) {
    return prefix + '[]';
  },
  comma: 'comma',
  indices: function indices(prefix, key) {
    return prefix + '[' + key + ']';
  },
  repeat: function repeat(prefix) {
    return prefix;
  }
};
var isArray$1 = Array.isArray;
var push = Array.prototype.push;

var pushToArray = function (arr, valueOrArray) {
  push.apply(arr, isArray$1(valueOrArray) ? valueOrArray : [valueOrArray]);
};

var toISO = Date.prototype.toISOString;
var defaultFormat = formats['default'];
var defaults = {
  addQueryPrefix: false,
  allowDots: false,
  charset: 'utf-8',
  charsetSentinel: false,
  delimiter: '&',
  encode: true,
  encoder: utils.encode,
  encodeValuesOnly: false,
  format: defaultFormat,
  formatter: formats.formatters[defaultFormat],
  // deprecated
  indices: false,
  serializeDate: function serializeDate(date) {
    return toISO.call(date);
  },
  skipNulls: false,
  strictNullHandling: false
};

var isNonNullishPrimitive = function isNonNullishPrimitive(v) {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'symbol' || typeof v === 'bigint';
};

var stringify = function stringify(object, prefix, generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots, serializeDate, formatter, encodeValuesOnly, charset) {
  var obj = object;

  if (typeof filter === 'function') {
    obj = filter(prefix, obj);
  } else if (obj instanceof Date) {
    obj = serializeDate(obj);
  } else if (generateArrayPrefix === 'comma' && isArray$1(obj)) {
    obj = obj.join(',');
  }

  if (obj === null) {
    if (strictNullHandling) {
      return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder, charset, 'key') : prefix;
    }

    obj = '';
  }

  if (isNonNullishPrimitive(obj) || utils.isBuffer(obj)) {
    if (encoder) {
      var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, 'key');
      return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder, charset, 'value'))];
    }

    return [formatter(prefix) + '=' + formatter(String(obj))];
  }

  var values = [];

  if (typeof obj === 'undefined') {
    return values;
  }

  var objKeys;

  if (isArray$1(filter)) {
    objKeys = filter;
  } else {
    var keys = Object.keys(obj);
    objKeys = sort ? keys.sort(sort) : keys;
  }

  for (var i = 0; i < objKeys.length; ++i) {
    var key = objKeys[i];

    if (skipNulls && obj[key] === null) {
      continue;
    }

    if (isArray$1(obj)) {
      pushToArray(values, stringify(obj[key], typeof generateArrayPrefix === 'function' ? generateArrayPrefix(prefix, key) : prefix, generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots, serializeDate, formatter, encodeValuesOnly, charset));
    } else {
      pushToArray(values, stringify(obj[key], prefix + (allowDots ? '.' + key : '[' + key + ']'), generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots, serializeDate, formatter, encodeValuesOnly, charset));
    }
  }

  return values;
};

var normalizeStringifyOptions = function normalizeStringifyOptions(opts) {
  if (!opts) {
    return defaults;
  }

  if (opts.encoder !== null && opts.encoder !== undefined && typeof opts.encoder !== 'function') {
    throw new TypeError('Encoder has to be a function.');
  }

  var charset = opts.charset || defaults.charset;

  if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
    throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
  }

  var format = formats['default'];

  if (typeof opts.format !== 'undefined') {
    if (!has$1.call(formats.formatters, opts.format)) {
      throw new TypeError('Unknown format option provided.');
    }

    format = opts.format;
  }

  var formatter = formats.formatters[format];
  var filter = defaults.filter;

  if (typeof opts.filter === 'function' || isArray$1(opts.filter)) {
    filter = opts.filter;
  }

  return {
    addQueryPrefix: typeof opts.addQueryPrefix === 'boolean' ? opts.addQueryPrefix : defaults.addQueryPrefix,
    allowDots: typeof opts.allowDots === 'undefined' ? defaults.allowDots : !!opts.allowDots,
    charset: charset,
    charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
    delimiter: typeof opts.delimiter === 'undefined' ? defaults.delimiter : opts.delimiter,
    encode: typeof opts.encode === 'boolean' ? opts.encode : defaults.encode,
    encoder: typeof opts.encoder === 'function' ? opts.encoder : defaults.encoder,
    encodeValuesOnly: typeof opts.encodeValuesOnly === 'boolean' ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
    filter: filter,
    formatter: formatter,
    serializeDate: typeof opts.serializeDate === 'function' ? opts.serializeDate : defaults.serializeDate,
    skipNulls: typeof opts.skipNulls === 'boolean' ? opts.skipNulls : defaults.skipNulls,
    sort: typeof opts.sort === 'function' ? opts.sort : null,
    strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling
  };
};

var stringify_1 = function (object, opts) {
  var obj = object;
  var options = normalizeStringifyOptions(opts);
  var objKeys;
  var filter;

  if (typeof options.filter === 'function') {
    filter = options.filter;
    obj = filter('', obj);
  } else if (isArray$1(options.filter)) {
    filter = options.filter;
    objKeys = filter;
  }

  var keys = [];

  if (typeof obj !== 'object' || obj === null) {
    return '';
  }

  var arrayFormat;

  if (opts && opts.arrayFormat in arrayPrefixGenerators) {
    arrayFormat = opts.arrayFormat;
  } else if (opts && 'indices' in opts) {
    arrayFormat = opts.indices ? 'indices' : 'repeat';
  } else {
    arrayFormat = 'indices';
  }

  var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

  if (!objKeys) {
    objKeys = Object.keys(obj);
  }

  if (options.sort) {
    objKeys.sort(options.sort);
  }

  for (var i = 0; i < objKeys.length; ++i) {
    var key = objKeys[i];

    if (options.skipNulls && obj[key] === null) {
      continue;
    }

    pushToArray(keys, stringify(obj[key], key, generateArrayPrefix, options.strictNullHandling, options.skipNulls, options.encode ? options.encoder : null, options.filter, options.sort, options.allowDots, options.serializeDate, options.formatter, options.encodeValuesOnly, options.charset));
  }

  var joined = keys.join(options.delimiter);
  var prefix = options.addQueryPrefix === true ? '?' : '';

  if (options.charsetSentinel) {
    if (options.charset === 'iso-8859-1') {
      // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
      prefix += 'utf8=%26%2310003%3B&';
    } else {
      // encodeURIComponent('✓')
      prefix += 'utf8=%E2%9C%93&';
    }
  }

  return joined.length > 0 ? prefix + joined : '';
};

var has$2 = Object.prototype.hasOwnProperty;
var isArray$2 = Array.isArray;
var defaults$1 = {
  allowDots: false,
  allowPrototypes: false,
  arrayLimit: 20,
  charset: 'utf-8',
  charsetSentinel: false,
  comma: false,
  decoder: utils.decode,
  delimiter: '&',
  depth: 5,
  ignoreQueryPrefix: false,
  interpretNumericEntities: false,
  parameterLimit: 1000,
  parseArrays: true,
  plainObjects: false,
  strictNullHandling: false
};

var interpretNumericEntities = function (str) {
  return str.replace(/&#(\d+);/g, function ($0, numberStr) {
    return String.fromCharCode(parseInt(numberStr, 10));
  });
}; // This is what browsers will submit when the ✓ character occurs in an
// application/x-www-form-urlencoded body and the encoding of the page containing
// the form is iso-8859-1, or when the submitted form has an accept-charset
// attribute of iso-8859-1. Presumably also with other charsets that do not contain
// the ✓ character, such as us-ascii.


var isoSentinel = 'utf8=%26%2310003%3B'; // encodeURIComponent('&#10003;')
// These are the percent-encoded utf-8 octets representing a checkmark, indicating that the request actually is utf-8 encoded.

var charsetSentinel = 'utf8=%E2%9C%93'; // encodeURIComponent('✓')

var parseValues = function parseQueryStringValues(str, options) {
  var obj = {};
  var cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str;
  var limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;
  var parts = cleanStr.split(options.delimiter, limit);
  var skipIndex = -1; // Keep track of where the utf8 sentinel was found

  var i;
  var charset = options.charset;

  if (options.charsetSentinel) {
    for (i = 0; i < parts.length; ++i) {
      if (parts[i].indexOf('utf8=') === 0) {
        if (parts[i] === charsetSentinel) {
          charset = 'utf-8';
        } else if (parts[i] === isoSentinel) {
          charset = 'iso-8859-1';
        }

        skipIndex = i;
        i = parts.length; // The eslint settings do not allow break;
      }
    }
  }

  for (i = 0; i < parts.length; ++i) {
    if (i === skipIndex) {
      continue;
    }

    var part = parts[i];
    var bracketEqualsPos = part.indexOf(']=');
    var pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1;
    var key, val;

    if (pos === -1) {
      key = options.decoder(part, defaults$1.decoder, charset, 'key');
      val = options.strictNullHandling ? null : '';
    } else {
      key = options.decoder(part.slice(0, pos), defaults$1.decoder, charset, 'key');
      val = options.decoder(part.slice(pos + 1), defaults$1.decoder, charset, 'value');
    }

    if (val && options.interpretNumericEntities && charset === 'iso-8859-1') {
      val = interpretNumericEntities(val);
    }

    if (val && typeof val === 'string' && options.comma && val.indexOf(',') > -1) {
      val = val.split(',');
    }

    if (part.indexOf('[]=') > -1) {
      val = isArray$2(val) ? [val] : val;
    }

    if (has$2.call(obj, key)) {
      obj[key] = utils.combine(obj[key], val);
    } else {
      obj[key] = val;
    }
  }

  return obj;
};

var parseObject = function (chain, val, options) {
  var leaf = val;

  for (var i = chain.length - 1; i >= 0; --i) {
    var obj;
    var root = chain[i];

    if (root === '[]' && options.parseArrays) {
      obj = [].concat(leaf);
    } else {
      obj = options.plainObjects ? Object.create(null) : {};
      var cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
      var index = parseInt(cleanRoot, 10);

      if (!options.parseArrays && cleanRoot === '') {
        obj = {
          0: leaf
        };
      } else if (!isNaN(index) && root !== cleanRoot && String(index) === cleanRoot && index >= 0 && options.parseArrays && index <= options.arrayLimit) {
        obj = [];
        obj[index] = leaf;
      } else {
        obj[cleanRoot] = leaf;
      }
    }

    leaf = obj;
  }

  return leaf;
};

var parseKeys = function parseQueryStringKeys(givenKey, val, options) {
  if (!givenKey) {
    return;
  } // Transform dot notation to bracket notation


  var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey; // The regex chunks

  var brackets = /(\[[^[\]]*])/;
  var child = /(\[[^[\]]*])/g; // Get the parent

  var segment = options.depth > 0 && brackets.exec(key);
  var parent = segment ? key.slice(0, segment.index) : key; // Stash the parent if it exists

  var keys = [];

  if (parent) {
    // If we aren't using plain objects, optionally prefix keys that would overwrite object prototype properties
    if (!options.plainObjects && has$2.call(Object.prototype, parent)) {
      if (!options.allowPrototypes) {
        return;
      }
    }

    keys.push(parent);
  } // Loop through children appending to the array until we hit depth


  var i = 0;

  while (options.depth > 0 && (segment = child.exec(key)) !== null && i < options.depth) {
    i += 1;

    if (!options.plainObjects && has$2.call(Object.prototype, segment[1].slice(1, -1))) {
      if (!options.allowPrototypes) {
        return;
      }
    }

    keys.push(segment[1]);
  } // If there's a remainder, just add whatever is left


  if (segment) {
    keys.push('[' + key.slice(segment.index) + ']');
  }

  return parseObject(keys, val, options);
};

var normalizeParseOptions = function normalizeParseOptions(opts) {
  if (!opts) {
    return defaults$1;
  }

  if (opts.decoder !== null && opts.decoder !== undefined && typeof opts.decoder !== 'function') {
    throw new TypeError('Decoder has to be a function.');
  }

  if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
    throw new Error('The charset option must be either utf-8, iso-8859-1, or undefined');
  }

  var charset = typeof opts.charset === 'undefined' ? defaults$1.charset : opts.charset;
  return {
    allowDots: typeof opts.allowDots === 'undefined' ? defaults$1.allowDots : !!opts.allowDots,
    allowPrototypes: typeof opts.allowPrototypes === 'boolean' ? opts.allowPrototypes : defaults$1.allowPrototypes,
    arrayLimit: typeof opts.arrayLimit === 'number' ? opts.arrayLimit : defaults$1.arrayLimit,
    charset: charset,
    charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults$1.charsetSentinel,
    comma: typeof opts.comma === 'boolean' ? opts.comma : defaults$1.comma,
    decoder: typeof opts.decoder === 'function' ? opts.decoder : defaults$1.decoder,
    delimiter: typeof opts.delimiter === 'string' || utils.isRegExp(opts.delimiter) ? opts.delimiter : defaults$1.delimiter,
    // eslint-disable-next-line no-implicit-coercion, no-extra-parens
    depth: typeof opts.depth === 'number' || opts.depth === false ? +opts.depth : defaults$1.depth,
    ignoreQueryPrefix: opts.ignoreQueryPrefix === true,
    interpretNumericEntities: typeof opts.interpretNumericEntities === 'boolean' ? opts.interpretNumericEntities : defaults$1.interpretNumericEntities,
    parameterLimit: typeof opts.parameterLimit === 'number' ? opts.parameterLimit : defaults$1.parameterLimit,
    parseArrays: opts.parseArrays !== false,
    plainObjects: typeof opts.plainObjects === 'boolean' ? opts.plainObjects : defaults$1.plainObjects,
    strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults$1.strictNullHandling
  };
};

var parse = function (str, opts) {
  var options = normalizeParseOptions(opts);

  if (str === '' || str === null || typeof str === 'undefined') {
    return options.plainObjects ? Object.create(null) : {};
  }

  var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
  var obj = options.plainObjects ? Object.create(null) : {}; // Iterate over the keys and setup the new object

  var keys = Object.keys(tempObj);

  for (var i = 0; i < keys.length; ++i) {
    var key = keys[i];
    var newObj = parseKeys(key, tempObj[key], options);
    obj = utils.merge(obj, newObj, options);
  }

  return utils.compact(obj);
};

var lib = {
  formats: formats,
  parse: parse,
  stringify: stringify_1
};
var string_registry = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.setStrings = setStrings;
  exports.getStrings = getStrings;
  exports.getString = getString; // STATE within a module is frowned upon, this exists
  // to support Ember.STRINGS but shield ember internals from this legacy global
  // API.

  let STRINGS = {};

  function setStrings(strings) {
    STRINGS = strings;
  }

  function getStrings() {
    return STRINGS;
  }

  function getString(name) {
    return STRINGS[name];
  }
});
unwrapExports(string_registry);
var string_registry_1 = string_registry.setStrings;
var string_registry_2 = string_registry.getStrings;
var string_registry_3 = string_registry.getString;
var browserEnvironment = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.hasDOM = exports.isFirefox = exports.isChrome = exports.userAgent = exports.history = exports.location = exports.window = void 0; // check if window exists and actually is the global

  var hasDom = typeof self === 'object' && self !== null && self.Object === Object && typeof Window !== 'undefined' && self.constructor === Window && typeof document === 'object' && document !== null && self.document === document && typeof location === 'object' && location !== null && self.location === location && typeof history === 'object' && history !== null && self.history === history && typeof navigator === 'object' && navigator !== null && self.navigator === navigator && typeof navigator.userAgent === 'string';
  exports.hasDOM = hasDom;
  const window = hasDom ? self : null;
  exports.window = window;
  const location$1 = hasDom ? self.location : null;
  exports.location = location$1;
  const history$1 = hasDom ? self.history : null;
  exports.history = history$1;
  const userAgent = hasDom ? self.navigator.userAgent : 'Lynx (textmode)';
  exports.userAgent = userAgent;
  const isChrome = hasDom ? Boolean(window.chrome) && !window.opera : false;
  exports.isChrome = isChrome;
  const isFirefox = hasDom ? typeof InstallTrigger !== 'undefined' : false;
  exports.isFirefox = isFirefox;
});
unwrapExports(browserEnvironment);
var browserEnvironment_1 = browserEnvironment.hasDOM;
var browserEnvironment_2 = browserEnvironment.isFirefox;
var browserEnvironment_3 = browserEnvironment.isChrome;
var browserEnvironment_4 = browserEnvironment.userAgent;
var browserEnvironment_5 = browserEnvironment.history;
var browserEnvironment_6 = browserEnvironment.window;
var error = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = void 0;
  /**
   @module @ember/error
  */

  /**
    The JavaScript Error object used by Ember.assert.
  
    @class Error
    @namespace Ember
    @extends Error
    @constructor
    @public
  */

  var _default = Error;
  exports.default = _default;
});
unwrapExports(error);
var es5 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var DEBUG = exports.DEBUG = false;
  var CI = exports.CI = false;
});
unwrapExports(es5);
var es5_1 = es5.DEBUG;
var es5_2 = es5.CI;
var handlers = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.invoke = exports.registerHandler = exports.HANDLERS = void 0;
  let HANDLERS = {};
  exports.HANDLERS = HANDLERS;

  let registerHandler = () => {};

  exports.registerHandler = registerHandler;

  let invoke = () => {};

  exports.invoke = invoke;

  if (es5.DEBUG) {
    exports.registerHandler = registerHandler = function registerHandler(type, callback) {
      let nextHandler = HANDLERS[type] || (() => {});

      HANDLERS[type] = (message, options) => {
        callback(message, options, nextHandler);
      };
    };

    exports.invoke = invoke = function invoke(type, message, test, options) {
      if (test) {
        return;
      }

      let handlerForType = HANDLERS[type];

      if (handlerForType) {
        handlerForType(message, options);
      }
    };
  }
});
unwrapExports(handlers);
var handlers_1 = handlers.invoke;
var handlers_2 = handlers.registerHandler;
var handlers_3 = handlers.HANDLERS;
var deprecate_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.missingOptionsUntilDeprecation = exports.missingOptionsIdDeprecation = exports.missingOptionsDeprecation = exports.registerHandler = exports.default = void 0;
  /**
   @module @ember/debug
   @public
  */

  /**
    Allows for runtime registration of handler functions that override the default deprecation behavior.
    Deprecations are invoked by calls to [@ember/debug/deprecate](/ember/release/classes/@ember%2Fdebug/methods/deprecate?anchor=deprecate).
    The following example demonstrates its usage by registering a handler that throws an error if the
    message contains the word "should", otherwise defers to the default handler.
  
    ```javascript
    import { registerDeprecationHandler } from '@ember/debug';
  
    registerDeprecationHandler((message, options, next) => {
      if (message.indexOf('should') !== -1) {
        throw new Error(`Deprecation message with should: ${message}`);
      } else {
        // defer to whatever handler was registered before this one
        next(message, options);
      }
    });
    ```
  
    The handler function takes the following arguments:
  
    <ul>
      <li> <code>message</code> - The message received from the deprecation call.</li>
      <li> <code>options</code> - An object passed in with the deprecation call containing additional information including:</li>
        <ul>
          <li> <code>id</code> - An id of the deprecation in the form of <code>package-name.specific-deprecation</code>.</li>
          <li> <code>until</code> - The Ember version number the feature and deprecation will be removed in.</li>
        </ul>
      <li> <code>next</code> - A function that calls into the previously registered handler.</li>
    </ul>
  
    @public
    @static
    @method registerDeprecationHandler
    @for @ember/debug
    @param handler {Function} A function to handle deprecation calls.
    @since 2.1.0
  */

  let registerHandler = () => {};

  exports.registerHandler = registerHandler;
  let missingOptionsDeprecation;
  exports.missingOptionsDeprecation = missingOptionsDeprecation;
  let missingOptionsIdDeprecation;
  exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation;
  let missingOptionsUntilDeprecation;
  exports.missingOptionsUntilDeprecation = missingOptionsUntilDeprecation;

  let deprecate = () => {};

  if (es5.DEBUG) {
    exports.registerHandler = registerHandler = function registerHandler(handler) {
      (0, handlers.registerHandler)('deprecate', handler);
    };

    let formatMessage = function formatMessage(_message, options) {
      let message = _message;

      if (options && options.id) {
        message = message + ` [deprecation id: ${options.id}]`;
      }

      if (options && options.url) {
        message += ` See ${options.url} for more details.`;
      }

      return message;
    };

    registerHandler(function logDeprecationToConsole(message, options) {
      let updatedMessage = formatMessage(message, options);
      console.warn(`DEPRECATION: ${updatedMessage}`); // eslint-disable-line no-console
    });
    let captureErrorForStack;

    if (new Error().stack) {
      captureErrorForStack = () => new Error();
    } else {
      captureErrorForStack = () => {
        try {
          __fail__.fail();
        } catch (e) {
          return e;
        }
      };
    }

    registerHandler(function logDeprecationStackTrace(message, options, next) {
      if (environment.ENV.LOG_STACKTRACE_ON_DEPRECATION) {
        let stackStr = '';
        let error = captureErrorForStack();
        let stack;

        if (error.stack) {
          if (error['arguments']) {
            // Chrome
            stack = error.stack.replace(/^\s+at\s+/gm, '').replace(/^([^\(]+?)([\n$])/gm, '{anonymous}($1)$2').replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}($1)').split('\n');
            stack.shift();
          } else {
            // Firefox
            stack = error.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^\(/gm, '{anonymous}(').split('\n');
          }

          stackStr = `\n    ${stack.slice(2).join('\n    ')}`;
        }

        let updatedMessage = formatMessage(message, options);
        console.warn(`DEPRECATION: ${updatedMessage}${stackStr}`); // eslint-disable-line no-console
      } else {
        next(message, options);
      }
    });
    registerHandler(function raiseOnDeprecation(message, options, next) {
      if (environment.ENV.RAISE_ON_DEPRECATION) {
        let updatedMessage = formatMessage(message);
        throw new Error(updatedMessage);
      } else {
        next(message, options);
      }
    });
    exports.missingOptionsDeprecation = missingOptionsDeprecation = 'When calling `deprecate` you ' + 'must provide an `options` hash as the third parameter.  ' + '`options` should include `id` and `until` properties.';
    exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation = 'When calling `deprecate` you must provide `id` in options.';
    exports.missingOptionsUntilDeprecation = missingOptionsUntilDeprecation = 'When calling `deprecate` you must provide `until` in options.';
    /**
     @module @ember/debug
     @public
     */

    /**
      Display a deprecation warning with the provided message and a stack trace
      (Chrome and Firefox only).
         * In a production build, this method is defined as an empty function (NOP).
      Uses of this method in Ember itself are stripped from the ember.prod.js build.
         @method deprecate
      @for @ember/debug
      @param {String} message A description of the deprecation.
      @param {Boolean} test A boolean. If falsy, the deprecation will be displayed.
      @param {Object} options
      @param {String} options.id A unique id for this deprecation. The id can be
        used by Ember debugging tools to change the behavior (raise, log or silence)
        for that specific deprecation. The id should be namespaced by dots, e.g.
        "view.helper.select".
      @param {string} options.until The version of Ember when this deprecation
        warning will be removed.
      @param {String} [options.url] An optional url to the transition guide on the
        emberjs.com website.
      @static
      @public
      @since 1.0.0
    */

    deprecate = function deprecate(message, test, options) {
      (0, debug_1.assert)(missingOptionsDeprecation, Boolean(options && (options.id || options.until)));
      (0, debug_1.assert)(missingOptionsIdDeprecation, Boolean(options.id));
      (0, debug_1.assert)(missingOptionsUntilDeprecation, Boolean(options.until));
      (0, handlers.invoke)('deprecate', message, test, options);
    };
  }

  var _default = deprecate;
  exports.default = _default;
});
unwrapExports(deprecate_1);
var deprecate_2 = deprecate_1.missingOptionsUntilDeprecation;
var deprecate_3 = deprecate_1.missingOptionsIdDeprecation;
var deprecate_4 = deprecate_1.missingOptionsDeprecation;
var deprecate_5 = deprecate_1.registerHandler;
var testing_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.isTesting = isTesting;
  exports.setTesting = setTesting;
  let testing = false;

  function isTesting() {
    return testing;
  }

  function setTesting(value) {
    testing = Boolean(value);
  }
});
unwrapExports(testing_1);
var testing_2 = testing_1.isTesting;
var testing_3 = testing_1.setTesting;
var warn_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.missingOptionsDeprecation = exports.missingOptionsIdDeprecation = exports.registerHandler = exports.default = void 0;

  let registerHandler = () => {};

  exports.registerHandler = registerHandler;

  let warn = () => {};

  let missingOptionsDeprecation;
  exports.missingOptionsDeprecation = missingOptionsDeprecation;
  let missingOptionsIdDeprecation;
  /**
  @module @ember/debug
  */

  exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation;

  if (es5.DEBUG) {
    /**
      Allows for runtime registration of handler functions that override the default warning behavior.
      Warnings are invoked by calls made to [@ember/debug/warn](/ember/release/classes/@ember%2Fdebug/methods/warn?anchor=warn).
      The following example demonstrates its usage by registering a handler that does nothing overriding Ember's
      default warning behavior.
         ```javascript
      import { registerWarnHandler } from '@ember/debug';
         // next is not called, so no warnings get the default behavior
      registerWarnHandler(() => {});
      ```
         The handler function takes the following arguments:
         <ul>
        <li> <code>message</code> - The message received from the warn call. </li>
        <li> <code>options</code> - An object passed in with the warn call containing additional information including:</li>
          <ul>
            <li> <code>id</code> - An id of the warning in the form of <code>package-name.specific-warning</code>.</li>
          </ul>
        <li> <code>next</code> - A function that calls into the previously registered handler.</li>
      </ul>
         @public
      @static
      @method registerWarnHandler
      @for @ember/debug
      @param handler {Function} A function to handle warnings.
      @since 2.1.0
    */
    exports.registerHandler = registerHandler = function registerHandler(handler) {
      (0, handlers.registerHandler)('warn', handler);
    };

    registerHandler(function logWarning(message) {
      /* eslint-disable no-console */
      console.warn(`WARNING: ${message}`);
      /* eslint-enable no-console */
    });
    exports.missingOptionsDeprecation = missingOptionsDeprecation = 'When calling `warn` you ' + 'must provide an `options` hash as the third parameter.  ' + '`options` should include an `id` property.';
    exports.missingOptionsIdDeprecation = missingOptionsIdDeprecation = 'When calling `warn` you must provide `id` in options.';
    /**
      Display a warning with the provided message.
         * In a production build, this method is defined as an empty function (NOP).
      Uses of this method in Ember itself are stripped from the ember.prod.js build.
         ```javascript
      import { warn } from '@ember/debug';
      import tomsterCount from './tomster-counter'; // a module in my project
         // Log a warning if we have more than 3 tomsters
      warn('Too many tomsters!', tomsterCount <= 3, {
        id: 'ember-debug.too-many-tomsters'
      });
      ```
         @method warn
      @for @ember/debug
      @static
      @param {String} message A warning to display.
      @param {Boolean} test An optional boolean. If falsy, the warning
        will be displayed.
      @param {Object} options An object that can be used to pass a unique
        `id` for this warning.  The `id` can be used by Ember debugging tools
        to change the behavior (raise, log, or silence) for that specific warning.
        The `id` should be namespaced by dots, e.g. "ember-debug.feature-flag-with-features-stripped"
      @public
      @since 1.0.0
    */

    warn = function warn(message, test, options) {
      if (arguments.length === 2 && typeof test === 'object') {
        options = test;
        test = false;
      }

      (0, debug_1.assert)(missingOptionsDeprecation, Boolean(options));
      (0, debug_1.assert)(missingOptionsIdDeprecation, Boolean(options && options.id));
      (0, handlers.invoke)('warn', message, test, options);
    };
  }

  var _default = warn;
  exports.default = _default;
});
unwrapExports(warn_1);
var warn_2 = warn_1.missingOptionsDeprecation;
var warn_3 = warn_1.missingOptionsIdDeprecation;
var warn_4 = warn_1.registerHandler;
var arrayUtils = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  var EMPTY_ARRAY = exports.EMPTY_ARRAY = Object.freeze([]);
});
unwrapExports(arrayUtils);
var arrayUtils_1 = arrayUtils.EMPTY_ARRAY;
var assert = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.debugAssert = debugAssert;
  exports.prodAssert = prodAssert;
  exports.deprecate = deprecate; // import Logger from './logger';
  // let alreadyWarned = false;

  function debugAssert(test, msg) {
    // if (!alreadyWarned) {
    //   alreadyWarned = true;
    //   Logger.warn("Don't leave debug assertions on in public builds");
    // }
    if (!test) {
      throw new Error(msg || 'assertion failure');
    }
  }

  function prodAssert() {}

  function deprecate(desc) {
    console.warn('DEPRECATION: ' + desc);
  }

  exports.default = debugAssert;
});
unwrapExports(assert);
var assert_1 = assert.debugAssert;
var assert_2 = assert.prodAssert;
var assert_3 = assert.deprecate;
var guid = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.initializeGuid = initializeGuid;
  exports.ensureGuid = ensureGuid;
  var GUID = 0;

  function initializeGuid(object) {
    return object._guid = ++GUID;
  }

  function ensureGuid(object) {
    return object._guid || initializeGuid(object);
  }
});
unwrapExports(guid);
var guid_1 = guid.initializeGuid;
var guid_2 = guid.ensureGuid;
var collections = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.StackImpl = exports.DictSet = undefined;
  exports.dict = dict;
  exports.isDict = isDict;
  exports.isObject = isObject;

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function dict() {
    return Object.create(null);
  }

  function isDict(u) {
    return u !== null && u !== undefined;
  }

  function isObject(u) {
    return typeof u === 'object' && u !== null;
  }

  var DictSet = exports.DictSet = function () {
    function DictSet() {
      _classCallCheck(this, DictSet);

      this.dict = dict();
    }

    DictSet.prototype.add = function add(obj) {
      if (typeof obj === 'string') this.dict[obj] = obj;else this.dict[(0, guid.ensureGuid)(obj)] = obj;
      return this;
    };

    DictSet.prototype.delete = function _delete(obj) {
      if (typeof obj === 'string') delete this.dict[obj];else if (obj._guid) delete this.dict[obj._guid];
    };

    return DictSet;
  }();

  var StackImpl = exports.StackImpl = function () {
    function StackImpl() {
      _classCallCheck(this, StackImpl);

      this.stack = [];
      this.current = null;
    }

    StackImpl.prototype.push = function push(item) {
      this.current = item;
      this.stack.push(item);
    };

    StackImpl.prototype.pop = function pop() {
      var item = this.stack.pop();
      var len = this.stack.length;
      this.current = len === 0 ? null : this.stack[len - 1];
      return item === undefined ? null : item;
    };

    StackImpl.prototype.nth = function nth(from) {
      var len = this.stack.length;
      return len < from ? null : this.stack[len - from];
    };

    StackImpl.prototype.isEmpty = function isEmpty() {
      return this.stack.length === 0;
    };

    StackImpl.prototype.toArray = function toArray() {
      return this.stack;
    };

    _createClass(StackImpl, [{
      key: 'size',
      get: function get() {
        return this.stack.length;
      }
    }]);

    return StackImpl;
  }();
});
unwrapExports(collections);
var collections_1 = collections.StackImpl;
var collections_2 = collections.DictSet;
var collections_3 = collections.dict;
var collections_4 = collections.isDict;
var collections_5 = collections.isObject;
var destroy = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.isDestroyable = isDestroyable;
  exports.isStringDestroyable = isStringDestroyable;
  var DESTROY = exports.DESTROY = 'DESTROY [fc611582-3742-4845-88e1-971c3775e0b8]';

  function isDestroyable(value) {
    return !!(value && DESTROY in value);
  }

  function isStringDestroyable(value) {
    return !!(value && typeof value === 'object' && typeof value.destroy === 'function');
  }
});
unwrapExports(destroy);
var destroy_1 = destroy.isDestroyable;
var destroy_2 = destroy.isStringDestroyable;
var destroy_3 = destroy.DESTROY;
var dom = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.clearElement = clearElement;

  function clearElement(parent) {
    var current = parent.firstChild;

    while (current) {
      var next = current.nextSibling;
      parent.removeChild(current);
      current = next;
    }
  }
});
unwrapExports(dom);
var dom_1 = dom.clearElement;
var isSerializationFirstNode_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.isSerializationFirstNode = isSerializationFirstNode;
  var SERIALIZATION_FIRST_NODE_STRING = exports.SERIALIZATION_FIRST_NODE_STRING = '%+b:0%';

  function isSerializationFirstNode(node) {
    return node.nodeValue === SERIALIZATION_FIRST_NODE_STRING;
  }
});
unwrapExports(isSerializationFirstNode_1);
var isSerializationFirstNode_2 = isSerializationFirstNode_1.isSerializationFirstNode;
var isSerializationFirstNode_3 = isSerializationFirstNode_1.SERIALIZATION_FIRST_NODE_STRING;
var lifetimes = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.ListContentsDestructor = exports.DESTRUCTORS = exports.CHILDREN = exports.DROP = exports.LINKED = undefined;
  exports.isDrop = isDrop;
  exports.associate = associate;
  exports.associateDestructor = associateDestructor;
  exports.takeAssociated = takeAssociated;
  exports.destroyAssociated = destroyAssociated;
  exports.destructor = destructor;
  exports.snapshot = snapshot;
  exports.debugDropTree = debugDropTree;
  exports.printDropTree = printDropTree;
  exports.printDrop = printDrop;

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var LINKED = exports.LINKED = new WeakMap();
  var DROP = exports.DROP = 'DROP [94d46cf3-3974-435d-b278-3e60d1155290]';
  var CHILDREN = exports.CHILDREN = 'CHILDREN [7142e52a-8600-4e01-a773-42055b96630d]';
  var DESTRUCTORS = exports.DESTRUCTORS = new WeakMap();

  function isDrop(value) {
    if (value === null || typeof value !== 'object') return false;
    return DROP in value;
  }

  function associate(parent, child) {
    associateDestructor(parent, destructor(child));
  }

  function associateDestructor(parent, child) {
    var associated = LINKED.get(parent);

    if (!associated) {
      associated = new Set();
      LINKED.set(parent, associated);
    }

    associated.add(child);
  }

  function takeAssociated(parent) {
    var linked = LINKED.get(parent);

    if (linked && linked.size > 0) {
      LINKED.delete(parent);
      return linked;
    } else {
      return null;
    }
  }

  function destroyAssociated(parent) {
    var associated = LINKED.get(parent);

    if (associated) {
      associated.forEach(function (item) {
        item[DROP]();
        associated.delete(item);
      });
    }
  }

  function destructor(value) {
    var d = DESTRUCTORS.get(value);

    if (!d) {
      if ((0, destroy.isDestroyable)(value)) {
        d = new DestroyableDestructor(value);
      } else if ((0, destroy.isStringDestroyable)(value)) {
        d = new StringDestroyableDestructor(value);
      } else {
        d = new SimpleDestructor(value);
      }

      DESTRUCTORS.set(value, d);
    }

    return d;
  }

  function snapshot(values) {
    return new SnapshotDestructor(values);
  }

  var SnapshotDestructor = function () {
    function SnapshotDestructor(destructors) {
      _classCallCheck(this, SnapshotDestructor);

      this.destructors = destructors;
    }

    SnapshotDestructor.prototype[DROP] = function () {
      this.destructors.forEach(function (item) {
        return item[DROP]();
      });
    };

    SnapshotDestructor.prototype.toString = function toString() {
      return 'SnapshotDestructor';
    };

    _createClass(SnapshotDestructor, [{
      key: CHILDREN,
      get: function get() {
        return this.destructors;
      }
    }]);

    return SnapshotDestructor;
  }();

  var DestroyableDestructor = function () {
    function DestroyableDestructor(inner) {
      _classCallCheck(this, DestroyableDestructor);

      this.inner = inner;
    }

    DestroyableDestructor.prototype[DROP] = function () {
      this.inner[destroy.DESTROY]();
      destroyAssociated(this.inner);
    };

    DestroyableDestructor.prototype.toString = function toString() {
      return 'DestroyableDestructor';
    };

    _createClass(DestroyableDestructor, [{
      key: CHILDREN,
      get: function get() {
        return LINKED.get(this.inner) || [];
      }
    }]);

    return DestroyableDestructor;
  }();

  var StringDestroyableDestructor = function () {
    function StringDestroyableDestructor(inner) {
      _classCallCheck(this, StringDestroyableDestructor);

      this.inner = inner;
    }

    StringDestroyableDestructor.prototype[DROP] = function () {
      this.inner.destroy();
      destroyAssociated(this.inner);
    };

    StringDestroyableDestructor.prototype.toString = function toString() {
      return 'StringDestroyableDestructor';
    };

    _createClass(StringDestroyableDestructor, [{
      key: CHILDREN,
      get: function get() {
        return LINKED.get(this.inner) || [];
      }
    }]);

    return StringDestroyableDestructor;
  }();

  var SimpleDestructor = function () {
    function SimpleDestructor(inner) {
      _classCallCheck(this, SimpleDestructor);

      this.inner = inner;
    }

    SimpleDestructor.prototype[DROP] = function () {
      destroyAssociated(this.inner);
    };

    SimpleDestructor.prototype.toString = function toString() {
      return 'SimpleDestructor';
    };

    _createClass(SimpleDestructor, [{
      key: CHILDREN,
      get: function get() {
        return LINKED.get(this.inner) || [];
      }
    }]);

    return SimpleDestructor;
  }();

  var ListContentsDestructor = exports.ListContentsDestructor = function () {
    function ListContentsDestructor(inner) {
      _classCallCheck(this, ListContentsDestructor);

      this.inner = inner;
    }

    ListContentsDestructor.prototype[DROP] = function () {
      this.inner.forEachNode(function (d) {
        return destructor(d)[DROP]();
      });
    };

    ListContentsDestructor.prototype.toString = function toString() {
      return 'ListContentsDestructor';
    };

    _createClass(ListContentsDestructor, [{
      key: CHILDREN,
      get: function get() {
        var out = [];
        this.inner.forEachNode(function (d) {
          return out.push.apply(out, destructor(d)[CHILDREN]);
        });
        return out;
      }
    }]);

    return ListContentsDestructor;
  }();

  function debugDropTree(inner) {
    var hasDrop = isDrop(inner);
    var rawChildren = LINKED.get(inner) || null;
    var children = null;

    if (rawChildren) {
      children = [];

      for (var _iterator = rawChildren, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
        var _ref;

        if (_isArray) {
          if (_i >= _iterator.length) break;
          _ref = _iterator[_i++];
        } else {
          _i = _iterator.next();
          if (_i.done) break;
          _ref = _i.value;
        }

        var child = _ref;
        children.push(debugDropTree(child));
      }
    }

    var obj = Object.create(null);
    obj.inner = inner;

    if (children) {
      obj.children = children;
    }

    obj.hasDrop = hasDrop;
    return obj;
  }

  function printDropTree(inner) {
    printDrop(destructor(inner));
  }

  function printDrop(inner) {
    console.group(String(inner));
    console.log(inner);
    var children = inner[CHILDREN] || null;

    if (children) {
      for (var _iterator2 = children, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
        var _ref2;

        if (_isArray2) {
          if (_i2 >= _iterator2.length) break;
          _ref2 = _iterator2[_i2++];
        } else {
          _i2 = _iterator2.next();
          if (_i2.done) break;
          _ref2 = _i2.value;
        }

        var child = _ref2;
        printDrop(child);
      }
    }

    console.groupEnd();
  }
});
unwrapExports(lifetimes);
var lifetimes_1 = lifetimes.ListContentsDestructor;
var lifetimes_2 = lifetimes.DESTRUCTORS;
var lifetimes_3 = lifetimes.CHILDREN;
var lifetimes_4 = lifetimes.DROP;
var lifetimes_5 = lifetimes.LINKED;
var lifetimes_6 = lifetimes.isDrop;
var lifetimes_7 = lifetimes.associate;
var lifetimes_8 = lifetimes.associateDestructor;
var lifetimes_9 = lifetimes.takeAssociated;
var lifetimes_10 = lifetimes.destroyAssociated;
var lifetimes_11 = lifetimes.destructor;
var lifetimes_12 = lifetimes.snapshot;
var lifetimes_13 = lifetimes.debugDropTree;
var lifetimes_14 = lifetimes.printDropTree;
var lifetimes_15 = lifetimes.printDrop;
var listUtils = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.EMPTY_SLICE = exports.ListSlice = exports.LinkedList = exports.ListNode = undefined;

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  var ListNode = exports.ListNode = function ListNode(value) {
    _classCallCheck(this, ListNode);

    this.next = null;
    this.prev = null;
    this.value = value;
  };

  var LinkedList = exports.LinkedList = function () {
    function LinkedList() {
      _classCallCheck(this, LinkedList);

      this.clear();
    }

    LinkedList.prototype.head = function head() {
      return this._head;
    };

    LinkedList.prototype.tail = function tail() {
      return this._tail;
    };

    LinkedList.prototype.clear = function clear() {
      this._head = this._tail = null;
    };

    LinkedList.prototype.toArray = function toArray() {
      var out = [];
      this.forEachNode(function (n) {
        return out.push(n);
      });
      return out;
    };

    LinkedList.prototype.nextNode = function nextNode(node) {
      return node.next;
    };

    LinkedList.prototype.forEachNode = function forEachNode(callback) {
      var node = this._head;

      while (node !== null) {
        callback(node);
        node = node.next;
      }
    };

    LinkedList.prototype.insertBefore = function insertBefore(node) {
      var reference = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      if (reference === null) return this.append(node);
      if (reference.prev) reference.prev.next = node;else this._head = node;
      node.prev = reference.prev;
      node.next = reference;
      reference.prev = node;
      return node;
    };

    LinkedList.prototype.append = function append(node) {
      var tail = this._tail;

      if (tail) {
        tail.next = node;
        node.prev = tail;
        node.next = null;
      } else {
        this._head = node;
      }

      return this._tail = node;
    };

    LinkedList.prototype.remove = function remove(node) {
      if (node.prev) node.prev.next = node.next;else this._head = node.next;
      if (node.next) node.next.prev = node.prev;else this._tail = node.prev;
      return node;
    };

    LinkedList.prototype[lifetimes.DROP] = function () {
      this.forEachNode(function (d) {
        return (0, lifetimes.destructor)(d)[lifetimes.DROP]();
      });
    };

    _createClass(LinkedList, [{
      key: lifetimes.CHILDREN,
      get: function get() {
        var out = [];
        this.forEachNode(function (d) {
          return out.push.apply(out, (0, lifetimes.destructor)(d)[lifetimes.CHILDREN]);
        });
        return out;
      }
    }]);

    return LinkedList;
  }();

  var ListSlice = exports.ListSlice = function () {
    function ListSlice(head, tail) {
      _classCallCheck(this, ListSlice);

      this._head = head;
      this._tail = tail;
    }

    ListSlice.prototype.forEachNode = function forEachNode(callback) {
      var node = this._head;

      while (node !== null) {
        callback(node);
        node = this.nextNode(node);
      }
    };

    ListSlice.prototype.head = function head() {
      return this._head;
    };

    ListSlice.prototype.tail = function tail() {
      return this._tail;
    };

    ListSlice.prototype.toArray = function toArray() {
      var out = [];
      this.forEachNode(function (n) {
        return out.push(n);
      });
      return out;
    };

    ListSlice.prototype.nextNode = function nextNode(node) {
      if (node === this._tail) return null;
      return node.next;
    };

    return ListSlice;
  }();

  var EMPTY_SLICE = exports.EMPTY_SLICE = new ListSlice(null, null);
});
unwrapExports(listUtils);
var listUtils_1 = listUtils.EMPTY_SLICE;
var listUtils_2 = listUtils.ListSlice;
var listUtils_3 = listUtils.LinkedList;
var listUtils_4 = listUtils.ListNode;
var objectUtils = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.assign = assign;
  exports.fillNulls = fillNulls;
  exports.values = values;
  var objKeys = Object.keys;

  function assign(obj) {
    for (var i = 1; i < arguments.length; i++) {
      var assignment = arguments[i];
      if (assignment === null || typeof assignment !== 'object') continue;
      var keys = objKeys(assignment);

      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        obj[key] = assignment[key];
      }
    }

    return obj;
  }

  function fillNulls(count) {
    var arr = new Array(count);

    for (var i = 0; i < count; i++) {
      arr[i] = null;
    }

    return arr;
  }

  function values(obj) {
    var vals = [];

    for (var key in obj) {
      vals.push(obj[key]);
    }

    return vals;
  }
});
unwrapExports(objectUtils);
var objectUtils_1 = objectUtils.assign;
var objectUtils_2 = objectUtils.fillNulls;
var objectUtils_3 = objectUtils.values;
var platformUtils = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.keys = keys;
  exports.unwrap = unwrap;
  exports.expect = expect;
  exports.unreachable = unreachable;
  exports.exhausted = exhausted;

  function keys(obj) {
    return Object.keys(obj);
  }

  function unwrap(val) {
    if (val === null || val === undefined) throw new Error('Expected value to be present');
    return val;
  }

  function expect(val, message) {
    if (val === null || val === undefined) throw new Error(message);
    return val;
  }

  function unreachable() {
    var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'unreachable';
    return new Error(message);
  }

  function exhausted(value) {
    throw new Error('Exhausted ' + value);
  }

  var tuple = exports.tuple = function tuple() {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return args;
  };
});
unwrapExports(platformUtils);
var platformUtils_1 = platformUtils.keys;
var platformUtils_2 = platformUtils.unwrap;
var platformUtils_3 = platformUtils.expect;
var platformUtils_4 = platformUtils.unreachable;
var platformUtils_5 = platformUtils.exhausted;
var platformUtils_6 = platformUtils.tuple;
var string = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.strip = strip;

  function strip(strings) {
    var out = '';

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    for (var i = 0; i < strings.length; i++) {
      var string = strings[i];
      var dynamic = args[i] !== undefined ? String(args[i]) : '';
      out += '' + string + dynamic;
    }

    var lines = out.split('\n');

    while (lines.length && lines[0].match(/^\s*$/)) {
      lines.shift();
    }

    while (lines.length && lines[lines.length - 1].match(/^\s*$/)) {
      lines.pop();
    }

    var min = Infinity;

    for (var _iterator = lines, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      var line = _ref;
      var leading = line.match(/^\s*/)[0].length;
      min = Math.min(min, leading);
    }

    var stripped = [];

    for (var _iterator2 = lines, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
      var _ref2;

      if (_isArray2) {
        if (_i2 >= _iterator2.length) break;
        _ref2 = _iterator2[_i2++];
      } else {
        _i2 = _iterator2.next();
        if (_i2.done) break;
        _ref2 = _i2.value;
      }

      var _line = _ref2;
      stripped.push(_line.slice(min));
    }

    return stripped.join('\n');
  }
});
unwrapExports(string);
var string_1 = string.strip;
var es5$1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'EMPTY_ARRAY', {
    enumerable: true,
    get: function () {
      return arrayUtils.EMPTY_ARRAY;
    }
  });
  Object.defineProperty(exports, 'assert', {
    enumerable: true,
    get: function () {
      return _interopRequireDefault(assert).default;
    }
  });
  Object.defineProperty(exports, 'deprecate', {
    enumerable: true,
    get: function () {
      return assert.deprecate;
    }
  });
  Object.defineProperty(exports, 'dict', {
    enumerable: true,
    get: function () {
      return collections.dict;
    }
  });
  Object.defineProperty(exports, 'DictSet', {
    enumerable: true,
    get: function () {
      return collections.DictSet;
    }
  });
  Object.defineProperty(exports, 'isDict', {
    enumerable: true,
    get: function () {
      return collections.isDict;
    }
  });
  Object.defineProperty(exports, 'isObject', {
    enumerable: true,
    get: function () {
      return collections.isObject;
    }
  });
  Object.defineProperty(exports, 'Stack', {
    enumerable: true,
    get: function () {
      return collections.StackImpl;
    }
  });
  Object.keys(destroy).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return destroy[key];
      }
    });
  });
  Object.keys(dom).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return dom[key];
      }
    });
  });
  Object.defineProperty(exports, 'ensureGuid', {
    enumerable: true,
    get: function () {
      return guid.ensureGuid;
    }
  });
  Object.defineProperty(exports, 'initializeGuid', {
    enumerable: true,
    get: function () {
      return guid.initializeGuid;
    }
  });
  Object.defineProperty(exports, 'isSerializationFirstNode', {
    enumerable: true,
    get: function () {
      return isSerializationFirstNode_1.isSerializationFirstNode;
    }
  });
  Object.defineProperty(exports, 'SERIALIZATION_FIRST_NODE_STRING', {
    enumerable: true,
    get: function () {
      return isSerializationFirstNode_1.SERIALIZATION_FIRST_NODE_STRING;
    }
  });
  Object.keys(lifetimes).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return lifetimes[key];
      }
    });
  });
  Object.defineProperty(exports, 'EMPTY_SLICE', {
    enumerable: true,
    get: function () {
      return listUtils.EMPTY_SLICE;
    }
  });
  Object.defineProperty(exports, 'LinkedList', {
    enumerable: true,
    get: function () {
      return listUtils.LinkedList;
    }
  });
  Object.defineProperty(exports, 'ListNode', {
    enumerable: true,
    get: function () {
      return listUtils.ListNode;
    }
  });
  Object.defineProperty(exports, 'ListSlice', {
    enumerable: true,
    get: function () {
      return listUtils.ListSlice;
    }
  });
  Object.defineProperty(exports, 'assign', {
    enumerable: true,
    get: function () {
      return objectUtils.assign;
    }
  });
  Object.defineProperty(exports, 'fillNulls', {
    enumerable: true,
    get: function () {
      return objectUtils.fillNulls;
    }
  });
  Object.defineProperty(exports, 'values', {
    enumerable: true,
    get: function () {
      return objectUtils.values;
    }
  });
  Object.keys(platformUtils).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return platformUtils[key];
      }
    });
  });
  Object.keys(string).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
      enumerable: true,
      get: function () {
        return string[key];
      }
    });
  });
  exports.assertNever = assertNever;

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function assertNever(value) {
    var desc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'unexpected unreachable branch';
    console.log('unreachable', value);
    console.trace(desc + ' :: ' + JSON.stringify(value) + ' (' + value + ')');
  }
});
unwrapExports(es5$1);
var es5_1$1 = es5$1.assertNever;
var captureRenderTree_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = captureRenderTree;
  /**
    @module @ember/debug
  */

  /**
    Ember Inspector calls this function to capture the current render tree.
  
    In production mode, this requires turning on `ENV._DEBUG_RENDER_TREE`
    before loading Ember.
  
    @private
    @static
    @method captureRenderTree
    @for @ember/debug
    @param app {ApplicationInstance} An `ApplicationInstance`.
    @since 3.14.0
  */

  function captureRenderTree(app) {
    let env = (0, es5$1.expect)(app.lookup('-environment:main'), 'BUG: owner is missing -environment:main');
    let rendererType = env.isInteractive ? 'renderer:-dom' : 'renderer:-inert';
    let renderer = (0, es5$1.expect)(app.lookup(rendererType), `BUG: owner is missing ${rendererType}`);
    return renderer.debugRenderTree.capture();
  }
});
unwrapExports(captureRenderTree_1);
var debug_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, "registerDeprecationHandler", {
    enumerable: true,
    get: function () {
      return _deprecate2.registerHandler;
    }
  });
  Object.defineProperty(exports, "isTesting", {
    enumerable: true,
    get: function () {
      return testing_1.isTesting;
    }
  });
  Object.defineProperty(exports, "setTesting", {
    enumerable: true,
    get: function () {
      return testing_1.setTesting;
    }
  });
  Object.defineProperty(exports, "registerWarnHandler", {
    enumerable: true,
    get: function () {
      return _warn2.registerHandler;
    }
  });
  Object.defineProperty(exports, "captureRenderTree", {
    enumerable: true,
    get: function () {
      return _captureRenderTree.default;
    }
  });
  exports._warnIfUsingStrippedFeatureFlags = exports.getDebugFunction = exports.setDebugFunction = exports.deprecateFunc = exports.runInDebug = exports.debugFreeze = exports.debugSeal = exports.deprecate = exports.debug = exports.warn = exports.info = exports.assert = void 0;

  var _error = _interopRequireDefault(error);

  var _deprecate2 = _interopRequireWildcard(deprecate_1);

  var _warn2 = _interopRequireWildcard(warn_1);

  var _captureRenderTree = _interopRequireDefault(captureRenderTree_1);

  function _getRequireWildcardCache() {
    if (typeof WeakMap !== "function") return null;
    var cache = new WeakMap();

    _getRequireWildcardCache = function () {
      return cache;
    };

    return cache;
  }

  function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
      return obj;
    }

    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
      return {
        default: obj
      };
    }

    var cache = _getRequireWildcardCache();

    if (cache && cache.has(obj)) {
      return cache.get(obj);
    }

    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;

    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;

        if (desc && (desc.get || desc.set)) {
          Object.defineProperty(newObj, key, desc);
        } else {
          newObj[key] = obj[key];
        }
      }
    }

    newObj.default = obj;

    if (cache) {
      cache.set(obj, newObj);
    }

    return newObj;
  }

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  } // These are the default production build versions:


  const noop = () => {};

  let assert = noop;
  exports.assert = assert;
  let info = noop;
  exports.info = info;
  let warn = noop;
  exports.warn = warn;
  let debug = noop;
  exports.debug = debug;
  let deprecate = noop;
  exports.deprecate = deprecate;
  let debugSeal = noop;
  exports.debugSeal = debugSeal;
  let debugFreeze = noop;
  exports.debugFreeze = debugFreeze;
  let runInDebug = noop;
  exports.runInDebug = runInDebug;
  let setDebugFunction = noop;
  exports.setDebugFunction = setDebugFunction;
  let getDebugFunction = noop;
  exports.getDebugFunction = getDebugFunction;

  let deprecateFunc = function () {
    return arguments[arguments.length - 1];
  };

  exports.deprecateFunc = deprecateFunc;

  if (es5.DEBUG) {
    exports.setDebugFunction = setDebugFunction = function (type, callback) {
      switch (type) {
        case 'assert':
          return exports.assert = assert = callback;

        case 'info':
          return exports.info = info = callback;

        case 'warn':
          return exports.warn = warn = callback;

        case 'debug':
          return exports.debug = debug = callback;

        case 'deprecate':
          return exports.deprecate = deprecate = callback;

        case 'debugSeal':
          return exports.debugSeal = debugSeal = callback;

        case 'debugFreeze':
          return exports.debugFreeze = debugFreeze = callback;

        case 'runInDebug':
          return exports.runInDebug = runInDebug = callback;

        case 'deprecateFunc':
          return exports.deprecateFunc = deprecateFunc = callback;
      }
    };

    exports.getDebugFunction = getDebugFunction = function (type) {
      switch (type) {
        case 'assert':
          return assert;

        case 'info':
          return info;

        case 'warn':
          return warn;

        case 'debug':
          return debug;

        case 'deprecate':
          return deprecate;

        case 'debugSeal':
          return debugSeal;

        case 'debugFreeze':
          return debugFreeze;

        case 'runInDebug':
          return runInDebug;

        case 'deprecateFunc':
          return deprecateFunc;
      }
    };
  }
  /**
  @module @ember/debug
  */


  if (es5.DEBUG) {
    /**
      Verify that a certain expectation is met, or throw a exception otherwise.
         This is useful for communicating assumptions in the code to other human
      readers as well as catching bugs that accidentally violates these
      expectations.
         Assertions are removed from production builds, so they can be freely added
      for documentation and debugging purposes without worries of incuring any
      performance penalty. However, because of that, they should not be used for
      checks that could reasonably fail during normal usage. Furthermore, care
      should be taken to avoid accidentally relying on side-effects produced from
      evaluating the condition itself, since the code will not run in production.
         ```javascript
      import { assert } from '@ember/debug';
         // Test for truthiness
      assert('Must pass a string', typeof str === 'string');
         // Fail unconditionally
      assert('This code path should never be run');
      ```
         @method assert
      @static
      @for @ember/debug
      @param {String} description Describes the expectation. This will become the
        text of the Error thrown if the assertion fails.
      @param {any} condition Must be truthy for the assertion to pass. If
        falsy, an exception will be thrown.
      @public
      @since 1.0.0
    */
    setDebugFunction('assert', function assert(desc, test) {
      if (!test) {
        throw new _error.default(`Assertion Failed: ${desc}`);
      }
    });
    /**
      Display a debug notice.
         Calls to this function are removed from production builds, so they can be
      freely added for documentation and debugging purposes without worries of
      incuring any performance penalty.
         ```javascript
      import { debug } from '@ember/debug';
         debug('I\'m a debug notice!');
      ```
         @method debug
      @for @ember/debug
      @static
      @param {String} message A debug message to display.
      @public
    */

    setDebugFunction('debug', function debug(message) {
      /* eslint-disable no-console */
      if (console.debug) {
        console.debug(`DEBUG: ${message}`);
      } else {
        console.log(`DEBUG: ${message}`);
      }
      /* eslint-ensable no-console */

    });
    /**
      Display an info notice.
         Calls to this function are removed from production builds, so they can be
      freely added for documentation and debugging purposes without worries of
      incuring any performance penalty.
         @method info
      @private
    */

    setDebugFunction('info', function info() {
      console.info(...arguments);
      /* eslint-disable-line no-console */
    });
    /**
     @module @ember/debug
     @public
    */

    /**
      Alias an old, deprecated method with its new counterpart.
         Display a deprecation warning with the provided message and a stack trace
      (Chrome and Firefox only) when the assigned method is called.
         Calls to this function are removed from production builds, so they can be
      freely added for documentation and debugging purposes without worries of
      incuring any performance penalty.
         ```javascript
      import { deprecateFunc } from '@ember/debug';
         Ember.oldMethod = deprecateFunc('Please use the new, updated method', options, Ember.newMethod);
      ```
         @method deprecateFunc
      @static
      @for @ember/debug
      @param {String} message A description of the deprecation.
      @param {Object} [options] The options object for `deprecate`.
      @param {Function} func The new function called to replace its deprecated counterpart.
      @return {Function} A new function that wraps the original function with a deprecation warning
      @private
    */

    setDebugFunction('deprecateFunc', function deprecateFunc(...args) {
      if (args.length === 3) {
        let [message, options, func] = args;
        return function (...args) {
          deprecate(message, false, options);
          return func.apply(this, args);
        };
      } else {
        let [message, func] = args;
        return function () {
          deprecate(message);
          return func.apply(this, arguments);
        };
      }
    });
    /**
     @module @ember/debug
     @public
    */

    /**
      Run a function meant for debugging.
         Calls to this function are removed from production builds, so they can be
      freely added for documentation and debugging purposes without worries of
      incuring any performance penalty.
         ```javascript
      import Component from '@ember/component';
      import { runInDebug } from '@ember/debug';
         runInDebug(() => {
        Component.reopen({
          didInsertElement() {
            console.log("I'm happy");
          }
        });
      });
      ```
         @method runInDebug
      @for @ember/debug
      @static
      @param {Function} func The function to be executed.
      @since 1.5.0
      @public
    */

    setDebugFunction('runInDebug', function runInDebug(func) {
      func();
    });
    setDebugFunction('debugSeal', function debugSeal(obj) {
      Object.seal(obj);
    });
    setDebugFunction('debugFreeze', function debugFreeze(obj) {
      // re-freezing an already frozen object introduces a significant
      // performance penalty on Chrome (tested through 59).
      //
      // See: https://bugs.chromium.org/p/v8/issues/detail?id=6450
      if (!Object.isFrozen(obj)) {
        Object.freeze(obj);
      }
    });
    setDebugFunction('deprecate', _deprecate2.default);
    setDebugFunction('warn', _warn2.default);
  }

  let _warnIfUsingStrippedFeatureFlags;

  exports._warnIfUsingStrippedFeatureFlags = _warnIfUsingStrippedFeatureFlags;

  if (es5.DEBUG && !(0, testing_1.isTesting)()) {
    if (typeof window !== 'undefined' && (browserEnvironment.isFirefox || browserEnvironment.isChrome) && window.addEventListener) {
      window.addEventListener('load', () => {
        if (document.documentElement && document.documentElement.dataset && !document.documentElement.dataset.emberExtension) {
          let downloadURL;

          if (browserEnvironment.isChrome) {
            downloadURL = 'https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi';
          } else if (browserEnvironment.isFirefox) {
            downloadURL = 'https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/';
          }

          debug(`For more advanced debugging, install the Ember Inspector from ${downloadURL}`);
        }
      }, false);
    }
  }
});
unwrapExports(debug_1);
var debug_2 = debug_1._warnIfUsingStrippedFeatureFlags;
var debug_3 = debug_1.getDebugFunction;
var debug_4 = debug_1.setDebugFunction;
var debug_5 = debug_1.deprecateFunc;
var debug_6 = debug_1.runInDebug;
var debug_7 = debug_1.debugFreeze;
var debug_8 = debug_1.debugSeal;
var debug_9 = debug_1.deprecate;
var debug_10 = debug_1.debug;
var debug_11 = debug_1.warn;
var debug_12 = debug_1.info;
var debug_13 = debug_1.assert;
var deprecatedFeatures = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.GLOBALS_RESOLVER = exports.PARTIALS = exports.EMBER_COMPONENT_IS_VISIBLE = exports.MOUSE_ENTER_LEAVE_MOVE_EVENTS = exports.FUNCTION_PROTOTYPE_EXTENSIONS = exports.APP_CTRL_ROUTER_PROPS = exports.ALIAS_METHOD = exports.JQUERY_INTEGRATION = exports.COMPONENT_MANAGER_STRING_LOOKUP = exports.ROUTER_EVENTS = exports.MERGE = exports.LOGGER = exports.EMBER_EXTEND_PROTOTYPES = exports.SEND_ACTION = void 0;
  /* eslint-disable no-implicit-coercion */
  // These versions should be the version that the deprecation was _introduced_,
  // not the version that the feature will be removed.

  const SEND_ACTION = !!'3.4.0';
  exports.SEND_ACTION = SEND_ACTION;
  const EMBER_EXTEND_PROTOTYPES = !!'3.2.0-beta.5';
  exports.EMBER_EXTEND_PROTOTYPES = EMBER_EXTEND_PROTOTYPES;
  const LOGGER = !!'3.2.0-beta.1';
  exports.LOGGER = LOGGER;
  const MERGE = !!'3.6.0-beta.1';
  exports.MERGE = MERGE;
  const ROUTER_EVENTS = !!'4.0.0';
  exports.ROUTER_EVENTS = ROUTER_EVENTS;
  const COMPONENT_MANAGER_STRING_LOOKUP = !!'3.8.0';
  exports.COMPONENT_MANAGER_STRING_LOOKUP = COMPONENT_MANAGER_STRING_LOOKUP;
  const JQUERY_INTEGRATION = !!'3.9.0';
  exports.JQUERY_INTEGRATION = JQUERY_INTEGRATION;
  const ALIAS_METHOD = !!'3.9.0';
  exports.ALIAS_METHOD = ALIAS_METHOD;
  const APP_CTRL_ROUTER_PROPS = !!'3.10.0-beta.1';
  exports.APP_CTRL_ROUTER_PROPS = APP_CTRL_ROUTER_PROPS;
  const FUNCTION_PROTOTYPE_EXTENSIONS = !!'3.11.0-beta.1';
  exports.FUNCTION_PROTOTYPE_EXTENSIONS = FUNCTION_PROTOTYPE_EXTENSIONS;
  const MOUSE_ENTER_LEAVE_MOVE_EVENTS = !!'3.13.0-beta.1';
  exports.MOUSE_ENTER_LEAVE_MOVE_EVENTS = MOUSE_ENTER_LEAVE_MOVE_EVENTS;
  const EMBER_COMPONENT_IS_VISIBLE = !!'3.15.0-beta.1';
  exports.EMBER_COMPONENT_IS_VISIBLE = EMBER_COMPONENT_IS_VISIBLE;
  const PARTIALS = !!'3.15.0-beta.1';
  exports.PARTIALS = PARTIALS;
  const GLOBALS_RESOLVER = !!'3.16.0-beta.1';
  exports.GLOBALS_RESOLVER = GLOBALS_RESOLVER;
});
unwrapExports(deprecatedFeatures);
var deprecatedFeatures_1 = deprecatedFeatures.GLOBALS_RESOLVER;
var deprecatedFeatures_2 = deprecatedFeatures.PARTIALS;
var deprecatedFeatures_3 = deprecatedFeatures.EMBER_COMPONENT_IS_VISIBLE;
var deprecatedFeatures_4 = deprecatedFeatures.MOUSE_ENTER_LEAVE_MOVE_EVENTS;
var deprecatedFeatures_5 = deprecatedFeatures.FUNCTION_PROTOTYPE_EXTENSIONS;
var deprecatedFeatures_6 = deprecatedFeatures.APP_CTRL_ROUTER_PROPS;
var deprecatedFeatures_7 = deprecatedFeatures.ALIAS_METHOD;
var deprecatedFeatures_8 = deprecatedFeatures.JQUERY_INTEGRATION;
var deprecatedFeatures_9 = deprecatedFeatures.COMPONENT_MANAGER_STRING_LOOKUP;
var deprecatedFeatures_10 = deprecatedFeatures.ROUTER_EVENTS;
var deprecatedFeatures_11 = deprecatedFeatures.MERGE;
var deprecatedFeatures_12 = deprecatedFeatures.LOGGER;
var deprecatedFeatures_13 = deprecatedFeatures.EMBER_EXTEND_PROTOTYPES;
var deprecatedFeatures_14 = deprecatedFeatures.SEND_ACTION;
var environment = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.getLookup = getLookup;
  exports.setLookup = setLookup;
  exports.getENV = getENV;
  exports.ENV = exports.context = exports.global = void 0; // from lodash to catch fake globals

  function checkGlobal(value) {
    return value && value.Object === Object ? value : undefined;
  } // element ids can ruin global miss checks


  function checkElementIdShadowing(value) {
    return value && value.nodeType === undefined ? value : undefined;
  } // export real global


  var global$1 = checkGlobal(checkElementIdShadowing(typeof commonjsGlobal === 'object' && commonjsGlobal)) || checkGlobal(typeof self === 'object' && self) || checkGlobal(typeof window === 'object' && window) || typeof mainContext !== 'undefined' && mainContext || // set before strict mode in Ember loader/wrapper
  new Function('return this')(); // eval outside of strict mode

  exports.global = global$1;

  const context = function (global, Ember) {
    return Ember === undefined ? {
      imports: global,
      exports: global,
      lookup: global
    } : {
      // import jQuery
      imports: Ember.imports || global,
      // export Ember
      exports: Ember.exports || global,
      // search for Namespaces
      lookup: Ember.lookup || global
    };
  }(global$1, global$1.Ember);

  exports.context = context;

  function getLookup() {
    return context.lookup;
  }

  function setLookup(value) {
    context.lookup = value;
  }
  /**
    The hash of environment variables used to control various configuration
    settings. To specify your own or override default settings, add the
    desired properties to a global hash named `EmberENV` (or `ENV` for
    backwards compatibility with earlier versions of Ember). The `EmberENV`
    hash must be created before loading Ember.
  
    @class EmberENV
    @type Object
    @public
  */


  const ENV = {
    ENABLE_OPTIONAL_FEATURES: false,

    /**
      Determines whether Ember should add to `Array`, `Function`, and `String`
      native object prototypes, a few extra methods in order to provide a more
      friendly API.
         We generally recommend leaving this option set to true however, if you need
      to turn it off, you can add the configuration property
      `EXTEND_PROTOTYPES` to `EmberENV` and set it to `false`.
         Note, when disabled (the default configuration for Ember Addons), you will
      instead have to access all methods and functions from the Ember
      namespace.
         @property EXTEND_PROTOTYPES
      @type Boolean
      @default true
      @for EmberENV
      @public
    */
    EXTEND_PROTOTYPES: {
      Array: true,
      Function: true,
      String: true
    },

    /**
      The `LOG_STACKTRACE_ON_DEPRECATION` property, when true, tells Ember to log
      a full stack trace during deprecation warnings.
         @property LOG_STACKTRACE_ON_DEPRECATION
      @type Boolean
      @default true
      @for EmberENV
      @public
    */
    LOG_STACKTRACE_ON_DEPRECATION: true,

    /**
      The `LOG_VERSION` property, when true, tells Ember to log versions of all
      dependent libraries in use.
         @property LOG_VERSION
      @type Boolean
      @default true
      @for EmberENV
      @public
    */
    LOG_VERSION: true,
    RAISE_ON_DEPRECATION: false,
    STRUCTURED_PROFILE: false,

    /**
      Whether to insert a `<div class="ember-view" />` wrapper around the
      application template. See RFC #280.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _APPLICATION_TEMPLATE_WRAPPER
      @for EmberENV
      @type Boolean
      @default true
      @private
    */
    _APPLICATION_TEMPLATE_WRAPPER: true,

    /**
      Whether to use Glimmer Component semantics (as opposed to the classic "Curly"
      components semantics) for template-only components. See RFC #278.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _TEMPLATE_ONLY_GLIMMER_COMPONENTS
      @for EmberENV
      @type Boolean
      @default false
      @private
    */
    _TEMPLATE_ONLY_GLIMMER_COMPONENTS: false,

    /**
      Whether to perform extra bookkeeping needed to make the `captureRenderTree`
      API work.
         This has to be set before the ember JavaScript code is evaluated. This is
      usually done by setting `window.EmberENV = { _DEBUG_RENDER_TREE: true };`
      or `window.ENV = { _DEBUG_RENDER_TREE: true };` before the "vendor"
      `<script>` tag in `index.html`.
         Setting the flag after Ember is already loaded will not work correctly. It
      may appear to work somewhat, but fundamentally broken.
         This is not intended to be set directly. Ember Inspector will enable the
      flag on behalf of the user as needed.
         This flag is always on in development mode.
         The flag is off by default in production mode, due to the cost associated
      with the the bookkeeping work.
         The expected flow is that Ember Inspector will ask the user to refresh the
      page after enabling the feature. It could also offer a feature where the
      user add some domains to the "always on" list. In either case, Ember
      Inspector will inject the code on the page to set the flag if needed.
         @property _DEBUG_RENDER_TREE
      @for EmberENV
      @type Boolean
      @default false
      @private
    */
    _DEBUG_RENDER_TREE: es5.DEBUG,

    /**
      Whether the app is using jQuery. See RFC #294.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _JQUERY_INTEGRATION
      @for EmberENV
      @type Boolean
      @default true
      @private
    */
    _JQUERY_INTEGRATION: true,

    /**
      Whether the app defaults to using async observers.
         This is not intended to be set directly, as the implementation may change in
      the future. Use `@ember/optional-features` instead.
         @property _DEFAULT_ASYNC_OBSERVERS
      @for EmberENV
      @type Boolean
      @default false
      @private
    */
    _DEFAULT_ASYNC_OBSERVERS: false,

    /**
      Controls the maximum number of scheduled rerenders without "settling". In general,
      applications should not need to modify this environment variable, but please
      open an issue so that we can determine if a better default value is needed.
         @property _RERENDER_LOOP_LIMIT
      @for EmberENV
      @type number
      @default 1000
      @private
     */
    _RERENDER_LOOP_LIMIT: 1000,
    EMBER_LOAD_HOOKS: {},
    FEATURES: {}
  };
  exports.ENV = ENV;
  let providedEnv = global$1.EmberENV;

  if (providedEnv === undefined) {
    providedEnv = global$1.ENV;
    (0, debug_1.deprecate)("Configuring Ember's boot options via `window.ENV` is deprecated, please migrate to `window.EmberENV` instead.", providedEnv === undefined, {
      id: 'ember-environment.window.env',
      until: '3.17.0'
    });
  }

  (EmberENV => {
    if (typeof EmberENV !== 'object' || EmberENV === null) return;

    for (let flag in EmberENV) {
      if (!EmberENV.hasOwnProperty(flag) || flag === 'EXTEND_PROTOTYPES' || flag === 'EMBER_LOAD_HOOKS') continue;
      let defaultValue = ENV[flag];

      if (defaultValue === true) {
        ENV[flag] = EmberENV[flag] !== false;
      } else if (defaultValue === false) {
        ENV[flag] = EmberENV[flag] === true;
      }
    }

    let {
      EXTEND_PROTOTYPES
    } = EmberENV;

    if (EXTEND_PROTOTYPES !== undefined) {
      if (typeof EXTEND_PROTOTYPES === 'object' && EXTEND_PROTOTYPES !== null) {
        ENV.EXTEND_PROTOTYPES.String = EXTEND_PROTOTYPES.String !== false;

        if (deprecatedFeatures.FUNCTION_PROTOTYPE_EXTENSIONS) {
          ENV.EXTEND_PROTOTYPES.Function = EXTEND_PROTOTYPES.Function !== false;
        }

        ENV.EXTEND_PROTOTYPES.Array = EXTEND_PROTOTYPES.Array !== false;
      } else {
        let isEnabled = EXTEND_PROTOTYPES !== false;
        ENV.EXTEND_PROTOTYPES.String = isEnabled;

        if (deprecatedFeatures.FUNCTION_PROTOTYPE_EXTENSIONS) {
          ENV.EXTEND_PROTOTYPES.Function = isEnabled;
        }

        ENV.EXTEND_PROTOTYPES.Array = isEnabled;
      }
    } // TODO this does not seem to be used by anything,
    //      can we remove it? do we need to deprecate it?


    let {
      EMBER_LOAD_HOOKS
    } = EmberENV;

    if (typeof EMBER_LOAD_HOOKS === 'object' && EMBER_LOAD_HOOKS !== null) {
      for (let hookName in EMBER_LOAD_HOOKS) {
        if (!EMBER_LOAD_HOOKS.hasOwnProperty(hookName)) continue;
        let hooks = EMBER_LOAD_HOOKS[hookName];

        if (Array.isArray(hooks)) {
          ENV.EMBER_LOAD_HOOKS[hookName] = hooks.filter(hook => typeof hook === 'function');
        }
      }
    }

    let {
      FEATURES
    } = EmberENV;

    if (typeof FEATURES === 'object' && FEATURES !== null) {
      for (let feature in FEATURES) {
        if (!FEATURES.hasOwnProperty(feature)) continue;
        ENV.FEATURES[feature] = FEATURES[feature] === true;
      }
    }

    if (es5.DEBUG) {
      ENV._DEBUG_RENDER_TREE = true;
    }
  })(providedEnv);

  function getENV() {
    return ENV;
  }
});
unwrapExports(environment);
var environment_1 = environment.getLookup;
var environment_2 = environment.setLookup;
var environment_3 = environment.getENV;
var environment_4 = environment.ENV;
var environment_5 = environment.context;
var environment_6 = environment.global;
var merge_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = merge;
  /**
    Merge the contents of two objects together into the first object.
  
    ```javascript
    import { merge } from '@ember/polyfills';
  
    merge({ first: 'Tom' }, { last: 'Dale' }); // { first: 'Tom', last: 'Dale' }
    var a = { first: 'Yehuda' };
    var b = { last: 'Katz' };
    merge(a, b); // a == { first: 'Yehuda', last: 'Katz' }, b == { last: 'Katz' }
    ```
  
    @method merge
    @static
    @for @ember/polyfills
    @param {Object} original The object to merge into
    @param {Object} updates The object to copy properties from
    @return {Object}
    @deprecated
    @public
  */

  function merge(original, updates) {
    (0, debug_1.deprecate)('Use of `merge` has been deprecated. Please use `assign` instead.', false, {
      id: 'ember-polyfills.deprecate-merge',
      until: '4.0.0',
      url: 'https://emberjs.com/deprecations/v3.x/#toc_ember-polyfills-deprecate-merge'
    });

    if (updates === null || typeof updates !== 'object') {
      return original;
    }

    let props = Object.keys(updates);
    let prop;

    for (let i = 0; i < props.length; i++) {
      prop = props[i];
      original[prop] = updates[prop];
    }

    return original;
  }
});
unwrapExports(merge_1);
var assign_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.assign = assign;
  exports.default = void 0;
  /**
   @module @ember/polyfills
  */

  /**
    Copy properties from a source object to a target object. Source arguments remain unchanged.
  
    ```javascript
    import { assign } from '@ember/polyfills';
  
    var a = { first: 'Yehuda' };
    var b = { last: 'Katz' };
    var c = { company: 'Other Company' };
    var d = { company: 'Tilde Inc.' };
    assign(a, b, c, d); // a === { first: 'Yehuda', last: 'Katz', company: 'Tilde Inc.' };
    ```
  
    @method assign
    @for @ember/polyfills
    @param {Object} target The object to assign into
    @param {Object} ...args The objects to copy properties from
    @return {Object}
    @public
    @static
  */

  function assign(target) {
    for (let i = 1; i < arguments.length; i++) {
      let arg = arguments[i];

      if (!arg) {
        continue;
      }

      let updates = Object.keys(arg);

      for (let i = 0; i < updates.length; i++) {
        let prop = updates[i];
        target[prop] = arg[prop];
      }
    }

    return target;
  } // Note: We use the bracket notation so
  //       that the babel plugin does not
  //       transform it.
  // https://www.npmjs.com/package/babel-plugin-transform-object-assign


  const {
    assign: _assign
  } = Object;

  var _default = _assign || assign;

  exports.default = _default;
});
unwrapExports(assign_1);
var assign_2 = assign_1.assign;
var weak_set = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = void 0;
  /* globals WeakSet */

  var _default = typeof WeakSet === 'function' ? WeakSet : class WeakSetPolyFill {
    constructor() {
      this._map = new WeakMap();
    }

    add(val) {
      this._map.set(val, true);

      return this;
    }

    delete(val) {
      return this._map.delete(val);
    }

    has(val) {
      return this._map.has(val);
    }

  };

  exports.default = _default;
});
unwrapExports(weak_set);
var polyfills = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, "assign", {
    enumerable: true,
    get: function () {
      return _assign.default;
    }
  });
  Object.defineProperty(exports, "assignPolyfill", {
    enumerable: true,
    get: function () {
      return _assign.assign;
    }
  });
  Object.defineProperty(exports, "_WeakSet", {
    enumerable: true,
    get: function () {
      return _weak_set.default;
    }
  });
  exports.merge = void 0;

  var _merge = _interopRequireDefault(merge_1);

  var _assign = _interopRequireWildcard(assign_1);

  var _weak_set = _interopRequireDefault(weak_set);

  function _getRequireWildcardCache() {
    if (typeof WeakMap !== "function") return null;
    var cache = new WeakMap();

    _getRequireWildcardCache = function () {
      return cache;
    };

    return cache;
  }

  function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
      return obj;
    }

    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
      return {
        default: obj
      };
    }

    var cache = _getRequireWildcardCache();

    if (cache && cache.has(obj)) {
      return cache.get(obj);
    }

    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;

    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;

        if (desc && (desc.get || desc.set)) {
          Object.defineProperty(newObj, key, desc);
        } else {
          newObj[key] = obj[key];
        }
      }
    }

    newObj.default = obj;

    if (cache) {
      cache.set(obj, newObj);
    }

    return newObj;
  }

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  let merge = deprecatedFeatures.MERGE ? _merge.default : undefined; // Export `assignPolyfill` for testing

  exports.merge = merge;
});
unwrapExports(polyfills);
var polyfills_1 = polyfills.merge;
var utils$1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.symbol = symbol;
  exports.isInternalSymbol = isInternalSymbol;
  exports.dictionary = makeDictionary;
  exports.uuid = uuid;
  exports.generateGuid = generateGuid;
  exports.guidFor = guidFor;
  exports.intern = intern;
  exports.wrap = wrap;
  exports.getObservers = getObservers;
  exports.getListeners = getListeners;
  exports.setObservers = setObservers;
  exports.setListeners = setListeners;
  exports.inspect = inspect;
  exports.lookupDescriptor = lookupDescriptor;
  exports.canInvoke = canInvoke;
  exports.tryInvoke = tryInvoke;
  exports.makeArray = makeArray;
  exports.getName = getName;
  exports.setName = setName;
  exports.toString = toString;
  exports.isObject = isObject;
  exports.isProxy = isProxy;
  exports.setProxy = setProxy;
  exports.isEmberArray = isEmberArray;
  exports.setWithMandatorySetter = exports.teardownMandatorySetter = exports.setupMandatorySetter = exports.EMBER_ARRAY = exports.Cache = exports.HAS_NATIVE_PROXY = exports.HAS_NATIVE_SYMBOL = exports.ROOT = exports.checkHasSuper = exports.GUID_KEY = exports.getOwnPropertyDescriptors = exports.getDebugName = void 0;
  /**
    Strongly hint runtimes to intern the provided string.
  
    When do I need to use this function?
  
    For the most part, never. Pre-mature optimization is bad, and often the
    runtime does exactly what you need it to, and more often the trade-off isn't
    worth it.
  
    Why?
  
    Runtimes store strings in at least 2 different representations:
    Ropes and Symbols (interned strings). The Rope provides a memory efficient
    data-structure for strings created from concatenation or some other string
    manipulation like splitting.
  
    Unfortunately checking equality of different ropes can be quite costly as
    runtimes must resort to clever string comparison algorithms. These
    algorithms typically cost in proportion to the length of the string.
    Luckily, this is where the Symbols (interned strings) shine. As Symbols are
    unique by their string content, equality checks can be done by pointer
    comparison.
  
    How do I know if my string is a rope or symbol?
  
    Typically (warning general sweeping statement, but truthy in runtimes at
    present) static strings created as part of the JS source are interned.
    Strings often used for comparisons can be interned at runtime if some
    criteria are met.  One of these criteria can be the size of the entire rope.
    For example, in chrome 38 a rope longer then 12 characters will not
    intern, nor will segments of that rope.
  
    Some numbers: http://jsperf.com/eval-vs-keys/8
  
    Known Trick™
  
    @private
    @return {String} interned version of the provided string
  */

  function intern(str) {
    let obj = {};
    obj[str] = 1;

    for (let key in obj) {
      if (key === str) {
        return key;
      }
    }

    return str;
  }
  /**
    Returns whether Type(value) is Object.
  
    Useful for checking whether a value is a valid WeakMap key.
  
    Refs: https://tc39.github.io/ecma262/#sec-typeof-operator-runtime-semantics-evaluation
          https://tc39.github.io/ecma262/#sec-weakmap.prototype.set
  
    @private
    @function isObject
  */


  function isObject(value) {
    return value !== null && (typeof value === 'object' || typeof value === 'function');
  }
  /**
   @module @ember/object
  */

  /**
   Previously we used `Ember.$.uuid`, however `$.uuid` has been removed from
   jQuery master. We'll just bootstrap our own uuid now.
  
   @private
   @return {Number} the uuid
   */


  let _uuid = 0;
  /**
   Generates a universally unique identifier. This method
   is used internally by Ember for assisting with
   the generation of GUID's and other unique identifiers.
  
   @public
   @return {Number} [description]
   */

  function uuid() {
    return ++_uuid;
  }
  /**
   Prefix used for guids through out Ember.
   @private
   @property GUID_PREFIX
   @for Ember
   @type String
   @final
   */


  const GUID_PREFIX = 'ember'; // Used for guid generation...

  const OBJECT_GUIDS = new WeakMap();
  const NON_OBJECT_GUIDS = new Map();
  /**
    A unique key used to assign guids and other private metadata to objects.
    If you inspect an object in your browser debugger you will often see these.
    They can be safely ignored.
  
    On browsers that support it, these properties are added with enumeration
    disabled so they won't show up when you iterate over your properties.
  
    @private
    @property GUID_KEY
    @for Ember
    @type String
    @final
  */

  const GUID_KEY = intern(`__ember${Date.now()}`);
  /**
    Generates a new guid, optionally saving the guid to the object that you
    pass in. You will rarely need to use this method. Instead you should
    call `guidFor(obj)`, which return an existing guid if available.
  
    @private
    @method generateGuid
    @static
    @for @ember/object/internals
    @param {Object} [obj] Object the guid will be used for. If passed in, the guid will
      be saved on the object and reused whenever you pass the same object
      again.
  
      If no object is passed, just generate a new guid.
    @param {String} [prefix] Prefix to place in front of the guid. Useful when you want to
      separate the guid into separate namespaces.
    @return {String} the guid
  */

  exports.GUID_KEY = GUID_KEY;

  function generateGuid(obj, prefix = GUID_PREFIX) {
    let guid = prefix + uuid();

    if (isObject(obj)) {
      OBJECT_GUIDS.set(obj, guid);
    }

    return guid;
  }
  /**
    Returns a unique id for the object. If the object does not yet have a guid,
    one will be assigned to it. You can call this on any object,
    `EmberObject`-based or not.
  
    You can also use this method on DOM Element objects.
  
    @public
    @static
    @method guidFor
    @for @ember/object/internals
    @param {Object} obj any object, string, number, Element, or primitive
    @return {String} the unique guid for this instance.
  */


  function guidFor(value) {
    let guid;

    if (isObject(value)) {
      guid = OBJECT_GUIDS.get(value);

      if (guid === undefined) {
        guid = GUID_PREFIX + uuid();
        OBJECT_GUIDS.set(value, guid);
      }
    } else {
      guid = NON_OBJECT_GUIDS.get(value);

      if (guid === undefined) {
        let type = typeof value;

        if (type === 'string') {
          guid = 'st' + uuid();
        } else if (type === 'number') {
          guid = 'nu' + uuid();
        } else if (type === 'symbol') {
          guid = 'sy' + uuid();
        } else {
          guid = '(' + value + ')';
        }

        NON_OBJECT_GUIDS.set(value, guid);
      }
    }

    return guid;
  }

  const GENERATED_SYMBOLS = [];

  function isInternalSymbol(possibleSymbol) {
    return GENERATED_SYMBOLS.indexOf(possibleSymbol) !== -1;
  }

  function symbol(debugName) {
    // TODO: Investigate using platform symbols, but we do not
    // want to require non-enumerability for this API, which
    // would introduce a large cost.
    let id = GUID_KEY + Math.floor(Math.random() * Date.now());
    let symbol = intern(`__${debugName}${id}__`);
    GENERATED_SYMBOLS.push(symbol);
    return symbol;
  } // the delete is meant to hint at runtimes that this object should remain in
  // dictionary mode. This is clearly a runtime specific hack, but currently it
  // appears worthwhile in some usecases. Please note, these deletes do increase
  // the cost of creation dramatically over a plain Object.create. And as this
  // only makes sense for long-lived dictionaries that aren't instantiated often.


  function makeDictionary(parent) {
    let dict = Object.create(parent);
    dict['_dict'] = null;
    delete dict['_dict'];
    return dict;
  }

  let getDebugName;

  if (es5.DEBUG) {
    let getFunctionName = fn => {
      let functionName = fn.name;

      if (functionName === undefined) {
        let match = Function.prototype.toString.call(fn).match(/function (\w+)\s*\(/);
        functionName = match && match[1] || '';
      }

      return functionName.replace(/^bound /, '');
    };

    let getObjectName = obj => {
      let name;
      let className;

      if (obj.constructor && obj.constructor !== Object) {
        className = getFunctionName(obj.constructor);
      }

      if ('toString' in obj && obj.toString !== Object.prototype.toString && obj.toString !== Function.prototype.toString) {
        name = obj.toString();
      } // If the class has a decent looking name, and the `toString` is one of the
      // default Ember toStrings, replace the constructor portion of the toString
      // with the class name. We check the length of the class name to prevent doing
      // this when the value is minified.


      if (name && name.match(/<.*:ember\d+>/) && className && className[0] !== '_' && className.length > 2 && className !== 'Class') {
        return name.replace(/<.*:/, `<${className}:`);
      }

      return name || className;
    };

    let getPrimitiveName = value => {
      return String(value);
    };

    getDebugName = value => {
      if (typeof value === 'function') {
        return getFunctionName(value) || `(unknown function)`;
      } else if (typeof value === 'object' && value !== null) {
        return getObjectName(value) || `(unknown object)`;
      } else {
        return getPrimitiveName(value);
      }
    };
  }

  var getDebugName$1 = getDebugName;
  exports.getDebugName = getDebugName$1;
  let getOwnPropertyDescriptors;

  if (Object.getOwnPropertyDescriptors !== undefined) {
    getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors;
  } else {
    getOwnPropertyDescriptors = function (obj) {
      let descriptors = {};
      Object.keys(obj).forEach(key => {
        descriptors[key] = Object.getOwnPropertyDescriptor(obj, key);
      });
      return descriptors;
    };
  }

  var getOwnPropertyDescriptors$1 = getOwnPropertyDescriptors;
  exports.getOwnPropertyDescriptors = getOwnPropertyDescriptors$1;
  const HAS_SUPER_PATTERN = /\.(_super|call\(this|apply\(this)/;
  const fnToString = Function.prototype.toString;

  const checkHasSuper = (() => {
    let sourceAvailable = fnToString.call(function () {
      return this;
    }).indexOf('return this') > -1;

    if (sourceAvailable) {
      return function checkHasSuper(func) {
        return HAS_SUPER_PATTERN.test(fnToString.call(func));
      };
    }

    return function checkHasSuper() {
      return true;
    };
  })();

  exports.checkHasSuper = checkHasSuper;
  const HAS_SUPER_MAP = new WeakMap();
  const ROOT = Object.freeze(function () {});
  exports.ROOT = ROOT;
  HAS_SUPER_MAP.set(ROOT, false);

  function hasSuper(func) {
    let hasSuper = HAS_SUPER_MAP.get(func);

    if (hasSuper === undefined) {
      hasSuper = checkHasSuper(func);
      HAS_SUPER_MAP.set(func, hasSuper);
    }

    return hasSuper;
  }

  const OBSERVERS_MAP = new WeakMap();

  function setObservers(func, observers) {
    OBSERVERS_MAP.set(func, observers);
  }

  function getObservers(func) {
    return OBSERVERS_MAP.get(func);
  }

  const LISTENERS_MAP = new WeakMap();

  function setListeners(func, listeners) {
    if (listeners) {
      LISTENERS_MAP.set(func, listeners);
    }
  }

  function getListeners(func) {
    return LISTENERS_MAP.get(func);
  }

  const IS_WRAPPED_FUNCTION_SET = new polyfills._WeakSet();
  /**
    Wraps the passed function so that `this._super` will point to the superFunc
    when the function is invoked. This is the primitive we use to implement
    calls to super.
  
    @private
    @method wrap
    @for Ember
    @param {Function} func The function to call
    @param {Function} superFunc The super function.
    @return {Function} wrapped function.
  */

  function wrap(func, superFunc) {
    if (!hasSuper(func)) {
      return func;
    } // ensure an unwrapped super that calls _super is wrapped with a terminal _super


    if (!IS_WRAPPED_FUNCTION_SET.has(superFunc) && hasSuper(superFunc)) {
      return _wrap(func, _wrap(superFunc, ROOT));
    }

    return _wrap(func, superFunc);
  }

  function _wrap(func, superFunc) {
    function superWrapper() {
      let orig = this._super;
      this._super = superFunc;
      let ret = func.apply(this, arguments);
      this._super = orig;
      return ret;
    }

    IS_WRAPPED_FUNCTION_SET.add(superWrapper);
    setObservers(superWrapper, getObservers(func));
    setListeners(superWrapper, getListeners(func));
    return superWrapper;
  }

  const {
    toString: objectToString
  } = Object.prototype;
  const {
    toString: functionToString
  } = Function.prototype;
  const {
    isArray
  } = Array;
  const {
    keys: objectKeys
  } = Object;
  const {
    stringify
  } = JSON;
  const LIST_LIMIT = 100;
  const DEPTH_LIMIT = 4;
  const SAFE_KEY = /^[\w$]+$/;
  /**
   @module @ember/debug
  */

  /**
    Convenience method to inspect an object. This method will attempt to
    convert the object into a useful string description.
  
    It is a pretty simple implementation. If you want something more robust,
    use something like JSDump: https://github.com/NV/jsDump
  
    @method inspect
    @static
    @param {Object} obj The object you want to inspect.
    @return {String} A description of the object
    @since 1.4.0
    @private
  */

  function inspect(obj) {
    // detect Node util.inspect call inspect(depth: number, opts: object)
    if (typeof obj === 'number' && arguments.length === 2) {
      return this;
    }

    return inspectValue(obj, 0);
  }

  function inspectValue(value, depth, seen) {
    let valueIsArray = false;

    switch (typeof value) {
      case 'undefined':
        return 'undefined';

      case 'object':
        if (value === null) return 'null';

        if (isArray(value)) {
          valueIsArray = true;
          break;
        } // is toString Object.prototype.toString or undefined then traverse


        if (value.toString === objectToString || value.toString === undefined) {
          break;
        } // custom toString


        return value.toString();

      case 'function':
        return value.toString === functionToString ? value.name ? `[Function:${value.name}]` : `[Function]` : value.toString();

      case 'string':
        return stringify(value);

      case 'symbol':
      case 'boolean':
      case 'number':
      default:
        return value.toString();
    }

    if (seen === undefined) {
      seen = new polyfills._WeakSet();
    } else {
      if (seen.has(value)) return `[Circular]`;
    }

    seen.add(value);
    return valueIsArray ? inspectArray(value, depth + 1, seen) : inspectObject(value, depth + 1, seen);
  }

  function inspectKey(key) {
    return SAFE_KEY.test(key) ? key : stringify(key);
  }

  function inspectObject(obj, depth, seen) {
    if (depth > DEPTH_LIMIT) {
      return '[Object]';
    }

    let s = '{';
    let keys = objectKeys(obj);

    for (let i = 0; i < keys.length; i++) {
      s += i === 0 ? ' ' : ', ';

      if (i >= LIST_LIMIT) {
        s += `... ${keys.length - LIST_LIMIT} more keys`;
        break;
      }

      let key = keys[i];
      s += inspectKey(key) + ': ' + inspectValue(obj[key], depth, seen);
    }

    s += ' }';
    return s;
  }

  function inspectArray(arr, depth, seen) {
    if (depth > DEPTH_LIMIT) {
      return '[Array]';
    }

    let s = '[';

    for (let i = 0; i < arr.length; i++) {
      s += i === 0 ? ' ' : ', ';

      if (i >= LIST_LIMIT) {
        s += `... ${arr.length - LIST_LIMIT} more items`;
        break;
      }

      s += inspectValue(arr[i], depth, seen);
    }

    s += ' ]';
    return s;
  }

  function lookupDescriptor(obj, keyName) {
    let current = obj;

    do {
      let descriptor = Object.getOwnPropertyDescriptor(current, keyName);

      if (descriptor !== undefined) {
        return descriptor;
      }

      current = Object.getPrototypeOf(current);
    } while (current !== null);

    return null;
  }
  /**
    Checks to see if the `methodName` exists on the `obj`.
  
    ```javascript
    let foo = { bar: function() { return 'bar'; }, baz: null };
  
    Ember.canInvoke(foo, 'bar'); // true
    Ember.canInvoke(foo, 'baz'); // false
    Ember.canInvoke(foo, 'bat'); // false
    ```
  
    @method canInvoke
    @for Ember
    @param {Object} obj The object to check for the method
    @param {String} methodName The method name to check for
    @return {Boolean}
    @private
  */


  function canInvoke(obj, methodName) {
    return obj !== null && obj !== undefined && typeof obj[methodName] === 'function';
  }
  /**
    @module @ember/utils
  */

  /**
    Checks to see if the `methodName` exists on the `obj`,
    and if it does, invokes it with the arguments passed.
  
    ```javascript
    import { tryInvoke } from '@ember/utils';
  
    let d = new Date('03/15/2013');
  
    tryInvoke(d, 'getTime');              // 1363320000000
    tryInvoke(d, 'setFullYear', [2014]);  // 1394856000000
    tryInvoke(d, 'noSuchMethod', [2014]); // undefined
    ```
  
    @method tryInvoke
    @for @ember/utils
    @static
    @param {Object} obj The object to check for the method
    @param {String} methodName The method name to check for
    @param {Array} [args] The arguments to pass to the method
    @return {*} the return value of the invoked method or undefined if it cannot be invoked
    @public
  */


  function tryInvoke(obj, methodName, args) {
    if (canInvoke(obj, methodName)) {
      let method = obj[methodName];
      return method.apply(obj, args);
    }
  }

  const {
    isArray: isArray$1
  } = Array;

  function makeArray(obj) {
    if (obj === null || obj === undefined) {
      return [];
    }

    return isArray$1(obj) ? obj : [obj];
  }

  const NAMES = new WeakMap();

  function setName(obj, name) {
    if (isObject(obj)) NAMES.set(obj, name);
  }

  function getName(obj) {
    return NAMES.get(obj);
  }

  const objectToString$1 = Object.prototype.toString;

  function isNone(obj) {
    return obj === null || obj === undefined;
  }
  /*
   A `toString` util function that supports objects without a `toString`
   method, e.g. an object created with `Object.create(null)`.
  */


  function toString(obj) {
    if (typeof obj === 'string') {
      return obj;
    }

    if (null === obj) return 'null';
    if (undefined === obj) return 'undefined';

    if (Array.isArray(obj)) {
      // Reimplement Array.prototype.join according to spec (22.1.3.13)
      // Changing ToString(element) with this safe version of ToString.
      let r = '';

      for (let k = 0; k < obj.length; k++) {
        if (k > 0) {
          r += ',';
        }

        if (!isNone(obj[k])) {
          r += toString(obj[k]);
        }
      }

      return r;
    }

    if (typeof obj.toString === 'function') {
      return obj.toString();
    }

    return objectToString$1.call(obj);
  }

  const HAS_NATIVE_SYMBOL = function () {
    if (typeof Symbol !== 'function') {
      return false;
    }

    return typeof Symbol() === 'symbol';
  }();

  exports.HAS_NATIVE_SYMBOL = HAS_NATIVE_SYMBOL;
  const HAS_NATIVE_PROXY = typeof Proxy === 'function';
  exports.HAS_NATIVE_PROXY = HAS_NATIVE_PROXY;
  const PROXIES = new polyfills._WeakSet();

  function isProxy(value) {
    if (isObject(value)) {
      return PROXIES.has(value);
    }

    return false;
  }

  function setProxy(object) {
    if (isObject(object)) {
      PROXIES.add(object);
    }
  }

  class Cache {
    constructor(limit, func, store) {
      this.limit = limit;
      this.func = func;
      this.store = store;
      this.size = 0;
      this.misses = 0;
      this.hits = 0;
      this.store = store || new Map();
    }

    get(key) {
      if (this.store.has(key)) {
        this.hits++;
        return this.store.get(key);
      } else {
        this.misses++;
        return this.set(key, this.func(key));
      }
    }

    set(key, value) {
      if (this.limit > this.size) {
        this.size++;
        this.store.set(key, value);
      }

      return value;
    }

    purge() {
      this.store.clear();
      this.size = 0;
      this.hits = 0;
      this.misses = 0;
    }

  }

  exports.Cache = Cache;
  const EMBER_ARRAY = symbol('EMBER_ARRAY');
  exports.EMBER_ARRAY = EMBER_ARRAY;

  function isEmberArray(obj) {
    return obj && obj[EMBER_ARRAY];
  }

  let setupMandatorySetter;
  exports.setupMandatorySetter = setupMandatorySetter;
  let teardownMandatorySetter;
  exports.teardownMandatorySetter = teardownMandatorySetter;
  let setWithMandatorySetter;
  exports.setWithMandatorySetter = setWithMandatorySetter;

  function isElementKey(key) {
    return typeof key === 'number' ? isPositiveInt(key) : isStringInt(key);
  }

  function isStringInt(str) {
    let num = parseInt(str, 10);
    return isPositiveInt(num) && str === String(num);
  }

  function isPositiveInt(num) {
    return num >= 0 && num % 1 === 0;
  }

  if (es5.DEBUG) {
    let SEEN_TAGS = new polyfills._WeakSet();
    let MANDATORY_SETTERS = new WeakMap();

    let propertyIsEnumerable = function (obj, key) {
      return Object.prototype.propertyIsEnumerable.call(obj, key);
    };

    exports.setupMandatorySetter = setupMandatorySetter = function (tag, obj, keyName) {
      if (SEEN_TAGS.has(tag)) {
        return;
      }

      SEEN_TAGS.add(tag);

      if (Array.isArray(obj) && isElementKey(keyName)) {
        return;
      }

      let desc = lookupDescriptor(obj, keyName) || {};

      if (desc.get || desc.set) {
        // if it has a getter or setter, we can't install the mandatory setter.
        // native setters are allowed, we have to assume that they will resolve
        // to tracked properties.
        return;
      }

      if (desc && (!desc.configurable || !desc.writable)) {
        // if it isn't writable anyways, so we shouldn't provide the setter.
        // if it isn't configurable, we can't overwrite it anyways.
        return;
      }

      let setters = MANDATORY_SETTERS.get(obj);

      if (setters === undefined) {
        setters = {};
        MANDATORY_SETTERS.set(obj, setters);
      }

      desc.hadOwnProperty = Object.hasOwnProperty.call(obj, keyName);
      setters[keyName] = desc;
      Object.defineProperty(obj, keyName, {
        configurable: true,
        enumerable: propertyIsEnumerable(obj, keyName),

        get() {
          if (desc.get) {
            return desc.get.call(this);
          } else {
            return desc.value;
          }
        },

        set(value) {
          (0, debug_1.assert)(`You attempted to update ${this}.${String(keyName)} to "${String(value)}", but it is being tracked by a tracking context, such as a template, computed property, or observer. In order to make sure the context updates properly, you must invalidate the property when updating it. You can mark the property as \`@tracked\`, or use \`@ember/object#set\` to do this.`);
        }

      });
    };

    exports.teardownMandatorySetter = teardownMandatorySetter = function (obj, keyName) {
      let setters = MANDATORY_SETTERS.get(obj);

      if (setters !== undefined && setters[keyName] !== undefined) {
        Object.defineProperty(obj, keyName, setters[keyName]);
        setters[keyName] = undefined;
      }
    };

    exports.setWithMandatorySetter = setWithMandatorySetter = function (obj, keyName, value) {
      let setters = MANDATORY_SETTERS.get(obj);

      if (setters !== undefined && setters[keyName] !== undefined) {
        let setter = setters[keyName];

        if (setter.set) {
          setter.set.call(obj, value);
        } else {
          setter.value = value; // If the object didn't have own property before, it would have changed
          // the enumerability after setting the value the first time.

          if (!setter.hadOwnProperty) {
            let desc = lookupDescriptor(obj, keyName);
            desc.enumerable = true;
            Object.defineProperty(obj, keyName, desc);
          }
        }
      } else {
        obj[keyName] = value;
      }
    };
  }
  /*
   This package will be eagerly parsed and should have no dependencies on external
   packages.
  
   It is intended to be used to share utility methods that will be needed
   by every Ember application (and is **not** a dumping ground of useful utilities).
  
   Utility methods that are needed in < 80% of cases should be placed
   elsewhere (so they can be lazily evaluated / parsed).
  */

});
unwrapExports(utils$1);
var utils_1 = utils$1.symbol;
var utils_2 = utils$1.isInternalSymbol;
var utils_3 = utils$1.dictionary;
var utils_4 = utils$1.uuid;
var utils_5 = utils$1.generateGuid;
var utils_6 = utils$1.guidFor;
var utils_7 = utils$1.intern;
var utils_8 = utils$1.wrap;
var utils_9 = utils$1.getObservers;
var utils_10 = utils$1.getListeners;
var utils_11 = utils$1.setObservers;
var utils_12 = utils$1.setListeners;
var utils_13 = utils$1.inspect;
var utils_14 = utils$1.lookupDescriptor;
var utils_15 = utils$1.canInvoke;
var utils_16 = utils$1.tryInvoke;
var utils_17 = utils$1.makeArray;
var utils_18 = utils$1.getName;
var utils_19 = utils$1.setName;
var utils_20 = utils$1.isObject;
var utils_21 = utils$1.isProxy;
var utils_22 = utils$1.setProxy;
var utils_23 = utils$1.isEmberArray;
var utils_24 = utils$1.setWithMandatorySetter;
var utils_25 = utils$1.teardownMandatorySetter;
var utils_26 = utils$1.setupMandatorySetter;
var utils_27 = utils$1.EMBER_ARRAY;
var utils_28 = utils$1.Cache;
var utils_29 = utils$1.HAS_NATIVE_PROXY;
var utils_30 = utils$1.HAS_NATIVE_SYMBOL;
var utils_31 = utils$1.ROOT;
var utils_32 = utils$1.checkHasSuper;
var utils_33 = utils$1.GUID_KEY;
var utils_34 = utils$1.getOwnPropertyDescriptors;
var utils_35 = utils$1.getDebugName;
var string$1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.loc = loc;
  exports.w = w;
  exports.decamelize = decamelize;
  exports.dasherize = dasherize;
  exports.camelize = camelize;
  exports.classify = classify;
  exports.underscore = underscore;
  exports.capitalize = capitalize;
  Object.defineProperty(exports, "_getStrings", {
    enumerable: true,
    get: function () {
      return string_registry.getStrings;
    }
  });
  Object.defineProperty(exports, "_setStrings", {
    enumerable: true,
    get: function () {
      return string_registry.setStrings;
    }
  });
  /**
  @module @ember/string
  */

  const STRING_DASHERIZE_REGEXP = /[ _]/g;
  const STRING_DASHERIZE_CACHE = new utils$1.Cache(1000, key => decamelize(key).replace(STRING_DASHERIZE_REGEXP, '-'));
  const STRING_CAMELIZE_REGEXP_1 = /(\-|\_|\.|\s)+(.)?/g;
  const STRING_CAMELIZE_REGEXP_2 = /(^|\/)([A-Z])/g;
  const CAMELIZE_CACHE = new utils$1.Cache(1000, key => key.replace(STRING_CAMELIZE_REGEXP_1, (_match, _separator, chr) => chr ? chr.toUpperCase() : '').replace(STRING_CAMELIZE_REGEXP_2, (match
  /*, separator, chr */
  ) => match.toLowerCase()));
  const STRING_CLASSIFY_REGEXP_1 = /^(\-|_)+(.)?/;
  const STRING_CLASSIFY_REGEXP_2 = /(.)(\-|\_|\.|\s)+(.)?/g;
  const STRING_CLASSIFY_REGEXP_3 = /(^|\/|\.)([a-z])/g;
  const CLASSIFY_CACHE = new utils$1.Cache(1000, str => {
    let replace1 = (_match, _separator, chr) => chr ? `_${chr.toUpperCase()}` : '';

    let replace2 = (_match, initialChar, _separator, chr) => initialChar + (chr ? chr.toUpperCase() : '');

    let parts = str.split('/');

    for (let i = 0; i < parts.length; i++) {
      parts[i] = parts[i].replace(STRING_CLASSIFY_REGEXP_1, replace1).replace(STRING_CLASSIFY_REGEXP_2, replace2);
    }

    return parts.join('/').replace(STRING_CLASSIFY_REGEXP_3, (match
    /*, separator, chr */
    ) => match.toUpperCase());
  });
  const STRING_UNDERSCORE_REGEXP_1 = /([a-z\d])([A-Z]+)/g;
  const STRING_UNDERSCORE_REGEXP_2 = /\-|\s+/g;
  const UNDERSCORE_CACHE = new utils$1.Cache(1000, str => str.replace(STRING_UNDERSCORE_REGEXP_1, '$1_$2').replace(STRING_UNDERSCORE_REGEXP_2, '_').toLowerCase());
  const STRING_CAPITALIZE_REGEXP = /(^|\/)([a-z\u00C0-\u024F])/g;
  const CAPITALIZE_CACHE = new utils$1.Cache(1000, str => str.replace(STRING_CAPITALIZE_REGEXP, (match
  /*, separator, chr */
  ) => match.toUpperCase()));
  const STRING_DECAMELIZE_REGEXP = /([a-z\d])([A-Z])/g;
  const DECAMELIZE_CACHE = new utils$1.Cache(1000, str => str.replace(STRING_DECAMELIZE_REGEXP, '$1_$2').toLowerCase());
  /**
    Defines string helper methods including string formatting and localization.
    Unless `EmberENV.EXTEND_PROTOTYPES.String` is `false` these methods will also be
    added to the `String.prototype` as well.
  
    @class String
    @public
  */

  function _fmt(str, formats) {
    // first, replace any ORDERED replacements.
    let idx = 0; // the current index for non-numerical replacements

    return str.replace(/%@([0-9]+)?/g, (_s, argIndex) => {
      let i = argIndex ? parseInt(argIndex, 10) - 1 : idx++;
      let r = i < formats.length ? formats[i] : undefined;
      return typeof r === 'string' ? r : r === null ? '(null)' : r === undefined ? '' : String(r);
    });
  }
  /**
    Formats the passed string, but first looks up the string in the localized
    strings hash. This is a convenient way to localize text.
  
    Note that it is traditional but not required to prefix localized string
    keys with an underscore or other character so you can easily identify
    localized strings.
  
    ```javascript
    import { loc } from '@ember/string';
  
    Ember.STRINGS = {
      '_Hello World': 'Bonjour le monde',
      '_Hello %@ %@': 'Bonjour %@ %@'
    };
  
    loc("_Hello World");  // 'Bonjour le monde';
    loc("_Hello %@ %@", ["John", "Smith"]);  // "Bonjour John Smith";
    ```
  
    @method loc
    @param {String} str The string to format
    @param {Array} formats Optional array of parameters to interpolate into string.
    @return {String} formatted string
    @public
  */


  function loc(str, formats) {
    if (!Array.isArray(formats) || arguments.length > 2) {
      formats = Array.prototype.slice.call(arguments, 1);
    }

    str = (0, string_registry.getString)(str) || str;
    return _fmt(str, formats);
  }
  /**
    Splits a string into separate units separated by spaces, eliminating any
    empty strings in the process. This is a convenience method for split that
    is mostly useful when applied to the `String.prototype`.
  
    ```javascript
    import { w } from '@ember/string';
  
    w("alpha beta gamma").forEach(function(key) {
      console.log(key);
    });
  
    // > alpha
    // > beta
    // > gamma
    ```
  
    @method w
    @param {String} str The string to split
    @return {Array} array containing the split strings
    @public
  */


  function w(str) {
    return str.split(/\s+/);
  }
  /**
    Converts a camelized string into all lower case separated by underscores.
  
    ```javascript
    import { decamelize } from '@ember/string';
  
    decamelize('innerHTML');          // 'inner_html'
    decamelize('action_name');        // 'action_name'
    decamelize('css-class-name');     // 'css-class-name'
    decamelize('my favorite items');  // 'my favorite items'
    ```
  
    @method decamelize
    @param {String} str The string to decamelize.
    @return {String} the decamelized string.
    @public
  */


  function decamelize(str) {
    return DECAMELIZE_CACHE.get(str);
  }
  /**
    Replaces underscores, spaces, or camelCase with dashes.
  
    ```javascript
    import { dasherize } from '@ember/string';
  
    dasherize('innerHTML');                // 'inner-html'
    dasherize('action_name');              // 'action-name'
    dasherize('css-class-name');           // 'css-class-name'
    dasherize('my favorite items');        // 'my-favorite-items'
    dasherize('privateDocs/ownerInvoice';  // 'private-docs/owner-invoice'
    ```
  
    @method dasherize
    @param {String} str The string to dasherize.
    @return {String} the dasherized string.
    @public
  */


  function dasherize(str) {
    return STRING_DASHERIZE_CACHE.get(str);
  }
  /**
    Returns the lowerCamelCase form of a string.
  
    ```javascript
    import { camelize } from '@ember/string';
  
    camelize('innerHTML');                   // 'innerHTML'
    camelize('action_name');                 // 'actionName'
    camelize('css-class-name');              // 'cssClassName'
    camelize('my favorite items');           // 'myFavoriteItems'
    camelize('My Favorite Items');           // 'myFavoriteItems'
    camelize('private-docs/owner-invoice');  // 'privateDocs/ownerInvoice'
    ```
  
    @method camelize
    @param {String} str The string to camelize.
    @return {String} the camelized string.
    @public
  */


  function camelize(str) {
    return CAMELIZE_CACHE.get(str);
  }
  /**
    Returns the UpperCamelCase form of a string.
  
    ```javascript
    import { classify } from '@ember/string';
  
    classify('innerHTML');                   // 'InnerHTML'
    classify('action_name');                 // 'ActionName'
    classify('css-class-name');              // 'CssClassName'
    classify('my favorite items');           // 'MyFavoriteItems'
    classify('private-docs/owner-invoice');  // 'PrivateDocs/OwnerInvoice'
    ```
  
    @method classify
    @param {String} str the string to classify
    @return {String} the classified string
    @public
  */


  function classify(str) {
    return CLASSIFY_CACHE.get(str);
  }
  /**
    More general than decamelize. Returns the lower\_case\_and\_underscored
    form of a string.
  
    ```javascript
    import { underscore } from '@ember/string';
  
    underscore('innerHTML');                 // 'inner_html'
    underscore('action_name');               // 'action_name'
    underscore('css-class-name');            // 'css_class_name'
    underscore('my favorite items');         // 'my_favorite_items'
    underscore('privateDocs/ownerInvoice');  // 'private_docs/owner_invoice'
    ```
  
    @method underscore
    @param {String} str The string to underscore.
    @return {String} the underscored string.
    @public
  */


  function underscore(str) {
    return UNDERSCORE_CACHE.get(str);
  }
  /**
    Returns the Capitalized form of a string
  
    ```javascript
    import { capitalize } from '@ember/string';
  
    capitalize('innerHTML')                 // 'InnerHTML'
    capitalize('action_name')               // 'Action_name'
    capitalize('css-class-name')            // 'Css-class-name'
    capitalize('my favorite items')         // 'My favorite items'
    capitalize('privateDocs/ownerInvoice'); // 'PrivateDocs/ownerInvoice'
    ```
  
    @method capitalize
    @param {String} str The string to capitalize.
    @return {String} The capitalized string.
    @public
  */


  function capitalize(str) {
    return CAPITALIZE_CACHE.get(str);
  }

  if (environment.ENV.EXTEND_PROTOTYPES.String) {
    Object.defineProperties(String.prototype, {
      /**
        See [String.w](/ember/release/classes/String/methods/w?anchor=w).
             @method w
        @for @ember/string
        @static
        @private
      */
      w: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return w(this);
        }

      },

      /**
        See [String.loc](/ember/release/classes/String/methods/loc?anchor=loc).
             @method loc
        @for @ember/string
        @static
        @private
      */
      loc: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value(...args) {
          return loc(this, args);
        }

      },

      /**
        See [String.camelize](/ember/release/classes/String/methods/camelize?anchor=camelize).
             @method camelize
        @for @ember/string
        @static
        @private
      */
      camelize: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return camelize(this);
        }

      },

      /**
        See [String.decamelize](/ember/release/classes/String/methods/decamelize?anchor=decamelize).
             @method decamelize
        @for @ember/string
        @static
        @private
      */
      decamelize: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return decamelize(this);
        }

      },

      /**
        See [String.dasherize](/ember/release/classes/String/methods/dasherize?anchor=dasherize).
             @method dasherize
        @for @ember/string
        @static
        @private
      */
      dasherize: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return dasherize(this);
        }

      },

      /**
        See [String.underscore](/ember/release/classes/String/methods/underscore?anchor=underscore).
             @method underscore
        @for @ember/string
        @static
        @private
      */
      underscore: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return underscore(this);
        }

      },

      /**
        See [String.classify](/ember/release/classes/String/methods/classify?anchor=classify).
             @method classify
        @for @ember/string
        @static
        @private
      */
      classify: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return classify(this);
        }

      },

      /**
        See [String.capitalize](/ember/release/classes/String/methods/capitalize?anchor=capitalize).
             @method capitalize
        @for @ember/string
        @static
        @private
      */
      capitalize: {
        configurable: true,
        enumerable: false,
        writeable: true,

        value() {
          return capitalize(this);
        }

      }
    });
  }
});
unwrapExports(string$1);
var string_1$1 = string$1.loc;
var string_2 = string$1.w;
var string_3 = string$1.decamelize;
var string_4 = string$1.dasherize;
var string_5 = string$1.camelize;
var string_6 = string$1.classify;
var string_7 = string$1.underscore;
var string_8 = string$1.capitalize;
var inflections = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = void 0;
  var _default = {
    plurals: [[/$/, "s"], [/s$/i, "s"], [/^(ax|test)is$/i, "$1es"], [/(octop|vir)us$/i, "$1i"], [/(octop|vir)i$/i, "$1i"], [/(alias|status|bonus)$/i, "$1es"], [/(bu)s$/i, "$1ses"], [/(buffal|tomat)o$/i, "$1oes"], [/([ti])um$/i, "$1a"], [/([ti])a$/i, "$1a"], [/sis$/i, "ses"], [/(?:([^f])fe|([lr])f)$/i, "$1$2ves"], [/(hive)$/i, "$1s"], [/([^aeiouy]|qu)y$/i, "$1ies"], [/(x|ch|ss|sh)$/i, "$1es"], [/(matr|vert|ind)(?:ix|ex)$/i, "$1ices"], [/^(m|l)ouse$/i, "$1ice"], [/^(m|l)ice$/i, "$1ice"], [/^(ox)$/i, "$1en"], [/^(oxen)$/i, "$1"], [/(quiz)$/i, "$1zes"]],
    singular: [[/s$/i, ""], [/(ss)$/i, "$1"], [/(n)ews$/i, "$1ews"], [/([ti])a$/i, "$1um"], [/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)(sis|ses)$/i, "$1sis"], [/(^analy)(sis|ses)$/i, "$1sis"], [/([^f])ves$/i, "$1fe"], [/(hive)s$/i, "$1"], [/(tive)s$/i, "$1"], [/([lr])ves$/i, "$1f"], [/([^aeiouy]|qu)ies$/i, "$1y"], [/(s)eries$/i, "$1eries"], [/(m)ovies$/i, "$1ovie"], [/(x|ch|ss|sh)es$/i, "$1"], [/^(m|l)ice$/i, "$1ouse"], [/(bus)(es)?$/i, "$1"], [/(o)es$/i, "$1"], [/(shoe)s$/i, "$1"], [/(cris|test)(is|es)$/i, "$1is"], [/^(a)x[ie]s$/i, "$1xis"], [/(octop|vir)(us|i)$/i, "$1us"], [/(alias|status|bonus)(es)?$/i, "$1"], [/^(ox)en/i, "$1"], [/(vert|ind)ices$/i, "$1ex"], [/(matr)ices$/i, "$1ix"], [/(quiz)zes$/i, "$1"], [/(database)s$/i, "$1"]],
    irregularPairs: [["person", "people"], ["man", "men"], ["child", "children"], ["sex", "sexes"], ["move", "moves"], ["cow", "kine"], ["zombie", "zombies"]],
    uncountable: ["equipment", "information", "rice", "money", "species", "series", "fish", "sheep", "jeans", "police"]
  };
  exports.default = _default;
});
unwrapExports(inflections);
var inflector = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.default = void 0;

  var _inflections = _interopRequireDefault(inflections);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  const BLANK_REGEX = /^\s*$/;
  const LAST_WORD_DASHED_REGEX = /([\w/-]+[_/\s-])([a-z\d]+$)/;
  const LAST_WORD_CAMELIZED_REGEX = /([\w/\s-]+)([A-Z][a-z\d]*$)/;
  const CAMELIZED_REGEX = /[A-Z][a-z\d]*$/;

  function loadUncountable(rules, uncountable) {
    for (let i = 0, length = uncountable.length; i < length; i++) {
      rules.uncountable[uncountable[i].toLowerCase()] = true;
    }
  }

  function loadIrregular(rules, irregularPairs) {
    let pair;

    for (let i = 0, length = irregularPairs.length; i < length; i++) {
      pair = irregularPairs[i]; //pluralizing

      rules.irregular[pair[0].toLowerCase()] = pair[1];
      rules.irregular[pair[1].toLowerCase()] = pair[1]; //singularizing

      rules.irregularInverse[pair[1].toLowerCase()] = pair[0];
      rules.irregularInverse[pair[0].toLowerCase()] = pair[0];
    }
  }
  /**
    Inflector.Ember provides a mechanism for supplying inflection rules for your
    application. Ember includes a default set of inflection rules, and provides an
    API for providing additional rules.
  
    Examples:
  
    Creating an inflector with no rules.
  
    ```js
    var inflector = new Ember.Inflector();
    ```
  
    Creating an inflector with the default ember ruleset.
  
    ```js
    var inflector = new Ember.Inflector(Ember.Inflector.defaultRules);
  
    inflector.pluralize('cow'); //=> 'kine'
    inflector.singularize('kine'); //=> 'cow'
    ```
  
    Creating an inflector and adding rules later.
  
    ```javascript
    var inflector = Ember.Inflector.inflector;
  
    inflector.pluralize('advice'); // => 'advices'
    inflector.uncountable('advice');
    inflector.pluralize('advice'); // => 'advice'
  
    inflector.pluralize('formula'); // => 'formulas'
    inflector.irregular('formula', 'formulae');
    inflector.pluralize('formula'); // => 'formulae'
  
    // you would not need to add these as they are the default rules
    inflector.plural(/$/, 's');
    inflector.singular(/s$/i, '');
    ```
  
    Creating an inflector with a nondefault ruleset.
  
    ```javascript
    var rules = {
      plurals:  [
        [ /$/, 's' ]
      ],
      singular: [
        [ /\s$/, '' ]
      ],
      irregularPairs: [
        [ 'cow', 'kine' ]
      ],
      uncountable: [ 'fish' ]
    };
  
    var inflector = new Ember.Inflector(rules);
    ```
  
    @class Inflector
    @namespace Ember
  */


  function Inflector(ruleSet) {
    ruleSet = ruleSet || {};
    ruleSet.uncountable = ruleSet.uncountable || makeDictionary();
    ruleSet.irregularPairs = ruleSet.irregularPairs || makeDictionary();
    const rules = this.rules = {
      plurals: ruleSet.plurals || [],
      singular: ruleSet.singular || [],
      irregular: makeDictionary(),
      irregularInverse: makeDictionary(),
      uncountable: makeDictionary()
    };
    loadUncountable(rules, ruleSet.uncountable);
    loadIrregular(rules, ruleSet.irregularPairs);
    this.enableCache();
  }

  if (!Object.create && !Object.create(null).hasOwnProperty) {
    throw new Error("This browser does not support Object.create(null), please polyfil with es5-sham: http://git.io/yBU2rg");
  }

  function makeDictionary() {
    var cache = Object.create(null);
    cache["_dict"] = null;
    delete cache["_dict"];
    return cache;
  }

  Inflector.prototype = {
    /**
      @public
       As inflections can be costly, and commonly the same subset of words are repeatedly
      inflected an optional cache is provided.
       @method enableCache
    */
    enableCache() {
      this.purgeCache();

      this.singularize = function (word) {
        this._cacheUsed = true;
        return this._sCache[word] || (this._sCache[word] = this._singularize(word));
      };

      this.pluralize = function (numberOrWord, word, options = {}) {
        this._cacheUsed = true;
        var cacheKey = [numberOrWord, word, options.withoutCount];
        return this._pCache[cacheKey] || (this._pCache[cacheKey] = this._pluralize(numberOrWord, word, options));
      };
    },

    /**
      @public
       @method purgeCache
    */
    purgeCache() {
      this._cacheUsed = false;
      this._sCache = makeDictionary();
      this._pCache = makeDictionary();
    },

    /**
      @public
      disable caching
       @method disableCache;
    */
    disableCache() {
      this._sCache = null;
      this._pCache = null;

      this.singularize = function (word) {
        return this._singularize(word);
      };

      this.pluralize = function () {
        return this._pluralize(...arguments);
      };
    },

    /**
      @method plural
      @param {RegExp} regex
      @param {String} string
    */
    plural(regex, string) {
      if (this._cacheUsed) {
        this.purgeCache();
      }

      this.rules.plurals.push([regex, string.toLowerCase()]);
    },

    /**
      @method singular
      @param {RegExp} regex
      @param {String} string
    */
    singular(regex, string) {
      if (this._cacheUsed) {
        this.purgeCache();
      }

      this.rules.singular.push([regex, string.toLowerCase()]);
    },

    /**
      @method uncountable
      @param {String} regex
    */
    uncountable(string) {
      if (this._cacheUsed) {
        this.purgeCache();
      }

      loadUncountable(this.rules, [string.toLowerCase()]);
    },

    /**
      @method irregular
      @param {String} singular
      @param {String} plural
    */
    irregular(singular, plural) {
      if (this._cacheUsed) {
        this.purgeCache();
      }

      loadIrregular(this.rules, [[singular, plural]]);
    },

    /**
      @method pluralize
      @param {String} word
    */
    pluralize() {
      return this._pluralize(...arguments);
    },

    _pluralize(wordOrCount, word, options = {}) {
      if (word === undefined) {
        return this.inflect(wordOrCount, this.rules.plurals, this.rules.irregular);
      }

      if (parseFloat(wordOrCount) !== 1) {
        word = this.inflect(word, this.rules.plurals, this.rules.irregular);
      }

      return options.withoutCount ? word : `${wordOrCount} ${word}`;
    },

    /**
      @method singularize
      @param {String} word
    */
    singularize(word) {
      return this._singularize(word);
    },

    _singularize(word) {
      return this.inflect(word, this.rules.singular, this.rules.irregularInverse);
    },

    /**
      @protected
       @method inflect
      @param {String} word
      @param {Object} typeRules
      @param {Object} irregular
    */
    inflect(word, typeRules, irregular) {
      let inflection, substitution, result, lowercase, wordSplit, lastWord, isBlank, isCamelized, rule, isUncountable;
      isBlank = !word || BLANK_REGEX.test(word);
      isCamelized = CAMELIZED_REGEX.test(word);

      if (isBlank) {
        return word;
      }

      lowercase = word.toLowerCase();
      wordSplit = LAST_WORD_DASHED_REGEX.exec(word) || LAST_WORD_CAMELIZED_REGEX.exec(word);

      if (wordSplit) {
        lastWord = wordSplit[2].toLowerCase();
      }

      isUncountable = this.rules.uncountable[lowercase] || this.rules.uncountable[lastWord];

      if (isUncountable) {
        return word;
      }

      for (rule in irregular) {
        if (lowercase.match(rule + "$")) {
          substitution = irregular[rule];

          if (isCamelized && irregular[lastWord]) {
            substitution = (0, string$1.capitalize)(substitution);
            rule = (0, string$1.capitalize)(rule);
          }

          return word.replace(new RegExp(rule, "i"), substitution);
        }
      }

      for (var i = typeRules.length, min = 0; i > min; i--) {
        inflection = typeRules[i - 1];
        rule = inflection[0];

        if (rule.test(word)) {
          break;
        }
      }

      inflection = inflection || [];
      rule = inflection[0];
      substitution = inflection[1];
      result = word.replace(rule, substitution);
      return result;
    }

  };
  Inflector.defaultRules = _inflections.default;
  Inflector.inflector = new Inflector(_inflections.default);
  var _default = Inflector;
  exports.default = _default;
});
unwrapExports(inflector);
var string$2 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  exports.pluralize = pluralize;
  exports.singularize = singularize;

  var _inflector = _interopRequireDefault(inflector);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  function pluralize() {
    return _inflector.default.inflector.pluralize(...arguments);
  }

  function singularize(word) {
    return _inflector.default.inflector.singularize(word);
  }
});
unwrapExports(string$2);
var string_1$2 = string$2.pluralize;
var string_2$1 = string$2.singularize;
var system = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, "Inflector", {
    enumerable: true,
    get: function () {
      return _inflector.default;
    }
  });
  Object.defineProperty(exports, "pluralize", {
    enumerable: true,
    get: function () {
      return string$2.pluralize;
    }
  });
  Object.defineProperty(exports, "singularize", {
    enumerable: true,
    get: function () {
      return string$2.singularize;
    }
  });

  var _inflector = _interopRequireDefault(inflector);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }
});
unwrapExports(system);
var emberInflector = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, "defaultRules", {
    enumerable: true,
    get: function () {
      return system.defaultRules;
    }
  });
  Object.defineProperty(exports, "pluralize", {
    enumerable: true,
    get: function () {
      return system.pluralize;
    }
  });
  Object.defineProperty(exports, "singularize", {
    enumerable: true,
    get: function () {
      return system.singularize;
    }
  });
  exports.default = void 0;
  var _default = system.Inflector;
  exports.default = _default;
});
unwrapExports(emberInflector);
var pretenderHacks = createCommonjsModule(function (module, exports) {
  var __importDefault = commonjsGlobal && commonjsGlobal.__importDefault || function (mod) {
    return mod && mod.__esModule ? mod : {
      "default": mod
    };
  };

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  const qs_1 = __importDefault(lib);

  const ansi_colors_1 = __importDefault(ansiColors);

  const model_1 = __importDefault(require("./model")); // HACK START: Pretender Request Parameter Type Casting Hack: Because types are important.


  window.Pretender.prototype._handlerFor = function (verb, url, request) {
    var registry = this.hosts.forURL(url)[verb];
    var matches = registry.recognize(window.Pretender.parseURL(url).fullpath);
    var match = matches ? matches[0] : null;
    var headers = request.requestHeaders || {};

    if (match) {
      request.headers = headers;
      request.params = Object.keys(match.params).reduce((result, key) => {
        var value = castCorrectType(match.params[key]);
        return Object.assign(result, {
          [key]: value
        });
      }, {});
      request.queryParams = Object.keys(matches.queryParams).reduce((result, key) => {
        var targetValue = castCorrectType(matches.queryParams[key]);
        return Object.assign(result, {
          [key]: targetValue
        });
      }, {});
      var contentHeader = request.headers["Content-Type"] || request.headers["content-type"];

      if (request.requestBody && contentHeader && contentHeader.includes("application/json")) {
        request.params = nilifyStrings(Object.assign(request.params, JSON.parse(request.requestBody)));
      } else {
        request.params = nilifyStrings(Object.assign(request.params, qs_1.default.parse(request.requestBody)));
      }
    }

    return match;
  };

  function castCorrectType(value) {
    if (Array.isArray(value)) {
      return value.map(element => castCorrectType(element));
    } else if (Number(value) && parseInt(value, 10)) {
      return Number(value);
    } else if (value === "false") {
      return false;
    } else if (value === "true") {
      return true;
    }

    return nilifyStrings(value);
  }

  function nilifyStrings(value) {
    if (value !== null && typeof value === "object") {
      return Object.keys(value).reduce((object, key) => {
        return Object.assign(object, {
          [key]: nilifyStrings(value[key])
        });
      }, {});
    } else if (value === "") {
      return null;
    }

    return value;
  } // END: Pretender Request Parameter Type Casting Hack
  // HACK START: Pretender Response Defaults UX Hack: Because Pretender Response types suck UX-wise.


  window.Pretender.prototype.handleRequest = function (request) {
    var pretender = this;
    var verb = request.method.toUpperCase();
    var path = request.url;

    var handler = pretender._handlerFor(verb, path, request);

    var _handleRequest = function (result) {
      var statusCode, headers, body;

      if (Array.isArray(result) && result.length === 3) {
        statusCode = result[0];
        headers = pretender.prepareHeaders(result[1]);
        body = pretender.prepareBody(result[2], headers);
        return pretender.handleResponse(request, async, function () {
          request.respond(statusCode, headers, body);
          pretender.handledRequest(verb, path, request);
        });
      } else if (!result) {
        headers = pretender.prepareHeaders({
          "Content-Type": "application/json"
        });

        if (verb === "DELETE") {
          return pretender.handleResponse(request, async, function () {
            request.respond(204, headers, pretender.prepareBody("{}", headers));
            pretender.handledRequest(verb, path, request);
          });
        }

        return pretender.handleResponse(request, async, function () {
          request.respond(500, headers, pretender.prepareBody(JSON.stringify({
            error: `[Memserver] ${verb} ${path} route handler did not return anything to respond to the request!`
          }), headers));
          pretender.handledRequest(verb, path, request);
        });
      }

      statusCode = getDefaultStatusCode(verb);
      headers = pretender.prepareHeaders({
        "Content-Type": "application/json"
      });
      var targetResult = typeof result === "string" ? result : JSON.stringify(result);
      body = pretender.prepareBody(targetResult, headers);
      return pretender.handleResponse(request, async, function () {
        request.respond(statusCode, headers, body);
        pretender.handledRequest(verb, path, request);
      });
    };

    if (handler) {
      var async = handler.handler.async;
      handler.handler.numberOfCalls++;
      this.handledRequests.push(request);
      var result = handler.handler(request);

      if (result && typeof result.then === "function") {
        // `result` is a promise, resolve it
        result.then(function (resolvedResult) {
          _handleRequest(resolvedResult);
        });
      } else {
        _handleRequest(result);
      }
    } else {
      if (!this.disableUnhandled) {
        this.unhandledRequests.push(request);
        this.unhandledRequest(verb, path, request);
      }
    }
  };

  function getDefaultStatusCode(verb) {
    if (["GET", "PUT", "PATCH"].includes(verb)) {
      return 200;
    } else if (verb === "POST") {
      return 201;
    } else if (verb === "DELETE") {
      return 204;
    }

    return 500;
  } // END: Pretender Response Defaults UX Hack
  // HACK: Pretender REST defaults hack: For better UX


  ["get", "put", "post", "delete"].forEach(verb => {
    window.Pretender.prototype[verb] = function (path, handler, async) {
      const fullPath = (this.urlPrefix || "") + (this.namespace ? "/" + this.namespace : "") + path;
      const MemServerModel = window.MemserverModel || model_1.default;
      const defaultResourceDefinition = MemServerModel.isPrototypeOf(handler) ? handler : null;
      const targetHandler = handler || getDefaultRouteHandler(verb.toUpperCase(), fullPath, this, defaultResourceDefinition);
      const timing = async ? async.timing || this.timing : this.timing;
      return this.register(verb.toUpperCase(), fullPath, targetHandler, timing);
    };
  }); // END: Pretender REST default hack: For better UX

  function getDefaultRouteHandler(verb, path, serverContext, defaultResourceDefinition) {
    const paths = path.split(/\//g);
    const lastPath = paths[paths.length - 1];
    const pluralResourceName = lastPath.includes(":") ? paths[paths.length - 2] : lastPath;
    const resourceName = emberInflector.singularize(pluralResourceName);
    const resourceClassName = string$1.classify(resourceName);
    const ResourceModel = defaultResourceDefinition || model_1.default._modelDefinitions[resourceClassName] || serverContext.Models[resourceClassName];

    if (!ResourceModel) {
      throw new Error(ansi_colors_1.default.red(`[Memserver] ${verb} ${path} route handler cannot be generated automatically: ${string$1.classify(resourceName)} is not on your window.${string$1.classify(resourceName)}, also please check that your route name matches the model reference or create a custom handler function`));
    } else if (verb === "GET") {
      if (lastPath.includes(":")) {
        return request => {
          return {
            [resourceName]: ResourceModel.serializer(ResourceModel.find(request.params.id))
          };
        };
      }

      return () => {
        return {
          [pluralResourceName]: ResourceModel.serializer(ResourceModel.findAll())
        };
      };
    } else if (verb === "POST") {
      return request => {
        const resourceParams = request.params[resourceName];
        return {
          [resourceName]: ResourceModel.serializer(ResourceModel.insert(resourceParams))
        };
      };
    } else if (verb === "PUT") {
      return request => {
        const resourceParams = request.params[resourceName];
        return {
          [resourceName]: ResourceModel.serializer(ResourceModel.update(resourceParams))
        };
      };
    } else if (verb === "DELETE") {
      return request => {
        ResourceModel.delete({
          id: request.params.id
        });
      };
    }
  }
});
unwrapExports(pretenderHacks);
var server = createCommonjsModule(function (module, exports) {
  var __importDefault = commonjsGlobal && commonjsGlobal.__importDefault || function (mod) {
    return mod && mod.__esModule ? mod : {
      "default": mod
    };
  };

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  const ansi_colors_1 = __importDefault(ansiColors);

  const fake_xml_http_request_1 = __importDefault(fake_xml_http_request);

  const model_1 = __importDefault(require("./model"));

  const route_recognizer_1 = __importDefault(routeRecognizer); // NOTE: check this
  // NOTE: check this


  const DEFAULT_PASSTHROUGHS = ["http://localhost:0/chromecheckurl", "http://localhost:30820/socket.io"];

  class Memserver {
    constructor(options = {
      logging: true
    }) {
      this.Models = {};

      const initializer = options.initializer || async function () {};

      const routes = options.routes || function () {};

      const logging = options.hasOwnProperty("logging") ? options.logging : true;
      window.MemserverModel = window.MemserverModel || model_1.default;
      const initializerReturn = initializer();
      this.Models = window.MemserverModel._modelDefinitions;
      window.MemServer = startPretender(routes, Object.assign(options, {
        logging
      }), this.Models);
      window.MemServer.Models = this.Models;
      return window.MemServer;
    }

  }

  exports.default = Memserver;

  function startPretender(routes, options, Models) {
    window.FakeXMLHttpRequest = fake_xml_http_request_1.default;
    window.RouteRecognizer = route_recognizer_1.default;
    window.Pretender.prototype.namespace = options.namespace;
    window.Pretender.prototype.urlPrefix = options.urlPrefix;
    window.Pretender.prototype.timing = options.timing;
    let pretender = new window.Pretender(function () {
      const Memserver = ansi_colors_1.default.cyan("[Memserver]");
      this.Models = Models;

      if (options.logging) {
        this.handledRequest = function (verb, path, request) {
          const method = verb.toUpperCase();
          console.log(Memserver, colorStatusCode(request.status), method, request.url);

          if (["POST", "PUT"].includes(method)) {
            console.log(`${method} REQUEST BODY IS:`, request.params);
          }

          console.log(JSON.parse(request.responseText));
        };

        this.passthroughRequest = function (verb, path, request) {
          console.log(Memserver, ansi_colors_1.default.yellow("[PASSTHROUGH]"), verb, request.url);
        };
      }

      this.unhandledRequest = function (verb, path, request) {
        console.log(Memserver, ansi_colors_1.default.red("[UNHANDLED REQUEST]"), verb, path);
        console.log(ansi_colors_1.default.red("UNHANDLED REQUEST WAS:\n"), request);
        console.log(request);
      };
    }, {
      trackRequests: false
    }); // HACK: Pretender this.passthrough for better UX
    // TODO: this doesnt passthrough full http:// https://

    pretender.passthrough = function (url) {
      const parent = window.Pretender.prototype;
      const verbs = ["get", "post", "put", "delete"];

      if (!url) {
        ["/**", "/", "/*"].forEach(path => {
          verbs.forEach(verb => pretender[verb](path, parent.passthrough));
        });
        return;
      }

      const fullUrl = (this.urlPrefix || "") + (this.namespace ? "/" + this.namespace : "") + url;
      verbs.forEach(verb => pretender[verb](fullUrl, parent.passthrough));
    };

    DEFAULT_PASSTHROUGHS.forEach(url => pretender.passthrough(url)); // END: Pretender this.passthrough for better UX

    routes.apply(pretender, []);
    return pretender;
  }

  function colorStatusCode(statusCode) {
    if (statusCode === 200 || statusCode === 201) {
      return ansi_colors_1.default.green(statusCode);
    } else if (statusCode === 404 || statusCode === 204) {
      return ansi_colors_1.default.cyan(statusCode);
    }

    return ansi_colors_1.default.red(statusCode);
  }
});
var server$1 = unwrapExports(server);
module.exports = server$1;

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./model":4,"_process":6}],6:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[5])(5)
});


          
      return window['_memserver__server'];
    
        }

        define('memserver/server', [], vendorModule);
      })();
    
      