import GoldenLayout from 'golden-layout'
import { Provider } from 'react-redux'
import { IncrementButtonContainer } from './IncrementButton'
import { DecrementButtonContainer } from './DecrementButton'
import { WeatherMapContainer } from './WeatherMap'
import { setState } from '../ActionCreators'
import elementResizeDetectorMaker from 'element-resize-detector'
import { createMenu } from 'metoclient/src/utils'
import '../../style/map.scss'
import '../../style/menu.scss'

class GoldenLayoutWrapper extends React.Component {
  componentDidMount () {
    let self = this
    self.context.store.dispatch(setState({
      [self.props.containerId + '-numWindowsCreated']: 0
    }))
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
        isClosable: false,
        content: [{
          type: 'row',
          content: [{
            type: 'react-component',
            component: 'WeatherMapContainer',
            title: 'Window 1',
            isClosable: false,
            index: 0,
            props: {
              id: this.props.containerId + '-0',
              container: this.props.containerId + '-map-container-0'
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
              <Component {...this.props} />
            </Provider>
          )
        }
      }

      return Wrapped
    }

    this.layout = new GoldenLayout(config, this.container)

    this.layout.fmi = {
      selectionChanged: () => {},
      windowCreated: () => {},
      bookmarkAdded: () => {},
      destroyed: () => {}
    }

    this.layout.on('itemCreated', function (item) {
      if (item.config.type === 'component') {
        let id = item.config.props.id
        item.addId(id)
        item.parent.select()
        if (id === self.context.store.getState().get(self.props.containerId + '-selected')) {
          self.layout.selectItem(item.parent)
        }
        // Todo: increment function
        let stateKey = self.props.containerId + '-numWindowsCreated'
        let numWindowsCreated = self.context.store.getState().get(stateKey)
        self.context.store.dispatch(setState({
          [stateKey]: numWindowsCreated + 1
        }))
      }
    })

    this.layout.on('tabCreated', (tab) => {
      let id = tab.contentItem.config.props.id
      if ((id != null) && (id === self.context.store.getState().get(self.props.containerId + '-selected'))) {
        self.layout.selectItem(tab.contentItem.parent)
      }

      tab.element[0].addEventListener('mousedown', (e) => {
        self.layout.selectItem(tab.contentItem.parent)
      })

      let dots = document.createElement('div')
      dots.classList.add('menu-dots')
      dots.classList.add('light-theme')

      const closeMenu = () => {
        windowMenu.classList.remove('visible-menu')
        dots.classList.remove('hover')
      }

      const windowMenu = createMenu({
        id: 'menu-dots-' + id,
        items: [{
          title: 'Näytä koko ruudulla', // Todo: localization
          callback: () => {
            closeMenu()
          }
        }, {
          title: 'Aikajana: käännä', // Todo: localization
          callback: () => {
            let rotatedClass = 'rotated'
            let marginClass = 'margin-added'
            let subWindow = document.getElementById(tab.contentItem.config.props.container)
            Array.from(document.getElementsByClassName('fmi-metoclient-timeslider-' + tab.contentItem.config.props.container)).forEach(timeSlider => {
              if (timeSlider.classList.contains(rotatedClass)) {
                timeSlider.classList.remove(rotatedClass)
                subWindow.classList.remove(marginClass)
              } else {
                timeSlider.classList.add(rotatedClass)
                subWindow.classList.add(marginClass)
              }
            })
            closeMenu()
          }
        }, {
          title: 'Lisää suosikkeihin', // Todo: localization
          callback: () => {
            closeMenu()
          }
        }, {
          title: 'Jaa ikkuna', // Todo: localization
          callback: () => {
            closeMenu()
          }
        }, {
          title: 'Poista ikkuna', // Todo: localization
          callback: () => {
            closeMenu()
            tab.contentItem.remove()
          }
        }]
      })

      dots.appendChild(windowMenu)

      dots.addEventListener('mouseenter', (e) => {
        dots.classList.add('hover')
      })

      dots.addEventListener('mouseleave', (e) => {
        dots.classList.remove('hover')
        windowMenu.classList.remove('visible-menu')
      })

      dots.addEventListener('mousedown', (e) => {
        self.layout.selectItem(tab.contentItem.parent)
      })

      dots.addEventListener('mouseup', (e) => {
        self.layout.selectItem(tab.contentItem.parent)
        windowMenu.classList.add('visible-menu')
      })

      // Accessing the DOM element that contains the popout, maximise and * close icon
      tab.header.controlsContainer.prepend(dots)
      self.layout.fmi.windowCreated(id)
    })

    this.layout.on('stackCreated', function (stack) {
      // Override to not drop tabs
      stack._$highlightDropZone = function (x, y) {
        let segment
        let area
        for (segment in this._contentAreaDimensions) {
          area = this._contentAreaDimensions[segment].hoverArea
          if ((area.x1 < x) && (area.x2 > x) && (area.y1 < y) && (area.y2 > y)) {
            if (segment !== 'header') {
              this._resetHeaderDropZone()
              this._highlightBodyDropZone(segment)
            }
            return
          }
        }
      }

      stack.childElementContainer[0].addEventListener('mousedown', function () {
        self.layout.selectItem(stack)
      })
    })

    this.layout.on('selectionChanged', function (selectedItem) {
      let selectedId = selectedItem.contentItems[0].config.id
      if (self.context.store.getState().get(self.props.containerId + '-selected') === selectedId) {
        return
      }
      self.context.store.dispatch(setState({
        [self.props.containerId + '-selected']: selectedId
      }))
      self.layout.fmi.selectionChanged(selectedId)
    })

    this.layout.registerComponent('WeatherMapContainer',
      wrapComponent(WeatherMapContainer, this.context.store)
    )
    this.layout.init()

    this.layout.on('itemDropped', (e) => {
      let column = self.layout.root.contentItems[0]
      let rows = column.contentItems
      let i = 0
      while (i < rows.length) {
        if (rows[i].contentItems.length === 0) {
          rows[i].remove()
        }
        i++
      }
    })

/*
    window.addEventListener('resize', () => {
      layout.updateSize()
    })
*/

    const erd = elementResizeDetectorMaker()
    erd.listenTo(document.getElementById(self.props.containerId), (element) => {
      self.layout.updateSize()
    })
  }

  destroy () {
    this.layout.destroy()
  }

  render () {
    return (
      <div className='goldenLayout' ref={input => this.container = input} />
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
