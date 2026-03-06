import { storage } from './storage';

export async function seedDefaultContent(userId: number): Promise<void> {
  // Nutrition Plan 1: Sprint Performance Fuel
  await storage.createNutritionPlan({
    userId,
    title: 'Sprint Performance Fuel',
    description: 'Optimized in-season nutrition plan for peak sprint performance. High protein for recovery, moderate carbs for explosive energy.',
    activityLevel: 'very_active',
    season: 'in_season',
    calorieTarget: 2800,
    proteinGrams: 180,
    carbsGrams: 340,
    fatsGrams: 85,
    createdBy: 'ai',
    status: 'active',
    mealSuggestions: [
      {
        meal: 'Breakfast',
        foods: ['3 scrambled eggs', 'Oatmeal with honey', 'Banana', 'Orange juice'],
        calories: 720,
        macros: { protein: 38, carbs: 95, fats: 22 },
      },
      {
        meal: 'Mid-Morning Snack',
        foods: ['Whey protein shake', 'Handful of almonds', 'Apple'],
        calories: 420,
        macros: { protein: 35, carbs: 40, fats: 15 },
      },
      {
        meal: 'Lunch',
        foods: ['Grilled chicken breast (200g)', 'Brown rice (1.5 cups)', 'Steamed broccoli', 'Olive oil drizzle'],
        calories: 850,
        macros: { protein: 55, carbs: 105, fats: 20 },
      },
      {
        meal: 'Dinner',
        foods: ['Baked salmon fillet (180g)', 'Sweet potato (large)', 'Mixed green salad', 'Avocado slices'],
        calories: 810,
        macros: { protein: 52, carbs: 100, fats: 28 },
      },
    ],
  });

  // Nutrition Plan 2: Off-Season Recovery
  await storage.createNutritionPlan({
    userId,
    title: 'Off-Season Recovery',
    description: 'Lower calorie anti-inflammatory plan for the off-season. Focus on nutrient-dense foods to support tissue repair and lean muscle maintenance.',
    activityLevel: 'moderate',
    season: 'off_season',
    calorieTarget: 2400,
    proteinGrams: 160,
    carbsGrams: 280,
    fatsGrams: 75,
    createdBy: 'ai',
    status: 'active',
    mealSuggestions: [
      {
        meal: 'Breakfast',
        foods: ['Smoothie bowl (banana, blueberries, spinach, protein powder)', 'Chia seeds', 'Sliced kiwi'],
        calories: 550,
        macros: { protein: 35, carbs: 72, fats: 14 },
      },
      {
        meal: 'Lunch',
        foods: ['Grilled fish tacos (2)', 'Black bean salad', 'Lime crema', 'Watermelon slices'],
        calories: 780,
        macros: { protein: 48, carbs: 95, fats: 24 },
      },
      {
        meal: 'Dinner',
        foods: ['Chicken stir-fry with vegetables', 'Jasmine rice (1 cup)', 'Miso soup', 'Green tea'],
        calories: 700,
        macros: { protein: 45, carbs: 88, fats: 18 },
      },
    ],
  });

  // Program 1: Sprint Starter Program
  const sprintProgram = await storage.createProgram({
    userId,
    title: 'Sprint Starter Program',
    description: 'A beginner-friendly 4-week program to build sprint fundamentals. Covers block starts, acceleration, and tempo runs.',
    category: 'sprint',
    level: 'beginner',
    duration: 4,
    totalSessions: 3,
    generatedBy: 'ai',
    status: 'active',
  });

  await storage.createProgramSession({
    programId: sprintProgram.id,
    dayNumber: 1,
    title: 'Block Starts & Acceleration',
    description: 'Focus on explosive starts and first 30m drive phase.',
    exercises: [
      { name: 'Block Start Drills', sets: 6, reps: '1 x 30m', rest: 180, notes: 'Full recovery between reps. Focus on shin angles.' },
      { name: 'A-Skip to Sprint', sets: 4, reps: '1 x 40m', rest: 120, notes: 'Transition from drill to full sprint at 20m mark.' },
      { name: 'Falling Starts', sets: 4, reps: '1 x 20m', rest: 120, notes: 'Lean forward and explode on first step.' },
    ],
  });

  await storage.createProgramSession({
    programId: sprintProgram.id,
    dayNumber: 2,
    title: 'Tempo Runs & Conditioning',
    description: 'Aerobic conditioning with tempo runs to build a fitness base.',
    exercises: [
      { name: 'Tempo 100m Repeats', sets: 6, reps: '1 x 100m', rest: 90, notes: '65-70% effort. Walk back recovery.' },
      { name: 'Core Circuit', sets: 3, reps: '10 each', rest: 60, notes: 'Planks, dead bugs, bird dogs, pallof press.' },
    ],
  });

  await storage.createProgramSession({
    programId: sprintProgram.id,
    dayNumber: 3,
    title: 'Recovery Day',
    description: 'Light movement, foam rolling, and stretching.',
    isRestDay: true,
  });

  // Program 2: Strength Foundations
  const strengthProgram = await storage.createProgram({
    userId,
    title: 'Strength Foundations',
    description: 'Build a strength foundation for sprint performance. Progressive overload focused on posterior chain and explosive power.',
    category: 'strength',
    level: 'beginner',
    duration: 4,
    totalSessions: 3,
    generatedBy: 'ai',
    status: 'active',
  });

  await storage.createProgramSession({
    programId: strengthProgram.id,
    dayNumber: 1,
    title: 'Lower Body Strength',
    description: 'Squat and posterior chain focus for sprint power.',
    exercises: [
      { name: 'Back Squats', sets: 4, reps: '6', rest: 180, notes: 'Moderate weight, focus on depth and form.' },
      { name: 'Romanian Deadlifts', sets: 3, reps: '8', rest: 120, notes: 'Slow eccentric, squeeze glutes at top.' },
      { name: 'Walking Lunges', sets: 3, reps: '10 each leg', rest: 90, notes: 'Bodyweight or light dumbbells.' },
    ],
  });

  await storage.createProgramSession({
    programId: strengthProgram.id,
    dayNumber: 2,
    title: 'Upper Body & Core',
    description: 'Build upper body strength and core stability for sprint posture.',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: '8', rest: 120, notes: 'Controlled tempo, full range of motion.' },
      { name: 'Bent-Over Rows', sets: 3, reps: '10', rest: 90, notes: 'Squeeze shoulder blades together.' },
      { name: 'Plank Variations', sets: 3, reps: '30 seconds each', rest: 60, notes: 'Front plank, side plank left, side plank right.' },
    ],
  });

  await storage.createProgramSession({
    programId: strengthProgram.id,
    dayNumber: 3,
    title: 'Plyometrics & Power',
    description: 'Explosive movements to develop rate of force development.',
    exercises: [
      { name: 'Box Jumps', sets: 4, reps: '5', rest: 120, notes: 'Step down between reps. Focus on height.' },
      { name: 'Bounding', sets: 4, reps: '6 each leg', rest: 90, notes: 'Exaggerate knee drive and flight time.' },
      { name: 'Medicine Ball Slams', sets: 3, reps: '8', rest: 60, notes: 'Full hip extension, slam with force.' },
    ],
  });
}
