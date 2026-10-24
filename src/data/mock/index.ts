import type {
  AgeGroup,
  AuthUser,
  Gender,
  EncounterReportResult,
  HomeCandidate,
  Planet,
  Satellite,
  SoundId,
  Tag,
  UserId,
} from '@/types/domain';

import { MAX_FEATURED_SATELLITES, type DataSource } from '../source';
import { DUMMY_FIXTURES, ME_FIXTURE, MOCK_ME_ID } from './fixtures';

// サーバー側(supabase/migrations)と同じ値にそろえる
const RSSI_THRESHOLD = -85;
const DEDUP_WINDOW_MS = 30 * 60 * 1000;
const TOKEN_TTL_MS = 15 * 60 * 1000;

type MockUser = {
  id: UserId;
  email: string;
  password: string;
  nickname: string;
  realName: string | null;
  organization: string | null;
  tagNames: string[];
  planet: Planet | null;
  satellites: Satellite[];
  isDummy: boolean;
  ageGroup: AgeGroup | null;
  gender: Gender | null;
  bio: string;
  soundId: SoundId | null;
};

type MockPin = { userId: UserId; targetUserId: UserId; at: number };

type MockEncounter = { a: UserId; b: UserId; at: number };

const wait = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
const pairKey = (x: UserId, y: UserId) => (x < y ? `${x}|${y}` : `${y}|${x}`);

function createInitialState() {
  const users = new Map<UserId, MockUser>();
  users.set(MOCK_ME_ID, {
    id: MOCK_ME_ID,
    email: ME_FIXTURE.email,
    password: 'password',
    nickname: ME_FIXTURE.nickname,
    realName: ME_FIXTURE.realName,
    organization: ME_FIXTURE.organization,
    tagNames: [...ME_FIXTURE.tags],
    planet: { imageUrl: null, palette: ME_FIXTURE.palette },
    satellites: [],
    isDummy: false,
    ageGroup: ME_FIXTURE.ageGroup,
    gender: ME_FIXTURE.gender,
    bio: ME_FIXTURE.bio,
    soundId: ME_FIXTURE.soundId,
  });

  const encounters: MockEncounter[] = [];
  const now = Date.now();
  for (const f of DUMMY_FIXTURES) {
    users.set(f.id, {
      id: f.id,
      email: `${f.id}@example.com`,
      password: 'password',
      nickname: f.nickname,
      realName: null,
      organization: f.organization,
      tagNames: [...f.tags],
      planet: { imageUrl: null, palette: f.palette },
      satellites: [],
      isDummy: true,
      ageGroup: f.ageGroup ?? null,
      gender: f.gender ?? null,
      bio: f.bio ?? '',
      soundId: f.soundId ?? null,
    });
    // 過去2週間に散らばるよう、決まった間隔ですれ違いを置く
    for (let i = 0; i < f.encounterCount; i++) {
      encounters.push({ a: MOCK_ME_ID, b: f.id, at: now - (i * 27 + 3) * 60 * 60 * 1000 });
    }
  }

  const tagNames = new Set<string>();
  users.forEach((u) => u.tagNames.forEach((t) => tagNames.add(t)));

  // ピン止め一覧がはじめから空にならないよう、2人ピン止めしておく
  const pins: MockPin[] = [
    { userId: MOCK_ME_ID, targetUserId: 'dummy-01', at: now - 2 * 60 * 60 * 1000 },
    { userId: MOCK_ME_ID, targetUserId: 'dummy-03', at: now - 26 * 60 * 60 * 1000 },
  ];

  return {
    users,
    encounters,
    pins,
    tags: [...tagNames],
    currentUserId: MOCK_ME_ID as UserId | null,
  };
}

const state = createInitialState();

/** サーバーと同じく、顔ぶれと角度は週に1回だけ変える(端末のメモリ上だけ) */
type MockLineup = {
  userId: UserId;
  periodStart: string;
  memberIds: UserId[];
  angles: Map<UserId, number> | null;
};
let lineup: MockLineup | null = null;

