Simple locking mechanism for promised-mongo


example
=======

    var pmongo = require("promised-mongo");
    var db = pmongo("test");
    var pmongolock = require("pmongo-lock");
    var Lock = pmongoLock(db);
    var lock = new Lock("test");
    lock.lock().then(function() {
        //...
        return lock.unlock();
    });


How does this locking module work?
==================================

First we create a class (Lock) with the promised-mongo MongoDB database instance being bound to it.

Then we create a new lock object with some key (for example, if we lock a file, the key may be the name of that file).

After that we call the .lock() method of the lock object which returns a promise resolving when the lock is acquired.

When we finish our work, we call the .unlock method of the lock object which also returns a promise resolving when unlocking is done.

When a lock is acquired by a lock object, other locks with the same key will wait until the first object releases the lock.

Pending locks are added to the queue (UUIDs are used to identify the objects). Read/write locks has higher priority than readonly ones.

There are two locking modes: readonly and read/write. A lock may be acquired by one or more readonly lockers or by a single read/write locker at the same time, exclusively.

Use Lock.ReadOnly or Lock.ReadWrite to specify locking mode. If not specified, locking mode defaults to read/write.

Let's review Configuration
==========================

Currently there is only one configuration option:

    options.retryDelay = 10;

options.retryDelay 
------------------

retryDelay is the number of milliseconds to wait before retrying to acquire the lock.
