/* MMM-Vasttrafik-PublicTransport.js - DRAFT
 *
 * Magic Mirror module - Display public transport depature board for Västtrafik/Sweden. 
 * This module use the API's provided by Västtrafik (https://developer.vasttrafik.se).
 * 
 * Magic Mirror
 * Module: MMM-Vasttrafik-PublicTransport
 * 
 * Magic Mirror By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 * 
 * Module MMM-Vasttrafik-PublicTransport By Bure Råman Vinnå
 * 
 */
const NodeHelper = require("node_helper");
const request = require("request-promise");
const encode = require('nodejs-base64-encode');
var parser = require('xml2js');
var Url = require("url");
var debugMe = false;

module.exports = NodeHelper.create({

    // --------------------------------------- Start the helper
    start: function () {
        log('Starting helper: ' + this.name);
        this.started = false;
        this.stops = [];
    },

    // --------------------------------------- Schedule a departure update
    scheduleUpdate: function () {
        var self = this;
        this.updatetimer = setInterval(function () { // This timer is saved in uitimer so that we can cancel it
            self.getStops();
        }, 20000);
    },

    // --------------------------------------- Get access token
    getAccessToken: function () {
        var self = this;
        var basicAuth = encode.encode(this.config.appKey + ":" + this.config.appSecret, "base64")
        var options = {
            method: "POST",
            uri: "https://api.vasttrafik.se/token",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Basic " + basicAuth,
            },
            body: "grant_type=client_credentials&scope=456"
        };

        request(options)
            .then(function (body) {
                var reply = JSON.parse(body);
                self.accessToken = {
                    token: reply.access_token,
                    expires: reply.expires_in
                }
                log("generateAccessToken completed");
            })
            .catch(function (error) {
                log("generateAccessToken failed =" + error);
                self.sendSocketNotification("SERVICE_FAILURE", error);
            });


    },
    getStops: function () {
        var self = this;

        if (!self.accessToken) {
            self.getAccessToken(); // Get inital access token
        }

        clearInterval(this.updatetimer); // Clear the timer so that we can set it again

        log("stationid is array=" + Array.isArray(this.config.stopIds));
        var Proms = [];
        // Loop over all stations
        this.config.stopIds.forEach(stopId => {
            var P = new Promise((resolve, reject) => {
                self.getDeparture(stopId, resolve, reject);
            });
            log('Pushing promise for station ' + stopId);
            console.log(P);
            Proms.push(P);
        });

        Promise.all(Proms).then(CurrentDeparturesArray => {
            log('all promises resolved ' + CurrentDeparturesArray);
            self.sendSocketNotification('STOPS', CurrentDeparturesArray); // Send departures to module
        }).catch(reason => {
            log('One or more promises rejected ' + reason);
            self.sendSocketNotification('SERVICE_FAILURE', reason);
        });

        self.scheduleUpdate(); // reinitiate the timer
    },

    addStop: function (stop) {
        var self = this;
        log("adding stop to stops: " + stop.name);
        self.stops.push(stop);
    },

    getDeparture: function (stopId, resolve, reject) {
        var self = this;
        var CurrentStop = {};
        log("Getting departures for stop id: " + stopId);
        var now = new Date(Date.now());
        //https://api.vasttrafik.se/bin/rest.exe/v2/departureBoard?id={stopId}&date={date}&time={time}
        if (self.accessToken) {
            log("Access token retrived: Calling depatureBoard");
            var options = {
                method: "GET",
                uri: "https://api.vasttrafik.se/bin/rest.exe/v2/departureBoard",
                headers: {
                    "Authorization": "Bearer " + self.accessToken.token,
                },
                qs: {
                    id: stopId,
                    date: now.toISOString().substring(0, 10),
                    time: now.getHours() + ":" + now.getMinutes()
                },
                json: true
            };

            request(options)
                .then(function (response) {
                    log("Depatuers for stop id: " + stopId + " retrived");
                    var responseJson;
                    var parseString = parser.parseString;
                    parseString(response, function (err, result) {
                        responseJson = result;
                    });
                    CurrentStop = self.getStop(responseJson.DepartureBoard)
                    log("current stop: " + CurrentStop.name);
                    resolve(CurrentStop);
                    //self.addStop(self.getStop(responseJson.DepartureBoard));
                })
                .catch(function (error) {
                    log("getDeparture failed =" + error);
                    if (error.statusCode == 401)
                        self.getAccessToken();
                });
        } else {
            log("Missing access token..");
            reject();
        }
    },

    getStop: function (depatureBoard) {
        var self = this;
        var stop = {
            name: depatureBoard.Departure[0].$.stop,
            time: depatureBoard.$.servertime,
            lines: [],
            now: new Date(Date.now())
        };

        for (var i = 0; i < depatureBoard.Departure.length; i++) {
            var dep = depatureBoard.Departure[i].$;
            if (stop.lines.length === 0) {
                var line = {
                    direction: dep.direction,
                    line: dep.sname,
                    departureIn: diffInMin(dateObj(dep.rtTime ? dep.rtTime : dep.time), stop.now),
                    color: dep.bgColor,
                    bgColor: dep.fgColor,
                    track: dep.track,
                    depatuers: [dep],
                    type: dep.type
                };
                stop.lines.push(line);
            }
            else {
                function findIndex(element) {
                    return element.track == dep.track && element.line == dep.sname;
                }
                var index = stop.lines.findIndex(findIndex);
                if (index > -1) {
                    var line = stop.lines[index];
                    line.depatuers.push(dep);
                    var depIn = diffInMin(dateObj(dep.rtTime ? dep.rtTime : dep.time), stop.now)
                    if (line.departureIn > depIn) {
                        var depInOld = line.departureIn;
                        line.departureIn = depIn;
                        if (!line.nextDeparture) {
                            line.nextDeparture = depInOld;
                        }
                        else if (line.nextDeparture > depInOld) {
                            line.nextDeparture == depInOld
                        }
                    }
                    else if (!line.nextDeparture) {
                        line.nextDeparture = depIn;
                    }
                    else if (line.nextDeparture > depIn) {
                        line.nextDeparture = depIn;
                    }
                    stop.lines[index] = line;
                }
                else {
                    var line = {
                        direction: dep.direction,
                        line: dep.sname,
                        departureIn: diffInMin(dateObj(dep.rtTime ? dep.rtTime : dep.time), stop.now),
                        color: dep.bgColor,
                        bgColor: dep.fgColor,
                        track: dep.track,
                        depatuers: [dep],
                        type: dep.type
                    };
                    stop.lines.push(line);
                }

            }
        }
        stop.lines = sortByKey(stop.lines, self.config.sortBy);
        return stop;
    },
    // --------------------------------------- Handle notifocations
    socketNotificationReceived: function (notification, payload) {
        const self = this;
        log("socketNotificationReceived")
        if (notification === 'CONFIG' /*&& this.started == false*/) {
            log("CONFIG event received")
            this.config = payload;
            this.started = true;
            debugMe = this.config.debug;
            self.getStops(); // Get it first time
            if (!self.updatetimer)
                self.scheduleUpdate();
        };
    }
});

//
// Utilities
//
function sortByKey(array, key) {
    return array.sort(function (a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

function diffInMin(date1, date2) {
    var diff = Math.abs(date2 - date1);
    return Math.floor((diff / 1000) / 60);
}

// --------------------------------------- Create a date object with the time in timeStr (hh:mm)
function dateObj(timeStr) {
    var parts = timeStr.split(':');
    var date = new Date();
    date.setHours(+parts.shift());
    date.setMinutes(+parts.shift());
    return date;
}

// --------------------------------------- At beginning of log entries
function logStart() {
    return (new Date(Date.now())).toLocaleTimeString() + " MMM-Vasttrafik-PublicTransport: ";
}

// --------------------------------------- Logging
function log(msg) {
    console.log(logStart() + msg);
}
// --------------------------------------- Debugging
function debug(msg) {
    if (debugMe) log(msg);
}