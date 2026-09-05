/**
 * Cloud Stack Club - Duplicate Registrations Scanner
 * Scans all events and identifies duplicate UIDs, Emails, and Phone Numbers
 * across solo participants, team leaders, and team members.
 *
 * Usage:
 *   npx tsx scripts/find_duplicate_registrations.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / ANON_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface Participant {
  source_id: string;
  event_id: string;
  event_title: string;
  participant_name: string;
  email: string;
  phone: string;
  uid: string;
  role: string;
  team_name?: string;
  registration_number?: string;
  created_at: string;
}

interface DuplicateGroup {
  event_id: string;
  event_title: string;
  duplicate_type: 'UID' | 'EMAIL' | 'PHONE';
  duplicate_value: string;
  count: number;
  records: Participant[];
}

async function findDuplicates() {
  console.log('🔍 Starting comprehensive duplicate registration scan across all events...\n');

  // 1. Fetch Events
  const { data: events, error: eventsErr } = await supabase
    .from('events')
    .select('id, title, slug');

  if (eventsErr) {
    console.error('❌ Failed to fetch events:', eventsErr.message);
    process.exit(1);
  }

  const eventMap = new Map<string, string>();
  (events || []).forEach((e) => eventMap.set(e.id, e.title));

  // 2. Fetch Solo / Leader Registrations
  const { data: registrations, error: regsErr } = await supabase
    .from('event_registrations')
    .select('id, event_id, registrant_name, registrant_email, registrant_phone, uid, registration_number, submitted_at, team_id');

  if (regsErr) {
    console.error('❌ Failed to fetch event registrations:', regsErr.message);
    process.exit(1);
  }

  // 3. Fetch Teams
  const { data: teams, error: teamsErr } = await supabase
    .from('event_teams')
    .select('id, event_id, team_name');

  if (teamsErr) {
    console.error('❌ Failed to fetch event teams:', teamsErr.message);
    process.exit(1);
  }

  const teamMap = new Map<string, { event_id: string; team_name: string }>();
  (teams || []).forEach((t) => teamMap.set(t.id, { event_id: t.event_id, team_name: t.team_name }));

  // 4. Fetch Teammates
  const { data: teamMembers, error: membersErr } = await supabase
    .from('event_team_members')
    .select('id, team_id, name, email, phone, uid, registration_number, created_at');

  if (membersErr) {
    console.error('❌ Failed to fetch event team members:', membersErr.message);
    process.exit(1);
  }

  // 5. Aggregate all participants into a unified list
  const allParticipants: Participant[] = [];

  (registrations || []).forEach((r: any) => {
    const eventTitle = eventMap.get(r.event_id) || 'Unknown Event';
    const teamInfo = r.team_id ? teamMap.get(r.team_id) : undefined;
    allParticipants.push({
      source_id: r.id,
      event_id: r.event_id,
      event_title: eventTitle,
      participant_name: r.registrant_name || 'N/A',
      email: (r.registrant_email || '').trim().toLowerCase(),
      phone: (r.registrant_phone || '').replace(/\D/g, '').slice(-10),
      uid: (r.uid || '').trim().toUpperCase(),
      role: r.team_id ? `Team Leader (${teamInfo?.team_name || 'Team'})` : 'Solo Participant',
      team_name: teamInfo?.team_name,
      registration_number: r.registration_number,
      created_at: r.submitted_at || r.created_at,
    });
  });

  (teamMembers || []).forEach((tm) => {
    const teamInfo = teamMap.get(tm.team_id);
    const eventId = teamInfo?.event_id || 'unknown';
    const eventTitle = eventMap.get(eventId) || 'Unknown Event';
    allParticipants.push({
      source_id: tm.id,
      event_id: eventId,
      event_title: eventTitle,
      participant_name: tm.name || 'N/A',
      email: (tm.email || '').trim().toLowerCase(),
      phone: (tm.phone || '').replace(/\D/g, '').slice(-10),
      uid: (tm.uid || '').trim().toUpperCase(),
      role: `Teammate (${teamInfo?.team_name || 'Team'})`,
      team_name: teamInfo?.team_name,
      registration_number: tm.registration_number,
      created_at: tm.created_at,
    });
  });

  console.log(`📊 Total Registrations Scanned: ${allParticipants.length} records across ${events?.length || 0} events.\n`);

  // 6. Find Duplicates Per Event
  const duplicateGroups: DuplicateGroup[] = [];

  // Group by Event
  const participantsByEvent = new Map<string, Participant[]>();
  allParticipants.forEach((p) => {
    const list = participantsByEvent.get(p.event_id) || [];
    list.push(p);
    participantsByEvent.set(p.event_id, list);
  });

  participantsByEvent.forEach((participants, eventId) => {
    const eventTitle = participants[0]?.event_title || 'Unknown Event';

    // A. Check UIDs
    const uidMap = new Map<string, Participant[]>();
    participants.forEach((p) => {
      if (p.uid) {
        const list = uidMap.get(p.uid) || [];
        list.push(p);
        uidMap.set(p.uid, list);
      }
    });

    uidMap.forEach((list, uidVal) => {
      if (list.length > 1) {
        duplicateGroups.push({
          event_id: eventId,
          event_title: eventTitle,
          duplicate_type: 'UID',
          duplicate_value: uidVal,
          count: list.length,
          records: list,
        });
      }
    });

    // B. Check Emails
    const emailMap = new Map<string, Participant[]>();
    participants.forEach((p) => {
      if (p.email) {
        const list = emailMap.get(p.email) || [];
        list.push(p);
        emailMap.set(p.email, list);
      }
    });

    emailMap.forEach((list, emailVal) => {
      if (list.length > 1) {
        duplicateGroups.push({
          event_id: eventId,
          event_title: eventTitle,
          duplicate_type: 'EMAIL',
          duplicate_value: emailVal,
          count: list.length,
          records: list,
        });
      }
    });

    // C. Check Phones
    const phoneMap = new Map<string, Participant[]>();
    participants.forEach((p) => {
      if (p.phone && p.phone.length === 10) {
        const list = phoneMap.get(p.phone) || [];
        list.push(p);
        phoneMap.set(p.phone, list);
      }
    });

    phoneMap.forEach((list, phoneVal) => {
      if (list.length > 1) {
        duplicateGroups.push({
          event_id: eventId,
          event_title: eventTitle,
          duplicate_type: 'PHONE',
          duplicate_value: phoneVal,
          count: list.length,
          records: list,
        });
      }
    });
  });

  // 7. Output Results
  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicate registrations found in any event! All UIDs, Emails, and Phone Numbers are unique.');
    return;
  }

  console.log(`⚠️  FOUND ${duplicateGroups.length} DUPLICATE CONFLICT(S):\n`);
  console.log('='.repeat(80));

  duplicateGroups.forEach((dup, index) => {
    console.log(`\n[${index + 1}] EVENT: "${dup.event_title}"`);
    console.log(`    CONFLICT TYPE : Duplicate ${dup.duplicate_type}`);
    console.log(`    MATCHED VALUE : ${dup.duplicate_value}`);
    console.log(`    OCCURRENCES   : ${dup.count} entries`);
    console.log('    CONFLICTING PARTICIPANTS:');

    dup.records.forEach((rec, rIdx) => {
      console.log(
        `      ${rIdx + 1}. Name: ${rec.participant_name.padEnd(20)} | Role: ${rec.role.padEnd(28)} | Reg#: ${rec.registration_number || 'N/A'} | Date: ${new Date(rec.created_at).toLocaleString()}`
      );
    });
    console.log('-'.repeat(80));
  });

  console.log(`\n📋 Scan complete. Total conflicting groups identified: ${duplicateGroups.length}`);
}

findDuplicates().catch((err) => {
  console.error('Fatal error during scan:', err);
  process.exit(1);
});
