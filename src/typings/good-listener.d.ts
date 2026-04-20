declare module 'good-listener' {
  interface ListenerHandle {
    destroy(): void;
  }

  function listen(
    element: Element | HTMLElement,
    event: string,
    callback: (event: Event) => void
  ): ListenerHandle;

  export default listen;
}
