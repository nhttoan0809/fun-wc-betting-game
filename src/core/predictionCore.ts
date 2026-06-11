export type SelectionType = 'HOME' | 'DRAW' | 'AWAY';
export type MatchStatus = 'SCHEDULED' | 'OPEN' | 'LOCKED' | 'SETTLED' | 'CANCELLED';

export interface Match {
  match_id: string;
  home_team: string;
  away_team: string;
  kickoff_utc: string;
  stage: 'GROUP' | 'KNOCKOUT';
  status: MatchStatus;
  favorite_side: 'HOME' | 'AWAY' | null;
  handicap_side: 'HOME' | 'AWAY' | null;
  handicap_goals: number;
  final_home_score: number | null;
  final_away_score: number | null;
  final_summary: string | null;
  settled_at: string | null;
}

export interface Pick {
  id?: string;
  match_id: string;
  user_id: string;
  selection: SelectionType;
  star: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Player {
  id: string;
  email: string;
  display_name: string;
  active: boolean;
  is_admin: boolean;
}

export interface Score {
  user_id: string;
  match_id: string;
  points: number;
  correct: boolean;
}

export const SELECTIONS = {
  HOME: 'HOME' as SelectionType,
  DRAW: 'DRAW' as SelectionType,
  AWAY: 'AWAY' as SelectionType,
};

export const STATUSES = {
  SCHEDULED: 'SCHEDULED' as MatchStatus,
  OPEN: 'OPEN' as MatchStatus,
  LOCKED: 'LOCKED' as MatchStatus,
  SETTLED: 'SETTLED' as MatchStatus,
  CANCELLED: 'CANCELLED' as MatchStatus,
};

export function oppositeSide(side: 'HOME' | 'AWAY' | null): SelectionType {
  if (side === 'HOME') return 'AWAY';
  if (side === 'AWAY') return 'HOME';
  return 'DRAW';
}

export function isKnockout(match: Match): boolean {
  return match.stage === 'KNOCKOUT';
}

export function hasLockedOdds(match: Match): boolean {
  return (
    match.favorite_side !== null &&
    match.handicap_goals !== null &&
    !isNaN(Number(match.handicap_goals))
  );
}

export function shouldShowDrawOption(match: Match): boolean {
  return Number.isInteger(Math.abs(Number(match.handicap_goals || 0)));
}

export function getHandicapOutcome(
  match: Match,
  score: { homeScore: number; awayScore: number }
): SelectionType {
  let homeAdjusted = Number(score.homeScore);
  let awayAdjusted = Number(score.awayScore);
  const handicap = Number(match.handicap_goals || 0);
  const handicapSide = match.handicap_side || match.favorite_side;
  const givingSide = handicap >= 0 ? handicapSide : oppositeSide(handicapSide);

  const handicapAmount = Math.abs(handicap);

  if (givingSide === 'HOME') homeAdjusted -= handicapAmount;
  if (givingSide === 'AWAY') awayAdjusted -= handicapAmount;

  if (Math.abs(homeAdjusted - awayAdjusted) < 0.000001) return 'DRAW';
  return homeAdjusted > awayAdjusted ? 'HOME' : 'AWAY';
}

export function scorePick(
  match: Match,
  pick: Pick,
  score: { homeScore: number; awayScore: number }
): { correct: boolean; points: number; outcome: SelectionType } {
  const outcome = getHandicapOutcome(match, score);
  const correct = pick.selection === outcome;
  const star = Boolean(pick.star) && isKnockout(match);
  const points = correct ? (star ? 2 : 1) : star ? -1 : 0;

  return {
    correct,
    points,
    outcome,
  };
}

export const TEAM_FLAG_CODES: Record<string, string> = {
  algeria: 'DZ',
  angola: 'AO',
  argentina: 'AR',
  australia: 'AU',
  austria: 'AT',
  bahrain: 'BH',
  belgium: 'BE',
  benin: 'BJ',
  bolivia: 'BO',
  brazil: 'BR',
  cameroon: 'CM',
  canada: 'CA',
  chile: 'CL',
  china: 'CN',
  colombia: 'CO',
  croatia: 'HR',
  czechia: 'CZ',
  denmark: 'DK',
  ecuador: 'EC',
  egypt: 'EG',
  england: 'GB-ENG',
  france: 'FR',
  germany: 'DE',
  ghana: 'GH',
  greece: 'GR',
  haiti: 'HT',
  honduras: 'HN',
  hungary: 'HU',
  indonesia: 'ID',
  iran: 'IR',
  iraq: 'IQ',
  italy: 'IT',
  jamaica: 'JM',
  japan: 'JP',
  jordan: 'JO',
  mexico: 'MX',
  morocco: 'MA',
  netherlands: 'NL',
  nigeria: 'NG',
  norway: 'NO',
  oman: 'OM',
  panama: 'PA',
  paraguay: 'PY',
  peru: 'PE',
  poland: 'PL',
  portugal: 'PT',
  qatar: 'QA',
  romania: 'RO',
  senegal: 'SN',
  serbia: 'RS',
  slovakia: 'SK',
  slovenia: 'SI',
  spain: 'ES',
  sweden: 'SE',
  switzerland: 'CH',
  thailand: 'TH',
  tunisia: 'TN',
  turkey: 'TR',
  ukraine: 'UA',
  uruguay: 'UY',
  usa: 'US',
  vietnam: 'VN',
  wales: 'GB-WLS',
};

export function subdivisionFlagEmoji(tag: string): string {
  const codePoints = [0x1f3f4];
  tag.split('').forEach((char) => {
    codePoints.push(0xe0000 + char.charCodeAt(0));
  });
  codePoints.push(0xe007f);
  return String.fromCodePoint(...codePoints);
}

export function flagEmojiFromCode(code: string): string {
  const normalized = String(code || '').toUpperCase();
  if (normalized === 'GB-ENG') return subdivisionFlagEmoji('gbeng');
  if (normalized === 'GB-SCT') return subdivisionFlagEmoji('gbsct');
  if (normalized === 'GB-WLS') return subdivisionFlagEmoji('gbwls');
  if (!/^[A-Z]{2}$/.test(normalized)) return '';
  return normalized
    .split('')
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join('');
}

export function teamFlagEmoji(teamName: string): string {
  const key = String(teamName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  const code = TEAM_FLAG_CODES[key];
  return code ? flagEmojiFromCode(code) : '🏳️';
}

export function teamDisplayName(teamName: string): string {
  const name = String(teamName || '').trim();
  const flag = teamFlagEmoji(name);
  return flag ? flag + ' ' + name : name;
}

export function sideDisplayName(match: Match, side: SelectionType): string {
  if (side === 'DRAW') return 'Hòa';
  return side === 'HOME' ? teamDisplayName(match.home_team) : teamDisplayName(match.away_team);
}

export function formatHandicap(match: Match): string {
  const handicap = Number(match.handicap_goals || 0);
  const handicapSide = match.handicap_side || match.favorite_side;
  if (!handicapSide) return 'Đồng banh (0)';

  const givingSide: 'HOME' | 'AWAY' =
    handicap >= 0 ? handicapSide : (oppositeSide(handicapSide) as 'HOME' | 'AWAY');
  const receivingSide: 'HOME' | 'AWAY' = oppositeSide(givingSide) as 'HOME' | 'AWAY';

  const givingTeam = givingSide === 'HOME' ? match.home_team : match.away_team;
  const receivingTeam = receivingSide === 'HOME' ? match.home_team : match.away_team;

  return `${teamDisplayName(givingTeam)} chấp ${teamDisplayName(receivingTeam)} ${Math.abs(handicap)} Trái`;
}

export function formatKickoffTime(value: string | Date): string {
  const date = new Date(value);
  // Add 7 hours for GMT+7
  const gmt7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const pad = (v: number) => String(v).padStart(2, '0');

  return [
    gmt7.getUTCFullYear(),
    '-',
    pad(gmt7.getUTCMonth() + 1),
    '-',
    pad(gmt7.getUTCDate()),
    ' ',
    pad(gmt7.getUTCHours()),
    ':',
    pad(gmt7.getUTCMinutes()),
    ' GMT+7',
  ].join('');
}
