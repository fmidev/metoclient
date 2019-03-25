import OlControlControl from 'ol/control/control'

const CustomControl = (function (Control) {
  function CustomControl (opt_options) {
    let options = opt_options || {}
    options['element'].className = options['elementClass'] + ' ol-unselectable ol-control'
    Control.call(this, {
      element: options['element'],
      target: options.target
    })
  }

  if (Control) CustomControl.__proto__ = Control
  CustomControl.prototype = Object.create(Control && Control.prototype)
  CustomControl.prototype.constructor = CustomControl
  return CustomControl
}(OlControlControl))

export default CustomControl
