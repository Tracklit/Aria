import { getNextMeal } from '../src/utils/mealSchedule';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  PASS: ${message}`);
}

const mockMeals = [
  { meal: 'Breakfast', foods: ['Oatmeal', 'Banana'], calories: 400, macros: { protein: 15, carbs: 60, fats: 10 } },
  { meal: 'Morning Snack', foods: ['Greek Yogurt'], calories: 150, macros: { protein: 12, carbs: 15, fats: 5 } },
  { meal: 'Lunch', foods: ['Chicken Salad'], calories: 550, macros: { protein: 35, carbs: 30, fats: 20 } },
  { meal: 'Afternoon Snack', foods: ['Protein Bar'], calories: 200, macros: { protein: 20, carbs: 25, fats: 8 } },
  { meal: 'Dinner', foods: ['Salmon', 'Rice'], calories: 650, macros: { protein: 40, carbs: 50, fats: 22 } },
  { meal: 'Evening Snack', foods: ['Cottage Cheese'], calories: 120, macros: { protein: 14, carbs: 5, fats: 4 } },
];

console.log('\n🍽️  Testing getNextMeal...\n');

// Returns null for empty
assert(getNextMeal([]) === null, 'Empty array returns null');
assert(getNextMeal(null as any) === null, 'Null input returns null');

// Returns a meal with correct structure
const result = getNextMeal(mockMeals);
assert(result !== null, 'Returns a meal from valid input');
assert(typeof result!.meal === 'string', 'Result has meal name');
assert(Array.isArray(result!.foods), 'Result has foods array');
assert(typeof result!.calories === 'number', 'Result has calories');
assert(typeof result!.macros.protein === 'number', 'Result has macros.protein');
assert(typeof result!.macros.carbs === 'number', 'Result has macros.carbs');
assert(typeof result!.macros.fats === 'number', 'Result has macros.fats');
assert(typeof result!.timeWindow === 'string', 'Result has timeWindow');

// Validate that the returned meal is one from our input
const mealNames = mockMeals.map(m => m.meal);
assert(mealNames.includes(result!.meal), 'Returned meal exists in input');

console.log('\n✅ All mealSchedule tests passed!\n');
