#!/usr/bin/env node

var cluster = require("cluster");
var expressCluster = require("express-cluster");
var OS = require("os");
var pmongo = require("promised-mongo");

var pmongolock = require("../");

var count = OS.cpus().length;
var db = pmongo("ololord");

var Lock = pmongoLock(db);

var spawnCluster = function() {
    expressCluster(function(worker) {
        console.log("[" + process.pid + "] Initializing...");

        var express = require("express");
        
        app.use(express.static(__dirname));
        
        var lock = new Database.Lock("test", {
            retryDelay: 1000 //Set retry delay to 1 second to reduce database load
        });
        lock.lock(Database.Lock.ReadOnly).then(function() { //Acquire the lock
            //This function will only be called form one worker at a time
            //All other processes will wait for the lock being released by the previous owner
            setTimeout(function() {
                lock.unlock();
            }, 10000); //Unlock after 10 seconds
            app.listen(8080, function() {
                console.log("[" + process.pid + "] Listening on port 8080...");
            });
        }).catch(function(err) {
            console.log(err);
        });
    }, {
        count: count,
        respawn: false
    });
};

if (cluster.isMaster) {
    Database.Lock.drop().then(function() { //Dropping all locks (only call this function from the master process)
        console.log("Spawning workers, please, wait...");
        spawnCluster();
    });
} else {
    spawnCluster();
}

