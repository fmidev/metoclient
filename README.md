# MetOClient

Map animator library

## User's Guide

Recommended method is to use npm and Webpack.

    import {MetOClient} from 'metoclient';

It is also possible to link with `script` tag to a build with or without global OpenLayers objects.

### Global example usage

Pseudo configuration and usage:

    var config = {
        project: 'weather',
        layers: [], // Your layers here
        container: 'animator-div-id',
        // Other options here
        localization: {
            locale: 'fi'
        }
    }
    var weatherMap = new fi.fmi.metoclient.MetOClient(config);
    weatherMap.createAnimation({loaded: function() {}});

### More examples

Example directory: [examples/](examples/)

Use configuration option `mapLoader: 'all'` to preload all time step data, but be aware that this might be too resource-intensive task for some devices.

### API

List of API functions:

* createAnimation(callbacks)
    * possible event functions as callbacks
        * center(x,y)
        * deselected(feature)
        * hover(feature)
        * init()
        * loaded()
        * loadedOnce()
        * loadError(params)
        * marker(x,y)
        * popupClosed()
        * preload()
        * ready()
        * refreshed()
        * rotation(angle)
        * selected(feature)
        * time(timestamp_ms)
        * timeSliderCreated(moments)
        * toolClicked(name)
        * unhover(feature)
        * zoom(level)
* updateAnimation(options, callbacks)
    * possible options properties
        * animationTime
        * beginTime
        * endTime
        * frameRate
        * layers
        * layersChanged
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
* getAnimationTimes()
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
* selectFeature(feature)
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
* showPopup(content,x,y,append)
* stop()

More information: [build/jsdoc/MetOClient.html](build/jsdoc/MetOClient.html)


In static build, OpenLayers 4 functionality is also available to the extent that is included in the build. This can be optimized depending on project needs. However, it is more convenient to use both MetOClient and OpenLayers (if needed) as ES6 modules with Webpack.

### Static functions

* fi.fmi.metoclient.MetOClient.createMenu(options)
* fi.fmi.metoclient.MetOClient.floorTime(time_ms,resolution_ms,timeZone)
* fi.fmi.metoclient.MetOClient.transformCoordinates(fromProjection, toProjection, coordinates)

## Development

### Prerequisites

* Node.js 6 or greater (default executable `node` defined in package.js)
* Npm package manager

### Building

* npm install
* npm run build

### Running tests

* npm run test

### Generating documentation and examples

* npm run doc
* npm run examples

### Class documentation

Full documentation: [build/jsdoc/index.html](build/jsdoc/index.html)
