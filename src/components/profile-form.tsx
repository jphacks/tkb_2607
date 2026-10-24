// プロフィールの入力欄(初回設定とプロフィール画面で共用)。Figma: プロフィール登録
// 所属団体は引力の計算(組織のマッチング)に使う。生年月日の代わりに年代を選ぶ
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useMyProfile, useTagSearch, useUpdateMyProfile } from '@/data';
import { AGE_GROUPS, BIO_MAX_LENGTH, GENDERS } from '@/lib/profile-options';
import { color, ja, radius, typography } from '@/theme/tokens';
import type { AgeGroup, Gender } from '@/types/domain';

import { PillButton, TagChip } from './pill';
import { ErrorText } from './ui';

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
  const [organization, setOrganization] = useState(profile?.organization ?? '');
  const [tags, setTags] = useState<string[]>(profile?.tags.map((t) => t.name) ?? []);
  const [tagInput, setTagInput] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(profile?.ageGroup ?? null);
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const { data: suggestions } = useTagSearch(tagInput);

  const addTag = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !tags.includes(trimmed)) setTags([...tags, trimmed]);
    setTagInput('');
  };

  const save = () => {
    update.mutate(
      {
        nickname: nickname.trim(),
        realName: realName.trim() || null,
        organization: organization.trim() || null,
        tagNames: tags,
        ageGroup,
        gender,
        bio: bio.trim(),
      },
      { onSuccess: onSaved },
    );
  };

  const newSuggestions = (suggestions ?? []).filter((s) => !tags.includes(s.name));

  return (
    <View style={styles.container}>
      <Section label="本名" note="(自分にしか見えません)">
        <Input value={realName} onChangeText={setRealName} placeholder="山田 太郎" />
      </Section>
      <Section label="ニックネーム" note="(みんなに表示されます)">
        <Input value={nickname} onChangeText={setNickname} placeholder="Koyu" />
      </Section>
      <Section label="タグ" note="(興味・サークル名など)">
        <Input
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={() => addTag(tagInput)}
          placeholder="入力して改行で追加"
          returnKeyType="done"
          submitBehavior="submit"
        />
        {newSuggestions.length > 0 && (
          <View style={styles.chips}>
            {newSuggestions.map((s) => (
              <TagChip key={s.id} name={`+ ${s.name}`} onPress={() => addTag(s.name)} />
            ))}
          </View>
        )}
        {tags.length > 0 && (
          <View style={styles.chips}>
            {tags.map((tag) => (
              <TagChip
                key={tag}
                name={`${tag}  ×`}
                onPress={() => setTags(tags.filter((t) => t !== tag))}
              />
            ))}
          </View>
        )}
      </Section>
      <Section label="所属団体" note="(大学名・会社名など。正式名称で)">
        <Input value={organization} onChangeText={setOrganization} placeholder="例:〇〇大学" />
      </Section>
      <Section label="年代">
        <Radios options={AGE_GROUPS} value={ageGroup} onChange={setAgeGroup} />
      </Section>
      <Section label="性別">
        <Radios options={GENDERS} value={gender} onChange={setGender} />
      </Section>
      <Section label="ひとこと" note={`(${BIO_MAX_LENGTH}文字まで)`}>
        <Input
          value={bio}
          onChangeText={setBio}
          maxLength={BIO_MAX_LENGTH}
          multiline
          placeholder="好きなものや、話しかけてほしいこと"
          style={styles.textarea}
        />
      </Section>
      <ErrorText error={update.error} />
      <PillButton
        title={submitLabel}
        onPress={save}
        disabled={nickname.trim() === ''}
        loading={update.isPending}
        style={styles.submit}
      />
    </View>
  );
}

function Section({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {note && <Text style={styles.note}>{note}</Text>}
      </View>
      {children}
    </View>
  );
}

function Input({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor={color.text.disabled}
      autoCapitalize="none"
      {...props}
    />
  );
}

/** 丸いラジオボタン。選んでいるものをもう一度押すと選択を外す */
function Radios<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <View style={styles.radios}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(selected ? null : option.value)}
            style={styles.radio}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            hitSlop={4}
          >
            <View style={styles.radioOuter}>
              <View style={[styles.radioInner, selected && styles.radioInnerSelected]} />
            </View>
            <Text style={styles.radioLabel}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18 },
  section: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  label: {
    ...ja({ ...typography.bodyLead, fontFamily: typography.titleScreen.fontFamily }),
    color: color.text.primary,
  },
  note: { ...ja(typography.captionCard), color: color.text.tertiary },
  input: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: color.bg.surface,
    borderWidth: 0.6,
    borderColor: color.border.neutral,
    ...ja(typography.numericCount),
    color: color.text.strong,
  },
  textarea: { height: 96, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  radios: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 10 },
  radio: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.text.disabled,
    backgroundColor: color.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 16, height: 16, borderRadius: radius.full, backgroundColor: '#E9E9E9' },
  radioInnerSelected: { backgroundColor: color.bg.primary },
  radioLabel: { ...ja(typography.numericCount), color: color.text.primary },
  submit: { alignSelf: 'center', width: 163, height: 45, marginTop: 4 },
});
