import type { terms as Ko } from '../ko/terms';

// English convenience translation. The Korean version is the governing text (see Section 14).
export const terms: Record<keyof typeof Ko, string> = {
  title: 'Terms of Service',
  effective: 'Effective date: 2026-10-14',
  contactLabel: 'Contact',
  contactEmail: 'contact@lo9os.org',

  s1Title: 'Article 1 (Purpose)',
  s1p1: 'These Terms set out the rights, duties and responsibilities of the operator, LOGOS ("Operator"), and users, and the conditions and procedures for using LOGOS ("Service"), a Socratic thinking-coach service provided by the Operator.',

  s2Title: 'Article 2 (Definitions)',
  s2l1: '"Service" means the coaching, argument training, arena and diagnostic features and related functions the Operator provides on its website (lo9os.org).',
  s2l2: '"User" means a person who uses the Service under these Terms.',
  s2l3: '"Member" means a user who has created an account by signing in with a Google account.',
  s2l4: '"Content" means the writing a user enters into the Service (arguments, coaching answers, diagnostic answers and so on).',
  s2l5: '"AI Output" means responses, questions, scores and reports the Service produces with artificial intelligence.',

  s3Title: 'Article 3 (Posting and changing these Terms)',
  s3p1: 'The Operator posts these Terms where users can easily see them, on the website (lo9os.org/terms) and the sign-in screen.',
  s3p2: 'The Operator may change these Terms within the limits of applicable law. Before a change takes effect, the Operator announces the effective date and the changes on this page. For changes that are unfavorable or important to users, the Operator gives notice well in advance as far as possible.',
  s3p3: 'If you keep using the Service after the effective date of the changed Terms, you are treated as agreeing to them. If you do not agree, stop using the Service; you can delete your account.',

  s4Title: 'Article 4 (The Service and its beta nature)',
  s4p1: 'The Service is a thinking-training tool in which an AI asks questions about and evaluates what you wrote, so that you refine your own reasoning.',
  s4p2: 'The Service is currently in beta and is free. To prevent abuse and manage running costs, the Operator may set usage limits, such as the number of uses per feature. Limits are shown in the Service.',
  s4p3: 'Because it is in beta, features, screens and usage limits may change without notice, and there may be errors.',

  s5Title: 'Article 5 (Sign-up and accounts)',
  s5p1: 'Features that need sign-in are used by signing in with a Google account. To sign up you must read and agree to these Terms and the Privacy Policy.',
  s5p2: 'The Service is available only to people aged 18 or older. You confirm you are 18 or older when you sign up; if that confirmation is untrue, the Operator may delete the account.',
  s5p3: 'You are responsible for managing your own Google account and devices and must not let others use your account. If you learn your account has been used without permission, tell the Operator right away.',

  s6Title: 'Article 6 (User duties and prohibited conduct)',
  s6p1: 'Users must follow applicable law, these Terms and notices in the Service. Because the Service uses AI, you must also comply with the Anthropic Usage Policy (https://www.anthropic.com/legal/aup). You must not do the following.',
  s6l1: 'Enter content that violates law or the Anthropic Usage Policy, illegal or harmful content, or content that infringes others\' rights',
  s6l2: 'Enter other people\'s personal data or secrets without permission',
  s6l3: 'Hack the Service, its servers or accounts, or bypass usage limits, rate limits or security measures',
  s6l4: 'Send bulk requests by automated means or put excessive load on the Service',
  s6l5: 'Enter text meant to defeat the AI\'s safeguards (such as prompt injection), or use the Service to collect material for developing or training AI models',
  s6l6: 'Copy the Service without permission to run a service that could be mistaken for LOGOS, or misuse the LOGOS name or brand',
  s6l7: 'Impersonate the Operator or other users, or interfere with the operation of the Service',
  s6p2: 'If you break these rules, the Operator may restrict your use or delete your account.',

  s7Title: 'Article 7 (About AI Output)',
  s7p1: 'The questions, responses, scores and reports in the Service are produced by artificial intelligence. Please keep the following in mind.',
  s7l1: 'The AI can be inaccurate or wrong. Factual claims in AI Output should be independently verified before you rely on them; do not rely on them without verification.',
  s7l2: 'Scores and reports are AI estimates. They do not replace evaluation by a person or an accredited test.',
  s7l3: 'Do not use scores or reports for decisions that significantly affect a person\'s rights or opportunities, such as admissions, hiring, evaluation or qualification.',
  s7l4: 'The Service does not give legal, medical, financial or other professional advice. Consult a qualified professional for decisions in those areas.',
  s7p2: 'You are responsible for judgments and actions you take in reliance on AI Output. Losses caused by the Operator\'s intent or gross negligence are governed by Article 12.',

  s8Title: 'Article 8 (Rights in Content)',
  s8p1: 'You own the Content you write in the Service. The Operator does not take those rights.',
  s8p2: 'You permit the Operator to store and process your Content and send it to an AI provider to generate responses, to the extent needed to provide the Service. This permission is used only to provide the Service, and when you delete your account or records, the Content is removed as described in the Privacy Policy, except information that Section 4 of the Privacy Policy says is kept, such as usage counts.',
  s8p3: 'You must have the right to enter the Content you enter, and you are responsible for it. Use of AI Output is governed by applicable law.',

  s9Title: 'Article 9 (Changing or suspending the Service)',
  s9p1: 'The Operator may change or suspend all or part of the Service when operationally or technically necessary. The Service may be temporarily unavailable because of maintenance, outages, or problems at outside services (AI, database, hosting and so on).',
  s9p2: 'When the Operator suspends the Service or changes it in a way that is unfavorable to users, it gives notice in advance on this page or in the Service. For urgent outages or reasons beyond users\' control, notice may follow afterwards. If the Service ends entirely, the Operator gives users a period in which they can download their records.',

  s10Title: 'Article 10 (Termination and account deletion)',
  s10p1: 'You can terminate your agreement at any time by deleting your account in Settings. When you delete your account, your records are deleted as described in the Privacy Policy. You can download your records in Settings before deleting.',
  s10p2: 'If a user breaks Article 6 or seriously interferes with the Service, the Operator may restrict use or delete the account. The Operator tells the user the reason, and the user can object through the contact below.',

  s11Title: 'Article 11 (Paid plans and refunds)',
  s11p1: 'Paid plans are not open yet, and the Service is free. Before paid plans open, we will add terms on prices, payment, withdrawal and refunds to these Terms and announce them in advance.',

  s12Title: 'Article 12 (Limitation of liability)',
  s12p1: 'The Operator is not liable for losses caused by reasons beyond its control, such as natural disasters, outages at outside services, or the user\'s own fault.',
  s12p2: 'For use of the free beta Service, the Operator limits its liability to the extent permitted by law, except where there is intent or gross negligence.',
  s12p3: 'Nothing in these Terms excludes or limits liability for losses caused by the Operator\'s intent or gross negligence, or users\' rights under law.',

  s13Title: 'Article 13 (Governing law and jurisdiction)',
  s13p1: 'The laws of the Republic of Korea apply to these Terms and use of the Service. Lawsuits over disputes arising from use of the Service are brought in the court with jurisdiction under the Civil Procedure Act.',

  s14Title: 'Article 14 (Operator, contact and governing text)',
  s14p1: 'Operator: LOGOS. Send questions and objections about these Terms and the Service to the email below. This English text is a convenience translation: if it differs from the Korean version, the Korean version prevails.',

  s15Title: 'Addendum',
  s15p1: 'These Terms take effect on 2026-10-14.',
};
