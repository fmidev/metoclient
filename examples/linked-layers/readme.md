# MetOClient with Rollup

This example demonstrates linking of the layers, e.g. observation and forecast layers of the same weather phenomena. Unfortunately the forecast layers used in this example are no longer available, so the application's map view will not work correctly, but the example may still be useful from a code perspective.

Install the project dependencies.

    cd examples/linked-layers
    npm install

Create a bundle for the browser.

    npm run build

Copy this folder to an http server and open `index.html` in a browser.
