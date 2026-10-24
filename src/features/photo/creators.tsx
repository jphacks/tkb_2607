// 【仮実装】土台が動作確認のために置いたもの。写真担当が中身を作り替える。
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Button, Modal, StyleSheet, View } from 'react-native';

import type { PlanetCreatorProps, SatelliteCreatorProps } from './contract';
import { CircleCropper } from './cropper';
import { cutoutSubjectWithVision, describeError, generatePlanet } from './processing';

async function pickPhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  });
  return result.canceled ? null : result.assets[0].uri;
}

export function PlanetCreator({ onComplete }: PlanetCreatorProps) {
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{
    imageUri: string;
    palette: string[];
    sourcePhotoUri: string;
  } | null>(null);

  const choose = async () => {
    const uri = await pickPhoto();
    if (!uri) return;
    setBusy(true);
    try {
      const planet = await generatePlanet(uri);
      setDraft({ ...planet, sourcePhotoUri: uri });
    } catch (e) {
      Alert.alert('惑星を作れませんでした', String(e));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await onComplete({
        planetImageUri: draft.imageUri,
        palette: draft.palette,
        sourcePhotoUri: draft.sourcePhotoUri,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      {draft && (
        <>
          <Image source={{ uri: draft.imageUri }} style={styles.preview} contentFit="cover" />
          <View style={styles.palette}>
            {draft.palette.map((color) => (
              <View key={color} style={[styles.swatch, { backgroundColor: color }]} />
            ))}
          </View>
        </>
      )}
      {busy ? (
        <ActivityIndicator />
      ) : (
        <>
          <Button title={draft ? '写真を選び直す' : '好きなものの写真を選ぶ'} onPress={choose} />
          {draft && <Button title="この惑星にする" onPress={confirm} />}
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
  preview: { width: 200, height: 200, borderRadius: 100 },
  palette: { flexDirection: 'row', gap: 8 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
});
