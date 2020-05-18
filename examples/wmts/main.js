import MetOClient from '@fmidev/metoclient';

fetch('./config.json')
  .then((response) => {
    return response.json();
  })
  .then((options) => {
    const metoclient = new MetOClient(options);
    metoclient
      .render()
      .then((map) => {
        // Play the animation
        // metoclient.play({
        //   delay: 1000,
        //   time: Date.now(),
        // });
      })
      .catch((err) => {
        (console.error || console.log).call(console, err.stack || err);
      });
  });
