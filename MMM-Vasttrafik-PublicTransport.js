import { log } from "util";

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
        if (this.failure) {
            wrapper.innerHTML = "Service failure: " + this.failure.resp.StatusCode + ':' + this.failure.resp.Message;
        }
        else if (this.accessToken) {
            wrapper.innerHTML = "Access token retrived: " + this.accessToken.token + ", expiers in: " + this.accessToken.expires_in;
        }
        else {
            wrapper.innerHTML = "App started..."
        }

        return wrapper;
    },

    // --------------------------------------- Handle socketnotifications
    socketNotificationReceived: function (notification, payload) {
        Log.info("socketNotificationReceived: " + notification + ", payload: " + payload);
        if (notification === "TOKEN_RECIVED") {
            this.loaded = true;
            this.failure = undefined;
            // Handle payload
            this.accessToken = payload;
            Log.info("Access token retrived: " + this.accessToken.token + ", expiers in: " + this.accessToken.expires_in);
            this.updateDom();
        }
        if (notification == "SERVICE_FAILURE") {
            this.loaded = true;
            this.failure = payload;
            Log.info("Service failure: " + this.failure.resp.StatusCode + ':' + this.failure.resp.Message);
            this.updateDom();
        }
    }
});