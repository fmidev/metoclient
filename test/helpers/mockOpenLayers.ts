/**
 * Mock OpenLayers classes for Jest tests.
 */

/**
 * Mock OL source with get/set functionality.
 */
export class MockSource {
  properties_: Record<string, any> = {};
  params_: Record<string, any> = {};
  tileLoadFunction_: any;
  imageLoadFunction_: any;
  set: jest.Mock;
  get: jest.Mock;

  constructor() {
    // Make set a jest.fn by default
    this.set = jest.fn((key: string, value: any) => {
      this.properties_[key] = value;
    });
    this.get = jest.fn((key: string) => this.properties_[key]);
  }

  getParams() {
    return this.params_;
  }

  updateParams(params: Record<string, any>) {
    Object.assign(this.params_, params);
  }

  refresh() {
    // Mock refresh
  }

  setTileLoadFunction(fn: any) {
    this.tileLoadFunction_ = fn;
  }

  setImageLoadFunction(fn: any) {
    this.imageLoadFunction_ = fn;
  }

  /**
   * Create a new MockSource with all methods as jest.fn().
   *
   * @returns {MockSource} MockSource with jest mocks.
   */
  static createMock(): MockSource {
    const source = new MockSource();
    (source as any).updateParams = jest.fn((params: Record<string, any>) => {
      Object.assign(source.params_, params);
    });
    (source as any).refresh = jest.fn();
    (source as any).setTileLoadFunction = jest.fn((fn: any) => {
      source.tileLoadFunction_ = fn;
    });
    (source as any).setImageLoadFunction = jest.fn((fn: any) => {
      source.imageLoadFunction_ = fn;
    });
    return source;
  }
}

/**
 * Mock OL layer with get/set functionality.
 */
export class MockLayer {
  properties_: Record<string, any>;
  source_: any;
  opacity_: number;
  visible_: boolean;

  constructor(options: any = {}) {
    this.properties_ = { ...options };
    this.source_ = options.source || new MockSource();
    this.opacity_ = options.opacity ?? 1;
    this.visible_ = options.visible ?? true;
  }

  get(key: string) {
    return this.properties_[key];
  }

  set(key: string, value: any) {
    this.properties_[key] = value;
  }

  getSource() {
    return this.source_;
  }

  setSource(source: any) {
    this.source_ = source;
  }

  getOpacity() {
    return this.opacity_;
  }

  setOpacity(opacity: number) {
    this.opacity_ = opacity;
  }

  getVisible() {
    return this.visible_;
  }

  setVisible(visible: boolean) {
    this.visible_ = visible;
  }
}

/**
 * Mock OL Map.
 */
export class MockMap {
  properties_: Record<string, any> = {};
  layers_: any[] = [];
  target_: any;
  listeners_: Record<string, Array<(event: any) => void>> = {};

  constructor(options: any = {}) {
    this.target_ = options.target;
  }

  get(key: string) {
    return this.properties_[key];
  }

  set(key: string, value: any, silent?: boolean) {
    const oldValue = this.properties_[key];
    this.properties_[key] = value;
    if (!silent && this.listeners_[`change:${key}`]) {
      this.listeners_[`change:${key}`].forEach((fn) =>
        fn({ target: this, oldValue })
      );
    }
  }

  on(event: string, callback: (event: any) => void) {
    if (!this.listeners_[event]) {
      this.listeners_[event] = [];
    }
    this.listeners_[event].push(callback);
    return { event, callback };
  }

  un(event: string, callback: (event: any) => void) {
    if (this.listeners_[event]) {
      this.listeners_[event] = this.listeners_[event].filter(
        (fn) => fn !== callback
      );
    }
  }

  getLayers() {
    return {
      getArray: () => this.layers_,
      forEach: (fn: (layer: any) => void) => this.layers_.forEach(fn),
    };
  }

  addLayer(layer: any) {
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
  center_: number[];
  zoom_: number;
  projection_: string;

  constructor(options: any = {}) {
    this.center_ = options.center || [0, 0];
    this.zoom_ = options.zoom || 4;
    this.projection_ = options.projection || 'EPSG:4326';
  }

  getCenter() {
    return this.center_;
  }

  setCenter(center: number[]) {
    this.center_ = center;
  }

  getZoom() {
    return this.zoom_;
  }

  setZoom(zoom: number) {
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
  element: HTMLElement;
  target_: any;
  map_: any;

  constructor(options: any = {}) {
    this.element = options.element || document.createElement('div');
    this.target_ = options.target;
    this.map_ = null;
  }

  getMap() {
    return this.map_;
  }

  setMap(map: any) {
    this.map_ = map;
  }
}
