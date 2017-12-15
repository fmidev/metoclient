# MetOClient Layout

[comment]: # (Minimal example showing how to link redux state to react components embedded within golden-layout.)

Run `npm install`, then `npm run dev` and point your browser to `localhost:8080` to run the example.

[comment]: # (The example consists of three golden-layout tabs, each with a single React component. There are two buttons and one label which displays a count stored in the Redux state. The buttons increment or decrement this count.)

# API

`get(index)` Get a MetOClient object from a windows collection location specified by `index`.

`push(config)` Push a new MetOClient object defined by MetOClient configuration object `config` to the end of windows collection.

`set(index, config)` Set a new MetOClient object defined by MetOClient configuration object `config` to the windows collection location specified by `index`.

`unset(index)` Remove a MetOClient object from a windows collection specified by `index`.
