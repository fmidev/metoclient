<script src="../../../src/view/map/MapAnimation.js"></script>
<template>
  <div id="fmi-metoclient-ui">
    <animator :anim-config="animConfig" :anim-model="animModel"></animator>
    <graph></graph>
    <grid></grid>
  </div>
</template>

<script>
  import animator from './components/Animator'
  //    import graph from './components/Graph'
  //    import grid from './components/Grid'

  export default {
    name: 'metoclient-ui',
    props: ['config', 'model'],
    watch: {
      config: {
        handler: function (newConfig) {
          if (newConfig == null) {
            return;
          }
          this.animConfig = newConfig.animator;
        },
        deep: true
      },
      model: {
        handler: function (newModel) {
          if (newModel == null) {
            return;
          }
          this.animModel = newModel.animator;
        },
        deep: true
      }
    },
    components: {
      animator
//            graph,
//            grid
    },
    data: function () {
      return {
        animConfig: this.config.animator,
        animModel: this.model.animator
      }
    }
  }
</script>

<style>
  #fmi-metoclient-ui {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    display: flex;
    flex-direction: column;
  }
</style>
