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
  // Phone pill stays in the DOM. Recover: showMobileNav true.
  showNav: false,
  showMobileNav: false,
  showSocial: true,
  defaultTab: 'projects',

  // Hidden projects stay in HTML / i18n / PROJECT_DATA. Do not delete.
  // Recover Teahouse: set showTeahouse to true.
  showTeahouse: false,

  // Sound button + playback stay in the codebase. Recover: showSound true.
  showSound: false,

  // Contact form stays in the DOM. Recover: showForm true.
  showForm: false,

  // Bottom-left / bottom-right studio copy stays in the DOM.
  showFooterCopy: true,
};
