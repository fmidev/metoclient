import MetOClient from '@fmidev/metoclient';

fetch('./config.json').then(response => {
  return response.json();
}).then((options) => {
  const metoclient = new MetOClient(options);
  metoclient.render().then(function (map) {
  }).catch(err => {
    (console.error || console.log).call(console, err.stack || err);
  });
});
