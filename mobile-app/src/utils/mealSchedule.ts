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

// Extract scheduled time from meal name like "Breakfast 7:00 AM" -> minutes since midnight
function parseScheduledTime(mealName: string): number | null {
  const match = mealName.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// Extract the display name (without time) from a meal name
function extractMealDisplayName(mealName: string): string {
  return mealName.replace(/\s+\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\s*$/, '').trim();
}

export function getNextMeal(mealSuggestions: MealSuggestion[]): NextMealInfo | null {
  if (!mealSuggestions || mealSuggestions.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check if meals have scheduled times embedded in their names
  const mealsWithTimes = mealSuggestions
    .map(s => ({ suggestion: s, scheduledMinutes: parseScheduledTime(s.meal) }))
    .filter(m => m.scheduledMinutes !== null)
    .sort((a, b) => a.scheduledMinutes! - b.scheduledMinutes!);

  if (mealsWithTimes.length > 0) {
    // Use scheduled times -- find the next meal that hasn't passed
    for (const { suggestion, scheduledMinutes } of mealsWithTimes) {
      if (scheduledMinutes! > currentMinutes) {
        const displayName = extractMealDisplayName(suggestion.meal);
        const timeMatch = suggestion.meal.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/);
        return {
          meal: displayName,
          foods: suggestion.foods,
          calories: suggestion.calories,
          macros: suggestion.macros,
          timeWindow: timeMatch ? timeMatch[1] : '',
          isTomorrow: false,
        };
      }
    }

    // All scheduled meals have passed -- return first meal of tomorrow
    const firstMeal = mealsWithTimes[0];
    const displayName = extractMealDisplayName(firstMeal.suggestion.meal);
    const timeMatch = firstMeal.suggestion.meal.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/);
    return {
      meal: displayName,
      foods: firstMeal.suggestion.foods,
      calories: firstMeal.suggestion.calories,
      macros: firstMeal.suggestion.macros,
      timeWindow: timeMatch ? timeMatch[1] : '',
      isTomorrow: true,
    };
  }

  // Fallback: use default meal windows
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

  // All meals have passed -- return first meal of tomorrow (Breakfast)
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
