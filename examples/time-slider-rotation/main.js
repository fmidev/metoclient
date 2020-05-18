import MetOClient from '@fmidev/metoclient';

fetch('./config.json')
  .then((response) => {
    return response.json();
  })
  .then((options) => {
    const metoclient = new MetOClient(options);
    metoclient
      .render()
      .then(function (map) {
        const timeSlider = metoclient.get('timeSlider').element;
        document
          .querySelector('.fmi-metoclient-timeslider-step-button:first-child')
          .addEventListener('click', function () {
            console.log('rotate');
            timeSlider.classList.toggle('rotated');
          });
      })
      .catch((err) => {
        (console.error || console.log).call(console, err.stack || err);
      });
  });
