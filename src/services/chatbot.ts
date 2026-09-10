import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ChatbotFaq, ChatbotFaqPayload } from '../types/database';

const CHATBOT_LOCAL_FAQS_KEY = 'csc_chatbot_faqs_cache';

export const DEFAULT_CHATBOT_FAQS: ChatbotFaq[] = [
  {
    id: 'faq-about-csc',
    question: 'What does Cloud Stack Club do?',
    answer:
      'Cloud Stack Club at Chandigarh University is dedicated to hands-on learning in Cloud Computing (AWS, GCP, Azure), DevOps, Full Stack Web Development, AI/ML, and Open Source. We host high-impact workshops, hackathons like Stack Sprint, ideathons like Elevate-X, and industrial certification bootcamps.',
    category: 'About Club',
    keywords: ['what is csc', 'about', 'about club', 'domains', 'cloud', 'devops', 'tech stack', 'purpose', 'aim', 'vision'],
    is_active: true,
    display_order: 1,
  },
  {
    id: 'faq-join-csc',
    question: 'How can I join Cloud Stack Club?',
    answer:
      'You can apply directly through our website! Click the "Join Club" button on the navigation bar or mobile menu to open the membership application. Select your preferred technical or non-technical domain and submit your university UID and details. Recruitment drives open during official campus recruitment cycles.',
    category: 'Membership',
    keywords: ['join', 'how to join', 'membership', 'apply', 'recruit', 'recruitment', 'member application', 'eligibility', 'form'],
    is_active: true,
    display_order: 2,
  },
  {
    id: 'faq-secretary',
    question: 'Who is the Secretary of Cloud Stack Club?',
    answer:
      'The Secretary of Cloud Stack Club is **Lakshay Gosai** (3rd Year, AIT-CSE / FSD). He oversees club operations, administration, and team leadership. You can connect with him on LinkedIn or through our "Meet Our Team" section.',
    category: 'Leadership',
    keywords: ['secretary', 'gen sec', 'general secretary', 'lakshay', 'gosai', 'who is secretary', 'lead', 'head'],
    is_active: true,
    display_order: 3,
  },
  {
    id: 'faq-tech-lead',
    question: 'Who is the Technical Lead of Cloud Stack Club?',
    answer:
      'The Technical Lead of Cloud Stack Club is **Utkrisht Utpal**. He spearheads technical architecture, system development, student coding projects, and platform infrastructure.',
    category: 'Leadership',
    keywords: ['technical lead', 'tech lead', 'utkrisht', 'utpal', 'who is tech lead', 'developer lead', 'coding head'],
    is_active: true,
    display_order: 4,
  },
  {
    id: 'faq-faculty',
    question: 'Who are the Faculty Advisors for Cloud Stack Club?',
    answer:
      'Cloud Stack Club is mentored and guided by **Dr. Deepti Sharma** (Faculty Advisor) and **Dr. Navjot Singh** (Co - Faculty Advisor) at Chandigarh University.',
    category: 'Leadership',
    keywords: ['faculty', 'advisor', 'faculty advisor', 'deepti', 'navjot', 'mentor', 'professors', 'teachers', 'sir', 'maam'],
    is_active: true,
    display_order: 5,
  },
  {
    id: 'faq-joint-sec',
    question: 'Who is the Joint Secretary?',
    answer:
      'The Joint Secretary of Cloud Stack Club is **Bani Kaur**. She works alongside the Secretary to coordinate team activities, event logistics, and member engagement.',
    category: 'Leadership',
    keywords: ['joint secretary', 'bani', 'kaur', 'who is joint secretary', 'vice lead'],
    is_active: true,
    display_order: 6,
  },
  {
    id: 'faq-events',
    question: 'What events or workshops are happening?',
    answer:
      'We organize events year-round including hands-on Cloud & DevOps bootcamps, certification challenges (AWS/Azure), and flagship hackathons like Elevate-X. Check the **Events** page (/events) for real-time seat counts and 1-click registration for solo or team passes.',
    category: 'Events',
    keywords: ['events', 'upcoming events', 'workshops', 'hackathons', 'elevate-x', 'stack sprint', 'register event', 'competitions'],
    is_active: true,
    display_order: 7,
  },
  {
    id: 'faq-certificates',
    question: 'How do I get an Event Certificate?',
    answer:
      'Digital participation and merit certificates are automatically issued via email after you attend and complete an event. You can also view and verify official club credentials anytime.',
    category: 'Events',
    keywords: ['certificate', 'cert', 'participation certificate', 'verify certificate', 'attendance', 'merit'],
    is_active: true,
    display_order: 8,
  },
  {
    id: 'faq-domains',
    question: 'What domains can I work in as a member?',
    answer:
      'Cloud Stack Club offers active domains in Cloud Infrastructure (AWS/Azure/GCP), DevOps & Automation, Full Stack Web & Mobile, AI/Machine Learning, Web3, UI/UX Design, Technical Content Writing, and Event Operations.',
    category: 'About Club',
    keywords: ['domains', 'departments', 'sub divisions', 'ai', 'ml', 'web3', 'devops', 'cloud', 'design', 'content'],
    is_active: true,
    display_order: 9,
  },
  {
    id: 'faq-contact',
    question: 'How can I contact coordinators or report an issue?',
    answer:
      'You can reach our leadership team via the **Contact Us** page (/contact) for general inquiries, or submit a ticket through our **Discrepancy / Query** portal (/discrepancy) for any registration or certificate corrections.',
    category: 'Contact',
    keywords: ['contact', 'email', 'help', 'support', 'issue', 'query', 'discrepancy', 'feedback', 'phone'],
    is_active: true,
    display_order: 10,
  },
];

