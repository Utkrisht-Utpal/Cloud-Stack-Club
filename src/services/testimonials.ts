import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Testimonial } from '../types/database';

const ACTIVE_TESTIMONIALS_KEY = 'csc_active_testimonials_cache';

/**
 * Helper to retrieve locally cached testimonials for 0ms initial render.
 * Always returns sorted by display_order ascending.
 */
function getCachedTestimonials(): Testimonial[] {
  try {
    const cached = localStorage.getItem(ACTIVE_TESTIMONIALS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      }
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Helper to update locally cached testimonials.
 * Guarantees that saved items are strictly sorted by display_order ascending.
 */
function setCachedTestimonials(testimonials: Testimonial[]): void {
  try {
    const sorted = [...testimonials].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    localStorage.setItem(ACTIVE_TESTIMONIALS_KEY, JSON.stringify(sorted));
  } catch {}
}

/**
 * Fetches all active testimonials strictly ordered by display_order ascending.
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
      const list = (data as Testimonial[]).sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
      );
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
 * Validates display_order uniqueness so no two testimonials share the same order.
 * Ensures the preview list and cache update immediately.
 */
export async function createTestimonial(
  testimonial: {
    testimonial_description: string;
    event_name: string;
    event_id?: string | null;
    author_name: string;
    author_position?: string | null;
    display_order?: number;
    is_active?: boolean;
  }
): Promise<{ success: boolean; data?: Testimonial; error?: string }> {
  const currentList = getCachedTestimonials();
  const orderNum = typeof testimonial.display_order === 'number' ? testimonial.display_order : 1;

  // 1. Guard against duplicate display_order
  const duplicate = currentList.find((t) => t.display_order === orderNum);
  if (duplicate) {
    return {
      success: false,
      error: `Order #${orderNum} is already assigned to "${duplicate.author_name}" (${duplicate.event_name}). Each testimonial must have a unique order number.`,
    };
  }

  const newId = `testimonial-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const payload: Testimonial = {
    id: newId,
    testimonial_description: testimonial.testimonial_description.trim(),
    event_name: testimonial.event_name.trim(),
    event_id: testimonial.event_id || null,
    author_name: testimonial.author_name.trim(),
    author_position: testimonial.author_position?.trim() || null,
    display_order: orderNum,
    is_active: testimonial.is_active ?? true,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // 2. Persist to Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('testimonials')
        .insert({
          testimonial_description: payload.testimonial_description,
          event_name: payload.event_name,
          event_id: payload.event_id,
          author_name: payload.author_name,
          author_position: payload.author_position,
          display_order: payload.display_order,
          is_active: payload.is_active,
          updated_at: nowIso,
        })
        .select('*')
        .maybeSingle();

      if (error) {
        if (error.message?.includes('unique') || error.message?.includes('duplicate') || error.code === '23505') {
          return {
            success: false,
            error: `Order #${payload.display_order} is already taken in the database. Please choose a different order number.`,
          };
        }
        console.warn('DB testimonial insert warning (saving locally):', error.message);
      }

      if (data) {
        const saved = data as Testimonial;
        const freshList = getCachedTestimonials().filter((t) => t.id !== saved.id);
        const updatedList = [...freshList, saved].sort(
          (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
        );
        setCachedTestimonials(updatedList);
        window.dispatchEvent(new CustomEvent('csc-testimonials-updated'));
        return { success: true, data: saved };
      }
    } catch (err: any) {
      console.warn('DB testimonial insert exception (saving locally):', err);
    }
  }

  // Local fallback
  const freshList = getCachedTestimonials().filter((t) => t.id !== newId);
  const updatedList = [...freshList, payload].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );
  setCachedTestimonials(updatedList);
  window.dispatchEvent(new CustomEvent('csc-testimonials-updated'));

  return { success: true, data: payload };
}

/**
 * Swaps display_order between two testimonials safely.
 * Updates local cache immediately and broadcasts update.
 */
export async function swapTestimonialOrders(
  firstId: string,
  secondId: string
): Promise<{ success: boolean; error?: string }> {
  const currentList = getCachedTestimonials();
  const first = currentList.find((t) => t.id === firstId);
  const second = currentList.find((t) => t.id === secondId);

  if (!first || !second) {
    return { success: false, error: 'Testimonial not found.' };
  }

  const orderA = first.display_order;
  const orderB = second.display_order;

  // 1. Immediately swap in local cache for 0ms instant UI reaction
  const updatedList = currentList
    .map((t) => {
      if (t.id === firstId) return { ...t, display_order: orderB };
      if (t.id === secondId) return { ...t, display_order: orderA };
      return t;
    })
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  setCachedTestimonials(updatedList);
  window.dispatchEvent(new CustomEvent('csc-testimonials-updated'));

  // 2. Persist swap to Supabase safely without duplicate key collision
  if (isSupabaseConfigured()) {
    try {
      const tempOrder = -Math.abs(orderA * 1000 + Math.floor(Math.random() * 999));
      // Step A: Set first to temporary negative value
      await supabase.from('testimonials').update({ display_order: tempOrder }).eq('id', firstId);
      // Step B: Set second to orderA
      await supabase.from('testimonials').update({ display_order: orderA }).eq('id', secondId);
      // Step C: Set first to orderB
      await supabase.from('testimonials').update({ display_order: orderB }).eq('id', firstId);
    } catch (err: any) {
      console.warn('Failed to persist testimonial swap to Supabase:', err);
    }
  }

  return { success: true };
}

/**
 * Deletes a testimonial by id.
 * Updates local cache immediately and broadcasts update.
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
