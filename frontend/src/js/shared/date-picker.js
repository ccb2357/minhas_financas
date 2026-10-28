import { escapeHtml as esc, icon } from './html.js';
import { validDate, validMonth, todayBrazil, dateText, monthLabel } from './calendar.js';

const active = new Set();
const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
let sequence = 0;
const localDate = value => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const calendarDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function closeActiveDatePicker(app) {
    const current = [...active].find(entry => entry.app === app);
    if (!current) return false;
    current.close(); return true;
}

function heading(title, id) {
    return `<div class="mf-date-grip" aria-hidden="true"></div><header class="mf-date-heading"><h2 id="${id}-title">${esc(title)}</h2><button type="button" class="icon-button" data-date-close aria-label="Fechar calendário">${icon('xmark')}</button></header>`;
}

// Keep all dates as calendar strings. Local Date objects are only the bridge to
// Framework7; no UTC conversion is allowed to move a transaction to another day.
export function openDateSheet(app, { value, monthOnly = false, title = 'Selecionar data', onChange, onClosed } = {}) {
    const id = `mf-date-sheet-${++sequence}`;
    const initial = monthOnly ? (validMonth(value) ? value : todayBrazil().slice(0, 7)) : (validDate(value) ? value : todayBrazil());
    let instance, element, periodPicker, periodPanel, ready = false, disposed = false;
    function finish() {
        if (disposed) return;
        closePeriod();
        disposed = true; active.delete(entry);
        document.removeEventListener('keydown', keydown, true);
        element?.remove();
        // Framework7 finishes its own closed callbacks before destruction.
        queueMicrotask(() => { const modal = instance?.modal; instance?.destroy(); modal?.destroy(); });
        onClosed?.();
    }
    const entry = {
        app,
        close() { if (periodPicker) { closePeriod(true); return; } if (!disposed) instance?.close(); },
        destroy() {
            if (disposed) return;
            const modal = instance?.modal;
            if (modal?.opened) modal.close(false);
            finish();
        },
    };
    function commit(next) { if ((monthOnly ? validMonth(next) : validDate(next)) && next !== value) onChange?.(next); }
    function keydown(event) {
        if (!element || disposed) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); entry.close(); return; }
        if (event.key === 'Tab') {
            const items = [...element.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length);
            if (!items.length) return;
            if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
            else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
        }
    }
    function opened(component) {
        element = component.el || component.$el?.[0];
        element.id = id;
        element.setAttribute('role', 'dialog'); element.setAttribute('aria-modal', 'true'); element.setAttribute('aria-labelledby', `${id}-title`);
        element.querySelector('[data-date-close]').addEventListener('click', () => instance.close());
        element.addEventListener('click', event => {
            if (event.target.closest('[data-date-apply]')) { commit(`${component.value[1]}-${component.value[0]}`); entry.close(); }
        });
        document.addEventListener('keydown', keydown, true);
        ready = true;
        if (monthOnly) {
            for (const [index, column] of [...element.querySelectorAll('.picker-column')].entries()) {
                column.tabIndex = 0; column.setAttribute('role', 'spinbutton');
                column.setAttribute('aria-label', index ? 'Ano' : 'Mês');
                column.addEventListener('keydown', event => {
                    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
                    event.preventDefault();
                    const col = component.cols[index], values = col.values;
                    const current = values.indexOf(col.value);
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? values.length - 1 : Math.max(0, Math.min(values.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
                    col.setValue(values[next]);
                });
            }
            updateColumns(component);
        } else {
            decorateCalendar(component);
            element.addEventListener('click', event => {
                if (event.target.closest('.current-month-value, .current-year-value')) openPeriod(component);
            });
        }
    }
    function closePeriod(restoreFocus = false) {
        periodPicker?.destroy(); periodPicker = null; periodPanel?.remove(); periodPanel = null;
        element?.classList.remove('mf-choosing-month');
        if (restoreFocus) element?.querySelector('.current-month-value')?.focus();
    }
    function openPeriod(calendar) {
        if (periodPicker) return;
        element.classList.add('mf-choosing-month');
        periodPanel = document.createElement('div'); periodPanel.className = 'mf-calendar-period';
        periodPanel.innerHTML = '<p class="mf-month-hint">Escolha o mês e o ano</p><div data-period-columns></div><footer class="mf-date-footer"><button type="button" class="mf-button mf-button-primary" data-period-apply>Ver calendário</button></footer>';
        element.append(periodPanel);
        periodPicker = app.picker.create({
            containerEl: periodPanel.querySelector('[data-period-columns]'), toolbar: false,
            value: [String(calendar.currentMonth + 1).padStart(2,'0'), String(calendar.currentYear)],
            cols: [
                {values:months.map((_,i)=>String(i+1).padStart(2,'0')),displayValues:months,textAlign:'left'},
                {values:Array.from({length:201},(_,i)=>String(1900+i)),textAlign:'right'},
            ],
        });
        for (const [index,col] of periodPicker.cols.entries()) {
            col.el.tabIndex=0; col.el.setAttribute('role','spinbutton');col.el.setAttribute('aria-label',index?'Ano':'Mês');
            col.el.setAttribute('aria-valuemin',index?'1900':'1');col.el.setAttribute('aria-valuemax',index?'2100':'12');
            const syncColumn=()=>{col.el.setAttribute('aria-valuenow',String(Number(col.value)));col.el.setAttribute('aria-valuetext',index?col.value:months[Number(col.value)-1]);};
            syncColumn(); periodPicker.on('change',syncColumn);
            col.el.addEventListener('keydown',event=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const current=col.values.indexOf(col.value);const next=event.key==='Home'?0:event.key==='End'?col.values.length-1:Math.max(0,Math.min(col.values.length-1,current+(event.key==='ArrowDown'?1:-1)));col.setValue(col.values[next]);});
        }
        periodPanel.querySelector('[data-period-apply]').addEventListener('click',()=>{
            const [month,year]=periodPicker.value;closePeriod();calendar.setYearMonth(Number(year),Number(month)-1,0);decorateCalendar(calendar);element.querySelector('.current-month-value')?.focus();
        });
        periodPicker.cols[0].el.focus({preventScroll:true});
    }
    function updateColumns(picker) {
        if (!element) return;
        for (const [index, col] of picker.cols.entries()) {
            const el = element.querySelectorAll('.picker-column')[index];
            el?.setAttribute('aria-valuemin', index ? '1900' : '1'); el?.setAttribute('aria-valuemax', index ? '2100' : '12');
            el?.setAttribute('aria-valuenow', String(Number(col.value)));
            el?.setAttribute('aria-valuetext', index ? String(col.value) : months[Number(col.value) - 1]);
        }
    }
    function decorateCalendar(calendar) {
        if (!calendar.$el) return;
        const el = calendar.$el[0];
        for (const [selector, label] of [['.calendar-prev-month-button','Mês anterior'],['.calendar-next-month-button','Próximo mês'],['.calendar-prev-year-button','Ano anterior'],['.calendar-next-year-button','Próximo ano'],['.current-month-value','Escolher mês'],['.current-year-value','Escolher ano']]) {
            const button = el.querySelector(selector); button?.setAttribute('tabindex','0'); button?.setAttribute('role','button'); button?.setAttribute('aria-label',label);
            if (button && !button.dataset.keyboardReady) { button.dataset.keyboardReady = 'true'; button.addEventListener('keydown', event => { if (['Enter',' '].includes(event.key)) { event.preventDefault(); button.click(); } }); }
        }
        const days = [...el.querySelectorAll('.calendar-month-current .calendar-day:not(.calendar-day-disabled)')];
        const focusDay = days.find(day => day.classList.contains('calendar-day-selected')) || days.find(day => !day.classList.contains('calendar-day-prev') && !day.classList.contains('calendar-day-next'));
        for (const day of days) {
            day.setAttribute('role','button'); day.tabIndex = day === focusDay ? 0 : -1;
            const value = `${day.dataset.year}-${String(Number(day.dataset.month)+1).padStart(2,'0')}-${String(day.dataset.day).padStart(2,'0')}`;
            day.setAttribute('aria-label',dateText(value)); day.setAttribute('aria-pressed',String(day.classList.contains('calendar-day-selected')));
            if (day.dataset.keyboardReady) continue;
            day.dataset.keyboardReady = 'true';
            day.addEventListener('keydown', event => {
                if (['Enter',' '].includes(event.key)) { event.preventDefault(); day.click(); }
                const delta = {ArrowLeft:-1, ArrowRight:1, ArrowUp:-7, ArrowDown:7}[event.key];
                if (delta) { event.preventDefault(); const next = days[days.indexOf(day)+delta]; if (next) { day.tabIndex=-1; next.tabIndex=0; next.focus(); } }
            });
        }
    }
    if (monthOnly) {
        instance = app.picker.create({
            openIn: 'sheet', routableModals: false, backdrop: true, sheetSwipeToClose: false,
            cssClass: 'mf-date-sheet mf-month-sheet', scrollToInput: false, closeByOutsideClick: false,
            value: [initial.slice(5,7),initial.slice(0,4)],
            cols: [
                { values: months.map((_,i)=>String(i+1).padStart(2,'0')), displayValues: months, textAlign:'left' },
                { values: Array.from({length:201},(_,i)=>String(1900+i)), textAlign:'right' },
            ],
            renderToolbar() { return `${heading(title,id)}<p class="mf-month-hint">Escolha o mês e o ano</p>`; },
            render() { return `<div class="sheet-modal picker picker-sheet mf-date-sheet mf-month-sheet">${this.renderToolbar()}<div class="sheet-modal-inner picker-columns">${this.cols.map(col=>this.renderColumn(col)).join('')}<div class="picker-center-highlight"></div></div><footer class="mf-date-footer"><button type="button" class="mf-button mf-button-primary" data-date-apply>Aplicar período</button></footer></div>`; },
            on: { open: opened, opened() { element?.querySelector('.picker-column')?.focus({preventScroll:true}); }, change(picker) { updateColumns(picker); }, closed: finish },
        });
    } else {
        instance = app.calendar.create({
            openIn:'sheet', routableModals:false, backdrop:true, sheetSwipeToClose:false,
            cssClass:'mf-date-sheet mf-calendar-sheet', locale:'pt-BR', firstDay:0,
            monthNames:months, monthNamesShort:['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
            dayNames:['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'],
            dayNamesShort:['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
            minDate:new Date(1900,0,1),maxDate:new Date(2100,11,31,23,59,59,999),yearPickerMin:1900,yearPickerMax:2100,monthPicker:false,yearPicker:false,
            value:[localDate(initial)], closeOnSelect:true, scrollToInput:false,closeByOutsideClick:false,
            header:true, renderHeader() { return heading(title,id); },
            monthPickerCloseText:'Concluir',yearPickerCloseText:'Concluir',
            on: {
                open:opened, opened() { element?.querySelector('[data-date-close]')?.focus({preventScroll:true}); },
                change(calendar, dates) { if (ready && dates[0]) commit(calendarDate(dates[0])); },
                monthYearChangeEnd:decorateCalendar, closed:finish,
            },
        });
    }
    active.add(entry); instance.open(); return entry;
}

export function mountDateFields(root, app) {
    const disposers = [...root.querySelectorAll('input[type="date"], input[type="month"]')].map(input => {
        const monthOnly = input.type === 'month', tabindex = input.getAttribute('tabindex');
        const wrapper = document.createElement('div'); wrapper.className='mf-picker-control';
        const button = document.createElement('button'); button.type='button';button.className='mf-date-trigger';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
        const text = document.createElement('span');button.append(text);button.insertAdjacentHTML('beforeend',icon('chevron_down'));
        const title = [...root.querySelectorAll('label[for]')].find(label=>label.htmlFor===input.id)?.textContent.trim() || (monthOnly?'Selecionar mês':'Selecionar data');
        input.before(wrapper);wrapper.append(input,button);input.classList.add('mf-date-native');input.tabIndex=-1;
        let sheet, destroyed=false;
        function sync() {
            text.textContent = input.dataset.dateLabel || (monthOnly ? (validMonth(input.value)?monthLabel(input.value):'Selecione o mês') : (dateText(input.value)||'Selecione a data'));
            button.disabled=input.matches(':disabled');button.setAttribute('aria-label',`${title}: ${text.textContent}`);
            for (const attr of ['aria-invalid','aria-describedby']) { const val=input.getAttribute(attr);if(val)button.setAttribute(attr,val);else button.removeAttribute(attr); }
            button.classList.toggle('mf-input-invalid',input.classList.contains('mf-input-invalid'));
        }
        function open() {
            if(button.disabled||sheet)return;
            button.setAttribute('aria-expanded','true');
            sheet=openDateSheet(app,{value:input.value,monthOnly,title,onChange(value){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));sync();},onClosed(){sheet=null;button.setAttribute('aria-expanded','false');if(!destroyed&&button.isConnected&&!button.disabled)button.focus({preventScroll:true});}});
        }
        function focus() { if(!button.disabled)button.focus(); }
        function nativeClick(event) { event.preventDefault(); open(); }
        button.addEventListener('click',open);input.addEventListener('focus',focus);input.addEventListener('click',nativeClick);input.addEventListener('input',sync);input.addEventListener('change',sync);
        const observer=new MutationObserver(sync);observer.observe(input,{attributes:true});
        const fieldset=input.closest('fieldset');if(fieldset)observer.observe(fieldset,{attributes:true,attributeFilter:['disabled']});sync();
        return ()=>{destroyed=true;sheet?.destroy();observer.disconnect();input.removeEventListener('focus',focus);input.removeEventListener('click',nativeClick);input.removeEventListener('input',sync);input.removeEventListener('change',sync);button.removeEventListener('click',open);input.classList.remove('mf-date-native');if(tabindex===null)input.removeAttribute('tabindex');else input.setAttribute('tabindex',tabindex);wrapper.replaceWith(input);};
    });
    return {destroy(){for(const dispose of disposers.splice(0))dispose();}};
}
