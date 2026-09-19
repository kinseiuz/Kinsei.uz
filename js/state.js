/**
 * KINSEI Studio — Global State Manager (single source of truth)
 */

export const state = {
  currentTab: 'projects',
  isDragging: false,
  activeDragCard: null,
  highestZIndex: 30,
  sfxEnabled: true,
  selectedBudget: '<$1k',
  cardStates: new Map(), // card DOM → { x, y, rotation, baseZIndex }
};
