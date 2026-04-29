import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'fav_apps_';

function key(deviceId: string): string {
  return KEY_PREFIX + deviceId;
}

export async function loadFavorites(deviceId: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(key(deviceId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

async function saveFavorites(deviceId: string, favs: Set<string>): Promise<void> {
  await AsyncStorage.setItem(key(deviceId), JSON.stringify(Array.from(favs)));
}

export async function toggleFavorite(deviceId: string, appId: string): Promise<Set<string>> {
  const favs = await loadFavorites(deviceId);
  if (favs.has(appId)) favs.delete(appId);
  else                 favs.add(appId);
  await saveFavorites(deviceId, favs);
  return favs;
}
