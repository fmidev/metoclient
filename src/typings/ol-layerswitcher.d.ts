declare module 'ol-layerswitcher' {
  import Control from 'ol/control/Control';

  interface LayerSwitcherOptions {
    tipLabel?: string;
    reverse?: boolean;
  }

  /** Layer switcher control for OpenLayers. */
  class LayerSwitcher extends Control {
    /** @param {LayerSwitcherOptions} options Layer switcher options. */
    constructor(options?: LayerSwitcherOptions);

    shownClassName: string;

    showPanel(): void;

    hidePanel(): void;
  }

  export default LayerSwitcher;
}
