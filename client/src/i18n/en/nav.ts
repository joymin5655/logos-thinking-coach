import type { nav as Ko } from '../ko/nav';

export const nav: Record<keyof typeof Ko, string> = {
  home: 'Home',
  diagnostic: '3-min diagnostic',
  argue: 'Daily argument',
  session: 'Socratic coaching',
  arena: 'Debate arena',
  analytics: 'Reasoning analytics',
  history: 'Session history',
  subscription: 'Subscription',
  newSession: '+ New session',
  userMenu: 'Account menu',
  defaultName: 'User',
  plan: 'Free · Beta',
  settings: 'Settings',
  privacy: 'Privacy policy',
  admin: 'Admin',
  signOut: 'Sign out',
  signIn: 'Sign in',
  pending: 'Pending sync {n}',
  collapse: 'Collapse or expand sidebar',
};
