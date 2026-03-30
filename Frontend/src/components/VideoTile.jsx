import React, { useEffect, useRef } from 'react';
import { Volume2, MicOff } from 'lucide-react';

export default function VideoTile({ 
    vid, 
    retryAutoplay, 
    isLocal = false, 
    username = '', 
    videoAvailable = true, 
    audioAvailable = true,
    onAutoplayFailure
}) {
    const videoElRef = useRef(null);
    const audioSourceRef = useRef(null);
    const gainNodeRef = useRef(null);

    /**
     * Attach the stream to the <video> element.
     * The <video> element is ALWAYS muted — remote audio is handled
     * separately via the Web Audio API (see next useEffect).
     * This is the definitive fix for Chrome's autoplay policy which
     * blocks unmuted <video>.play().
     */
    useEffect(() => {
        const videoEl = videoElRef.current;
        if (!videoEl) return;

        const stream = isLocal ? window.localStream : vid?.stream;
        if (!stream) return;
        if (videoEl.srcObject === stream) return;

        videoEl.srcObject = stream;
        videoEl.muted = true; // ALWAYS muted — audio goes through Web Audio API

        console.log(`[VideoTile] Assigned ${isLocal ? 'local' : vid?.socketId} stream. Tracks:`, 
            stream.getTracks().map(t => `${t.kind}:${t.readyState}:${t.enabled}`));

        videoEl.play().catch((e) => {
            if (e.name === 'AbortError') return;
            console.warn(`[VideoTile] Play failed for ${isLocal ? 'local' : vid?.socketId}:`, e.name);
        });

    }, [isLocal, vid?.stream, vid?.socketId]);

    /**
     * Web Audio API pipeline for REMOTE audio playback.
     * 
     * This completely bypasses Chrome's <video> autoplay restrictions.
     * The AudioContext was created during the "Join" button click (user gesture),
     * so it's in 'running' state and can play audio without restrictions.
     * 
     * Pipeline: RemoteStream → MediaStreamSource → GainNode → AudioContext.destination (speakers)
     */
    useEffect(() => {
        // Only for remote participants, not local (would cause echo)
        if (isLocal) return;

        const stream = vid?.stream;
        if (!stream) return;

        // Wait until the stream actually has audio tracks
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
            console.log(`[VideoTile] No audio tracks yet for ${vid?.socketId}, waiting...`);
            return;
        }

        const audioTrack = audioTracks[0];
        if (audioTrack.readyState !== 'live') {
            console.warn(`[VideoTile] Audio track for ${vid?.socketId} is ${audioTrack.readyState}, skipping Web Audio setup.`);
            return;
        }

        // Get or create the global AudioContext (created during user gesture in connect())
        if (!window.audioCtx) {
            window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = window.audioCtx;

        // Resume if suspended (Chrome suspends AudioContext until user gesture)
        if (ctx.state === 'suspended') {
            ctx.resume().then(() => {
                console.log(`[VideoTile] AudioContext resumed for ${vid?.socketId}`);
            });
        }

        // Disconnect previous source if it exists (stream reference changed)
        if (audioSourceRef.current) {
            try {
                audioSourceRef.current.disconnect();
            } catch (e) {}
        }
        if (gainNodeRef.current) {
            try {
                gainNodeRef.current.disconnect();
            } catch (e) {}
        }

        // Create the audio pipeline:
        // MediaStreamSource → GainNode → speakers
        try {
            const source = ctx.createMediaStreamSource(stream);
            const gainNode = ctx.createGain();
            gainNode.gain.value = 1.0;

            source.connect(gainNode);
            gainNode.connect(ctx.destination);

            audioSourceRef.current = source;
            gainNodeRef.current = gainNode;

            console.log(`[VideoTile] ✅ Web Audio pipeline active for ${vid?.socketId} (${audioTrack.kind}:${audioTrack.readyState}:${audioTrack.enabled})`);
        } catch (e) {
            console.error(`[VideoTile] Failed to create Web Audio pipeline for ${vid?.socketId}:`, e);
        }

        // Cleanup when stream changes or component unmounts
        return () => {
            try {
                if (audioSourceRef.current) {
                    audioSourceRef.current.disconnect();
                    audioSourceRef.current = null;
                }
                if (gainNodeRef.current) {
                    gainNodeRef.current.disconnect();
                    gainNodeRef.current = null;
                }
            } catch (e) {}
        };
    }, [isLocal, vid?.stream, vid?.socketId]);

    // Keep local stream in sync (localStream can change without vid prop changing)
    useEffect(() => {
        if (!isLocal) return;
        const videoEl = videoElRef.current;
        if (!videoEl || !window.localStream) return;
        if (videoEl.srcObject === window.localStream) return;

        videoEl.srcObject = window.localStream;
        videoEl.muted = true; // Local is always muted
        videoEl.play().catch(() => {});
    });

    return (
        <div className="relative w-full h-full min-h-[200px] bg-background border border-accent rounded-2xl overflow-hidden shadow-sm group hover:shadow-md transition-shadow">
            
            {/* Video element — ALWAYS muted. Remote audio comes through Web Audio API. */}
            <video
                data-socket={!isLocal ? vid?.socketId : undefined}
                ref={videoElRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!videoAvailable && isLocal ? 'hidden' : ''}`}
            ></video>

            {/* Local Fallback Avatar if camera is disabled */}
            {isLocal && !videoAvailable && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
                    <div className="w-16 h-16 bg-accent border border-accent rounded-full flex items-center justify-center mb-2 shadow-sm">
                        <span className="text-2xl text-textMain font-bold">
                            {username.charAt(0).toUpperCase()}
                        </span>
                    </div>
                </div>
            )}

            {/* Autoplay Chrome Fallback Overlay */}
            {!isLocal && vid?.autoplayFailed && (
                <div className="absolute inset-0 bg-white/60 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                    <button 
                        onClick={() => retryAutoplay && retryAutoplay(vid.socketId)}
                        className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xl"
                    >
                        <Volume2 size={20} />
                        Click to Enable Audio
                    </button>
                </div>
            )}

            {/* Bottom Metadata Label */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 border border-accent rounded-lg text-textMain text-sm font-semibold z-10 flex items-center gap-2 shadow-sm">
                
                {/* Green Live Indicator */}
                <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                
                {isLocal ? `${username} (You)` : (vid?.username || "Participant")}
                
                {!audioAvailable && isLocal && <MicOff size={14} className="text-red-500 ml-1" />}
            </div>
            
        </div>
    );
}
