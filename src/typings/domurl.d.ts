declare module 'domurl' {
  /** URL parser class. */
  class Url {
    /** @param {string} url URL string to parse. */
    constructor(url?: string);
    protocol: string;
    host: string;
    port: string;
    path: string;
    query: Record<string, string>;
    hash: string;
    toString(): string;
  }
  export default Url;
}
