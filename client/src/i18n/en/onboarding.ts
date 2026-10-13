import type { onboarding as Ko } from '../ko/onboarding';

export const onboarding: Record<keyof typeof Ko, string> = {
  title: 'Get started',
  description: 'We will guide you from the diagnostic to your first argument.',
  later: 'Do this later',
  stepsLabel: 'Getting started',
  stepDiagnostic: '01 Diagnostic',
  stepInterests: '02 Interests',
  stepArgue: '03 First argument',
  stepReminder: '04 Calendar',
  stepDone: 'done',

  diagTitle: 'Set your baseline with 3 minutes of writing',
  diagLead: 'Write briefly on one topic and get scored on consistency, evidence and defense. In 28 days we measure again the same way and show how much changed.',
  diagStart: 'Start the 3-minute diagnostic',
  baselineLabel: 'Your baseline from today',
  baselineSub: 'We will measure again in 28 days to compare',

  interestsTitle: 'What should you think about every day?',
  interestsLead: "Today's argument topics come from the fields you pick. Up to 3; you can change them later in Settings.",
  fieldsLegend: 'Fields of interest',
  nextCount: '{n} selected · Next',
  nextNone: 'Pick a field',
  skip: 'Skip',

  argueTitle: 'Ready for your first argument?',
  argueLead: 'Pick a side and write your reasons, and LOGOS asks about the weakest link three times. It takes 10 minutes.',
  argueStart: "Start today's argument",

  reminderTitle: "Keep thinking tomorrow morning too",
  reminderLead: "Add an event to your calendar for 8:00 tomorrow so you remember today's argument.",
  reminderAdd: 'Add to calendar',

  nextPreview: 'Next step preview',
  nextArgueTitle: "Next · your first 10-minute argument",
  nextArgueBody: 'Pick a side and write your reasons, and LOGOS asks about the weakest link three times. After that you can add tomorrow morning’s reminder to your calendar.',
};
