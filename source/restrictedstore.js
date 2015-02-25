function RestrictedStore() {
    var wrapper = this, store = {}, logger = require("./logger").logger,
        ObserveBinder = require("./observebinder").ObserveBinder;

    function _notify(observer, immutable, changes) {
        if (typeof observer === 'function') {
            setTimeout(function () {
                observer(immutable, changes);
            }, 0);
        }
    }

    function _clone(dest, obj) {
        if (Object.prototype.toString.call(obj) === '[object Array]') {
            for (var i = 0, l = obj.length; i < l; i += 1){
                var index = dest.indexOf(obj[i]);
                if(index !== -1) {
                    if (Object.prototype.toString.call(obj[i]) === '[object Array]') {
                        dest[index] = _clone(dest[index] || [] , obj[i]);
                    } else {
                        dest[index] = _clone(dest[index] || {} , obj[i]);
                    }
                } else {
                    dest.push(obj[i]);
                }
            }
        } else {
            for(var key in obj) {
                if(obj.hasOwnProperty(key)) {
                    if (obj[key] === undefined || obj[key] == null || typeof(obj[key]) != 'object') {
                        dest[key] = obj[key];
                    } else {
                        if (Object.prototype.toString.call(obj[key]) === '[object Array]') {
                            dest[key] = _clone(dest[key] || [] , obj[key]);
                        } else {
                            dest[key] = _clone(dest[key] || {} , obj[key]);
                        }
                    }
                }
            }
        }
        return dest;
    }

    function _observer(changes) {
        var mirror, weak;
        for (var i = 0, l = this.observers.length; i < l; i += 1) {
            mirror = this.observers[i].mirror;
            weak = this.observers[i].weak;
            if (typeof mirror === 'object') {
                if (weak) {
                    mirror = _clone(mirror, this.model);
                    this.observers[i].mirror = mirror;
                } else {
                    if (Object.prototype.toString.call(mirror) === '[object Array]') {
                        for (var j = 0, k = this.model.length; j < k; j += 1) {
                            mirror[i] = JSON.parse(JSON.stringify(this.model[i]));
                        }
                        mirror.length = this.mirror.length;
                    } else {
                        for(var key in this.model) {
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

            // divide flow
            _notify(this.observers[i].observer, mirror, changes);
        }
    }

    wrapper.wrap = function (modelID, model) {
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
            modelID: modelID,
            model: model,
            observers: []
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

            helper.observer(model);
        }else {
            logger.error("Store.change: model doesn't exist : " + modelID);
        }

        return lastModel;
    };

    wrapper.observe = function (modelID, observer, options) {
        var mirror, mirrorEnable = (options) ? options.mirror : false;
        if (modelID in store) {
            mirror = (mirrorEnable === true) ? JSON.parse(JSON.stringify(store[modelID].model)) : false;
            store[modelID].observers.push({
                observer: observer,
                mirror: mirror,
                weak: options ? ((typeof options.weak === 'boolean') ? options.weak : true) : true
            });
        } else {
            logger.error("Store.observe: model doesn't exist : " + modelID);
        }

        return mirror;
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

    wrapper.getState = function (modelID) {
        var state;
        if (modelID in store) {
            state = JSON.parse(JSON.stringify(store[modelID].model));
        } else {
            logger.error("Store.getState: model doesn't exist : " + modelID);
        }

        return state;
    };
}

// it should be singletone in application
exports.Store = new RestrictedStore();