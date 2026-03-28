import React, { useContext, useState } from "react";
import withAuth from "../utils/withAuth.jsx";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext.jsx";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Plus, Check, Copy, ArrowRight, Clock, LogOut } from "lucide-react";

function HomeComponent() {
    const navigate = useNavigate();
    const { user, handleLogout, generateMeeting, joinMeeting } = useContext(AuthContext);

    const [meetingCode, setMeetingCode] = useState("");
    const [generatedCode, setGeneratedCode] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState("");
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const code = await generateMeeting();
            setGeneratedCode(code);
        } catch {
            // Error handled silently
        } finally {
            setGenerating(false);
        }
    };

    const handleJoin = async () => {
        if (!meetingCode.trim()) {
            setJoinError("Please enter a meeting code.");
            return;
        }
        setJoinError("");
        setJoining(true);
        try {
            await joinMeeting(meetingCode.trim());
            navigate(`/meeting/${meetingCode.trim()}`);
        } catch (err) {
            setJoinError(
                err.response?.data?.message || "Meeting not found. Check the code."
            );
        } finally {
            setJoining(false);
        }
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/meeting/${generatedCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGoToMeeting = () => {
        navigate(`/meeting/${generatedCode}`);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 lg:p-12 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header Section */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-12"
                >
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ""}!
                    </h1>
                    <p className="text-white-muted text-lg">
                        Start an instant meeting or join an existing one.
                    </p>
                </motion.div>

                {/* Main Action Cards */}
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-12"
                >
                    {/* New Meeting Card */}
                    <motion.div variants={cardVariants} className="glass-panel p-8 rounded-3xl flex flex-col group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                        
                        <div className="w-14 h-14 bg-teal/10 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                            <Plus size={28} className="text-teal" />
                        </div>
                        
                        <h2 className="text-2xl font-bold text-white mb-3 relative z-10">New Meeting</h2>
                        <p className="text-white-muted mb-8 flex-grow relative z-10">
                            Generate a secure, unique meeting link to share with your team or clients instantly.
                        </p>

                        <AnimatePresence mode="wait">
                            {!generatedCode ? (
                                <motion.button
                                    key="generate-btn"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={handleGenerate}
                                    disabled={generating}
                                    className="w-full py-3.5 bg-teal hover:bg-teal-hover text-navy-900 font-bold rounded-xl transition-all shadow-lg shadow-teal/20 flex items-center justify-center gap-2 relative z-10"
                                >
                                    {generating ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-navy-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Creating Secure Room...
                                        </>
                                    ) : (
                                        "Generate Meeting Link"
                                    )}
                                </motion.button>
                            ) : (
                                <motion.div 
                                    key="result-pane"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="space-y-4 relative z-10"
                                >
                                    <div className="flex items-center justify-between p-3.5 bg-navy-900 border border-navy-700 rounded-xl">
                                        <code className="text-teal font-mono text-lg tracking-wider">{generatedCode}</code>
                                        <button 
                                            onClick={handleCopyLink}
                                            className="p-2 bg-navy-800 hover:bg-navy-700 rounded-lg text-white-muted hover:text-white transition-colors flex items-center gap-2"
                                            title="Copy Link"
                                        >
                                            {copied ? <Check size={18} className="text-teal" /> : <Copy size={18} />}
                                        </button>
                                    </div>
                                    <button 
                                        onClick={handleGoToMeeting}
                                        className="w-full py-3.5 border border-teal text-teal hover:bg-teal hover:text-navy-900 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        Join Room Now <ArrowRight size={18} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Join Meeting Card */}
                    <motion.div variants={cardVariants} className="glass-panel p-8 rounded-3xl flex flex-col group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                        
                        <div className="w-14 h-14 bg-navy-800 border border-navy-700 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                            <Video size={28} className="text-white" />
                        </div>
                        
                        <h2 className="text-2xl font-bold text-white mb-3 relative z-10">Join a Meeting</h2>
                        <p className="text-white-muted mb-8 flex-grow relative z-10">
                            Have an invite code? Enter it below to securely connect to your meeting room.
                        </p>

                        <div className="space-y-4 relative z-10">
                            {joinError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                    {joinError}
                                </div>
                            )}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="e.g. abc-defg-hij"
                                    value={meetingCode}
                                    onChange={(e) => {
                                        setMeetingCode(e.target.value);
                                        setJoinError("");
                                    }}
                                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                                    className="w-full pl-4 pr-12 py-3.5 bg-navy-900 border border-navy-700 rounded-xl focus:ring-2 focus:ring-teal focus:border-transparent text-white placeholder-white-darker outline-none transition-all font-mono tracking-wider"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                    <div className="text-xs text-navy-700 font-bold bg-navy-800 px-2 py-1 rounded border border-navy-700">↵</div>
                                </div>
                            </div>
                            
                            <button
                                onClick={handleJoin}
                                disabled={joining || !meetingCode.trim()}
                                className="w-full py-3.5 bg-white hover:bg-white-muted text-navy-900 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {joining ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-navy-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Connecting...
                                    </>
                                ) : (
                                    "Join Room"
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Secondary Actions */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <button 
                        onClick={() => navigate("/history")}
                        className="glass-panel hover:bg-navy-800 transition-colors px-6 py-3 rounded-xl flex items-center gap-3 text-white-muted hover:text-white"
                    >
                        <Clock size={18} />
                        View Meeting History
                    </button>
                    {/* Logout button duplicated here for convenience on mobile */}
                    <button 
                        onClick={() => {
                            if(handleLogout) handleLogout();
                            else {
                                localStorage.removeItem("accessToken");
                                window.location.href = "/";
                            }
                        }}
                        className="sm:hidden glass-panel hover:bg-red-500/10 border-red-500/20 hover:border-red-500/30 transition-colors px-6 py-3 rounded-xl flex items-center gap-3 text-red-400"
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </motion.div>
            </div>
        </div>
    );
}

export default withAuth(HomeComponent);