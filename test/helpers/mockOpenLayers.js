/**
 * Mock OpenLayers classes for Jest tests.
 */

/**
 * Mock OL source with get/set functionality.
 */
export class MockSource {
  constructor() {
    this.properties_ = {};
    this.params_ = {};
    // Make set a jest.fn by default
    this.set = jest.fn((key, value) => {
      this.properties_[key] = value;
    });
    this.get = jest.fn((key) => this.properties_[key]);
  }

  getParams() {
    return this.params_;
  }

  updateParams(params) {
    Object.assign(this.params_, params);
  }

  refresh() {
    // Mock refresh
  }

  setTileLoadFunction(fn) {
    this.tileLoadFunction_ = fn;
  }

  setImageLoadFunction(fn) {
    this.imageLoadFunction_ = fn;
  }

  /**
   * Create a new MockSource with all methods as jest.fn().
   *
   * @returns {MockSource} MockSource with jest mocks.
   */
  static createMock() {
    const source = new MockSource();
    source.updateParams = jest.fn((params) => {
      Object.assign(source.params_, params);
    });
    source.refresh = jest.fn();
    source.setTileLoadFunction = jest.fn((fn) => {
      source.tileLoadFunction_ = fn;
    });
    source.setImageLoadFunction = jest.fn((fn) => {
      source.imageLoadFunction_ = fn;
    });
    return source;
  }
}

/**
 * Mock OL layer with get/set functionality.
 */
export class MockLayer {
  constructor(options = {}) {
    this.properties_ = { ...options };
    this.source_ = options.source || new MockSource();
    this.opacity_ = options.opacity ?? 1;
    this.visible_ = options.visible ?? true;
  }

  get(key) {
    return this.properties_[key];
  }

  set(key, value) {
    this.properties_[key] = value;
  }

  getSource() {
    return this.source_;
  }

  setSource(source) {
    this.source_ = source;
  }

  getOpacity() {
    return this.opacity_;
  }

  setOpacity(opacity) {
    this.opacity_ = opacity;
  }

  getVisible() {
    return this.visible_;
  }

  setVisible(visible) {
    this.visible_ = visible;
  }
}

/**
 * Mock OL Map.
 */
export class MockMap {
  constructor(options = {}) {
    this.properties_ = {};
    this.layers_ = [];
    this.target_ = options.target;
    this.listeners_ = {};
  }

  get(key) {
    return this.properties_[key];
  }

  set(key, value, silent) {
    const oldValue = this.properties_[key];
    this.properties_[key] = value;
    if (!silent && this.listeners_[`change:${key}`]) {
      this.listeners_[`change:${key}`].forEach((fn) =>
        fn({ target: this, oldValue })
      );
    }
  }

  on(event, callback) {
    if (!this.listeners_[event]) {
      this.listeners_[event] = [];
    }
    this.listeners_[event].push(callback);
    return { event, callback };
  }

  un(event, callback) {
    if (this.listeners_[event]) {
      this.listeners_[event] = this.listeners_[event].filter(
        (fn) => fn !== callback
      );
    }
  }

  getLayers() {
    return {
      getArray: () => this.layers_,
      forEach: (fn) => this.layers_.forEach(fn),
    };
  }

  addLayer(layer) {
    this.layers_.push(layer);
  }

  getTarget() {
    return this.target_;
  }

  getView() {
    return new MockView();
  }

  render() {
    // Mock render
  }
}

/**
 * Mock OL View.
 */
export class MockView {
  constructor(options = {}) {
    this.center_ = options.center || [0, 0];
    this.zoom_ = options.zoom || 4;
    this.projection_ = options.projection || 'EPSG:4326';
  }

  getCenter() {
    return this.center_;
  }

  setCenter(center) {
    this.center_ = center;
  }

  getZoom() {
    return this.zoom_;
  }

  setZoom(zoom) {
    this.zoom_ = zoom;
  }

  getProjection() {
    return {
      getCode: () => this.projection_,
    };
  }
}

/**
 * Mock OL Control.
 */
export class MockControl {
  constructor(options = {}) {
    this.element = options.element || document.createElement('div');
    this.target_ = options.target;
    this.map_ = null;
  }

  getMap() {
    return this.map_;
  }

  setMap(map) {
    this.map_ = map;
  }
}
