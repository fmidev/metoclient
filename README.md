# MetOClient

WMS animator library and UI

## User's Guide

Recommended method is to use npm and Webpack.

    import {MetOClient} from 'metoclient';

It is also possible to link with `script` tag to a build with or without global OpenLayers objects.

### Global example usage

    var config = {
        project: 'weather',                
        map: {
            model: {
                layers: [
                   ...
                ]
            },
            view: {
                container: "animator-div-id"
            }
        },
        time: {
            model: {},
            view: {}
        },
        localization: {
            locale: 'fi'
        }
    }
    var weatherMap = new fi.fmi.metoclient.MetOClient(config);
    weatherMap.createAnimation({zoom: function(level) {}});

### More examples

Example directory: [examples/](examples/)

### API

* createAnimation(callbacks)
    * possible event functions as callbacks
        * center(x,y)
        * init()
        * loaded()
        * loadError(params)
        * marker(x,y)
        * popupClosed()
        * preload()
        * rotation(angle)
        * time(timestamp_ms)
        * zoom(level)
* updateAnimation(options, callbacks)
    * possible options properties
        * animationTime
        * beginTime
        * endTime
        * layers
        * timeStep
        * timeZone
        * timeZoneLabel
    * callbacks, see createAnimation     
* addFeatures(layerTitle,projection,optionsArray)        
* clearFeatures(layerTitle)
* createTimeSlider()        
* destroyAnimation()
* destruct()
* getFeatures(layerTitle)        
* getFeaturesAt(layerTitle,x,y,tolerance_pix)        
* getLayer(layerTitle)        
* getMap()        
* getStaticControls()
* getTime()
* hidePopup()
* next()
* pause()
* play()
* previous()
* refresh(callbacks)
* refreshMap()
* requestViewUpdate()
* setBeginTime(time)
* setCallbacks(callbacks)
* setCapabilities(urlMap)
* setCenter(x,y)
* setDayStartOffset(timestamp_ms)
* setEndTime(time)
* setInteractions(options)
* setLayerVisible(layerTitle,visibility)
* setRotation(angle)
* setStaticControls(enabled)
* setTime(timestamp_ms)
* setTimeRate(rate_ms)
* setTimeStep(timeStep)
* setZoom(level)
* showPopup(content,x,y)
* stop()

In static build, OpenLayers 4 functionality is also available to the extent that is included in the build. This can be optimized depending on project needs. However, it is more convenient to use both MetOClient and OpenLayers (if needed) as ES6 modules with Webpack.

### Static functions

* fi.fmi.metoclient.MetOClient.floorTime(time_ms,resolution_ms,timeZone)

## Development

### Prerequisites

* Node.js 6 or greater (default executable `node` defined in package.js)
* Npm package manager

### Building

* npm install
* npm run build-all

### Running tests

* npm run test

### Generating documentation and examples

* npm run doc
* npm run examples

### Class documentation

Full documentation: [build/jsdoc/index.html](build/jsdoc/index.html)
