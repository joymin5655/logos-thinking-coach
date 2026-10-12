import type { errors as Ko } from '../ko/errors';

export const errors: Record<keyof typeof Ko, string> = {
  auth: 'Please sign in. Taking you to the sign-in page.',
  quota: "You've used today's limit. Come back tomorrow.",
  rate: 'Too many requests. Please try again in a moment.',
  upstream: "We didn't get a response from the AI. Please try again.",
  unavailable: "The service isn't ready yet. Please try again shortly.",
  origin: "We couldn't process that request. Please try again later.",
  bad_request: "We couldn't process that request. Please try again later.",
  timeout: 'The AI is taking too long. Please try again in a moment.',
  network: 'Check your network connection.',
};
