# MetOClient

Weather map animator library utilizing open WMS and WFS data of the Finnish Meteorological Institute.

Pseudo configuration and usage:

```
    import {MetOClient} from '@fmidev/metoclient';

    var config = {
        project: 'weather',                
        layers: [], // Your layers here
        container: 'animator-div-id',
        // Other options here
        localization: {
            locale: 'fi'
        }
    }
    var weatherMap = new MetOClient(config);
    weatherMap.createAnimation({loaded: function() {}});
```

### API

List of API methods:

* createAnimation(callbacks)
    * possible event functions as callbacks
        * animationFeatures()
        * center(x, y)
        * deselected(feature)
        * hover(feature)
        * init()
        * loaded()
        * loadedOnce()
        * loadError(params)
        * marker(x, y)
        * newAnimationFeature(feature)
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
* addFeatures(layerTitle, projection, optionsArray)
* clearFeatures(layerTitle)
* createTimeSlider()
* destroyAnimation()
* destruct()
* getFeatures(layerTitle, invisible)
* getFeaturesAt(layerTitle, x, y, tolerance_pix)
* getLayer(layerTitle)
* getLayerConfigs()
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
* setLayerVisible(layerTitle, visibility)
* setMarkerVisible(visibility)
* setRotation(angle)
* setStaticControls(enabled)
* setTime(timestamp_ms)
* setTimeRate(rate_ms)
* setTimeStep(timeStep)
* setZoom(level)
* showPopup(content, x, y, append)
* stop()
