import GoldenLayoutWrapper from './components/GoldenLayoutWrapper';
import {createStore} from 'redux';
import {Provider} from 'react-redux';
import reducer from './reducer';
import {setState, updateConfig} from './ActionCreators';
import 'typeface-roboto';
import '../style/goldenlayout.scss';
import '../style/main.scss';

let containerId;

const store = createStore(reducer);
store.dispatch(setState({
    'count': 10,
    'selected': null,
    'layout': null,
    'window-0': null,
    'window-1': null,
    'window-2': null,
    'window-3': null,
    '0': {},
    '1': {},
    '2': {},
    '3': {},
    'onSelectionChanged': function() {}
}));

export function setContainer(id) {
    containerId = id;
    return this;
}

export function createWindows(numWindows) {
    ReactDOM.render(
        <Provider store={store}>
            <GoldenLayoutWrapper ref={input => this.windows = input}/>
        </Provider>,
        document.getElementById(containerId)
    );
    return this;
}

export function getNumWindows() {
    return store.getState().get('config').size;
}

export function getWindow() {
    return {};
}

export function push(config) {
    store.dispatch(setState({
        [getNumWindows()]: config
    }));
    return this;
}

export function set(index, config) {
    if (index != null) {
      store.dispatch(setState({
        [index.toString()]: JSON.stringify(config)
      }));
    }
    return this;
}

export function select(index) {
  if (index != null) {
    let item = store.getState().get('window-'+index);
    store.getState().get('layout').selectItem(item);
  }
  return this;
}

export function onSelectionChanged(callback) {
  if (typeof callback === 'function') {
    store.dispatch(setState({
        'onSelectionChanged': callback
    }));
  }
  return this;
}

export function getSelected() {
  return store.getState().get('selected')
}

export function unset(index) {
    store.dispatch(setState({
        [index]: null
    }));
    return this;
}

export function update(index, data) {
    return this;
}

export function importLayout() {
    return this;
}

export function exportLayout() {
    return this;
}

export function setAPIKey(apiKey) {
    return this;
}

