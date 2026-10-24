import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMyProfile, useTagSearch, useUpdateMyProfile } from '@/data';

import { ErrorText, Field, PrimaryButton } from './ui';

/** ニックネーム・本名・タグの編集。初回設定とプロフィール画面で共用する */
export function ProfileForm({
  submitLabel,
  onSaved,
}: {
  submitLabel: string;
  onSaved?: () => void;
}) {
  const { data: profile } = useMyProfile();
  const update = useUpdateMyProfile();
  const [nickname, setNickname] = useState(profile?.nickname ?? '');
  const [realName, setRealName] = useState(profile?.realName ?? '');
  const [tags, setTags] = useState<string[]>(profile?.tags.map((t) => t.name) ?? []);
  const [tagInput, setTagInput] = useState('');
  const { data: suggestions } = useTagSearch(tagInput);

  const addTag = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !tags.includes(trimmed)) setTags([...tags, trimmed]);
    setTagInput('');
  };

  const save = () => {
    update.mutate(
      { nickname: nickname.trim(), realName: realName.trim() || null, tagNames: tags },
      { onSuccess: onSaved },
    );
  };

  return (
    <View style={styles.container}>
      <Field
        label="ニックネーム(みんなに表示されます)"
        value={nickname}
        onChangeText={setNickname}
      />
      <Field label="本名(自分にしか見えません)" value={realName} onChangeText={setRealName} />
      <Field
        label="タグ(大学名・サークル名・職場など)"
        value={tagInput}
        onChangeText={setTagInput}
        onSubmitEditing={() => addTag(tagInput)}
        placeholder="入力して改行で追加"
        returnKeyType="done"
      />
      {suggestions && suggestions.length > 0 && (
        <View style={styles.chips}>
          {suggestions
            .filter((s) => !tags.includes(s.name))
            .map((s) => (
              <Pressable key={s.id} onPress={() => addTag(s.name)} style={styles.suggestion}>
                <Text>+ {s.name}</Text>
              </Pressable>
            ))}
        </View>
      )}
      <View style={styles.chips}>
        {tags.map((tag) => (
          <Pressable
            key={tag}
            onPress={() => setTags(tags.filter((t) => t !== tag))}
            style={styles.chip}
          >
            <Text style={styles.chipText}>{tag} ×</Text>
          </Pressable>
        ))}
      </View>
      <ErrorText error={update.error} />
      <PrimaryButton
        title={submitLabel}
        onPress={save}
        disabled={nickname.trim() === ''}
        loading={update.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#2E3A87', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: '#fff' },
  suggestion: {
    borderWidth: 1,
    borderColor: '#2E3A87',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
