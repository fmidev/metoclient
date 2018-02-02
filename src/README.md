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


