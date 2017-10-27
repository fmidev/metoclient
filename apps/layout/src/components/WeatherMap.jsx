import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import elementResizeDetectorMaker from 'element-resize-detector';
import {MetOClient} from 'metoclient';

// Pure react component. Should not be connected to redux store; its container
// should be connected to the store.
export class WeatherMap extends React.Component {
    constructor() {
        super();
        this.update = 0;
        this.state = {
            metoclient: null
        }
    }

    componentDidMount() {
        var self = this;
        var erd = elementResizeDetectorMaker();
        erd.listenTo(document.getElementById(this.props.container), function (element) {
            if (self.update === 0) {
                self.update = 1;
                return;
            }
            var width = element.offsetWidth;
            var height = element.offsetHeight;
            var measures = width+'x'+height;
            var prevMeasures = element.getAttribute('data-measures');
            if (!prevMeasures) {
                element.setAttribute('data-measures', measures);
                return;
            }
            if (measures === prevMeasures) {
                return;
            }
            console.log('Resize:');
            console.log(measures);
            console.log(prevMeasures);
            if (self.state.metoclient != null) {
                self.state.metoclient.updateAnimation({});
            }
        });
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.config !== 0) {
            var config;
            try {
                config = JSON.parse(nextProps.config);
                if ((config != null) && (config.time !== undefined)) {
                    config.project = 'project-' + nextProps.container;
                    config.map.view.container = nextProps.container;
                    config.map.view.legendContainer = 'fmi-animator-legend-' + nextProps.container;
                    config.map.view.spinnerContainer = 'fmi-animator-spinner-' + nextProps.container;
                    var metoclient = new MetOClient(config);
                    this.setState({
                        metoclient: metoclient
                    });
                }
            } catch (e) {
            }
        }
    }

    render() {
        if (this.state.metoclient != null) {
            this.state.metoclient.createAnimation();
        }
        return (
            <div>
                <div id={this.props.container} className="map-container"></div>
            </div>
        );
    }
}

WeatherMap.PropTypes = {
    config: PropTypes.object.isRequired
};

function mapStateToProps(state, ownProps) {
    return {
        config: state.get(ownProps.id)
    }
}

export const WeatherMapContainer = connect(mapStateToProps)(WeatherMap);
