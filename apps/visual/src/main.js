// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'

Vue.config.productionTip = false;

/* eslint-disable no-new */
let vm = new Vue({
    template: '<App :config="config" :model="model"/>',
    components: {App},
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
});

const init = (config) => {
    vm.$mount(config.container).$set(vm.config, 'animator', config.animator);
};

const update = (values) => {
    vm.$set(vm.model, 'animator', values)
};

const locate = (id) => {

};

const destroy = () => {
    vm.$set(vm.config, 'animator', null)
};

export {init, locate, update, destroy}
