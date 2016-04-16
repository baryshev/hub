(function () {
    'use strict';

    var Promise = global.Promise || require('bluebird');

    var Hub = function () {
        this.constructors = {};
        this.destructors = {};
        this.services = {};
        this.waiting = {};
    };

    Hub.prototype.register = function (name, constructor, destructor) {
        if (this.constructors[name] || this.destructors[name]) {
            throw new Error('Service "' + name + '" is already registered');
        }
        this.constructors[name] = constructor;
        if (destructor) {
            this.destructors[name] = destructor;
        }
        return true;
    };

    Hub.prototype.unregister = function (name) {
        if (typeof this.constructors[name] === 'undefined' && typeof this.destructors[name] === 'undefined') {
            throw new Error('Service "' + name + '" not registered');
        }
        delete(this.constructors[name]);
        delete(this.destructors[name]);
        return true;
    };

    Hub.prototype.destroy = function (name, service) {
        if (Array.isArray(name)) {
            return Promise.all(name.map(function (name) {
                return Array.isArray(name) ? this.destroy(name[0], name[1]) : this.destroy(name);
            }.bind(this)));
        } else {

            if (typeof service === 'undefined') {
                service = this.services[name];
            }
            if (this.destructors[name]) {
                if (typeof service === 'undefined') {
                    return Promise.reject(new Error('There is no service to destroy'));
                }
                var that = this;
                return this.destructors[name](service).then(function () {
                    if (that.services[name] === service) {
                        delete(that.services[name]);
                    }
                    return this;
                });
            } else {
                if (this.services[name] === service) {
                    delete(this.services[name]);
                }
                return Promise.resolve();
            }
        }
    };

    Hub.prototype.get = function (name, standalone) {
        if (Array.isArray(name)) {
            return Promise.all(name.map(function (name) {
                return Array.isArray(name) ? this.get(name[0], name[1]) : this.get(name);
            }.bind(this)));
        } else {
            var resolve, reject;
            var promise = new Promise(function () {
                resolve = arguments[0];
                reject = arguments[1];
            });
            if (!standalone && this.services[name]) {
                resolve(this.services[name]);
            } else {
                if (!standalone && typeof this.waiting[name] !== 'undefined') {
                    this.waiting[name].push({resolve: resolve, reject: reject});
                } else {
                    if (typeof this.constructors[name] === 'undefined') {
                        reject(new Error('Service "' + name + '" is not registered'));
                        return promise;
                    }
                    if (!standalone && typeof this.waiting[name] === 'undefined') {
                        this.waiting[name] = [];
                    }
                    this.constructors[name]().then(function (service) {
                        if (!standalone && service) {
                            this.services[name] = service;
                        }
                        resolve(service);
                        if (!standalone && typeof this.waiting[name] !== 'undefined') {
                            this.waiting[name].forEach(function (waiting) {
                                waiting.resolve(service);
                            });
                            delete(this.waiting[name]);
                        }
                    }.bind(this)).catch(function (error) {
                        reject(error);
                        if (!standalone && typeof this.waiting[name] !== 'undefined') {
                            this.waiting[name].forEach(function (waiting) {
                                waiting.reject(error);
                            });
                            delete(this.waiting[name]);
                        }
                    }.bind(this));
                }
            }
            return promise;
        }
    };

    Hub.prototype.isRegistered = function (name) {
        return !!this.constructors[name];
    };

    Hub.prototype.getRegistered = function () {
        return Object.keys(this.constructors);
    };

    Hub.prototype.isInitiated = function (name) {
        return !!this.services[name];
    };

    Hub.prototype.getInitiated = function () {
        return Object.keys(this.services);
    };

    Hub.standalone = function () {
        delete(require.cache[require.resolve('hub')]);
        module.exports = new Hub();
        return module.exports;
    };

    module.exports = Hub;
}());