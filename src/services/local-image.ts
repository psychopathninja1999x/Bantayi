import * as ImagePicker from 'expo-image-picker';
import { copyAsync, documentDirectory } from 'expo-file-system/legacy';

function extFromMime(mime: string | undefined): string {
  if (!mime) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

export async function pickLocalImage(prefix: string): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Allow photo library access to attach an image.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
  });
  const asset = result.canceled ? null : result.assets?.[0] ?? null;
  if (!asset) return null;

  const base = documentDirectory;
  if (!base) {
    throw new Error('This device could not create a permanent app folder.');
  }

  const ext = extFromMime(asset.mimeType ?? undefined);
  const dest = `${base}${prefix}_${Date.now()}.${ext}`;
  await copyAsync({ from: asset.uri, to: dest });
  return dest;
}
