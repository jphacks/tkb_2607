import { File } from 'expo-file-system';

import type { Tables, TablesUpdate } from '@/lib/database.types';
import { clampPlanetScale } from '@/features/gravity';
import { getSupabase } from '@/lib/supabase';
import type {
  AgeGroup,
  AuthUser,
  EncounterReportResult,
  Gender,
  HomeCandidate,
  PinnedPlanet,
  Planet,
  Satellite,
  SatelliteSummary,
  Tag,
  UserId,
} from '@/types/domain';

import { MAX_FEATURED_SATELLITES, type DataSource } from '../source';

type Bucket = 'planets' | 'satellites' | 'sounds';

function publicUrl(bucket: Bucket, path: string): string {
  return getSupabase().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** planets から読む列。toPlanet に渡す */
const PLANET_COLUMNS = 'image_path, palette, size_scale' as const;

function toPlanet(
  row: { image_path: string | null; palette: unknown; size_scale: number } | null,
): Planet | null {
  if (!row) return null;
  return {
    imageUrl: row.image_path ? publicUrl('planets', row.image_path) : null,
    palette: Array.isArray(row.palette) ? (row.palette as string[]) : [],
    sizeScale: clampPlanetScale(row.size_scale),
  };
}

function toSatellite(row: Tables<'satellites'>): Satellite {
  return {
    id: row.id,
    imageUrl: publicUrl('satellites', row.image_path),
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function toTag(row: Pick<Tables<'tags'>, 'id' | 'name'>): Tag {
  return { id: row.id, name: row.name };
}

/** user_tags から tags(id, name) を結合して取った行を Tag[] にする */
function toTags(rows: { tags: Pick<Tables<'tags'>, 'id' | 'name'> | null }[] | null): Tag[] {
  return (rows ?? []).flatMap((r) => (r.tags ? [toTag(r.tags)] : []));
}

/** 端末に保存されたログイン情報から自分の ID を取る(サーバーに問い合わせないので速い) */
async function sessionUserId(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  if (!data.session) throw new Error('ログインしていません');
  return data.session.user.id;
}

async function requireUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) throw new Error('ログインしていません');
  return data.user.id;
}

/** 端末内の画像ファイルを Storage にアップロードし、保存先のパスを返す */
async function uploadImage(bucket: Bucket, userId: string, localUri: string, name: string) {
  const isPng = localUri.toLowerCase().endsWith('.png');
  const path = `${userId}/${name}.${isPng ? 'png' : 'jpg'}`;
  const bytes = await new File(localUri).bytes();
  const { error } = await getSupabase()
    .storage.from(bucket)
    .upload(path, bytes, { contentType: isPng ? 'image/png' : 'image/jpeg', upsert: true });
  if (error) throw error;
  return path;
}

function check<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}

/** 結果が必ずある問い合わせ(insert ... single など)用。空なら例外にする */
function checkPresent<R extends { data: unknown; error: unknown }>(result: R) {
  const data = check(result);
  if (data === null) throw new Error('データを取得できませんでした');
  return data as NonNullable<R['data']>;
}

async function getFeatured(userId: string): Promise<SatelliteSummary[]> {
  const rows = check(
    await getSupabase()
      .from('satellites')
      .select('id, image_path')
      .eq('user_id', userId)
      .eq('is_featured', true)
      .order('sort_order')
      .limit(MAX_FEATURED_SATELLITES),
  );
  return (rows ?? []).map((r) => ({
    id: r.id,
    imageUrl: publicUrl('satellites', r.image_path),
  }));
}

/** profiles の追加項目(年代・性別・ひとこと・効果音)。DB では text なので、ここで型をつける */
const PROFILE_DETAIL_COLUMNS = 'age_group, gender, bio, sound_id' as const;

function toProfileDetail(
  row: Pick<Tables<'profiles'>, 'age_group' | 'gender' | 'bio' | 'sound_id'> | null,
) {
  return {
    ageGroup: (row?.age_group ?? null) as AgeGroup | null,
    gender: (row?.gender ?? null) as Gender | null,
    bio: row?.bio ?? '',
    soundId: row?.sound_id ?? null,
  };
}

function toAuthUser(
  user: { id: string; email?: string | null } | null | undefined,
): AuthUser | null {
  return user ? { id: user.id, email: user.email ?? null } : null;
}

