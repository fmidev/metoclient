<template>
    <div id="fmi-animator"></div>
</template>

<script>
  // import {MetOClient} from 'metoclient';

    export default {
      name: 'animator',
      props: ['animConfig', 'animModel'],
      computed: {
      },
      watch: {
        animConfig: {
          handler: function (newConfig) {
            if (this.$store.state.metoclient != null) {
              this.$store.state.metoclient.destruct()
            }
            if (newConfig == null) {
              return
            }
            this.$store.commit('reset', newConfig)
            this.$store.state.metoclient.createAnimation()
          }
        }
      },
      /*
           if (this.metoclient != null) {
           this.metoclient.destruct()
           }
           if (newConfig == null) {
           return
           }
           //                    let self = this;
           this.metoclient = new MetOClient(newConfig);
           this.metoclient.createAnimation();
           /*this.metoclient.createAnimation({
           center: (x, y) => {
           },
           init: () => {
           },
           loaded: () => {
           /*                            let map = self.metoclient.getMap();
           map.on('click', evt => {
           });
           map.on('dblclick', evt => {
           });
           map.on('moveend', evt => {
           });
           map.on('movestart', evt => {
           });
           map.on('pointerdrag', evt => {
           });
           map.on('pointermove', evt => {
           });
           map.on('singleclick', evt => {
           let clickedFeatures = self.metoclient.getFeaturesAt('Markers', evt.coordinate[0], evt.coordinate[1], 30);
           if (clickedFeatures.length > 0) {

           }
           });
           map.on('propertychange', evt => {
           });
           },
           loadError: (params) => {
           },
           marker: (x, y) => {
           },
           popupClosed: () => {
           },
           preload: () => {
           },
           rotation: (angle) => {
           },
           time: (timestamp) => {
           },
           zoom: (level) => {
           }
           }); *//*
           console.log('.....Ö')
           },
           deep: true
           },
           animModel: {
           handler: function (newModel) {

           }
           }
           },*/
      methods: {
      },
      data() {
        return {}
      },
      created() {
      }
    }
</script>

<style scoped>
</style>
