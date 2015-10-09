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
When we finish our work, we call .unlock the method of the lock object which also returns a promise resolving when unlocking is done.
When a lock is acquired by a lock object, other locks with the same key will wait until the first object releases the lock.
Pending locks are added to the queue (UUIDs are used to identify the objects).

How does this work under the hood?
==================================

First the lock object tries to find an object with the specified key in the collection "_pmongoLocks".
If it does not find one, than it creates it. If another process creates a lock with that key before, then our object catches the error and tries to find the object in the collection again.
When an object is found, the lock checks if it is in an unlocked state and if the first entry in the queue matches the lock's id. If so, it changes the state to locked and removes the first id from the queue.
Otherwise, the lock waits for retryDelay milliseconds (10 by default) and then repeats the above step.
When .unlock() method is called, the lock finds an object with the corresponding id in the collection and sets it's state to unlocked.

Let's review Configuration
==========================

Currently there is only one configuration option:

    options.retryDelay = 10;

options.retryDelay 
------------------

retryDelay is the number of milliseconds to wait before retrying to acquire the lock.

TODO
====

1. Implement readonly and read-write locks differentiation.