export const supabaseSource: DataSource = {
  async getCurrentUser() {
    const { data } = await getSupabase().auth.getSession();
    return toAuthUser(data.session?.user);
  },

  onAuthChange(listener) {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      listener(toAuthUser(session?.user));
    });
    return () => data.subscription.unsubscribe();
  },

  async signIn({ email, password }) {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async signUp({ email, password }) {
    const { error } = await getSupabase().auth.signUp({ email, password });
    if (error) throw error;
  },

  async signOut() {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;
  },

  async getMyProfile() {
    const supabase = getSupabase();
    const userId = await requireUserId();
    const [profile, priv, tags, planet] = await Promise.all([
      supabase
        .from('profiles')
        .select(`nickname, organization, ${PROFILE_DETAIL_COLUMNS}`)
        .eq('id', userId)
        .single(),
      supabase.from('private_profiles').select('real_name').eq('user_id', userId).maybeSingle(),
      supabase.from('user_tags').select('tags(id, name)').eq('user_id', userId),
      supabase.from('planets').select(PLANET_COLUMNS).eq('user_id', userId).maybeSingle(),
    ]);
    const profileRow = check(profile);
    return {
      userId,
      nickname: profileRow?.nickname ?? '',
      realName: check(priv)?.real_name ?? null,
      organization: profileRow?.organization ?? null,
      tags: toTags(check(tags)),
      planet: toPlanet(check(planet)),
      ...toProfileDetail(profileRow),
    };
  },

  async updateMyProfile({ nickname, realName, organization, tagNames, ageGroup, gender, bio }) {
    const supabase = getSupabase();
    const userId = await requireUserId();
    const patch: TablesUpdate<'profiles'> = { nickname, organization };
    if (ageGroup !== undefined) patch.age_group = ageGroup;
    if (gender !== undefined) patch.gender = gender;
    if (bio !== undefined) patch.bio = bio;
    check(await supabase.from('profiles').update(patch).eq('id', userId));
    check(
      await supabase.from('private_profiles').update({ real_name: realName }).eq('user_id', userId),
    );
    check(await supabase.rpc('set_my_tags', { p_names: tagNames }));
  },

  async updateMySound(soundId) {
    const userId = await requireUserId();
    check(await getSupabase().from('profiles').update({ sound_id: soundId }).eq('id', userId));
  },

  async searchTags(query) {
    const rows = check(
      await getSupabase()
        .from('tags')
        .select('id, name')
        .ilike('name', `%${query.trim()}%`)
        .limit(10),
    );
    return (rows ?? []).map(toTag);
  },

  async savePlanet({ planetImageUri, palette, sourcePhotoUri }) {
    const userId = await requireUserId();
    const stamp = Date.now();
    const [imagePath, sourcePath] = await Promise.all([
      uploadImage('planets', userId, planetImageUri, `planet-${stamp}`),
      uploadImage('planets', userId, sourcePhotoUri, `source-${stamp}`),
    ]);
    check(
      await getSupabase().from('planets').upsert({
        user_id: userId,
        image_path: imagePath,
        palette,
        source_photo_path: sourcePath,
        updated_at: new Date().toISOString(),
      }),
    );
  },

  async updateMyPlanetScale(sizeScale) {
    const userId = await requireUserId();
    check(
      await getSupabase()
        .from('planets')
        .update({ size_scale: clampPlanetScale(sizeScale) })
        .eq('user_id', userId),
    );
  },

  async listMySatellites() {
    const userId = await requireUserId();
    const rows = check(
      await getSupabase().from('satellites').select('*').eq('user_id', userId).order('sort_order'),
    );
    return (rows ?? []).map(toSatellite);
  },

  async addSatellite({ imageUri }) {
    const supabase = getSupabase();
    const userId = await requireUserId();
    const existing = checkPresent(
      await supabase.from('satellites').select('is_featured').eq('user_id', userId),
    );
    const path = await uploadImage('satellites', userId, imageUri, `satellite-${Date.now()}`);
    const row = checkPresent(
      await supabase
        .from('satellites')
        .insert({
          user_id: userId,
          image_path: path,
          is_featured: existing.filter((s) => s.is_featured).length < MAX_FEATURED_SATELLITES,
          sort_order: existing.length,
        })
        .select('*')
        .single(),
    );
    return toSatellite(row);
  },

  async updateSatellite(id, { isFeatured, sortOrder }) {
    const patch: TablesUpdate<'satellites'> = {};
    if (isFeatured !== undefined) patch.is_featured = isFeatured;
    if (sortOrder !== undefined) patch.sort_order = sortOrder;
    const { error } = await getSupabase().from('satellites').update(patch).eq('id', id);
    if (error?.message.includes('featured_satellites_limit')) {
      throw new Error(`ホームに出せる衛星は${MAX_FEATURED_SATELLITES}つまでです`);
    }
    if (error) throw error;
  },

  async deleteSatellite(id) {
    const supabase = getSupabase();
    const row = check(
      await supabase.from('satellites').delete().eq('id', id).select('image_path').maybeSingle(),
    );
    if (row) {
      // 画像の削除に失敗しても、衛星の削除自体は成功として扱う
      await supabase.storage.from('satellites').remove([row.image_path]);
    }
  },

  async getHome(limit) {
    const supabase = getSupabase();
    const userId = await requireUserId();
    const [profile, planet, featured, candidates] = await Promise.all([
      supabase.from('profiles').select('nickname, organization').eq('id', userId).single(),
      supabase.from('planets').select(PLANET_COLUMNS).eq('user_id', userId).maybeSingle(),
      getFeatured(userId),
      supabase.rpc('get_home_candidates', { p_limit: limit }),
    ]);
    const rows = check(candidates) ?? [];
    // 顔ぶれが0人のときは行がないので、週の始まりだけ別に聞く
    const periodStart =
      rows[0]?.lineup_period_start ?? check(await supabase.rpc('home_period_start'));
    const angles = new Map<UserId, number>();
    for (const r of rows) if (r.angle !== null) angles.set(r.user_id, r.angle);
    return {
      me: {
        userId,
        nickname: check(profile)?.nickname ?? '',
        organization: check(profile)?.organization ?? null,
        planet: toPlanet(check(planet)),
        featuredSatellites: featured,
      },
      // 顔ぶれが0人なら並べる人がいないので、計算済み(空)として扱う
      lineup: { periodStart, angles: rows.length === 0 || angles.size > 0 ? angles : null },
      candidates: rows.map((r): HomeCandidate => ({
        userId: r.user_id,
        nickname: r.nickname,
        // すれ違いが5回未満の相手・本名を登録していない人は null で返ってくる
        realName: r.real_name ?? null,
        organization: r.organization,
        planet: toPlanet({
          image_path: r.planet_image_path,
          palette: r.palette,
          size_scale: r.planet_size_scale,
        })!,
        // jsonb で返ってくるので、形を指定して読む
        featuredSatellites: (
          (r.featured_satellites ?? []) as { id: string; image_path: string }[]
        ).map((s) => ({
          id: s.id,
          imageUrl: publicUrl('satellites', s.image_path),
        })),
        sharedTagCount: r.shared_tag_count,
        tagUnionCount: r.tag_union_count,
        encounterCount: r.encounter_count,
        lastEncounterAt: r.last_encounter_at,
        encounterTimestamps: r.encounter_timestamps ?? [],
      })),
    };
  },

  async saveHomeAngles(periodStart, angles) {
    const saved = check(
      await getSupabase().rpc('save_home_angles', {
        p_period_start: periodStart,
        // 数字でない値が保存されると、その週はホームを読めなくなるので送らない
        p_angles: Object.fromEntries([...angles].filter(([, angle]) => Number.isFinite(angle))),
      }),
    );
    return saved === true;
  },

  async getPlanetDetail(userId) {
    const supabase = getSupabase();
    const myId = await sessionUserId();
    const [profile, planet, satellites, tags, pin, realName] = await Promise.all([
      supabase
        .from('profiles')
        .select(`nickname, ${PROFILE_DETAIL_COLUMNS}`)
        .eq('id', userId)
        .single(),
      supabase.from('planets').select(PLANET_COLUMNS).eq('user_id', userId).maybeSingle(),
      supabase
        .from('satellites')
        .select('id, image_path')
        .eq('user_id', userId)
        .order('sort_order'),
      supabase.from('user_tags').select('tags(id, name)').eq('user_id', userId),
      supabase
        .from('pins')
        .select('target_user_id')
        .eq('user_id', myId)
        .eq('target_user_id', userId)
        .maybeSingle(),
      // すれ違いが5回未満の相手・本名を登録していない人は null で返ってくる
      supabase.rpc('get_visible_real_name', { p_user_id: userId }),
    ]);
    const profileRow = check(profile);
    return {
      userId,
      nickname: profileRow?.nickname ?? '',
      // 本名が取れなくても(関数の失敗など)、ニックネームで画面を出す
      realName: realName.error ? null : (realName.data ?? null),
      planet: toPlanet(check(planet)),
      satellites: (check(satellites) ?? []).map((r) => ({
        id: r.id,
        imageUrl: publicUrl('satellites', r.image_path),
      })),
      tags: toTags(check(tags)),
      ...toProfileDetail(profileRow),
      isPinned: check(pin) !== null,
    };
  },

  async listPins() {
    const supabase = getSupabase();
    const myId = await requireUserId();
    const pins =
      check(
        await supabase
          .from('pins')
          .select('target_user_id, created_at')
          .eq('user_id', myId)
          .order('created_at', { ascending: false }),
      ) ?? [];
    const ids = pins.map((p) => p.target_user_id);
    if (ids.length === 0) return [];
    const [profiles, planets, satellites, tags] = await Promise.all([
      supabase.from('profiles').select(`id, nickname, ${PROFILE_DETAIL_COLUMNS}`).in('id', ids),
      supabase.from('planets').select(`user_id, ${PLANET_COLUMNS}`).in('user_id', ids),
      supabase
        .from('satellites')
        .select('id, user_id, image_path')
        .in('user_id', ids)
        .eq('is_featured', true)
        .order('sort_order'),
      supabase.from('user_tags').select('user_id, tags(id, name)').in('user_id', ids),
    ]);
    const profileById = new Map((check(profiles) ?? []).map((r) => [r.id, r]));
    const planetById = new Map((check(planets) ?? []).map((r) => [r.user_id, r]));
    const satelliteRows = check(satellites) ?? [];
    const tagRows = check(tags) ?? [];
    return pins.flatMap((p): PinnedPlanet[] => {
      const profile = profileById.get(p.target_user_id);
      // 相手が退会していたら出さない
      if (!profile) return [];
      const detail = toProfileDetail(profile);
      return [
        {
          userId: profile.id,
          nickname: profile.nickname,
          planet: toPlanet(planetById.get(profile.id) ?? null),
          featuredSatellites: satelliteRows
            .filter((s) => s.user_id === profile.id)
            .slice(0, MAX_FEATURED_SATELLITES)
            .map((s) => ({ id: s.id, imageUrl: publicUrl('satellites', s.image_path) })),
          tags: toTags(tagRows.filter((t) => t.user_id === profile.id)),
          bio: detail.bio,
          soundId: detail.soundId,
          pinnedAt: p.created_at,
        },
      ];
    });
  },

  async pin(targetUserId) {
    const userId = await requireUserId();
    check(
      await getSupabase()
        .from('pins')
        .upsert(
          { user_id: userId, target_user_id: targetUserId },
          { onConflict: 'user_id,target_user_id', ignoreDuplicates: true },
        ),
    );
  },

  async unpin(targetUserId) {
    const userId = await requireUserId();
    check(
      await getSupabase()
        .from('pins')
        .delete()
        .eq('user_id', userId)
        .eq('target_user_id', targetUserId),
    );
  },

  async getBleToken() {
    const [row] = checkPresent(await getSupabase().rpc('issue_ble_token'));
    if (!row) throw new Error('BLE のトークンを発行できませんでした');
    return { token: row.token, validUntil: row.valid_until };
  },

  async reportEncounter({ token, rssi, detectedAt }) {
    return check(
      await getSupabase().rpc('report_encounter', {
        p_token: token,
        p_rssi: rssi,
        p_detected_at: detectedAt,
      }),
    ) as unknown as EncounterReportResult; // jsonb で返ってくる
  },

  async listDummyUsers() {
    const supabase = getSupabase();
    const userId = await requireUserId();
    const [dummies, encounters] = await Promise.all([
      supabase.from('profiles').select('id, nickname').eq('is_dummy', true).order('nickname'),
      supabase.from('encounters').select('user_a, user_b'),
    ]);
    const counts = new Map<string, number>();
    for (const e of check(encounters) ?? []) {
      const other = e.user_a === userId ? e.user_b : e.user_a;
      counts.set(other, (counts.get(other) ?? 0) + 1);
    }
    return (check(dummies) ?? []).map((d) => ({
      userId: d.id,
      nickname: d.nickname,
      encounterCount: counts.get(d.id) ?? 0,
    }));
  },

  async demoAddEncounter(targetUserId) {
    check(await getSupabase().rpc('demo_add_encounter', { p_target_user_id: targetUserId }));
  },

  async demoResetHomeLineup() {
    check(await getSupabase().rpc('demo_reset_home_lineup'));
  },
};
