import { createVoiceVisualizer } from './voice-visualizer.js';
import { prepareCsrf, ApiError } from '../api.js';

const MAX_BYTES = 8 * 1024 * 1024;
const LIMIT_SECONDS = 45;

export async function prepareVoiceDraft(blob, signal) {
    if (!blob.size || blob.size > MAX_BYTES) throw new Error('Gravação vazia ou muito grande. Grave novamente.');
    await prepareCsrf();
    if (signal.aborted) throw new DOMException('Cancelado', 'AbortError');
    const cookie = document.cookie.split('; ').find(value => value.startsWith('XSRF-TOKEN='));
    if (!cookie) throw new Error('Atualize a página e entre novamente para usar a voz.');
    const body = new FormData();
    const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
    body.append('audio', blob, `gravacao.${ext}`);
    const response = await fetch('/api/v1/transactions/voice/prepare', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', signal, body,
        headers: { Accept: 'application/json', 'X-XSRF-TOKEN': decodeURIComponent(cookie.slice(11)) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(response.status, data);
    if (!data.data?.draft || typeof data.data.transcript !== 'string') throw new Error('Resposta inválida. Tente novamente.');
    return data.data;
}

export function mountTransactionVoice(root, { onBusy, onDraft, onExpired, onError = () => {}, request = prepareVoiceDraft } = {}) {
    let destroyed = false, enabled = false, state = 'idle', stream, recorder, timer, timeout, controller;
    let chunks = [], cancelled = false, elapsed = 0, generation = 0;
    const events = new AbortController();
    const main = root.querySelector('[data-voice-main]');
    const overlay = root.querySelector('[data-voice-overlay]');
    const finish = root.querySelector('[data-voice-finish]');
    const clock = root.querySelector('[data-voice-time]');
    const stage = root.querySelector('[data-voice-stage]');
    const visualizer = createVoiceVisualizer(root.querySelector('[data-voice-canvas]'));
    const popup = root.closest('.transaction-popup');
    popup.append(overlay);
    let startedAt = 0;
    const cancel = overlay.querySelector('[data-voice-cancel]');
    const status = overlay.querySelector('[data-voice-status]');
    const supported = Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.MediaRecorder && (window.AudioContext || window.webkitAudioContext));
    function render() {
        const active = state !== 'idle';
        main.disabled = !enabled;
        popup.querySelector('.transaction-popup-scroll').inert = active;
        main.hidden = active;
        main.setAttribute('aria-expanded', String(active));
        root.dataset.voiceState = state; overlay.dataset.voiceState = state;
        const opening = active && overlay.hidden;
        overlay.hidden = !active;
        finish.disabled = state !== 'recording';
        finish.setAttribute('aria-busy', String(state === 'permission' || state === 'processing'));
        stage.hidden = state === 'recording' || state === 'idle';
        stage.textContent = state === 'permission' ? 'Liberando microfone…' : state === 'processing' ? 'Preenchendo…' : '';
        if (opening) cancel.focus({ preventScroll: true });
        if (state === 'recording') finish.focus({ preventScroll: true });
    }
    function release() {
        clearInterval(timer); clearTimeout(timeout); visualizer.stop();
        stream?.getTracks().forEach(track => track.stop()); stream = null;
    }
    function idle(message) {
        release(); recorder = null; chunks = []; state = 'idle';
        if (!destroyed) { onBusy(false); render(); if (message) status.textContent = message; main.focus({ preventScroll: true }); }
    }
    function discard(message = 'Gravação cancelada.') {
        generation++; cancelled = true; controller?.abort();
        if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch { /* A liberação das trilhas ocorre em idle(). */ } }
        idle(message);
    }
    function fail(message, afterDismiss) {
        idle(message);
        if (!destroyed) onError(message, afterDismiss);
    }
    async function process(blob, version) {
        release();
        if (destroyed || cancelled || generation !== version) return;
        state = 'processing'; status.textContent = 'Transcrevendo e preparando os campos...'; render();
        controller = new AbortController(); timeout = setTimeout(() => controller.abort(), 95000);
        try {
            const data = await request(blob, controller.signal);
            if (destroyed || cancelled || generation !== version) return;
            const review = onDraft(data.draft);
            idle(review || 'Campos preenchidos. Confira os dados e toque em Salvar lançamento.');
            if (review && !destroyed) onError(review);
        } catch (error) {
            if (destroyed || cancelled || generation !== version) return;
            if (error.status === 401) { fail('Sua sessão expirou. Entre novamente para continuar.', onExpired); return; }
            const message = error.errors?.audio?.[0] || (error.status === 419 ? 'Sua sessão expirou. Atualize a página.' : error.name === 'AbortError' ? 'O serviço demorou para responder. Tente novamente.' : error.message);
            fail(message || 'Não foi possível preencher por voz. Tente novamente.');
        }
    }
    async function start() {
        const version = ++generation;
        state = 'permission'; cancelled = false; status.textContent = 'Permita o microfone para gravar uma entrada ou saída.';
        clock.textContent = '00:00'; onBusy(true); render();
        try {
            await visualizer.unlock();
            if (destroyed || cancelled || generation !== version) return;
            const granted = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (destroyed || cancelled || generation !== version) { granted.getTracks().forEach(track => track.stop()); return; }
            stream = granted;
            for (const track of stream.getAudioTracks()) track.addEventListener('ended', () => {
                if (!destroyed && state === 'recording') { discard(); fail('O microfone foi desconectado. Grave novamente.'); }
            }, { signal: events.signal, once: true });
            await visualizer.start(stream);
            if (destroyed || cancelled || generation !== version) return;
            const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
            recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
            chunks = []; elapsed = 0;
            recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
            recorder.onerror = () => { discard(); fail('A gravação foi interrompida. Tente novamente.'); };
            recorder.onstop = () => {
                if (destroyed || cancelled || generation !== version) return;
                const blob = new Blob(chunks, { type: recorder.mimeType || mime || 'audio/webm' });
                void process(blob, version);
            };
            recorder.start(1000); startedAt = performance.now(); state = 'recording'; render();
            status.textContent = 'Gravando · 0s / 45s. Diga apenas uma movimentação.';
            timer = setInterval(() => {
                if (destroyed || state !== 'recording') return;
                elapsed = Math.floor((performance.now() - startedAt) / 1000);
                clock.textContent = `00:${String(elapsed).padStart(2, '0')}`;
                status.textContent = `Gravando · ${elapsed}s / 45s. Diga apenas uma movimentação.`;
                if (elapsed >= LIMIT_SECONDS || chunks.reduce((sum, chunk) => sum + chunk.size, 0) >= MAX_BYTES) stop();
            }, 1000);
        } catch (error) {
            if (destroyed || cancelled || generation !== version) return;
            fail(error.name === 'NotAllowedError' ? 'Permita o acesso ao microfone nas configurações do navegador.' : 'Não foi possível acessar o microfone deste aparelho.');
        }
    }
    function stop() {
        if (state !== 'recording') return;
        state = 'processing'; render(); clearInterval(timer); visualizer.stop();
        status.textContent = 'Preparando gravação...';
        try { recorder.stop(); } catch { discard(); fail('Não foi possível finalizar a gravação. Tente novamente.'); }
    }
    main.addEventListener('click', () => {
        if (!enabled) return;
        if (!supported) { fail('Gravação indisponível. Use HTTPS ou localhost em um navegador com acesso ao microfone.'); return; }
        if (state === 'idle') void start();
    }, { signal: events.signal });
    finish.addEventListener('click', stop, { signal: events.signal });
    overlay.addEventListener('keydown', event => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); discard(); }
        if (event.key === 'Tab') {
            const targets = [finish, cancel].filter(button => !button.disabled);
            const next = event.shiftKey ? targets.at(-1) : targets[0];
            if ((event.shiftKey && document.activeElement === targets[0]) || (!event.shiftKey && document.activeElement === targets.at(-1))) { event.preventDefault(); next.focus(); }
        }
    }, { signal: events.signal });
    cancel.addEventListener('click', () => discard(), { signal: events.signal });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && ['permission', 'recording'].includes(state)) discard('Gravação cancelada ao sair da tela.');
    }, { signal: events.signal });
    window.addEventListener('pagehide', () => discard(), { signal: events.signal });
    if (!supported) status.textContent = 'Gravação indisponível. Use HTTPS ou localhost em um navegador com microfone.';
    render();
    return {
        setEnabled(value) { enabled = value; render(); },
        destroy() { destroyed = true; discard(); events.abort(); visualizer.destroy(); overlay.remove(); },
    };
}
