import {
  buildProgramDetailState,
  buildProgramEditorState,
  hydrateProgramSessions,
} from '../src/utils/programSessions';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    console.error(`FAIL: ${message}`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Actual: ${actual}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

const legacyAiDescription = `Here is your plan:

\`\`\`json
{
  "title": "Legacy AI Program",
  "duration": 4,
  "sessions": [
    {
      "dayNumber": 1,
      "title": "Upper Body Push",
      "description": "Pressing focus",
      "isRestDay": false,
      "exercises": [
        { "name": "Bench Press", "sets": 3, "reps": "10", "rest": 60, "notes": "Challenging load" }
      ]
    },
    {
      "dayNumber": 2,
      "title": "Lower Body Strength",
      "description": "Squat focus",
      "isRestDay": false,
      "exercises": [
        { "name": "Squats", "sets": 3, "reps": "8", "rest": 90 }
      ]
    },
    {
      "dayNumber": 3,
      "title": "Upper Body Pull",
      "description": "Back focus",
      "isRestDay": false,
      "exercises": [
        { "name": "Pull-Ups", "sets": 3, "reps": "10", "rest": 60 }
      ]
    },
    {
      "dayNumber": 4,
      "title": "Core and Conditioning",
      "description": "Core focus",
      "isRestDay": false,
      "exercises": [
        { "name": "Plank", "sets": 3, "reps": "60s", "rest": 45 }
      ]
    },
    {
      "dayNumber": 5,
      "title": "Active Recovery",
      "description": "Recovery day",
      "isRestDay": true,
      "exercises": []
    },
    {
      "dayNumber": 6,
      "title": "Full Body Circuit",
      "description": "Conditioning",
      "isRestDay": false,
      "exercises": [
        { "name": "Kettlebell Swings", "sets": 3, "reps": "15", "rest": 60 }
      ]
    },
    {
      "dayNumber": 7,
      "title": "Rest Day",
      "description": "Full rest",
      "isRestDay": true,
      "exercises": []
    }
  ]
}
\`\`\`
`;

function testPersistedSessionsWinOverFallback() {
  console.log('\nTesting persisted sessions precedence...');

  const hydrated = hydrateProgramSessions({
    duration: 4,
    textContent: legacyAiDescription,
    description: legacyAiDescription,
    sessions: [
      {
        id: 91,
        dayNumber: 14,
        title: 'Persisted Session',
        description: 'Real saved data',
        isRestDay: false,
        exercises: [{ name: 'Saved Exercise', sets: 4, reps: '6', rest: 120 }],
      },
    ],
  });

  assertEquals(hydrated.source, 'persisted', 'persisted sessions should take precedence over parsed fallback');
  assertEquals(hydrated.sessions.length, 1, 'persisted hydration should only return the stored sessions');
  assertEquals(hydrated.sessions[0].id, 91, 'persisted session id should be preserved');
  assertEquals(hydrated.sessions[0].title, 'Persisted Session', 'persisted title should win over fallback content');
}

function testDescriptionFallbackHydratesSessions() {
  console.log('\nTesting description fallback parsing...');

  const hydrated = hydrateProgramSessions({
    duration: 4,
    description: legacyAiDescription,
  });

  assertEquals(hydrated.source, 'description', 'description should be used when no persisted sessions exist');
  assertEquals(hydrated.sessions.length, 7, 'fenced JSON description should hydrate all seven template days');
  assertEquals(hydrated.sessions[0].title, 'Upper Body Push', 'first parsed session should match the AI payload');
  assertEquals(hydrated.sessions[0].exercises[0].name, 'Bench Press', 'parsed exercises should be normalized');
}

function testWeeklyTemplateExpandsAcrossDuration() {
  console.log('\nTesting weekly template expansion...');

  const editorState = buildProgramEditorState({
    duration: 4,
    description: legacyAiDescription,
  });

  assertEquals(editorState.weeks, 4, 'editor should derive four weeks from program duration');
  assertEquals(editorState.sessions.length, 28, '7-day legacy template should expand to 28 editor days');
  assertEquals(editorState.sessions[0].title, 'Upper Body Push', 'week one day one should be preserved');
  assertEquals(editorState.sessions[7].dayNumber, 8, 'week two should start at day 8');
  assertEquals(editorState.sessions[7].title, 'Upper Body Push', 'week two should clone the weekly template');
  assert(editorState.sessions[7].id === undefined, 'cloned fallback sessions should not have ids before save');
}

function testSaveRemapPreservesNewIds() {
  console.log('\nTesting save-response id remap...');

  const beforeSave = buildProgramEditorState({
    duration: 4,
    description: legacyAiDescription,
  });
  assert(beforeSave.sessions[0].id === undefined, 'fallback sessions should start without ids');

  const afterSave = buildProgramEditorState(
    {
      sessions: beforeSave.sessions.map((session, index) => ({
        ...session,
        id: index + 1000,
      })),
    },
    { minimumWeeks: beforeSave.weeks },
  );

  assertEquals(afterSave.source, 'persisted', 'save-response remap should switch editor state to persisted sessions');
  assertEquals(afterSave.sessions[0].id, 1000, 'first saved session id should be preserved after remap');
  assertEquals(afterSave.sessions[7].id, 1007, 'expanded week two ids should persist after remap');
  assertEquals(afterSave.sessions[7].title, 'Upper Body Push', 'saved sessions should keep their cloned content after remap');
}

function testPersistedSingleWeekKeepsProgramDuration() {
  console.log('\nTesting persisted single-week duration preservation...');

  const editorState = buildProgramEditorState({
    duration: 4,
    sessions: [
      {
        id: 201,
        dayNumber: 1,
        title: 'Persisted Week One',
        description: 'Saved session',
        isRestDay: false,
        exercises: [{ name: 'Bench Press', sets: 3, reps: '8', rest: 90 }],
      },
    ],
  });

  assertEquals(editorState.source, 'persisted', 'persisted sessions should remain authoritative');
  assertEquals(editorState.weeks, 4, 'persisted week-one-only programs should keep the selected duration');
  assertEquals(editorState.sessions.length, 28, 'persisted week-one-only programs should fill all planned days');
  assertEquals(editorState.sessions[0].id, 201, 'existing day-one id should be preserved');
  assertEquals(editorState.sessions[7].dayNumber, 8, 'missing later weeks should still be represented in editor state');
}

function testWeekNumberAndDayOfWeekNormalizeToSequentialDayNumber() {
  console.log('\nTesting weekNumber/dayOfWeek normalization...');

  const hydrated = hydrateProgramSessions({
    duration: 4,
    sessions: [
      {
        weekNumber: 2,
        dayOfWeek: 3,
        title: 'Week 2 Wednesday',
        isRestDay: false,
        exercises: [{ name: 'Flying Sprint', sets: 4, reps: '1', rest: 180 }],
      },
    ],
  });

  assertEquals(hydrated.sessions.length, 1, 'normalized week/day sessions should be parsed');
  assertEquals(hydrated.sessions[0].dayNumber, 10, 'week 2 day 3 should map to sequential day 10');
  assertEquals(hydrated.sessions[0].title, 'Week 2 Wednesday', 'normalized session should preserve the title');
}

function testLegacyAiPersistedWeekExpandsForDetailView() {
  console.log('\nTesting AI detail-view week expansion...');

  const detailState = buildProgramDetailState({
    duration: 4,
    generatedBy: 'ai',
    sessions: [
      {
        id: 501,
        dayNumber: 1,
        title: 'AI Week One',
        description: 'Template day',
        isRestDay: false,
        exercises: [{ name: 'Acceleration', sets: 4, reps: '1', rest: 180 }],
      },
    ],
  });

  assertEquals(detailState.weeks, 4, 'detail view should keep the full AI program duration');
  assertEquals(detailState.sessions.length, 4, 'AI single-week persisted plans should expand across weeks in the detail view');
  assertEquals(detailState.sessions[0].dayNumber, 1, 'week one should remain day 1');
  assertEquals(detailState.sessions[1].dayNumber, 8, 'week two should begin at day 8 in the detail view');
}

function runTests() {
  console.log('Running program session hydration tests...');

  testPersistedSessionsWinOverFallback();
  testDescriptionFallbackHydratesSessions();
  testWeeklyTemplateExpandsAcrossDuration();
  testSaveRemapPreservesNewIds();
  testPersistedSingleWeekKeepsProgramDuration();
  testWeekNumberAndDayOfWeekNormalizeToSequentialDayNumber();
  testLegacyAiPersistedWeekExpandsForDetailView();

  console.log('\nAll program session hydration tests passed.\n');
}

runTests();
