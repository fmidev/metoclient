<template>
    <div id="fmi-animator"></div>
</template>

<script>
    import '../lib/metoclient'

    export default {
        name: 'animator',
        props: ['animConfig', 'animModel'],
        watch: {
            animConfig: {
                handler: function (newConfig) {
                    if (this.metoclient != null) {
                        this.metoclient.destruct()
                    }
                    if (newConfig == null) {
                        return
                    }
//                    let self = this;
                    this.metoclient = new window.fi.fmi.metoclient.ui.animator.Ilmanet(newConfig);
                    this.metoclient.createAnimation({
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
                            }); */
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
                    });
                },
                deep: true
            },
            animModel: {
                handler: function (newModel) {

                }
            }
        },
        methods: {},
        data() {
            return {}
        },
        created() {
            this.metoclient = null
        }
    }

</script>

<style scoped>
</style>
