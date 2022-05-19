import MetOClient from '@fmidev/metoclient';
import options from './config.json';

const metoclient = new MetOClient(options);
metoclient
  .render()
  .then(function () {
    // Play the animation
    metoclient.play({
      delay: 1000,
      time: Date.now(),
    });
  })
  .catch((err) => {
    (console.error || console.log).call(console, err.stack || err);
  });
