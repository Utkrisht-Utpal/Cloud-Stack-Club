import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Testimonial } from '../types/database';

const ACTIVE_TESTIMONIALS_KEY = 'csc_active_testimonials_cache';

/**
 * Helper to retrieve locally cached testimonials for 0ms initial render.
 */
function getCachedTestimonials(): Testimonial[] {
  try {
    const cached = localStorage.getItem(ACTIVE_TESTIMONIALS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Helper to update locally cached testimonials.
 */
function setCachedTestimonials(testimonials: Testimonial[]): void {
  try {
    localStorage.setItem(ACTIVE_TESTIMONIALS_KEY, JSON.stringify(testimonials));
  } catch {}
}

/**
 * Fetches all active testimonials ordered by display_order then created_at.
 * Uses local storage caching for immediate 0ms rendering and offline fallback.
 */
export async function getTestimonials(): Promise<Testimonial[]> {
  const localList = getCachedTestimonials();

  if (!isSupabaseConfigured()) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Testimonial fetch warning (using cached testimonials):', error.message);
      return localList;
    }

    if (data && data.length > 0) {
      const list = data as Testimonial[];
      setCachedTestimonials(list);
      return list;
    }

    return localList;
  } catch (err) {
    console.warn('Testimonial fetch exception (using cached testimonials):', err);
    return localList;
  }
}

/**
 * Creates a new testimonial.
 */
export async function createTestimonial(
  testimonial: {
    testimonial_description: string;
    event_name: string;
    event_id?: string | null;
    author_name: string;
    display_order?: number;
    is_active?: boolean;
  }
): Promise<{ success: boolean; data?: Testimonial; error?: string }> {
  const newId = `testimonial-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const payload: Testimonial = {
    id: newId,
    testimonial_description: testimonial.testimonial_description.trim(),
    event_name: testimonial.event_name.trim(),
    event_id: testimonial.event_id || null,
    author_name: testimonial.author_name.trim(),
    display_order: testimonial.display_order ?? 0,
    is_active: testimonial.is_active ?? true,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // 1. Immediately persist to local cache for instant UI feedback
  const currentList = getCachedTestimonials();
  const updatedList = [payload, ...currentList];
  setCachedTestimonials(updatedList);
  window.dispatchEvent(new CustomEvent('csc-testimonials-updated'));

  // 2. Persist to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .insert({
          testimonial_description: payload.testimonial_description,
          event_name: payload.event_name,
          event_id: payload.event_id,
          author_name: payload.author_name,
          display_order: payload.display_order,
          is_active: payload.is_active,
          updated_at: nowIso,
        })
        .select('*')
        .maybeSingle();

      if (error) {
        console.warn('DB testimonial insert warning (saved locally):', error.message);
        return { success: true, data: payload };
      }

      if (data) {
        const saved = data as Testimonial;
        const finalizedList = getCachedTestimonials().map((t) =>
          t.id === newId ? saved : t
        );
        setCachedTestimonials(finalizedList);
        window.dispatchEvent(new CustomEvent('csc-testimonials-updated'));
        return { success: true, data: saved };
      }
    } catch (err: any) {
      console.warn('DB testimonial insert exception (saved locally):', err);
    }
  }

  return { success: true, data: payload };
}

/**
 * Deletes a testimonial by id.
 */
export async function deleteTestimonial(id: string): Promise<{ success: boolean; error?: string }> {
  // 1. Immediately remove from local cache
  const currentList = getCachedTestimonials().filter((t) => t.id !== id);
  setCachedTestimonials(currentList);
  window.dispatchEvent(new CustomEvent('csc-testimonials-updated'));

  // 2. Delete from Supabase
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) {
        console.warn('DB testimonial delete warning (removed locally):', error.message);
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      console.warn('DB testimonial delete exception (removed locally):', err);
      return { success: false, error: err?.message || 'Failed to delete' };
    }
  }

  return { success: true };
}
