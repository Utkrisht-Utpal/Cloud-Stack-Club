import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Notice } from '../types/database';

const ACTIVE_NOTICES_KEY = 'csc_active_notices_cache';
const ALL_NOTICES_KEY = 'csc_all_notices_admin_cache';

/**
 * Fetches all currently active notices for public display.
 * Uses local storage caching for immediate 0ms rendering and offline support.
 */
export async function getActiveNotices(): Promise<Notice[]> {
  const localActive = getCachedActiveNotices();

  if (!isSupabaseConfigured()) {
    return localActive;
  }

  try {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Notice fetch warning (using cached active notices):', error.message);
      return localActive;
    }

    if (data) {
      setCachedActiveNotices(data as Notice[]);
      return data as Notice[];
    }

    return localActive;
  } catch (err) {
    console.warn('Notice fetch exception (using cached active notices):', err);
    return localActive;
  }
}

/**
 * Gets the single most prominent active notice (if any).
 */
export async function getPrimaryActiveNotice(): Promise<Notice | null> {
  const notices = await getActiveNotices();
  return notices.length > 0 ? notices[0] : null;
}

/**
 * Fetches all notices (active & inactive) for admin management.
 */
export async function getAllNotices(): Promise<Notice[]> {
  const localAll = getCachedAllNotices();

  if (!isSupabaseConfigured()) {
    return localAll;
  }

  try {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Admin notices fetch warning (using cached notices):', error.message);
      return localAll;
    }

    if (data) {
      setCachedAllNotices(data as Notice[]);
      // Also update active cache
      setCachedActiveNotices((data as Notice[]).filter((n) => n.is_active));
      return data as Notice[];
    }

    return localAll;
  } catch (err) {
    console.warn('Admin notices fetch exception (using cached notices):', err);
    return localAll;
  }
}

/**
 * Creates a new notice.
 */
export async function createNotice(
  notice: Omit<Notice, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: Notice; error?: string }> {
  const newNoticeId = `notice-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const payload: Notice = {
    id: newNoticeId,
    title: notice.title.trim(),
    content: notice.content?.trim() || null,
    type: notice.type,
    link_url: notice.link_url?.trim() || null,
    link_text: notice.link_text?.trim() || null,
    is_active: notice.is_active ?? true,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // 1. Immediately persist locally
  const currentAll = getCachedAllNotices();
  currentAll.unshift(payload);
  setCachedAllNotices(currentAll);
  setCachedActiveNotices(currentAll.filter((n) => n.is_active));
  window.dispatchEvent(new CustomEvent('csc-notice-updated'));

  // 2. Persist to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('notices')
        .insert({
          title: payload.title,
          content: payload.content,
          type: payload.type,
          link_url: payload.link_url,
          link_text: payload.link_text,
          is_active: payload.is_active,
          updated_at: nowIso,
        })
        .select('*')
        .maybeSingle();

      if (error) {
        console.warn('DB notice insert warning (saved locally):', error.message);
      } else if (data) {
        const savedNotice = data as Notice;
        // Update local with actual DB id
        const updatedAll = getCachedAllNotices().map((n) =>
          n.id === newNoticeId ? savedNotice : n
        );
        setCachedAllNotices(updatedAll);
        setCachedActiveNotices(updatedAll.filter((n) => n.is_active));
        window.dispatchEvent(new CustomEvent('csc-notice-updated'));
        return { success: true, data: savedNotice };
      }
    } catch (err: any) {
      console.warn('DB notice insert exception (saved locally):', err);
    }
  }

  return { success: true, data: payload };
}

/**
 * Updates an existing notice (title, content, type, is_active, etc.).
 */
export async function updateNotice(
  id: string,
  updates: Partial<Omit<Notice, 'id' | 'created_at'>>
): Promise<{ success: boolean; data?: Notice; error?: string }> {
  const nowIso = new Date().toISOString();

  // 1. Immediately update local storage so UI changes reflect instantly
  const currentAll = getCachedAllNotices();
  const index = currentAll.findIndex((n) => n.id === id);
  let updatedNotice: Notice | null = null;

  if (index !== -1) {
    currentAll[index] = {
      ...currentAll[index],
      ...updates,
      updated_at: nowIso,
    };
    updatedNotice = currentAll[index];
    setCachedAllNotices(currentAll);
    setCachedActiveNotices(currentAll.filter((n) => n.is_active));
    window.dispatchEvent(new CustomEvent('csc-notice-updated'));
  }

  // 2. Persist update to Supabase
  if (isSupabaseConfigured()) {
    try {
      const dbPayload = {
        ...updates,
        updated_at: nowIso,
      };

      const { data, error } = await supabase
        .from('notices')
        .update(dbPayload)
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (error) {
        console.warn('DB notice update warning (updated locally):', error.message);
      } else if (data) {
        const savedNotice = data as Notice;
        if (index !== -1) {
          currentAll[index] = savedNotice;
          setCachedAllNotices(currentAll);
          setCachedActiveNotices(currentAll.filter((n) => n.is_active));
        }
        window.dispatchEvent(new CustomEvent('csc-notice-updated'));
        return { success: true, data: savedNotice };
      }
    } catch (err: any) {
      console.warn('DB notice update exception (updated locally):', err);
    }
  }

  return { success: true, data: updatedNotice || (updates as any) };
}

/**
 * Deletes a notice.
 */
export async function deleteNotice(id: string): Promise<{ success: boolean; error?: string }> {
  // 1. Immediately remove from local cache
  const currentAll = getCachedAllNotices().filter((n) => n.id !== id);
  setCachedAllNotices(currentAll);
  setCachedActiveNotices(currentAll.filter((n) => n.is_active));
  window.dispatchEvent(new CustomEvent('csc-notice-updated'));

  // 2. Delete from Supabase
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('notices').delete().eq('id', id);
      if (error) {
        console.warn('DB notice delete warning (removed locally):', error.message);
      }
    } catch (err: any) {
      console.warn('DB notice delete exception (removed locally):', err);
    }
  }

  return { success: true };
}

/**
 * Local storage caching helpers
 */
function getCachedActiveNotices(): Notice[] {
  try {
    const cached = localStorage.getItem(ACTIVE_NOTICES_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : [];
    }
    // Fallback: extract active notices from all notices cache
    const all = getCachedAllNotices();
    return all.filter((n) => n.is_active);
  } catch {
    return [];
  }
}

function setCachedActiveNotices(notices: Notice[]): void {
  try {
    localStorage.setItem(ACTIVE_NOTICES_KEY, JSON.stringify(notices));
  } catch {}
}

function getCachedAllNotices(): Notice[] {
  try {
    const cached = localStorage.getItem(ALL_NOTICES_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
}

function setCachedAllNotices(notices: Notice[]): void {
  try {
    localStorage.setItem(ALL_NOTICES_KEY, JSON.stringify(notices));
  } catch {}
}

