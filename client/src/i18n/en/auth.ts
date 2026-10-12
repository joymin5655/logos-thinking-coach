import type { auth as Ko } from '../ko/auth';

export const auth: Record<keyof typeof Ko, string> = {
  loginTitle: 'Sign in',
  loginLead: 'Save your records to your account and pick up on any device.',
  google: 'Continue with Google',
  notConfigured: "Sign-in isn't ready yet. Please check back soon.",
  privacyNote: 'By continuing, you agree to have your records stored as described in the privacy policy.',
  privacyLink: 'Privacy policy',
  signInFailed: "We couldn't start sign-in. Please try again.",
  redirecting: 'Redirecting…',
  callbackWorking: 'Finishing sign-in…',
  callbackError: "We couldn't sign you in",
  callbackNoSession: "We didn't receive your sign-in details. Please try again.",
  backToLogin: 'Back to sign in',
  checking: 'Checking…',
  migrated: 'Saved {n} records to your account',
  signOutConfirm: "{n} records haven't been saved to the server yet. If you sign out now, they will be lost. Sign out anyway?",
  ctaSave: 'Sign in to save your records',
  ctaSaveLead: "Right now this lives only on this device. Sign in to save it to your account and see it on other devices.",
  ctaButton: 'Sign in',
};
