# MMM-Vasttrafik-PublicTransport
[Magic Mirror](https://magicmirror.builders/) Module - Display public transport operated by Västtrafik for western part of Sweden, including Gothenburg. This module use the API's provided by [Västtrafik](https://www.vasttrafik.se).

## Prerequisites
### 1. Create application and obtain required client id and secret
You need to obtain your own application key and secret from Västtrafik by creating a new application.

1. Navigate to [https://developer.vasttrafik.se](https://developer.vasttrafik.se) and create your own developer account.
2. Create new application under [https://developer.vasttrafik.se/portal/#/applications](https://developer.vasttrafik.se/portal/#/applications)

### 2. Create application subscription 
You need to obtain application subscription for [Reseplaneraren v2](https://developer.vasttrafik.se/portal/#/api/Reseplaneraren/v2/landerss/direct)

1. Navigate to [https://developer.vasttrafik.se/portal/#/subscriptions](https://developer.vasttrafik.se/portal/#/subscriptions)
2. Create new subscription for your newly created application so that we can queary Reseplaneraren v2.

### 3. Get stops that you want to track
Last thing todo is to find the required stop id:s that you would like to track. 

1. Navigate to the API consol for [Reseplaneraren v2](https://developer.vasttrafik.se/portal/#/api/Reseplaneraren/v2/landerss)
2. Use any of the location endpoints to obatin the stop id. 

Exampel request url:
```
https://api.vasttrafik.se/bin/rest.exe/v2/location.name?input=centralstationen
```
Response:
```
<?xml version="1.0" encoding="UTF-8"?>
<LocationList xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://api.vasttrafik.se/v1/hafasRestLocation.xsd" servertime="20:36" serverdate="2018-09-16">
<StopLocation name="Centralstationen, Göteborg" lon="11.973740" lat="57.707898" id="9021014001950000" idx="1"/>
...
</LocationList>
```
## Install
1. Clone repository into ``../modules/`` inside your MagicMirror folder.
2. Run ``npm install`` inside ``../modules/MMM-Vasttrafik-PublicTransport/`` folder
3. Add the module to the MagicMirror config

## Update
1. Run ``git pull`` inside ``../modules/MMM-Vasttrafik-PublicTransport/`` folder.
2. Run ``npm install`` inside ``../modules/MMM-Vasttrafik-PublicTransport/`` folder

## Configuration
```
modules: [
    ...
    {
            module: 'MMM-Vasttrafik-PublicTransport',
            position: 'bottom_left',
            header: "Västtrafik",
            config: {
                stopIds: ["your_stop_ids"],		// REQUIRED. An array of stop is's. Your are required to have at least one stop. 
												// see 3. Get stops that you want to track.
                appKey: "your_app_key",			// REQUIRED. see 1. Create application and obtain required client id and secret.
                appSecret: "your_app_secret",	// REQUIRED. see 1. Create application and obtain required client id and secret.
                debug: false,					// Optional. Enable some extra output when debugging.
                sortBy: "track"					// Optional. Sort your departure board by either "track", "direction", "line" or "type"
												// default is "track".
				refreshRate: "20000"			// Optional. Refresh rate int milliseconds, default is 60 seconds, 
            }
        },
    ...
]
```

## Screenshot

![SL PublicTransport Module](https://github.com/boghammar/MMM-SL-PublicTransport/blob/master/docs/MMMScreenshot2.PNG)

