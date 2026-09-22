/**
 * KINSEI Studio — Global Configuration & Constants
 */

export const CONFIG = {
  telegram: {
    // Token lives in .env and server.py — never put it in frontend JS.
    chatId: '6832614745',
  },
  dragThreshold: 5,
  viewportRetention: 0.70,
  rotationRange: 60, // -30° to +30°

  // Set showNav to true to bring back desktop Loyihalar / Jamoa tabs.
  // Phone keeps its own pill: Projects + Contact. Team pill stays in the DOM, hidden.
  showNav: false,
  showMobileNav: true,
  showSocial: true,
  defaultTab: 'projects',

  // Hidden projects stay in HTML / i18n / PROJECT_DATA. Do not delete.
  // Recover Teahouse: set showTeahouse to true.
  showTeahouse: false,

  // Sound button + playback stay in the codebase. Recover: showSound true.
  showSound: false,
};
