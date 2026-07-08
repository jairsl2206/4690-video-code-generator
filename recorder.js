/* ==========================================
   4690 BASIC Video Generator — Recorder Module v2
   Handles screen recording (WebCodecs + MediaRecorder fallback)
   ========================================== */
(function () {
    'use strict';

    const { delay } = window.Utils;

    let mediaRecorder = null;
    let abortController = null;
    let recordedChunks = [];

    function remuxMp4FastStart(blob) {
        return blob.arrayBuffer().then(function (buffer) {
            var view = new DataView(buffer);
            var boxes = [];
            var offset = 0;
            while (offset < buffer.byteLength) {
                var size = view.getUint32(offset);
                if (size === 0) break;
                if (size === 1) size = view.getBigUint64(offset + 8);
                if (size < 8) break;
                var type = '';
                for (var i = 0; i < 4; i++) type += String.fromCharCode(view.getUint8(offset + 4 + i));
                boxes.push({ offset: offset, size: size, type: type });
                offset += size;
            }
            var ftyp = boxes.filter(function (b) { return b.type === 'ftyp'; })[0];
            var moov = boxes.filter(function (b) { return b.type === 'moov'; })[0];
            var mdat = boxes.filter(function (b) { return b.type === 'mdat'; })[0];
            if (!ftyp || !moov || !mdat) return blob;
            if (moov.offset < mdat.offset) return blob;

            var ftypData = new Uint8Array(buffer, ftyp.offset, ftyp.size);
            var moovBytes = new Uint8Array(moov.size);
            moovBytes.set(new Uint8Array(buffer, moov.offset, moov.size));
            var moovView = new DataView(moovBytes.buffer);

            function adjustBox(parentOff) {
                var sz = moovView.getUint32(parentOff);
                var tp = '';
                for (var i = 0; i < 4; i++) tp += String.fromCharCode(moovView.getUint8(parentOff + 4 + i));
                if (tp === 'stco') {
                    var count = moovView.getUint32(parentOff + 12);
                    for (var i = 0; i < count; i++) {
                        var eOff = parentOff + 16 + i * 4;
                        var oldOff = moovView.getUint32(eOff);
                        moovView.setUint32(eOff, oldOff + moov.size);
                    }
                } else if (tp === 'moov' || tp === 'trak' || tp === 'mdia' || tp === 'minf' || tp === 'stbl') {
                    var child = parentOff + 8;
                    while (child < parentOff + sz) {
                        adjustBox(child);
                        child += moovView.getUint32(child);
                    }
                }
            }
            adjustBox(0);

            var newBuf = new ArrayBuffer(ftypData.byteLength + moovBytes.byteLength + mdat.size);
            var newArr = new Uint8Array(newBuf);
            newArr.set(ftypData, 0);
            newArr.set(moovBytes, ftypData.byteLength);
            newArr.set(new Uint8Array(buffer, mdat.offset, mdat.size), ftypData.byteLength + moovBytes.byteLength);
            return new Blob([newArr], { type: 'video/mp4' });
        });
    }

    async function startRecording(recordCallback, focusMode, videoFormat, videoPrefix) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: 'browser', frameRate: 30, cursor: 'never' },
            audio: false,
            preferCurrentTab: true,
        });

        const format = videoFormat || 'mp4';
        const wantMp4 = format === 'mp4';
        const hasWebCodecs = typeof VideoEncoder !== 'undefined' && typeof window.Mp4Muxer !== 'undefined';

        let recordStream = stream;
        let cleanupPipeline = null;
        let canvas = null;

        if (wantMp4) {
            const videoTrack = stream.getVideoTracks()[0];
            const video = document.createElement('video');
            video.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1';
            video.muted = true;
            video.setAttribute('playsinline', '');
            document.body.appendChild(video);
            video.srcObject = new MediaStream([videoTrack]);
            await video.play();

            var vw2 = 0, vh2 = 0, maxW = 120;
            while ((vw2 === 0 || vh2 === 0) && maxW > 0) {
                await new Promise(function (r) { return requestAnimationFrame(r); });
                vw2 = video.videoWidth;
                vh2 = video.videoHeight;
                maxW--;
            }
            if (vw2 === 0) vw2 = 1260;
            if (vh2 === 0) vh2 = 620;
            var vw = vw2 - (vw2 % 2);
            var vh = vh2 - (vh2 % 2);

            canvas = document.createElement('canvas');
            canvas.width = vw;
            canvas.height = vh;
            var ctx = canvas.getContext('2d', { alpha: false });

            var animId = 0;
            var stoppedDraw = false;
            (function drawLoop() {
                ctx.drawImage(video, 0, 0, vw, vh);
                if (!stoppedDraw) animId = requestAnimationFrame(drawLoop);
            })();

            cleanupPipeline = function () {
                stoppedDraw = true;
                if (animId) cancelAnimationFrame(animId);
                if (video.parentNode) video.remove();
                canvas.remove();
            };

            if (hasWebCodecs) {
                let muxer = null;
                let videoEncoder = null;
                let audioEncoder = null;
                let stopped = false;
                let videoFrameCount = 0;
                let encoderReady = false;
                let captureTimer = null;

                async function initWebCodecs() {
                    const codecs = ['avc1.42001E', 'avc1.42E01E', 'avc1.4d0028'];
                    let codec = codecs[0];
                    for (const c of codecs) {
                        try {
                            const support = await VideoEncoder.isConfigSupported({
                                codec: c, width: vw, height: vh,
                                bitrate: 8000000, framerate: 30,
                            });
                            if (support.supported) { codec = c; break; }
                        } catch(e) {}
                    }

                    const { Muxer, ArrayBufferTarget } = window.Mp4Muxer;
                    muxer = new Muxer({
                        target: new ArrayBufferTarget(),
                        video: { codec: 'avc', width: vw, height: vh },
                        audio: { codec: 'aac', numberOfChannels: 1, sampleRate: 48000 },
                        fastStart: 'in-memory',
                        firstTimestampBehavior: 'offset',
                    });

                    videoEncoder = new VideoEncoder({
                        output: (chunk, meta) => {
                            try { muxer.addVideoChunk(chunk, meta, chunk.timestamp); }
                            catch(e) { console.error('Muxer error:', e); }
                        },
                        error: (e) => console.error('VideoEncoder error:', e),
                    });

                    videoEncoder.configure({
                        codec, width: vw, height: vh,
                        bitrate: 8000000, framerate: 30,
                        latencyMode: 'realtime',
                    });

                    const silenceSamples = 1024;
                    const silenceBuffer = new ArrayBuffer(silenceSamples * 2);
                    const silenceData = new AudioData({
                        format: 's16', sampleRate: 48000,
                        numberOfFrames: silenceSamples, numberOfChannels: 1,
                        timestamp: 0, data: new Uint8Array(silenceBuffer),
                    });

                    audioEncoder = new AudioEncoder({
                        output: (chunk, meta) => {
                            try { muxer.addAudioChunk(chunk, meta, chunk.timestamp); }
                            catch(e) { console.error('Audio muxer error:', e); }
                        },
                        error: (e) => console.error('AudioEncoder error:', e),
                    });

                    const audioConfigSupported = await AudioEncoder.isConfigSupported({
                        codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 1, bitrate: 64000,
                    });

                    if (audioConfigSupported.supported) {
                        audioEncoder.configure({
                            codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 1, bitrate: 64000,
                        });
                        audioEncoder.encode(silenceData);
                        await audioEncoder.flush();
                        silenceData.close();
                    }

                    encoderReady = true;
                }

                function captureVideoFrame() {
                    if (stopped) return;
                    if (encoderReady && videoEncoder && videoEncoder.state === 'configured') {
                        const frameIndex = videoFrameCount++;
                        const ts = frameIndex * 33333;
                        try {
                            const frame = new VideoFrame(canvas, { timestamp: ts, duration: 33333 });
                            videoEncoder.encode(frame, { keyFrame: frameIndex % 150 === 0 });
                            frame.close();
                        } catch(e) {}
                    }
                    captureTimer = setTimeout(captureVideoFrame, 33);
                }
                captureVideoFrame();

                initWebCodecs().catch(e => { console.error('init error:', e); encoderReady = false; });

                mediaRecorder = {
                    _state: 'inactive',
                    _onstop: null,
                    get state() { return this._state; },
                    set onstop(fn) { this._onstop = fn; },
                    start() { this._state = 'recording'; },
                    stop() {
                        if (this._state === 'inactive') return;
                        this._state = 'inactive';
                        (async () => {
                            stopped = true;
                            if (captureTimer) clearTimeout(captureTimer);
                            if (videoEncoder && videoEncoder.state !== 'closed') {
                                try { await videoEncoder.flush(); videoEncoder.close(); }
                                catch(e) {}
                            }
                            if (audioEncoder && audioEncoder.state !== 'closed') {
                                try {
                                    const totalDurationMs = videoFrameCount * 33.333;
                                    const totalSamples = Math.ceil((totalDurationMs / 1000) * 48000);
                                    const frames = Math.ceil(totalSamples / 1024);
                                    const buf = new ArrayBuffer(1024 * 2);
                                    for (let i = 0; i < frames; i++) {
                                        const ad = new AudioData({
                                            format: 's16', sampleRate: 48000,
                                            numberOfFrames: 1024, numberOfChannels: 1,
                                            timestamp: Math.round(i * 1024 * 1000000 / 48000),
                                            data: new Uint8Array(buf),
                                        });
                                        audioEncoder.encode(ad);
                                        ad.close();
                                    }
                                    await audioEncoder.flush();
                                    audioEncoder.close();
                                } catch(e) {}
                            }
                            if (cleanupPipeline) cleanupPipeline();
                            stream.getTracks().forEach(t => t.stop());
                            if (muxer) muxer.finalize();
                            if (muxer && muxer.target.buffer.byteLength > 0) {
                                const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                const tsName = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                                const prefix = videoPrefix ? videoPrefix + '-' : '';
                                const suffix = focusMode || 'video';
                                a.download = `${prefix}${suffix}_${tsName}.mp4`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                setTimeout(() => URL.revokeObjectURL(url), 5000);
                            }
                            if (this._onstop) this._onstop();
                        })();
                    },
                };

                stream.getVideoTracks()[0].addEventListener('ended', () => {
                    if (mediaRecorder._state !== 'inactive') mediaRecorder.stop();
                    if (abortController) abortController.abort();
                });

                mediaRecorder.start();
                return;
            }

            recordStream = canvas.captureStream(30);
        }

        const webmMime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
        let mp4Mime = null;
        if (wantMp4) {
            const mp4Codecs = ['video/mp4;codecs=avc1.42001E', 'video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1.4d0028'];
            for (const c of mp4Codecs) {
                if (MediaRecorder.isTypeSupported(c)) { mp4Mime = c; break; }
            }
        }
        const mimeType = mp4Mime || webmMime;
        const ext = wantMp4 ? 'mp4' : 'webm';

        mediaRecorder = new MediaRecorder(recordStream, { mimeType, videoBitsPerSecond: 8000000 });
        recordedChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            if (cleanupPipeline) cleanupPipeline();
            stream.getTracks().forEach(t => t.stop());
            if (recordedChunks.length > 0) {
                const rawBlob = new Blob(recordedChunks, { type: mimeType });
                const finishDownload = function (finalBlob) {
                    const url = URL.createObjectURL(finalBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                    const prefix = videoPrefix ? videoPrefix + '-' : '';
                    const suffix = focusMode || 'video';
                    a.download = `${prefix}${suffix}_${timestamp}.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                };
                if (ext === 'mp4') {
                    remuxMp4FastStart(rawBlob).then(finishDownload).catch(() => finishDownload(rawBlob));
                } else {
                    finishDownload(rawBlob);
                }
            }
        };

        stream.getVideoTracks()[0].addEventListener('ended', () => {
            if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
            if (abortController) abortController.abort();
        });

        mediaRecorder.start(100);
    }

    function getMediaRecorder() { return mediaRecorder; }
    function getAbortController() { return abortController; }
    function setAbortController(ac) { abortController = ac; }

    function openRecorderPopup(focusMode) {
        window.Config.saveConfig();
        const config = window.Config.getConfig();
        const sim = config.simulation || {};
        const dims = focusMode ? { w: 700, h: 620 } : { w: 1260, h: 620 };

        const popup = window.open(
            `index.html?recorder=1&focus=${focusMode || 'all'}&format=${encodeURIComponent(sim.videoFormat || 'mp4')}`,
            '4690-recorder',
            `width=${dims.w},height=${dims.h + 80},menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=no`
        );

        if (!popup) {
            alert('Permite ventanas emergentes (pop-ups) para usar la grabacion.');
        }
    }

    window.Recorder = {
        startRecording,
        getMediaRecorder,
        getAbortController,
        setAbortController,
        openRecorderPopup,
    };
})();
