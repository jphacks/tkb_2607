import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PlanetOrbit } from '@/components/planet-orbit';
import { TagChip } from '@/components/pill';
import { MetalStar, MoreButton, Sheet, Sparkle, SpaceScreen } from '@/components/space';
import { ErrorText, Loading } from '@/components/ui';
import { useAuth, usePlanetDetail, useSetPinned } from '@/data';
import { findPlanetSound } from '@/lib/planet-sounds';
import { ageGroupLabel, genderLabel } from '@/lib/profile-options';
import { usePlanetSoundPlayer } from '@/lib/use-planet-sound';
import { color, ja, radius, shadow, typography } from '@/theme/tokens';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

const swipeArc = require('@/assets/images/ui/swipe-arc.png');
const pinIcon = require('@/assets/images/home/pin-icon.png');

// 惑星の詳細。惑星をタップすると効果音が鳴り、横にスワイプすると衛星が回る。Figma: B02|惑星の選択
export default function PlanetDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data, error } = usePlanetDetail(userId);
  const { user } = useAuth();
  const setPinned = useSetPinned();
  const play = usePlanetSoundPlayer();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!data) {
    return <SpaceScreen>{error ? <ErrorText error={error} /> : <Loading />}</SpaceScreen>;
  }

  const sound = findPlanetSound(data.soundId);
  const profileLine = [ageGroupLabel(data.ageGroup), genderLabel(data.gender)]
    .filter(Boolean)
    .join(' / ');
  const isMe = user?.id === data.userId;

  const togglePin = () => {
    setMenuOpen(false);
    setPinned.mutate(
      { userId: data.userId, pinned: !data.isPinned },
      { onError: (e) => Alert.alert('保存できませんでした', e.message) },
    );
  };

  return (
    <SpaceScreen
      scroll
      headerRight={isMe ? undefined : <MoreButton onPress={() => setMenuOpen(!menuOpen)} />}
      decor={
        <>
          <MetalStar x={22} y={175} height={83} />
          <MetalStar x={345} y={396} height={87} />
          <Sparkle x={330} y={455} size={22} />
          <Sparkle x={40} y={470} size={14} />
        </>
      }
    >
      <View style={styles.hero}>
        <PlanetOrbit
          planet={data.planet}
          satellites={data.satellites}
          size="lg"
          swipeable
          onPressPlanet={sound ? () => play(data.soundId) : undefined}
        />
        {data.satellites.length > 1 && (
          <View style={styles.swipeHint} pointerEvents="none">
            <Image source={swipeArc} style={styles.swipeArc} contentFit="contain" />
            <Text style={styles.swipeText}>Swipe to view the satellite</Text>
          </View>
        )}
      </View>

      <Sheet style={styles.card}>
        <View style={styles.top}>
          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <Text style={styles.owner} numberOfLines={1}>
                {/* 本名を見せてよい相手(すれ違い5回以上)なら本名、それ以外はニックネーム */}
                {data.realName ?? data.nickname}の
              </Text>
              <Text style={styles.planetName}>惑星</Text>
            </View>
            {sound && (
              <Pressable onPress={() => play(data.soundId)} style={styles.sound} hitSlop={6}>
                <Text style={styles.soundIcon}>▶</Text>
                <Text style={styles.soundLabel}>サウンドを再生</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>SATELLITES</Text>
            <Text style={styles.statValue}>{data.satellites.length}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        {data.tags.length > 0 && (
          <Row label="T A G S">
            <View style={styles.tags}>
              {data.tags.map((t) => (
                <TagChip key={t.id} name={t.name} />
              ))}
            </View>
          </Row>
        )}
        {profileLine !== '' && (
          <Row label="P R O F I L E">
            <Text style={styles.body}>{profileLine}</Text>
          </Row>
        )}
        {data.bio !== '' && (
          <Row label="A B O U T">
            <Text style={styles.body}>{data.bio}</Text>
          </Row>
        )}
      </Sheet>

      {menuOpen && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <View style={styles.menu}>
            <MenuItem
              icon={<Text style={styles.menuGlyph}>✦</Text>}
              label="きらめきを送る"
              onPress={() => {
                setMenuOpen(false);
                Alert.alert('準備中です', 'きらめきを送る機能は、いま作っています。');
              }}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={<Image source={pinIcon} style={styles.menuIcon} contentFit="contain" />}
              label={data.isPinned ? '保存をやめる' : '保存する'}
              onPress={togglePin}
              disabled={setPinned.isPending}
            />
          </View>
        </>
      )}
    </SpaceScreen>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowBody}>{children}</View>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.menuItem, disabled && styles.menuItemDisabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {icon}
      <Text style={styles.menuLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 40 },
  swipeHint: { alignItems: 'center', marginTop: 4, gap: 8 },
  swipeArc: { width: 169, height: 26 },
  swipeText: {
    ...typography.labelHint,
    color: color.text.onDarkMuted,
  },
  card: { marginTop: 30, paddingHorizontal: 27, paddingTop: 36, gap: 0 },
  top: { flexDirection: 'row', alignItems: 'stretch' },
  identity: { flex: 1, gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  owner: { ...ja(typography.bodyLead), color: color.text.primary, flexShrink: 1 },
  planetName: { ...ja(typography.titleScreen), color: color.text.primary },
  sound: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 29,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: color.border.default,
  },
  soundIcon: { ...typography.titleItem, color: color.text.primary, fontSize: 11 },
  soundLabel: {
    ...ja({ ...typography.titleItem, fontFamily: typography.labelTag.fontFamily }),
    color: color.text.primary,
  },
  statDivider: { width: 0.5, backgroundColor: color.border.accent, marginHorizontal: 18 },
  stat: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingRight: 4 },
  statLabel: {
    ...typography.labelOverline,
    color: color.text.primary,
  },
  statValue: { ...typography.numericStat, color: color.text.primary },
  divider: {
    height: 1,
    backgroundColor: color.border.accent,
    opacity: 0.35,
    marginTop: 18,
    marginBottom: 18,
    marginHorizontal: -14,
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  rowLabel: {
    ...typography.labelCaps,
    letterSpacing: 0,
    width: 57,
    color: color.text.primary,
    marginTop: 5,
  },
  rowBody: { flex: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  body: { ...ja(typography.bodySmall), lineHeight: 20, color: color.text.primary },
  menu: {
    position: 'absolute',
    top: 100,
    right: 25,
    width: 140,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md + 4,
    backgroundColor: color.bg.surface,
    boxShadow: shadow.lg,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 36 },
  menuItemDisabled: { opacity: 0.4 },
  menuGlyph: { fontSize: 15, color: color.text.primary, width: 18, textAlign: 'center' },
  menuIcon: { width: 16, height: 16, marginHorizontal: 1 },
  menuLabel: { ...ja(typography.labelHint), letterSpacing: 0, color: color.text.primary },
  menuDivider: { height: 1, backgroundColor: color.border.neutral },
});