/** 今の週の始まり(月曜 0:00、日本時間) */
function homePeriodStart(now = Date.now()) {
  const JST = 9 * 60 * 60 * 1000;
  const DAY = 24 * 60 * 60 * 1000;
  const jst = new Date(now + JST);
  const daysSinceMonday = (jst.getUTCDay() + 6) % 7;
  const mondayJst =
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()) - daysSinceMonday * DAY;
  return new Date(mondayJst - JST).toISOString();
}
const authListeners = new Set<(user: AuthUser | null) => void>();

function currentUser(): MockUser {
  const user = state.currentUserId ? state.users.get(state.currentUserId) : undefined;
  if (!user) throw new Error('ログインしていません');
  return user;
}

function toAuthUser(user: MockUser | undefined): AuthUser | null {
  return user ? { id: user.id, email: user.email } : null;
}

function notifyAuth() {
  const user = toAuthUser(state.currentUserId ? state.users.get(state.currentUserId) : undefined);
  authListeners.forEach((listener) => listener(user));
}

function tagId(name: string): number {
  let index = state.tags.indexOf(name);
  if (index === -1) {
    state.tags.push(name);
    index = state.tags.length - 1;
  }
  return index + 1;
}

function toTags(names: string[]): Tag[] {
  return names.map((name) => ({ id: tagId(name), name }));
}

function featured(user: MockUser) {
  return user.satellites
    .filter((s) => s.isFeatured)
    .sort((x, y) => x.sortOrder - y.sortOrder)
    .slice(0, MAX_FEATURED_SATELLITES)
    .map(({ id, imageUrl }) => ({ id, imageUrl }));
}

function encountersBetween(x: UserId, y: UserId) {
  const key = pairKey(x, y);
  return state.encounters
    .filter((e) => pairKey(e.a, e.b) === key)
    .map((e) => e.at)
    .sort((p, q) => q - p);
}

