/**
 * KINSEI Studio — Global State Manager (single source of truth)
 */

export const state = {
  currentTab: 'projects',
  isDragging: false,
  activeDragCard: null,
  hoveredCard: null,
  skipHoverCard: null,
  highestZIndex: 120,
  sfxEnabled: true,
  selectedBudget: '<$1k',
  cardStates: new Map(), // card DOM → { x, y, rotation, baseZIndex }
};
