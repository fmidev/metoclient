import {incrementCount} from '../ActionCreators';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

class IncrementButton extends React.Component {

    componentDidMount() {
    }

    render() {
        return (
            <div>
                <button onClick={() => this.props.incrementCount()}>Increment Count</button>
                <div id={this.props.container} className="map-container"></div>
            </div>
        );
    }
}

IncrementButton.PropTypes = {
    incrementCount: PropTypes.func.isRequired
}

function mapDispatchToProps(dispatch) {
    return {
        incrementCount: () => dispatch(incrementCount())
    };
}

export const IncrementButtonContainer = connect(
    null,
    mapDispatchToProps
)(IncrementButton);
