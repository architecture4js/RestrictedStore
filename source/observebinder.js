function ObserveBinder() {
    var store = {};

    function generateKey() {
        var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
        var randomstring = new Array(16);

        for (var x = 0; x < 16; x++) {
            randomstring[x] = chars[Math.floor(Math.random() * chars.length)];
        }
        return randomstring.join('');
    }

    function _observe(model, callback) {
        var key, i, l;
        if (Object.prototype.toString.call(model) === '[object Array]') {
            if (typeof Array.observe === 'function') {
                Array.observe(model, callback);
            } else { // if we don't have correct polyfill
                Object.observe(model, callback);
            }
            for (i = 0, l = model.length; i < l; i += 1) {
                _observe(model[i], callback);
            }
        } else if (typeof model === 'object') {
            Object.observe(model, callback);
            for (key in model) {
                if (model.hasOwnProperty(key)) {
                    _observe(model[key], callback);
                }
            }
        }
    }

    function _unobserve(model, callback) {
        var key, i, l;
        if (Object.prototype.toString.call(model) === '[object Array]') {
            if (typeof Array.observe === 'function') {
                Array.unobserve(model, callback);
            } else { // if we don't have correct polyfill
                Object.unobserve(model, callback);
            }
            for (i = 0, l = model.length; i < l; i += 1) {
                _unobserve(model[i], callback);
            }
        } else if (typeof model === 'object') {
            Object.unobserve(model, callback);
            for (key in model) {
                if (model.hasOwnProperty(key)) {
                    _unobserve(model[key], callback);
                }
            }
        }
    }

    this.observe = function (object, callback, uniqueid) {
        var newCallback = function (changes) {
            changes.forEach(function (change) {
                _unobserve(change.oldValue, store[callback._observableKey]);
                _observe(object[change.name], store[callback._observableKey]);
            });
            callback.apply(this, arguments);
        };

        _observe(object, newCallback);
        callback._observableKey = uniqueid || generateKey();
        store[callback._observableKey] = newCallback;
    };

    this.unobserve = function (object, callback) {
        var newCallback = store[callback._observableKey];
        _unobserve(object, newCallback);

        delete store[callback._observableKey];
        delete callback._observableKey;
    };
}

// it should be singletone in application
exports.ObserveBinder = new ObserveBinder();