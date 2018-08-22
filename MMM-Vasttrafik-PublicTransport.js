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
        stopId: "9021014007270000"
    },

    getScripts: function () {
        return ["moment.js"];
    },

    start: function () {
        Log.info("Starting module: " + this.name);
        this.getDom();
    },

    getDom: function () {
        var wrapper = document.createElement("div");
        wrapper.innerHTML = "Nästa tur för " + this.config.stopId;
        return wrapper;
    }

    /*getTemplate: function () {
        return "board.njk"
    },

    getTemplateData: function () {
        return this.config
    }*/
});