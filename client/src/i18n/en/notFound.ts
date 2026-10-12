import type { notFound as Ko } from '../ko/notFound';

export const notFound: Record<keyof typeof Ko, string> = {
  title: 'Page not found',
  body1: "Sorry, the page you're looking for doesn't exist.",
  body2: 'It may have been moved or deleted.',
  home: 'Go home',
};
