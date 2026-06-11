import React, { useState, useEffect } from 'react';
import type { Match, SelectionType } from '../core/predictionCore';
import { supabase } from '../supabaseClient';
import { Settings, PlusCircle, Play, Database, Check, AlertCircle } from 'lucide-react';

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
  const [loading, setLoading] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState('');

  // Form states
  const [oddsFavorite, setOddsFavorite] = useState<'HOME' | 'AWAY'>('HOME');
  const [oddsHandicap, setOddsHandicap] = useState(0.5);

  const [scoreHome, setScoreHome] = useState(2);
  const [scoreAway, setScoreAway] = useState(1);
  const [summary, setSummary] = useState('Trận đấu diễn ra sôi nổi và kịch tính.');

  // Create match form states
  const [newId, setNewId] = useState('');
  const [newHome, setNewHome] = useState('');
  const [newAway, setNewAway] = useState('');
  const [newKickoff, setNewKickoff] = useState('2026-06-11T19:00');
  const [newStage, setNewStage] = useState<'GROUP' | 'KNOCKOUT'>('GROUP');

  const selectedMatch = matches.find((m) => m.match_id === selectedMatchId);

  // Sync form states with selected match data
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (selectedMatch) {
      setOddsFavorite(selectedMatch.favorite_side || 'HOME');
      setOddsHandicap(selectedMatch.handicap_goals !== null ? selectedMatch.handicap_goals : 0.5);

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

  // Seed standard matches for World Cup 2026
  const handleSeedMatches = async () => {
    setLoading(true);
    const wcMatches = [
      {
        match_id: 'WC-01',
        home_team: 'Mexico',
        away_team: 'South Africa',
        kickoff_utc: new Date('2026-06-11T19:00:00Z').toISOString(),
        stage: 'GROUP',
        status: 'SCHEDULED',
        favorite_side: 'HOME',
        handicap_side: 'HOME',
        handicap_goals: 0.5,
      },
      {
        match_id: 'WC-02',
        home_team: 'South Korea',
        away_team: 'Czechia',
        kickoff_utc: new Date('2026-06-11T22:00:00Z').toISOString(),
        stage: 'GROUP',
        status: 'SCHEDULED',
        favorite_side: 'HOME',
        handicap_side: 'HOME',
        handicap_goals: 0.25,
      },
      {
        match_id: 'WC-03',
        home_team: 'Canada',
        away_team: 'Bosnia and Herzegovina',
        kickoff_utc: new Date('2026-06-12T19:00:00Z').toISOString(),
        stage: 'GROUP',
        status: 'SCHEDULED',
        favorite_side: 'HOME',
        handicap_side: 'HOME',
        handicap_goals: 0.75,
      },
      {
        match_id: 'WC-04',
        home_team: 'USA',
        away_team: 'Paraguay',
        kickoff_utc: new Date('2026-06-12T22:00:00Z').toISOString(),
        stage: 'GROUP',
        status: 'SCHEDULED',
        favorite_side: 'HOME',
        handicap_side: 'HOME',
        handicap_goals: 1.0,
      },
      {
        match_id: 'WC-05',
        home_team: 'Brazil',
        away_team: 'Morocco',
        kickoff_utc: new Date('2026-06-13T22:00:00Z').toISOString(),
        stage: 'GROUP',
        status: 'SCHEDULED',
        favorite_side: 'HOME',
        handicap_side: 'HOME',
        handicap_goals: 1.25,
      },
    ];

    try {
      const { error } = await supabase.from('matches').upsert(wcMatches);
      if (error) throw error;
      alert('Đã nạp thành công 5 trận đấu vòng bảng khai mạc World Cup 2026!');
      onRefresh();
    } catch (err: unknown) {
      alert('Lỗi nạp dữ liệu: ' + (err as Error).message);
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
      });

      if (error) throw error;
      alert('Đã thêm trận đấu thành công!');
      setNewId('');
      setNewHome('');
      setNewAway('');
      onRefresh();
    } catch (err: unknown) {
      alert('Lỗi: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Set odds (handicap)
  const handleSetOdds = async () => {
    if (!selectedMatchId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          favorite_side: oddsFavorite,
          handicap_side: oddsFavorite,
          handicap_goals: oddsHandicap,
          status: 'OPEN', // Auto-open match for pick once odds are defined
        })
        .eq('match_id', selectedMatchId);

      if (error) throw error;
      alert('Đã cập nhật kèo chấp và mở cổng dự đoán!');
      onRefresh();
    } catch (err: unknown) {
      alert('Lỗi: ' + (err as Error).message);
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

        let finalSelection: SelectionType;
        let isStar = false;

        if (userPick) {
          finalSelection = userPick.selection;
          isStar = userPick.star;
        } else {
          // Default selection when locked: default to favorite side
          finalSelection = selectedMatch.favorite_side || 'HOME';
        }

        const correct = finalSelection === outcome;
        const star = isStar && selectedMatch.stage === 'KNOCKOUT';
        const points = correct ? (star ? 2 : 1) : star ? -1 : 0;

        scoresToInsert.push({
          user_id: player.id,
          match_id: selectedMatchId,
          points,
          correct,
        });
      });

      // Insert/upsert scores
      const { error: scoresError } = await supabase
        .from('scores')
        .upsert(scoresToInsert, { onConflict: 'user_id,match_id' });

      if (scoresError) throw scoresError;

      alert(`Đã tính điểm thành công cho ${scoresToInsert.length} người chơi!`);
      onRefresh();
    } catch (err: unknown) {
      alert('Lỗi tính điểm: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
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
            onClick={handleSeedMatches}
            disabled={loading}
            className="bg-brand-neon-blue/15 hover:bg-brand-neon-blue/30 border-brand-neon-blue/30 text-brand-neon-blue shadow-brand-neon-blue/10 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold shadow-sm transition-all"
          >
            <Database size={16} />
            Khởi tạo lịch World Cup 2026
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
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
                      <AlertCircle size={16} className="text-brand-neon-blue" />
                      Cấu hình Tỷ lệ kèo & Mở cổng dự đoán
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
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
                        <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
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
                    </div>
                    <button
                      onClick={handleSetOdds}
                      disabled={loading}
                      className="bg-brand-neon-blue cursor-pointer rounded-lg px-4 py-2 text-xs font-bold text-white hover:brightness-110"
                    >
                      Lưu tỷ lệ & Mở pick
                    </button>
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
              <input
                type="text"
                placeholder="Argentina"
                required
                value={newHome}
                onChange={(e) => setNewHome(e.target.value)}
                className="dark:bg-brand-dark dark:border-gray-850 text-gray-905 w-full rounded-lg border border-gray-300 bg-white p-2.5 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                Đội khách (Away)
              </label>
              <input
                type="text"
                placeholder="Germany"
                required
                value={newAway}
                onChange={(e) => setNewAway(e.target.value)}
                className="dark:bg-brand-dark dark:border-gray-850 text-gray-905 w-full rounded-lg border border-gray-300 bg-white p-2.5 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
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
  );
};
