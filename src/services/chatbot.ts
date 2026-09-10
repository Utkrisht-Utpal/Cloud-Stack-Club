import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getEvents } from './events';
import { getEventRegistrationCountsMap } from './registrationForms';
import { getCoreMembers, type CoreMember } from './members';
import { getActiveNotices } from './notices';
import { formatEventDate, formatEventTime, isRegistrationActive } from '../utils/formatters';
import type { ChatbotFaq, ChatbotFaqPayload, Event } from '../types/database';

const CHATBOT_LOCAL_FAQS_KEY = 'csc_chatbot_faqs_cache_v2';

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
      'You can apply directly through our official membership portal to select your preferred technical or non-technical domain and submit your university UID.\n\nRecruitment drives open during official campus recruitment cycles. Have questions? Reach our leadership team anytime.',
    category: 'Membership',
    keywords: ['join', 'how to join', 'membership', 'apply', 'recruit', 'recruitment', 'member application', 'eligibility', 'form'],
    is_active: true,
    display_order: 2,
  },
  {
    id: 'faq-free-fees',
    question: 'Is joining Cloud Stack Club free or is there a membership fee?',
    answer:
      'Joining Cloud Stack Club is **100% Free**! 🎉 There are no membership fees, hidden charges, or subscription costs to join the community or attend regular workshops.',
    category: 'Membership',
    keywords: ['fee', 'fees', 'free', 'cost', 'charges', 'paid', 'price', 'paise', 'how much'],
    is_active: true,
    display_order: 3,
  },
  {
    id: 'faq-eligibility',
    question: 'Who is eligible to join? Can 1st year / freshers apply?',
    answer:
      '**Yes, absolutely!** Cloud Stack Club is open to students from **all years** (1st, 2nd, 3rd, and 4th year) and **all branches** (CSE, AIT, IT, ECE, Mechanical, etc.) at Chandigarh University. Both beginners and experienced coders are welcome!',
    category: 'Membership',
    keywords: ['eligible', 'eligibility', 'who can join', '1st year', 'first year', 'freshers', 'which branch', 'non cse'],
    is_active: true,
    display_order: 4,
  },
  {
    id: 'faq-selection-process',
    question: 'What is the selection process after applying for membership?',
    answer:
      'After you submit your application, the core committee reviews your interests and technical domain preference. Shortlisted candidates may have a brief interaction or interview round, followed by an official acceptance email and invite to internal club channels.',
    category: 'Membership',
    keywords: ['selection', 'interview', 'process', 'how selected', 'after apply', 'shortlist', 'results'],
    is_active: true,
    display_order: 5,
  },
  {
    id: 'faq-domains',
    question: 'What domains can I work in as a member?',
    answer:
      'Cloud Stack Club offers active domains in Cloud Infrastructure (AWS/Azure/GCP), DevOps & Automation, Full Stack Web & Mobile, AI/Machine Learning, Web3, UI/UX Design, Technical Content Writing, and Event Operations.',
    category: 'About Club',
    keywords: ['domains', 'departments', 'sub divisions', 'ai', 'ml', 'web3', 'devops', 'cloud', 'design', 'content'],
    is_active: true,
    display_order: 6,
  },

  {
    id: 'faq-non-members',
    question: 'Can non-members attend club workshops and hackathons?',
    answer:
      '**Yes!** All workshops, bootcamps, and hackathons hosted by Cloud Stack Club are open to **all university students**, even if you are not an official core member.',
    category: 'Events',
    keywords: ['non member', 'not member', 'outside', 'anyone attend', 'can i attend', 'public event'],
    is_active: true,
    display_order: 7,
  },
  {
    id: 'faq-team-registration',
    question: 'How does team registration work for hackathons?',
    answer:
      'For team hackathons:\n1. The **Team Leader** registers first and receives a unique Team Code.\n2. **Team Members** register by selecting "Join Existing Team" and entering the Team Code.\n3. Once confirmed, all members receive automated entry passes via email.',
    category: 'Events',
    keywords: ['team registration', 'team code', 'register as team', 'team size', 'solo or team'],
    is_active: true,
    display_order: 8,
  },
  {
    id: 'faq-certificates',
    question: 'How do I get an Event Certificate?',
    answer:
      'Digital participation and merit certificates are automatically issued via email after you attend and complete an event. If you need any assistance with a certificate, you can raise an issue through our support portal.',
    category: 'Events',
    keywords: ['certificate', 'cert', 'participation certificate', 'verify certificate', 'attendance', 'merit'],
    is_active: true,
    display_order: 9,
  },
  {
    id: 'faq-certificate-correction',
    question: 'What should I do if my name on the certificate is wrong or attendance was missed?',
    answer:
      'If you notice a typo in your name or your attendance was not recorded properly, submit a ticket through our official Discrepancy Portal immediately.',
    category: 'Contact',
    keywords: ['wrong name', 'spelling mistake', 'attendance issue', 'certificate mistake', 'name error', 'correction'],
    is_active: true,
    display_order: 10,
  },
  {
    id: 'faq-timings-location',
    question: 'Where and when do club sessions and workshops take place?',
    answer:
      'Cloud Stack Club is located at **Chandigarh University** (Department of CSE / AIT). Workshops and bootcamps take place on campus in dedicated computer labs or auditoriums, usually on weekday evenings or Saturday mornings.',
    category: 'About Club',
    keywords: ['location', 'where is club', 'timing', 'timings', 'venue', 'offline', 'campus', 'where meet'],
    is_active: true,
    display_order: 11,
  },
  {
    id: 'faq-gallery',
    question: 'Where can I see photos and past event highlights?',
    answer:
      'You can browse our official photo gallery to see memories, hackathon winners, and workshop highlights from past events!',
    category: 'About Club',
    keywords: ['gallery', 'photos', 'pictures', 'videos', 'memories', 'past events', 'highlights'],
    is_active: true,
    display_order: 12,
  },
  {
    id: 'faq-contact',
    question: 'How can I contact coordinators or report an issue?',
    answer:
      'You can reach our leadership team for general inquiries, or submit a ticket through our query portal if you notice any registration or certificate discrepancies.',
    category: 'Contact',
    keywords: ['contact', 'email', 'help', 'support', 'issue', 'query', 'discrepancy', 'feedback', 'phone'],
    is_active: true,
    display_order: 13,
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
 * Common English stop words & conversational filler words that should not
 * falsely inflate intent or FAQ matching scores.
 */
export const STOP_WORDS = new Set([
  'who', 'is', 'the', 'what', 'where', 'when', 'which', 'how', 'can', 'i', 'you',
  'a', 'an', 'of', 'in', 'at', 'on', 'for', 'to', 'and', 'or', 'tell', 'me', 'about',
  'do', 'does', 'are', 'any', 'some', 'please', 'with', 'by', 'from', 'this', 'that',
  'there', 'their', 'club', 'csc', 'handles', 'charge', 'manages', 'leads', 'works',
  'person', 'name'
]);

/**
 * Scrub any accidental PII (phone numbers, personal emails, student UIDs) from bot outputs
 */
export const scrubPii = (text: string): string => {
  return text
    // Redact 10-digit Indian mobile numbers or standard phone formats
    .replace(/(?:\+?91[-.\s]?)?[6-9]\d{9}\b/g, '[Contact Protected]')
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[Contact Protected]')
    // Redact personal email addresses (preserving official club emails)
    .replace(/\b[A-Za-z0-9._%+-]+@(?!cloudstack|chandigarh|cumail)[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, '[Email Protected]')
    // Redact student UIDs / roll numbers
    .replace(/\b\d{2}[A-Z]{3,4}\d{4,6}\b/gi, '[UID Protected]');
};

/**
 * Privacy & Security Guard: Intercepts queries seeking confidential PII,
 * attendee rosters, student UIDs, phone numbers, or administrative secrets.
 */
export const checkSecurityPrivacyViolation = (cleanQuery: string): string | null => {
  // 1. Phone numbers / WhatsApp numbers of individuals
  if (
    cleanQuery.includes('phone') ||
    cleanQuery.includes('mobile') ||
    cleanQuery.includes('whatsapp') ||
    cleanQuery.includes('call number') ||
    cleanQuery.includes('contact number') ||
    cleanQuery.includes('ph no')
  ) {
    return 'For privacy and security reasons, personal phone numbers and WhatsApp contacts of club members, leads, and coordinators are strictly confidential and protected. You can connect with our team members via their official LinkedIn profiles in our [Meet Our Team](/team) section, or reach out through our official [Contact Page](/contact).';
  }

  // 2. Student UIDs / Roll Numbers / Academic IDs
  if (
    cleanQuery.includes('uid') ||
    cleanQuery.includes('roll number') ||
    cleanQuery.includes('roll no') ||
    cleanQuery.includes('student id') ||
    cleanQuery.includes('registration number') ||
    cleanQuery.includes('reg id')
  ) {
    return 'University UIDs, roll numbers, and student academic identification codes are confidential personal data protected under student privacy policies. They are never shared or disclosed by the chatbot.';
  }

  // 3. Attendee lists / Participant data / Who registered
  if (
    cleanQuery.includes('who registered') ||
    cleanQuery.includes('participant list') ||
    cleanQuery.includes('attendee list') ||
    cleanQuery.includes('list of participants') ||
    cleanQuery.includes('list of attendees') ||
    cleanQuery.includes('registered students') ||
    cleanQuery.includes('who attended') ||
    cleanQuery.includes('participant email') ||
    cleanQuery.includes('participant phone') ||
    cleanQuery.includes('team codes')
  ) {
    return 'Event participant rosters, attendee records, and personal registration details are strictly confidential to protect student privacy. If you are registered for an event, your individual entry pass and details were delivered directly to your registered email.';
  }

  // 4. Passwords / Secrets / Internal System / Injection
  if (
    cleanQuery.includes('password') ||
    cleanQuery.includes('admin key') ||
    cleanQuery.includes('secret key') ||
    cleanQuery.includes('service role') ||
    cleanQuery.includes('api key') ||
    cleanQuery.includes('database table') ||
    cleanQuery.includes('dump database') ||
    cleanQuery.includes('system prompt') ||
    cleanQuery.includes('bypass') ||
    cleanQuery.includes('drop table') ||
    cleanQuery.includes('select from')
  ) {
    return 'Access denied. Administrative credentials, security keys, and internal database configurations are protected and cannot be disclosed.';
  }

  // 5. Personal student email inquiries
  if (
    cleanQuery.includes('personal email') ||
    cleanQuery.includes('private email') ||
    cleanQuery.includes('personal mail')
  ) {
    return 'Personal email addresses of students and core members are confidential. For official club correspondence, please use our [Contact Us Page](/contact) or connect via public LinkedIn profiles on our [Team Page](/team).';
  }

  return null;
};

/**
 * Intelligent client-side scoring engine:
 * Evaluates token overlap, exact substrings, aliases, and keyword tags
 * with stop-word filtering to prevent false positives.
 */
export const findBestAnswer = (userQuery: string, faqs: ChatbotFaq[]): MatchResult => {
  const cleanQuery = normalizeText(userQuery);
  const queryTokens = cleanQuery.split(' ').filter((t) => t.length > 1);
  const meaningfulTokens = queryTokens.filter((t) => !STOP_WORDS.has(t));

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
    const meaningfulQTokens = qTokens.filter((t) => !STOP_WORDS.has(t));

    // 1. Exact phrase match
    if (cleanQ === cleanQuery) {
      score += 150;
    } else if (cleanQ.includes(cleanQuery) || cleanQuery.includes(cleanQ)) {
      score += 80;
    }

    // 2. Keyword tag matching (only non-stop words contribute)
    const keywords = (faq.keywords || []).map((k) => normalizeText(k));
    for (const kw of keywords) {
      if (kw === cleanQuery) {
        score += 90;
      } else if (cleanQuery.includes(kw) || kw.includes(cleanQuery)) {
        score += 50;
      } else {
        const kwTokens = kw.split(' ').filter((t) => !STOP_WORDS.has(t));
        for (const qt of meaningfulTokens) {
          if (kwTokens.includes(qt)) score += 30;
        }
      }
    }

    // 3. Question title meaningful token overlap
    for (const qt of meaningfulTokens) {
      if (meaningfulQTokens.includes(qt)) {
        score += 30;
      } else if (meaningfulQTokens.some((word) => word.startsWith(qt) || qt.startsWith(word))) {
        score += 15;
      }
    }

    // 4. Answer body keyword match (only if some meaningful token matched)
    if (score > 0) {
      for (const qt of meaningfulTokens) {
        if (cleanAns.includes(qt)) {
          score += 4;
        }
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
  const CONFIDENCE_THRESHOLD = 30;

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

export interface BotActionLink {
  label: string;
  url: string;
}

export interface BotResolvedResponse {
  text: string;
  suggestions: ChatbotFaq[];
  actionLinks: BotActionLink[];
}

/**
 * Safe public formatting for a core team member response
 */
export const formatMemberResponse = (m: CoreMember): BotResolvedResponse => {
  const role = m.role?.name || 'Core Member';
  const deptInfo = [m.year, m.department].filter(Boolean).join(', ');
  const parenthetical = deptInfo ? ` (${deptInfo})` : '';

  let text = `The **${role}** of Cloud Stack Club is **${m.name}**${parenthetical}.\n\n`;

  if (m.description) {
    const cleanDesc = m.description.split('\n')[0].replace(/\r/g, '').trim();
    if (cleanDesc) {
      text += `${cleanDesc.length > 220 ? cleanDesc.slice(0, 220) + '...' : cleanDesc}\n\n`;
    }
  }

  text += `You can view verified achievements, projects, and professional links in our Meet Our Team section.`;

  const actionLinks: BotActionLink[] = [];

  if (m.linkedin_url && m.linkedin_url.startsWith('http')) {
    actionLinks.push({ label: '💼 LinkedIn Profile', url: m.linkedin_url });
  }

  return {
    text: scrubPii(text),
    suggestions: [
      { id: 'faq-lead-sec', question: 'Who is the Secretary of Cloud Stack Club?', answer: '', category: 'Leadership', keywords: [], is_active: true, display_order: 1 },
      { id: 'faq-lead-tech', question: 'Who is the Technical Lead of Cloud Stack Club?', answer: '', category: 'Leadership', keywords: [], is_active: true, display_order: 2 },
    ],
    actionLinks,
  };
};

/**
 * Dynamically queries real database core members for matching roles, names, or domains
 */
export const resolveMemberQuery = (
  cleanQuery: string,
  members: CoreMember[]
): BotResolvedResponse | null => {
  if (!members || members.length === 0) return null;

  const tokens = cleanQuery.split(' ').filter((t) => !STOP_WORDS.has(t) && t.length > 1);

  // A. General team / core members query
  const isAllTeamQuery =
    (cleanQuery.includes('core team') ||
      cleanQuery.includes('core member') ||
      cleanQuery.includes('whole team') ||
      cleanQuery.includes('all member') ||
      cleanQuery.includes('list member') ||
      cleanQuery.includes('who are in the team') ||
      cleanQuery.includes('show team') ||
      cleanQuery.includes('meet team')) &&
    !tokens.some((t) =>
      ['graphic', 'designer', 'video', 'editor', 'writer', 'treasurer', 'photographer', 'marketing', 'logistics', 'volunteer', 'discipline', 'hospitality', 'media', 'social', 'tech', 'technical', 'secretary', 'lead'].includes(t)
    );

  if (isAllTeamQuery) {
    const council = members.slice(0, 8);
    let text = `Cloud Stack Club is driven by an energetic student leadership council mentored by university faculty:\n\n`;
    text += council
      .map((m) => `• **${m.name}** — ${m.role?.name || 'Core Member'}${m.department ? ` (${m.department})` : ''}`)
      .join('\n');
    text += `\n\n...plus student coordinators across Design, Content, Logistics, and Operations. You can view all profiles, bios, and LinkedIn links in our Meet Our Team section.`;

    return {
      text: scrubPii(text),
      suggestions: [
        { id: 'faq-lead-sec', question: 'Who is the Secretary of Cloud Stack Club?', answer: '', category: 'Leadership', keywords: [], is_active: true, display_order: 1 },
        { id: 'faq-lead-tech', question: 'Who is the Technical Lead of Cloud Stack Club?', answer: '', category: 'Leadership', keywords: [], is_active: true, display_order: 2 },
      ],
      actionLinks: [
        { label: '👥 Meet Our Full Team', url: '/team' },
        { label: '🚀 Apply to Join Club', url: '/join' },
      ],
    };
  }

  // B. Specific Role Match (Highest priority)
  let bestRoleMatch: { member: CoreMember; score: number } | null = null;

  for (const m of members) {
    const roleName = m.role?.name || '';
    const cleanRole = normalizeText(roleName);
    const roleTokens = cleanRole.split(' ').filter((t) => !STOP_WORDS.has(t));

    let score = 0;

    // Exact role match
    if (cleanQuery.includes(cleanRole) && cleanRole.length > 3) {
      score += 100;
    } else {
      const matchedTokens = tokens.filter((t) => roleTokens.includes(t));
      if (matchedTokens.length > 0) {
        score += (matchedTokens.length / roleTokens.length) * 80;
        // Extra boost if key unique role words match
        if (tokens.includes('designer') && roleTokens.includes('designer')) score += 40;
        if (tokens.includes('graphic') && roleTokens.includes('graphic')) score += 40;
        if (tokens.includes('editor') && roleTokens.includes('editor')) score += 40;
        if (tokens.includes('video') && roleTokens.includes('video')) score += 40;
        if (tokens.includes('photographer') && roleTokens.includes('photographer')) score += 40;
        if (tokens.includes('treasurer') && roleTokens.includes('treasurer')) score += 50;
        if (tokens.includes('logistics') && roleTokens.includes('logistics')) score += 50;
        if (tokens.includes('volunteer') && roleTokens.includes('volunteer')) score += 50;
        if (tokens.includes('discipline') && roleTokens.includes('discipline')) score += 50;
        if (tokens.includes('hospitality') && roleTokens.includes('hospitality')) score += 50;
        if (tokens.includes('writer') && roleTokens.includes('writer')) score += 50;
        if (tokens.includes('marketing') && roleTokens.includes('marketing')) score += 50;
        if (tokens.includes('media') && roleTokens.includes('media')) score += 40;
        if (tokens.includes('outreach') && roleTokens.includes('outreach')) score += 40;
      }
    }

    // Role aliases
    if ((cleanQuery.includes('tech lead') || cleanQuery.includes('technical lead')) && cleanRole.includes('technical')) {
      score += 90;
    }
    if ((cleanQuery.includes('joint sec') || cleanQuery.includes('joint secretary')) && cleanRole.includes('joint')) {
      score += 90;
    } else if (cleanQuery.includes('secretary') && !cleanQuery.includes('joint') && cleanRole === 'secretary') {
      score += 90;
    }
    if ((cleanQuery.includes('faculty') || cleanQuery.includes('advisor') || cleanQuery.includes('mentor')) && cleanRole.includes('faculty')) {
      score += 70;
    }

    if (score >= 40 && (!bestRoleMatch || score > bestRoleMatch.score)) {
      bestRoleMatch = { member: m, score };
    }
  }

  if (bestRoleMatch && bestRoleMatch.score >= 40) {
    return formatMemberResponse(bestRoleMatch.member);
  }

  // C. Specific Member Name Match
  for (const m of members) {
    const cleanName = normalizeText(m.name || '');
    const nameTokens = cleanName.split(' ').filter((t) => t.length > 2);

    const matchesName = nameTokens.some((nt) => tokens.includes(nt) || cleanQuery.includes(nt));
    if (matchesName) {
      return formatMemberResponse(m);
    }
  }

  // D. Domain-based Team Queries
  if (cleanQuery.includes('design team') || cleanQuery.includes('ui ux')) {
    const designers = members.filter(
      (m) =>
        (m.role?.name || '').toLowerCase().includes('design') ||
        (m.department || '').toLowerCase().includes('design')
    );
    if (designers.length > 0) {
      const top = designers[0];
      return {
        text: `The design and creative UI/UX efforts at Cloud Stack Club are led by **${top.name}** (${top.role?.name || 'Graphic Designer'}).\n\nHe creates visual assets, digital branding, posters, and user interfaces for club events and web platforms.`,
        suggestions: [],
        actionLinks: [],
      };
    }
  }

  if (cleanQuery.includes('media team') || cleanQuery.includes('content team')) {
    const media = members.filter((m) => {
      const r = (m.role?.name || '').toLowerCase();
      return r.includes('media') || r.includes('content') || r.includes('video') || r.includes('photo');
    });
    if (media.length > 0) {
      let text = `Cloud Stack Club's media, content, and public outreach team includes:\n\n`;
      text += media.map((m) => `• **${m.name}** — ${m.role?.name}`).join('\n');
      text += `\n\nThey produce technical blogs, event highlight reels, photography, and social media releases. Check out their full bios in our Meet Our Team section.`;
      return {
        text: scrubPii(text),
        suggestions: [],
        actionLinks: [{ label: '👥 Meet Our Team', url: '/team' }],
      };
    }
  }

  return null;
};

/**
 * Dynamically queries real database events for specific titles, categories, or statuses
 */
export const resolveDynamicEventQuery = (
  cleanQuery: string,
  events: Event[],
  regCountsMap: Record<string, number> = {}
): BotResolvedResponse | null => {
  if (!events || events.length === 0) return null;

  const validEvents = events.filter((e) => e.status !== 'cancelled');
  const tokens = cleanQuery.split(' ').filter((t) => !STOP_WORDS.has(t) && t.length > 1);

  // -------------------------------------------------------------
  // 1. SPECIFIC EVENT NAME MATCH (Highest Priority)
  // -------------------------------------------------------------
  let matchedEvent: Event | null = null;

  // A. Direct title or slug match
  for (const evt of validEvents) {
    const cleanTitle = normalizeText(evt.title);
    const cleanSlug = normalizeText((evt.slug || '').replace(/-/g, ' '));
    if (cleanQuery.includes(cleanTitle) || (cleanSlug.length > 3 && cleanQuery.includes(cleanSlug))) {
      matchedEvent = evt;
      break;
    }
  }

  // B. Distinctive keywords match (e.g. "aws", "ideathon", "industry visit")
  if (!matchedEvent) {
    for (const evt of validEvents) {
      const cleanTitle = normalizeText(evt.title);
      const titleTokens = cleanTitle.split(' ').filter((t) => !STOP_WORDS.has(t) && t.length > 2);

      // High-confidence match: "aws" is unique to AWS Certification
      if (titleTokens.includes('aws') && (tokens.includes('aws') || cleanQuery.includes('aws'))) {
        matchedEvent = evt;
        break;
      }

      // Check token overlap
      const matchCount = titleTokens.filter((tt) => tokens.includes(tt) || cleanQuery.includes(tt)).length;
      if (matchCount > 0 && matchCount >= Math.min(titleTokens.length, 2)) {
        matchedEvent = evt;
        break;
      }
    }
  }

  // C. Generic Event Aspect Match (When user asks about "the event", "an event", or event aspects without a specific title)
  let isGenericMatch = false;
  if (!matchedEvent) {
    const mentionsEvent =
      cleanQuery.includes('event') ||
      cleanQuery.includes('events') ||
      cleanQuery.includes('workshop') ||
      cleanQuery.includes('bootcamp') ||
      cleanQuery.includes('hackathon') ||
      cleanQuery.includes('competition');

    const isGenericAspect =
      cleanQuery.includes('capacity left') ||
      cleanQuery.includes('seats left') ||
      cleanQuery.includes('remaining seats') ||
      cleanQuery.includes('capacity') ||
      cleanQuery.includes('team size') ||
      cleanQuery.includes('team or individual') ||
      cleanQuery.includes('individual or team') ||
      cleanQuery.includes('solo or individual') ||
      cleanQuery.includes('registration date') ||
      cleanQuery.includes('register date') ||
      cleanQuery.includes('want to register') ||
      cleanQuery.includes('wanna register') ||
      cleanQuery.includes('how to register') ||
      cleanQuery.includes('where to register') ||
      cleanQuery.includes('where can i register') ||
      cleanQuery.includes('registration link') ||
      cleanQuery.includes('link to register') ||
      cleanQuery.includes('register for event') ||
      cleanQuery.includes('book a seat') ||
      cleanQuery.includes('reserve a seat') ||
      cleanQuery.includes('deadline') ||
      cleanQuery.includes('last date to register') ||
      cleanQuery === 'what s the time' ||
      cleanQuery === 'whats the time' ||
      cleanQuery === 'what is the time' ||
      cleanQuery === 'what is the timing' ||
      cleanQuery === 'what s the timing' ||
      cleanQuery === 'event time' ||
      cleanQuery === 'timing' ||
      cleanQuery === 'timings' ||
      (mentionsEvent &&
        (cleanQuery.includes('where') ||
          cleanQuery.includes('venue') ||
          cleanQuery.includes('location') ||
          cleanQuery.includes('place') ||
          cleanQuery.includes('when') ||
          cleanQuery.includes('date') ||
          cleanQuery.includes('schedule') ||
          cleanQuery.includes('day') ||
          cleanQuery.includes('time') ||
          cleanQuery.includes('timing') ||
          cleanQuery.includes('timings') ||
          cleanQuery.includes('clock') ||
          cleanQuery.includes('seat') ||
          cleanQuery.includes('seats') ||
          cleanQuery.includes('slot') ||
          cleanQuery.includes('slots') ||
          cleanQuery.includes('rule') ||
          cleanQuery.includes('rules') ||
          cleanQuery.includes('register') ||
          cleanQuery.includes('registration') ||
          cleanQuery.includes('eligibility')));

    if (isGenericAspect) {
      const liveOrUpcoming = validEvents
        .filter((e) => e.status === 'live' || e.status === 'upcoming')
        .sort((a, b) => (new Date(a.date || '').getTime() || 0) - (new Date(b.date || '').getTime() || 0));

      if (liveOrUpcoming.length > 0) {
        matchedEvent = liveOrUpcoming[0];
        isGenericMatch = true;
      }
    }
  }

  // If a specific event is identified (or inferred from upcoming event), answer the exact aspect requested!
  if (matchedEvent) {
    const evt = matchedEvent;
    const titleLabel = isGenericMatch ? `Upcoming Event (${evt.title})` : evt.title;
    const dateFormatted = formatEventDate(evt.date);
    const timeFormatted = evt.start_time ? formatEventTime(evt.start_time) : '';
    const venue = evt.location || 'Chandigarh University campus (Exact room/hall to be announced)';
    const maxReg = evt.max_registrations;
    const registered = regCountsMap[evt.id.toLowerCase()] || 0;
    const remaining = maxReg !== null ? Math.max(0, maxReg - registered) : null;
    const isRegOpen = isRegistrationActive(evt, registered);
    const eventUrl = `/events/${evt.slug || evt.id}`;
    const registerUrl = `/events/${evt.slug || evt.id}/register`;

    const actionLinks: BotActionLink[] = [];
    if (isRegOpen) {
      actionLinks.push({ label: `🎟️ Register for ${evt.title}`, url: registerUrl });
    }
    actionLinks.push({ label: isRegOpen ? `View Event Details` : `View ${evt.title}`, url: eventUrl });
    if (evt.status === 'completed') {
      actionLinks.unshift({ label: '📸 View Event Gallery', url: '/gallery' });
    }
    actionLinks.push({ label: '📅 Browse All Events', url: '/events' });

    // Aspect 0: EXPLICIT REGISTRATION REQUEST ("I want to register for...")
    const isRegisterIntent =
      cleanQuery.includes('want to register') ||
      cleanQuery.includes('wanna register') ||
      cleanQuery.includes('how to register') ||
      cleanQuery.includes('how do i register') ||
      cleanQuery.includes('where to register') ||
      cleanQuery.includes('where can i register') ||
      cleanQuery.includes('can i register') ||
      cleanQuery.includes('link to register') ||
      cleanQuery.includes('registration link') ||
      cleanQuery.includes('registration form') ||
      cleanQuery.includes('sign up for') ||
      cleanQuery.includes('signup for') ||
      cleanQuery.includes('book a seat') ||
      cleanQuery.includes('reserve a seat') ||
      cleanQuery.includes('register for') ||
      cleanQuery.includes('register in') ||
      cleanQuery.includes('register now') ||
      cleanQuery.includes('apply for event') ||
      cleanQuery.includes('fill form') ||
      cleanQuery.includes('entry pass') ||
      cleanQuery.includes('get pass') ||
      cleanQuery.includes('participate in');

    if (isRegisterIntent) {
      if (isRegOpen) {
        const text = `🎟️ **Register for ${titleLabel}:**\n\n` +
          `Registration for **${evt.title}** is **🟢 Open Now**!\n\n` +
          (evt.supports_teams
            ? `• 👥 **Participation Format:** Team Event (Up to **${evt.max_team_size || 4} members** per team). The Team Leader registers first to get a Team Code, and teammates join using that code.\n`
            : `• 👥 **Participation Format:** Strictly Individual (Solo) pass.\n`) +
          `• 📍 **Venue:** ${venue}\n` +
          `• 🗓️ **Date & Time:** ${dateFormatted}${timeFormatted ? ` at ${timeFormatted}` : ''}\n` +
          (evt.registration_end ? `• ⏳ **Registration Deadline:** ${formatEventDate(evt.registration_end)}\n` : '') +
          (remaining !== null ? `• 💺 **Available Capacity:** ${remaining} seats remaining (${maxReg} total)\n\n` : '\n') +
          `You can open the official registration form directly by clicking the button below:\n` +
          `👉 [Open ${evt.title} Registration Form](${registerUrl})`;

        return {
          text: scrubPii(text),
          suggestions: [],
          actionLinks: [
            { label: `🎟️ Register for ${evt.title}`, url: registerUrl },
            { label: `📄 View Event Details`, url: eventUrl },
            { label: '📅 Browse All Events', url: '/events' },
          ],
        };
      } else {
        const reason = evt.status === 'completed'
          ? `This event was successfully completed on **${dateFormatted}**.`
          : (maxReg && registered >= maxReg)
          ? `Registration has reached maximum capacity (${maxReg} seats filled).`
          : (evt.registration_end && new Date(evt.registration_end) < new Date())
          ? `The registration deadline (${formatEventDate(evt.registration_end)}) has passed.`
          : `Registrations are currently closed for this event.`;

        const text = `🔴 **Registration Closed for ${titleLabel}:**\n\n` +
          `${reason}\n\n` +
          `• 🗓️ **Event Date:** ${dateFormatted}\n` +
          `• 📍 **Venue:** ${venue}\n\n` +
          `You can view the event overview or explore our upcoming events where registration is currently open!`;

        return {
          text: scrubPii(text),
          suggestions: [],
          actionLinks: [
            { label: `📄 View ${evt.title} Details`, url: eventUrl },
            (evt.status === 'completed'
              ? { label: '📸 View Event Gallery', url: '/gallery' }
              : { label: '📅 Browse Open Events', url: '/events' }),
          ],
        };
      }
    }

    // Aspect 1: WHERE / LOCATION / VENUE
    const isLocationQuery =
      cleanQuery.includes('where') ||
      cleanQuery.includes('location') ||
      cleanQuery.includes('venue') ||
      cleanQuery.includes('place') ||
      cleanQuery.includes('room') ||
      cleanQuery.includes('hall') ||
      cleanQuery.includes('auditorium') ||
      cleanQuery.includes('campus') ||
      cleanQuery.includes('organised') ||
      cleanQuery.includes('organized') ||
      cleanQuery.includes('held') ||
      cleanQuery.includes('offline');

    if (isLocationQuery) {
      const locationVerb = evt.status === 'completed' ? 'took place at' : 'will take place at';
      const text = `📍 **Venue & Location for ${titleLabel}:**\n\n` +
        `**${evt.title}** ${locationVerb} **${venue}** on the Chandigarh University campus.\n\n` +
        `• 🗓️ **Date:** ${dateFormatted}\n` +
        `• ⏰ **Time:** ${timeFormatted || 'Schedule to be notified'}\n` +
        `• 🎟️ **Registration:** ${isRegOpen ? '🟢 Open Now' : '🔴 Closed'}` +
        (remaining !== null ? `\n• 💺 **Capacity:** ${remaining} seats remaining (${maxReg} total)` : '');

      return {
        text: scrubPii(text),
        suggestions: [],
        actionLinks,
      };
    }

    // Aspect 2: CAPACITY / SEATS LEFT / AVAILABILITY
    const isCapacityQuery =
      cleanQuery.includes('capacity') ||
      cleanQuery.includes('seat') ||
      cleanQuery.includes('seats') ||
      cleanQuery.includes('slot') ||
      cleanQuery.includes('slots') ||
      cleanQuery.includes('how many can') ||
      cleanQuery.includes('how many participants') ||
      cleanQuery.includes('how many students') ||
      cleanQuery.includes('availability') ||
      cleanQuery.includes('remaining');

    if (isCapacityQuery) {
      const text = `💺 **Seat Capacity for ${titleLabel}:**\n\n` +
        (maxReg !== null
          ? `• 🎯 **Total Seat Capacity:** **${maxReg} seats**\n` +
            `• 👥 **Currently Registered:** **${registered} participants**\n` +
            `• 🟢 **Seats Remaining:** **${remaining} seats available**\n\n`
          : `• 🎯 **Total Capacity:** Open capacity (no hard limit)\n\n`) +
        (isRegOpen
          ? `Registration is currently **Open**! You can reserve your seat directly via the event registration form.`
          : `Registration is currently **Closed**.`);

      return {
        text: scrubPii(text),
        suggestions: [],
        actionLinks,
      };
    }

    // Aspect 3: TEAM SIZE / FORMAT (SOLO VS TEAM)
    const isTeamFormatQuery =
      cleanQuery.includes('team size') ||
      cleanQuery.includes('team or') ||
      cleanQuery.includes('solo or') ||
      cleanQuery.includes('individual or') ||
      cleanQuery.includes('solo') ||
      cleanQuery.includes('individual') ||
      cleanQuery.includes('team members') ||
      cleanQuery.includes('how many members') ||
      cleanQuery.includes('group size') ||
      cleanQuery.includes('participate alone') ||
      cleanQuery.includes('format');

    if (isTeamFormatQuery) {
      let text = '';
      if (evt.supports_teams) {
        text = `👥 **Participation Format for ${titleLabel}:**\n\n` +
          `This is a **Team Event**! 🎉\n` +
          `• **Team Size:** Up to **${evt.max_team_size || 4} members** per team.\n` +
          `• **Registration Method:** The Team Leader registers first and receives a unique Team Code. Teammates then join by selecting "Join Existing Team" and entering the code.\n` +
          `• **Solo Registration:** Solo participants are also welcome to register.`;
      } else {
        text = `👥 **Participation Format for ${titleLabel}:**\n\n` +
          `**${evt.title}** is strictly an **Individual (Solo)** participation event.\n` +
          `• **Team Size:** 1 participant per registration.\n` +
          `• **Passes:** Each registered student receives their personal verified entry pass via email.`;
      }

      return {
        text: scrubPii(text),
        suggestions: [],
        actionLinks,
      };
    }

    // Aspect 4: REGISTRATION DATES / DEADLINE / WINDOW
    const isRegDatesQuery =
      cleanQuery.includes('registration date') ||
      cleanQuery.includes('register date') ||
      cleanQuery.includes('deadline') ||
      cleanQuery.includes('last date') ||
      cleanQuery.includes('last day') ||
      cleanQuery.includes('till when') ||
      cleanQuery.includes('until when') ||
      cleanQuery.includes('registration open') ||
      cleanQuery.includes('registration close') ||
      cleanQuery.includes('apply date') ||
      cleanQuery.includes('when can i register') ||
      cleanQuery.includes('is registration open');

    if (isRegDatesQuery) {
      const regStart = evt.registration_start ? formatEventDate(evt.registration_start) : 'Open';
      const regEnd = evt.registration_end ? formatEventDate(evt.registration_end) : 'Until seats fill';
      const text = `🎟️ **Registration Details for ${titleLabel}:**\n\n` +
        `• 🟢 **Registration Window:** ${regStart} – ${regEnd}\n` +
        `• 📌 **Current Status:** ${isRegOpen ? '🟢 **Registration is Open!**' : '🔴 **Registration is Closed**'}\n` +
        `• 👥 **Format:** ${evt.supports_teams ? `Team Event (${evt.max_team_size || 4} members)` : 'Individual Pass'}\n` +
        `• 💺 **Capacity:** ${maxReg ? `${maxReg} total seats` : 'Open capacity'}`;

      return {
        text: scrubPii(text),
        suggestions: [],
        actionLinks,
      };
    }

    // Aspect 5: TIME / TIMING
    const isTimeQuery =
      cleanQuery.includes('time') ||
      cleanQuery.includes('timing') ||
      cleanQuery.includes('timings') ||
      cleanQuery.includes('clock') ||
      cleanQuery.includes('what time') ||
      cleanQuery.includes('start time') ||
      cleanQuery.includes('end time');

    if (isTimeQuery) {
      const timeStr = evt.start_time ? formatEventTime(evt.start_time) : 'Schedule TBA';
      const endTimeStr = evt.end_time ? ` to ${formatEventTime(evt.end_time)}` : '';
      const timeVerb = evt.status === 'completed' ? 'The event was held at' : 'The event begins at';
      const text = `⏰ **Timing for ${titleLabel}:**\n\n` +
        `${timeVerb} **${timeStr}${endTimeStr}** on **${dateFormatted}**.\n\n` +
        `• 📍 **Venue:** ${venue}\n` +
        `• 🎟️ **Registration:** ${isRegOpen ? 'Open Now' : 'Closed'}`;

      return {
        text: scrubPii(text),
        suggestions: [],
        actionLinks,
      };
    }

    // Aspect 6: DATE / WHEN / SCHEDULE
    const isDateQuery =
      cleanQuery.includes('when') ||
      cleanQuery.includes('date') ||
      cleanQuery.includes('day') ||
      cleanQuery.includes('schedule') ||
      cleanQuery.includes('which day') ||
      cleanQuery.includes('what date');

    if (isDateQuery) {
      const dateVerb = evt.status === 'completed' ? 'was held on' : 'is scheduled for';
      const text = `🗓️ **Schedule & Date for ${titleLabel}:**\n\n` +
        `**${evt.title}** ${dateVerb} **${dateFormatted}**${timeFormatted ? ` at **${timeFormatted}**` : ''}.\n\n` +
        `• 📍 **Venue:** ${venue}\n` +
        `• 🎟️ **Registration:** ${isRegOpen ? 'Open Now' : 'Closed'}`;

      return {
        text: scrubPii(text),
        suggestions: [],
        actionLinks,
      };
    }

    // Aspect 7: RULES & ELIGIBILITY
    const isRulesQuery =
      cleanQuery.includes('rule') ||
      cleanQuery.includes('rules') ||
      cleanQuery.includes('eligible') ||
      cleanQuery.includes('eligibility') ||
      cleanQuery.includes('requirement') ||
      cleanQuery.includes('requirements') ||
      cleanQuery.includes('guidelines') ||
      cleanQuery.includes('who can participate') ||
      cleanQuery.includes('criteria');

    if (isRulesQuery) {
      let text = `📋 **Rules & Eligibility for ${titleLabel}:**\n\n`;
      if (evt.rules) {
        const cleanRules = evt.rules.split('\n').slice(0, 10).join('\n');
        text += `${cleanRules}\n\n`;
      } else {
        text += `• Open to all Chandigarh University students.\n` +
          `• Official university email ID is required for registration.\n` +
          `• Please bring your University ID card to the venue.\n\n`;
      }
      text += `You can view complete registration instructions and guidelines on the event page.`;

      return {
        text: scrubPii(text),
        suggestions: [],
        actionLinks,
      };
    }

    // Aspect 8: GENERAL / ALL DETAILS
    const statusLabel =
      evt.status === 'live'
        ? '🟢 Currently Live & Ongoing'
        : evt.status === 'upcoming'
        ? '🗓️ Upcoming Event'
        : '🏁 Event Completed';
    const regStatus = isRegOpen
      ? evt.supports_teams
        ? 'Open (Team & Solo Registrations)'
        : 'Open (Individual Passes)'
      : 'Registration Closed';

    let text = `Here are the details for **${titleLabel}**:\n\n` +
      `• 📌 **Status:** ${statusLabel}\n` +
      `• 🗓️ **Date & Time:** ${dateFormatted}${timeFormatted ? ` at ${timeFormatted}` : ''}\n` +
      `• 📍 **Venue / Location:** ${venue}\n` +
      `• 👥 **Participation Format:** ${evt.supports_teams ? `Team Event (Up to ${evt.max_team_size || 4} members)` : 'Individual (Solo)'}\n` +
      `• 🎟️ **Registration:** ${regStatus}` +
      (evt.registration_end ? ` (Deadline: ${formatEventDate(evt.registration_end)})` : '') + '\n' +
      (maxReg !== null ? `• 💺 **Capacity:** ${remaining !== null ? `${remaining} / ${maxReg} seats available` : `${maxReg} total seats`}\n` : '');

    if (evt.description) {
      const cleanDesc = evt.description.replace(/\n+/g, ' ').trim();
      text += `\n${cleanDesc.length > 220 ? cleanDesc.slice(0, 220) + '...' : cleanDesc}\n`;
    }

    return {
      text: scrubPii(text),
      suggestions: [],
      actionLinks,
    };
  }

  // -------------------------------------------------------------
  // 2. HACKATHONS / COMPETITIONS LIST QUERY
  // -------------------------------------------------------------
  if (
    cleanQuery.includes('hackathon') ||
    cleanQuery.includes('coding competition') ||
    cleanQuery.includes('stack sprint') ||
    cleanQuery.includes('elevate')
  ) {
    const hackathons = validEvents.filter(
      (e) =>
        (e.category && e.category.toLowerCase().includes('hackathon')) ||
        e.supports_teams ||
        e.title.toLowerCase().includes('hackathon') ||
        e.title.toLowerCase().includes('sprint') ||
        e.title.toLowerCase().includes('elevate')
    );

    if (hackathons.length > 0) {
      let text = `Here are the premier hackathons and coding competitions organized by Cloud Stack Club:\n\n`;
      text += hackathons
        .map((h) => {
          const statusBadge = h.status === 'live' ? '🟢 Live' : h.status === 'upcoming' ? '🗓️ Upcoming' : '🏁 Completed';
          return `🏆 **${h.title}** (${statusBadge})\n• 🗓️ **Date:** ${formatEventDate(h.date)}\n• 👥 **Format:** ${h.supports_teams ? `Team Event (Up to ${h.max_team_size || 4} members)` : 'Individual / Open'}\n• 🎟️ **Registration:** ${h.registration_enabled ? 'Open Now' : 'Closed'}`;
        })
        .join('\n\n');

      const topActive = hackathons.find((h) => h.status === 'live' || h.status === 'upcoming') || hackathons[0];
      const actionLinks: BotActionLink[] = [
        { label: `View ${topActive.title}`, url: `/events/${topActive.slug || topActive.id}` },
        { label: '📅 Browse All Events', url: '/events' },
      ];

      return {
        text: scrubPii(text),
        suggestions: [],
        actionLinks,
      };
    }
  }

  // C. Upcoming / Live Events query
  const isUpcomingQuery =
    cleanQuery.includes('upcoming') ||
    cleanQuery.includes('next event') ||
    cleanQuery.includes('what is the next') ||
    cleanQuery.includes('current event') ||
    cleanQuery.includes('latest event') ||
    cleanQuery.includes('when is event') ||
    cleanQuery.includes('upcoming workshop') ||
    (cleanQuery.includes('event') &&
      (cleanQuery.includes('what') ||
        cleanQuery.includes('when') ||
        cleanQuery.includes('which') ||
        cleanQuery.includes('any')));

  if (isUpcomingQuery) {
    const liveOrUpcoming = validEvents
      .filter((e) => e.status === 'live' || e.status === 'upcoming')
      .sort((a, b) => (new Date(a.date || '').getTime() || 0) - (new Date(b.date || '').getTime() || 0));

    if (liveOrUpcoming.length > 0) {
      const top = liveOrUpcoming[0];
      const dateFormatted = formatEventDate(top.date);
      const timeFormatted = top.start_time ? formatEventTime(top.start_time) : '';
      const venueFormatted = top.location ? `\n• 📍 **Venue:** ${top.location}` : '';
      const regStatus = top.registration_enabled
        ? top.supports_teams
          ? 'Open (Solo & Team Registration)'
          : 'Open (Individual Passes)'
        : 'Registration Closed';
      const eventUrl = `/events/${top.slug || top.id}`;

      let text = `Here is the upcoming event at Cloud Stack Club:\n\n🎉 **${top.title}**\n• 🗓️ **Date:** ${dateFormatted}${timeFormatted ? ` at ${timeFormatted}` : ''}${venueFormatted}\n• 🎟️ **Registration:** ${regStatus}`;

      if (top.description) {
        const cleanDesc = top.description.replace(/\n+/g, ' ').trim();
        text += `\n\n${cleanDesc.length > 180 ? cleanDesc.slice(0, 180) + '...' : cleanDesc}`;
      }

      if (liveOrUpcoming.length > 1) {
        const second = liveOrUpcoming[1];
        text += `\n\n*Also upcoming:* **${second.title}** (${formatEventDate(second.date)}).`;
      }

      const actionLinks: BotActionLink[] = [];
      if (top.registration_enabled) {
        actionLinks.push({ label: `🎟️ Register for ${top.title}`, url: `/events/${top.slug || top.id}/register` });
      }
      actionLinks.push({ label: `View ${top.title}`, url: eventUrl });
      actionLinks.push({ label: 'Browse All Events', url: '/events' });

      return {
        text: scrubPii(text),
        suggestions: [],
        actionLinks,
      };
    } else {
      return {
        text: `There are currently no active upcoming events scheduled right now. Our team is actively planning exciting hands-on workshops and hackathons! You can browse past events and gallery highlights below:`,
        suggestions: [],
        actionLinks: [
          { label: '📅 Browse Events', url: '/events' },
          { label: '📸 View Event Gallery', url: '/gallery' },
          { label: '🚀 Apply to Join Club', url: '/join' },
        ],
      };
    }
  }

  // D. Past / Completed Events query
  const isPastQuery =
    cleanQuery.includes('past event') ||
    cleanQuery.includes('previous event') ||
    cleanQuery.includes('completed event') ||
    cleanQuery.includes('earlier event') ||
    cleanQuery.includes('last event') ||
    cleanQuery.includes('old event') ||
    cleanQuery.includes('past workshop') ||
    cleanQuery.includes('previous workshop') ||
    cleanQuery.includes('completed workshop') ||
    cleanQuery.includes('earlier workshop') ||
    cleanQuery.includes('past hackathon') ||
    cleanQuery.includes('previous hackathon') ||
    cleanQuery.includes('what events happened') ||
    cleanQuery.includes('events conducted') ||
    cleanQuery.includes('did club conduct') ||
    cleanQuery.includes('club conduct') ||
    cleanQuery.includes('events organized') ||
    cleanQuery.includes('events held') ||
    cleanQuery.includes('events so far') ||
    cleanQuery.includes('history of events') ||
    cleanQuery.includes('previous activities') ||
    cleanQuery.includes('past activities') ||
    ((cleanQuery.includes('past') || cleanQuery.includes('previous') || cleanQuery.includes('earlier') || cleanQuery.includes('history')) &&
      (cleanQuery.includes('event') || cleanQuery.includes('workshop') || cleanQuery.includes('session') || cleanQuery.includes('hackathon')));

  if (isPastQuery) {
    const past = validEvents
      .filter((e) => e.status === 'completed')
      .sort((a, b) => (new Date(b.date || '').getTime() || 0) - (new Date(a.date || '').getTime() || 0));

    if (past.length > 0) {
      let text = `Here are the major completed events and workshops organized by Cloud Stack Club:\n\n`;
      text += past
        .slice(0, 5)
        .map((p) => {
          const format = p.supports_teams ? `Team Event (Up to ${p.max_team_size || 4} members)` : 'Individual / Open';
          return `🏆 **${p.title}**\n• 🗓️ **Date:** ${formatEventDate(p.date)}\n• 📍 **Venue:** ${p.location || 'Chandigarh University'}\n• 👥 **Format:** ${format}`;
        })
        .join('\n\n');
      text += `\n\nYou can explore photo albums, project highlights, and memories in our official Event Gallery!`;

      return {
        text: scrubPii(text),
        suggestions: [],
        actionLinks: [
          { label: '📸 View Event Gallery', url: '/gallery' },
          { label: '📅 Browse All Events', url: '/events' },
        ],
      };
    }
  }

  return null;
};

/**
 * Extracts action buttons from markdown links and known routes in text
 */
export const extractActionLinksFromText = (text: string): BotActionLink[] => {
  const links: BotActionLink[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRegex.exec(text)) !== null) {
    const rawLabel = match[1].replace(/^[^\w\s]+/g, '').trim();
    const url = match[2].trim();
    if (!links.some((l) => l.url === url)) {
      links.push({ label: rawLabel || 'View Link', url });
    }
  }

  // If no markdown links, search for raw route paths
  if (links.length === 0) {
    if (text.includes('/join')) links.push({ label: 'Apply to Join Club', url: '/join' });
    if (text.includes('/events')) links.push({ label: 'Browse Events', url: '/events' });
    if (text.includes('/team')) links.push({ label: 'Meet the Team', url: '/team' });
    if (text.includes('/contact')) links.push({ label: 'Contact Us', url: '/contact' });
    if (text.includes('/gallery')) links.push({ label: 'View Gallery', url: '/gallery' });
  }

  return links;
};

/**
 * Returns contextual action buttons for FAQs based on content and category
 */
export const getActionLinksForFaq = (faq: ChatbotFaq): BotActionLink[] => {
  const explicit = extractActionLinksFromText(faq.answer);
  if (explicit.length > 0) return explicit;

  switch (faq.category) {
    case 'Membership':
      return [
        { label: '🚀 Apply to Join Club', url: '/join' },
        { label: '💬 Contact Us', url: '/contact' },
      ];
    case 'Events':
      return [
        { label: '📅 Browse Events', url: '/events' },
        { label: '🚀 Join Club', url: '/join' },
      ];
    case 'Leadership':
      return [
        { label: '👥 Meet Our Team', url: '/team' },
        { label: '🚀 Join Club', url: '/join' },
      ];
    case 'Contact':
      return [
        { label: '💬 Contact Us', url: '/contact' },
        { label: '📅 Browse Events', url: '/events' },
      ];
    case 'About Club':
    default:
      if (
        faq.id === 'faq-gallery' ||
        faq.question.toLowerCase().includes('gallery') ||
        faq.question.toLowerCase().includes('photo')
      ) {
        return [
          { label: '📸 View Event Gallery', url: '/gallery' },
          { label: '📅 Browse Events', url: '/events' },
        ];
      }
      return [
        { label: '🚀 Apply to Join Club', url: '/join' },
        { label: '📅 Browse Events', url: '/events' },
      ];
  }
};

/**
 * Detects if a query contains specific club/university domain keywords
 * to ensure club inquiries (e.g. "Good morning, who is the president?")
 * are not intercepted as generic small talk.
 */
const hasClubInquiryKeywords = (q: string): boolean => {
  const keywords = [
    'president', 'vice', 'secretary', 'treasurer', 'lead', 'member',
    'core', 'team', 'coordinator', 'executive', 'founder',
    'event', 'hackathon', 'workshop', 'webinar', 'bootcamp', 'session',
    'elevate', 'stack sprint', 'orbit', 'certification', 'industrial',
    'join', 'register', 'registration', 'apply', 'recruitment', 'membership',
    'fee', 'cost', 'charge', 'paid', 'price',
    'cert', 'certificate', 'attendance', 'discrepancy',
    'domain', 'department', 'track', 'cloud computing', 'devops', 'full stack',
    'notice', 'announcement', 'news', 'update',
    'gallery', 'photo', 'video',
    'venue', 'location', 'timing', 'time', 'date', 'campus', 'offline',
    'team code', 'solo',
    'eligible', 'eligibility', '1st year', 'first year', 'fresher', 'branch',
    'selection', 'interview', 'shortlist',
    'contact', 'email', 'ticket', 'phone', 'reach'
  ];
  return keywords.some((kw) => q.includes(kw));
};

const stripConversationalFiller = (q: string): string => {
  return q
    .replace(/\b(bot|assistant|csc|cloud stack club|everyone|all|there|friend|bro|sir|mam|maam|team)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Natural Conversational & Daily Life Intelligence Engine:
 * Handles greetings, pleasantries, well-wishing, time-of-day greetings,
 * gratitude, small talk, courtesies, humor, and bot identity.
 */
export const resolveDailyLifeQuery = (
  cleanQuery: string,
  faqs: ChatbotFaq[]
): BotResolvedResponse | null => {
  const isBotIdentityQuery =
    cleanQuery.includes('who are you') ||
    cleanQuery.includes('what are you') ||
    cleanQuery.includes('your name') ||
    cleanQuery.includes('who made you') ||
    cleanQuery.includes('who created you') ||
    cleanQuery.includes('who developed you') ||
    cleanQuery.includes('what can you do') ||
    cleanQuery.includes('are you a bot') ||
    cleanQuery.includes('are you ai') ||
    cleanQuery.includes('are you human') ||
    cleanQuery.includes('are you real');

  // If query contains club inquiry keywords and is not a bot persona query, let club engines handle it
  if (!isBotIdentityQuery && hasClubInquiryKeywords(cleanQuery)) {
    return null;
  }

  const defaultSuggestions = faqs.length > 0 ? faqs.slice(0, 3) : [];
  const greetingActions: BotActionLink[] = [
    { label: '🚀 Apply to Join', url: '/join' },
    { label: '📅 Browse Events', url: '/events' },
  ];

  // 1. Bot Identity & Purpose
  if (
    cleanQuery.includes('who are you') ||
    cleanQuery.includes('what are you') ||
    cleanQuery.includes('your name') ||
    cleanQuery.includes('who r u') ||
    cleanQuery.includes('introduce yourself')
  ) {
    return {
      text: `I am the official **Cloud Stack Club Virtual Assistant**! 🤖\n\nI'm here to help Chandigarh University students explore:\n• **Upcoming Hackathons & Bootcamps** (Elevate-X, Stack Sprint, workshops)\n• **Club Membership & Eligibility** for all branches and years\n• **Core Leadership** (President, Vice President, Leads)\n• **Domain Tracks** (Cloud, DevOps, Full Stack, AI/ML, UI/UX, Media)\n• **Official Support & Certificates**\n\nHow can I help you today?`,
      suggestions: defaultSuggestions,
      actionLinks: greetingActions,
    };
  }

  // 2. Creator / Origin
  if (
    cleanQuery.includes('who made you') ||
    cleanQuery.includes('who created you') ||
    cleanQuery.includes('who developed you') ||
    cleanQuery.includes('who is your creator') ||
    cleanQuery.includes('who built you') ||
    cleanQuery.includes('who designed you')
  ) {
    return {
      text: `I was built by the technical team at **Cloud Stack Club**, Chandigarh University! 🚀 Designed to provide students with fast, verified information on club activities, hackathons, and technology tracks.`,
      suggestions: defaultSuggestions,
      actionLinks: [
        { label: '👥 Meet Our Team', url: '/team' },
        { label: '🚀 Apply to Join', url: '/join' },
      ],
    };
  }

  // 3. AI / Bot Status
  if (
    cleanQuery.includes('are you real') ||
    cleanQuery.includes('are you human') ||
    cleanQuery.includes('are you a bot') ||
    cleanQuery.includes('are you ai') ||
    cleanQuery.includes('are you a robot') ||
    cleanQuery.includes('are u bot')
  ) {
    return {
      text: `I'm the virtual AI assistant for Cloud Stack Club! 🤖 While I'm powered by code and club data, I'm managed by our real student leadership team. If you'd like to chat with our real coordinators, feel free to visit our Contact page!`,
      suggestions: defaultSuggestions,
      actionLinks: [
        { label: '💬 Contact Coordinators', url: '/query' },
        { label: '👥 Meet Our Team', url: '/team' },
      ],
    };
  }

  // 4. Compliments & Praise
  if (
    cleanQuery.includes('good bot') ||
    cleanQuery.includes('best bot') ||
    cleanQuery.includes('you are smart') ||
    cleanQuery.includes('you are awesome') ||
    cleanQuery.includes('you are great') ||
    cleanQuery.includes('you are helpful') ||
    cleanQuery.includes('nice bot') ||
    cleanQuery.includes('love you') ||
    cleanQuery.includes('great job') ||
    cleanQuery.includes('well done')
  ) {
    return {
      text: `Thank you so much for the kind words! ❤️ I'm always here to help you navigate Cloud Stack Club and make the most out of university tech events!`,
      suggestions: [],
      actionLinks: [],
    };
  }

  const stripped = stripConversationalFiller(cleanQuery);
  const q = stripped || cleanQuery;

  // 5. Time-of-day Greetings
  if (
    q === 'good morning' ||
    q === 'gm' ||
    q.startsWith('good morning') ||
    q === 'morning'
  ) {
    return {
      text: `Good morning! ☀️ Wishing you a productive and wonderful day ahead! How can I assist you with Cloud Stack Club today?`,
      suggestions: defaultSuggestions,
      actionLinks: greetingActions,
    };
  }

  if (
    q === 'good afternoon' ||
    q.startsWith('good afternoon') ||
    q === 'afternoon'
  ) {
    return {
      text: `Good afternoon! 🌤️ Hope your day is going great! What can I help you with regarding Cloud Stack Club?`,
      suggestions: defaultSuggestions,
      actionLinks: greetingActions,
    };
  }

  if (
    q === 'good evening' ||
    q.startsWith('good evening') ||
    q === 'evening'
  ) {
    return {
      text: `Good evening! 🌆 Hope you had a fulfilling day. How can I assist you tonight with Cloud Stack Club?`,
      suggestions: defaultSuggestions,
      actionLinks: greetingActions,
    };
  }

  if (
    q === 'good night' ||
    q === 'gn' ||
    q.startsWith('good night') ||
    q.includes('sweet dreams') ||
    q.includes('sleep well')
  ) {
    return {
      text: `Good night! 🌙 Wishing you a peaceful and restful sleep. Feel free to reach out anytime tomorrow if you need info on events or club membership!`,
      suggestions: [],
      actionLinks: [],
    };
  }

  // 6. Standard Salutations & Greetings
  const greetingWords = [
    'hi', 'hello', 'hey', 'heyy', 'heyyy', 'hola', 'namaste',
    'yo', 'wassup', 'what s up', 'whats up', 'sup', 'greetings', 'howdy'
  ];
  if (
    greetingWords.includes(q) ||
    greetingWords.some((g) => q === g || q.startsWith(g + ' '))
  ) {
    return {
      text: `Hello there! 👋 Great to have you here. I'm the Cloud Stack Club Assistant. How can I assist you today? You can ask about our upcoming hackathons, how to join the club, our core team, or domain tracks!`,
      suggestions: defaultSuggestions,
      actionLinks: greetingActions,
    };
  }

  // 7. Wellbeing Check-ins ("How are you")
  if (
    q.includes('how are you') ||
    q.includes('how r u') ||
    q.includes('hows it going') ||
    q.includes('how is it going') ||
    q.includes('how is everything') ||
    q.includes('how do you do') ||
    q.includes('how you doing') ||
    q.includes('are you doing well') ||
    q.includes('hope you are doing well') ||
    q.includes('whats new') ||
    q.includes('what is new')
  ) {
    return {
      text: `I'm doing fantastic, thank you for asking! 😊 Ready to help you with anything about Cloud Stack Club — whether it's club membership, upcoming workshops, hackathons, or meeting our team. How are you doing today?`,
      suggestions: defaultSuggestions,
      actionLinks: greetingActions,
    };
  }

  // 8. User Condition ("I'm good", "Doing well")
  if (
    q === 'i am good' ||
    q === 'im good' ||
    q === 'i am fine' ||
    q === 'im fine' ||
    q === 'doing good' ||
    q === 'doing well' ||
    q === 'good' ||
    q === 'all good' ||
    q === 'great'
  ) {
    return {
      text: `Glad to hear that! 😊 What would you like to explore today? You can check out our upcoming events, leadership team, or membership details.`,
      suggestions: defaultSuggestions,
      actionLinks: greetingActions,
    };
  }

  // 9. Gratitude & Appreciation
  if (
    q.includes('thank') ||
    q.includes('thanks') ||
    q === 'thx' ||
    q === 'ty' ||
    q === 'tysm' ||
    q.includes('appreciate it') ||
    q.includes('much appreciated') ||
    q.includes('grateful')
  ) {
    return {
      text: `You're very welcome! 😊 Always happy to help. Let me know if you need anything else about Cloud Stack Club!`,
      suggestions: [],
      actionLinks: [],
    };
  }

  // 10. Courtesies ("You're welcome", "No problem")
  if (
    q.includes('you are welcome') ||
    q.includes('youre welcome') ||
    q.includes('your welcome') ||
    q.includes('my pleasure') ||
    q.includes('no problem') ||
    q.includes('no worries') ||
    q === 'np'
  ) {
    return {
      text: `Appreciate your kindness! Let me know if there's anything else you'd like to explore about the club. 🚀`,
      suggestions: [],
      actionLinks: [],
    };
  }

  // 11. Goodbyes & Partings
  if (
    q === 'bye' ||
    q === 'goodbye' ||
    q === 'bye bye' ||
    q === 'byebye' ||
    q.startsWith('see you') ||
    q.startsWith('see ya') ||
    q === 'cya' ||
    q.includes('catch you later') ||
    q.includes('take care') ||
    q.includes('have a nice day') ||
    q.includes('have a good day') ||
    q.includes('have a great day')
  ) {
    return {
      text: `Goodbye! 👋 Have a wonderful day ahead! Whenever you're ready to learn cloud computing, participate in hackathons, or meet the community, Cloud Stack Club is here for you. Take care!`,
      suggestions: [],
      actionLinks: [],
    };
  }

  // 12. Affirmations & Acknowledgements
  const affirmations = [
    'ok', 'okay', 'k', 'alright', 'got it', 'understood',
    'sure', 'yep', 'yeah', 'yes', 'cool', 'nice', 'awesome',
    'superb', 'perfect', 'sounds good', 'fine'
  ];
  if (affirmations.includes(q)) {
    return {
      text: `Awesome! 👍 Feel free to ask anytime if you want to know about our events, joining the club, or learning cloud & DevOps with us!`,
      suggestions: [],
      actionLinks: [],
    };
  }

  // 13. Apologies
  if (
    q === 'sorry' ||
    q.startsWith('sorry') ||
    q.includes('my bad') ||
    q.includes('excuse me') ||
    q.includes('apologies')
  ) {
    return {
      text: `No worries at all! 😊 How can I help you today?`,
      suggestions: defaultSuggestions,
      actionLinks: greetingActions,
    };
  }

  // 14. Capabilities / Help
  if (
    q === 'what can you do' ||
    q === 'help me' ||
    q === 'how can you help' ||
    q === 'what do you know' ||
    q === 'help'
  ) {
    return {
      text: `Here is what I can do for you:\n\n• 🚀 **Club Membership:** Find out how to join, who is eligible, and domain tracks.\n• 📅 **Events & Hackathons:** Get live dates, venue details, and registration links for events like Elevate-X.\n• 👥 **Core Team Leads:** Inquire about our President, Vice President, Tech Leads, and coordinators.\n• 📜 **Certificates & Support:** Information on receiving participation certificates and raising discrepancy tickets.`,
      suggestions: defaultSuggestions,
      actionLinks: greetingActions,
    };
  }

  // 15. Humor / Jokes
  if (
    q.includes('joke') ||
    q.includes('make me laugh') ||
    q.includes('funny')
  ) {
    return {
      text: `Why do programmers prefer dark mode? Because light attracts bugs! 🐛💻\n\n(And why do cloud engineers love rain? Because they feel right at home with the clouds! ☁️😄)`,
      suggestions: [],
      actionLinks: [],
    };
  }

  // 16. Weather
  if (q.includes('weather')) {
    return {
      text: `I live in the cloud ☁️, so it's always 100% uptime here! But on campus, it's always a great day to build something cool with Cloud Stack Club. 🚀`,
      suggestions: [],
      actionLinks: [],
    };
  }

  // 17. Bot Age
  if (q.includes('how old are you') || q.includes('your age')) {
    return {
      text: `I'm as fresh as Cloud Stack Club's newest release! Always learning and updated with the latest events and club news. 🚀`,
      suggestions: [],
      actionLinks: [],
    };
  }

  return null;
};

/**
 * High-Intelligence Hybrid Resolver:
 * 1. Security & Privacy Guard (Zero PII leaks, protects contact details & rosters)
 * 2. Real-Time Member Intelligence Engine (Dynamic database lookups for all core roles & members)
 * 3. Real-Time Event Intelligence Engine (Dynamic database lookups for events & hackathons)
 * 4. Natural Conversational & Daily Life Engine (Greetings, small talk, gratitude, bot persona)
 * 5. Club Policy & Membership Intents
 * 6. Custom Admin FAQs & Keyword Tag Matching
 */
export const resolveBotQuery = async (
  userQuery: string,
  faqs: ChatbotFaq[]
): Promise<BotResolvedResponse> => {
  const cleanQ = normalizeText(userQuery);

  // 1. SECURITY & PRIVACY GUARD (Strict, zero leaks)
  const securityViolation = checkSecurityPrivacyViolation(cleanQ);
  if (securityViolation) {
    return {
      text: securityViolation,
      suggestions: faqs.slice(0, 3),
      actionLinks: [
        { label: '👥 Meet Our Team', url: '/team' },
        { label: '💬 Official Contact', url: '/contact' },
      ],
    };
  }

  // 2. DYNAMIC REAL MEMBER & LEADERSHIP ENGINE (Live DB)
  try {
    const coreMembers = await getCoreMembers();
    const memberMatch = resolveMemberQuery(cleanQ, coreMembers);
    if (memberMatch) {
      return memberMatch;
    }
  } catch (err) {
    console.warn('Chatbot real member lookup error:', err);
  }

  // 3. DYNAMIC REAL EVENTS ENGINE (Live DB)
  try {
    const [eventsResult, countsMapResult] = await Promise.allSettled([
      getEvents(),
      getEventRegistrationCountsMap(),
    ]);

    let events: Event[] = eventsResult.status === 'fulfilled' ? eventsResult.value : [];
    const regCountsMap: Record<string, number> = countsMapResult.status === 'fulfilled' ? countsMapResult.value : {};

    // Direct RPC fallback if events array is empty
    if (!events || events.length === 0) {
      const { data: rpcEvts } = await supabase.rpc('get_public_events');
      if (rpcEvts && Array.isArray(rpcEvts)) {
        events = rpcEvts as Event[];
      }
    }

    const eventMatch = resolveDynamicEventQuery(cleanQ, events, regCountsMap);
    if (eventMatch) {
      return eventMatch;
    }
  } catch (err) {
    console.warn('Chatbot real event lookup error:', err);
  }

  // 4. NATURAL CONVERSATIONAL & DAILY LIFE ENGINE
  const dailyLifeMatch = resolveDailyLifeQuery(cleanQ, faqs);
  if (dailyLifeMatch) {
    return dailyLifeMatch;
  }

  // 4. JOIN / MEMBERSHIP INTENT
  const isJoinIntent =
    cleanQ.includes('how can i join') ||
    cleanQ.includes('how to join') ||
    cleanQ.includes('join club') ||
    cleanQ.includes('join csc') ||
    cleanQ.includes('membership') ||
    cleanQ.includes('apply for club') ||
    cleanQ.includes('member registration') ||
    cleanQ.includes('recruitment') ||
    cleanQ.includes('how to become member') ||
    (cleanQ.includes('join') &&
      (cleanQ.includes('can') || cleanQ.includes('i') || cleanQ.includes('club') || cleanQ.includes('csc')));

  if (isJoinIntent) {
    const text = `You can apply directly through our official membership portal! We welcome enthusiastic Chandigarh University students across all years and branches.\n\n• **Who can apply?** Open to all students interested in Cloud Computing (AWS, GCP, Azure), DevOps, Full Stack Development, AI/ML, UI/UX Design, or Event Management.\n• **Application Steps:** Fill out your university UID, contact details, domain of choice, and submit. You will receive email updates on your application status.\n\nHave questions? You can also reach our leadership team anytime.`;

    return {
      text,
      suggestions: faqs.filter((f) => f.category === 'Membership' || f.category === 'About Club').slice(0, 3),
      actionLinks: [
        { label: '🚀 Apply to Join Club', url: '/join' },
        { label: '💬 Contact Us', url: '/contact' },
      ],
    };
  }

  // 4. NOTICES & ANNOUNCEMENTS INTENT
  const isNoticeIntent =
    cleanQ.includes('notice') ||
    cleanQ.includes('announcement') ||
    cleanQ.includes('news') ||
    cleanQ.includes('updates');

  if (isNoticeIntent) {
    try {
      const notices = await getActiveNotices();
      if (notices && notices.length > 0) {
        let text = `Here are the latest live notices from Cloud Stack Club:\n\n`;
        text += notices
          .map(
            (n) =>
              `📢 **${n.title}**${n.content ? `\n${n.content}` : ''}${
                n.link_url ? `\n[${n.link_text || 'View Link'}](${n.link_url})` : ''
              }`
          )
          .join('\n\n');

        return {
          text,
          suggestions: faqs.slice(0, 3),
          actionLinks: extractActionLinksFromText(text),
        };
      } else {
        return {
          text: `There are currently no urgent announcements or notices. All club activities and workshops are operating normally!`,
          suggestions: faqs.slice(0, 3),
          actionLinks: [
            { label: '📅 Browse Events', url: '/events' },
            { label: '🚀 Join Club', url: '/join' },
          ],
        };
      }
    } catch (err) {
      console.warn('Chatbot notices lookup error:', err);
    }
  }

  // 5. CONTACT & DISCREPANCY INTENT
  const isContactIntent =
    cleanQ.includes('contact') ||
    cleanQ.includes('reach') ||
    cleanQ.includes('email') ||
    cleanQ.includes('phone') ||
    cleanQ.includes('ticket') ||
    cleanQ.includes('discrepancy') ||
    cleanQ.includes('issue') ||
    cleanQ.includes('complaint') ||
    cleanQ.includes('help');

  if (isContactIntent) {
    return {
      text: `You can reach our coordinators or raise a formal support query:\n\n• **General Inquiries:** Reach out via our contact page for collaborations, questions, and partnerships.\n• **Discrepancies:** If you are facing issues in joining our club due to any reason like membership in other clubs, please raise a issue in Discrepancies form.\n\nOur administrative team reviews every submission promptly.`,
      suggestions: faqs.slice(0, 3),
      actionLinks: [
        { label: '💬 Contact Coordinators', url: '/query' },
        { label: '🎫 Submit Ticket', url: '/contact' },
      ],
    };
  }

  // 6. FEES / PRICING / FREE INTENT
  const isFreeFeesIntent =
    cleanQ.includes('fee') ||
    cleanQ.includes('cost') ||
    cleanQ.includes('free') ||
    cleanQ.includes('charges') ||
    cleanQ.includes('paid') ||
    cleanQ.includes('price') ||
    cleanQ.includes('paise') ||
    cleanQ.includes('how much');

  if (isFreeFeesIntent) {
    return {
      text: `Joining Cloud Stack Club is **100% Free**! 🎉\n\nThere are no membership charges, subscriptions, or hidden dues. Regular workshops, certification study jams, and community sessions are hosted free of cost for university students.`,
      suggestions: faqs.filter((f) => f.category === 'Membership').slice(0, 3),
      actionLinks: [
        { label: '🚀 Apply for Free', url: '/join' },
        { label: '📅 Browse Events', url: '/events' },
      ],
    };
  }

  // 7. ELIGIBILITY / 1ST YEAR / FRESHERS / BRANCH INTENT
  const isEligibilityIntent =
    cleanQ.includes('eligible') ||
    cleanQ.includes('eligibility') ||
    cleanQ.includes('1st year') ||
    cleanQ.includes('first year') ||
    cleanQ.includes('freshers') ||
    cleanQ.includes('who can apply') ||
    cleanQ.includes('who can join') ||
    cleanQ.includes('which branch') ||
    cleanQ.includes('non cse');

  if (isEligibilityIntent) {
    return {
      text: `**Yes, absolutely!** Cloud Stack Club is open to students across **all years** (1st, 2nd, 3rd, and 4th year) and **all branches** (CSE, AIT, IT, ECE, Mechanical, etc.) at Chandigarh University.\n\nWhether you are a fresher taking your first steps into coding or an experienced developer, our mentorship programs and bootcamps are tailored to help you build real-world skills.`,
      suggestions: faqs.filter((f) => f.category === 'Membership').slice(0, 3),
      actionLinks: [
        { label: '🚀 Apply for Membership', url: '/join' },
        { label: '📅 View Events', url: '/events' },
      ],
    };
  }

  // 8. SELECTION PROCESS & TIMELINE INTENT
  const isSelectionIntent =
    cleanQ.includes('selection') ||
    cleanQ.includes('interview') ||
    cleanQ.includes('screening') ||
    cleanQ.includes('after apply') ||
    cleanQ.includes('shortlist') ||
    cleanQ.includes('when results') ||
    cleanQ.includes('how selected');

  if (isSelectionIntent) {
    return {
      text: `Here is what happens after you apply to Cloud Stack Club:\n\n1. **Application Review:** The executive council reviews your application, preferred domain, and motivation.\n2. **Shortlisting & Interaction:** Shortlisted candidates may be invited for an informal technical or behavioral chat.\n3. **Onboarding Email:** Accepted members receive an official acceptance letter with credentials and private invite links to our WhatsApp & Discord communities.`,
      suggestions: faqs.filter((f) => f.category === 'Membership').slice(0, 3),
      actionLinks: [
        { label: '🚀 Apply Now', url: '/join' },
        { label: '💬 Contact Us', url: '/contact' },
      ],
    };
  }

  // 9. TEAM REGISTRATION / HACKATHON TEAMS INTENT
  const isTeamRegIntent =
    cleanQ.includes('team code') ||
    cleanQ.includes('team reg') ||
    cleanQ.includes('register as team') ||
    cleanQ.includes('team size') ||
    cleanQ.includes('solo or team');

  if (isTeamRegIntent) {
    return {
      text: `For hackathons and team-enabled events:\n\n• **Team Leader:** Registers first, chooses 'Team Registration', sets a team name, and receives a unique **Team Code**.\n• **Team Members:** Select 'Join Existing Team' on the registration modal and enter the Team Code.\n• **Passes:** Once confirmed, individual and team passes are generated and emailed to all members.`,
      suggestions: faqs.filter((f) => f.category === 'Events').slice(0, 3),
      actionLinks: [{ label: '📅 Browse Events', url: '/events' }],
    };
  }

  // 10. NON-MEMBERS ATTENDING EVENTS INTENT
  const isNonMemberIntent =
    cleanQ.includes('non member') ||
    cleanQ.includes('not a member') ||
    cleanQ.includes('can non members') ||
    cleanQ.includes('anyone attend') ||
    cleanQ.includes('can i attend');

  if (isNonMemberIntent) {
    return {
      text: `**Yes, of course!** All workshops, bootcamps, and hackathons (including flagship events like Elevate-X and Stack Sprint) are **open to all university students**.\n\nYou do not have to be an official core member to attend events or earn participation certificates.`,
      suggestions: faqs.filter((f) => f.category === 'Events').slice(0, 3),
      actionLinks: [
        { label: '📅 Browse Events', url: '/events' },
        { label: '🚀 Apply to Join Club', url: '/join' },
      ],
    };
  }

  // 11. TIMINGS & VENUE / LOCATION INTENT
  const isTimingLocationIntent =
    cleanQ.includes('location') ||
    cleanQ.includes('where is club') ||
    cleanQ.includes('timing') ||
    cleanQ.includes('timings') ||
    cleanQ.includes('venue') ||
    cleanQ.includes('offline') ||
    cleanQ.includes('campus') ||
    cleanQ.includes('where meet');

  if (isTimingLocationIntent) {
    return {
      text: `Cloud Stack Club is based at **Chandigarh University** under the Department of Computer Science & Engineering / AIT.\n\n• **Venues:** On-campus computer labs, auditorium halls, or virtual rooms via Google Meet / Discord.\n• **Timings:** Sessions are typically scheduled after class hours (weekday evenings) or on Saturday mornings.`,
      suggestions: faqs.filter((f) => f.category === 'Events' || f.category === 'About Club').slice(0, 3),
      actionLinks: [
        { label: '📅 View Events & Venues', url: '/events' },
        { label: '💬 Contact Coordinators', url: '/query' },
      ],
    };
  }

  // 12. CERTIFICATES & CORRECTION INTENT
  const isCertIntent =
    !cleanQ.includes('certification') &&
    !cleanQ.includes('certified') &&
    (
      ((cleanQ.includes('certificate') ||
        cleanQ.includes('cert ') ||
        cleanQ.endsWith('cert') ||
        cleanQ.includes('participation cert')) &&
        (cleanQ.includes('download') ||
          cleanQ.includes('get') ||
          cleanQ.includes('receive') ||
          cleanQ.includes('how') ||
          cleanQ.includes('when') ||
          cleanQ.includes('where') ||
          cleanQ.includes('find') ||
          cleanQ.includes('wrong') ||
          cleanQ.includes('spelling') ||
          cleanQ.includes('issue') ||
          cleanQ.includes('discrepancy') ||
          cleanQ.includes('missed') ||
          cleanQ.includes('attendance') ||
          cleanQ.includes('collect') ||
          cleanQ.includes('claim') ||
          cleanQ.includes('portal') ||
          cleanQ.includes('verify') ||
          cleanQ.includes('provided') ||
          cleanQ.includes('give') ||
          cleanQ.includes('will i') ||
          cleanQ.includes('do we') ||
          cleanQ.includes('not received') ||
          cleanQ.includes('haven\'t received'))) ||
      cleanQ.includes('wrong name') ||
      cleanQ.includes('attendance issue') ||
      cleanQ.includes('spelling mistake') ||
      cleanQ === 'certificate' ||
      cleanQ === 'certificates' ||
      cleanQ === 'cert'
    );

  if (isCertIntent) {
    return {
      text: `Official participation & merit certificates are digitally verified and emailed to attendees within **3 to 7 working days** after an event.\n\n• **Spelling error or missing certificate?** You can submit an official discrepancy ticket, and our administrative team will review your attendance logs and re-issue your certificate.`,
      suggestions: faqs.filter((f) => f.category === 'Events' || f.category === 'Contact').slice(0, 3),
      actionLinks: [
        { label: '🎫 Submit Discrepancy Ticket', url: '/contact' },
        { label: '📅 View Events', url: '/events' },
      ],
    };
  }

  // 13. DOMAINS & TECH STACK INTENT
  const isDomainIntent =
    cleanQ.includes('domain') ||
    cleanQ.includes('domains') ||
    cleanQ.includes('departments') ||
    cleanQ.includes('what can i learn') ||
    cleanQ.includes('sub division') ||
    cleanQ.includes('tech stack');

  if (isDomainIntent) {
    return {
      text: `Cloud Stack Club offers active tracks across 7 core domains:\n\n☁️ **Cloud Computing:** AWS, Google Cloud, Microsoft Azure architectures.\n⚙️ **DevOps & Linux:** CI/CD pipelines, Docker, Kubernetes, Terraform.\n💻 **Full Stack Development:** Modern React, Node.js, Next.js, Go, Python.\n🤖 **AI & Machine Learning:** Neural networks, LLMs, computer vision, data analysis.\n🎨 **UI/UX Design:** User flows, Figma prototyping, graphic design.\n✍️ **Technical Writing:** Blogs, newsletters, open-source documentation.\n🎯 **Event Operations:** Hackathon execution, sponsorships, social media.`,
      suggestions: faqs.filter((f) => f.category === 'About Club' || f.category === 'Membership').slice(0, 3),
      actionLinks: [
        { label: '🚀 Apply to Join Club', url: '/join' },
        { label: '👥 Meet Our Team', url: '/team' },
      ],
    };
  }

  // 14. GALLERY & PAST MEMORIES INTENT
  const isGalleryIntent =
    cleanQ.includes('gallery') ||
    cleanQ.includes('photo') ||
    cleanQ.includes('picture') ||
    cleanQ.includes('video') ||
    cleanQ.includes('memories') ||
    cleanQ.includes('past event') ||
    cleanQ.includes('highlights');

  if (isGalleryIntent) {
    return {
      text: `Check out our official photo gallery to see memories, hackathon winners, coding bootcamps, and workshop highlights from past events!`,
      suggestions: faqs.filter((f) => f.category === 'About Club' || f.category === 'Events').slice(0, 3),
      actionLinks: [
        { label: '📸 View Event Gallery', url: '/gallery' },
        { label: '📅 Browse Events', url: '/events' },
      ],
    };
  }

  // 15. MATCH CUSTOM ADMIN FAQS (or default FAQs)
  const match = findBestAnswer(userQuery, faqs);
  if (match.faq && match.score >= 35) {
    const text = match.faq.answer;
    const actionLinks = getActionLinksForFaq(match.faq);

    return {
      text,
      suggestions: match.suggestions,
      actionLinks,
    };
  }

  // 16. GENERAL / UNMATCHED FALLBACK
  const fallbackText = `I don't have an exact answer for that yet, but here are the fastest ways to navigate Cloud Stack Club resources:`;

  return {
    text: fallbackText,
    suggestions: match.suggestions.length > 0 ? match.suggestions : faqs.slice(0, 4),
    actionLinks: [
      { label: '🚀 Apply to Join', url: '/join' },
      { label: '📅 Browse Events', url: '/events' },
      { label: '👥 Meet Our Team', url: '/team' },
      { label: '💬 Contact Us', url: '/contact' },
    ],
  };
};
