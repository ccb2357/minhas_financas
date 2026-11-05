// Cada barra usa a energia real captada pelo microfone; não há animação aleatória.
export function createVoiceVisualizer(canvas) {
    const paint = canvas.getContext('2d');
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let context, analyser, source, frame = 0, spectrum, waveform;
    const levels = new Float32Array(56);
    function draw() {
        if (!paint) return;
        const size = canvas.clientWidth || 280;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== Math.round(size * dpr)) { canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr); }
        paint.setTransform(dpr, 0, 0, dpr, 0, 0); paint.clearRect(0, 0, size, size);
        let rms = 0;
        if (analyser) {
            analyser.getFloatFrequencyData(spectrum); analyser.getFloatTimeDomainData(waveform);
            for (const sample of waveform) rms += sample * sample;
            rms = Math.sqrt(rms / waveform.length);
        }
        const strength = Math.min(1, Math.max(0, (rms - .0015) / .025));
        const center = size / 2, radius = size * .285;
        paint.lineWidth = Math.max(2.4, size * .011); paint.lineCap = 'round';
        for (let i = 0; i < levels.length; i++) {
            // 80–6000 Hz, distribuídos em escala logarítmica para acompanhar a voz.
            const hz = 80 * Math.pow(6000 / 80, i / (levels.length - 1));
            const bin = analyser ? Math.min(spectrum.length - 1, Math.max(1, Math.round(hz * analyser.fftSize / context.sampleRate))) : 0;
            const energy = analyser ? Math.max(0, Math.min(1, (spectrum[bin] + 90) / 60)) : 0;
            levels[i] += (energy * strength - levels[i]) * .6;
            const angle = i / levels.length * Math.PI * 2 - Math.PI / 2;
            const length = size * .013 + levels[i] * size * .18;
            const x = Math.cos(angle), y = Math.sin(angle);
            const gradient = paint.createLinearGradient(center + x * radius, center + y * radius, center + x * (radius + length), center + y * (radius + length));
            gradient.addColorStop(0, '#1665f4'); gradient.addColorStop(1, '#18d8ed');
            paint.strokeStyle = gradient; paint.beginPath();
            paint.moveTo(center + x * radius, center + y * radius);
            paint.lineTo(center + x * (radius + length), center + y * (radius + length)); paint.stroke();
        }
        if (analyser) frame = requestAnimationFrame(draw);
    }
    function stop() {
        cancelAnimationFrame(frame); frame = 0;
        source?.disconnect(); source = null; analyser?.disconnect(); analyser = null;
        if (context) { const previous = context; context = null; void previous.close().catch(() => {}); }
        levels.fill(0); draw();
    }
    return {
        // Invocado no clique, antes de aguardar a permissão, para ativação no iOS.
        unlock() { context = new AudioContext(); return context.resume(); },
        async start(stream) {
            if (!paint || !context) throw new Error('Visualização de áudio indisponível.');
            await context.resume();
            analyser = context.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = .5;
            spectrum = new Float32Array(analyser.frequencyBinCount); waveform = new Float32Array(analyser.fftSize);
            source = context.createMediaStreamSource(stream); source.connect(analyser);
            // Não conecta à saída de som, evitando retorno/eco no aparelho.
            draw();
        },
        stop,
        destroy: stop,
    };
}
