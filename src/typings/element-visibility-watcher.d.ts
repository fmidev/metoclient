declare module 'element-visibility-watcher' {
  /** Watches element visibility changes. */
  class ElementVisibilityWatcher {
    watch(element: HTMLElement, callback: (visible: boolean) => void): void;

    unwatch(element: HTMLElement): void;
  }
  export default ElementVisibilityWatcher;
}
