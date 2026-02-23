declare module 'ol-layerswitcher' {
  import Control from 'ol/control/Control';

  interface LayerSwitcherOptions {
    tipLabel?: string;
    reverse?: boolean;
  }

  class LayerSwitcher extends Control {
    constructor(options?: LayerSwitcherOptions);
    shownClassName: string;
    showPanel(): void;
    hidePanel(): void;
  }

  export default LayerSwitcher;
}
