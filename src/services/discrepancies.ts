import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatPersonName } from '../utils/formatters';

export type DiscrepancyStatus = 'pending' | 'in_review' | 'resolved' | 'dismissed';

export interface Discrepancy {
  id: string;
  ticket_number: string;
  name: string;
  email: string;
  phone: string;
  uid?: string | null;
  department: string;
  year_of_study: string;
  description?: string | null;
  status: DiscrepancyStatus;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDiscrepancyInput {
  name: string;
  email: string;
  phone: string;
  uid?: string;
  department: string;
  year_of_study: string;
  description?: string;
  honeypot?: string;
  turnstileToken?: string;
}

const LOCAL_STORAGE_KEY = 'csc_discrepancies_cache';

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const generateTicketNumber = (): string => {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CSC-DISC-${dateStr}-${rand}`;
};

const notifyDiscrepancyUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('csc-discrepancy-updated'));
  }
};

/**
 * Submits a new member discrepancy / CUIMS issue report.
 * Validates inputs, checks honeypots, submits via Worker Gateway (with Supabase fallback),
 * and saves to local cache.
 */
export const submitDiscrepancy = async (
  input: CreateDiscrepancyInput
): Promise<Discrepancy> => {
  // 1. Silent honeypot drop if bot filled hidden field
  if (input.honeypot && input.honeypot.trim() !== '') {
    console.warn('Bot detected via honeypot trap');
    return {
      id: generateUUID(),
      ticket_number: generateTicketNumber(),
      name: input.name,
      email: input.email,
      phone: input.phone,
      department: input.department,
      year_of_study: input.year_of_study,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // 2. Strict Input Normalization & Validation
  const formattedName = formatPersonName(input.name.trim());
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanPhone = input.phone.trim();
  const cleanUid = input.uid ? input.uid.trim().toUpperCase() : null;
  const cleanDepartment = input.department.trim();
  const cleanYear = input.year_of_study.trim();
  const cleanDescription = input.description ? input.description.trim() : null;

  if (!formattedName) throw new Error('Student name is required.');
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Please provide a valid email address.');
  }
  if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
    throw new Error('Phone number must be exactly 10 digits.');
  }
  if (!cleanDepartment) throw new Error('Department / Branch is required.');
  if (!cleanYear) throw new Error('Year of study is required.');

  const newTicketNumber = generateTicketNumber();
  const newId = generateUUID();
  const now = new Date().toISOString();

  // 3. Attempt Zero-Trust submission via Cloudflare Worker Gateway
  const workerUrl = import.meta.env.VITE_MEDIA_WORKER_URL || '';
  if (workerUrl) {
    try {
      const response = await fetch(`${workerUrl}/api/submit-discrepancy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(input.turnstileToken ? { 'cf-turnstile-response': input.turnstileToken } : {}),
        },
        body: JSON.stringify({
          name: formattedName,
          email: cleanEmail,
          phone: cleanPhone,
          uid: cleanUid,
          department: cleanDepartment,
          year_of_study: cleanYear,
          description: cleanDescription,
          turnstile_token: input.turnstileToken,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const finalTicket: Discrepancy = {
          id: result?.id || newId,
          ticket_number: result?.ticket_number || newTicketNumber,
          name: formattedName,
          email: cleanEmail,
          phone: cleanPhone,
          uid: cleanUid,
          department: cleanDepartment,
          year_of_study: cleanYear,
          description: cleanDescription,
          status: 'pending',
          admin_notes: null,
          created_at: result?.created_at || now,
          updated_at: result?.updated_at || now,
        };

        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
          const cached: Discrepancy[] = raw ? JSON.parse(raw) : [];
          cached.unshift(finalTicket);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
        } catch {}

        notifyDiscrepancyUpdated();
        return finalTicket;
      } else {
        const errJson = await response.json().catch(() => ({ error: 'Discrepancy submission failed' }));
        if (response.status === 403 || (errJson.error && errJson.error.includes('Turnstile'))) {
          throw new Error(errJson.error || 'Turnstile verification failed. Please try again.');
        }
        console.warn('Worker submission error, falling back to direct Supabase:', errJson);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Turnstile')) {
        throw err;
      }
      console.warn('Worker gateway unreachable, using direct Supabase fallback:', err);
    }
  }

  const record: Discrepancy = {
    id: newId,
    ticket_number: newTicketNumber,
    name: formattedName,
    email: cleanEmail,
    phone: cleanPhone,
    uid: cleanUid,
    department: cleanDepartment,
    year_of_study: cleanYear,
    description: cleanDescription,
    status: 'pending',
    admin_notes: null,
    created_at: now,
    updated_at: now,
  };

  // Sync to local cache immediately
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const cached: Discrepancy[] = raw ? JSON.parse(raw) : [];
    cached.unshift(record);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cached));
  } catch (err) {
    console.warn('Failed to update local discrepancies cache:', err);
  }

  // Persist to Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('discrepancies')
        .insert({
          id: newId,
          ticket_number: newTicketNumber,
          name: formattedName,
          email: cleanEmail,
          phone: cleanPhone,
          uid: cleanUid,
          department: cleanDepartment,
          year_of_study: cleanYear,
          description: cleanDescription,
          status: 'pending',
        })
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Supabase discrepancy insert warning:', error);
      } else if (data) {
        notifyDiscrepancyUpdated();
        return data as Discrepancy;
      }
    } catch (err) {
      console.warn('Supabase discrepancy insert error:', err);
    }
  }

  notifyDiscrepancyUpdated();
  return record;
};

/**
 * Retrieves all discrepancy submissions for administrative review.
 */
export const getAllDiscrepancies = async (): Promise<Discrepancy[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('discrepancies')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        } catch {}
        return data as Discrepancy[];
      }
    } catch (err) {
      console.warn('Failed to query Supabase discrepancies:', err);
    }
  }

  // Fallback to local cache
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

/**
 * Updates status and admin notes for a discrepancy submission.
 */
export const updateDiscrepancyStatus = async (
  id: string,
  status: DiscrepancyStatus,
  adminNotes?: string
): Promise<Discrepancy> => {
  const now = new Date().toISOString();

  // Optimistic local update
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const list: Discrepancy[] = JSON.parse(raw);
      const updated = list.map((item) =>
        item.id === id ? { ...item, status, admin_notes: adminNotes !== undefined ? adminNotes : item.admin_notes, updated_at: now } : item
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('discrepancies')
        .update({
          status,
          admin_notes: adminNotes,
          updated_at: now,
        })
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Failed to update discrepancy status in Supabase:', error);
      } else if (data) {
        notifyDiscrepancyUpdated();
        return data as Discrepancy;
      }
    } catch (err) {
      console.warn('Supabase discrepancy update error:', err);
    }
  }

  notifyDiscrepancyUpdated();
  return {
    id,
    ticket_number: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    year_of_study: '',
    status,
    admin_notes: adminNotes || null,
    created_at: now,
    updated_at: now,
  };
};

/**
 * Deletes a discrepancy record.
 */
export const deleteDiscrepancy = async (id: string): Promise<void> => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const list: Discrepancy[] = JSON.parse(raw);
      const filtered = list.filter((item) => item.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch {}

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('discrepancies').delete().eq('id', id);
    } catch (err) {
      console.warn('Failed to delete discrepancy from Supabase:', err);
    }
  }

  notifyDiscrepancyUpdated();
};
