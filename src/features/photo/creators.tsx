// 惑星と衛星を作る画面の部品(土台の画面に差し込んで使う)。
// - PlanetCreator:写真の色から、画風の違う惑星の候補を作って選ぶ
// - SatelliteCreator:Vision で被写体を切り抜く。切り抜けなければ円形のトリミング画面を出す
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { PlanetCreatorProps, SatelliteCreatorProps } from './contract';
import { CircleCropper } from './cropper';
import { deleteCachedFiles } from './files';
import { extractPlanetPalette } from './palette';
import { createPlanetCandidates, newPlanetSeed, type PlanetCandidate } from './planet-art';
import { DEFAULT_PLANET_STYLE_ID, PLANET_STYLES } from './planet-styles';
import { decidePlanetTraits, describePlanetTraits, type PlanetTraits } from './planet-traits';
import { cutoutSubjectWithVision, describeError } from './processing';

async function pickPhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  });
  return result.canceled ? null : result.assets[0].uri;
}

type PlanetDraft = {
  sourcePhotoUri: string;
  palette: string[];
  /** 写真の雰囲気から決めた種類と形。作り直しても変えない */
  traits: PlanetTraits;
  candidates: PlanetCandidate[];
  /** 「この惑星にする」で土台に渡した画像。土台が使うので、作り直しても消さない */
  savedImageUri: string | null;
};