/**
 * Loads cached FAQs from localStorage if available
 */
const getLocalCachedFaqs = (): ChatbotFaq[] => {
  try {
    const cached = localStorage.getItem(CHATBOT_LOCAL_FAQS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_CHATBOT_FAQS;
};

/**
 * Saves FAQs into localStorage cache
 */
const saveLocalCachedFaqs = (faqs: ChatbotFaq[]) => {
  try {
    localStorage.setItem(CHATBOT_LOCAL_FAQS_KEY, JSON.stringify(faqs));
  } catch {}
};

/**
 * Fetch all active FAQs for the public-facing chatbot widget
 */
export const getChatbotFaqs = async (): Promise<ChatbotFaq[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('chatbot_faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        saveLocalCachedFaqs(data);
        return data as ChatbotFaq[];
      }
    } catch (err) {
      console.warn('Notice fetching chatbot faqs from Supabase:', err);
    }
  }

  return getLocalCachedFaqs();
};

/**
 * Fetch all FAQs for the Admin Dashboard (including inactive)
 */
export const getAllChatbotFaqsAdmin = async (): Promise<ChatbotFaq[]> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('chatbot_faqs')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!error && data) {
        saveLocalCachedFaqs(data);
        return data as ChatbotFaq[];
      }
    } catch (err) {
      console.warn('Notice fetching admin chatbot faqs:', err);
    }
  }

  return getLocalCachedFaqs();
};

/**
 * Create a new FAQ entry
 */
