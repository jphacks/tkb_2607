// プロフィールの選択肢(年代・性別)と、画面に出すときの言葉。
// 値は DB(profiles.age_group / profiles.gender)の check 制約とそろえる。
import type { AgeGroup, Gender } from '@/types/domain';

export const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
  { value: '10s', label: '10代' },
  { value: '20s', label: '20代' },
  { value: '30s', label: '30代' },
  { value: '40s', label: '40代' },
  { value: '50s_plus', label: '50代以上' },
];

export const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'unspecified', label: '登録しない' },
];

/** ひとことの最大文字数(DB の check 制約と同じ) */
export const BIO_MAX_LENGTH = 100;

export const ageGroupLabel = (value: AgeGroup | null) =>
  AGE_GROUPS.find((a) => a.value === value)?.label ?? null;

/** 「登録しない」を選んだ人と未入力の人は、表示しない(null) */
export const genderLabel = (value: Gender | null) =>
  value === 'unspecified' ? null : (GENDERS.find((g) => g.value === value)?.label ?? null);
