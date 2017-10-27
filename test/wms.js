casper.options.viewportSize = {width: 1200, height: 500};
casper.options.verbose = true;
casper.options.logLevel = "debug";
casper.on('page.error', function (msg, trace) {
  this.echo('Error: ' + msg, 'ERROR')
  for (var i = 0; i < trace.length; i++) {
    var step = trace[i]
    this.echo('   ' + step.file + ' (line ' + step.line + ')', 'ERROR')
  }
})
casper.test.begin('WMS test', function (test) {

  casper.start('test/index.html', function() {
    casper.waitForSelector('.fmi-animator');
  });

  casper.waitUntilVisible('#fmi-map-layer-switcher', function success () {
    test.assertVisible('#fmi-map-layer-switcher', 'Layers loaded')
    this.click('#fmi-map-layer-switcher')
  }, function failure () {
    test.assertVisible('#fmi-map-layer-switcher', 'Layers loaded')
  }, 30000)

  casper.then(function () {
    this.test.assertExists('#Cloudiness_0')
    this.test.assertExists('#Temperature_1')
    this.test.assertExists('#Dbz_2')
    this.wait(100, function () {
      this.test.assert(this.evaluate(function () {
        return document.getElementById('Cloudiness_0').checked
      }))
      this.test.assert(this.evaluate(function () {
        return document.getElementById('Temperature_1').checked
      }))
      this.test.assert(this.evaluate(function () {
        return document.getElementById('Dbz_2').checked
      }))
    })
  })

  casper.run(function () {
    test.done()
  })
})