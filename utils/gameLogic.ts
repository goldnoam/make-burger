import { IngredientType } from '../types';

export const generateRandomOrder = (level: number): IngredientType[] => {
  const order: IngredientType[] = [IngredientType.BUN_BOTTOM];
  
  // Difficulty scales with level
  const minIngredients = Math.min(2 + level, 6);
  const maxIngredients = Math.min(3 + level * 2, 10);
  const count = Math.floor(Math.random() * (maxIngredients - minIngredients + 1)) + minIngredients;

  const fillings = [
    IngredientType.PATTY,
    IngredientType.CHEESE,
    IngredientType.LETTUCE,
    IngredientType.TOMATO,
    IngredientType.ONION,
  ];

  for (let i = 0; i < count; i++) {
    const randomFilling = fillings[Math.floor(Math.random() * fillings.length)];
    order.push(randomFilling);
  }

  order.push(IngredientType.BUN_TOP);
  return order;
};

export const checkOrder = (playerStack: IngredientType[], targetOrder: IngredientType[]): boolean => {
  if (playerStack.length !== targetOrder.length) return false;
  for (let i = 0; i < playerStack.length; i++) {
    if (playerStack[i] !== targetOrder[i]) return false;
  }
  return true;
};

export const calculateBonus = (timeLeft: number, level: number): number => {
  return (level * 100) + (Math.floor(timeLeft) * 10);
};