/**
 * KINSEI Studio — Global State Manager (single source of truth)
 */

export const state = {
  currentTab: 'projects',
  isDragging: false,
  activeDragCard: null,
  hoveredCard: null,
  pinnedCard: null,
  stackFront: 10,
  highestZIndex: 120,
  sfxEnabled: true,
  selectedBudget: '<$1k',
  cardStates: new Map(), // card DOM → { x, y, rotation, baseZIndex }
};
