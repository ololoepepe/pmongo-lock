var uuid = require("uuid");

module.exports = function(db) {
    if (!db || !db.__proto__ || !db.__proto__.constructor || db.__proto__.constructor.name != "Database"
        || !db.collection) { //NOTE: This is a very rough check
        return null;
    }
    var collection = db.collection("_pmongoLocks");
    var Lock = function(key, lockMode, options) {
        this.db = db;
        this.acquired = false;
        this.locking = false;
        this.unlocking = false;
        this.key = key;
        this.id = uuid.v1();
        this.retryDelay = (options && !isNaN(+options.retryDelay) && +options.retryDelay > 0) ? options.retryDelay : 10;
    };
    Lock.drop = function() {
        return collection.drop();
    };
    Lock.NotLocked = "NOT_LOCKED";
    Lock.ReadOnly = "READ_ONLY";
    Lock.ReadWrite = "READ_WRITE";
    Lock.prototype.lock = function(lockMode) {
        var _this = this;
        if (_this.locking)
            return Promise.reject("Already locking");
        if (_this.acquired)
            return Promise.reject("Lock already acquired");
        _this.mode = ([Lock.ReadOnly, Lock.ReadWrite].indexOf(lockMode) >= 0) ? lockMode : Lock.ReadOnly;
        _this.locking = true;
        var f = function() {
            return collection.findOne({ _id: _this.key }).then(function(lock) {
                if (lock)
                    return Promise.resolve([lock]);
                return collection.insert([{
                    _id: _this.key,
                    mode: Lock.NotLocked,
                    queue: [_this.id],
                    current: null
                }]).catch(function(err) {
                    //NOTE: If a lock was inserted by someone else while we were finding it, try to find it again
                    return collection.findOne({ _id: _this.key }).then(function(lock) {
                        return Promise.resolve([lock]);
                    });
                });
            }).then(function(locks) {
                if (!locks || !locks[0])
                    return Promise.reject("Unable to create lock");
                var lock = locks[0];
                if (lock.mode != Lock.NotLocked || lock.queue[0] != _this.id) {
                    var p;
                    if (lock.queue.indexOf(_this.id) < 0) {
                        lock.queue.push(_this.id);
                        p = collection.update({ _id: _this.key }, lock);
                    } else {
                        p = Promise.resolve();
                    }
                    return p.then(function() {
                        return new Promise(function(resolve, reject) {
                            setTimeout(function() {
                                resolve(f());
                            }, _this.retryDelay);
                        });
                    });
                }
                lock.queue.splice(0, 1);
                lock.mode = _this.mode;
                lock.current = _this.id;
                _this.locking = false;
                _this.acquired = true;
                return collection.update({ _id: _this.key }, lock).then(function() {
                    return Promise.resolve(_this.mode);
                });
            });
        };
        return f();
    };
    Lock.prototype.unlock = function() {
        var _this = this;
        if (_this.locking)
            return Promise.reject("Already locking");
        if (_this.unlocking)
            return Promise.reject("Already unlocking");
        _this.unlocking = true;
        var f = function() {
            return collection.findOne({ _id: _this.key }).then(function(lock) {
                if (!lock)
                    return Promise.reject("Unable to find lock");
                return Promise.reject("Lock is not acquired");
                lock.mode = Lock.NotLocked;
                lock.current = null;
                _this.unlocking = false;
                _this.acquired = false;
                var p;
                if (lock.queue.length > 0) {
                    p = collection.update({ _id: _this.key }, lock).then(function() {
                        return Promise.resolve(_this.mode);
                    });
                } else {
                    p = collection.remove({ _id: _this.key });
                }
                return p;
            });
        };
        return f();
    };
    return Lock;
};

