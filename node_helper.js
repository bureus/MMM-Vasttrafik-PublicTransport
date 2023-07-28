/* MMM-Vasttrafik-PublicTransport.js - DRAFT
 *
 * Magic Mirror module - Display public transport depature board for V�sttrafik/Sweden.
 * This module use the API"s provided by V�sttrafik (https://developer.vasttrafik.se).
 *
 * Magic Mirror
 * Module: MMM-Vasttrafik-PublicTransport
 *
 * Magic Mirror By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 *
 * Module MMM-Vasttrafik-PublicTransport By Bure R�man Vinn�
 *
 */
const NodeHelper = require("node_helper");
const request = require("request-promise");
const encode = require("nodejs-base64-encode");
var parser = require("xml2js");
var Url = require("url");
var debugMe = true; //false;

module.exports = NodeHelper.create({
  // --------------------------------------- Start the helper
  start: function () {
    log("Starting helper: " + this.name);
    this.started = false;
    this.stops = [];
  },

  // --------------------------------------- Schedule a departure update
  scheduleUpdate: function () {
    let self = this;
    this.updatetimer = setInterval(function () {
      // This timer is saved in uitimer so that we can cancel it
      self.getStops();
    }, this.config.refreshRate);
  },
  // --------------------------------------- Schedule traffic situations update
  scheduleUpdateTrafficSituations: function () {
    let self = this;
    this.updateTimerTrafficSituations = setInterval(function () {
      // This timer is saved in uitimer so that we can cancel it
      self.getTrafficSituations();
    }, 3600000); //update traffic situations every hour
  },

  // --------------------------------------- Get access token
  getAccessToken: async function () {
    let self = this;
    return new Promise((resolve) => {
      let basicAuth = encode.encode(
        this.config.appKey + ":" + this.config.appSecret,
        "base64"
      );
      let options = {
        method: "POST",
        uri: "https://ext-api.vasttrafik.se/token",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + basicAuth,
        },
        body: "grant_type=client_credentials&scope=456",
      };

      request(options)
        .then(function (body) {
          let reply = JSON.parse(body);
          self.accessToken = {
            token: reply.access_token,
            expires: reply.expires_in,
          };
          debug("generateAccessToken completed");
          resolve(true);
        })
        .catch(function (error) {
          log("generateAccessToken failed =" + error);
          self.sendSocketNotification("SERVICE_FAILURE", error);
          reject();
        });
    });
  },
  getStops: async function () {
    let self = this;

    /*if (!self.accessToken) {
            await self.getAccessToken(); // Get inital access token
        }*/

    clearInterval(this.updatetimer); // Clear the timer so that we can set it again

    debug("stationid is array=" + Array.isArray(this.config.myStops));
    let Proms = [];
    // Loop over all stations
    this.config.myStops.forEach((myStop) => {
      let P = new Promise((resolve, reject) => {
        self.getDeparture(myStop, resolve, reject);
      });
      debug("Pushing promise for stop " + myStop.id);
      Proms.push(P);
    });

    Promise.all(Proms)
      .then((CurrentDeparturesArray) => {
        debug("all promises resolved " + CurrentDeparturesArray);
        self.sendSocketNotification("STOPS", CurrentDeparturesArray); // Send departures to module
      })
      .catch((reason) => {
        log("One or more promises rejected " + reason);
        self.sendSocketNotification("SERVICE_FAILURE", reason);
      });

    self.scheduleUpdate(); // reinitiate the timer
  },

  addStop: function (stop) {
    let self = this;
    debug("adding stop to stops: " + stop.name);
    self.stops.push(stop);
  },

  getDeparture: function (myStop, resolve, reject) {
    let self = this;
    let currentStop = {};
    debug("Getting departures for stop id: " + myStop.id);
    let now = new Date(Date.now());
    if (self.accessToken) {
      debug("Access token retrived: Calling depatureBoard");
      let options = {
        method: "GET",
        uri: `https://ext-api.vasttrafik.se/pr/v4/stop-areas/${stopId}/departures`,
        headers: {
          Authorization: "Bearer " + self.accessToken.token,
        },
        json: true,
      };

      request(options)
        .then(function (response) {
          debug("Depatuers for stop id: " + stopId + " retrived");
          currentStop = self.getStop(stopId, response);
          debug("current stop: " + currentStop.name);
          resolve(currentStop);
        })
        .catch(function (error) {
          log("getDeparture failed =" + error);
          if (error.statusCode == 401) self.getAccessToken();
        });
    } else {
      log("Missing access token..");
      reject();
    }
  },

  getStop: function (myStop, depatureBoard) {
    let self = this;
    let stop = {
      stopId: stopId,
      name: depatureBoard.results[0].stopPoint.name,
      lines: [],
      now: new Date(Date.now()),
    };

    for (let i = 0; i < depatureBoard.results.length; i++) {
      let dep = depatureBoard.results[i];
      if (stop.lines.length === 0) {
        let line = {
          direction: dep.serviceJourney.direction,
          line: dep.serviceJourney.line.shortName,
          departureIn: diffInMin(dep.estimatedTime, stop.now),
          color: dep.serviceJourney.line.foregroundColor,
          bgColor: dep.serviceJourney.line.backgroundColor,
          track: dep.stopPoint.platform,
        };
        debug("Pushing new element into departures line list: " + JSON.stringify(line, null, 2));
        stop.lines.push(line);
      } else {
        function findIndex(element) {
          return element.track == dep.stopPoint.platform && element.line == dep.serviceJourney.line.shortName;
        }
        let index = stop.lines.findIndex(findIndex);
        if (index > -1) {
          debug("entered the twilight zone");
          let line = stop.lines[index];
          debug("Line: " + JSON.stringify(line, null, 2));
          let depIn = diffInMin(dep.estimatedTime, stop.now);
          if (line.departureIn > depIn) {
            let depInOld = line.departureIn;
            line.departureIn = depIn;
            if (!line.nextDeparture) {
              line.nextDeparture = depInOld;
            } else if (line.nextDeparture > depInOld) {
              line.nextDeparture == depInOld;
            }
          } else if (!line.nextDeparture) {
            line.nextDeparture = depIn;
          } else if (line.nextDeparture > depIn) {
            line.nextDeparture = depIn;
          }
          stop.lines[index] = line;
        } else {
          let line = {
            direction: dep.serviceJourney.direction,
            line: dep.serviceJourney.line.shortName,
            departureIn: diffInMin(dep.estimatedTime, stop.now),
            color: dep.serviceJourney.line.foregroundColor,
            bgColor: dep.serviceJourney.line.backgroundColor,
            track: dep.stopPoint.platform,
            };
          stop.lines.push(line);
        }
      }
    }
    if (myStop.filterAttr && myStop.filterKeys) {
      debug(
        "Filter board on: " +
          myStop.filterAttr +
          "=" +
          myStop.filterKeys
      );
      var filteredArray = filterBoard(
        stop.lines,
        myStop.filterAttr,
        myStop.filterKeys
      );
      stop.lines = sortByKey(filteredArray, self.config.sortBy);
    } else {
      stop.lines = sortByKey(stop.lines, self.config.sortBy);
    }
    return stop;
  },

  getTrafficSituation: function (stopId, resolve, reject) {
    let self = this;
    let trafficSituations = {};
    debug("Getting traffic situation for stop id: " + stopId);
    if (self.accessToken) {
      debug("Access token retrived: Calling traffic situation");
      let options = {
        method: "GET",
        uri:
          "https://api.vasttrafik.se/ts/v1/traffic-situations/stoparea/" +
          stopId,
        headers: {
          Authorization: "Bearer " + self.accessToken.token,
        },
        json: true,
      };

      request(options)
        .then(function (response) {
          debug("Traffic situation for stop id: " + stopId + " retrived");
          let trafficSituations = self.getTrafficSituationDto(stopId, response);

          debug(
            trafficSituations
              ? "Traffic situations found for " + stopId
              : "No traffic situations for" + stopId
          );
          debug("Traffic situations response: " + JSON.stringify(response));
          resolve({
            stopId: stopId,
            trafficSituations: trafficSituations,
          });
        })
        .catch(function (error) {
          log("getTrafficSituation failed =" + error);
          if (error.statusCode == 401) self.getAccessToken();
        });
    } else {
      log("Missing access token..");
      reject();
    }
  },

  getTrafficSituationDto: function (stopId, trafficSituationsDto) {
    if (
      trafficSituationsDto &&
      Array.isArray(trafficSituationsDto) &&
      trafficSituationsDto.length > 0
    ) {
      let trafficSituations = [];
      for (let i = 0; i < trafficSituationsDto.length; i++) {
        let trafficSituation = {
          stopId: stopId,
          title: trafficSituationsDto[i].title,
          description: trafficSituationsDto[i].description,
          severity: trafficSituationsDto[i].severity,
          endTime: trafficSituationsDto[i].endTime,
          startTime: trafficSituationsDto[i].startTime,
          active: isDateBetween(
            trafficSituationsDto[i].startTime,
            trafficSituationsDto[i].endTime,
            new Date(Date.now())
          ),
        };
        trafficSituations.push(trafficSituation);
      }
      return sortByKey(trafficSituations, "active");
    }
    return null;
  },

  getTrafficSituations: function () {
    let self = this;

    clearInterval(this.updateTimerTrafficSituations); // Clear the timer so that we can set it again

    debug("stationid is array=" + Array.isArray(this.config.myStops));
    let Proms = [];
    // Loop over all stations
    this.config.myStops.forEach((myStop) => {
      let P = new Promise((resolve, reject) => {
        self.getTrafficSituation(myStop.id, resolve, reject);
      });
      debug("Pushing promise for traffic situations for " + myStop.id);
      Proms.push(P);
    });

    Promise.all(Proms)
      .then((TrafficSituationArray) => {
        debug("all promises resolved " + TrafficSituationArray);
        self.sendSocketNotification("TRAFFICSITUATION", TrafficSituationArray); // Send traffic situations to module
      })
      .catch((reason) => {
        log("One or more promises rejected " + reason);
        self.sendSocketNotification("SERVICE_FAILURE", reason);
      });

    self.scheduleUpdateTrafficSituations(); // reinitiate the timer
  },

  // --------------------------------------- Handle notifications
  socketNotificationReceived: async function (notification, payload) {
    const self = this;
    log("socketNotificationReceived");
    if (notification === "CONFIG" /*&& this.started == false*/) {
      log("CONFIG event received");
      this.config = payload;
      this.started = true;
      debugMe = this.config.debug;
      if (!self.accessToken) {
        await self.getAccessToken(); // Get inital access token
      }
      self.getStops(); // Get it first time
      if (!self.updatetimer) {
        self.scheduleUpdate();
      }

      if (this.config.trafficSituations) {
        self.getTrafficSituations(); // Get traffic situations first time
      }

      if (!self.updateTimerTrafficSituations && this.config.trafficSituations) {
        self.scheduleUpdateTrafficSituations();
      }
    }
  },
});

//
// Utilities
//
function filterBoard(array, attr, keys) {
  return array.filter(item => keys.includes(item[attr]));
}

function sortByKey(array, key) {
  return array.sort(function (a, b) {
    let x = a[key];
    let y = b[key];
    return x < y ? -1 : x > y ? 1 : 0;
  });
}

function diffInMin(estimatedTimeStr, now) {
  let estTime = new Date(estimatedTimeStr);
  let diff = Math.abs(estTime - now);
  return Math.ceil(diff/1000/60);
}

function isDateBetween(fromDate, toDate, dateToCheck) {
  return dateToCheck > fromDate && dateToCheck < toDate;
}

// --------------------------------------- At beginning of log entries
function logStart() {
  return (
    new Date(Date.now()).toLocaleTimeString() +
    " MMM-Vasttrafik-PublicTransport: "
  );
}

// --------------------------------------- Logging
function log(msg) {
  console.log(logStart() + msg);
}
// --------------------------------------- Debugging
function debug(msg) {
  if (debugMe) console.debug(msg);
}
