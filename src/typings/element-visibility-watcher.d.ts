declare module 'element-visibility-watcher' {
  class ElementVisibilityWatcher {
    watch(element: HTMLElement, callback: (visible: boolean) => void): void;
    unwatch(element: HTMLElement): void;
  }
  export default ElementVisibilityWatcher;
}
