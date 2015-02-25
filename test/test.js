// for tests
var expect = require("chai").expect;
var should = require('chai').should();

// enable polyfills
var observe = require("../polyfills/object-observe");

// variables
var store = require("../source/restrictedstore").Store;
var modelID = 'my_model';
var model;

describe('0.0: State test', function () {

    before(function () {
        model = {
            attr: 1,
            array: [
                1,
                2,
                3
            ],
            obj: {
                attr: 'a'
            }
        };
        store.wrap(modelID, model);
    });

    after(function () {
        store.unwrap(modelID);
    });

    it('0.0.0: Get state & check initial state equality', function () {
        var state = store.getState(modelID);
        expect(state).to.be.a('object');
        (JSON.stringify(state)).should.equal(JSON.stringify(model));
    });

    it('0.0.1: Get state after model change', function () {
        var state;
        model.attr = 2;
        state = store.getState(modelID);
        expect(state).to.be.a('object');
        (JSON.stringify(state)).should.equal(JSON.stringify(model));
    });

    it('0.0.2: Update state by callback', function (done) {
        var state,
            observer = function (object) {
                (JSON.stringify(object)).should.equal(JSON.stringify(model));
                (JSON.stringify(state)).should.not.equal(JSON.stringify(model));

                store.unobserve(modelID, observer);
                done();
            };

        state = store.observe(modelID, observer);

        model.array.push(4);
    });

    it('0.0.3: Detach callback', function (done) {
        var counter = 0,
            observer = function () {
                counter++;
                store.unobserve(modelID, observer);

                model.obj.attr = 'c';
            };

        store.observe(modelID, observer);

        model.obj.attr = 'd';

        setTimeout(function () {
            (counter).should.equal(1);
            done();
        }, 100);
    });

});

describe('0.1: Test of weak mirrors', function () {

    before(function () {
        model = {
            attr: 1,
            array: [
                1,
                2,
                3
            ],
            obj: {
                attr: 'a'
            }
        };
        store.wrap(modelID, model);
    });

    after(function () {
        store.unwrap(modelID);
    });

    it('0.1.0: Create mirrors', function () {
        var mirror1, mirror2,
            observer1 = function (object) {

            },
            observer2 = function (object) {

            };

        mirror1 = store.observe(modelID, observer1, {mirror: true});
        mirror2 = store.observe(modelID, observer2, {mirror: true});

        expect(mirror1).to.be.a('object');
        expect(mirror2).to.be.a('object');

        (JSON.stringify(mirror1)).should.equal(JSON.stringify(model));
        (JSON.stringify(mirror2)).should.equal(JSON.stringify(model));

        (mirror1).should.not.equal(mirror2);

        store.unobserve(modelID, observer1);
        store.unobserve(modelID, observer2);
    });

    it('0.1.1: Update mirrors & notify via callback', function (done) {
        var mirror,
            observer = function (object) {
                (JSON.stringify(object)).should.equal(JSON.stringify(model));
                (mirror).should.equal(object);

                store.unobserve(modelID, observer);
                done();
            };

        mirror = store.observe(modelID, observer, {mirror: true});

        model.obj.attr = 7;
    });

    it('0.1.2: Detach callback', function (done) {
        var counter = 0,
            mirror,
            observer = function () {
                counter++;
                store.unobserve(modelID, observer);

                model.attr = 'c';
            };

        mirror = store.observe(modelID, observer, {mirror: true});

        model.attr = 'd';

        setTimeout(function () {
            (counter).should.equal(1);
            (mirror.attr).should.equal('d');
            done();
        }, 100);
    });

    it('0.1.2: Custom mirror attribute', function (done) {
        var mirror,
            observer = function () {
                store.unobserve(modelID, observer);

                (mirror.attr).should.equal('f');
                (mirror.custom).should.equal('new');
                ('custom' in model).should.equal(false);

                done();
            };

        mirror = store.observe(modelID, observer, {mirror: true});

        model.attr = 'f';
        mirror.custom = 'new';
    });

    it('0.1.3: Custom array element in mirror', function (done) {
        var mirror,
            observer = function () {
                store.unobserve(modelID, observer);

                (mirror.array.indexOf('new')).should.equal(mirror.array.length - 1);
                (model.array.indexOf('new')).should.equal(-1);

                done();
            };

        mirror = store.observe(modelID, observer, {mirror: true});

        model.newAttr = 'z';
        mirror.array.push('new');
    });

});


