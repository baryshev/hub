var chai = require('chai');
var expect = chai.expect;

var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

var Hub = require('..');
var hub = new Hub();

var Service = function () {

};

Service.prototype.successInit = function () {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, 100);
    });
};

Service.prototype.failInit = function () {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            reject(new Error('Initialization failed'));
        }, 100);
    });
};

Service.prototype.successDestroy = function () {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, 100);
    });
};

Service.prototype.failDestroy = function () {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            reject(new Error('Destruction failed'));
        }, 100);
    });
};

Service.prototype.foo = function () {
    return 'bar';
};

var serviceSuccessConstructor = function () {
    var service = new Service();
    return new Promise(function (resolve, reject) {
        service.successInit().then(function () {
            resolve(service);
        }, function (error) {
            reject(error);
        });
    });
};

var serviceSuccessDestructor = function () {
    var service = new Service();
    return new Promise(function (resolve, reject) {
        service.successDestroy().then(function () {
            resolve();
        }, function (error) {
            reject(error);
        });
    });
};

var serviceFailConstructor = function () {
    var service = new Service();
    return new Promise(function (resolve, reject) {
        service.failInit().then(function () {
            resolve(service);
        }, function (error) {
            reject(error);
        });
    });
};

var serviceFailDestructor = function () {
    var service = new Service();
    return new Promise(function (resolve, reject) {
        service.failDestroy().then(function () {
            resolve();
        }, function (error) {
            reject(error);
        });
    });
};

describe('Hub', function () {
    describe('#register()', function () {
        it('Should register service', function () {
            return expect(hub.register('service1', serviceSuccessConstructor, serviceSuccessDestructor)).to.be.true;
        });

        it('Should not register already registered service', function () {
            return expect(function () {
                hub.register('service1', serviceSuccessConstructor, serviceSuccessDestructor)
            }).to.throw(Error);
        });
    });

    describe('#unregister()', function () {
        it('Should unregister service', function () {
            return expect(hub.unregister('service1', serviceSuccessConstructor, serviceSuccessDestructor)).to.be.true;
        });

        it('Should not unregister not registered service', function () {
            return expect(function () {
                hub.unregister('service1', serviceSuccessConstructor, serviceSuccessDestructor)
            }).to.throw(Error);
        });
    });

    describe('#get()', function () {
        it('Should not initiate unregistered service', function () {
            return expect(hub.get('service1')).to.be.rejectedWith(Error);
        });

        it('Should initiate and return registered service', function () {
            hub.register('service1', serviceSuccessConstructor, serviceSuccessDestructor);
            return expect(hub.get('service1')).to.be.fulfilled;
        });

        it('Should initiate and return registered services', function () {
            hub.register('service3', serviceSuccessConstructor, serviceFailDestructor);
            return expect(hub.get(['service1', 'service3'])).to.be.fulfilled.and.eventually.to.have.length(2);
        });

        it('Should not reinitiate already initiated service', function () {
            return hub.get('service1').then(function (service1) {
                return expect(hub.get('service1')).to.be.fulfilled.and.eventually.be.equal(service1);
            });
        });

        it('Should reinitiate service if standalone is true', function () {
            return hub.get('service1').then(function (service1) {
                return expect(hub.get('service1', true)).to.be.fulfilled.and.eventually.to.be.not.equal(service1);
            });
        });

        it('Should not initiate broken service', function () {
            hub.register('service2', serviceFailConstructor, serviceFailDestructor);
            return expect(hub.get('service2')).to.be.rejectedWith(Error);
        });

    });

    describe('#destroy()', function () {
        it('Should destroy only standalone service', function () {
            return hub.get('service1', true).then(function (service1) {
                hub.destroy('service1', service1).then(function () {
                    return expect(hub.isInitiated('service1')).to.be.true;
                });
            });
        });

        it('Should destroy service', function () {
            return expect(hub.destroy('service1')).to.be.fulfilled;
        });

        it('Should not destroy broken service', function () {
            return hub.get('service3').then(function (service) {
                expect(service.foo()).to.be.equal('bar');
                return expect(hub.destroy('service3')).to.be.rejectedWith(Error);
            });
        });
    });

    describe('#isRegistered()', function () {
        it('Should return true if service is registered', function () {
            return expect(hub.isRegistered('service3')).to.be.true;
        });

        it('Should return false if service is not registered', function () {
            return expect(hub.isRegistered('service4')).to.be.false;
        });
    });

    describe('#getRegistered()', function () {
        it('Should return registered services', function () {
            return expect(hub.getRegistered()).to.be.deep.equal(['service1', 'service3', 'service2']);
        });
    });

    describe('#isInitiated()', function () {
        it('Should return true if service is initiated', function () {
            return expect(hub.isInitiated('service3')).to.be.true;
        });

        it('Should return false if service is not initiated', function () {
            return expect(hub.isInitiated('service2')).to.be.false;
        });
    });

    describe('#getInitiated()', function () {
        it('Should return initiated services', function () {
            return expect(hub.getInitiated()).to.be.deep.equal(['service3']);
        });
    });
});
