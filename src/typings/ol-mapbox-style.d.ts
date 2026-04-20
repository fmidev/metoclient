declare module 'ol-mapbox-style' {
  import Map from 'ol/Map';

  function olms(map: Map, style: object | string): Promise<Map>;
  export default olms;
}
