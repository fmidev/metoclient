import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { MetOClient } from 'metoclient'

// Pure react component. Should not be connected to redux store; its container
// should be connected to the store.
export class WeatherMap extends React.Component {

  componentDidMount () {
  }

  componentDidUpdate () {
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.config != null) {
      let config
      let timeslider
      let rotated = false
      try {
        config = JSON.parse(nextProps.config)
        config.project = 'project-' + nextProps.container
        config.container = nextProps.container
        config.layerSwitcherContainer = 'fmi-metoclient-layer-switcher-' + nextProps.container
        config.legendContainer = 'fmi-metoclient-legend-' + nextProps.container
        config.spinnerContainer = 'fmi-metoclient-spinner-' + nextProps.container
        config.timeSliderContainer = 'fmi-metoclient-timeslider fmi-metoclient-timeslider-' + nextProps.container

        timeslider = Array.from(document.getElementsByClassName('fmi-metoclient-timeslider-' + nextProps.container))
        if (timeslider.length > 0) {
          if (timeslider[0].classList.contains('rotated')) {
            rotated = true
          }
        }
        this.metoclient = new MetOClient(config)
        this.metoclient.createAnimation({
          init: function () {
            if (rotated) {
              Array.from(document.getElementsByClassName('fmi-metoclient-timeslider-' + nextProps.container)).forEach(timeslider => {
                timeslider.classList.add('rotated')
              })
            }
          }
        })
      } catch (e) {
      }
    }
  }

  render () {
    return (
      <div>
        <div id={this.props.container} className='map-container'/>
      </div>
    )
  }
}

WeatherMap.PropTypes = {
  config: PropTypes.object.isRequired
}

function mapStateToProps (state, ownProps) {
  return {
    config: state.get(ownProps.id + '-mapConfig')
  }
}

export const WeatherMapContainer = connect(mapStateToProps)(WeatherMap)
