import React, { useState, useEffect } from 'react';
import type { Match, SelectionType } from '../core/predictionCore';
import {
  TEAM_FLAG_CODES,
  teamFlagEmoji,
  parseOpenFootballDateTime,
  normalizeOpenFootballTeam,
  calculateOverUnderOutcome,
} from '../core/predictionCore';
import { supabase } from '../supabaseClient';

interface SyncMatchItem {
  match_id: string;
  home_team: string;
  away_team: string;
  kickoff_utc: string;
  stage: 'GROUP' | 'KNOCKOUT';
  exists: boolean;
  checked: boolean;
}

interface APIMatchItem {
  round: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
}

const countriesList = Object.keys(TEAM_FLAG_CODES)
  .map((name) => {
    // Capitalize each word properly
    const displayName = name
      .split(' ')
      .map((word) => {
        if (word === "d'ivoire") return "d'Ivoire";
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
    return {
      key: name,
      name: displayName,
      flag: teamFlagEmoji(name),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

import {
  Settings,
  PlusCircle,
  Play,
  Database,
  Check,
  AlertCircle,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from './ToastContext';

interface AdminPanelProps {
  matches: Match[];
  onRefresh: () => void;
  simulatedTime: Date;
  onAdjustTime: (hours: number) => void;
  onResetTime: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  matches,
  onRefresh,
  simulatedTime,
  onAdjustTime,
  onResetTime,
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Form states
  const [oddsFavorite, setOddsFavorite] = useState<'HOME' | 'AWAY'>('HOME');
  const [oddsHandicap, setOddsHandicap] = useState(0.5);
  const [oddsOU, setOddsOU] = useState<number | ''>(2.5);

  const [scoreHome, setScoreHome] = useState(2);
  const [scoreAway, setScoreAway] = useState(1);
  const [summary, setSummary] = useState('Trận đấu diễn ra sôi nổi và kịch tính.');

  // Create match form states
  const [newId, setNewId] = useState('');
  const [newHome, setNewHome] = useState('');
  const [newAway, setNewAway] = useState('');
  const [newKickoff, setNewKickoff] = useState('2026-06-11T19:00');
  const [newStage, setNewStage] = useState<'GROUP' | 'KNOCKOUT'>('GROUP');
  const [newOU, setNewOU] = useState<number | ''>('');

  // API Sync States
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncMatches, setSyncMatches] = useState<SyncMatchItem[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [showGroupStage, setShowGroupStage] = useState(true);
  const [showKnockoutStage, setShowKnockoutStage] = useState(true);
  const [dateSortOrder, setDateSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const selectedMatch = matches.find((m) => m.match_id === selectedMatchId);

  // Derived state for filtered and sorted sync matches
  const displayedMatches = syncMatches
    .filter((m) => {
      if (m.stage === 'GROUP' && !showGroupStage) return false;
      if (m.stage === 'KNOCKOUT' && !showKnockoutStage) return false;
      return true;
    })
    .sort((a, b) => {
      // 1. Sort by status: 'Mới' (exists === false) on top, 'Đã có' (exists === true) at the bottom
      if (a.exists !== b.exists) {
        return a.exists ? 1 : -1;
      }
      // 2. Sort by date
      const dateA = new Date(a.kickoff_utc).getTime();
      const dateB = new Date(b.kickoff_utc).getTime();
      return dateSortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
    });

  // Sync form states with selected match data
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (selectedMatch) {
      setOddsFavorite(selectedMatch.favorite_side || 'HOME');
      setOddsHandicap(selectedMatch.handicap_goals !== null ? selectedMatch.handicap_goals : 0.5);
      setOddsOU(
        selectedMatch.ou_line !== null && selectedMatch.ou_line !== undefined
          ? selectedMatch.ou_line
          : ''
      );

      if (selectedMatch.final_home_score !== null && selectedMatch.final_home_score !== undefined) {
        setScoreHome(selectedMatch.final_home_score);
      }
      if (selectedMatch.final_away_score !== null && selectedMatch.final_away_score !== undefined) {
        setScoreAway(selectedMatch.final_away_score);
      }
      if (selectedMatch.final_summary !== null && selectedMatch.final_summary !== undefined) {
        setSummary(selectedMatch.final_summary);
      }
    }
  }, [selectedMatchId, matches, selectedMatch]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Fetch World Cup 2026 matches from openfootball API
  const handleFetchAPIMatches = async () => {
    setSyncLoading(true);
    setShowSyncModal(true);
    setSyncMatches([]);
    try {
      const response = await fetch(
        'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'
      );
      if (!response.ok) throw new Error('Không thể tải dữ liệu từ API');
      const data = await response.json();

      if (!data || !Array.isArray(data.matches)) {
        throw new Error('Dữ liệu API không đúng định dạng');
      }

      const parsed: SyncMatchItem[] = data.matches.map((m: APIMatchItem, idx: number) => {
        const matchId = `WC-${String(idx + 1).padStart(2, '0')}`;
        const home = normalizeOpenFootballTeam(m.team1);
        const away = normalizeOpenFootballTeam(m.team2);
        const kickoffUtc = parseOpenFootballDateTime(m.date, m.time).toISOString();
        const stage = m.round.toLowerCase().includes('matchday') ? 'GROUP' : 'KNOCKOUT';

        // Check if match already exists in database
        const alreadyExists = matches.some(
          (existing) =>
            existing.match_id === matchId ||
            (existing.home_team === home && existing.away_team === away) ||
            (existing.home_team === away && existing.away_team === home)
        );

        return {
          match_id: matchId,
          home_team: home,
          away_team: away,
          kickoff_utc: kickoffUtc,
          stage,
          exists: alreadyExists,
          checked: !alreadyExists, // precheck if new, unchecked if exists
        };
      });

      setShowGroupStage(true);
      setShowKnockoutStage(true);
      setDateSortOrder('ASC');

      setSyncMatches(parsed);
    } catch (err: unknown) {
      showToast('Lỗi tải dữ liệu: ' + (err as Error).message, 'error');
      setShowSyncModal(false);
    } finally {
      setSyncLoading(false);
    }
  };

  // Import selected matches into database
  const handleImportMatches = async () => {
    const checkedMatches = syncMatches.filter((m) => m.checked);
    if (checkedMatches.length === 0) {
      showToast('Vui lòng chọn ít nhất một trận đấu để import!', 'info');
      return;
    }

    setLoading(true);
    try {
      const matchesToUpsert = checkedMatches.map((m) => ({
        match_id: m.match_id,
        home_team: m.home_team,
        away_team: m.away_team,
        kickoff_utc: m.kickoff_utc,
        stage: m.stage,
        status: 'SCHEDULED',
        favorite_side: null,
        handicap_side: null,
        handicap_goals: 0,
        ou_line: null,
      }));

      const { error } = await supabase.from('matches').upsert(matchesToUpsert);
      if (error) throw error;

      showToast(`Đã nạp thành công ${checkedMatches.length} trận đấu từ API!`, 'success');
      setShowSyncModal(false);
      onRefresh();
    } catch (err: unknown) {
      showToast('Lỗi import trận đấu: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAllSync = (checked: boolean) => {
    const displayedIds = new Set(displayedMatches.map((m) => m.match_id));
    setSyncMatches((prev) =>
      prev.map((m) => (displayedIds.has(m.match_id) ? { ...m, checked } : m))
    );
  };

  const handleToggleNewSync = () => {
    const displayedIds = new Set(displayedMatches.map((m) => m.match_id));
    setSyncMatches((prev) =>
      prev.map((m) => (displayedIds.has(m.match_id) ? { ...m, checked: !m.exists } : m))
    );
  };

  // Reset all user predictions/votes and restore fixtures
  const handleResetDatabase = async () => {
    setLoading(true);
    try {
      // 1. Delete all picks
      const { error: picksErr } = await supabase.from('picks').delete().neq('match_id', 'none');
      if (picksErr) throw picksErr;

      // 2. Delete all scores
      const { error: scoresErr } = await supabase.from('scores').delete().neq('match_id', 'none');
      if (scoresErr) throw scoresErr;

      // 3. Delete all matches
      const { error: matchesErr } = await supabase.from('matches').delete().neq('match_id', 'none');
      if (matchesErr) throw matchesErr;

      showToast('Đã xóa sạch lịch sử dự đoán và reset dữ liệu thành công!', 'success');
      setShowResetConfirm(false);
      onRefresh();
    } catch (err: unknown) {
      showToast('Lỗi khi reset database: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add a single custom match
  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newHome || !newAway) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('matches').insert({
        match_id: newId,
        home_team: newHome,
        away_team: newAway,
        kickoff_utc: new Date(newKickoff + ':00Z').toISOString(),
        stage: newStage,
        status: 'SCHEDULED',
        favorite_side: null,
        handicap_side: null,
        handicap_goals: 0,
        ou_line: newOU === '' ? null : Number(newOU),
      });

      if (error) throw error;
      showToast('Đã thêm trận đấu thành công!', 'success');
      setNewId('');
      setNewHome('');
      setNewAway('');
      setNewOU('');
      onRefresh();
    } catch (err: unknown) {
      showToast('Lỗi: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Set Handicap odds
  const handleSetHandicapOdds = async () => {
    if (!selectedMatchId) return;
    setLoading(true);
    try {
      const targetStatus = selectedMatch?.status === 'SCHEDULED' ? 'OPEN' : selectedMatch?.status;
      const { error } = await supabase
        .from('matches')
        .update({
          favorite_side: oddsFavorite,
          handicap_side: oddsFavorite,
          handicap_goals: oddsHandicap,
          status: targetStatus,
        })
        .eq('match_id', selectedMatchId);

      if (error) throw error;
      showToast('Đã cập nhật kèo chấp thành công!', 'success');
      onRefresh();
    } catch (err: unknown) {
      showToast('Lỗi: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Clear Handicap odds
  const handleClearHandicapOdds = async () => {
    if (!selectedMatchId) return;
    setLoading(true);
    try {
      const isOUNull = selectedMatch?.ou_line === null || selectedMatch?.ou_line === undefined;
      const targetStatus = isOUNull ? 'SCHEDULED' : selectedMatch?.status;

      const { error } = await supabase
        .from('matches')
        .update({
          favorite_side: null,
          handicap_side: null,
          handicap_goals: 0,
          status: targetStatus,
        })
        .eq('match_id', selectedMatchId);

      if (error) throw error;
      showToast('Đã hủy kèo chấp thành công!', 'success');
      onRefresh();
    } catch (err: unknown) {
      showToast('Lỗi: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Set Over/Under odds
  const handleSetOUOdds = async () => {
    if (!selectedMatchId) return;
    setLoading(true);
    try {
      const targetStatus = selectedMatch?.status === 'SCHEDULED' ? 'OPEN' : selectedMatch?.status;
      const { error } = await supabase
        .from('matches')
        .update({
          ou_line: oddsOU === '' ? null : Number(oddsOU),
          status: targetStatus,
        })
        .eq('match_id', selectedMatchId);

      if (error) throw error;
      showToast('Đã cập nhật tỷ lệ Tài Xỉu thành công!', 'success');
      onRefresh();
    } catch (err: unknown) {
      showToast('Lỗi: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Clear Over/Under odds
  const handleClearOUOdds = async () => {
    if (!selectedMatchId) return;
    setLoading(true);
    try {
      const isHandicapedNull = selectedMatch?.favorite_side === null || selectedMatch?.favorite_side === undefined;
      const targetStatus = isHandicapedNull ? 'SCHEDULED' : selectedMatch?.status;

      const { error } = await supabase
        .from('matches')
        .update({
          ou_line: null,
          status: targetStatus,
        })
        .eq('match_id', selectedMatchId);

      if (error) throw error;
      showToast('Đã hủy tỷ lệ Tài Xỉu thành công!', 'success');
      onRefresh();
    } catch (err: unknown) {
      showToast('Lỗi: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Set match results and settle points for all players
  const handleSettleMatch = async () => {
    if (!selectedMatch || !selectedMatchId) return;
    setLoading(true);

    try {
      // 1. Update match with final results
      const { error: matchUpdateError } = await supabase
        .from('matches')
        .update({
          status: 'SETTLED',
          final_home_score: scoreHome,
          final_away_score: scoreAway,
          final_summary: summary,
          settled_at: new Date().toISOString(),
        })
        .eq('match_id', selectedMatchId);

      if (matchUpdateError) throw matchUpdateError;

      // 2. Fetch all picks for this match
      const { data: picks, error: picksError } = await supabase
        .from('picks')
        .select('*')
        .eq('match_id', selectedMatchId);

      if (picksError) throw picksError;

      // Fetch all players to apply auto-defaults if they missed voting
      const { data: activePlayers, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('active', true);

      if (playersError) throw playersError;

      // Calculate outcomes and create point scores
      const scoresToInsert: {
        user_id: string;
        match_id: string;
        points: number;
        correct: boolean;
        handicap_points?: number;
        handicap_correct?: boolean;
        ou_points?: number;
        ou_correct?: boolean;
      }[] = [];

      // Outcome calculations matching core rules
      const handicap = Number(selectedMatch.handicap_goals || 0);
      const handicapSide = selectedMatch.handicap_side || selectedMatch.favorite_side;
      const givingSide = handicap >= 0 ? handicapSide : handicapSide === 'HOME' ? 'AWAY' : 'HOME';
      const handicapAmount = Math.abs(handicap);

      let homeScoreAdjusted = scoreHome;
      let awayScoreAdjusted = scoreAway;
      if (givingSide === 'HOME') homeScoreAdjusted -= handicapAmount;
      if (givingSide === 'AWAY') awayScoreAdjusted -= handicapAmount;

      let outcome: SelectionType = 'DRAW';
      if (Math.abs(homeScoreAdjusted - awayScoreAdjusted) > 0.000001) {
        outcome = homeScoreAdjusted > awayScoreAdjusted ? 'HOME' : 'AWAY';
      }

      // Check each active player
      activePlayers.forEach((player) => {
        const userPick = picks?.find((p) => p.user_id === player.id);

        const finalSelection: SelectionType | null = userPick
          ? userPick.selection
          : selectedMatch.favorite_side || 'HOME';
        const isStar = userPick ? userPick.star : false;
        const finalOUSelection: 'OVER' | 'UNDER' | null = userPick ? userPick.ou_selection : null;

        // 1. Handicap calculation
        let handicapCorrect = false;
        let handicapPoints = 0;
        if (finalSelection) {
          handicapCorrect = finalSelection === outcome;
          const star = isStar && selectedMatch.stage === 'KNOCKOUT';
          handicapPoints = handicapCorrect ? (star ? 2 : 1) : star ? -1 : 0;
        }

        // 2. Over/Under calculation
        let ouCorrect = false;
        let ouPoints = 0;
        if (selectedMatch.ou_line !== null && finalOUSelection !== null) {
          const result = calculateOverUnderOutcome(
            selectedMatch.ou_line,
            scoreHome,
            scoreAway,
            finalOUSelection
          );
          ouCorrect = result.correct;
          ouPoints = result.points;
        }

        const totalPoints = handicapPoints + ouPoints;
        const correct = handicapCorrect || ouCorrect;

        scoresToInsert.push({
          user_id: player.id,
          match_id: selectedMatchId,
          points: totalPoints,
          correct,
          handicap_points: handicapPoints,
          handicap_correct: handicapCorrect,
          ou_points: ouPoints,
          ou_correct: ouCorrect,
        });
      });

      // Insert/upsert scores
      const { error: scoresError } = await supabase
        .from('scores')
        .upsert(scoresToInsert, { onConflict: 'user_id,match_id' });

      if (scoresError) throw scoresError;

      showToast(`Đã tính điểm thành công cho ${scoresToInsert.length} người chơi!`, 'success');
      onRefresh();
    } catch (err: unknown) {
      showToast('Lỗi tính điểm: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* simulated Time machine control panel */}
        <div className="glass-panel border-gray-250 space-y-6 rounded-2xl border p-6 dark:border-gray-800">
          <h2 className="flex items-center gap-2 border-b border-gray-200 pb-3 text-lg font-bold text-gray-900 dark:border-gray-800 dark:text-white">
            <Play size={18} className="text-brand-neon-blue" />
            Cỗ Máy Thời Gian (Mô Phỏng)
          </h2>
          <div className="dark:bg-gray-955 rounded-xl border border-gray-200 bg-gray-100 p-4 text-center dark:border-gray-900">
            <span className="text-gray-650 block text-[10px] font-bold tracking-wider uppercase dark:text-gray-500">
              Thời Gian Hiện Tại Của Hệ Thống
            </span>
            <span className="mt-1 block font-mono text-lg font-black text-gray-900 dark:text-white">
              {simulatedTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (GMT+7)
            </span>
          </div>

          <div className="space-y-2.5">
            <span className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              Tua nhanh thời gian:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onAdjustTime(1)}
                className="cursor-pointer rounded-xl border border-gray-300 bg-white py-2 text-xs font-bold text-gray-700 transition-all hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                +1 giờ
              </button>
              <button
                onClick={() => onAdjustTime(12)}
                className="cursor-pointer rounded-xl border border-gray-300 bg-white py-2 text-xs font-bold text-gray-700 transition-all hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                +12 giờ
              </button>
              <button
                onClick={() => onAdjustTime(24)}
                className="cursor-pointer rounded-xl border border-gray-300 bg-white py-2 text-xs font-bold text-gray-700 transition-all hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                +24 giờ
              </button>
            </div>
            <button
              onClick={onResetTime}
              className="bg-brand-neon-purple/20 hover:bg-brand-neon-purple/30 border-brand-neon-purple/30 text-brand-neon-purple w-full cursor-pointer rounded-xl border py-2.5 text-xs font-bold transition-all"
            >
              Reset về thời gian thực tế
            </button>
          </div>

          <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-900">
            <h3 className="text-gray-650 text-xs font-bold tracking-wide uppercase dark:text-gray-400">
              Lệnh tự động nhanh
            </h3>
            <button
              onClick={handleFetchAPIMatches}
              disabled={loading || syncLoading}
              className="bg-brand-neon-blue/15 hover:bg-brand-neon-blue/30 border-brand-neon-blue/30 text-brand-neon-blue shadow-brand-neon-blue/10 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold shadow-sm transition-all"
            >
              <Database size={16} />
              Đồng bộ & Nạp lịch thi đấu từ API
            </button>

            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={loading}
              className="bg-brand-neon-rose/15 hover:bg-brand-neon-rose/30 border-brand-neon-rose/30 text-brand-neon-rose shadow-brand-neon-rose/10 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold shadow-sm transition-all"
            >
              <Trash2 size={16} />
              Reset toàn bộ dữ liệu dự đoán
            </button>
          </div>
        </div>

        {/* Match Management Forms */}
        <div className="space-y-8 lg:col-span-2">
          {/* Set Odds & Settle Match Form */}
          <div className="glass-panel border-gray-250 space-y-6 rounded-2xl border p-6 dark:border-gray-800">
            <h2 className="flex items-center gap-2 border-b border-gray-200 pb-3 text-lg font-bold text-gray-900 dark:border-gray-800 dark:text-white">
              <Settings size={18} className="text-brand-neon-purple" />
              Điều khiển & Tính Điểm Trận Đấu
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-gray-650 mb-2 block text-xs font-bold tracking-wider uppercase dark:text-gray-400">
                  Chọn trận đấu để xử lý:
                </label>
                <select
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                  className="dark:bg-brand-dark focus:border-brand-neon-blue w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-950 focus:outline-none dark:border-gray-800 dark:text-white"
                >
                  <option value="">-- Chọn một trận đấu --</option>
                  {matches.map((m) => (
                    <option key={m.match_id} value={m.match_id}>
                      [{m.status}] {m.match_id}: {m.home_team} vs {m.away_team}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMatch && (
                <div className="dark:bg-gray-955 space-y-6 rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-900">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-900">
                    <span className="text-gray-650 text-xs font-bold tracking-wider uppercase dark:text-gray-500">
                      Thông tin trận đấu chọn
                    </span>
                    <span className="text-brand-neon-purple bg-brand-neon-purple/20 border-brand-neon-purple/30 rounded border px-2 py-0.5 text-xs font-bold dark:text-white">
                      {selectedMatch.status}
                    </span>
                  </div>

                  {/* Set Odds Section */}
                  {(selectedMatch.status === 'SCHEDULED' || selectedMatch.status === 'OPEN') && (
                    <div className="space-y-6">
                      <h4 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white border-b border-gray-200 pb-2 dark:border-gray-800">
                        <AlertCircle size={16} className="text-brand-neon-blue" />
                        Thiết lập Kèo dự đoán độc lập
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Panel 1: Handicap */}
                        <div className="bg-white/40 dark:bg-brand-dark/40 border border-gray-250 dark:border-gray-800 p-4 rounded-xl space-y-4">
                          <h5 className="text-xs font-bold text-brand-neon-blue uppercase tracking-wider flex items-center gap-1">
                            ⚽ Cấu hình Kèo Chấp
                          </h5>
                          <div className="space-y-3">
                            <div>
                              <label className="mb-1 block text-xs text-gray-650 dark:text-gray-400">
                                Đội kèo trên (chấp)
                              </label>
                              <select
                                value={oddsFavorite}
                                onChange={(e) => setOddsFavorite(e.target.value as 'HOME' | 'AWAY')}
                                className="dark:bg-brand-dark w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-950 dark:border-gray-800 dark:text-white"
                              >
                                <option value="HOME">Đội nhà ({selectedMatch.home_team})</option>
                                <option value="AWAY">Đội khách ({selectedMatch.away_team})</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-gray-650 dark:text-gray-400">
                                Tỷ lệ chấp (Goals)
                              </label>
                              <select
                                value={oddsHandicap}
                                onChange={(e) => setOddsHandicap(Number(e.target.value))}
                                className="dark:bg-brand-dark text-gray-955 w-full rounded-lg border border-gray-300 bg-white p-2 dark:border-gray-800 dark:text-white"
                              >
                                <option value="0">Đồng banh (0)</option>
                                <option value="0.25">0.25 Trái (Đồng nửa)</option>
                                <option value="0.5">0.5 Trái (Nửa trái)</option>
                                <option value="0.75">0.75 Trái (Nửa một)</option>
                                <option value="1.0">1.0 Trái (Một trái)</option>
                                <option value="1.25">1.25 Trái (Một thua nửa)</option>
                                <option value="1.5">1.5 Trái (Trái rưỡi)</option>
                              </select>
                            </div>
                            <div className="pt-2 flex gap-2">
                              <button
                                onClick={handleSetHandicapOdds}
                                disabled={loading}
                                className="bg-brand-neon-blue flex-1 cursor-pointer rounded-lg py-2 text-xs font-bold text-white hover:brightness-110 active:scale-95 transition-all"
                              >
                                Lưu Kèo Chấp
                              </button>
                              {selectedMatch.favorite_side !== null && (
                                <button
                                  onClick={handleClearHandicapOdds}
                                  disabled={loading}
                                  className="border border-brand-neon-rose text-brand-neon-rose hover:bg-brand-neon-rose/10 cursor-pointer rounded-lg px-3 py-2 text-xs font-bold active:scale-95 transition-all"
                                  title="Xóa Kèo Chấp"
                                >
                                  Hủy kèo
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Panel 2: Over/Under */}
                        <div className="bg-white/40 dark:bg-brand-dark/40 border border-gray-250 dark:border-gray-800 p-4 rounded-xl space-y-4">
                          <h5 className="text-xs font-bold text-brand-neon-purple uppercase tracking-wider flex items-center gap-1">
                            📊 Cấu hình Kèo Tài Xỉu
                          </h5>
                          <div className="space-y-3">
                            <div>
                              <label className="mb-1 block text-xs text-gray-655 dark:text-gray-400">
                                Tỷ lệ Tài Xỉu (O/U)
                              </label>
                              <select
                                value={oddsOU}
                                onChange={(e) => setOddsOU(e.target.value === '' ? '' : Number(e.target.value))}
                                className="dark:bg-brand-dark text-gray-955 w-full rounded-lg border border-gray-300 bg-white p-2 dark:border-gray-800 dark:text-white"
                              >
                                <option value="">Không có (Chưa thiết lập)</option>
                                <option value="1.5">1.5 Trái</option>
                                <option value="1.75">1.75 Trái</option>
                                <option value="2.0">2.0 Trái</option>
                                <option value="2.25">2.25 Trái</option>
                                <option value="2.5">2.5 Trái</option>
                                <option value="2.75">2.75 Trái</option>
                                <option value="3.0">3.0 Trái</option>
                                <option value="3.25">3.25 Trái</option>
                                <option value="3.5">3.5 Trái</option>
                              </select>
                            </div>
                            <div className="h-[52px] hidden md:block"></div> {/* Spacer to align buttons on desktop */}
                            <div className="pt-2 flex gap-2">
                              <button
                                onClick={handleSetOUOdds}
                                disabled={loading}
                                className="bg-brand-neon-purple flex-1 cursor-pointer rounded-lg py-2 text-xs font-bold text-white hover:brightness-110 active:scale-95 transition-all"
                              >
                                Lưu Kèo Tài Xỉu
                              </button>
                              {selectedMatch.ou_line !== null && (
                                <button
                                  onClick={handleClearOUOdds}
                                  disabled={loading}
                                  className="border border-brand-neon-rose text-brand-neon-rose hover:bg-brand-neon-rose/10 cursor-pointer rounded-lg px-3 py-2 text-xs font-bold active:scale-95 transition-all"
                                  title="Xóa Kèo Tài Xỉu"
                                >
                                  Hủy kèo
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Settle Points Section */}
                  {selectedMatch.status !== 'SCHEDULED' && selectedMatch.status !== 'SETTLED' && (
                    <div className="border-gray-250 space-y-4 border-t pt-4 dark:border-gray-900">
                      <h4 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
                        <Check size={16} className="text-brand-neon-green" />
                        Tính điểm & Settle trận đấu
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                            Tỉ số {selectedMatch.home_team}
                          </label>
                          <input
                            type="number"
                            value={scoreHome}
                            onChange={(e) => setScoreHome(Number(e.target.value))}
                            className="dark:bg-brand-dark dark:border-gray-850 text-gray-905 w-full rounded-lg border border-gray-300 bg-white p-2 font-mono dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                            Tỉ số {selectedMatch.away_team}
                          </label>
                          <input
                            type="number"
                            value={scoreAway}
                            onChange={(e) => setScoreAway(Number(e.target.value))}
                            className="dark:bg-brand-dark dark:border-gray-850 text-gray-905 w-full rounded-lg border border-gray-300 bg-white p-2 font-mono dark:text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                          Diễn biến chính trận đấu
                        </label>
                        <textarea
                          value={summary}
                          onChange={(e) => setSummary(e.target.value)}
                          rows={2}
                          className="dark:bg-brand-dark dark:border-gray-850 text-gray-905 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs dark:text-white"
                        />
                      </div>
                      <button
                        onClick={handleSettleMatch}
                        disabled={loading}
                        className="bg-brand-neon-green text-brand-dark shadow-brand-neon-green/20 w-full cursor-pointer rounded-lg py-2.5 text-xs font-extrabold shadow-lg hover:brightness-110"
                      >
                        Xác nhận kết quả & Tính điểm ngay
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Create Custom Match Panel */}
          <div className="glass-panel border-gray-250 space-y-6 rounded-2xl border p-6 dark:border-gray-800">
            <h2 className="border-gray-250 flex items-center gap-2 border-b pb-3 text-lg font-bold text-gray-900 dark:border-gray-800 dark:text-white">
              <PlusCircle size={18} className="text-brand-neon-rose" />
              Tạo Trận Đấu Mới Thủ Công
            </h2>

            <form onSubmit={handleAddMatch} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                  ID trận đấu
                </label>
                <input
                  type="text"
                  placeholder="WC-06"
                  required
                  value={newId}
                  onChange={(e) => setNewId(e.target.value)}
                  className="dark:bg-brand-dark dark:border-gray-850 text-gray-905 w-full rounded-lg border border-gray-300 bg-white p-2.5 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                  Định dạng vòng đấu
                </label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value as 'GROUP' | 'KNOCKOUT')}
                  className="dark:bg-brand-dark dark:border-gray-850 text-gray-905 w-full rounded-lg border border-gray-300 bg-white p-2.5 dark:text-white"
                >
                  <option value="GROUP">Vòng Bảng (Có tỷ số Hòa)</option>
                  <option value="KNOCKOUT">Knockout (Ngôi sao hy vọng)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                  Đội nhà (Home)
                </label>
                <select
                  required
                  value={newHome}
                  onChange={(e) => setNewHome(e.target.value)}
                  className="dark:bg-brand-dark dark:border-gray-850 text-gray-905 focus:border-brand-neon-rose w-full rounded-lg border border-gray-300 bg-white p-2.5 focus:outline-none dark:text-white"
                >
                  <option value="">-- Chọn Đội Nhà --</option>
                  {countriesList.map((country) => (
                    <option
                      key={country.key}
                      value={country.name}
                      disabled={country.name === newAway}
                    >
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                  Đội khách (Away)
                </label>
                <select
                  required
                  value={newAway}
                  onChange={(e) => setNewAway(e.target.value)}
                  className="dark:bg-brand-dark dark:border-gray-850 text-gray-905 focus:border-brand-neon-rose w-full rounded-lg border border-gray-300 bg-white p-2.5 focus:outline-none dark:text-white"
                >
                  <option value="">-- Chọn Đội Khách --</option>
                  {countriesList.map((country) => (
                    <option
                      key={country.key}
                      value={country.name}
                      disabled={country.name === newHome}
                    >
                      {country.flag} {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                  Thời gian bóng lăn (GMT+7 Local)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newKickoff}
                  onChange={(e) => setNewKickoff(e.target.value)}
                  className="dark:bg-brand-dark dark:border-gray-850 text-gray-905 w-full rounded-lg border border-gray-300 bg-white p-2.5 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                  Tỷ lệ Tài Xỉu (O/U)
                </label>
                <select
                  value={newOU}
                  onChange={(e) => setNewOU(e.target.value === '' ? '' : Number(e.target.value))}
                  className="dark:bg-brand-dark dark:border-gray-850 text-gray-905 w-full rounded-lg border border-gray-300 bg-white p-2.5 dark:text-white"
                >
                  <option value="">Không có (Để trống)</option>
                  <option value="1.5">1.5 Trái</option>
                  <option value="1.75">1.75 Trái</option>
                  <option value="2.0">2.0 Trái</option>
                  <option value="2.25">2.25 Trái</option>
                  <option value="2.5">2.5 Trái</option>
                  <option value="2.75">2.75 Trái</option>
                  <option value="3.0">3.0 Trái</option>
                  <option value="3.25">3.25 Trái</option>
                  <option value="3.5">3.5 Trái</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="from-brand-neon-rose to-brand-neon-purple w-full cursor-pointer rounded-xl bg-gradient-to-r py-3 text-xs font-bold text-white hover:brightness-110"
                >
                  Thêm trận đấu
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* API Sync Confirmation Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="dark:bg-brand-card animate-scale-in flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-2xl dark:border-gray-800">
            <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Database className="text-brand-neon-blue animate-pulse" size={22} />
              Đồng bộ lịch thi đấu từ API
            </h3>
            <p className="text-xs leading-relaxed text-gray-500">
              Dữ liệu được fetch từ API công khai của OpenFootball. Lọc và sắp xếp để nạp các trận
              đấu phù hợp.
            </p>

            {syncLoading ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-16">
                <div className="border-brand-neon-blue h-10 w-10 animate-spin rounded-full border-4 border-t-transparent"></div>
                <p className="text-sm font-semibold text-gray-500">
                  Đang tải và phân tích dữ liệu...
                </p>
              </div>
            ) : (
              <>
                {/* Filter & Sort Toolbar */}
                <div className="border-gray-150 mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-gray-50/60 p-3.5 dark:border-gray-900 dark:bg-gray-900/40">
                  {/* Stage filter checkboxes */}
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Vòng đấu:
                    </span>
                    <label className="text-gray-650 flex cursor-pointer items-center gap-1.5 text-xs select-none dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={showGroupStage}
                        onChange={(e) => setShowGroupStage(e.target.checked)}
                        className="text-brand-neon-blue focus:ring-brand-neon-blue dark:border-gray-850 h-4.5 w-4.5 cursor-pointer rounded border-gray-300"
                      />
                      Vòng bảng
                    </label>
                    <label className="text-gray-650 flex cursor-pointer items-center gap-1.5 text-xs select-none dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={showKnockoutStage}
                        onChange={(e) => setShowKnockoutStage(e.target.checked)}
                        className="text-brand-neon-blue focus:ring-brand-neon-blue dark:border-gray-850 h-4.5 w-4.5 cursor-pointer rounded border-gray-300"
                      />
                      Knockout
                    </label>
                  </div>

                  {/* Date Sort Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Sắp xếp ngày:
                    </span>
                    <button
                      onClick={() => setDateSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))}
                      className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[10px] font-bold text-gray-700 transition-all hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      {dateSortOrder === 'ASC' ? 'Tăng dần (Cũ → Mới)' : 'Giảm dần (Mới → Cũ)'}
                    </button>
                  </div>
                </div>

                {/* Control bar */}
                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-900">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleAllSync(true)}
                      className="cursor-pointer rounded-lg bg-gray-100 px-3 py-1.5 text-[10px] font-bold text-gray-700 hover:brightness-95 dark:bg-gray-900 dark:text-gray-300"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      onClick={() => handleToggleAllSync(false)}
                      className="cursor-pointer rounded-lg bg-gray-100 px-3 py-1.5 text-[10px] font-bold text-gray-700 hover:brightness-95 dark:bg-gray-900 dark:text-gray-300"
                    >
                      Bỏ chọn tất cả
                    </button>
                    <button
                      onClick={handleToggleNewSync}
                      className="bg-brand-neon-green/10 text-brand-neon-green border-brand-neon-green/20 cursor-pointer rounded-lg border px-3 py-1.5 text-[10px] font-bold hover:brightness-95"
                    >
                      Chỉ chọn trận mới
                    </button>
                  </div>
                  <div className="space-x-2 font-mono text-[10px] font-semibold text-gray-500">
                    <span>Tổng hiển thị: {displayedMatches.length}</span>
                    <span>•</span>
                    <span className="text-brand-neon-green">
                      Mới: {displayedMatches.filter((m) => !m.exists).length}
                    </span>
                    <span>•</span>
                    <span className="text-brand-neon-blue">
                      Đã chọn: {displayedMatches.filter((m) => m.checked).length}
                    </span>
                  </div>
                </div>

                {/* Match List Scrollbox */}
                <div className="divide-gray-150 my-4 flex-1 divide-y overflow-y-auto rounded-xl border border-gray-200 dark:divide-gray-900/60 dark:border-gray-900">
                  {displayedMatches.length === 0 ? (
                    <div className="p-8 text-center text-xs font-semibold text-gray-500">
                      Không tìm thấy trận đấu nào khớp bộ lọc.
                    </div>
                  ) : (
                    displayedMatches.map((m) => {
                      const homeFlag = teamFlagEmoji(m.home_team);
                      const awayFlag = teamFlagEmoji(m.away_team);
                      return (
                        <label
                          key={m.match_id}
                          className={`flex cursor-pointer items-center justify-between p-3.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/40 ${
                            m.exists ? 'opacity-65' : 'bg-brand-neon-green/[0.015]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={m.checked}
                              onChange={(e) => {
                                setSyncMatches((prev) =>
                                  prev.map((item) =>
                                    item.match_id === m.match_id
                                      ? { ...item, checked: e.target.checked }
                                      : item
                                  )
                                );
                              }}
                              className="text-brand-neon-blue focus:ring-brand-neon-blue h-4 w-4 cursor-pointer rounded border-gray-300 dark:border-gray-800"
                            />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black text-gray-500">
                                  {m.match_id}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide uppercase ${
                                    m.stage === 'GROUP'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                                      : 'dark:bg-purple-955/40 bg-purple-100 text-purple-800 dark:text-purple-400'
                                  }`}
                                >
                                  {m.stage === 'GROUP' ? 'Vòng bảng' : 'Knockout'}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
                                <span>
                                  {homeFlag} {m.home_team}
                                </span>
                                <span className="text-xs font-normal text-gray-400">vs</span>
                                <span>
                                  {awayFlag} {m.away_team}
                                </span>
                              </div>
                              <span className="mt-0.5 text-[10px] font-medium text-gray-500">
                                {new Date(m.kickoff_utc).toLocaleString('vi-VN', {
                                  timeZone: 'Asia/Ho_Chi_Minh',
                                })}{' '}
                                (GMT+7)
                              </span>
                            </div>
                          </div>

                          <div>
                            {m.exists ? (
                              <span className="text-gray-650 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-[9px] font-extrabold tracking-wider uppercase dark:border-gray-900 dark:bg-gray-800 dark:text-gray-400">
                                Đã có
                              </span>
                            ) : (
                              <span className="bg-brand-neon-green/15 text-brand-neon-green border-brand-neon-green/20 rounded-full border px-2.5 py-1 text-[9px] font-extrabold tracking-wider uppercase">
                                Mới
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-900">
                  <button
                    onClick={() => setShowSyncModal(false)}
                    className="cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleImportMatches}
                    disabled={loading || syncMatches.filter((m) => m.checked).length === 0}
                    className="bg-brand-neon-blue shadow-brand-neon-blue/20 cursor-pointer rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? 'Đang import...'
                      : `Xác nhận Import (${syncMatches.filter((m) => m.checked).length} trận)`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reset Confirmation Overlay Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="dark:bg-brand-card animate-scale-in w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-2xl dark:border-gray-800">
            <h3 className="mb-2 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <AlertTriangle className="text-brand-neon-rose animate-pulse" size={22} />
              Xác nhận xóa dữ liệu
            </h3>
            <p className="text-gray-650 mb-6 text-sm leading-relaxed dark:text-gray-400">
              Bạn có chắc chắn muốn **xóa toàn bộ lịch sử vote/dự đoán** của tất cả người chơi và
              **reset trạng thái tất cả trận đấu** về trạng thái lịch thi đấu ban đầu? Hành động này
              sẽ xóa sạch các bảng{' '}
              <code className="font-sport rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-900">
                picks
              </code>
              ,{' '}
              <code className="font-sport rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-900">
                scores
              </code>{' '}
              và không thể khôi phục.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleResetDatabase}
                disabled={loading}
                className="bg-brand-neon-rose shadow-brand-neon-rose/20 cursor-pointer rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:brightness-110"
              >
                {loading ? 'Đang xử lý...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
