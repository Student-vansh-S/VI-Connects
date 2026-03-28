import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Video, LogOut, Menu, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
    const { isAuthenticated, user, handleLogout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navLinks = isAuthenticated ? (
        <>
            <Link to="/home" className="text-white-muted hover:text-teal transition-colors">Dashboard</Link>
            <Link to="/history" className="text-white-muted hover:text-teal transition-colors">History</Link>
            <div className="relative group">
                <button className="flex items-center gap-2 text-white-muted hover:text-teal transition-colors">
                    <User size={18} />
                    <span>{user?.name || "Profile"}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-navy-800 border border-navy-700 rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                    <button 
                        onClick={() => {
                            if(handleLogout) handleLogout();
                            else {
                                localStorage.removeItem("accessToken");
                                window.location.href = "/";
                            }
                        }}
                        className="flex w-full items-center gap-2 px-4 py-3 text-red-400 hover:bg-navy-700 transition-colors"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </div>
        </>
    ) : (
        <>
            <Link to="/guest-join" className="text-white-muted hover:text-teal transition-colors">Join as Guest</Link>
            <Link to="/auth" className="text-white-muted hover:text-teal transition-colors">Login</Link>
            <Link to="/auth?mode=register" className="bg-teal hover:bg-teal-hover text-navy-900 px-4 py-2 rounded-lg font-medium transition-colors">
                Sign Up
            </Link>
        </>
    );

    return (
        <nav className="fixed w-full top-0 z-50 bg-navy-900/80 backdrop-blur-md border-b border-navy-800 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link to={isAuthenticated ? "/home" : "/"} className="flex items-center gap-2 group">
                        <div className="bg-teal/10 p-2 rounded-lg group-hover:bg-teal/20 transition-colors">
                            <Video className="text-teal" size={24} />
                        </div>
                        <span className="text-xl font-bold text-white tracking-tight">VI Connects</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="text-white-muted hover:text-white"
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-navy-800 border-b border-navy-700"
                    >
                        <div className="px-4 pt-2 pb-4 flex flex-col gap-4">
                            {isAuthenticated ? (
                                <>
                                    <Link to="/home" onClick={() => setIsMobileMenuOpen(false)} className="text-white-muted hover:text-teal py-2">Dashboard</Link>
                                    <Link to="/history" onClick={() => setIsMobileMenuOpen(false)} className="text-white-muted hover:text-teal py-2">History</Link>
                                    <button 
                                        onClick={() => {
                                            if(handleLogout) handleLogout();
                                            else {
                                                localStorage.removeItem("accessToken");
                                                window.location.href = "/";
                                            }
                                        }}
                                        className="text-left text-red-400 py-2 flex items-center gap-2"
                                    >
                                        <LogOut size={16} /> Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to="/guest-join" onClick={() => setIsMobileMenuOpen(false)} className="text-white-muted hover:text-teal py-2">Join as Guest</Link>
                                    <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)} className="text-white-muted hover:text-teal py-2">Login</Link>
                                    <Link to="/auth?mode=register" onClick={() => setIsMobileMenuOpen(false)} className="bg-teal text-navy-900 px-4 py-2 rounded-lg font-medium text-center">Sign Up</Link>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
