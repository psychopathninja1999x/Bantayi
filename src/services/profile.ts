import * as SecureStore from 'expo-secure-store';

const PROFILE_KEY = 'bantayi_profile_v1';

export interface UserProfile {
  fullName: string;
  nickname: string;
  birthday: string;
}

function normalizeProfile(input: UserProfile): UserProfile {
  return {
    fullName: input.fullName.trim(),
    nickname: input.nickname.trim(),
    birthday: input.birthday.trim(),
  };
}

export async function getProfile(): Promise<UserProfile | null> {
  const raw = await SecureStore.getItemAsync(PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    if (!parsed.fullName || !parsed.nickname || !parsed.birthday) return null;
    return normalizeProfile({
      fullName: parsed.fullName,
      nickname: parsed.nickname,
      birthday: parsed.birthday,
    });
  } catch {
    return null;
  }
}

export async function isProfileConfigured(): Promise<boolean> {
  return (await getProfile()) != null;
}

export async function saveProfile(input: UserProfile): Promise<UserProfile> {
  const profile = normalizeProfile(input);
  if (!profile.fullName) throw new Error('Full name is required.');
  if (!profile.nickname) throw new Error('Nickname is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.birthday)) {
    throw new Error('Birthday must use YYYY-MM-DD.');
  }
  await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}
