function RestrictedStore() {
    var wrapper = this, store = {}, logger = require("./logger").logger,
        ObserveBinder = require("./observebinder").ObserveBinder,
        states = ['valid', 'invalid', 'pending'];

    function _notify(observer, immutable, changes, state) {
        if (typeof observer === 'function') {
            setTimeout(function () {
                observer(immutable, changes, state);
            }, 0);
        }
    }

    function _clone(dest, obj) {
        if (Object.prototype.toString.call(obj) === '[object Array]') {
            for (var i = 0, l = obj.length; i < l; i += 1) {
                var index = dest.indexOf(obj[i]);
                if (index !== -1) {
                    if (Object.prototype.toString.call(obj[i]) === '[object Array]') {
                        dest[index] = _clone(dest[index] || [], obj[i]);
                    } else {
                        dest[index] = _clone(dest[index] || {}, obj[i]);
                    }
                } else {
                    dest.push(obj[i]);
                }
            }
        } else {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (obj[key] === undefined || obj[key] == null || typeof(obj[key]) != 'object') {
                        dest[key] = obj[key];
                    } else {
                        if (Object.prototype.toString.call(obj[key]) === '[object Array]') {
                            dest[key] = _clone(dest[key] || [], obj[key]);
                        } else {
                            dest[key] = _clone(dest[key] || {}, obj[key]);
                        }
                    }
                }
            }
        }
        return dest;
    }

    function _observer(changes, force) {
        var mirror, weak;
        if (this.state !== states[2]) {
            for (var i = 0, l = this.observers.length; i < l; i += 1) {
                mirror = this.observers[i].mirror;
                weak = this.observers[i].weak;
                if (this.state === states[0]){
                    if (typeof mirror === 'object') {
                        if (weak && !force) {
                            mirror = _clone(mirror, this.model);
                            this.observers[i].mirror = mirror;
                        } else {
                            if (Object.prototype.toString.call(mirror) === '[object Array]') {
                                for (var j = 0, k = this.model.length; j < k; j += 1) {
                                    mirror[i] = JSON.parse(JSON.stringify(this.model[i]));
                                }
                                mirror.length = this.mirror.length;
                            } else {
                                for (var key in this.model) {
                                    if (this.model.hasOwnProperty(key)) {
                                        mirror[key] = JSON.parse(JSON.stringify(this.model[key]));
                                    }
                                }
                                for (key in mirror) {
                                    if (!this.model.hasOwnProperty(key)) {
                                        delete mirror[key];
                                    }
                                }
                            }
                        }
                    } else {
                        mirror = JSON.parse(JSON.stringify(this.model));
                    }
                }

                // divide flow
                _notify(this.observers[i].observer, mirror, changes, this.state);
                this.dirty = false;
            }
        } else {
            this.dirty = true;
        }
    }

    wrapper.wrap = function (modelID, model, options) {
        var helper;
        if (modelID in store) {
            logger.error('Store.wrap: ID taken already : ' + modelID);
            return this;
        }

        try {
            JSON.stringify(model);
        } catch (e) {
            logger.error("Store.wrap: model has invalid type : " + modelID);
            return this;
        }

        // attach observer
        helper = {
            dirty: false,
            modelID: modelID,
            model: model,
            observers: [],
            state: (options && options.state) ? options.state : states[0]
        };
        helper.observer = _observer.bind(helper);
        ObserveBinder.observe(model, helper.observer);

        // register in store under modelID
        store[modelID] = helper;

        return this;
    };

    wrapper.unwrap = function (modelID) {
        var model, helper, i, l;
        if (modelID in store) {
            helper = store[modelID];
            model = helper.model;

            delete store[modelID];

            // detach observer
            ObserveBinder.unobserve(model, helper.observer);

            // clear helper
            helper.observer = null;
            helper.model = null;
            for (i = 0, l = helper.observers.length; i < l; i += 1) {
                helper.observers[i] = null;
            }
            helper.observers = null;
        } else {
            logger.error("Store.unwrap: model doesn't exist : " + modelID);
        }

        helper = null;
        return model;
    };

    wrapper.change = function (modelID, model) {
        var lastModel, helper;
        if (modelID in store) {
            helper = store[modelID];

            lastModel = helper.model;
            ObserveBinder.unobserve(lastModel, helper.observer);

            helper.model = model;
            if (helper.mirror) {
                helper.mirror = JSON.parse(JSON.stringify(model));
            }
            ObserveBinder.observe(model, helper.observer);

            helper.observer(null, true);
        } else {
            logger.error("Store.change: model doesn't exist : " + modelID);
        }

        return lastModel;
    };

    wrapper.observe = function (modelID, observer, options) {
        var mirror, mirrorEnable = (options) ? options.mirror : false, state;
        if (modelID in store) {
            state = JSON.parse(JSON.stringify(store[modelID].model));
            mirror = (mirrorEnable === true) ? state : false;
            store[modelID].observers.push({
                observer: observer,
                mirror: mirror,
                weak: options ? ((typeof options.weak === 'boolean') ? options.weak : true) : true
            });
        } else {
            logger.error("Store.observe: model doesn't exist : " + modelID);
        }

        return mirror || state;
    };

    wrapper.unobserve = function (modelID, observer) {
        var helper, i, l;
        if (modelID in store) {
            helper = store[modelID];
            for (i = 0, l = helper.observers.length; i < l; i += 1) {
                if (helper.observers[i].observer === observer) {
                    helper.observers.splice(i, 1);
                    break;
                }
            }
        } else {
            logger.error("Store.unobserve: model doesn't exist : " + modelID);
        }

        return this;
    };

    wrapper.clear = function () {
        var modelID, models = [];
        for (modelID in store) {
            if (store.hasOwnProperty(modelID)) {
                models.push(this.unwrap(modelID));
            }
        }

        logger.msg("Store.clear: it was cleared");
        return models;
    };

    wrapper.getProjection = function (modelID) {
        var projection;
        if (modelID in store) {
            projection = JSON.parse(JSON.stringify(store[modelID].model));
        } else {
            logger.error("Store.getProjection: model doesn't exist : " + modelID);
        }

        return projection;
    };

    wrapper.getModelState = function (modelID) {
        var state;
        if (modelID in store) {
            state = store[modelID].state;
        } else {
            logger.error("Store.setDataState: model doesn't exist : " + modelID);
        }
        return state;
    };

    wrapper.createPromise = function (modelID, executor) {
        var promise;

        function wrapper(resolve, reject) {
            function curry(callback, state){
                return function(val){
                    var helper = store[modelID];
                    helper.state = state;

                    if (typeof callback == 'function') {
                        callback(val);
                    }
                    if (helper.state !== states[2] && helper.dirty) {
                        setTimeout(function () {
                            if (helper.state !== states[2] && helper.dirty) {
                                helper.observer(null, true);
                            }
                        }, 20);
                    }
                }
            }
            executor(curry(resolve, states[0]), curry(reject, states[1]));
        }

        if (modelID in store) {
            store[modelID].state = states[2];
            promise = new Promise(wrapper);
        } else {
            logger.error("Store.createPromise: model doesn't exist : " + modelID);
        }

        return promise;
    };
}

// it should be singletone in application
exports.Store = new RestrictedStore();