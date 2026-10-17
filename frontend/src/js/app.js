import Framework7 from 'framework7/bundle';
import 'framework7/css/bundle';
import 'framework7-icons/css/framework7-icons.css';
import { use, init } from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

const app = new Framework7({
    el: '#app',
    name: 'Minhas Finanças',
    theme: 'ios',
});

app.views.create('.view-main');

document.querySelector('#test-framework').addEventListener('click', () => {
    app.dialog.alert(
        'Framework7 Core funcionando.',
        'Minhas Finanças'
    );
});

use([BarChart, GridComponent, CanvasRenderer]);

const chartElement = document.querySelector('#test-chart');
const chart = init(chartElement);

chart.setOption({
    grid: {
        left: 55,
        right: 20,
        top: 30,
        bottom: 40,
    },
    xAxis: {
        type: 'category',
        data: ['Entradas', 'Saídas'],
    },
    yAxis: {
        type: 'value',
        name: 'R$',
    },
    series: [{
        type: 'bar',
        barMaxWidth: 70,
        label: {
            show: true,
            position: 'top',
        },
        data: [
            { value: 300, itemStyle: { color: '#05944A' } },
            { value: 200, itemStyle: { color: '#E92B3B' } },
        ],
    }],
});

const chartObserver = new ResizeObserver(() => chart.resize());
chartObserver.observe(chartElement);