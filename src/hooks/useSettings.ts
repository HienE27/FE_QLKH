// src/hooks/useSettings.ts
import { useState, useEffect, useCallback } from 'react';
import { getSettingByKey, getSettings } from '@/services/settings.service';
import type { Setting } from '@/types/setting';

// Cache để tránh gọi API nhiều lần
const settingsCache = new Map<string, { value: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

/**
 * Hook để lấy một setting theo key
 * Tự động cache và refresh khi cần
 */
export function useSetting(key: string, defaultValue: string = '') {
  const [value, setValue] = useState<string>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra cache trước
    const cached = settingsCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setValue(cached.value);
      setLoading(false);
      return;
    }

    // Load từ API
    getSettingByKey(key)
      .then((setting) => {
        const settingValue = setting.value || defaultValue;
        setValue(settingValue);
        settingsCache.set(key, { value: settingValue, timestamp: Date.now() });
      })
      .catch(() => {
        // Nếu không tìm thấy, dùng default value
        setValue(defaultValue);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key, defaultValue]);

  // Function để refresh setting
  const refresh = useCallback(() => {
    settingsCache.delete(key);
    setLoading(true);
    getSettingByKey(key)
      .then((setting) => {
        const settingValue = setting.value || defaultValue;
        setValue(settingValue);
        settingsCache.set(key, { value: settingValue, timestamp: Date.now() });
      })
      .catch(() => {
        setValue(defaultValue);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [key, defaultValue]);

  return { value, loading, refresh };
}

/**
 * Hook để lấy nhiều settings cùng lúc
 */
export function useSettings(keys: string[]) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const allSettings = await getSettings();
        const result: Record<string, string> = {};
        
        keys.forEach((key) => {
          const setting = allSettings.find((s) => s.settingKey === key);
          result[key] = setting?.value || '';
          settingsCache.set(key, { 
            value: setting?.value || '', 
            timestamp: Date.now() 
          });
        });
        
        setSettings(result);
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [keys.join(',')]);

  return { settings, loading };
}

/**
 * Clear cache - dùng khi update settings
 */
export function clearSettingsCache() {
  settingsCache.clear();
}

