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

Module.register("MMM-Vasttrafik-PublicTransport", {

    // Default module config.
    defaults: {
        stopId: "9021014007270000",
        appKey: "",
        appSecret: "",
        debug: false
    },

    getScripts: function () {
        return ["moment.js"];
    },

    getHeader: function () {
        var stopId = this.config.stopId;
        return this.data.header + " " + stopId;
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
        wrapper.style = "width: 100%;min-width: 268px;max-width:500px; max-height: 100%;background-color: #3c4550;display: flex;flex-direction: column;"
        if (!this.loaded && !this.failure) {
            wrapper.innerHTML = "<img src='http://seekvectorlogo.com/wp-content/uploads/2018/07/vasttrafik-ab-vector-logo-small.png'></img>"
            return wrapper;
        }
        if (this.failure) {
            wrapper.innerHTML = "Connection to Västtrafik failed. Please review logs";
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        var table = document.createElement("table");
        table.className = "xsmall";

        if (this.stop) {

            if (this.stop) {
                var row = document.createElement("tr");
                var th = document.createElement("th");
                th.innerText = this.stop.$.serverdate + " " + this.stop.$.servertime+", " + this.stop.$.name;
                th.className = 'align-left';
                row.appendChild(th);
                table.appendChild(row);
            }


            var row = document.createElement("tr");
            var th = document.createElement("th");
            th.innerHTML = "Linje&nbsp;"
            th.className = 'align-left';
            row.appendChild(th);
            th = document.createElement("th");
            th.innerHTML = "Destination"
            th.className = 'align-left';
            row.appendChild(th);
            th = document.createElement("th");
            th.innerHTML = "Läge"
            th.className = 'align-left';
            row.appendChild(th);
            th = document.createElement("th");
            th.innerHTML = "Avgår"
            row.appendChild(th);
            table.appendChild(row);
            for (var i = 0; i < this.stop.Departure.length; i++) {
                var dep = this.stop.Departure[i].$;
                var row = document.createElement("tr");
                var td = document.createElement("td");
                td.style = "text-align: center; width: 60px; padding-right: 2px;";
                var span = document.createElement("span");
                span.style = "color:" + dep.bgColor + ";background-color:" + dep.fgColor;
                span.textContent = dep.sname;
                td.appendChild(span);
                row.appendChild(td);
                var td = document.createElement("td");
                td.innerHTML = dep.direction;
                row.appendChild(td);
                var td = document.createElement("td");
                td.innerHTML = dep.track;
                row.appendChild(td);
                var td = document.createElement("td");
                td.innerHTML = dep.rtTime ? dep.rtTime : dep.time;
                row.appendChild(td);
                table.appendChild(row);
            };
            wrapper.appendChild(table);
            return wrapper;
        }
    },

    // --------------------------------------- Handle socketnotifications
    socketNotificationReceived: function (notification, payload) {
        Log.info("socketNotificationReceived: " + notification + ", payload: " + payload);
        if (notification === "DEPARTURES") {
            this.loaded = true;
            this.failure = undefined;
            // Handle payload
            this.stop = payload;
            Log.info("");
            this.updateDom();
        }
        else if (notification == "SERVICE_FAILURE") {
            this.loaded = true;
            this.failure = payload;
            Log.info("Service failure: " + this.failure.resp.StatusCode + ':' + this.failure.resp.Message);
            this.updateDom();
        }
    }
});