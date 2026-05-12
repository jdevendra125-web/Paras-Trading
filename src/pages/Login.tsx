import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Sparkles, UserPlus, LogIn, Book } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Login() {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [honeypot, setHoneypot] = useState(''); // Simple bot protection
  const [forgotPw, setForgotPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // Silent discard for bots
    
    if (!email || !password) { setError('Please enter your credentials'); return; }
    
    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError('Please enter a valid business email'); return; }

    setSubmitting(true); setError(''); setMessage('');
    
    try {
      if (isSignUp) {
        if (password.length < 8) { throw new Error('Password must be at least 8 characters for security'); }
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) { setError(err.message); }
        else if (data.user && !data.session) { setMessage('Verification email sent! Secure your account by clicking the link.'); }
        else { navigate('/'); }
      } else {
        const { error: err } = await signIn(email, password);
        if (err) { 
          if (err.message.includes('rate limit')) setError('Too many attempts. System locked for 60s for security.');
          else setError('Invalid credentials. Access Denied.'); 
        }
        else { navigate('/'); }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected security error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) { setError('Please enter your email first'); return; }
    setSubmitting(true); setError(''); setMessage('');
    try {
      const { error: err } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      if (err) throw err;
      setMessage('New verification link sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email first'); return; }
    setSubmitting(true); setError(''); setMessage('');
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email);
      if (err) throw err;
      setMessage('Password reset link sent! Check your inbox.');
      setForgotPw(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const [showFAQ, setShowFAQ] = useState(false);
  const [showContact, setShowContact] = useState(false);

  return (
    <div className="h-full flex flex-col bg-bg-primary relative transition-colors duration-300 overflow-hidden">
      {/* Dynamic Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(185,28,28,0.05) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.05) 0%, transparent 70%)' }} />
      </div>



      {/* Main Content Area - Fixed, no scrolling */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 z-10 min-h-0 overflow-hidden">
        <div className="w-full max-w-sm flex flex-col items-center justify-center h-full max-h-full">
          
          {/* Modern App Logo - Always visible and centered */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center mb-6 sm:mb-8 text-center"
          >
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-black/5 mb-3 inline-block">
              <img src="/logo.png" alt="Digital LaalVahi" className="h-16 sm:h-20 w-16 sm:w-20 object-contain drop-shadow-md" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-content-primary leading-none">
              Digital Laal Vahi
            </h1>
            <p className="text-[11px] sm:text-[13px] font-bold text-accent-red tracking-[0.3em] uppercase mt-1">
              Smart Billing
            </p>
          </motion.div>

          {/* Dynamic Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <div className="bg-bg-card border border-content-primary/10 rounded-[2rem] p-5 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-red to-transparent opacity-50" />
              
              <h2 className="text-lg sm:text-xl font-bold text-content-primary mb-1 text-center">
                {forgotPw ? 'Reset Password' : isSignUp ? 'New Account' : 'Welcome Back'}
              </h2>
              <p className="text-[10px] sm:text-xs text-content-secondary mb-5 text-center">
                {forgotPw ? 'Enter email to get reset link' : isSignUp ? 'Create your digital red book today' : 'Sign in to manage your ledger'}
              </p>

              <form onSubmit={forgotPw ? handleForgotPassword : handleSubmit} className="space-y-4">
                <input type="text" value={honeypot} onChange={e => setHoneypot(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" />

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-content-muted uppercase tracking-wider ml-1">Email Terminal</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted"><Mail size={14} /></span>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input-field pl-10 py-2.5 text-sm"
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                </div>

                {!forgotPw && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[10px] font-bold text-content-muted uppercase tracking-wider">Username</label>
                      {!isSignUp && (
                        <button type="button" onClick={() => setForgotPw(true)} className="text-[10px] text-accent-blue hover:underline font-bold">Forgot?</button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-muted"><Lock size={14} /></span>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="input-field pl-10 pr-10 py-2.5 text-sm"
                        placeholder="••••••••"
                        required={!forgotPw}
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary transition-colors">
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-danger/10 border border-danger/20">
                    <AlertCircle size={14} className="text-danger flex-shrink-0" />
                    <p className="text-[10px] sm:text-xs text-danger font-bold leading-tight">{error}</p>
                  </motion.div>
                )}

                {message && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-accent-blue/10 border border-accent-blue/20">
                    <p className="text-[10px] sm:text-xs text-accent-blue font-bold">{message}</p>
                  </motion.div>
                )}

                <Button type="submit" className="btn-primary w-full py-2.5 mt-2" size="sm" loading={submitting}>
                  {forgotPw ? 'Get Reset Link' : isSignUp ? 'Create Account' : 'Sign In'}
                </Button>

                {forgotPw && (
                  <button type="button" onClick={() => setForgotPw(false)} className="w-full text-xs text-content-muted hover:text-content-primary font-bold mt-2">Back to Login</button>
                )}
              </form>

              {!forgotPw && (
                <div className="text-center mt-4">
                  <button 
                    onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
                    className="text-[10px] sm:text-xs text-content-secondary hover:text-content-primary transition-colors flex items-center justify-center gap-1.5 mx-auto font-medium"
                  >
                    {isSignUp ? (
                      <><LogIn size={12} /> Already authorized? Sign In</>
                    ) : (
                      <><UserPlus size={12} /> New system? Create Account</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Fixed Footer */}
      <footer className="py-4 sm:py-5 flex flex-col items-center gap-3 bg-bg-secondary border-t border-content-primary/5 z-50 flex-shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => setShowFAQ(true)} className="text-[10px] font-bold text-content-muted uppercase tracking-[0.2em] hover:text-accent-red transition-colors">FAQ</button>
          <button onClick={() => setShowContact(true)} className="text-[10px] font-bold text-content-muted uppercase tracking-[0.2em] hover:text-accent-red transition-colors">Contact</button>
        </div>
        <p className="text-[9px] font-bold text-content-muted uppercase tracking-[0.2em]">© 2026 Registered</p>
      </footer>

      {/* Popups */}

      <AnimatePresence>
        {showFAQ && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFAQ(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-bg-elevated w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-hidden">
               <h3 className="text-xl font-bold text-content-primary mb-6">Frequently Asked Questions</h3>
               <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                 {[
                   { q: "What is Digital Laal Vahi?", a: "It's a modern business billing and accounting software designed for fast invoice creation and ledger management." },
                   { q: "Is my data secure?", a: "Yes, we use enterprise-grade encryption and row-level security to protect your business records." },
                   { q: "Can I use it on mobile?", a: "Absolutely! The app is fully responsive and optimized for Android and iOS devices." },
                 ].map((f, i) => (
                   <div key={i} className="p-4 rounded-2xl bg-bg-secondary/50 border border-content-primary/5">
                     <p className="text-sm font-bold text-content-primary mb-1">Q. {f.q}</p>
                     <p className="text-xs text-content-secondary">{f.a}</p>
                   </div>
                 ))}
               </div>
               <Button className="btn-primary w-full mt-6" onClick={() => setShowFAQ(false)}>Close</Button>
            </motion.div>
          </div>
        )}

        {showContact && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowContact(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-bg-elevated w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl overflow-hidden">
               <h3 className="text-xl font-bold text-content-primary mb-2">Contact Support</h3>
               <p className="text-xs text-content-secondary mb-6">Our technical team is ready to assist you.</p>
               <div className="space-y-4">
                 <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg-secondary/50 border border-content-primary/5">
                   <Mail className="text-accent-red" size={20} />
                   <div>
                     <p className="text-[10px] font-bold text-content-muted uppercase tracking-widest">Email Address</p>
                     <p className="text-sm font-bold text-content-primary">support@registered.com</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg-secondary/50 border border-content-primary/5">
                   <Sparkles className="text-accent-gold" size={20} />
                   <div>
                     <p className="text-[10px] font-bold text-content-muted uppercase tracking-widest">Support Hours</p>
                     <p className="text-sm font-bold text-content-primary">Mon - Sat · 10 AM - 7 PM</p>
                   </div>
                 </div>
               </div>
               <Button className="btn-primary w-full mt-8" onClick={() => setShowContact(false)}>Got it</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
