import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MyPlanetHero } from '@/components/my-planet-hero';
import { PillButton } from '@/components/pill';
import { MoreButton, Sheet, SpaceScreen } from '@/components/space';
import { ErrorText, Loading } from '@/components/ui';
import { useMyProfile, useUpdateMySound } from '@/data';
import { findPlanetSound, PLANET_SOUNDS } from '@/lib/planet-sounds';
import { usePlanetSoundPlayer } from '@/lib/use-planet-sound';
import { color, ja, radius, shadow, typography } from '@/theme/tokens';
import type { SoundId } from '@/types/domain';

export { RouteErrorBoundary as ErrorBoundary } from '@/components/route-error-boundary';

// 惑星の効果音を選ぶ。Figma: A06|効果音登録(録音の代わりに、用意した音から選ぶ形にした)
export default function SoundScreen() {
  const { data: profile, error } = useMyProfile();
  if (!profile) {
    return <SpaceScreen>{error ? <ErrorText error={error} /> : <Loading />}</SpaceScreen>;
  }
  return <SoundPicker initial={profile.soundId} />;
}

/** 波形の飾り(Figma の 30本の高さ) */
const WAVE = [
  3, 5, 8, 12, 18, 25, 17, 12, 22, 29, 19, 13, 10, 17, 24, 15, 9, 7, 11, 16, 12, 8, 5, 3, 2, 5, 8,
  5, 3, 2,
];

function SoundPicker({ initial }: { initial: SoundId | null }) {
  const [selected, setSelected] = useState<SoundId | null>(initial);
  const play = usePlanetSoundPlayer();
  const save = useUpdateMySound();
  const current = findPlanetSound(selected);

  const choose = (id: SoundId | null) => {
    setSelected(id);
    play(id);
  };

  return (
    <SpaceScreen
      title="効果音を登録する"
      subtitle={'あなたの惑星のテーマとなる効果音を選んで、\n惑星に設定しましょう。'}
      headerRight={<MoreButton />}
      scroll
    >
      <MyPlanetHero onPressPlanet={() => play(selected)} />
      <Sheet style={styles.sheet}>
        <Pressable onPress={() => router.back()} style={styles.skip} hitSlop={8}>
          <Text style={styles.skipLabel}>Skip</Text>
          <Text style={styles.skipArrow}>→</Text>
        </Pressable>

        <Pressable
          onPress={() => play(selected)}
          disabled={!current}
          style={styles.halo}
          accessibilityRole="button"
          accessibilityLabel="試しに鳴らす"
        >
          <View style={styles.haloInner}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        </Pressable>
        <Text style={styles.current}>{current ? current.label : '効果音なし'}</Text>

        <View style={styles.wave} pointerEvents="none">
          {WAVE.map((h, i) => (
            <View key={i} style={[styles.bar, { height: h }]} />
          ))}
        </View>

        <View style={styles.options}>
          {PLANET_SOUNDS.map((sound) => (
            <Option
              key={sound.id}
              label={sound.label}
              selected={selected === sound.id}
              onPress={() => choose(sound.id)}
            />
          ))}
          <Option label="なし" selected={selected === null} onPress={() => choose(null)} />
        </View>
        <Text style={styles.hint}>タップすると試しに鳴ります</Text>

        <ErrorText error={save.error} />
        <View style={styles.buttons}>
          <PillButton
            variant="secondary"
            title="試聴"
            icon={<Text style={styles.trialIcon}>▶</Text>}
            onPress={() => play(selected)}
            disabled={!current}
            style={styles.trial}
          />
          <PillButton
            title="この効果音を登録する"
            onPress={() => save.mutate(selected, { onSuccess: () => router.back() })}
            disabled={selected === initial}
            loading={save.isPending}
            style={styles.register}
          />
        </View>
      </Sheet>
    </SpaceScreen>
  );
}

function Option({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { alignItems: 'center', paddingTop: 20 },
  skip: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6 },
  skipLabel: { ...typography.navBack, color: color.text.primary },
  skipArrow: {
    ...typography.navBack,
    fontFamily: typography.titleSection.fontFamily,
    fontSize: 20,
    color: color.text.primary,
  },
  halo: {
    width: 150,
    height: 150,
    borderRadius: radius.full,
    backgroundColor: 'rgba(232, 229, 255, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloInner: {
    width: 116,
    height: 116,
    borderRadius: radius.full,
    backgroundColor: 'rgba(199, 194, 255, 0.36)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 84,
    height: 84,
    borderRadius: radius.full,
    backgroundColor: color.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadow.lg,
  },
  playIcon: { color: color.text.onPrimary, fontSize: 30, marginLeft: 5 },
  current: { ...ja(typography.titleItem), color: color.text.primary, marginTop: 10 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, marginVertical: 8 },
  bar: { width: 3, borderRadius: 2, backgroundColor: color.bg.accentMuted, opacity: 0.75 },
  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  option: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    justifyContent: 'center',
    backgroundColor: color.bg.surface,
    borderWidth: 1,
    borderColor: color.border.secondaryButton,
  },
  optionSelected: { backgroundColor: color.bg.primary, borderColor: color.bg.primary },
  optionLabel: { ...ja(typography.labelButton), color: color.text.primary },
  optionLabelSelected: { color: color.text.onPrimary },
  hint: { ...ja(typography.bodyXSmall), color: color.text.tertiary, marginTop: 10 },
  buttons: { flexDirection: 'row', gap: 5, marginTop: 16, alignSelf: 'stretch' },
  trial: { width: 121 },
  trialIcon: { color: color.bg.accentMuted, fontSize: 15 },
  register: { flex: 1 },
});