describe('0.2: Test of strong mirrors', function () {

    before(function () {
        model = {
            attr: 1,
            array: [
                1,
                2,
                3
            ],
            obj: {
                attr: 'a'
            }
        };
        store.wrap(modelID, model);
    });

    after(function () {
        store.unwrap(modelID);
    });

    it('0.2.0: Create mirrors', function () {
        var mirror1, mirror2,
            observer1 = function (object) {

            },
            observer2 = function (object) {

            };

        mirror1 = store.observe(modelID, observer1, {mirror: true, weak: false});
        mirror2 = store.observe(modelID, observer2, {mirror: true, weak: false});

        expect(mirror1).to.be.a('object');
        expect(mirror2).to.be.a('object');

        (JSON.stringify(mirror1)).should.equal(JSON.stringify(model));
        (JSON.stringify(mirror2)).should.equal(JSON.stringify(model));

        (mirror1).should.not.equal(mirror2);

        store.unobserve(modelID, observer1);
        store.unobserve(modelID, observer2);
    });

    it('0.2.1: Update mirrors & notify via callback', function (done) {
        var mirror,
            observer = function (object) {
                (JSON.stringify(object)).should.equal(JSON.stringify(model));
                (mirror).should.equal(object);

                store.unobserve(modelID, observer);
                done();
            };

        mirror = store.observe(modelID, observer, {mirror: true, weak: false});

        model.obj.attr = 117;
    });

    it('0.2.2: Detach callback', function (done) {
        var counter = 0,
            mirror,
            observer = function () {
                counter++;
                store.unobserve(modelID, observer);

                model.attr = 'c';
            };

        mirror = store.observe(modelID, observer, {mirror: true, weak: false});

        model.attr = 'ddd';

        setTimeout(function () {
            (counter).should.equal(1);
            (mirror.attr).should.equal('ddd');
            done();
        }, 100);
    });

    it('0.2.3: Custom mirror attribute', function (done) {
        var mirror,
            observer = function () {
                store.unobserve(modelID, observer);

                (JSON.stringify(mirror)).should.equal(JSON.stringify(model));

                done();
            };

        mirror = store.observe(modelID, observer, {mirror: true, weak: false});

        model.attr = 'fff';
        mirror.custom = 'new1';
    });

    it('0.2.4: Custom array element in mirror', function (done) {
        var mirror,
            observer = function () {
                store.unobserve(modelID, observer);

                (JSON.stringify(mirror)).should.equal(JSON.stringify(model));

                done();
            };

        mirror = store.observe(modelID, observer, {mirror: true, weak: false});

        model.newAttr = 'zzz';
        mirror.array.push('new1');
    });

});

describe('0.3: Unwrap & change models', function () {
    var newModel = {'new': 'new'};

    before(function () {
        model = {
            attr: 1,
            array: [
                1,
                2,
                3
            ],
            obj: {
                attr: 'a'
            }
        };
        store.wrap(modelID, model);
    });

    it('0.3.0: Change model', function (done) {
        var counter = 0,
            state,
            observer = function (object) {
                counter++;

                if (counter === 1) {
                    store.change(modelID, newModel);
                }
                state = object;
            };

        store.observe(modelID, observer);

        model.attr = '_c';

        setTimeout(function () {
            (counter).should.equal(2);
            (JSON.stringify(store.getState(modelID))).should.equal(JSON.stringify(newModel));
            (JSON.stringify(state)).should.equal(JSON.stringify(newModel));

            store.unobserve(modelID, observer);
            done();
        }, 100);
    });

    it('0.3.1: Unwrap model', function (done) {
        var counter = 0,
            observer = function () {
                counter++;
                store.unwrap(modelID);
            };

        store.observe(modelID, observer);

        newModel.attr = 'd';

        setTimeout(function () {
            (counter).should.equal(1);
            expect(store.getState(modelID)).to.be.a('undefined');
            done();
        }, 100);
    });
});