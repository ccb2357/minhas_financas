import { compactMoney } from '../shared/money.js';
import { monthLabel } from '../shared/calendar.js';

export function monthlyComparisonOption(history, { adaptive = false } = {}) {
    return {
        legend: {
            top: 10, left: 12, icon: 'circle', itemWidth: 10, itemHeight: 10, itemGap: 18,
            selectedMode: false, textStyle: { color: '#54638b', fontSize: 12 },
        },
        grid: { top: 62, left: 12, right: 12, bottom: 30 },
        tooltip: { show: false, showContent: false, triggerOn: 'none' },
        xAxis: {
            type: 'category', data: history.map(item => monthLabel(item.month, true)),
            axisTick: { show: false }, axisLine: { show: false },
            axisLabel: { fontSize: 11, interval: 0, margin: 12 },
        },
        yAxis: { type: 'value', show: false, min: 0 },
        series: [
            ['Entradas', 'income', '#19B581'],
            ['Despesas', 'expense', '#FF6258'],
        ].map(([name, key, color]) => ({
            name, type: 'bar', barWidth: adaptive && history.length === 1 ? '42%' : undefined,
            barMaxWidth: adaptive ? (history.length === 1 ? undefined : history.length === 3 ? 80 : 26) : 26,
            barGap: adaptive && history.length === 1 ? '16%' : '25%', barCategoryGap: '28%',
            itemStyle: { color, borderRadius: [5, 5, 0, 0] },
            label: { show: true, position: 'top', distance: 5, fontSize: adaptive && history.length <= 3 ? 11 : 9, formatter: item => compactMoney(item.value) },
            labelLayout: { hideOverlap: true },
            data: history.map(item => item[key]),
        })),
    };
}
