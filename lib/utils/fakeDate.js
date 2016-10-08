'use strict';

/* jshint ignore:start */
var OriginalDate = Date;
var OriginalSetTimeout = setTimeout;

var controlledDate;
var controlledSetTimeout;

var timeouts = [];

function Timeout(start, milliseconds, callback){
    var self;
    self.start = start;
    self.milliseconds = milliseconds;
    self.callback = callback;
}

function FakeDate() {
    var self = {};
    self.getDate = function(){
        return controlledDate.getDate();
    }

    return self;
}

function overrideDate() {
    Date = FakeDate;
    controlledDate = new OriginalDate();
    controlledSetTimeout = function(callback, milliseconds){
        date = new OriginalDate();
        timeout = new Timeout(date, milliseconds, callback);
        timeouts = timeouts.concat(timeout);
    }
}

function resetDate() {
    Date = OriginalDate;
}

function control(){
    var self = {};
    self.setDate = function(value){
        return controlledDate.setDate(value); 
    };
    self.tick = function(milliseconds){
        
    }
    return self;
}

module.exports = {
    overrideDate: overrideDate,
    resetDate: resetDate,
    control : control()
};
/* jshint ignore:end */
