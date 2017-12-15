casper.options.viewportSize = {
  width: 1200,
  height: 500
}
casper.options.waitTimeout = 30000
casper.options.verbose = true
casper.options.logLevel = 'debug'
casper.on('page.error', function (msg, trace) {
  this.echo('Error: ' + msg, 'ERROR')
  for (var i = 0; i < trace.length; i++) {
    var step = trace[i]
    this.echo('   ' + step.file + ' (line ' + step.line + ')', 'ERROR')
  }
})

casper.on('error', function (msg, backtrace) {
  this.echo(msg)
})

casper.on('remote.message', function (message) {
  this.echo(message)
})

casper.test.begin('WMS test', function (test) {
  casper.start('./test/index.html', function () {
    casper.test.assertExists('div#fmi-metoclient')
  })

  casper.then(function () {
    casper.waitForSelector('#map-center-visualizer', function success () {
      test.assertVisible('#fmi-metoclient-layer-switcher', 'Layers loaded')
      this.click('#fmi-metoclient-layer-switcher')
      this.wait(250)
    })
  })

  casper.then(function () {
    this.test.assertExists('#Cloudiness-forecast_1')
    this.test.assertExists('#Temperature-forecast_2')
    this.wait(250, function () {
      this.test.assert(this.evaluate(function () {
        return !document.getElementById('Cloudiness-forecast_1').checked
      }))
      this.test.assert(this.evaluate(function () {
        return document.getElementById('Temperature-forecast_2').checked
      }))
    })
  })

  casper.run(function () {
    test.done()
  })
})
