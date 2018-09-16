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
        stopIds: ["9021014001950000"], //Centralstationen, Göteborg
        appKey: "",
        appSecret: "",
        debug: false,
        sortBy: "track",
        refreshRate: "60000"
    },

    getScripts: function () {
        return [
            "moment.js"
        ];
    },

    getTranslations: function () {
        return {
            en: "translations/en.json",
            sv: "translations/sv.json"
        }
    },

    getStyles: function () {
        return [
            this.file('/css/board.css')
        ]
    },

    start: function () {
        Log.info("Starting module: " + this.name);
        this.updateDom();

        //Send config to node_helper
        Log.info("Send configs to node_helper..");
        this.sendSocketNotification("CONFIG", this.config);
        var self = this;
    },

    getDom: function () {
        Log.info("getDom triggered");
        var wrapper = document.createElement("div");
        if (!this.loaded && !this.failure) {
            wrapper.innerHTML = "<img src='http://seekvectorlogo.com/wp-content/uploads/2018/07/vasttrafik-ab-vector-logo-small.png'></img>"
            return wrapper;
        }
        if (this.failure) {
            wrapper.innerHTML = "Connection to Västtrafik failed. Please review logs";
            wrapper.className = "dimmed light small";
            return wrapper;
        }
        if (this.stops) {
            for (var i = 0; i < this.stops.length; i++) {
                var stop = this.stops[i];
                var header = document.createElement("div");
                header.innerHTML = " <b>" + stop.name + "</b>";
                header.className = "light small";
                wrapper.appendChild(header);
                var table = document.createElement("table");
                table.className = "small departure-board";
                var row = document.createElement("tr");
                var th = document.createElement("th");
                th.innerHTML = this.translate("LINE");
                th.className = 'align-left';
                row.appendChild(th);
                th = document.createElement("th");
                th.innerHTML = ""
                th.className = 'align-left';
                row.appendChild(th);
                th = document.createElement("th");
                th.innerText = this.translate("NEXT");
                row.appendChild(th);
                row.appendChild(th);
                th = document.createElement("th");
                th.innerHTML = this.translate("UPCOMING");
                row.appendChild(th);
                table.appendChild(row);
                th = document.createElement("th");
                th.innerHTML = this.translate("TRACK");
                th.className = 'align-left';
                row.appendChild(th);
                for (var n = 0; n < stop.lines.length; n++) {
                    var line = stop.lines[n];
                    var row = document.createElement("tr");
                    row.style = "min-widtgh:50px"
                    var td = document.createElement("td");
                    var div = document.createElement("div");
                    div.className = "departure-designation";
                    div.style = "background-color:" + line.bgColor;
                    var span = document.createElement("span");
                    span.style = "color:" + line.color;
                    span.textContent = line.line;
                    div.appendChild(span);
                    td.appendChild(div);
                    row.appendChild(td);
                    var td = document.createElement("td");
                    td.innerHTML = line.direction;
                    row.appendChild(td);
                    var td = document.createElement("td");
                    td.innerHTML = this.getDisplayTime(line.departureIn);
                    td.style = "text-align: center;"
                    row.appendChild(td);
                    var td = document.createElement("td");
                    td.innerHTML = this.getDisplayTime(line.nextDeparture);
                    td.style = "text-align: center;"
                    row.appendChild(td);
                    var td = document.createElement("td");
                    td.style = "text-align: center;"
                    td.innerHTML = line.track;
                    row.appendChild(td);
                    table.appendChild(row);
                };
                wrapper.appendChild(table);
            }
            return wrapper;
        }
    },

    // --------------------------------------- Handle socketnotifications
    socketNotificationReceived: function (notification, payload) {
        Log.info("socketNotificationReceived: " + notification + ", payload: " + payload);
        if (notification === "STOPS") {
            this.loaded = true;
            this.failure = undefined;
            // Handle payload
            this.stops = payload;
            this.updateDom();
        }
        else if (notification == "SERVICE_FAILURE") {
            this.loaded = true;
            this.failure = payload;
            if (payload) {
                Log.info("Service failure: " + this.failure.resp.StatusCode + ':' + this.failure.resp.Message);
                this.updateDom();
            }
        }
    },

    // --------------------------------------- Get depature display time
    getDisplayTime: function (min) {
        if (min == undefined) {
            return this.translate("UNDEFINED");
        }
        else if (min == 0) {
            return this.translate("NOW");
        }
        else {
            return min;
        }

    }
});