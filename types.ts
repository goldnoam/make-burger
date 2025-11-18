export enum IngredientType {
  BUN_BOTTOM = 'BUN_BOTTOM',
  PATTY = 'PATTY',
  CHEESE = 'CHEESE',
  LETTUCE = 'LETTUCE',
  TOMATO = 'TOMATO',
  ONION = 'ONION',
  BUN_TOP = 'BUN_TOP',
}

export interface IngredientDef {
  type: IngredientType;
  name: string;
  color: string;
  height: number;
  radius?: number;
  shape: 'cylinder' | 'box' | 'sphere_half' | 'rough';
}

export interface GameState {
  screen: 'MENU' | 'PLAYING' | 'LEVEL_END' | 'GAME_OVER';
  level: number;
  score: number; // Salary
  badges: number; // Chips badges
  currentOrder: IngredientType[];
  playerStack: IngredientType[];
  redoStack: IngredientType[];
  timeLeft: number;
  feedbackMessage: string;
  highScores: number[];
  isThinking: boolean; // For Gemini
}

export const INGREDIENTS: Record<IngredientType, IngredientDef> = {
  [IngredientType.BUN_BOTTOM]: { type: IngredientType.BUN_BOTTOM, name: 'Bun Bottom', color: '#d97706', height: 0.4, radius: 1.1, shape: 'cylinder' },
  [IngredientType.PATTY]: { type: IngredientType.PATTY, name: 'Beef Patty', color: '#3e1c00', height: 0.3, radius: 1.0, shape: 'cylinder' },
  [IngredientType.CHEESE]: { type: IngredientType.CHEESE, name: 'Cheese', color: '#facc15', height: 0.05, radius: 1.1, shape: 'box' },
  [IngredientType.LETTUCE]: { type: IngredientType.LETTUCE, name: 'Lettuce', color: '#4ade80', height: 0.1, radius: 1.2, shape: 'rough' },
  [IngredientType.TOMATO]: { type: IngredientType.TOMATO, name: 'Tomato', color: '#ef4444', height: 0.1, radius: 0.9, shape: 'cylinder' },
  [IngredientType.ONION]: { type: IngredientType.ONION, name: 'Onion', color: '#e5e7eb', height: 0.05, radius: 0.8, shape: 'cylinder' },
  [IngredientType.BUN_TOP]: { type: IngredientType.BUN_TOP, name: 'Bun Top', color: '#d97706', height: 0.6, radius: 1.1, shape: 'sphere_half' },
};