export const createChatbotFaq = async (payload: ChatbotFaqPayload): Promise<ChatbotFaq> => {
  const newFaq: ChatbotFaq = {
    id: `faq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    question: payload.question.trim(),
    answer: payload.answer.trim(),
    category: payload.category?.trim() || 'General',
    keywords: payload.keywords || [],
    is_active: payload.is_active ?? true,
    display_order: payload.display_order ?? 99,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('chatbot_faqs')
        .insert({
          question: newFaq.question,
          answer: newFaq.answer,
          category: newFaq.category,
          keywords: newFaq.keywords,
          is_active: newFaq.is_active,
          display_order: newFaq.display_order,
        })
        .select('*')
        .single();

      if (!error && data) {
        return data as ChatbotFaq;
      }
    } catch (err) {
      console.warn('Falling back to local cache for createChatbotFaq:', err);
    }
  }

  const current = getLocalCachedFaqs();
  const updated = [...current, newFaq];
  saveLocalCachedFaqs(updated);
  return newFaq;
};

/**
 * Update an existing FAQ entry
 */
export const updateChatbotFaq = async (
  id: string,
  payload: Partial<ChatbotFaqPayload>
): Promise<ChatbotFaq> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('chatbot_faqs')
        .update({
          ...(payload.question !== undefined ? { question: payload.question.trim() } : {}),
          ...(payload.answer !== undefined ? { answer: payload.answer.trim() } : {}),
          ...(payload.category !== undefined ? { category: payload.category.trim() } : {}),
          ...(payload.keywords !== undefined ? { keywords: payload.keywords } : {}),
          ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
          ...(payload.display_order !== undefined ? { display_order: payload.display_order } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (!error && data) {
        return data as ChatbotFaq;
      }
    } catch (err) {
      console.warn('Falling back to local cache for updateChatbotFaq:', err);
    }
  }

  const current = getLocalCachedFaqs();
  const index = current.findIndex((f) => f.id === id);
  if (index !== -1) {
    const updatedFaq = {
      ...current[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };
    current[index] = updatedFaq;
    saveLocalCachedFaqs(current);
    return updatedFaq;
  }

  throw new Error(`FAQ with ID ${id} not found`);
};

/**
 * Delete an FAQ entry
 */
export const deleteChatbotFaq = async (id: string): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('chatbot_faqs').delete().eq('id', id);
      if (!error) return true;
    } catch (err) {
      console.warn('Falling back to local cache for deleteChatbotFaq:', err);
    }
  }

  const current = getLocalCachedFaqs();
  const filtered = current.filter((f) => f.id !== id);
  saveLocalCachedFaqs(filtered);
  return true;
};

/**
 * Normalizes input string for clean token matching
 */
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export interface MatchResult {
  faq?: ChatbotFaq;
  score: number;
  suggestions: ChatbotFaq[];
}

/**
 * Intelligent client-side scoring engine:
 * Evaluates token overlap, exact substrings, aliases, and keyword tags
 * with zero external API calls or latency.
 */
export const findBestAnswer = (userQuery: string, faqs: ChatbotFaq[]): MatchResult => {
  const cleanQuery = normalizeText(userQuery);
  const queryTokens = cleanQuery.split(' ').filter((t) => t.length > 1);

  if (queryTokens.length === 0) {
    return {
      score: 0,
      suggestions: faqs.slice(0, 4),
    };
  }

  const scoredFaqs = faqs.map((faq) => {
    let score = 0;
    const cleanQ = normalizeText(faq.question);
    const cleanAns = normalizeText(faq.answer);
    const qTokens = cleanQ.split(' ');

    // 1. Exact phrase match
    if (cleanQ === cleanQuery) {
      score += 150;
    } else if (cleanQ.includes(cleanQuery) || cleanQuery.includes(cleanQ)) {
      score += 80;
    }

    // 2. Keyword tag matching (Highest weight for intent)
    const keywords = (faq.keywords || []).map((k) => normalizeText(k));
    for (const kw of keywords) {
      if (kw === cleanQuery) {
        score += 90;
      } else if (cleanQuery.includes(kw) || kw.includes(cleanQuery)) {
        score += 50;
      } else {
        const kwTokens = kw.split(' ');
        for (const qt of queryTokens) {
          if (kwTokens.includes(qt)) score += 25;
        }
      }
    }

    // 3. Question title token overlap
    for (const qt of queryTokens) {
      if (qTokens.includes(qt)) {
        score += 20;
      } else if (qTokens.some((word) => word.startsWith(qt) || qt.startsWith(word))) {
        score += 10;
      }
    }

    // 4. Answer body keyword match
    for (const qt of queryTokens) {
      if (cleanAns.includes(qt)) {
        score += 4;
      }
    }

    // 5. Category match
    if (cleanQuery.includes(normalizeText(faq.category))) {
      score += 15;
    }

    return { faq, score };
  });

  scoredFaqs.sort((a, b) => b.score - a.score);

  const best = scoredFaqs[0];
  const CONFIDENCE_THRESHOLD = 25;

  if (best && best.score >= CONFIDENCE_THRESHOLD) {
    const suggestions = scoredFaqs
      .filter((s) => s.faq.id !== best.faq.id)
      .slice(0, 3)
      .map((s) => s.faq);

    return {
      faq: best.faq,
      score: best.score,
      suggestions,
    };
  }

  // Fallback: No confident match, return top 4 recommended FAQs
  return {
    score: best ? best.score : 0,
    suggestions: faqs.slice(0, 4),
  };
};