// 惑星づくり:写真を選ぶ → 色を取り出し、雰囲気から種類と形を決める
// → 画風の違う候補(水彩・クレヨン・パステル)を横に並べる(描けたものから順に出す) → 1つ選んで決める
export function PlanetCreator({ onComplete }: PlanetCreatorProps) {
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<PlanetDraft | null>(null);
  /** 選んだ候補の画風。作り直しても同じ画風を選んだままにする */
  const [selectedStyleId, setSelectedStyleId] = useState(DEFAULT_PLANET_STYLE_ID);

  /** 描けた候補から順に画面に出す */
  const showProgress = (candidates: PlanetCandidate[]) =>
    setDraft((current) => current && { ...current, candidates });

  const choose = async () => {
    const uri = await pickPhoto();
    if (!uri) return;
    setBusy(true);
    try {
      const palette = await extractPlanetPalette(uri);
      const traits = decidePlanetTraits(palette);
      setDraft({ sourcePhotoUri: uri, palette, traits, candidates: [], savedImageUri: null });
      setSelectedStyleId(DEFAULT_PLANET_STYLE_ID);
      await createPlanetCandidates(palette, traits, newPlanetSeed(), showProgress);
    } catch (e) {
      Alert.alert('惑星を作れませんでした', describeError(e));
    } finally {
      setBusy(false);
    }
  };

  // 同じ色・同じ種類・同じ画風のまま、模様だけ変えて作り直す。前の候補は使わないので消す
  const remake = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await createPlanetCandidates(draft.palette, draft.traits, newPlanetSeed(), showProgress);
      deleteCachedFiles(
        draft.candidates.map((c) => c.imageUri).filter((uri) => uri !== draft.savedImageUri),
      );
    } catch (e) {
      // 作り直せなかったときは、前の候補に戻す(前の候補の画像はまだ消していない)
      setDraft(draft);
      Alert.alert('惑星を作り直せませんでした', describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const selected = draft?.candidates.find((c) => c.styleId === selectedStyleId) ?? null;

  const confirm = async () => {
    if (!draft || !selected) return;
    setBusy(true);
    try {
      await onComplete({
        planetImageUri: selected.imageUri,
        palette: draft.palette,
        sourcePhotoUri: draft.sourcePhotoUri,
      });
      // 選ばなかった候補は使わないので消し、画面には選んだ1つだけを残す
      deleteCachedFiles(draft.candidates.filter((c) => c !== selected).map((c) => c.imageUri));
      setDraft({ ...draft, candidates: [selected], savedImageUri: selected.imageUri });
    } catch (e) {
      Alert.alert('惑星を保存できませんでした', describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      {draft && (
        <>
          <View style={styles.palette}>
            {draft.palette.map((color, i) => (
              <View key={`${color}-${i}`} style={[styles.swatch, { backgroundColor: color }]} />
            ))}
          </View>
          <Text style={styles.traits}>{describePlanetTraits(draft.traits)}</Text>
          <View style={styles.grid}>
            {PLANET_STYLES.map((style) => {
              const candidate = draft.candidates.find((c) => c.styleId === style.id);
              if (!candidate) {
                // まだ描いている候補の枠(作っている間だけ出す)
                return busy ? (
                  <View key={style.id} style={styles.candidate}>
                    <View style={[styles.candidateImage, styles.candidatePending]}>
                      <ActivityIndicator />
                    </View>
                    <Text style={styles.candidateLabel}>{style.label}</Text>
                  </View>
                ) : null;
              }
              const isSelected = candidate.styleId === selectedStyleId;
              return (
                <Pressable
                  key={candidate.styleId}
                  onPress={() => setSelectedStyleId(candidate.styleId)}
                  disabled={busy}
                  style={[styles.candidate, isSelected && styles.candidateSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Image source={{ uri: candidate.imageUri }} style={styles.candidateImage} />
                  <Text
                    style={[styles.candidateLabel, isSelected && styles.candidateLabelSelected]}
                  >
                    {candidate.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
      {busy ? (
        <ActivityIndicator />
      ) : (
        <>
          <Button title={draft ? '写真を選び直す' : '好きなものの写真を選ぶ'} onPress={choose} />
          {draft && <Button title="作り直す" onPress={remake} />}
          {draft && <Button title="この惑星にする" onPress={confirm} disabled={!selected} />}
        </>
      )}
    </View>
  );
}

// 衛星づくり:写真を選ぶ → Vision で被写体を切り抜く → 切り抜けなければトリミング画面で丸く切り取る
export function SatelliteCreator({ onComplete }: SatelliteCreatorProps) {
  const [busy, setBusy] = useState(false);
  /** トリミング画面に出す写真。null のときは画面を閉じている */
  const [cropPhotoUri, setCropPhotoUri] = useState<string | null>(null);

  const add = async () => {
    const uri = await pickPhoto();
    if (!uri) return;
    setBusy(true);
    try {
      let imageUri: string;
      try {
        imageUri = await cutoutSubjectWithVision(uri);
      } catch (e) {
        if (__DEV__) console.log(`[photo] トリミング画面を出す(理由:${describeError(e)})`);
        setCropPhotoUri(uri);
        return;
      }
      await onComplete({ imageUri });
    } catch (e) {
      Alert.alert('衛星を作れませんでした', describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmCrop = async (imageUri: string) => {
    await onComplete({ imageUri });
    setCropPhotoUri(null);
  };

  return (
    <>
      {busy ? <ActivityIndicator /> : <Button title="写真から衛星を追加" onPress={add} />}
      <Modal
        visible={cropPhotoUri !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCropPhotoUri(null)}
      >
        {cropPhotoUri && (
          <CircleCropper
            key={cropPhotoUri}
            photoUri={cropPhotoUri}
            message="被写体が見つからなかったので、丸く切り取る範囲を選んでください"
            onCancel={() => setCropPhotoUri(null)}
            onConfirm={confirmCrop}
          />
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 16, padding: 24 },
  palette: { flexDirection: 'row', gap: 8 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  // 候補は横1列。画面が狭いときは折り返す
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  candidate: {
    width: 108,
    alignItems: 'center',
    gap: 4,
    padding: 6,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  candidateSelected: { borderColor: '#4C7DFF', backgroundColor: '#EEF3FF' },
  candidateImage: { width: 90, height: 90 },
  candidatePending: { alignItems: 'center', justifyContent: 'center' },
  traits: { fontSize: 14, color: '#333', textAlign: 'center' },
  candidateLabel: { fontSize: 13, color: '#666' },
  candidateLabelSelected: { color: '#1F4FD8', fontWeight: '600' },
});
