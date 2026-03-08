interface MealSuggestion {
  meal: string;
  foods: string[];
  calories: number;
  macros: { protein: number; carbs: number; fats: number };
}

interface NextMealInfo {
  meal: string;
  foods: string[];
  calories: number;
  macros: { protein: number; carbs: number; fats: number };
  timeWindow: string;
  isTomorrow: boolean;
}

interface MealWindow {
  name: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  label: string;
}

const MEAL_WINDOWS: MealWindow[] = [
  { name: 'breakfast', startHour: 5, startMinute: 0, endHour: 9, endMinute: 0, label: '5:00 AM - 9:00 AM' },
  { name: 'morning snack', startHour: 9, startMinute: 0, endHour: 11, endMinute: 0, label: '9:00 AM - 11:00 AM' },
  { name: 'lunch', startHour: 11, startMinute: 0, endHour: 13, endMinute: 30, label: '11:00 AM - 1:30 PM' },
  { name: 'afternoon snack', startHour: 13, startMinute: 30, endHour: 16, endMinute: 0, label: '1:30 PM - 4:00 PM' },
  { name: 'dinner', startHour: 16, startMinute: 0, endHour: 20, endMinute: 0, label: '4:00 PM - 8:00 PM' },
  { name: 'evening snack', startHour: 20, startMinute: 0, endHour: 22, endMinute: 0, label: '8:00 PM - 10:00 PM' },
];

function findMatchingSuggestion(
  mealSuggestions: MealSuggestion[],
  windowName: string
): MealSuggestion | undefined {
  return mealSuggestions.find(
    (s) => s.meal.toLowerCase().includes(windowName)
  );
}

export function getNextMeal(mealSuggestions: MealSuggestion[]): NextMealInfo | null {
  if (!mealSuggestions || mealSuggestions.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find the next meal window that hasn't ended yet
  for (const window of MEAL_WINDOWS) {
    const endMinutes = window.endHour * 60 + window.endMinute;
    if (currentMinutes < endMinutes) {
      const suggestion = findMatchingSuggestion(mealSuggestions, window.name);
      if (suggestion) {
        return {
          meal: suggestion.meal,
          foods: suggestion.foods,
          calories: suggestion.calories,
          macros: suggestion.macros,
          timeWindow: window.label,
          isTomorrow: false,
        };
      }
    }
  }

  // All meals have passed — return first meal of tomorrow (Breakfast)
  const breakfastWindow = MEAL_WINDOWS[0];
  const suggestion = findMatchingSuggestion(mealSuggestions, breakfastWindow.name);
  if (suggestion) {
    return {
      meal: suggestion.meal,
      foods: suggestion.foods,
      calories: suggestion.calories,
      macros: suggestion.macros,
      timeWindow: breakfastWindow.label,
      isTomorrow: true,
    };
  }

  return null;
}
