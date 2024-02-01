/* MMM-Vasttrafik-PublicTransport.js - DRAFT
 *
 * Magic Mirror module - Display public transport depature board for V�sttrafik/Sweden.
 * This module use the API's provided by V�sttrafik (https://developer.vasttrafik.se).
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

Module.register("MMM-Vasttrafik-PublicTransport", {
  // Default module config.
  defaults: {
    myStops: [{id: "9021014001950000", filterAttr: null, filterKeys: [null]}], //Centralstationen, Göteborg
    appKey: "",
    appSecret: "",
    debug: false,
    sortBy: "track",
    refreshRate: "60000",
    trafficSituations: false,
    board: {
      destination: {
        maxPxWidth: null,
      },
    },
    showTrackNumbers: true,
    showStopHeader: true,
    showDestinationName: true,
    enableDepartureTimeColors: false
  },

  getScripts: function () {
    return ["moment.js"];
  },

  getTranslations: function () {
    return {
      en: "translations/en.json",
      sv: "translations/sv.json",
    };
  },

  getStyles: function () {
    return [this.file("/css/board.css")];
  },

  start: function () {
    Log.info("Starting module: " + this.name);
    this.renderBoard();

    //Send config to node_helper
    Log.info("Send configs to node_helper..");
    this.sendSocketNotification("CONFIG", this.config);
  },

  getDom: function () {
    Log.info("getDom triggered");
    let wrapper = document.createElement("div");
    wrapper.className = "departure-board";
    if (!this.loaded && !this.failure) {
      wrapper.innerHTML =
        "<img src='http://seekvectorlogo.com/wp-content/uploads/2018/07/vasttrafik-ab-vector-logo-small.png'></img>";
      return wrapper;
    }
    if (this.failure) {
      wrapper.innerHTML = "Connection to Västtrafik failed. Please review logs";
      wrapper.className = "dimmed light small";
      return wrapper;
    }
    if (this.stops) {
      for (let i = 0; i < this.stops.length; i++) {
        let stop = this.stops[i];
        if (this.config.showStopHeader) {
          let header = document.createElement("div");
          header.innerHTML = " <b>" + stop.name + "</b>";
          header.className = "light small";
          wrapper.appendChild(header);
        }
        //Situations
        if (this.config.trafficSituations) {
          let trafficSituationContainer = document.createElement("div");
          trafficSituationContainer.id =
            "departure-traffic-situation-container-" + stop.stopId;
          if (this.config.trafficSituations && this.trafficSituationsLoaded) {
            let situtation = this.trafficSituations.find((obj) => {
              return obj.stopId === stop.stopId;
            });
            if (situtation && situtation.trafficSituations) {
              trafficSituationContainer.innerHTML = this.generateTrafficSituations(
                situtation.trafficSituations
              );
            }
          }
          wrapper.appendChild(trafficSituationContainer);
        }
        let tableContainer = document.createElement("div");
        tableContainer.id = "departure-table-container-" + stop.stopId;
        tableContainer.innerHTML = this.generateDepartureTable(stop);
        wrapper.appendChild(tableContainer);
      }
      this.depratureTablesLoaded = true;
      return wrapper;
    }
  },

  generateTrafficSituations: function (trafficSituations) {
    let trafficSituation = document.createElement("div");
    let text = "";
    for (let i = 0; i < trafficSituations.length; i++) {
      text += trafficSituations[i].title + trafficSituations[i].description;
    }
    trafficSituation.innerHTML =
      '<marquee behavior="scroll" direction="left" class="small">' +
      text +
      "</marquee>";
    return trafficSituation.outerHTML;
  },
  generateDepartureTable: function (stop) {
    let table = document.createElement("table");
    table.className = "small departure-table";
    let row = document.createElement("tr");
    let th = document.createElement("th");
    th = document.createElement("th");
    th.innerHTML = this.translate("LINE");
    th.className = "align-left";
    row.appendChild(th);
    if (this.config.showDestinationName) {
      th = document.createElement("th");
      th.innerHTML = "";
      th.className = "align-left";
      row.appendChild(th);
    }
    th = document.createElement("th");
    th.innerText = this.translate("NEXT");
    row.appendChild(th);
    row.appendChild(th);
    th = document.createElement("th");
    th.innerHTML = this.translate("UPCOMING");
    row.appendChild(th);
    if (this.config.showTrackNumbers) {
      th = document.createElement("th");
      th.innerHTML = this.translate("TRACK");
      th.className = "align-left";
      row.appendChild(th);
    }
    table.appendChild(row);
    for (let n = 0; n < stop.lines.length; n++) {
      let line = stop.lines[n];
      let row = document.createElement("tr");
      let td = document.createElement("td");
      td = document.createElement("td");
      let div = document.createElement("div");
      div.className = "departure-designation";
      div.style = "background-color:" + line.bgColor;
      let span = document.createElement("span");
      span.style = "color:" + line.color;
      span.textContent = line.line;
      div.appendChild(span);
      td.appendChild(div);
      row.appendChild(td);
      if (this.config.showDestinationName) {
        td = document.createElement("td");
        div = document.createElement("div");
        div.innerText = line.direction;
        if (this.config.board.destination.maxPxWidth) {
          div.style =
            "max-width:" +
            this.config.board.destination.maxPxWidth +
            "px !important";
        }
        div.className = "destination-name";
        td.appendChild(div);
        row.appendChild(td);
      }
      td = document.createElement("td");
      td.innerHTML = this.getDisplayTime(line.departureIn);
      td.style = this.getDepartureTimeStyle(line.departureIn);
      row.appendChild(td);
      td = document.createElement("td");
      td.innerHTML = this.getDisplayTime(line.nextDeparture);
      td.style =  this.getDepartureTimeStyle(line.nextDeparture);
      row.appendChild(td);
      if (this.config.showTrackNumbers) {
        td = document.createElement("td");
        td.style = "text-align: center;";
        td.innerHTML = line.track;
        row.appendChild(td);
      }
      table.appendChild(row);
    }

    return table.outerHTML;
  },
  getDepartureTimeStyle: function(time){
    if(this.config.enableDepartureTimeColors && this.config.departureTimeColors){
      let departureTimeColor = this.config.departureTimeColors.find((x) => x.max >= time && x.min <= time);
      if(departureTimeColor)
        return "text-align: center; color: "+departureTimeColor.color;
    }
    return "text-align: center;";
  },
  renderBoard: function () {
    if (
      this.domObjectCreated &&
      this.loaded &&
      this.trafficSituationsLoaded &&
      this.depratureTablesLoaded
    ) {
      this.stops.forEach((stop) => {
        let tableContainer = document.getElementById(
          "departure-table-container-" + stop.stopId
        );
        if (tableContainer) {
          tableContainer.innerHTML = this.generateDepartureTable(stop);
        }
      });
    } else {
      this.updateDom();
    }
  },

  renderTrafficSituations: function () {
    if (
      this.domObjectCreated &&
      this.loaded &&
      this.trafficSituationsLoaded &&
      this.depratureTablesLoaded &&
      this.config.trafficSituation
    ) {
      this.stops.forEach((stop) => {
        let situationContainer = document.getElementById(
          "departure-traffic-situation-container-" + stop.stopId
        );
        if (situationContainer) {
          if (this.config.trafficSituations && this.trafficSituationsLoaded) {
            let situtation = this.trafficSituations.find((obj) => {
              return obj.stopId === stop.stopId;
            });
            if (situtation && situtation.trafficSituations) {
              situationContainer.innerHTML = this.generateTrafficSituations(
                situtation.trafficSituations
              );
            }
          }
        }
      });
    } else {
      this.updateDom();
    }
  },

  // --------------------------------------- Handle socketnotifications
  socketNotificationReceived: function (notification, payload) {
    Log.info(
      "socketNotificationReceived: " + notification + ", payload: " + payload
    );
    if (notification === "STOPS") {
      this.loaded = true;
      this.failure = undefined;
      // Handle payload
      this.stops = payload;
      this.renderBoard();
    } else if (notification === "TRAFFICSITUATION") {
      this.trafficSituationsLoaded = true;
      // Handle payload
      this.trafficSituations = payload;
      this.renderTrafficSituations();
    } else if (notification == "SERVICE_FAILURE") {
      this.loaded = true;
      this.failure = payload;
      if (payload) {
        Log.info(
          "Service failure: " +
            this.failure.resp.StatusCode +
            ":" +
            this.failure.resp.Message
        );
        this.renderBoard();
      }
    }
  },
  notificationReceived: function (notification, payload, sender) {
    if (notification == "DOM_OBJECTS_CREATED") {
      this.domObjectCreated = true;
    }
  },
  // --------------------------------------- Get depature display time
  getDisplayTime: function (min) {
    if (min == undefined) {
      return this.translate("UNDEFINED");
    } else if (min == 0) {
      return this.translate("NOW");
    } else {
      return min;
    }
  },
});
