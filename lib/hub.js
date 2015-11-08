(function () {
    'use strict';

    var async = require('async');
    var Promise = require("bluebird");

    var Hub = function () {
        this.constructors = {};
        this.destructors = {};
        this.cache = {};
        this.waiting = {};

    };

    Hub.prototype.getService = function (name, forceNew, callback) {
        if (!callback) {
            var resolve, reject;
            var promise = new Promise(function () {
                resolve = arguments[0];
                reject = arguments[1];
            });
        }
        if (this.cache[name] && !forceNew) {
            if (callback) {
                callback(null, this.cache[name]);
            } else {
                resolve(this.cache[name]);
            }
        } else {
            if (!forceNew && typeof this.waiting[name] !== 'undefined') {
                this.waiting[name].push(callback || {resolve: resolve, reject: reject});
            } else {
                if (!forceNew && typeof this.waiting[name] === 'undefined') {
                    this.waiting[name] = [];
                }
                var that = this;
                if (callback) {
                    if (!this.constructors[name]) {
                        callback(new Error('Service "' + name + '" is not registered'));
                        return;
                    }
                    this.constructors[name](this, function (error, service) {
                        if (!error && service) {
                            if (!forceNew) {
                                that.cache[name] = service;
                            }
                        }
                        callback(error, service);
                        if (!forceNew && typeof that.waiting[name] !== 'undefined') {
                            while (that.waiting[name].length) {
                                var waiting = that.waiting[name].pop();
                                waiting(error, service);
                            }
                            delete(that.waiting[name]);
                        }
                    });
                } else {
                    if (!this.constructors[name]) {
                        reject(new Error('Service "' + name + '" is not registered'));
                        return promise;
                    }
                    this.constructors[name](this).then(function (service) {
                        if (service && !forceNew) {
                            that.cache[name] = service;
                        }
                        resolve(service);
                        if (!forceNew && typeof that.waiting[name] !== 'undefined') {
                            while (that.waiting[name].length) {
                                var waiting = that.waiting[name].pop();
                                waiting.resolve(service);
                            }
                            delete(that.waiting[name]);
                        }
                    }).catch(function (error) {
                        reject(error);
                        if (!forceNew && typeof that.waiting[name] !== 'undefined') {
                            while (that.waiting[name].length) {
                                var waiting = that.waiting[name].pop();
                                waiting.reject(error);
                            }
                            delete(that.waiting[name]);
                        }
                    });
                }
            }
        }
        if (!callback) {
            return promise;
        }
    };

    Hub.prototype.exists = function (name) {
        return !!this.cache[name];
    };

    Hub.prototype.register = function (name, constructor, destructor) {
        this.constructors[name] = constructor;
        if (destructor) {
            this.destructors = destructor;
        }
    };

    Hub.prototype.destroy = function (name, service, callback) {
        if (callback) {
            if (this.destructors[name]) {
                if (this.cache[name] === service) {
                    delete (this.cache[name]);
                }
                this.destructors[name](this, service, callback);
            } else {
                callback(new Error('There is no destructor for service "' + name + '"'));
            }
        } else {
            if (this.destructors[name]) {
                if (this.cache[name] === service) {
                    delete (this.cache[name]);
                }
                return this.destructors[name](this, service);
            } else {
                return new Promise(function (resolve, reject) {
                    reject(new Error('There is no destructor for service "' + name + '"'));
                });
            }
        }
    };

    Hub.prototype.get = function (name, forceNew, callback) {
        if (typeof forceNew === 'function' && typeof callback === 'undefined') {
            callback = forceNew;
            forceNew = false;
        }
        var that = this;
        if (Object.prototype.toString.call(name) === '[object Array]') {
            if (callback) {
                var tasks = [];
                for (var i = 0; i < name.length; i++) {
                    if (Object.prototype.toString.call(name[i]) === '[object Array]') {
                        tasks.push((function (name, forceNew) {
                            return function (callback) {
                                that.getService(name, forceNew, callback);
                            };
                        }(name[i][0], name[i][1])));
                    } else {
                        tasks.push((function (name, forceNew) {
                            return function (callback) {
                                that.getService(name, forceNew, callback);
                            };
                        }(name[i], false)));
                    }
                }
                async.auto(tasks, callback);
            } else {
                var promises = [];
                for (var i = 0; i < name.length; i++) {
                    if (Object.prototype.toString.call(name[i]) === '[object Array]') {
                        promises.push(this.getService(name[i][0], name[i][1]));
                    } else {
                        promises.push(this.getService(name[i], false));
                    }
                }
                return Promise.all(promises);
            }
        } else {
            if (callback) {
                that.getService(name, forceNew, callback);
            } else {
                return that.getService(name, forceNew);
            }
        }
    };

    module.exports = Hub;
}());