// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import Vuex from 'vuex'
import App from './App'
import {MetOClient} from 'metoclient';

Vue.use(Vuex)
Vue.config.productionTip = false

const store = new Vuex.Store({
  state: {
    metoclient: null
  },
  mutations: {
    reset (state, config) {
      state.metoclient = new MetOClient(config)
    },
    create (state) {
      if (state.metoclient != null) {
        state.metoclient.createAnimation()
      }
    },
    refresh (state) {
      if (state.metoclient != null) {
        state.metoclient.refresh()
      }
    },
    updateSize (state) {
      if (state.metoclient != null) {
        state.metoclient.getMap().updateSize()
      }
    },
    destruct (state) {
      if (state.metoclient != null) {
        state.metoclient.destruct()
      }
    }
  }
})

/* eslint-disable no-new */
let vm = new Vue({
  template: '<App :config="config" :model="model"/>',
  components: {App},
  store: store,
  data: function () {
    return {
      config: {
        animator: {},
        graph: {},
        grid: {}
      },
      model: {
        animator: {},
        graph: {},
        grid: {}
      }
    }
  }
})

const init = (config) => {
  vm.$mount(config.container).$set(vm.config, 'animator', config.animator)
}

const update = (values) => {
  vm.$set(vm.model, 'animator', values)
}

const updateSize = () => {
  store.commit('updateSize')
}

const locate = (id) => {
}

const refresh = () => {
  store.commit('refresh')
}

const destruct = () => {
  store.commit('destruct')
}

export { init, locate, update, updateSize, refresh, destruct }
