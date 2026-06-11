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
  ou_line: number | null;
  final_home_score: number | null;
  final_away_score: number | null;
  final_summary: string | null;
  settled_at: string | null;
}

export interface Pick {
  id?: string;
  match_id: string;
  user_id: string;
  selection: SelectionType | null;
  ou_selection: 'OVER' | 'UNDER' | null;
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
  handicap_points?: number;
  handicap_correct?: boolean;
  ou_points?: number;
  ou_correct?: boolean;
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
  albania: 'AL',
  angola: 'AO',
  argentina: 'AR',
  australia: 'AU',
  austria: 'AT',
  bahrain: 'BH',
  belgium: 'BE',
  benin: 'BJ',
  'bosnia and herzegovina': 'BA',
  bolivia: 'BO',
  brazil: 'BR',
  'burkina faso': 'BF',
  cameroon: 'CM',
  canada: 'CA',
  'cape verde': 'CV',
  chile: 'CL',
  china: 'CN',
  colombia: 'CO',
  'congo dr': 'CD',
  "cote d'ivoire": 'CI',
  'costa rica': 'CR',
  croatia: 'HR',
  curacao: 'CW',
  czechia: 'CZ',
  denmark: 'DK',
  ecuador: 'EC',
  egypt: 'EG',
  'el salvador': 'SV',
  england: 'GB-ENG',
  finland: 'FI',
  france: 'FR',
  gabon: 'GA',
  georgia: 'GE',
  germany: 'DE',
  ghana: 'GH',
  greece: 'GR',
  guatemala: 'GT',
  guinea: 'GN',
  haiti: 'HT',
  honduras: 'HN',
  hungary: 'HU',
  indonesia: 'ID',
  iran: 'IR',
  iraq: 'IQ',
  italy: 'IT',
  jamaica: 'JM',
  japan: 'JP',
  'korea republic': 'KR',
  jordan: 'JO',
  mexico: 'MX',
  mali: 'ML',
  morocco: 'MA',
  netherlands: 'NL',
  'new zealand': 'NZ',
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
  'south africa': 'ZA',
  'south korea': 'KR',
  slovenia: 'SI',
  spain: 'ES',
  sweden: 'SE',
  switzerland: 'CH',
  thailand: 'TH',
  'trinidad and tobago': 'TT',
  tunisia: 'TN',
  turkey: 'TR',
  ukraine: 'UA',
  'united arab emirates': 'AE',
  uruguay: 'UY',
  uzbekistan: 'UZ',
  usa: 'US',
  vietnam: 'VN',
  wales: 'GB-WLS',
  zambia: 'ZM',
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

export interface OverUnderExplanation {
  lineText: string;
  over: { win: string; draw?: string; lose: string };
  under: { win: string; draw?: string; lose: string };
}

export function getOverUnderExplanation(ouLine: number): OverUnderExplanation {
  const lineText = `Tỷ lệ Tài/Xỉu: ${ouLine} Trái`;
  const absLine = Math.abs(ouLine);
  const isQuarter25 = Math.abs((absLine % 1) - 0.25) < 0.0001;
  const isQuarter75 = Math.abs((absLine % 1) - 0.75) < 0.0001;
  const isHalf = Math.abs((absLine % 1) - 0.5) < 0.0001;

  if (isHalf) {
    const overGoals = Math.ceil(absLine);
    const underGoals = Math.floor(absLine);
    return {
      lineText,
      over: {
        win: `Thắng nếu tổng số bàn thắng từ ${overGoals} bàn trở lên.`,
        lose: `Thua nếu tổng số bàn thắng từ ${underGoals} bàn trở xuống.`,
      },
      under: {
        win: `Thắng nếu tổng số bàn thắng từ ${underGoals} bàn trở xuống.`,
        lose: `Thua nếu tổng số bàn thắng từ ${overGoals} bàn trở lên.`,
      },
    };
  } else if (isQuarter25) {
    const baseGoals = Math.floor(absLine);
    const overGoals = baseGoals + 1;
    return {
      lineText,
      over: {
        win: `Thắng cả nếu tổng số bàn thắng từ ${overGoals} bàn trở lên.`,
        lose: `Thua nửa kèo (0 điểm) nếu tổng số bàn thắng là đúng ${baseGoals} bàn. Thua cả nếu thấp hơn.`,
      },
      under: {
        win: `Thắng cả nếu tổng số bàn thắng từ ${baseGoals - 1} bàn trở xuống. Thắng nửa kèo (+0.5 điểm) nếu tổng số bàn thắng là đúng ${baseGoals} bàn.`,
        lose: `Thua nếu tổng số bàn thắng từ ${overGoals} bàn trở lên.`,
      },
    };
  } else if (isQuarter75) {
    const baseGoals = Math.floor(absLine);
    const overGoals = baseGoals + 1;
    return {
      lineText,
      over: {
        win: `Thắng cả nếu tổng số bàn thắng từ ${overGoals + 1} bàn trở lên. Thắng nửa kèo (+0.5 điểm) nếu tổng số bàn thắng là đúng ${overGoals} bàn.`,
        lose: `Thua nếu tổng số bàn thắng từ ${baseGoals} bàn trở xuống.`,
      },
      under: {
        win: `Thắng cả nếu tổng số bàn thắng từ ${baseGoals} bàn trở xuống.`,
        lose: `Thua nửa kèo (0 điểm) nếu tổng số bàn thắng là đúng ${overGoals} bàn. Thua cả nếu cao hơn.`,
      },
    };
  } else {
    const val = Math.round(absLine);
    return {
      lineText,
      over: {
        win: `Thắng nếu tổng số bàn thắng từ ${val + 1} bàn trở lên.`,
        draw: `Hòa kèo (0 điểm/hoàn trả) nếu tổng số bàn thắng bằng đúng ${val} bàn.`,
        lose: `Thua nếu tổng số bàn thắng từ ${val - 1} bàn trở xuống.`,
      },
      under: {
        win: `Thắng nếu tổng số bàn thắng từ ${val - 1} bàn trở xuống.`,
        draw: `Hòa kèo (0 điểm/hoàn trả) nếu tổng số bàn thắng bằng đúng ${val} bàn.`,
        lose: `Thua nếu tổng số bàn thắng từ ${val + 1} bàn trở lên.`,
      },
    };
  }
}

export function calculateOverUnderOutcome(
  ouLine: number,
  homeScore: number,
  awayScore: number,
  selection: 'OVER' | 'UNDER'
): { correct: boolean; points: number; halfState?: 'WIN_HALF' | 'LOSE_HALF' | 'PUSH' } {
  const total = homeScore + awayScore;
  const diff = total - ouLine;

  if (Math.abs(diff) < 0.000001) {
    return { correct: false, points: 0, halfState: 'PUSH' };
  }

  if (diff > 0) {
    if (Math.abs(diff - 0.25) < 0.000001) {
      return {
        correct: selection === 'OVER',
        points: selection === 'OVER' ? 0.5 : 0,
        halfState: selection === 'OVER' ? 'WIN_HALF' : 'LOSE_HALF',
      };
    }
    return {
      correct: selection === 'OVER',
      points: selection === 'OVER' ? 1 : 0,
    };
  } else {
    const absDiff = Math.abs(diff);
    if (Math.abs(absDiff - 0.25) < 0.000001) {
      return {
        correct: selection === 'UNDER',
        points: selection === 'UNDER' ? 0.5 : 0,
        halfState: selection === 'UNDER' ? 'WIN_HALF' : 'LOSE_HALF',
      };
    }
    return {
      correct: selection === 'UNDER',
      points: selection === 'UNDER' ? 1 : 0,
    };
  }
}
