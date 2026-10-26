import type { SupabaseClient } from '@supabase/supabase-js';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { newId } from '@/store/PromptStore';

// Attachments are stored on the device as <id>.jpg in the app's documents folder,
// and in the private "prompt-images" bucket as <user id>/<id>.jpg.
export const IMAGE_BUCKET = 'prompt-images';
// Sized for phone screens; about 120–200 KB each, which keeps cloud storage and downloads small.
const MAX_WIDTH = 1280;
const JPEG_QUALITY = 0.72;

/** Attachments need the native file system; the web build only shows that images exist. */
export const imagesSupported = Platform.OS !== 'web';

function imagesDir() {
  const dir = new Directory(Paths.document, 'images');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export const imageFile = (id: string) => new File(imagesDir(), `${id}.jpg`);
export const remotePath = (userId: string, id: string) => `${userId}/${id}.jpg`;

/** Local file uri for an image, or null if it hasn't been downloaded to this device yet. */
export function localImageUri(id: string): string | null {
  if (!imagesSupported) return null;
  const f = imageFile(id);
  return f.exists ? f.uri : null;
}

/** Copies any picked/shared image into the images folder as a resized JPEG; returns its new id. */
export async function saveImage(sourceUri: string): Promise<string> {
  const id = newId();
  const probe = await ImageManipulator.manipulate(sourceUri).renderAsync();
  const ctx = ImageManipulator.manipulate(sourceUri);
  if (probe.width > MAX_WIDTH) ctx.resize({ width: MAX_WIDTH });
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  await new File(saved.uri).copy(imageFile(id));
  return id;
}

/** Opens the photo library; returns ids of the saved copies (empty if cancelled). */
export async function pickImages(limit = 6): Promise<string[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 1,
  });
  if (result.canceled || !result.assets) return [];
  const ids: string[] = [];
  for (const asset of result.assets) ids.push(await saveImage(asset.uri));
  return ids;
}

export function deleteLocalImage(id: string) {
  if (!imagesSupported) return;
  const f = imageFile(id);
  if (f.exists) f.delete();
}

export async function imageBase64(id: string): Promise<string | null> {
  const f = imageFile(id);
  return f.exists ? f.base64() : null;
}

export async function writeImageBase64(id: string, base64: string) {
  const f = imageFile(id);
  if (!f.exists) f.create();
  await f.write(base64, { encoding: 'base64' });
}

// ---- Cloud storage (used by the sync engine) ----

export async function uploadImage(client: SupabaseClient, userId: string, id: string): Promise<'done' | 'missing'> {
  const f = imageFile(id);
  if (!f.exists) return 'missing';
  const { error } = await client.storage
    .from(IMAGE_BUCKET)
    .upload(remotePath(userId, id), await f.arrayBuffer(), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return 'done';
}

export async function deleteRemoteImages(client: SupabaseClient, userId: string, ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await client.storage.from(IMAGE_BUCKET).remove(ids.map((id) => remotePath(userId, id)));
  if (error) throw error;
}

/** Downloads images this device doesn't have yet. Missing remote files are skipped, not errors. */
export async function downloadMissingImages(
  client: SupabaseClient,
  userId: string,
  ids: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const missing = ids.filter((id) => !imageFile(id).exists);
  let downloaded = 0;
  for (const [i, id] of missing.entries()) {
    onProgress?.(i, missing.length);
    const { data, error } = await client.storage.from(IMAGE_BUCKET).createSignedUrl(remotePath(userId, id), 60);
    if (error || !data?.signedUrl) continue;
    try {
      await File.downloadFileAsync(data.signedUrl, imageFile(id));
      downloaded++;
    } catch {
      // The upload may not have finished on the other device yet; the next sync retries.
    }
  }
  if (missing.length) onProgress?.(missing.length, missing.length);
  return downloaded;
}
