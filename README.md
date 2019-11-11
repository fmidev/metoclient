# MetOClient

Map animator library based on OpenLayers 6


## Examples

Basic usage with a module bundler:

    import {MetOClient} from 'metoclient/src/MetOClient';
    
    fetch('./config.json').then(response => {
      return response.json();
    }).then((options) => {
      const metoclient = new MetOClient(options);
      metoclient.render().then(function () {
        metoclient.play({
          delay: 1000,
          time: Date.now()
        });
      }).catch(err => {
        (console.error || console.log).call(console, err.stack || err);
      });
    });

Also full build is available:

      var metoclient = new fmi.metoclient.MetOClient(options)
      metoclient.render().then(function () {
        var map = metoclient.get('map');
        map.addControl(new ol.control.FullScreen());
      })

For configuration see the examples directory.

## API

* render()
* play()
* pause()
* previous()
* next()
* get('map')
* get('options')
* set('options', options) // Triggers refresh
