# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MetOClient is a TypeScript library for animated weather maps, built on top of OpenLayers 6
(`ol`). A map animation is configured with a JSON object that extends the Mapbox Style
Specification with layer time rules (absolute time lists, relative/natural-language ranges,
RRule recurrence). It supports WMS, WMTS and GeoJSON sources and ships as an ESM module plus a
UMD full-build bundle for `<script>` usage.

The public animation API (`new MetOClient(options)`, `render()`, `play()`/`pause()`/`next()`/
`previous()`, `get('map' | 'options' | 'timeSlider')`, `set('options', options)`, static
`MetOClient.transform(...)`) is documented in full in README.md — read it before changing the
public surface of `src/MetOClient.ts`.

## Commands

```bash
npm install                # install dependencies
npm run build               # clean dist/ and produce production bundles (rollup)
npm run build:dev           # dev bundle (unminified, for examples)
npm run build:test          # test bundle
npm run build:examples      # build the examples/ directory
npm start                   # rollup --watch
npm test                    # run the full Jest suite
npm run test:watch          # Jest in watch mode
npm run lint                # eslint --ext ts src/  (src/ only; test/ and examples/ are ignored)
npm run typecheck           # tsc --noEmit
npm run validate            # check-version + lint + typecheck + test — what CI/pre-commit run
```

Run a single test file or test case with Jest directly, e.g.:

```bash
npx jest test/unit/utils.test.ts
npx jest test/dom/TimeSlider.test.ts -t "some test name"
```

A Husky `pre-commit` hook runs `npm run validate`. That includes
`scripts/check-version.mjs`, which fails the commit if `package.json`'s `version` was decreased
relative to the previous commit (uses `semver.lt`) — bump the version when committing, don't
revert it.

## Architecture

All source lives in `src/` as a flat set of modules (no nested package structure); `src/MetOClient.ts`
is the build entry point.

- **`MetOClient.ts`** — the main class (extends OpenLayers' `ol/Object` `BaseObject`, so it gets
  `get`/`set`/event listeners for free). Owns the OL `Map`/`View`, animation state (current time,
  play/pause loop, refresh timer), the layer switcher, legend UI, fullscreen handling, and
  capabilities caching (`updateCapabilities_`). It is the only module that wires the others
  together; most of its ~2800 lines are private (`_`-suffixed) orchestration methods.
- **`LayerCreator.ts`** / **`SourceCreator.ts`** — static factory classes. A layer config's
  `source.type` (or `url.service`) string is lowercased and used as a **dynamic method name**
  look-up, e.g. `(SourceCreator as any)['wms'](...)`. Adding a new service type means adding a
  correspondingly-named static method to both classes, not a switch statement.
  `LayerCreator` builds the OL layer (Tile/Image) and delegates the OL source creation to
  `SourceCreator`.
- **`SourceUpdater.ts`** — same dynamic-dispatch pattern, but keyed by the OL source's
  **class name**, which is stamped onto the live OL object at creation time via
  `source.set(constants.OL_CLASS_NAME, 'TileWMS' | 'ImageWMS' | 'WMTS')`. During animation ticks,
  `MetOClient` reads that tag back off the source (`source.get(constants.OL_CLASS_NAME)`) to pick
  the right updater method and mutate the time param in place, instead of recreating layers/sources
  every frame.
- **`constants.ts`** — shared defaults and, notably, the `metoclient:`-prefixed keys
  (`TIME`, `PREVIOUS`, `NEXT`, `OL_CLASS_NAME`, …) used to stash MetOClient-specific metadata on
  native OL layer/source objects via their generic `get`/`set`, without colliding with OL's own
  properties.
- **`CapabilitiesReader.ts`** — thin static wrappers around `ol/format` WMS/WMTS capabilities XML
  parsers.
- **`TimeFrame.ts`** — a single time-slider tick's DOM element (used by `TimeSlider`).
- **`TimeSlider.ts`** — the standalone time slider UI widget: builds its own DOM, handles mouse/
  touch/keyboard dragging, play button, frame rendering, and timezone label; communicates with
  `MetOClient` only through events/options, not direct coupling.
- **`utils.ts`** — pure functions with no OL/DOM dependency beyond what's passed in: time parsing
  (absolute lists, relative/natural-language ranges, RRule expansion), URL/query-param building,
  legend URL extraction, and `defaultLoadFunction` (the shared tile/image load handler with
  timeout + retry behavior used by multiple source types).
- **`typings/*.d.ts`** — hand-written type declarations for dependencies that ship no types of
  their own (`can-ajax`, `domurl`, `element-visibility-watcher`, `good-listener`,
  `ol-layerswitcher`, `ol-mapbox-style`, `proj4`, `rrule`).

### Tests (`test/`)

- `unit/` — one file per `src/` module, testing exported functions/classes in isolation.
- `integration/` — cross-module behavior (e.g. `layer-source.test.ts` exercises
  LayerCreator → SourceCreator together, `time-parsing.test.ts` exercises the various time-config
  formats end to end through `utils.ts`).
- `dom/` — full `MetOClient`/`TimeSlider` behavior tests that depend on the `jsdom` test
  environment for real DOM interaction.
- `helpers/mockOpenLayers.ts` — hand-rolled mocks for OL classes (`MockSource`, etc.), since real
  OL sources/layers expect a canvas/WebGL context jsdom doesn't provide.
- `helpers/mockCapabilities.ts`, `helpers/testFixtures.ts` — shared sample WMS/WMTS capabilities
  and layer/source config fixtures reused across test files.
- `helpers/mockRRule.ts` — Jest `moduleNameMapper` redirects `rrule/dist/es5/rrule` here (see
  `jest.config.js`) because that subpath is an ESM-only build.
- `setup.ts` — global Jest setup (mocks `XMLHttpRequest`, `URL.createObjectURL`/`revokeObjectURL`).

### Build

Rollup (`rollup/config.js`, `config-dev.js`, `config-test.js`) bundles from `src/MetOClient.ts`
into: an ESM build (`pkg.module`), a UMD build (`pkg.main`, global `fmi.metoclient`), and a
version-namespaced UMD build (`metoclient_<version>`) so multiple versions can coexist in a
full-build `<script>` page. Type declarations are emitted to `dist/types` by the TypeScript
rollup plugin.
