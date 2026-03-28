import React, { useContext, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import io from "socket.io-client";
import { 
    Video, VideoOff, PhoneOff, Mic, MicOff, 
    MonitorUp, MonitorOff, MessageSquare, X, Send, Users, Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import server from '../environment';
import { AuthContext } from '../contexts/AuthContext';
import api from '../utils/api';

const server_url = server;
var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" },
        { "urls": "stun:stun1.l.google.com:19302" },
        { "urls": "stun:global.stun.twilio.com:3478" }
    ]
}

export default function VideoMeetComponent() {

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState(true);
    let [audio, setAudio] = useState(true);
    let [screen, setScreen] = useState();
    let [showModal, setModal] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState();
    let [messages, setMessages] = useState([]);
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    
    let [joinStep, setJoinStep] = useState('loading'); // loading, lobby, meeting, error
    let [joinError, setJoinError] = useState("");
    let [username, setUsername] = useState("");

    const videoRef = useRef([])
    let [videos, setVideos] = useState([])

    const { user, isAuthenticated, addToUserHistory } = useContext(AuthContext);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { meetingCode } = useParams();

    // Validate meeting and initialize name
    useEffect(() => {
        const validateMeeting = async () => {
            try {
                if (meetingCode) {
                    await api.post("/api/meeting/join", { meetingCode });
                }

                const guestName = searchParams.get('guest');
                if (isAuthenticated && user) {
                    setUsername(user.name || user.username);
                } else if (guestName) {
                    setUsername(decodeURIComponent(guestName));
                }
                
                setJoinStep('lobby');
            } catch (err) {
                setJoinError(err.response?.data?.message || "Invalid meeting code.");
                setJoinStep('error');
            }
        };

        validateMeeting();

        // Cleanup: disconnect socket on unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [isAuthenticated, user, searchParams, meetingCode]);

    // getDislayMedia legacy function removed safely

    const getPermissions = async () => {
        try {
            // Safari/Firefox standard: Request once batched.
            const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            
            // Explicitly ensure audio is enabled
            userMediaStream.getAudioTracks().forEach(track => { track.enabled = true; });
            console.log("[WebRTC] Initial audio track enabled:", userMediaStream.getAudioTracks().length > 0 ? userMediaStream.getAudioTracks()[0].enabled : "No track");
            console.log("[WebRTC] Initial video track enabled:", userMediaStream.getVideoTracks().length > 0 ? userMediaStream.getVideoTracks()[0].enabled : "No track");

            setVideoAvailable(true);
            setAudioAvailable(true);
            setVideo(true);
            setAudio(true);

            window.localStream = userMediaStream;
            if (localVideoref.current) {
                localVideoref.current.srcObject = userMediaStream;
            }
            
            // Check Screen device availability softly
            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }
            
        } catch (error) {
            console.log("Media Access Error:", error.name, error.message);
            
            // Fallback: If camera is broken/in-use, try Audio only
            if (error.name === "NotReadableError" || error.name === "OverconstrainedError" || error.name === "NotFoundError") {
                try {
                    const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                    audioOnlyStream.getAudioTracks().forEach(track => { track.enabled = true; });
                    console.log("[WebRTC] Fallback audio track enabled:", audioOnlyStream.getAudioTracks()[0]?.enabled);

                    setVideoAvailable(false);
                    setAudioAvailable(true);
                    setVideo(false);
                    setAudio(true);
                    
                    window.localStream = audioOnlyStream;
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = audioOnlyStream;
                    }
                    if (navigator.mediaDevices.getDisplayMedia) setScreenAvailable(true);
                } catch (audioError) {
                    console.log("Audio Fallback Error:", audioError);
                    alert("Could not access camera or microphone. Please check your permissions.");
                    setVideoAvailable(false);
                    setAudioAvailable(false);
                }
            } else if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
                // User explicitly clicked "Deny"
                alert("You have denied media permissions. You can still join, but others won't see or hear you.");
                setVideoAvailable(false);
                setAudioAvailable(false);
                setVideo(false);
                setAudio(false);
            }
        }
    };

    // Removed problematic useEffect that recursively called getUserMedia
    // Instead of completely reconstructing the stream, we just toggle track.enabled in handleAudio/handleVideo

    let getMedia = () => {
        // Assume connectToSocketServer is called only after resolving the initial media prompt
        connectToSocketServer();
    }

    let getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoref.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            localVideoref.current.srcObject = window.localStream

            for (let id in connections) {
                connections[id].addStream(window.localStream)

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .then((stream) => { })
                .catch((e) => console.log(e))
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { }
        }
    }

    // getDislayMediaSuccess legacy function removed safely

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { 
            secure: false, 
            transports: ["websocket", "polling"]
        })

        socketRef.current.on('signal', gotMessageFromServer)

        // Register chat-message listener ONCE (outside 'connect' event)
        socketRef.current.on('chat-message', addMessage)

        socketRef.current.on('user-left', (id) => {
            setVideos((videos) => videos.filter((video) => video.socketId !== id))
        })

        socketRef.current.on('connect', () => {
            // Send username directly to the backend mapping on join
            socketRef.current.emit('join-call', window.location.href, username)
            socketIdRef.current = socketRef.current.id

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((clientInfo) => {
                    let socketListId = typeof clientInfo === 'string' ? clientInfo : clientInfo.socketId;
                    let clientUsername = typeof clientInfo === 'string' ? "Participant" : clientInfo.username;

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections)
                    // Wait for their ice candidate       
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }

                    // Wait for their video stream
                    connections[socketListId].ontrack = (event) => {
                        console.log("[WebRTC] Received remote track:", event.track.kind);
                        
                        setVideos(prevVideos => {
                            let existingVideoIndex = prevVideos.findIndex(video => video.socketId === socketListId);

                            if (existingVideoIndex !== -1) {
                                // Accumulate new track into the existing video stream safely without duplicating state keys!
                                let existingStream = prevVideos[existingVideoIndex].stream;

                                if (event.streams && event.streams[0]) {
                                    event.streams[0].getTracks().forEach(track => {
                                        if (!existingStream.getTracks().includes(track)) {
                                            existingStream.addTrack(track);
                                        }
                                    });
                                } else {
                                    // Fallback for browsers returning track explicitly
                                    if (!existingStream.getTracks().includes(event.track)) {
                                        existingStream.addTrack(event.track);
                                    }
                                }

                                console.log(`[WebRTC] Attached ${event.track.kind} track to existing video object safely for ${socketListId}.`);
                                
                                // Return the exact same reference: React skips the render, but the DOM <video> element instantly pulls active track bytes!
                                return prevVideos;
                            } else {
                                // This is the first track arriving for this user. Create their remote UI container safely.
                                console.log(`[WebRTC] Creating new participant stream for ${socketListId} starting with ${event.track.kind} track.`);
                                
                                let newStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
                                let newVideo = {
                                    socketId: socketListId,
                                    stream: newStream,
                                    username: clientUsername,
                                    autoplay: true,
                                    playsinline: true,
                                    autoplayFailed: false
                                };

                                const updatedVideos = [...prevVideos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            }
                        });
                    };

                    // Add the local video stream using modern addTrack iteration.
                    if (window.localStream !== undefined && window.localStream !== null) {
                        window.localStream.getTracks().forEach(track => {
                            connections[socketListId].addTrack(track, window.localStream);
                        });
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                        window.localStream = blackSilence()
                        connections[socketListId].addStream(window.localStream)
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue

                        try {
                            window.localStream.getTracks().forEach(track => {
                                connections[id2].addTrack(track, window.localStream);
                            });
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }
            })
        })
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }
    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    let handleVideo = () => {
        setVideo(!video);
        if (window.localStream) {
            window.localStream.getVideoTracks().forEach(track => {
                track.enabled = !video; // Toggle state
            });
            console.log("[WebRTC] Video track enabled:", !video);
        }
    }
    let handleAudio = () => {
        setAudio(!audio);
        if (window.localStream) {
            window.localStream.getAudioTracks().forEach(track => {
                track.enabled = !audio; // Toggle state
            });
            console.log("[WebRTC] Audio track enabled:", !audio);
        }
    }

    let stopScreenShare = async () => {
        try {
            // Re-acquire camera stream natively
            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const cameraTrack = cameraStream.getVideoTracks()[0];
            
            // Respect previous video toggle state!
            cameraTrack.enabled = video; 

            // Hot-swap back to camera without re-negotiating the handshake
            for (let id in connections) {
                if (id === socketIdRef.current) continue;
                const videoSender = connections[id].getSenders().find(s => s.track && s.track.kind === "video");
                if (videoSender) {
                    videoSender.replaceTrack(cameraTrack);
                    console.log(`[WebRTC] Replaced Track back to Camera for ${id}`);
                }
            }

            // Sync visual UI securely
            try {
                window.localStream.getVideoTracks().forEach(track => track.stop());
            } catch (e) { console.log(e) }

            window.localStream = new MediaStream([cameraTrack, window.localStream.getAudioTracks()[0]]);
            localVideoref.current.srcObject = window.localStream;
            setScreen(false);
            console.log("[WebRTC] Successfully restored Camera stream.");
        } catch (error) {
            console.error("[WebRTC] Failed to restore camera after screen share", error);
        }
    };

    let handleScreen = async () => {
        if (!screen) {
            try {
                // Fetch just video tracking payload
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];

                // Hot-swap into remote peers
                for (let id in connections) {
                    if (id === socketIdRef.current) continue;
                    const videoSender = connections[id].getSenders().find(s => s.track && s.track.kind === "video");
                    if (videoSender) {
                        videoSender.replaceTrack(screenTrack);
                        console.log(`[WebRTC] Broadcasted Screen Track to ${id}`);
                    }
                }

                screenTrack.onended = () => {
                    stopScreenShare();
                };

                // Sync local displays securely 
                try {
                    window.localStream.getVideoTracks().forEach(track => track.stop());
                } catch (e) { console.log(e) }

                window.localStream = new MediaStream([screenTrack, window.localStream.getAudioTracks()[0]]);
                localVideoref.current.srcObject = window.localStream;
                setScreen(true);
                console.log("[WebRTC] Screen sharing active natively.");
            } catch (error) {
                console.log("[WebRTC] Screen share failed or cancelled", error);
                setScreen(false);
            }
        } else {
            // Trigger loop termination physically
            stopScreenShare();
        }
    };

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        
        // Route according to user identity, avoiding a hard reload that might reset context
        if (isAuthenticated) {
            navigate("/home");
        } else {
            navigate("/");
        }
    }

    let openChat = () => {
        setModal(true);
        setNewMessages(0);
    }
    let closeChat = () => {
        setModal(false);
    }
    let handleMessage = (e) => {
        setMessage(e.target.value);
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    let sendMessage = (e) => {
        if(e) e.preventDefault();
        if(!message.trim()) return;
        // We do not need to send username in payload anymore, backend uses identity mapping
        socketRef.current.emit('chat-message', message)
        setMessage("");
    }

    let connect = async () => {
        if (!username.trim()) return;
        
        // Save to history if authenticated
        if (isAuthenticated) {
            try {
                await addToUserHistory(meetingCode);
            } catch (err) {
                console.error("Failed to add to history:", err);
            }
        }

        setJoinStep('meeting');
        await getPermissions();
        getMedia();
    }

    // ─── Render Logic ──────────────────────────────────────────

    if (joinStep === 'loading') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-navy-900 text-white">
                <svg className="animate-spin h-10 w-10 text-teal mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h2 className="text-xl font-medium text-white-muted">Preparing Meeting Room...</h2>
            </div>
        );
    }

    if (joinStep === 'error') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-navy-900 text-white p-4 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                    <X size={32} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{joinError}</h2>
                <p className="text-white-muted mb-8 max-w-md">There was a problem accessing this meeting room. Please ensure the link is correct.</p>
                <button 
                    onClick={() => navigate('/home')}
                    className="px-6 py-3 bg-teal hover:bg-teal-hover text-navy-900 font-bold rounded-lg transition-colors"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    if (joinStep === 'lobby') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-navy-900 p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel w-full max-w-md p-8 rounded-2xl relative z-10"
                >
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal/10 text-teal mb-4">
                            <Video size={24} />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Join Meeting</h1>
                        <p className="text-sm text-white-muted">Room Code: <span className="font-mono text-teal">{meetingCode}</span></p>
                    </div>

                    {isAuthenticated && user ? (
                        <div className="space-y-6">
                            <div className="bg-navy-800 border border-navy-700 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">
                                    {username.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-white-muted">Joining as</p>
                                    <p className="font-semibold text-white">{username}</p>
                                </div>
                            </div>
                            <button 
                                onClick={connect}
                                className="w-full py-3.5 bg-teal hover:bg-teal-hover text-navy-900 font-bold rounded-xl transition-all shadow-lg"
                            >
                                Enter Room Now
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <p className="text-center text-sm text-white-muted mb-2">You are joining as a guest. Please enter your name.</p>
                            <div>
                                <label className="block text-sm font-medium text-white-muted mb-1.5">Your Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2.5 bg-navy-900 border border-navy-700 rounded-lg focus:ring-2 focus:ring-teal text-white outline-none transition-all"
                                    placeholder="Enter your name"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <button 
                                onClick={connect}
                                disabled={!username.trim()}
                                className="w-full py-3.5 bg-teal hover:bg-teal-hover text-navy-900 font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Join as Guest
                            </button>
                            <p className="text-center mt-4 text-sm text-white-darker">
                                Have an account? <span className="text-teal hover:text-teal-light cursor-pointer font-medium transition-colors" onClick={() => navigate(`/auth?returnTo=/meeting/${meetingCode}`)}>Sign In</span>
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        );
    }

    let handleAutoplayFailure = (socketId) => {
        setVideos(prev => prev.map(v => v.socketId === socketId ? { ...v, autoplayFailed: true } : v));
    };

    let retryAutoplay = (socketId) => {
        const vidElement = document.querySelector(`video[data-socket="${socketId}"]`);
        if (vidElement) {
            vidElement.play().then(() => {
                setVideos(prev => prev.map(v => v.socketId === socketId ? { ...v, autoplayFailed: false } : v));
            }).catch(console.error);
        }
    };

    // ACTIVE MEETING UI
    return (
        <div className="h-screen w-full bg-navy-900 overflow-hidden flex flex-col relative">
            
            {/* Header / Info bar (Floating) */}
            <div className="absolute top-4 left-4 z-20 glass-panel px-4 py-2 rounded-lg flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-teal animate-pulse"></div>
                <span className="font-mono text-white text-sm tracking-widest">{meetingCode}</span>
            </div>

            {/* Main Video Area */}
            <div className={`flex-1 flex overflow-hidden ${showModal ? 'w-[calc(100%-350px)]' : 'w-full'} transition-all duration-300`}>
                <div className="flex-1 p-4 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr items-center justify-center content-center w-full h-[calc(100vh-80px)]">
                    
                    {/* Local Video */}
                    <div className="relative w-full h-full min-h-[200px] bg-navy-800 rounded-2xl overflow-hidden border border-navy-700 shadow-xl group">
                        <video 
                            ref={localVideoref} 
                            autoPlay 
                            muted 
                            playsInline
                            className={`w-full h-full object-cover ${!videoAvailable ? 'hidden' : ''}`}
                        ></video>
                        {!videoAvailable && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy-800">
                                <div className="w-16 h-16 bg-navy-700 rounded-full flex items-center justify-center mb-2">
                                    <span className="text-2xl text-white font-bold">{username.charAt(0).toUpperCase()}</span>
                                </div>
                            </div>
                        )}
                        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-md text-white text-sm font-medium z-10 flex items-center gap-2">
                            {username} (You)
                            {!audioAvailable && <MicOff size={14} className="text-red-400" />}
                        </div>
                    </div>

                    {/* Remote Videos */}
                    {videos.map((vid) => (
                        <div key={vid.socketId} className="relative w-full h-full min-h-[200px] bg-navy-800 rounded-2xl overflow-hidden border border-navy-700 shadow-xl group">
                            <video
                                data-socket={vid.socketId}
                                ref={ref => {
                                    if (ref) {
                                        if (ref.srcObject !== vid.stream) {
                                            ref.srcObject = vid.stream;
                                            console.log(`[WebRTC] Assigned stream to video element for ${vid.socketId}`);
                                        }
                                        ref.play().catch(e => {
                                            console.warn("[WebRTC] Chrome blocked AutoPlay:", e);
                                            if (!vid.autoplayFailed) handleAutoplayFailure(vid.socketId);
                                        });
                                    }
                                }}
                                autoPlay
                                playsInline
                                muted={false}
                                className="w-full h-full object-cover"
                            ></video>

                            {vid.autoplayFailed && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                                    <button 
                                        onClick={() => retryAutoplay(vid.socketId)}
                                        className="px-6 py-3 bg-teal hover:bg-teal-hover text-navy-900 font-bold rounded-lg transition-colors flex items-center gap-2 shadow-xl"
                                    >
                                        <Volume2 size={20} />
                                        Click to Enable Audio
                                    </button>
                                </div>
                            )}

                            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-md text-white text-sm font-medium z-10">
                                {vid.username || "Participant"}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Side Chat Panel */}
            <AnimatePresence>
                {showModal && (
                    <motion.div 
                        initial={{ x: 350, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 350, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="absolute right-0 top-0 w-[350px] h-[calc(100vh-80px)] bg-navy-800 border-l border-navy-700 flex flex-col shadow-2xl z-20"
                    >
                        <div className="p-4 border-b border-navy-700 flex justify-between items-center bg-navy-900">
                            <h2 className="text-white font-bold flex items-center gap-2">
                                <MessageSquare size={18} className="text-teal" /> In-call Messages
                            </h2>
                            <button onClick={closeChat} className="text-white-muted hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-navy-800">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-white-muted opacity-50">
                                    <MessageSquare size={32} className="mb-2" />
                                    <p className="text-sm">No messages yet.</p>
                                    <p className="text-xs mt-1">Say hi to everyone!</p>
                                </div>
                            ) : (
                                messages.map((item, index) => {
                                    const isMe = item.sender === username;
                                    return (
                                        <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <span className="text-xs text-white-muted mb-1 ml-1">{isMe ? "You" : item.sender}</span>
                                            <div className={`px-4 py-2 rounded-2xl max-w-[85%] ${isMe ? 'bg-teal text-navy-900 rounded-tr-sm' : 'bg-navy-700 text-white rounded-tl-sm'}`}>
                                                <p className="text-sm break-words">{item.data}</p>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        <div className="p-4 bg-navy-900 border-t border-navy-700">
                            <form onSubmit={sendMessage} className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={message}
                                    onChange={handleMessage}
                                    placeholder="Send a message..."
                                    className="flex-1 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal transition-colors"
                                />
                                <button 
                                    type="submit"
                                    disabled={!message.trim()}
                                    className="bg-teal hover:bg-teal-hover text-navy-900 p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Control Bar */}
            <div className="h-[80px] w-full bg-navy-900 border-t border-navy-800 flex items-center justify-center px-4 z-30">
                <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
                    {/* Audio */}
                    <button 
                        onClick={handleAudio} 
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${audio ? 'bg-navy-700 text-white hover:bg-navy-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
                        title={audio ? "Mute Microphone" : "Unmute Microphone"}
                    >
                        {audio ? <Mic size={22} /> : <MicOff size={22} />}
                    </button>
                    
                    {/* Video */}
                    <button 
                        onClick={handleVideo} 
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${video ? 'bg-navy-700 text-white hover:bg-navy-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
                        title={video ? "Turn Off Camera" : "Turn On Camera"}
                    >
                        {video ? <Video size={22} /> : <VideoOff size={22} />}
                    </button>

                    {/* Screen Share */}
                    {screenAvailable && (
                        <button 
                            onClick={handleScreen} 
                            className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all shadow-lg hidden sm:flex ${screen ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-navy-700 text-white hover:bg-navy-600'}`}
                            title={screen ? "Stop Sharing" : "Share Screen"}
                        >
                            {screen ? <MonitorOff size={22} /> : <MonitorUp size={22} />}
                        </button>
                    )}

                    {/* Chat */}
                    <button 
                        onClick={() => {
                            if(showModal) closeChat();
                            else openChat();
                        }} 
                        className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${showModal ? 'bg-teal text-navy-900 border-2 border-navy-900' : 'bg-navy-700 text-white hover:bg-navy-600'}`}
                        title="Chat"
                    >
                        <MessageSquare size={22} />
                        {newMessages > 0 && !showModal && (
                            <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-navy-900 transform translate-x-1 -translate-y-1">
                                {newMessages > 9 ? '9+' : newMessages}
                            </span>
                        )}
                    </button>

                    <div className="w-[1px] h-8 bg-navy-700 mx-2"></div>

                    {/* Leave Call */}
                    <button 
                        onClick={handleEndCall} 
                        className="px-6 h-12 md:h-14 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center gap-2 font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all"
                        title="Leave Call"
                    >
                        <PhoneOff size={22} />
                        <span className="hidden md:block">Leave Call</span>
                    </button>
                </div>
            </div>

        </div>
    )
}