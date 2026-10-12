import type { privacy as Ko } from '../ko/privacy';

export const privacy: Record<keyof typeof Ko, string> = {
  title: 'Privacy Policy',
  draft: 'Draft pending legal review',
  draftNote: 'This document is a draft that has not yet been legally reviewed. It may change during review.',
  effective: 'Effective date: 2026-10-13',
  contactLabel: 'Contact',
  contactEmail: 'contact@lo9os.org',

  s1Title: '1. Controller and contact',
  s1p1: 'The controller of personal data for LOGOS ("the Service") is the Service operator. Send questions and access or deletion requests to the email address below.',

  s2Title: '2. What we collect',
  s2p1: 'The Service collects and stores the following.',
  s2l1: 'Google sign-in information: email address, name and profile image URL',
  s2l2: 'Everything you write in the Service (arguments, coaching answers, diagnostic answers and so on)',
  s2l3: 'Full AI conversations, scores and reports',
  s2l4: 'Survey answers',
  s2l5: 'Usage counts (how many coaching, argument, arena and diagnostic sessions you started, and when)',
  s2p2: 'The IP address of a request is used briefly in server memory only to rate-limit usage. It is not stored.',

  s3Title: '3. Why we use it',
  s3l1: 'Sign-in and account identification',
  s3l2: 'Providing coaching, argument, arena and diagnostic features and generating AI responses',
  s3l3: 'Saving your records and syncing across devices',
  s3l4: 'Applying usage limits and preventing abuse',
  s3l5: 'Aggregating operating metrics to improve the Service (completion rate, score change, return visits, survey averages)',
  s3l6: 'Sending launch news to users who signed up for notifications',

  s4Title: '4. How long we keep it',
  s4l1: 'Records (writing, AI conversations, scores, survey answers): kept until you delete them or delete your account.',
  s4l2: 'Usage counts: kept even after "Delete all my records" to prevent limit evasion, and deleted with your account.',
  s4l3: 'Launch notification sign-ups: kept until you cancel them or delete your records or account.',
  s4p1: 'Where the law requires us to keep data, we keep it for that period.',

  s5Title: '5. Processors and overseas transfer',
  s5p1: 'To provide the Service, we entrust processing to the companies below, and your data is transferred abroad.',
  s5l1: 'Anthropic, PBC (USA): generating AI responses. What you write and your conversation are sent to produce a response.',
  s5l2: 'Supabase (database region: ap-northeast-2, Seoul): database and authentication.',
  s5l3: 'Vercel (USA): hosting the website and server functions.',
  s5l4: 'Google (USA): Google account sign-in.',
  s5p2: 'If you do not want this transfer, please do not use the Service or ask us to delete your account.',

  s6Title: '6. Your rights',
  s6p1: 'You can view, download and delete your information at any time, directly in Settings.',
  s6l1: 'Export data: download your records as a JSON file in Settings.',
  s6l2: 'Delete all my records: erase your records from the server and this device in Settings.',
  s6l3: 'Delete account: delete your account and all records in Settings.',
  s6p2: 'For requests Settings cannot handle, email the address above.',

  s7Title: '7. Children under 14',
  s7p1: 'The Service is not available to children under 14.',

  s8Title: '8. Cookies and local storage',
  s8p1: 'The Service does not use advertising or tracking cookies. It uses browser storage for the following.',
  s8l1: 'Keeping you signed in',
  s8l2: 'A local cache of your records and a list of records not yet uploaded',
  s8l3: 'Theme and language preferences and your chosen interest fields',
  s8p2: 'You can clear storage in your browser settings, but you will be signed out and records not yet uploaded may be lost.',

  s9Title: '9. Changes to this policy',
  s9p1: 'If we change this policy, we will say so on this page together with the effective date.',
};
