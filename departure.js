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
function Departure(data) {
    this.name = data.name;
    this.line = data.sname;
    this.type = data.type;
    this.stop = data.stop;
    this.time = data.time;
    this.date = data.date;
    this.journeyid = data.journeyid;
    this.direction = data.direction;
    this.track = data.track;
    this.rtTime = data.rtTime;
    this.rtDate = data.rtDate;
    this.fgColor = data.fgColor;
    this.bgColor = data.bgColor;
    this.accessibility = data.accessibility;
}

Departure.prototype.ToString = function () {
    return this.name;
}

module.exports = Departure;


//<Departure name="Spårvagn 2" sname="2" type="TRAM" stopid="9022014007270001" stop="Varbergsgatan, Göteborg" time="23:36" date="2018-08-24" journeyid="9015014500200258" direction="Högsbotorp" track="A" rtTime="23:36" rtDate="2018-08-24" fgColor="#fff014" bgColor="#00394d" stroke="Solid" accessibility="wheelChair">