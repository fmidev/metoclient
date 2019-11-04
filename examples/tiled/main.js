import { MetOClient } from 'metoclient/src/MetOClient';

fetch('./config.json').then(response => {
  return response.json();
}).then((options) => {
  const metoclient = new MetOClient(options);
  metoclient.render().then(function () {
    // OpenLayers 6 map can be utilized
    let map = metoclient.get('map');
    // Play the animation
    metoclient.play({
      delay: 1000,
      time: Date.now()
    });
  }).catch(err => {
    (console.error || console.log).call(console, err.stack || err);
  });
});
