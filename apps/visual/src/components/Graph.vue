<template>
    <div id="fmi-graph">
    </div>
</template>

<script>
    import Highcharts from 'highcharts';

    export default {
        name: 'graph',
        data() {
            return {}
        },
        mounted() {
var chart = Highcharts.chart('fmi-graph', {
    series: [{
        data: [1, 3, 2, 4]
    }]
    // ... more options - see http://api.highcharts.com/highcharts
});
console.log(chart);
        }
    }
</script>

<style scoped>
</style>
