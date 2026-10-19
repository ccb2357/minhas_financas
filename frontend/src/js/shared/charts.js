import { init, use } from 'echarts/core';
import { PieChart, BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { formatMoney as money, compactMoney } from './money.js';
import { monthLabel } from './calendar.js';

use([PieChart, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

export function mountCharts(root, summary, history) {
    const instances = [];
    const fontFamily = getComputedStyle(root).fontFamily;
    const base = { animationDuration: 350, textStyle: { fontFamily, color: '#657498' } };
    function create(selector, option) {
        const element = root.querySelector(selector);
        if (!element) return;
        const chart = init(element, null, { renderer: 'canvas' });
        chart.setOption({ ...base, ...option });
        instances.push({ chart, element });
    }
    create('[data-chart="categories"]', {
        tooltip: { trigger: 'item', valueFormatter: money, confine: true, renderMode: 'richText' },
        series: [{ type: 'pie', radius: ['65%', '92%'], center: ['50%', '50%'], label: { show: false },
            itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
            data: summary.byCategory.length ? summary.byCategory.map(category => ({ name: category.name, value: category.amount, itemStyle: { color: category.color } })) : [{ value: 1, name: 'Sem despesas', itemStyle: { color: '#e9eef7' }, tooltip: { show: false } }],
        }],
    });
    create('[data-chart="six-months"]', {
        grid: { top: 35, left: 2, right: 2, bottom: 24 },
        tooltip: { trigger: 'item', valueFormatter: money, confine: true, renderMode: 'richText' },
        xAxis: { type: 'category', data: history.map(item => monthLabel(item.month, true)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { fontSize: 10, interval: 0, margin: 10 } },
        yAxis: { type: 'value', show: false, min: Math.min(0, ...history.map(item => item.result)) },
        series: [{ type: 'bar', barMaxWidth: 27, label: { show: true, position: 'top', fontSize: 9, formatter: item => item.value === 0 ? '' : compactMoney(item.value) },
            labelLayout: params => ({
                x: Math.max(2, Math.min(params.labelRect.x, (root.querySelector('[data-chart="six-months"]')?.clientWidth || 0) - params.labelRect.width - 2)),
                align: 'left', hideOverlap: true,
            }),
            data: history.map((item, index) => ({ value: item.result, itemStyle: { color: index === history.length - 1 ? '#1a61ff' : '#bdd8ff', borderRadius: item.result < 0 ? [0, 0, 4, 4] : [4, 4, 0, 0] } })),
        }],
    });
    create('[data-chart="comparison"]', {
        legend: { top: 0, icon: 'circle', itemWidth: 9, itemHeight: 9, textStyle: { color: '#54638b', fontSize: 11 } },
        grid: { left: 45, right: 15, top: 38, bottom: 30 },
        tooltip: { trigger: 'axis', valueFormatter: money, confine: true, renderMode: 'richText' },
        xAxis: { type: 'category', data: history.map(item => monthLabel(item.month, true)), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { fontSize: 11, interval: 0 } },
        yAxis: { type: 'value', axisLabel: { formatter: compactMoney, fontSize: 10 }, splitLine: { lineStyle: { color: '#edf1f8' } } },
        series: [
            { name: 'Entradas', type: 'bar', barMaxWidth: 24, itemStyle: { color: '#19bd60', borderRadius: [3, 3, 0, 0] }, data: history.map(item => item.income) },
            { name: 'Saídas', type: 'bar', barMaxWidth: 24, itemStyle: { color: '#ff6258', borderRadius: [3, 3, 0, 0] }, data: history.map(item => item.expense) },
        ],
    });
    create('[data-chart="evolution"]', {
        legend: { top: 0, icon: 'circle', itemWidth: 9, itemHeight: 9, textStyle: { color: '#54638b', fontSize: 11 } },
        grid: { left: 45, right: 15, top: 38, bottom: 30 },
        tooltip: { trigger: 'axis', valueFormatter: money, confine: true, renderMode: 'richText' },
        xAxis: { type: 'category', data: history.map(item => monthLabel(item.month, true)), axisTick: { show: false }, axisLine: { lineStyle: { color: '#dde5f4' } }, axisLabel: { fontSize: 11, interval: 0 } },
        yAxis: { type: 'value', axisLabel: { formatter: compactMoney, fontSize: 10 }, splitLine: { lineStyle: { color: '#edf1f8' } } },
        series: [ ['Entradas', 'income', '#19bd60'], ['Saídas', 'expense', '#ff6258'], ['Resultado', 'result', '#1a61ff'] ].map(([name, key, color]) => ({ name, type: 'line', smooth: .3, data: history.map(item => item[key]), symbol: 'circle', symbolSize: 7, itemStyle: { color, borderColor: '#fff', borderWidth: 2 }, lineStyle: { width: 2 }, areaStyle: { color, opacity: .04 } })),
    });
    const observer = new ResizeObserver(() => {
        for (const { chart, element } of instances) if (element.clientWidth && element.clientHeight && !chart.isDisposed()) chart.resize();
    });
    for (const { element } of instances) observer.observe(element);
    return () => { observer.disconnect(); for (const { chart } of instances) chart.dispose(); };
}
