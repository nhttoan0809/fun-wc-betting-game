import React, { useState, useEffect, useRef } from 'react';
import type { Player } from '../core/predictionCore';
import { supabase } from '../supabaseClient';
import { useToast } from './ToastContext';
import { Sun, Moon, AlertCircle, ArrowRight } from 'lucide-react';
import { useTheme } from './ThemeContext';
import gsap from 'gsap';

interface DisplayNameConfirmationModalProps {
  user: { id: string; email?: string };
  onConfirmed: (updatedProfile: Player) => void;
}

export const DisplayNameConfirmationModal: React.FC<DisplayNameConfirmationModalProps> = ({
  user,
  onConfirmed,
}) => {
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [displayName, setDisplayName] = useState(() => {
    if (user.email) {
      return user.email.split('@')[0];
    }
    return '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { scale: 0.9, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.7)' }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = displayName.trim();

    if (!name) {
      setError('Tên hiển thị không được bỏ trống.');
      return;
    }

    // Basic format validation
    if (name.length < 3) {
      setError('Tên hiển thị phải dài ít nhất 3 ký tự.');
      return;
    }

    setLoading(true);

    try {
      // 1. Check if the display name is already taken
      const { data: existingPlayer, error: checkError } = await supabase
        .from('players')
        .select('id')
        .eq('display_name', name)
        .neq('id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingPlayer) {
        setError('Tên hiển thị này đã được sử dụng bởi người chơi khác. Vui lòng chọn tên khác.');
        setLoading(false);
        return;
      }

      // 2. Update player profile in the database
      const { data: updatedProfile, error: updateError } = await supabase
        .from('players')
        .update({
          display_name: name,
          display_name_confirmed: true,
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      showToast('Xác nhận tên hiển thị thành công! Chào mừng bạn.', 'success');
      onConfirmed(updatedProfile);
    } catch (err: unknown) {
      setError((err as Error).message || 'Có lỗi xảy ra khi lưu thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-brand-light-bg dark:bg-brand-dark relative flex min-h-screen items-center justify-center overflow-hidden px-4 transition-colors duration-300">
      {/* Background Animated Gradient Blobs */}
      <div className="bg-brand-neon-blue/10 dark:bg-brand-neon-blue/20 absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full blur-3xl duration-[6000ms]" />
      <div className="bg-brand-neon-purple/10 dark:bg-brand-neon-purple/20 absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-full blur-3xl duration-[8000ms]" />

      {/* Floating Theme Toggle (Top Right) */}
      <div className="absolute top-5 right-5 z-20">
        <button
          onClick={() => {
            toggleTheme();
            gsap.fromTo(
              '.theme-toggle-icon',
              { rotate: 0, scale: 0.5 },
              { rotate: 360, scale: 1, duration: 0.5, ease: 'back.out' }
            );
          }}
          className="dark:border-gray-850 flex cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-white/70 p-2.5 text-gray-600 backdrop-blur-md transition-all hover:bg-gray-100 hover:text-gray-900 active:scale-95 dark:bg-gray-900/70 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          {theme === 'dark' ? (
            <Sun size={16} className="theme-toggle-icon text-brand-gold" />
          ) : (
            <Moon size={16} className="theme-toggle-icon text-brand-neon-purple" />
          )}
        </button>
      </div>

      <div
        ref={cardRef}
        className="glass-panel relative z-10 w-full max-w-md rounded-2xl p-8 shadow-2xl"
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="bg-brand-neon-blue/10 border-brand-neon-blue/30 text-brand-neon-blue mb-2 inline-block rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase">
            🆕 Thiết lập tài khoản
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Xác nhận Tên hiển thị
          </h1>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Bạn đang đăng nhập lần đầu. Hãy chọn một tên hiển thị độc nhất.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-brand-neon-rose/10 border-brand-neon-rose/30 text-brand-neon-rose flex items-start gap-2 rounded-xl border p-3.5 text-xs leading-relaxed font-semibold">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-gray-650 mb-2 block text-xs font-bold tracking-wider uppercase dark:text-gray-400">
              Tên hiển thị (Display Name)
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="nhaptencuaban"
              className="dark:bg-brand-dark dark:border-gray-850 text-gray-955 focus:border-brand-neon-blue w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none dark:text-white"
            />
          </div>

          {/* Important Notice */}
          <div className="rounded-xl border border-amber-200/50 bg-amber-500/5 p-4 text-[11px] leading-relaxed text-amber-700 dark:border-amber-900/30 dark:text-amber-300">
            <span className="font-bold">⚠️ Lưu ý quan trọng:</span> Tên hiển thị này sẽ được sử dụng
            để tính toán kết quả và hiển thị trên bảng xếp hạng. Tên này{' '}
            <span className="font-bold underline">không thể thay đổi</span> sau khi xác nhận.
          </div>

          <button
            type="submit"
            disabled={loading}
            className="from-brand-neon-blue to-brand-neon-purple shadow-brand-neon-blue/20 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span>Đang xử lý...</span>
            ) : (
              <>
                <span>Xác nhận & Vào trang chủ</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
