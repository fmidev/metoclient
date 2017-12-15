import Ol from 'ol/index'
import OlCollection from 'ol/collection'
import OlControlZoom from 'ol/control/zoom'
import OlFeature from 'ol/feature'
import OlFormatGeoJSON from 'ol/format/geojson'
import OlFormatGML from 'ol/format/gml'
import OlFormatWFS from 'ol/format/wfs'
import OlFormatWMSCapabilities from 'ol/format/wmscapabilities'
import OlFormatWMTSCapabilities from 'ol/format/wmtscapabilities'
import OlGeomPoint from 'ol/geom/point'
import OlInteraction from 'ol/interaction'
import OlInteractionDoubleClickZoom from 'ol/interaction/doubleclickzoom'
import OlInteractionDragPan from 'ol/interaction/dragpan'
import OlInteractionDragRotate from 'ol/interaction/dragrotate'
import OlInteractionDragRotateAndZoom from 'ol/interaction/dragrotateandzoom'
import OlInteractionDragZoom from 'ol/interaction/dragzoom'
import OlInteractionKeyboardPan from 'ol/interaction/keyboardpan'
import OlInteractionKeyboardZoom from 'ol/interaction/keyboardzoom'
import OlInteractionMouseWheelZoom from 'ol/interaction/mousewheelzoom'
import OlInteractionPinchRotate from 'ol/interaction/pinchrotate'
import OlInteractionPinchZoom from 'ol/interaction/pinchzoom'
import OlLayerGroup from 'ol/layer/group'
import OlLayerImage from 'ol/layer/image'
import OlLayerTile from 'ol/layer/tile'
import OlLayerVector from 'ol/layer/vector'
import OlMap from 'ol/map'
import OlObject from 'ol/object'
import OlOverlay from 'ol/overlay'
import OlProj from 'ol/proj'
import OlSourceImageWMS from 'ol/source/imagewms'
import OlSourceOSM from 'ol/source/osm'
import OlSourceStamen from 'ol/source/stamen'
import OlSourceTileWMS from 'ol/source/tilewms'
import OlSourceVector from 'ol/source/vector'
import OlSourceWMTS from 'ol/source/wmts'
import OlStyleFill from 'ol/style/fill'
import OlStyleIcon from 'ol/style/icon'
import OlStyleStroke from 'ol/style/stroke'
import OlStyleStyle from 'ol/style/style'
import OlStyleText from 'ol/style/text'
import OlTilegridTileGrid from 'ol/tilegrid/tilegrid'
import OlTilegridWMTS from 'ol/tilegrid/wmts'
import OlView from 'ol/view'
import OlInteractionDragBox from 'ol/interaction/dragbox'
import OlEventsCondition from 'ol/events/condition'
import OlExtent from 'ol/extent'

global['Ol'] = Ol
global['OlCollection'] = OlCollection
global['OlControlZoom'] = OlControlZoom
global['OlFeature'] = OlFeature
global['OlFormatGeoJSON'] = OlFormatGeoJSON
global['OlFormatGML'] = OlFormatGML
global['OlFormatWFS'] = OlFormatWFS
global['OlFormatWMSCapabilities'] = OlFormatWMSCapabilities
global['OlFormatWMTSCapabilities'] = OlFormatWMTSCapabilities
global['OlGeomPoint'] = OlGeomPoint
global['OlInteraction'] = OlInteraction
global['OlInteractionDoubleClickZoom'] = OlInteractionDoubleClickZoom
global['OlInteractionDragPan'] = OlInteractionDragPan
global['OlInteractionDragRotate'] = OlInteractionDragRotate
global['OlInteractionDragRotateAndZoom'] = OlInteractionDragRotateAndZoom
global['OlInteractionDragZoom'] = OlInteractionDragZoom
global['OlInteractionKeyboardPan'] = OlInteractionKeyboardPan
global['OlInteractionKeyboardZoom'] = OlInteractionKeyboardZoom
global['OlInteractionMouseWheelZoom'] = OlInteractionMouseWheelZoom
global['OlInteractionPinchRotate'] = OlInteractionPinchRotate
global['OlInteractionPinchZoom'] = OlInteractionPinchZoom
global['OlLayerGroup'] = OlLayerGroup
global['OlLayerImage'] = OlLayerImage
global['OlLayerTile'] = OlLayerTile
global['OlLayerVector'] = OlLayerVector
global['OlMap'] = OlMap
global['OlObject'] = OlObject
global['OlOverlay'] = OlOverlay
global['OlProj'] = OlProj
global['OlSourceImageWMS'] = OlSourceImageWMS
global['OlSourceOSM'] = OlSourceOSM
global['OlSourceStamen'] = OlSourceStamen
global['OlSourceTileWMS'] = OlSourceTileWMS
global['OlSourceVector'] = OlSourceVector
global['OlSourceWMTS'] = OlSourceWMTS
global['OlStyleFill'] = OlStyleFill
global['OlStyleIcon'] = OlStyleIcon
global['OlStyleStroke'] = OlStyleStroke
global['OlStyleStyle'] = OlStyleStyle
global['OlStyleText'] = OlStyleText
global['OlTilegridTileGrid'] = OlTilegridTileGrid
global['OlTilegridWMTS'] = OlTilegridWMTS
global['OlView'] = OlView
global['OlInteractionDragBox'] = OlInteractionDragBox
global['OlEventsCondition'] = OlEventsCondition
global['OlExtent'] = OlExtent
