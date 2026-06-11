import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import gsap from 'gsap';
import { Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';

import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from './ToastContext';

interface AuthModalProps {
  onAuthSuccess: (user: SupabaseUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onAuthSuccess }) => {
  const { showToast } = useToast();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { scale: 0.9, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.7)' }
      );
    }
  }, [isSignUp]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split('@')[0],
            },
          },
        });

        if (signUpError) throw signUpError;
        if (data.user) {
          showToast('Đăng ký thành công! Hãy đăng nhập với tài khoản của bạn.', 'success');
          setIsSignUp(false);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        if (data.user) {
          onAuthSuccess(data.user);
        }
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (googleError) throw googleError;
    } catch (err: unknown) {
      setError((err as Error).message || 'Không thể đăng nhập Google OAuth.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-brand-light-bg dark:bg-brand-dark relative flex min-h-screen items-center justify-center overflow-hidden px-4 transition-colors duration-300">
      {/* Background Animated Gradient Blobs */}
      <div className="bg-brand-neon-blue/10 dark:bg-brand-neon-blue/20 absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full blur-3xl duration-[6000ms]" />
      <div className="bg-brand-neon-purple/10 dark:bg-brand-neon-purple/20 absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-full blur-3xl duration-[8000ms]" />

      <div
        ref={cardRef}
        className="glass-panel relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="bg-brand-neon-purple/10 border-brand-neon-purple/30 text-brand-neon-purple mb-2 inline-block rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase">
            🏆 World Cup 2026 Prediction Pool
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            {isSignUp ? 'Tạo tài khoản mới' : 'Đăng nhập để Pick'}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Cá cược nội bộ - Nhanh chóng, kịch tính & chính xác
          </p>
        </div>

        {error && (
          <div className="bg-brand-neon-rose/10 border-brand-neon-rose/40 text-brand-neon-rose mb-6 rounded-xl border p-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tên hiển thị
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="dark:bg-brand-dark/50 focus:border-brand-neon-blue focus:ring-brand-neon-blue w-full rounded-xl border border-gray-300 bg-white py-3 pr-4 pl-10 text-gray-900 placeholder-gray-400 transition-all focus:ring-1 focus:outline-none dark:border-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email của bạn
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="dark:bg-brand-dark/50 focus:border-brand-neon-blue focus:ring-brand-neon-blue w-full rounded-xl border border-gray-300 bg-white py-3 pr-4 pl-10 text-gray-900 placeholder-gray-400 transition-all focus:ring-1 focus:outline-none dark:border-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mật khẩu
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="dark:bg-brand-dark/50 focus:border-brand-neon-blue focus:ring-brand-neon-blue w-full rounded-xl border border-gray-300 bg-white py-3 pr-4 pl-10 text-gray-900 placeholder-gray-400 transition-all focus:ring-1 focus:outline-none dark:border-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-white transition-all ${
              loading
                ? 'bg-gray-250 cursor-not-allowed text-gray-500 dark:bg-gray-800'
                : 'from-brand-neon-blue to-brand-neon-purple glow-blue bg-gradient-to-r hover:brightness-110 active:scale-[0.98]'
            }`}
          >
            {isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
            {loading ? 'Đang xử lý...' : isSignUp ? 'Đăng ký' : 'Đăng nhập'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="dark:border-gray-850 w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="dark:bg-brand-card bg-white px-2 text-gray-500">
              Hoặc tiếp tục với
            </span>
          </div>
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-900 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-none"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 8 12.5a5.99 5.99 0 0 1 5.99-6.012c1.49 0 2.859.549 3.92 1.455l3.12-3.12C19.16 2.97 16.75 2 13.99 2A10.5 10.5 0 0 0 3.5 12.5a10.5 10.5 0 0 0 10.49 10.5c5.78 0 9.77-3.95 9.77-9.77 0-.585-.052-1.16-.148-1.685H12.24z"
            />
          </svg>
          Đăng nhập bằng Google
        </button>

        {/* Footer Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-brand-neon-blue cursor-pointer text-sm font-semibold hover:underline focus:outline-none"
          >
            {isSignUp ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};
