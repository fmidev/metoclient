import GoldenLayout from 'golden-layout'
import { Provider } from 'react-redux'
import { IncrementButtonContainer } from './IncrementButton'
import { DecrementButtonContainer } from './DecrementButton'
import { WeatherMapContainer } from './WeatherMap'
import { setState } from '../ActionCreators'
import elementResizeDetectorMaker from 'element-resize-detector'
import 'metoclient';
import '../../style/map.scss'

class GoldenLayoutWrapper extends React.Component {
  componentDidMount () {
    let self = this;
    // Build basic golden-layout config
    const config = {
      settings: {
        hasHeaders: true,
        constrainDragToContainer: true,
        reorderEnabled: true,
        selectionEnabled: true,
        popoutWholeStack: false,
        blockedPopoutsThrowError: true,
        closePopoutsOnUnload: true,
        showPopoutIcon: false,
        showMaximiseIcon: false,
        showCloseIcon: false
      },
      dimensions: {
        borderWidth: 10,
        minItemHeight: 10,
        minItemWidth: 10,
        headerHeight: 40,
        dragProxyWidth: 300,
        dragProxyHeight: 200
      },
      labels: {
        close: 'close',
        maximise: 'maximise',
        minimise: 'minimise',
        popout: 'open in new window'
      },
      content: [{
        type: 'column',
        content: [{
          type: 'row',
          content: [{
            type: 'react-component',
            component: 'WeatherMapContainer',
            title: 'Map 1',
            isClosable: false,
            props: {
              id: '0',
              container: 'map-container1'
            }
          }, {
            type: 'react-component',
            component: 'WeatherMapContainer',
            title: 'Map 2',
            isClosable: false,
            props: {
              id: '1',
              container: 'map-container2'
            }
          }]
        }, {
          type: 'row',
          content: [{
            type: 'react-component',
            component: 'WeatherMapContainer',
            title: 'Map 3',
            isClosable: false,
            props: {
              id: '2',
              container: 'map-container3'
            }
          }, {
            type: 'react-component',
            component: 'WeatherMapContainer',
            title: 'Map 4',
            isClosable: false,
            props: {
              id: '3',
              container: 'map-container4'
            }
          }]
        }]
      }]
    }

    function wrapComponent (Component, store) {
      class Wrapped extends React.Component {
        render () {
          return (
            <Provider store={store}>
              <Component {...this.props}/>
            </Provider>
          )
        }
      }

      return Wrapped
    }

    let layout = new GoldenLayout(config, this.layout)

    let openWindowMenu = (e) => {
      console.log("LAYOUT");
      console.log(e.target);
      console.log(e);
      console.log(layout);
      console.log(layout.root.contentItems[0].contentItems[0].contentItems[0]);
    }

    layout.on('stackCreated', function (stack) {
      let dots = document.createElement('div')
      let id = stack.contentItems[0].config.props.id
      dots.classList.add('window-menu-dots')
      dots.classList.add('light-theme')
      dots.setAttribute('id', 'window-menu-dots-'+id)
      dots.addEventListener('mousedown', function() {
        layout.selectItem(stack);
      });

      // Accessing the DOM element that contains the popout, maximise and * close icon
      stack.header.controlsContainer.prepend(dots)

      // Listening for activeContentItemChanged. This happens initially
      // when the stack is created and every time the user clicks a tab
      stack.on('activeContentItemChanged', function (contentItem) {
        // interact with the contentItem
      })

      stack.childElementContainer[0].addEventListener("mousedown", function(){
        layout.selectItem(stack);
      });

      self.context.store.dispatch(setState({
         ['window-'+id]: stack
      }));
    })

    layout.on('selectionChanged', function(selectedItem) {
      let selectedId = Number(selectedItem.contentItems[0].config.props.id);
      if (self.context.store.getState().get('selected') === selectedId) {
        return;
      }
      self.context.store.dispatch(setState({
         'selected': selectedId
      }));
      self.context.store.getState().get('onSelectionChanged')(selectedId)
    })

    layout.registerComponent('WeatherMapContainer',
      wrapComponent(WeatherMapContainer, this.context.store)
    )
    layout.init()

    layout.on('stateChanged', function () {
      console.log('State changed')
    })

    layout.selectItem(layout.root.contentItems[0].contentItems[0].contentItems[0]);

    this.context.store.dispatch(setState({
        layout
    }));

    window.addEventListener('resize', () => {
      layout.updateSize()
    })

    const erd = elementResizeDetectorMaker()
    erd.listenTo(document.getElementById('fmi-metweb-windows'), function (element) {
      console.log('Change')
      layout.updateSize()
    })
  }

  render () {
    return (
      <div className='goldenLayout' ref={input => this.layout = input}/>
    )
  }
}

// ContextTypes must be defined in order to pass the redux store to exist in
// "this.context". The redux store is given to GoldenLayoutWrapper from its
// surrounding <Provider> in index.jsx.
GoldenLayoutWrapper.contextTypes = {
  store: React.PropTypes.object.isRequired
}

export default GoldenLayoutWrapper
