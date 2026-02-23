declare module 'domurl' {
  class Url {
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
