import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { AuthModal } from './components/AuthModal';
import { MatchList } from './components/MatchList';
import { Leaderboard } from './components/Leaderboard';
import { AdminPanel } from './components/AdminPanel';
import type { Match, Pick, Player } from './core/predictionCore';
import { isKnockout } from './core/predictionCore';
import {
  LogOut,
  LayoutDashboard,
  Trophy,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sun,
  Moon,
} from 'lucide-react';
import gsap from 'gsap';
import { useTheme } from './components/ThemeContext';

import type { User } from '@supabase/supabase-js';

function App() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [playerProfile, setPlayerProfile] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leaderboard' | 'admin'>('dashboard');

  // Real-time time machine state
  const [simulatedTime, setSimulatedTime] = useState<Date>(new Date());

  // Database states
  const [matches, setMatches] = useState<Match[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);

  interface LeaderboardRow {
    user_id: string;
    display_name: string;
    points: number;
    correct_picks: number;
    settled_matches: number;
  }

  const fetchProfile = useCallback(async (userId: string) => {
    // Retry mechanism because the Postgres trigger might take a split-second to insert the profile
    let retries = 5;
    while (retries > 0) {
      const { data, error } = await supabase.from('players').select('*').eq('id', userId).single();

      if (error) {
        console.warn('Profile fetch attempt failed:', error.message);
        setDebugError(
          `Profile fetch failed: ${error.message} (code: ${error.code}) for user ID ${userId}`
        );
      }
      if (data) {
        setPlayerProfile(data);
        setDebugError(null);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      retries--;
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .order('kickoff_utc', { ascending: true });

      if (matchesError) {
        setDebugError(`Matches fetch failed: ${matchesError.message}`);
        throw matchesError;
      }
      setMatches(matchesData || []);

      // Fetch user's picks
      if (user) {
        const { data: picksData, error: picksError } = await supabase
          .from('picks')
          .select('*')
          .eq('user_id', user.id);

        if (picksError) {
          setDebugError(`Picks fetch failed: ${picksError.message}`);
          throw picksError;
        }
        setPicks(picksData || []);
      }

      // Fetch leaderboard
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('leaderboard')
        .select('*');

      if (leaderboardError) {
        setDebugError(`Leaderboard fetch failed: ${leaderboardError.message}`);
        throw leaderboardError;
      }
      setLeaderboard(leaderboardData || []);
    } catch (err) {
      console.error('Error fetching data:', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Run automated rules (locking, defaulting picks) based on simulated clock
  const checkSchedulerRules = useCallback(async () => {
    if (!matches.length) return;

    let updated = false;

    for (const match of matches) {
      const kickoffTime = new Date(match.kickoff_utc).getTime();
      const isPastKickoff = kickoffTime <= simulatedTime.getTime();

      // Rule: Auto-lock match when past kickoff
      if (match.status === 'OPEN' && isPastKickoff) {
        updated = true;
        // Lock in DB
        await supabase.from('matches').update({ status: 'LOCKED' }).eq('match_id', match.match_id);

        // Fetch active players
        const { data: players } = await supabase.from('players').select('*').eq('active', true);
        if (players) {
          // Fetch existing picks
          const { data: existingPicks } = await supabase
            .from('picks')
            .select('*')
            .eq('match_id', match.match_id);

          // Apply default picks (favorite side) for missing selections
          const missingPicks = players.filter(
            (p) => !existingPicks?.some((ep) => ep.user_id === p.id)
          );
          if (missingPicks.length > 0) {
            const defaults = missingPicks.map((player) => ({
              match_id: match.match_id,
              user_id: player.id,
              selection: match.favorite_side || 'HOME',
              star: false,
            }));
            await supabase.from('picks').insert(defaults);
          }
        }
      }

      // Rule: Open scheduled matches if within 24h of kickoff and odds are set
      const hoursUntilKickoff = (kickoffTime - simulatedTime.getTime()) / (3600 * 1000);
      if (
        match.status === 'SCHEDULED' &&
        hoursUntilKickoff <= 24 &&
        hoursUntilKickoff > 0 &&
        match.favorite_side !== null
      ) {
        updated = true;
        await supabase.from('matches').update({ status: 'OPEN' }).eq('match_id', match.match_id);
      }
    }

    if (updated) {
      fetchData();
    }
  }, [matches, simulatedTime, fetchData]);

  // 1. Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Load player profile and data when authenticated
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchProfile(user.id);
      fetchData();

      // Set up real-time Postgres subscriptions for matches, picks, scores
      const matchesChannel = supabase
        .channel('realtime-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
          fetchData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'picks' }, () => {
          fetchData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => {
          fetchData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(matchesChannel);
      };
    } else {
      setPlayerProfile(null);
    }
  }, [user, fetchProfile, fetchData]);

  // Periodic scheduler checks for simulated time machine (auto-lock, defaults, etc.)
  useEffect(() => {
    if (!user) return;

    // Check every 5 seconds if matches need auto-locking or default picks applied
    const interval = setInterval(() => {
      checkSchedulerRules();
    }, 5000);

    return () => clearInterval(interval);
  }, [user, checkSchedulerRules]);

  // Time Machine operations
  const handleAdjustTime = (hours: number) => {
    setSimulatedTime((prev) => new Date(prev.getTime() + hours * 60 * 60 * 1000));
    gsap.fromTo(
      '.time-banner',
      { backgroundColor: '#8B5CF6' },
      { backgroundColor: theme === 'dark' ? 'rgba(88, 28, 135, 0.4)' : '#f3e8ff', duration: 0.8 }
    );
  };

  const handleResetTime = () => {
    setSimulatedTime(new Date());
  };

  // Place or update a prediction
  const handlePick = async (
    matchId: string,
    selection: 'HOME' | 'DRAW' | 'AWAY',
    star: boolean
  ) => {
    if (!user) return;

    // Safety check kickoff time
    const match = matches.find((m) => m.match_id === matchId);
    if (!match) return;
    const isPastKickoff = new Date(match.kickoff_utc).getTime() <= simulatedTime.getTime();
    if (match.status !== 'OPEN' || isPastKickoff) {
      alert('Trận đấu đã khóa dự đoán!');
      return;
    }

    // Check star limitations: 1 star per match, stars only allowed for Knockouts
    if (star && !isKnockout(match)) {
      alert('Ngôi sao hy vọng chỉ áp dụng cho trận Knockout!');
      return;
    }

    const existingPick = picks.find((p) => p.match_id === matchId);
    const shouldDelete =
      existingPick && existingPick.selection === selection && existingPick.star === star;

    try {
      if (shouldDelete) {
        const { error } = await supabase
          .from('picks')
          .delete()
          .eq('match_id', matchId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('picks').upsert(
          {
            match_id: matchId,
            user_id: user.id,
            selection,
            star: isKnockout(match) ? star : false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'match_id,user_id' }
        );

        if (error) throw error;
      }
      fetchData();
    } catch (err: unknown) {
      alert('Lỗi đặt dự đoán: ' + (err as Error).message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (!user) {
    return <AuthModal onAuthSuccess={(usr) => setUser(usr)} />;
  }

  return (
    <div className="bg-brand-light-bg dark:bg-brand-dark min-h-screen text-gray-800 transition-colors duration-300 dark:text-gray-200">
      {/* Time Machine Alert Banner */}
      <div className="time-banner flex items-center justify-center gap-2 border-b border-purple-200 bg-purple-100 py-2 text-center text-xs font-semibold text-purple-800 dark:border-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
        <Clock size={14} className="animate-spin duration-3000" />
        <span>
          Mô phỏng thời gian:{' '}
          {simulatedTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (GMT+7)
        </span>
      </div>

      {/* Main Header */}
      <header className="dark:bg-brand-card/75 sticky top-0 z-40 border-b border-gray-200 bg-white/75 backdrop-blur-md backdrop-filter dark:border-gray-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <h1 className="text-base leading-tight font-extrabold text-gray-900 dark:text-white">
                Prediction Pool
              </h1>
              <span className="text-brand-neon-blue text-[10px] font-bold tracking-widest uppercase">
                World Cup 2026
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="dark:bg-brand-dark/60 flex space-x-1 rounded-xl border border-gray-300/60 bg-gray-200/50 p-1 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-brand-neon-blue text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard size={14} />
              Dự đoán
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all ${
                activeTab === 'leaderboard'
                  ? 'bg-brand-neon-blue text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <Trophy size={14} />
              Bảng điểm
            </button>
            {playerProfile?.is_admin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold tracking-wider uppercase transition-all ${
                  activeTab === 'admin'
                    ? 'bg-brand-neon-blue text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <ShieldCheck size={14} />
                Quản lý
              </button>
            )}
          </nav>

          {/* User Profile & Logout / Theme Switcher */}
          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end md:flex">
              <span className="text-sm leading-none font-bold text-gray-900 dark:text-white">
                {playerProfile?.display_name || user.email?.split('@')[0] || 'User'}
              </span>
              <span className="mt-1 text-[10px] font-semibold text-gray-500 uppercase">
                {playerProfile?.is_admin ? 'Quản trị viên' : 'Người chơi'}
              </span>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => {
                toggleTheme();
                gsap.fromTo(
                  '.theme-toggle-icon',
                  { rotate: 0, scale: 0.5 },
                  { rotate: 360, scale: 1, duration: 0.5, ease: 'back.out' }
                );
              }}
              className="dark:border-gray-850 flex cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-gray-100 p-2 text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900 active:scale-95 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              title={theme === 'dark' ? 'Chuyển sang Chế độ sáng' : 'Chuyển sang Chế độ tối'}
            >
              {theme === 'dark' ? (
                <Sun size={16} className="theme-toggle-icon text-brand-gold" />
              ) : (
                <Moon size={16} className="theme-toggle-icon text-brand-neon-purple" />
              )}
            </button>

            <button
              onClick={handleLogout}
              className="cursor-pointer rounded-xl border border-gray-300 bg-gray-100 p-2 text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900 active:scale-95 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900 uppercase dark:text-white">
              {activeTab === 'dashboard'
                ? 'Danh Sách Dự Đoán'
                : activeTab === 'leaderboard'
                  ? 'Bảng xếp hạng tổng'
                  : 'Bảng Điều Khiển Admin'}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {activeTab === 'dashboard'
                ? 'Chọn đội chiến thắng dựa trên tỷ lệ kèo chấp châu Á.'
                : activeTab === 'leaderboard'
                  ? 'Bảng điểm tự động cập nhật sau mỗi trận đấu.'
                  : 'Khởi tạo trận đấu, nhập kèo, cập nhật kết quả và mô phỏng thời gian.'}
            </p>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="flex cursor-pointer items-center justify-center rounded-xl border border-gray-300 bg-gray-100 p-2.5 text-gray-600 transition-all hover:bg-gray-200 hover:text-gray-900 active:scale-95 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <MatchList
            matches={matches}
            picks={picks}
            onPick={handlePick}
            simulatedTime={simulatedTime}
          />
        )}

        {activeTab === 'leaderboard' && <Leaderboard rows={leaderboard} currentUserId={user.id} />}

        {activeTab === 'admin' && playerProfile?.is_admin && (
          <AdminPanel
            matches={matches}
            onRefresh={fetchData}
            simulatedTime={simulatedTime}
            onAdjustTime={handleAdjustTime}
            onResetTime={handleResetTime}
          />
        )}
      </main>
      {debugError && (
        <div className="bg-brand-neon-rose border-brand-neon-rose glow-rose fixed right-4 bottom-4 left-4 z-50 flex items-center justify-between rounded-xl border p-4 text-xs font-bold text-white">
          <span>Khảo sát lỗi: {debugError}</span>
          <button
            onClick={() => setDebugError(null)}
            className="ml-4 font-black text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
