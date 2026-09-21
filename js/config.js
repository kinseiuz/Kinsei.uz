/**
 * KINSEI Studio — Global Configuration & Constants
 */

export const CONFIG = {
  telegram: {
    botToken: '', // @BotFather dan olingan bot tokeni (masalan: 123456789:ABCdef...)
    chatId: '6832614745',   // Siz ko'rsatgan Telegram ID
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
};
