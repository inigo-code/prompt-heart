import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { IMAGE_BUCKET, imagesSupported } from '@/lib/images';
import { readWithRetries } from '@/lib/readRetry';
import { stepOut } from '@/lock/trips';
import { avatarAction, type PendingRemoval } from '@/profile/avatarSync';
import { useSync } from '@/sync/SyncProvider';
import { supabase } from '@/sync/supabase';

const STORAGE_KEY = 'promptheart/profile';
const AVATAR_SIZE = 512;

// Saved on this device. When signed in, the name, the bio and a photo "version" also live in the
// account's metadata (full_name, bio, avatar_version), and the photo itself at <user id>/avatar.jpg in storage,
// so other devices pick them up.
type LocalProfile = {
  name: string;
  /** A line or two about you, shown under your name. */
  bio: string;
  /** Photo version (a timestamp); the file is avatar-<version>.jpg. */
  avatarVersion: number | null;
  /** Account the current photo was last uploaded to or downloaded from. */
  avatarSyncedFor: string | null;
  /** Photo removed here while the account couldn't be told; finished on the next sync so it doesn't come back. */
  avatarRemoval: PendingRemoval | null;
};

const EMPTY: LocalProfile = { name: '', bio: '', avatarVersion: null, avatarSyncedFor: null, avatarRemoval: null };
export const BIO_MAX = 160;

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
  bio: string;
  /** Name to greet with: the profile name, else the part of the email before "@". */
  displayName: string;
  avatarUri: string | null;
  canChangePhoto: boolean;
  setName: (name: string) => Promise<void>;
  setBio: (bio: string) => Promise<void>;
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
    readWithRetries(() => AsyncStorage.getItem(STORAGE_KEY)).then(
      (raw) => {
        if (loaded.current) return; // cleared while this was loading
        try {
          if (raw) setProfile({ ...EMPTY, ...(JSON.parse(raw) as Partial<LocalProfile>) });
        } catch {
          // Unreadable: start empty.
        }
        loaded.current = true;
        setReady(true);
      },
      // The phone couldn't read the saved profile. Nothing is saved over it, and `ready` stays false, so the
      // account isn't matched against an empty profile (that could upload or delete a photo).
      () => {},
    );
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile)).catch(() => {});
  }, [profile]);

  const userId = user?.id ?? null;
  // null when the account has no name yet; '' when it was cleared (on any device), which is a real choice.
  const metaName = typeof user?.meta.full_name === 'string' ? user.meta.full_name : null;
  const metaBio = typeof user?.meta.bio === 'string' ? user.meta.bio : null;
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

  // Removes the photo from the account. Throws if the account couldn't be reached.
  const removeRemote = useCallback(
    async (forUser: string) => {
      if (!supabase) return;
      const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([remoteAvatar(forUser)]);
      if (error) throw error;
      await updateProfile({ avatar_version: null });
    },
    [updateProfile],
  );
  const finishing = useRef(false);

  // Reconcile with the account whenever it (or its saved profile fields) change.
  useEffect(() => {
    if (!ready || !userId || !supabase) return;
    const client = supabase;
    // Name: the account's copy wins (see `effectiveName`); if it has none yet, give it ours. A name cleared
    // on another device stays cleared.
    if (metaName === null && profile.name) updateProfile({ full_name: profile.name }).catch(() => {});
    // Bio: the same, except an empty bio on the account is a real choice (it was cleared elsewhere).
    if (metaBio === null && profile.bio) updateProfile({ bio: profile.bio }).catch(() => {});

    if (!imagesSupported) return;
    const local = profile.avatarVersion;
    const action = avatarAction({
      local,
      syncedFor: profile.avatarSyncedFor,
      removal: profile.avatarRemoval,
      userId,
      meta: metaAvatar,
      metaHasKey: metaHasAvatarKey,
    });
    if (action === 'download' && metaAvatar) {
      // Newer photo on the account (set on another device): download it.
      (async () => {
        const { data } = await client.storage.from(IMAGE_BUCKET).createSignedUrl(remoteAvatar(userId), 60);
        if (!data?.signedUrl) return;
        await File.downloadFileAsync(data.signedUrl, avatarFile(metaAvatar));
        deleteAvatarFiles(metaAvatar);
        setProfile((p) => ({ ...p, avatarVersion: metaAvatar, avatarSyncedFor: userId, avatarRemoval: null }));
      })().catch(() => {});
    } else if (action === 'upload' && local) {
      // Photo picked while signed out or offline: upload it.
      Promise.resolve()
        .then(() => uploadAvatar(local, userId))
        .catch(() => {});
    } else if (action === 'removedElsewhere') {
      // Removed on another device. (Async, like the branches above: this reacts to an outside change.)
      Promise.resolve().then(() => {
        deleteAvatarFiles();
        setProfile((p) => ({ ...p, avatarVersion: null, avatarSyncedFor: null }));
      });
    } else if (action === 'finishRemoval' && !finishing.current) {
      // Removed here while offline: tell the account now, so the photo doesn't download again.
      finishing.current = true;
      removeRemote(userId)
        .then(() => setProfile((p) => ({ ...p, avatarRemoval: null })))
        .catch(() => {})
        .finally(() => {
          finishing.current = false;
        });
    } else if (action === 'dropRemoval') {
      Promise.resolve().then(() => setProfile((p) => ({ ...p, avatarRemoval: null })));
    }
  }, [ready, userId, metaName, metaBio, profile.bio, metaAvatar, metaHasAvatarKey, profile.name, profile.avatarVersion, profile.avatarSyncedFor, profile.avatarRemoval, updateProfile, uploadAvatar, removeRemote]);

  const setName = useCallback(
    async (name: string) => {
      const next = name.trim();
      setProfile((p) => ({ ...p, name: next }));
      if (userId) await updateProfile({ full_name: next });
    },
    [userId, updateProfile],
  );

  const setBio = useCallback(
    async (bio: string) => {
      const next = bio.trim().slice(0, BIO_MAX);
      setProfile((p) => ({ ...p, bio: next }));
      if (userId) await updateProfile({ bio: next });
    },
    [userId, updateProfile],
  );

  const pickAvatar = useCallback(async () => {
    const result = await stepOut(() => ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 }));
    if (result.canceled || !result.assets?.[0]) return false;
    const ctx = ImageManipulator.manipulate(result.assets[0].uri).resize({ width: AVATAR_SIZE, height: AVATAR_SIZE });
    const saved = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
    const version = Date.now();
    await new File(saved.uri).copy(avatarFile(version));
    deleteAvatarFiles(version);
    setProfile((p) => ({ ...p, avatarVersion: version, avatarSyncedFor: null, avatarRemoval: null }));
    // Without a connection the new photo still shows here, and uploads the next time the app syncs the profile.
    if (userId) await uploadAvatar(version, userId).catch(() => {});
    return true;
  }, [userId, uploadAvatar]);

  const removeAvatar = useCallback(async () => {
    deleteAvatarFiles();
    // Remembered until the account hears about it: without a connection the photo is gone here at once, and the
    // next sync removes it from the account (rather than downloading it again).
    const removal = userId ? { at: Date.now(), for: userId } : null;
    setProfile((p) => ({ ...p, avatarVersion: null, avatarSyncedFor: null, avatarRemoval: removal }));
    if (!userId) return;
    finishing.current = true; // so the sync effect doesn't send the same removal again meanwhile
    try {
      await removeRemote(userId);
      setProfile((p) => (p.avatarRemoval === removal ? { ...p, avatarRemoval: null } : p));
    } catch {
      // Offline: finished on the next sync.
    } finally {
      finishing.current = false;
    }
  }, [userId, removeRemote]);

  // Clearing saves the empty profile even if the saved one couldn't be read, since removing it is the point.
  const clear = useCallback(() => {
    deleteAvatarFiles();
    loaded.current = true;
    setReady(true);
    setProfile({ ...EMPTY });
  }, []);

  const email = user?.email ?? null;
  // Signed in, the account's name wins, so a rename on another device shows up here.
  const effectiveName = userId && metaName !== null ? metaName : profile.name;
  const effectiveBio = userId && metaBio !== null ? metaBio : profile.bio;

  const value = useMemo<ProfileContext>(() => {
    const avatarUri = imagesSupported && profile.avatarVersion && avatarFile(profile.avatarVersion).exists ? avatarFile(profile.avatarVersion).uri : null;
    const fromEmail = email ? email.split('@')[0] : '';
    const pretty = fromEmail ? fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1).split(/[._+-]/)[0] : '';
    return {
      name: effectiveName,
      bio: effectiveBio,
      displayName: effectiveName || pretty,
      avatarUri,
      canChangePhoto: imagesSupported,
      setName,
      setBio,
      pickAvatar,
      removeAvatar,
      clear,
    };
  }, [profile.avatarVersion, effectiveName, effectiveBio, email, setName, setBio, pickAvatar, removeAvatar, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