export const mockSource: DataSource = {
  async getCurrentUser() {
    return toAuthUser(state.currentUserId ? state.users.get(state.currentUserId) : undefined);
  },

  onAuthChange(listener) {
    authListeners.add(listener);
    return () => {
      authListeners.delete(listener);
    };
  },

  async signIn({ email, password }) {
    await wait();
    const user = [...state.users.values()].find((u) => u.email === email);
    if (!user || user.password !== password) {
      throw new Error('メールアドレスかパスワードが違います(モック: me@example.com / password)');
    }
    state.currentUserId = user.id;
    notifyAuth();
  },

  async signUp({ email, password }) {
    await wait();
    if ([...state.users.values()].some((u) => u.email === email)) {
      throw new Error('このメールアドレスはすでに登録されています');
    }
    const id = `mock-${Date.now()}`;
    state.users.set(id, {
      id,
      email,
      password,
      nickname: '',
      realName: null,
      organization: null,
      tagNames: [],
      planet: null,
      satellites: [],
      isDummy: false,
      ageGroup: null,
      gender: null,
      bio: '',
      soundId: null,
    });
    state.currentUserId = id;
    notifyAuth();
  },

  async signOut() {
    state.currentUserId = null;
    notifyAuth();
  },

  async getMyProfile() {
    await wait();
    const me = currentUser();
    return {
      userId: me.id,
      nickname: me.nickname,
      realName: me.realName,
      organization: me.organization,
      tags: toTags(me.tagNames),
      planet: me.planet,
      ageGroup: me.ageGroup,
      gender: me.gender,
      bio: me.bio,
      soundId: me.soundId,
    };
  },

  async updateMyProfile({ nickname, realName, organization, tagNames, ageGroup, gender, bio }) {
    await wait();
    const me = currentUser();
    me.nickname = nickname;
    me.realName = realName;
    me.organization = organization;
    me.tagNames = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];
    me.tagNames.forEach(tagId);
    if (ageGroup !== undefined) me.ageGroup = ageGroup;
    if (gender !== undefined) me.gender = gender;
    if (bio !== undefined) me.bio = bio;
  },

  async updateMySound(soundId) {
    await wait();
    currentUser().soundId = soundId;
  },

  async searchTags(query) {
    const q = query.trim();
    return toTags(state.tags.filter((name) => name.includes(q)).slice(0, 10));
  },

  async savePlanet({ planetImageUri, palette }) {
    await wait();
    currentUser().planet = { imageUrl: planetImageUri, palette };
  },

  async listMySatellites() {
    await wait();
    return [...currentUser().satellites].sort((x, y) => x.sortOrder - y.sortOrder);
  },

  async addSatellite({ imageUri }) {
    await wait();
    const me = currentUser();
    const satellite: Satellite = {
      id: `sat-${Date.now()}`,
      imageUrl: imageUri,
      isFeatured: me.satellites.filter((s) => s.isFeatured).length < MAX_FEATURED_SATELLITES,
      sortOrder: me.satellites.length,
      createdAt: new Date().toISOString(),
    };
    me.satellites.push(satellite);
    return satellite;
  },

  async updateSatellite(id, input) {
    await wait();
    const me = currentUser();
    const satellite = me.satellites.find((s) => s.id === id);
    if (!satellite) throw new Error('衛星が見つかりません');
    if (
      input.isFeatured &&
      !satellite.isFeatured &&
      me.satellites.filter((s) => s.isFeatured).length >= MAX_FEATURED_SATELLITES
    ) {
      throw new Error(`ホームに出せる衛星は${MAX_FEATURED_SATELLITES}つまでです`);
    }
    Object.assign(satellite, input);
  },

  async deleteSatellite(id) {
    await wait();
    const me = currentUser();
    me.satellites = me.satellites.filter((s) => s.id !== id);
  },

  async getHome(limit) {
    await wait();
    const me = currentUser();
    const candidates: HomeCandidate[] = [];
    for (const user of state.users.values()) {
      if (user.id === me.id || !user.planet) continue;
      const shared = user.tagNames.filter((t) => me.tagNames.includes(t)).length;
      const timestamps = encountersBetween(me.id, user.id);
      candidates.push({
        userId: user.id,
        nickname: user.nickname,
        organization: user.organization,
        planet: user.planet,
        featuredSatellites: featured(user),
        sharedTagCount: shared,
        tagUnionCount: new Set([...me.tagNames, ...user.tagNames]).size,
        encounterCount: timestamps.length,
        lastEncounterAt: timestamps[0] ? new Date(timestamps[0]).toISOString() : null,
        encounterTimestamps: timestamps.map((t) => new Date(t).toISOString()),
      });
    }
    // 今週の顔ぶれがまだなければ選ぶ(サーバーと同じく、関係がある人を先に、ない人を後ろに並べる。
    // 所属団体の一致も関係ありに数える)
    const periodStart = homePeriodStart();
    if (!lineup || lineup.userId !== me.id || lineup.periodStart !== periodStart) {
      const myOrganization = me.organization?.trim().toLowerCase() || null;
      const relation = (c: HomeCandidate) =>
        c.encounterCount +
        c.sharedTagCount +
        (myOrganization !== null && c.organization?.trim().toLowerCase() === myOrganization
          ? 1
          : 0);
      const picked = [...candidates].sort((x, y) => relation(y) - relation(x)).slice(0, limit);
      lineup = { userId: me.id, periodStart, memberIds: picked.map((c) => c.userId), angles: null };
    }
    const byId = new Map(candidates.map((c) => [c.userId, c]));
    return {
      me: {
        userId: me.id,
        nickname: me.nickname,
        organization: me.organization,
        planet: me.planet,
        featuredSatellites: featured(me),
      },
      candidates: lineup.memberIds.flatMap((id) => byId.get(id) ?? []),
      // 顔ぶれが0人なら並べる人がいないので、計算済み(空)として扱う
      lineup: {
        periodStart,
        angles: lineup.memberIds.length === 0 ? new Map() : lineup.angles,
      },
    };
  },

  async saveHomeAngles(periodStart, angles) {
    await wait();
    if (!lineup || lineup.userId !== currentUser().id) return false;
    if (lineup.periodStart !== periodStart || lineup.angles) return false;
    lineup.angles = new Map(angles);
    return true;
  },

  async getPlanetDetail(userId) {
    await wait();
    const user = state.users.get(userId);
    if (!user) throw new Error('ユーザーが見つかりません');
    return {
      userId: user.id,
      nickname: user.nickname,
      planet: user.planet,
      satellites: user.satellites.map(({ id, imageUrl }) => ({ id, imageUrl })),
      tags: toTags(user.tagNames),
      ageGroup: user.ageGroup,
      gender: user.gender,
      bio: user.bio,
      soundId: user.soundId,
      isPinned: state.pins.some(
        (p) => p.userId === state.currentUserId && p.targetUserId === user.id,
      ),
    };
  },

  async listPins() {
    await wait();
    const me = currentUser();
    return state.pins
      .filter((p) => p.userId === me.id)
      .sort((x, y) => y.at - x.at)
      .flatMap((p) => {
        const user = state.users.get(p.targetUserId);
        if (!user) return [];
        return [
          {
            userId: user.id,
            nickname: user.nickname,
            planet: user.planet,
            featuredSatellites: featured(user),
            tags: toTags(user.tagNames),
            bio: user.bio,
            soundId: user.soundId,
            pinnedAt: new Date(p.at).toISOString(),
          },
        ];
      });
  },

  async pin(targetUserId) {
    await wait();
    const me = currentUser();
    if (targetUserId === me.id) throw new Error('自分の惑星はピン止めできません');
    if (state.pins.some((p) => p.userId === me.id && p.targetUserId === targetUserId)) return;
    state.pins.push({ userId: me.id, targetUserId, at: Date.now() });
  },

  async unpin(targetUserId) {
    await wait();
    const me = currentUser();
    state.pins = state.pins.filter((p) => !(p.userId === me.id && p.targetUserId === targetUserId));
  },

  async getBleToken() {
    return {
      token: `mock-${currentUser().id}`,
      validUntil: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    };
  },

  async reportEncounter({ token, rssi, detectedAt }) {
    await wait();
    const me = currentUser();
    const peerId = token.startsWith('mock-') ? token.slice('mock-'.length) : '';
    const result = (reason: EncounterReportResult['reason']): EncounterReportResult => ({
      recorded: reason === 'ok',
      reason,
    });
    if (!state.users.has(peerId)) return result('unknown_token');
    if (peerId === me.id) return result('self');
    if (rssi < RSSI_THRESHOLD) return result('weak_signal');
    const at = Date.parse(detectedAt);
    if (encountersBetween(me.id, peerId).some((t) => Math.abs(t - at) < DEDUP_WINDOW_MS)) {
      return result('duplicate');
    }
    state.encounters.push({ a: me.id, b: peerId, at });
    return result('ok');
  },

  async listDummyUsers() {
    await wait();
    const me = currentUser();
    return [...state.users.values()]
      .filter((u) => u.isDummy)
      .map((u) => ({
        userId: u.id,
        nickname: u.nickname,
        encounterCount: encountersBetween(me.id, u.id).length,
      }));
  },

  async demoAddEncounter(targetUserId) {
    await wait();
    state.encounters.push({ a: currentUser().id, b: targetUserId, at: Date.now() });
  },

  async demoResetHomeLineup() {
    await wait();
    lineup = null;
  },
};
