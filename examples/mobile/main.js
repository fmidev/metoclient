import MetOClient from '@fmidev/metoclient';

Promise.all(
  ['./config1h.json', './config2h.json', './config3h.json'].map((url) =>
    fetch(url).then((response) => response.json())
  )
).then((options) => {
  const metoclient = new MetOClient(options[0]);
  metoclient
    .render()
    .then(function () {
      let map = metoclient.get('map');
      let timeSlider = metoclient.get('timeSlider');
      let timeStepButton = document.getElementsByClassName(
        'fmi-metoclient-timeslider-step-button'
      )[0];
      let timeOptions = document.getElementById('fmi-animation-time-options');
      timeOptions.style.display = 'none';
      let timeOption1h = document.getElementById('fmi-time-option-1h');
      let timeOption2h = document.getElementById('fmi-time-option-2h');
      let timeOption3h = document.getElementById('fmi-time-option-3h');
      let timeView = document.getElementById('fmi-animation-time');
      timeView.textContent = timeSlider.getClock();
      map.on('change:time', function (event) {
        timeView.textContent = timeSlider.getClock();
      });
      timeStepButton.addEventListener('click', function () {
        timeOptions.style.display =
          timeOptions.style.display === 'none' ? 'block' : 'none';
      });
      timeOption1h.addEventListener('click', function () {
        if (!timeOption1h.classList.contains('selected')) {
          timeOption1h.classList.add('selected');
          timeOption2h.classList.remove('selected');
          timeOption3h.classList.remove('selected');
          metoclient.set('options', options[0]);
        }
      });
      timeOption2h.addEventListener('click', function () {
        if (!timeOption2h.classList.contains('selected')) {
          timeOption1h.classList.remove('selected');
          timeOption2h.classList.add('selected');
          timeOption3h.classList.remove('selected');
          metoclient.set('options', options[1]);
        }
      });
      timeOption3h.addEventListener('click', function () {
        if (!timeOption3h.classList.contains('selected')) {
          timeOption1h.classList.remove('selected');
          timeOption2h.classList.remove('selected');
          timeOption3h.classList.add('selected');
          metoclient.set('options', options[2]);
        }
      });
    })
    .catch((err) => {
      (console.error || console.log).call(console, err.stack || err);
    });
});
