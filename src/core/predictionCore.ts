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
  display_name_confirmed?: boolean;
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
  "cote d'ivoire": 'CI',
  croatia: 'HR',
  curacao: 'CW',
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
  'saudi arabia': 'SA',
  senegal: 'SN',
  scotland: 'GB-SCT',
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

export interface HandicapExplanation {
  home: { win: string; draw?: string; lose: string };
  away: { win: string; draw?: string; lose: string };
  draw?: string;
}

export function getHandicapExplanation(match: Match): HandicapExplanation {
  const handicap = Number(match.handicap_goals || 0);
  const handicapSide = match.handicap_side || match.favorite_side;
  const home = match.home_team;
  const away = match.away_team;

  if (!handicapSide) {
    return {
      home: {
        win: `Thắng trận đấu (Đồng banh).`,
        draw: `Hòa (Hệ thống hoàn tiền/trả điểm cho người chơi).`,
        lose: `Thua trận đấu.`,
      },
      away: {
        win: `Thắng trận đấu (Đồng banh).`,
        draw: `Hòa (Hệ thống hoàn tiền/trả điểm cho người chơi).`,
        lose: `Thua trận đấu.`,
      },
      draw: `Trận đấu kết thúc với kết quả Hòa.`,
    };
  }

  const handicapAmount = Math.abs(handicap);
  const isHomeFavorite = handicapSide === 'HOME';

  if (handicapAmount === 0.25) {
    if (isHomeFavorite) {
      return {
        home: {
          win: `${home} thắng cách biệt 1 bàn trở lên (Thắng cả kèo).`,
          draw: `Hòa (Thua nửa kèo: bạn bị tính 0 điểm).`,
          lose: `${home} thua (Thua cả kèo).`,
        },
        away: {
          win: `${away} thắng (Thắng cả kèo).`,
          draw: `Hòa (Thắng nửa kèo: hệ thống tính kết quả thắng và được cộng điểm).`,
          lose: `${home} thắng (Thua cả kèo).`,
        },
      };
    } else {
      return {
        home: {
          win: `${home} thắng (Thắng cả kèo).`,
          draw: `Hòa (Thắng nửa kèo: hệ thống tính kết quả thắng và được cộng điểm).`,
          lose: `${away} thắng (Thua cả kèo).`,
        },
        away: {
          win: `${away} thắng cách biệt 1 bàn trở lên (Thắng cả kèo).`,
          draw: `Hòa (Thua nửa kèo: bạn bị tính 0 điểm).`,
          lose: `${away} thua (Thua cả kèo).`,
        },
      };
    }
  } else if (handicapAmount === 0.5) {
    if (isHomeFavorite) {
      return {
        home: {
          win: `${home} thắng cách biệt từ 1 bàn trở lên.`,
          lose: `Hai đội Hòa hoặc ${home} thua.`,
        },
        away: {
          win: `${away} thắng hoặc hai đội Hòa.`,
          lose: `${home} thắng cách biệt từ 1 bàn trở lên.`,
        },
      };
    } else {
      return {
        home: {
          win: `${home} thắng hoặc hai đội Hòa.`,
          lose: `${away} thắng cách biệt từ 1 bàn trở lên.`,
        },
        away: {
          win: `${away} thắng cách biệt từ 1 bàn trở lên.`,
          lose: `Hai đội Hòa hoặc ${away} thua.`,
        },
      };
    }
  } else if (handicapAmount === 0.75) {
    if (isHomeFavorite) {
      return {
        home: {
          win: `${home} thắng cách biệt từ 2 bàn trở lên (Thắng cả kèo). Nếu thắng cách biệt đúng 1 bàn (Thắng nửa kèo: tính kết quả thắng).`,
          lose: `Hai đội Hòa hoặc ${home} thua.`,
        },
        away: {
          win: `${away} thắng hoặc hai đội Hòa (Thắng cả kèo). Nếu ${home} thắng cách biệt đúng 1 bàn (Thua nửa kèo: tính 0 điểm).`,
          lose: `${home} thắng cách biệt từ 2 bàn trở lên.`,
        },
      };
    } else {
      return {
        home: {
          win: `${home} thắng hoặc hai đội Hòa (Thắng cả kèo). Nếu ${away} thắng cách biệt đúng 1 bàn (Thua nửa kèo: tính 0 điểm).`,
          lose: `${away} thắng cách biệt từ 2 bàn trở lên.`,
        },
        away: {
          win: `${away} thắng cách biệt từ 2 bàn trở lên (Thắng cả kèo). Nếu thắng cách biệt đúng 1 bàn (Thắng nửa kèo: tính kết quả thắng).`,
          lose: `Hai đội Hòa hoặc ${away} thua.`,
        },
      };
    }
  } else if (handicapAmount === 1.0) {
    if (isHomeFavorite) {
      return {
        home: {
          win: `${home} thắng cách biệt từ 2 bàn trở lên.`,
          draw: `${home} thắng cách biệt đúng 1 bàn (Hòa kèo: hoàn trả điểm và tính kết quả Hòa).`,
          lose: `Hai đội Hòa hoặc ${home} thua.`,
        },
        away: {
          win: `${away} thắng hoặc hai đội Hòa.`,
          draw: `${home} thắng cách biệt đúng 1 bàn (Hòa kèo: hoàn trả điểm và tính kết quả Hòa).`,
          lose: `${home} thắng cách biệt từ 2 bàn trở lên.`,
        },
        draw: `${home} thắng cách biệt đúng 1 bàn.`,
      };
    } else {
      return {
        home: {
          win: `${home} thắng hoặc hai đội Hòa.`,
          draw: `${away} thắng cách biệt đúng 1 bàn (Hòa kèo: hoàn trả điểm và tính kết quả Hòa).`,
          lose: `${away} thắng cách biệt từ 2 bàn trở lên.`,
        },
        away: {
          win: `${away} thắng cách biệt từ 2 bàn trở lên.`,
          draw: `${away} thắng cách biệt đúng 1 bàn (Hòa kèo: hoàn trả điểm và tính kết quả Hòa).`,
          lose: `Hai đội Hòa hoặc ${away} thua.`,
        },
        draw: `${away} thắng cách biệt đúng 1 bàn.`,
      };
    }
  } else if (handicapAmount === 1.25) {
    if (isHomeFavorite) {
      return {
        home: {
          win: `${home} thắng cách biệt từ 2 bàn trở lên (Thắng cả kèo).`,
          draw: `${home} thắng cách biệt đúng 1 bàn (Thua nửa kèo: tính 0 điểm).`,
          lose: `Hai đội Hòa hoặc ${home} thua.`,
        },
        away: {
          win: `${away} thắng hoặc hai đội Hòa (Thắng cả kèo).`,
          draw: `${home} thắng cách biệt đúng 1 bàn (Thắng nửa kèo: tính kết quả thắng).`,
          lose: `${home} thắng cách biệt từ 2 bàn trở lên.`,
        },
      };
    } else {
      return {
        home: {
          win: `${home} thắng hoặc hai đội Hòa (Thắng cả kèo).`,
          draw: `${away} thắng cách biệt đúng 1 bàn (Thắng nửa kèo: tính kết quả thắng).`,
          lose: `${away} thắng cách biệt từ 2 bàn trở lên.`,
        },
        away: {
          win: `${away} thắng cách biệt từ 2 bàn trở lên (Thắng cả kèo).`,
          draw: `${away} thắng cách biệt đúng 1 bàn (Thua nửa kèo: tính 0 điểm).`,
          lose: `Hai đội Hòa hoặc ${away} thua.`,
        },
      };
    }
  } else if (handicapAmount === 1.5) {
    if (isHomeFavorite) {
      return {
        home: {
          win: `${home} thắng cách biệt từ 2 bàn trở lên.`,
          lose: `${home} thắng cách biệt đúng 1 bàn, hai đội Hòa hoặc ${home} thua.`,
        },
        away: {
          win: `${away} thắng, hai đội Hòa, hoặc ${home} thắng cách biệt đúng 1 bàn.`,
          lose: `${home} thắng cách biệt từ 2 bàn trở lên.`,
        },
      };
    } else {
      return {
        home: {
          win: `${home} thắng, hai đội Hòa, hoặc ${away} thắng cách biệt đúng 1 bàn.`,
          lose: `${away} thắng cách biệt từ 2 bàn trở lên.`,
        },
        away: {
          win: `${away} thắng cách biệt từ 2 bàn trở lên.`,
          lose: `${away} thắng cách biệt đúng 1 bàn, hai đội Hòa hoặc ${away} thua.`,
        },
      };
    }
  }

  return {
    home: {
      win: `${home} thắng cách biệt lớn hơn ${handicapAmount} bàn.`,
      lose: `Hai đội Hòa hoặc ${home} thua.`,
    },
    away: {
      win: `${away} thắng hoặc hai đội Hòa.`,
      lose: `${home} thắng cách biệt lớn hơn ${handicapAmount} bàn.`,
    },
  };
}

export function parseOpenFootballDateTime(dateStr: string, timeStr: string): Date {
  const cleanedTime = timeStr.trim();
  const timeMatch = cleanedTime.match(/^(\d{2}:\d{2})/);
  if (!timeMatch) return new Date(`${dateStr}T00:00:00Z`);
  const hhmm = timeMatch[1];

  let offset = 'Z';
  const tzMatch = cleanedTime.match(/UTC\s*([+-])\s*(\d+)/i);
  if (tzMatch) {
    const sign = tzMatch[1];
    const hours = tzMatch[2].padStart(2, '0');
    offset = `${sign}${hours}:00`;
  }
  return new Date(`${dateStr}T${hhmm}:00${offset}`);
}

const openFootballTeamMap: Record<string, string> = {
  'Czech Republic': 'Czechia',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  'Ivory Coast': "Cote d'Ivoire",
  USA: 'USA',
  Curaçao: 'Curacao',
};

export function normalizeOpenFootballTeam(name: string): string {
  const trimmed = name.trim();
  return openFootballTeamMap[trimmed] || trimmed;
}
