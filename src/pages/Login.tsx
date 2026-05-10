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

  return (
    <div className="min-h-dvh flex flex-col bg-bg-primary overflow-hidden relative transition-colors duration-300">
      {/* Dynamic Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-accent-red/5 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-accent-gold/5 blur-[120px]" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 relative z-10">
        {/* Premium Ledger Image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 relative group"
        >
          <div className="w-48 h-32 rounded-3xl overflow-hidden border-2 border-accent-gold/20 shadow-2xl relative">
            <img 
              src="/laal_vahi_ledger.png" 
              alt="Laal Vahi Ledger" 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
          <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-2xl bg-accent-red flex items-center justify-center shadow-glow-red text-white">
            <Book size={24} />
          </div>
        </motion.div>

        {/* Modern App Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center mb-8 text-center"
        >
          <h1 className="text-4xl font-bold font-display text-content-primary tracking-tight">Digital <span className="text-accent-red">Laal Vahi</span></h1>
          <p className="text-sm text-accent-gold font-bold uppercase tracking-widest mt-2">Smart Digital Business Book</p>
        </motion.div>

        {/* Dynamic Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          <div className="bg-bg-card border border-content-primary/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-red to-transparent opacity-50" />
            
            <h2 className="text-xl font-bold text-content-primary mb-1 text-center">
              {forgotPw ? 'Reset Password' : isSignUp ? 'New Account' : 'Welcome Back'}
            </h2>
            <p className="text-xs text-content-secondary mb-8 text-center">
              {forgotPw ? 'Enter email to get reset link' : isSignUp ? 'Create your digital red book today' : 'Sign in to manage your business ledger'}
            </p>

            <form onSubmit={forgotPw ? handleForgotPassword : handleSubmit} className="space-y-5">
              {/* Honeypot field (hidden) */}
              <input type="text" value={honeypot} onChange={e => setHoneypot(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" />

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-content-muted uppercase tracking-wider ml-1">Email Terminal</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted"><Mail size={16} /></span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field pl-12"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              {!forgotPw && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-bold text-content-muted uppercase tracking-wider">Access Token</label>
                    {!isSignUp && (
                      <button type="button" onClick={() => setForgotPw(true)} className="text-[10px] text-accent-blue hover:underline font-bold">Forgot?</button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-content-muted"><Lock size={16} /></span>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input-field pl-12 pr-12"
                      placeholder="••••••••"
                      required={!forgotPw}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-primary transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-danger/10 border border-danger/20">
                  <AlertCircle size={16} className="text-danger flex-shrink-0" />
                  <p className="text-xs text-danger font-bold">{error}</p>
                </motion.div>
              )}

              {message && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-2 px-4 py-3 rounded-2xl bg-accent-blue/10 border border-accent-blue/20">
                  <p className="text-xs text-accent-blue font-bold">{message}</p>
                  {message.includes('Verification') && (
                    <button type="button" onClick={handleResendEmail} className="text-[10px] text-accent-blue underline font-bold text-left">
                      Didn't get it? Resend now
                    </button>
                  )}
                </motion.div>
              )}

              <Button type="submit" className="btn-primary w-full" size="lg" loading={submitting}>
                {forgotPw ? 'Get Reset Link' : isSignUp ? 'Create My Account' : 'Sign In to Ledger'}
              </Button>

              {forgotPw && (
                <button type="button" onClick={() => setForgotPw(false)} className="w-full text-xs text-content-muted hover:text-content-primary font-bold">Back to Login</button>
              )}
            </form>

            {!forgotPw && (
              <div className="text-center mt-6">
                <button 
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
                  className="text-xs text-content-secondary hover:text-content-primary transition-colors flex items-center justify-center gap-2 mx-auto font-medium"
                >
                  {isSignUp ? (
                    <><LogIn size={14} /> Already authorized? Sign In</>
                  ) : (
                    <><UserPlus size={14} /> New system? Create Secure Account</>
                  )}
                </button>
              </div>
            )}
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-8 space-y-4"
          >
            <p className="text-xs text-content-muted font-medium">
              Enterprise Billing Platform · Standard Edition
            </p>
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-blue/20 to-transparent" />
    </div>
  );
}
