import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getEvents } from './events';
import { getCoreMembers } from './members';
import { getActiveNotices } from './notices';
import { formatEventDate, formatEventTime } from '../utils/formatters';
import type { ChatbotFaq, ChatbotFaqPayload } from '../types/database';

const CHATBOT_LOCAL_FAQS_KEY = 'csc_chatbot_faqs_cache';

export const DEFAULT_CHATBOT_FAQS: ChatbotFaq[] = [
  {
    id: 'faq-about-csc',
    question: 'What does Cloud Stack Club do?',
    answer:
      'Cloud Stack Club at Chandigarh University is dedicated to hands-on learning in Cloud Computing (AWS, GCP, Azure), DevOps, Full Stack Web Development, AI/ML, and Open Source. We host high-impact workshops, hackathons like Stack Sprint, ideathons like Elevate-X, and industrial certification bootcamps.\n\nReady to get involved?\n• 👉 [Apply to Join the Club](/join)\n• 📅 [Browse Upcoming Events](/events)',
    category: 'About Club',
    keywords: ['what is csc', 'about', 'about club', 'domains', 'cloud', 'devops', 'tech stack', 'purpose', 'aim', 'vision'],
    is_active: true,
    display_order: 1,
  },
  {
    id: 'faq-join-csc',
    question: 'How can I join Cloud Stack Club?',
    answer:
      'You can apply directly through our official membership portal! Click here: [👉 Apply to Join Club](/join) to select your preferred technical or non-technical domain and submit your university UID.\n\nRecruitment drives open during official campus recruitment cycles. Have questions? Reach our team at [💬 Contact Page](/contact).',
    category: 'Membership',
    keywords: ['join', 'how to join', 'membership', 'apply', 'recruit', 'recruitment', 'member application', 'eligibility', 'form'],
    is_active: true,
    display_order: 2,
  },
  {
    id: 'faq-secretary',
    question: 'Who is the Secretary of Cloud Stack Club?',
    answer:
      'The Secretary of Cloud Stack Club is **Lakshay Gosai** (3rd Year, AIT-CSE / FSD). He oversees club operations, administration, and team leadership. You can view his full profile and social links here: [👥 Meet Our Team](/team).',
    category: 'Leadership',
    keywords: ['secretary', 'gen sec', 'general secretary', 'lakshay', 'gosai', 'who is secretary', 'lead', 'head'],
    is_active: true,
    display_order: 3,
  },
  {
    id: 'faq-tech-lead',
    question: 'Who is the Technical Lead of Cloud Stack Club?',
    answer:
      'The Technical Lead of Cloud Stack Club is **Utkrisht Utpal**. He spearheads technical architecture, system development, student coding projects, and platform infrastructure. Check out his profile and projects here: [👥 Meet Our Team](/team).',
    category: 'Leadership',
    keywords: ['technical lead', 'tech lead', 'utkrisht', 'utpal', 'who is tech lead', 'developer lead', 'coding head'],
    is_active: true,
    display_order: 4,
  },
  {
    id: 'faq-faculty',
    question: 'Who are the Faculty Advisors for Cloud Stack Club?',
    answer:
      'Cloud Stack Club is mentored and guided by **Dr. Deepti Sharma** (Faculty Advisor) and **Dr. Navjot Singh** (Co - Faculty Advisor) at Chandigarh University. Learn more in our [👥 Meet Our Team](/team) section.',
    category: 'Leadership',
    keywords: ['faculty', 'advisor', 'faculty advisor', 'deepti', 'navjot', 'mentor', 'professors', 'teachers', 'sir', 'maam'],
    is_active: true,
    display_order: 5,
  },
  {
    id: 'faq-joint-sec',
    question: 'Who is the Joint Secretary?',
    answer:
      'The Joint Secretary of Cloud Stack Club is **Bani Kaur**. She works alongside the Secretary to coordinate team activities, event logistics, and member engagement: [👥 Meet Our Team](/team).',
    category: 'Leadership',
    keywords: ['joint secretary', 'bani', 'kaur', 'who is joint secretary', 'vice lead'],
    is_active: true,
    display_order: 6,
  },
  {
    id: 'faq-events',
    question: 'What events or workshops are happening?',
    answer:
      'We organize workshops, certification challenges, and flagship hackathons like Elevate-X. You can view live upcoming events, active seat availability, and 1-click registration here: [📅 Browse Events Directory](/events).',
    category: 'Events',
    keywords: ['events', 'upcoming events', 'workshops', 'hackathons', 'elevate-x', 'stack sprint', 'register event', 'competitions'],
    is_active: true,
    display_order: 7,
  },
  {
    id: 'faq-certificates',
    question: 'How do I get an Event Certificate?',
    answer:
      'Digital participation and merit certificates are automatically issued via email after you attend and complete an event. If you need any assistance with a certificate, you can raise an issue at: [🎫 Submit a Ticket](/contact).',
    category: 'Events',
    keywords: ['certificate', 'cert', 'participation certificate', 'verify certificate', 'attendance', 'merit'],
    is_active: true,
    display_order: 8,
  },
  {
    id: 'faq-domains',
    question: 'What domains can I work in as a member?',
    answer:
      'Cloud Stack Club offers active domains in Cloud Infrastructure (AWS/Azure/GCP), DevOps & Automation, Full Stack Web & Mobile, AI/Machine Learning, Web3, UI/UX Design, Technical Content Writing, and Event Operations.\n\n👉 [Click here to Apply to Join Club](/join)',
    category: 'About Club',
    keywords: ['domains', 'departments', 'sub divisions', 'ai', 'ml', 'web3', 'devops', 'cloud', 'design', 'content'],
    is_active: true,
    display_order: 9,
  },
  {
    id: 'faq-contact',
    question: 'How can I contact coordinators or report an issue?',
    answer:
      'You can reach our leadership team via our [💬 Contact Us Page](/contact) for general inquiries, or submit a ticket through our query portal if you notice any registration or certificate discrepancies.',
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
 * High-Intelligence Hybrid Resolver:
 * 1. Checks real-time database endpoints (live upcoming events, core leadership, active notices)
 * 2. Matches custom Admin FAQs and keyword tags
 * 3. Guarantees clickable action buttons and live links for every response
 */
export const resolveBotQuery = async (
  userQuery: string,
  faqs: ChatbotFaq[]
): Promise<BotResolvedResponse> => {
  const cleanQ = normalizeText(userQuery);

  // 1. LIVE EVENTS INTENT
  const isEventIntent =
    cleanQ.includes('upcoming event') ||
    cleanQ.includes('next event') ||
    cleanQ.includes('current event') ||
    cleanQ.includes('latest event') ||
    cleanQ.includes('when is event') ||
    cleanQ.includes('when is the next') ||
    cleanQ.includes('upcoming workshops') ||
    cleanQ.includes('hackathon') ||
    cleanQ.includes('elevate') ||
    cleanQ.includes('stack sprint') ||
    (cleanQ.includes('event') &&
      (cleanQ.includes('what') ||
        cleanQ.includes('when') ||
        cleanQ.includes('which') ||
        cleanQ.includes('any') ||
        cleanQ.includes('upcoming') ||
        cleanQ.includes('next')));

  if (isEventIntent) {
    try {
      const allEvents = await getEvents();
      const validEvents = (allEvents || []).filter((e) => e.status !== 'cancelled');
      const liveOrUpcoming = validEvents.filter((e) => e.status === 'live' || e.status === 'upcoming');

      if (liveOrUpcoming.length > 0) {
        liveOrUpcoming.sort((a, b) => {
          const dateA = new Date(a.date || '').getTime() || 0;
          const dateB = new Date(b.date || '').getTime() || 0;
          return dateA - dateB;
        });

        const top = liveOrUpcoming[0];
        const dateFormatted = formatEventDate(top.date);
        const timeFormatted = top.start_time ? formatEventTime(top.start_time) : '';
        const venueFormatted = top.location ? `\n• 📍 **Venue:** ${top.location}` : '';
        const regStatus = top.registration_enabled
          ? top.supports_teams
            ? 'Open (Solo & Team Registration)'
            : 'Open (Individual Passes)'
          : 'Registration Closed / Opening Soon';
        const eventUrl = `/events/${top.slug || top.id}`;

        let text = `Here is the upcoming event at Cloud Stack Club:\n\n🎉 **${top.title}**\n• 🗓️ **Date:** ${dateFormatted}${timeFormatted ? ` at ${timeFormatted}` : ''}${venueFormatted}\n• 🎟️ **Registration:** ${regStatus}`;

        if (top.description) {
          const cleanDesc = top.description.replace(/\n+/g, ' ').trim();
          text += `\n\n${cleanDesc.length > 180 ? cleanDesc.slice(0, 180) + '...' : cleanDesc}`;
        }

        text += `\n\n👉 [Click here to View & Register for ${top.title}](${eventUrl})\n\nWant to see all activities? Explore our [📅 Events Directory](/events).`;

        const actionLinks: BotActionLink[] = [
          { label: `View ${top.title}`, url: eventUrl },
          { label: 'Browse All Events', url: '/events' },
        ];

        if (liveOrUpcoming.length > 1) {
          const second = liveOrUpcoming[1];
          text += `\n\n*Also upcoming:* **${second.title}** (${formatEventDate(second.date)}).`;
        }

        return {
          text,
          suggestions: faqs.filter((f) => f.category === 'Events' || f.category === 'Membership').slice(0, 3),
          actionLinks,
        };
      } else {
        const text = `There are currently no active upcoming events scheduled right now. Our team is actively planning exciting hands-on workshops and hackathons!\n\nIn the meantime, feel free to explore our past events and photo highlights:\n• 📅 [Browse All Events](/events)\n• 📸 [View Event Gallery](/gallery)`;

        return {
          text,
          suggestions: faqs.slice(0, 3),
          actionLinks: [
            { label: 'Browse Events', url: '/events' },
            { label: 'View Event Gallery', url: '/gallery' },
            { label: 'Apply to Join Club', url: '/join' },
          ],
        };
      }
    } catch (err) {
      console.warn('Chatbot live events lookup error:', err);
    }
  }

  // 2. JOIN / MEMBERSHIP INTENT
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
    const text = `You can apply directly through our official membership portal! Click below to begin:\n\n👉 [Click here to Apply to Join Cloud Stack Club](/join)\n\n• **Who can apply?** Open to enthusiastic Chandigarh University students interested in Cloud Computing (AWS, GCP, Azure), DevOps, Full Stack Development, AI/ML, UI/UX, or Operations.\n• **Application Steps:** Fill out your university UID, contact details, domain of choice, and submit. You will receive email updates on your application status.\n\nHave questions? You can also reach our leadership at [💬 Contact Page](/contact).`;

    return {
      text,
      suggestions: faqs.filter((f) => f.category === 'Membership' || f.category === 'About Club').slice(0, 3),
      actionLinks: [
        { label: '🚀 Apply to Join Club', url: '/join' },
        { label: '💬 Contact Us', url: '/contact' },
      ],
    };
  }

  // 3. LEADERSHIP & CORE TEAM INTENT
  const isLeadershipIntent =
    cleanQ.includes('tech lead') ||
    cleanQ.includes('technical lead') ||
    cleanQ.includes('secretary') ||
    cleanQ.includes('joint sec') ||
    cleanQ.includes('joint secretary') ||
    cleanQ.includes('core team') ||
    cleanQ.includes('leadership') ||
    cleanQ.includes('who is in charge') ||
    cleanQ.includes('who is secretary') ||
    cleanQ.includes('who is tech') ||
    cleanQ.includes('faculty') ||
    cleanQ.includes('advisor') ||
    cleanQ.includes('utkrisht') ||
    cleanQ.includes('lakshay') ||
    cleanQ.includes('bani') ||
    cleanQ.includes('deepti') ||
    cleanQ.includes('navjot');

  if (isLeadershipIntent) {
    try {
      const coreMembers = await getCoreMembers();

      if (cleanQ.includes('tech lead') || cleanQ.includes('technical lead') || cleanQ.includes('utkrisht')) {
        const lead = coreMembers.find(
          (m) =>
            m.role?.name?.toLowerCase().includes('technical') ||
            m.name.toLowerCase().includes('utkrisht')
        );
        const name = lead?.name || 'Utkrisht Utpal';
        const role = lead?.role?.name || 'Technical Lead';
        const dept = lead?.department ? ` (${lead.department})` : '';

        return {
          text: `The **${role}** of Cloud Stack Club is **${name}**${dept}. He spearheads platform infrastructure, systems engineering, software development, and technical workshops for the club.\n\n👉 [Click here to Meet Our Full Team](/team)`,
          suggestions: faqs.filter((f) => f.category === 'Leadership').slice(0, 3),
          actionLinks: [
            { label: '👥 Meet Our Team', url: '/team' },
            { label: '📅 View Events', url: '/events' },
          ],
        };
      }

      if ((cleanQ.includes('secretary') && !cleanQ.includes('joint')) || cleanQ.includes('lakshay')) {
        const sec = coreMembers.find(
          (m) =>
            m.role?.name?.toLowerCase() === 'secretary' ||
            m.name.toLowerCase().includes('lakshay')
        );
        const name = sec?.name || 'Lakshay Gosai';
        const dept = sec?.department ? ` (${sec.department})` : '';

        return {
          text: `The **Secretary** of Cloud Stack Club is **${name}**${dept}. He leads operations, executive coordination, and administrative management.\n\n👉 [Click here to Meet Our Full Team](/team)`,
          suggestions: faqs.filter((f) => f.category === 'Leadership').slice(0, 3),
          actionLinks: [
            { label: '👥 Meet Our Team', url: '/team' },
            { label: '🚀 Join Club', url: '/join' },
          ],
        };
      }

      if (cleanQ.includes('joint secretary') || cleanQ.includes('bani')) {
        const jsec = coreMembers.find(
          (m) =>
            m.role?.name?.toLowerCase().includes('joint') ||
            m.name.toLowerCase().includes('bani')
        );
        const name = jsec?.name || 'Bani Kaur';

        return {
          text: `The **Joint Secretary** of Cloud Stack Club is **${name}**. She works alongside the Secretary on team initiatives and member engagement.\n\n👉 [Click here to Meet Our Full Team](/team)`,
          suggestions: faqs.filter((f) => f.category === 'Leadership').slice(0, 3),
          actionLinks: [{ label: '👥 Meet Our Team', url: '/team' }],
        };
      }

      if (
        cleanQ.includes('faculty') ||
        cleanQ.includes('advisor') ||
        cleanQ.includes('deepti') ||
        cleanQ.includes('navjot') ||
        cleanQ.includes('mentor')
      ) {
        return {
          text: `Cloud Stack Club is mentored and guided by distinguished faculty at Chandigarh University:\n\n• **Faculty Advisor:** Dr. Deepti Sharma\n• **Co - Faculty Advisor:** Dr. Navjot Singh\n\n👉 [Learn more about our Advisors & Team](/team)`,
          suggestions: faqs.filter((f) => f.category === 'Leadership').slice(0, 3),
          actionLinks: [{ label: '👥 Meet Our Team', url: '/team' }],
        };
      }

      return {
        text: `Meet the executive council driving Cloud Stack Club:\n\n• **Secretary:** Lakshay Gosai\n• **Technical Lead:** Utkrisht Utpal\n• **Joint Secretary:** Bani Kaur\n• **Faculty Advisor:** Dr. Deepti Sharma\n• **Co - Faculty Advisor:** Dr. Navjot Singh\n\n👉 [Explore All Core Council & Team Members](/team)`,
        suggestions: faqs.filter((f) => f.category === 'Leadership' || f.category === 'About Club').slice(0, 3),
        actionLinks: [
          { label: '👥 Meet Our Team', url: '/team' },
          { label: '🚀 Join Club', url: '/join' },
        ],
      };
    } catch (err) {
      console.warn('Chatbot leadership lookup error:', err);
    }
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
                n.link_url ? `\n👉 [${n.link_text || 'View Link'}](${n.link_url})` : ''
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
          text: `There are currently no urgent announcements or notices. All club activities and workshops are operating normally!\n\n👉 [Browse Upcoming Events](/events)\n👉 [Apply to Join the Club](/join)`,
          suggestions: faqs.slice(0, 3),
          actionLinks: [
            { label: 'Browse Events', url: '/events' },
            { label: 'Join Club', url: '/join' },
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
      text: `You can reach our coordinators or raise a formal support query:\n\n• For general inquiries & suggestions: [💬 Contact Us Page](/contact)\n• For attendance, certificate, or registration discrepancies: [🎫 Submit a Discrepancy Ticket](/contact)\n\nOur administrative team reviews every submission and gets in touch promptly.`,
      suggestions: faqs.slice(0, 3),
      actionLinks: [
        { label: '💬 Contact Coordinators', url: '/contact' },
        { label: '🎫 Submit Ticket', url: '/contact' },
      ],
    };
  }

  // 6. MATCH CUSTOM ADMIN FAQS (or default FAQs)
  const match = findBestAnswer(userQuery, faqs);
  if (match.faq && match.score >= 35) {
    const text = match.faq.answer;
    const extractedLinks = extractActionLinksFromText(text);

    return {
      text,
      suggestions: match.suggestions,
      actionLinks: extractedLinks,
    };
  }

  // 7. GENERAL / UNMATCHED FALLBACK
  const fallbackText = `I don't have a direct answer for that in my knowledge base yet, but here are the fastest ways to find what you need:\n\n• 🚀 [Apply to Join Cloud Stack Club](/join)\n• 📅 [Browse Upcoming Workshops & Hackathons](/events)\n• 👥 [Meet the Core Council & Leadership](/team)\n• 💬 [Get in Touch with our Coordinators](/contact)\n\nYou can also click any suggested question below!`;

  return {
    text: fallbackText,
    suggestions: match.suggestions.length > 0 ? match.suggestions : faqs.slice(0, 4),
    actionLinks: [
      { label: '🚀 Join Club', url: '/join' },
      { label: '📅 Browse Events', url: '/events' },
      { label: '💬 Contact Us', url: '/contact' },
    ],
  };
};
