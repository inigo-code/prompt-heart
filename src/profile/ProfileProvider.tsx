import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { IMAGE_BUCKET, imagesSupported } from '@/lib/images';
import { useSync } from '@/sync/SyncProvider';
import { supabase } from '@/sync/supabase';

const STORAGE_KEY = 'promptheart/profile';
const AVATAR_SIZE = 512;

// Saved on this device. When signed in, the name and a photo "version" also live in the account's
// metadata (full_name, avatar_version), and the photo itself at <user id>/avatar.jpg in storage,
// so other devices pick them up.
type LocalProfile = {
  name: string;
  /** Photo version (a timestamp); the file is avatar-<version>.jpg. */
  avatarVersion: number | null;
  /** Account the current photo was last uploaded to or downloaded from. */
  avatarSyncedFor: string | null;
};

const EMPTY: LocalProfile = { name: '', avatarVersion: null, avatarSyncedFor: null };

function profileDir() {
  const dir = new Directory(Paths.document, 'profile');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}
const avatarFile = (version: number) => new File(profileDir(), `avatar-${version}.jpg`);
const remoteAvatar = (userId: string) => `${userId}/avatar.jpg`;

function deleteAvatarFiles(except?: number) {
  if (!imagesSupported) return;
  for (const item of profileDir().list()) {
    if (item instanceof File && item.name.startsWith('avatar-') && item.name !== `avatar-${except}.jpg`) item.delete();
  }
}

type ProfileContext = {
  name: string;
  /** Name to greet with: the profile name, else the part of the email before "@". */
  displayName: string;
  avatarUri: string | null;
  canChangePhoto: boolean;
  setName: (name: string) => Promise<void>;
  /** Opens the photo library with a square crop; resolves false if cancelled. */
  pickAvatar: () => Promise<boolean>;
  removeAvatar: () => Promise<void>;
  /** Clears the profile on this device (after deleting the account). */
  clear: () => void;
};

const Ctx = createContext<ProfileContext | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, updateProfile } = useSync();
  const [profile, setProfile] = useState<LocalProfile>(EMPTY);
  const loaded = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => raw && setProfile({ ...EMPTY, ...(JSON.parse(raw) as Partial<LocalProfile>) }))
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch(() => {});
  }, [profile]);

  const userId = user?.id ?? null;
  const metaName = typeof user?.meta.full_name === 'string' ? user.meta.full_name : '';
  const metaAvatar = typeof user?.meta.avatar_version === 'number' ? user.meta.avatar_version : null;
  const metaHasAvatarKey = !!user && 'avatar_version' in user.meta;

  const uploadAvatar = useCallback(
    async (version: number, forUser: string) => {
      if (!supabase) return;
      const { error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(remoteAvatar(forUser), await avatarFile(version).arrayBuffer(), { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      await updateProfile({ avatar_version: version });
      setProfile((p) => (p.avatarVersion === version ? { ...p, avatarSyncedFor: forUser } : p));
    },
    [updateProfile],
  );

  // Reconcile with the account whenever it (or its saved profile fields) change.
  useEffect(() => {
    if (!ready || !userId || !supabase) return;
    const client = supabase;
    // Name: the account's copy wins (see `effectiveName`); if it has none yet, give it ours.
    if (!metaName && profile.name) updateProfile({ full_name: profile.name }).catch(() => {});

    if (!imagesSupported) return;
    const local = profile.avatarVersion;
    if (metaAvatar && metaAvatar !== local && (!local || metaAvatar > local || profile.avatarSyncedFor === userId)) {
      // Newer photo on the account (set on another device): download it.
      (async () => {
        const { data } = await client.storage.from(IMAGE_BUCKET).createSignedUrl(remoteAvatar(userId), 60);
        if (!data?.signedUrl) return;
        await File.downloadFileAsync(data.signedUrl, avatarFile(metaAvatar));
        deleteAvatarFiles(metaAvatar);
        setProfile((p) => ({ ...p, avatarVersion: metaAvatar, avatarSyncedFor: userId }));
      })().catch(() => {});
    } else if (local && (!metaAvatar || local > metaAvatar) && profile.avatarSyncedFor !== userId) {
      // Photo picked while signed out or offline: upload it.
      Promise.resolve()
        .then(() => uploadAvatar(local, userId))
        .catch(() => {});
    } else if (!metaAvatar && metaHasAvatarKey && local && profile.avatarSyncedFor === userId) {
      // Removed on another device. (Async, like the branches above: this reacts to an outside change.)
      Promise.resolve().then(() => {
        deleteAvatarFiles();
        setProfile((p) => ({ ...p, avatarVersion: null, avatarSyncedFor: null }));
      });
    }
  }, [ready, userId, metaName, metaAvatar, metaHasAvatarKey, profile.name, profile.avatarVersion, profile.avatarSyncedFor, updateProfile, uploadAvatar]);

  const setName = useCallback(
    async (name: string) => {
      const next = name.trim();
      setProfile((p) => ({ ...p, name: next }));
      if (userId) await updateProfile({ full_name: next });
    },
    [userId, updateProfile],
  );

  const pickAvatar = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
    if (result.canceled || !result.assets?.[0]) return false;
    const ctx = ImageManipulator.manipulate(result.assets[0].uri).resize({ width: AVATAR_SIZE, height: AVATAR_SIZE });
    const saved = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
    const version = Date.now();
    await new File(saved.uri).copy(avatarFile(version));
    deleteAvatarFiles(version);
    setProfile((p) => ({ ...p, avatarVersion: version, avatarSyncedFor: null }));
    if (userId) await uploadAvatar(version, userId);
    return true;
  }, [userId, uploadAvatar]);

  const removeAvatar = useCallback(async () => {
    deleteAvatarFiles();
    setProfile((p) => ({ ...p, avatarVersion: null, avatarSyncedFor: null }));
    if (userId && supabase) {
      await supabase.storage.from(IMAGE_BUCKET).remove([remoteAvatar(userId)]);
      await updateProfile({ avatar_version: null });
    }
  }, [userId, updateProfile]);

  const clear = useCallback(() => {
    deleteAvatarFiles();
    setProfile(EMPTY);
  }, []);

  const email = user?.email ?? null;
  // Signed in, the account's name wins, so a rename on another device shows up here.
  const effectiveName = userId && metaName ? metaName : profile.name;

  const value = useMemo<ProfileContext>(() => {
    const avatarUri = imagesSupported && profile.avatarVersion && avatarFile(profile.avatarVersion).exists ? avatarFile(profile.avatarVersion).uri : null;
    const fromEmail = email ? email.split('@')[0] : '';
    const pretty = fromEmail ? fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1).split(/[._+-]/)[0] : '';
    return {
      name: effectiveName,
      displayName: effectiveName || pretty,
      avatarUri,
      canChangePhoto: imagesSupported,
      setName,
      pickAvatar,
      removeAvatar,
      clear,
    };
  }, [profile.avatarVersion, effectiveName, email, setName, pickAvatar, removeAvatar, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
