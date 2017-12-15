import GoldenLayoutWrapper from './components/GoldenLayoutWrapper'
import { createStore } from 'redux'
import { Provider } from 'react-redux'
import reducer from './reducer'
import { setState, updateConfig } from './ActionCreators'
import { createMenu } from 'metoclient/src/utils'
import extend from 'extend'
import 'typeface-roboto'
import '../style/goldenlayout.scss'
import '../style/main.scss'

const store = createStore(reducer)

store.dispatch(setState({
  'count': 10
}))

export class Layout {
  constructor (id) {
    this.containerId = (id != null) ? id : null
    this.golden = {
      layout: {
        fmi: {}
      }
    }
  }

  create (title) {
    let container = document.getElementById(this.containerId)
    let wrapper = document.createElement('div')
    let main = document.createElement('div')
    wrapper.appendChild(this.createHeader(title))
    wrapper.appendChild(main)
    container.appendChild(wrapper)
    let customFmi = this.golden.layout.fmi

    ReactDOM.render(
      <Provider store={store}>
        <GoldenLayoutWrapper ref={wrapper => { this.golden = wrapper }} containerId={this.containerId} />
      </Provider>,
      main
    )
    this.golden.layout.fmi = customFmi

    return this
  }

  createHeader (text) {
    let self = this
    let header = document.createElement('header')
    let title = document.createElement('span')
    title.textContent = text
    let dots = document.createElement('div')
    dots.classList.add('menu-dots')
    dots.classList.add('light-theme')
    header.appendChild(title)
    header.appendChild(dots)

    const closeMenu = () => {
      windowMenu.classList.remove('visible-menu')
      dots.classList.remove('hover')
    }

    const windowMenu = createMenu({
      id: 'menu-dots-' + this.containerId,
      items: [{
        title: 'Lisää uusi ali-ikkuna', // Todo: localization
        callback: () => {
          closeMenu()
          let layout = this.golden.layout
          let column = layout.root.contentItems[0]
          let rows = column.contentItems
          let maxRowIndex = rows.length - 1
          let maxNumRowItems = 2
          for (let i = 0; i < maxRowIndex; i++) {
            if (!rows[i].isRow) {
              continue
            }
            let numRowItems = rows[i].contentItems.length
            if (numRowItems > maxNumRowItems) {
              maxNumRowItems = numRowItems
            }
          }
          let numWindowsCreated = store.getState().get(this.containerId + '-numWindowsCreated')
          let id = numWindowsCreated.toString()
          let title = 'Window ' + (numWindowsCreated + 1).toString()
          let newItemConfig = {
            type: 'react-component',
            component: 'WeatherMapContainer',
            title: title,
            isClosable: false,
            index: numWindowsCreated,
            props: {
              id: this.containerId + '-' + id,
              container: this.containerId + '-map-container-' + id
            }
          }
          if (rows[maxRowIndex].contentItems.length < maxNumRowItems) {
            rows[maxRowIndex].addChild(newItemConfig)
          } else {
            column.addChild({
              type: 'row',
              isClosable: false,
              content: [newItemConfig]
            })
          }
        }
      }, {
        title: 'Lisää näkymä suosikkeihin', // Todo: localization
        callback: () => {
          closeMenu()
        }
      }, {
        title: 'Sulje näkymä', // Todo: localization
        callback: () => {
          closeMenu()
          this.golden.destroy()
          let container = document.getElementById(this.containerId)
          let id = container.dataset.workspaceId
          while (container.firstChild) {
            container.removeChild(container.firstChild)
          }
          self.golden.layout.fmi.destroyed(id)
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

    dots.addEventListener('mouseup', (e) => {
      windowMenu.classList.add('visible-menu')
    })

    return header
  }

  getNumWindows () {
    return store.getState().get('config').size
  }

  push (config) {
    store.dispatch(setState({
      [this.containerId + '-' + this.getNumWindows() + '-mapConfig']: config
    }))
    return this
  }

  get (index) {
    let id = this.containerId + '-' + index.toString() + '-mapConfig'
    let data = store.getState().get(id)
    if (data != null) {
      return JSON.parse(data)
    }
    return null
  }

  set (index, config) {
    if (index != null) {
      store.dispatch(setState({
        [this.containerId + '-' + index.toString() + '-mapConfig']: JSON.stringify(config)
      }))
    }
    return this
  }

  update (index, userConfig) {
    if (index != null) {
      let config = this.get(index)
      if (config == null) {
        config = {}
      }
      extend(true, config, userConfig)
      store.dispatch(setState({
        [this.containerId + '-' + index.toString() + '-mapConfig']: JSON.stringify(config)
      }))
      return this
    }
  }

  select (itemId) {
    if (itemId != null) {
      let item = this.findItemById(itemId)
      this.golden.layout.selectItem(item)
    }
    return this
  }

  findItemById (itemId) {
    let contentItems = this.golden.layout.root.contentItems
    let numContentItems = contentItems.length
    for (let i = 0; i < numContentItems; i++) {
      let items = contentItems[i].getItemsById(itemId)
      if (items.length > 0) {
        return items[0]
      }
    }
    return null
  }

  onSelectionChanged (callback) {
    if (typeof callback === 'function') {
      this.golden.layout.fmi.selectionChanged = callback
    }
    return this
  }

  onWindowCreated (callback) {
    if (typeof callback === 'function') {
      this.golden.layout.fmi.windowCreated = callback
    }
    return this
  }

  onBookmarkAdded (callback) {
    if (typeof callback === 'function') {
      this.golden.layout.fmi.bookmarkAdded = callback
    }
    return this
  }

  onDestroyed (callback) {
    if (typeof callback === 'function') {
      this.golden.layout.fmi.destroyed = callback
    }
    return this
  }

  getSelected () {
    let selectedId = store.getState().get(this.containerId + '-selected')
    let item = this.findItemById(selectedId)
    return item.config.index
  }

  unset (index) {
    store.dispatch(setState({
      [this.containerId + '-' + this.getNumWindows() + '-mapConfig']: null
    }))
    return this
  }

  setContainer (id) {
    this.containerId = id
    return this
  }
}
