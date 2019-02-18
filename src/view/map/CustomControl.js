import OlControlControl from 'ol/control/control'

const CustomControl = (function (Control) {
  function CustomControl (opt_options) {
    let options = opt_options || {}
    let element = document.createElement('div')
    element.className = options['elementClass'] + '-control ol-unselectable ol-control'
    element.appendChild(options['element'])
    Control.call(this, {
      element: element,
      target: options.target
    })
  }

  if (Control) CustomControl.__proto__ = Control
  CustomControl.prototype = Object.create(Control && Control.prototype)
  CustomControl.prototype.constructor = CustomControl
  return CustomControl
}(OlControlControl))

export default CustomControl
