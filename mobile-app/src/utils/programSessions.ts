import { safeParseExercises } from './formatting';

export interface HydratedProgramExercise {
  name: string;
  sets?: number;
  reps?: string;
  duration?: number;
  rest?: number;
  notes?: string;
}

export interface HydratedProgramSession {
  id?: number;
  dayNumber: number;
  title: string;
  description: string;
  exercises: HydratedProgramExercise[];
  isRestDay: boolean;
  isCompleted?: boolean;
}

export type ProgramSessionHydrationSource =
  | 'persisted'
  | 'textContent'
  | 'description'
  | 'none';

export interface ProgramSessionHydrationInput {
  duration?: number | null;
  description?: string | null;
  textContent?: string | null;
  generatedBy?: string | null;
  sessions?: unknown[] | null;
}

export interface HydratedProgramSessionsResult {
  sessions: HydratedProgramSession[];
  source: ProgramSessionHydrationSource;
}

export interface ProgramEditorStateResult extends HydratedProgramSessionsResult {
  weeks: number;
}

export interface ProgramDetailStateResult extends HydratedProgramSessionsResult {
  weeks: number;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function toWeeks(value: unknown): number {
  const parsed = toOptionalNumber(value);
  if (!parsed || parsed <= 0) return 1;
  return Math.max(1, Math.ceil(parsed));
}

function cloneExercise(exercise: HydratedProgramExercise): HydratedProgramExercise {
  return {
    name: exercise.name,
    ...(exercise.sets !== undefined ? { sets: exercise.sets } : {}),
    ...(exercise.reps !== undefined ? { reps: exercise.reps } : {}),
    ...(exercise.duration !== undefined ? { duration: exercise.duration } : {}),
    ...(exercise.rest !== undefined ? { rest: exercise.rest } : {}),
    ...(exercise.notes !== undefined ? { notes: exercise.notes } : {}),
  };
}

function cloneSession(
  session: HydratedProgramSession,
  overrides: Partial<HydratedProgramSession> = {},
): HydratedProgramSession {
  const nextExercises = (overrides.exercises ?? session.exercises).map(cloneExercise);
  const hasIdOverride = Object.prototype.hasOwnProperty.call(overrides, 'id');

  return {
    ...(!hasIdOverride && session.id !== undefined ? { id: session.id } : {}),
    ...(hasIdOverride && overrides.id !== undefined ? { id: overrides.id } : {}),
    dayNumber: overrides.dayNumber ?? session.dayNumber,
    title: overrides.title ?? session.title,
    description: overrides.description ?? session.description,
    exercises: nextExercises,
    isRestDay: overrides.isRestDay ?? session.isRestDay,
    ...(overrides.isCompleted !== undefined
      ? { isCompleted: overrides.isCompleted }
      : session.isCompleted !== undefined
        ? { isCompleted: session.isCompleted }
        : {}),
  };
}

function createEmptySession(dayNumber: number): HydratedProgramSession {
  return {
    dayNumber,
    title: '',
    description: '',
    exercises: [],
    isRestDay: false,
  };
}

function unwrapEnvelope(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return parsed;
  }

  const maybeRecommendation = (parsed as { recommendation?: unknown }).recommendation;
  if (typeof maybeRecommendation === 'string') {
    try {
      const inner = JSON.parse(maybeRecommendation);
      if (inner && typeof inner === 'object') {
        return { ...(parsed as Record<string, unknown>), ...(inner as Record<string, unknown>) };
      }
    } catch {
      return parsed;
    }
  }

  return parsed;
}

function parseAIProgramPayload(content: string | null | undefined): unknown {
  if (!content) return null;
  const raw = content.trim();
  if (!raw) return null;

  try {
    return unwrapEnvelope(JSON.parse(raw));
  } catch {
    // Fall through to more permissive extraction.
  }

  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]+?)\n?\s*```/i);
  if (fenceMatch) {
    try {
      return unwrapEnvelope(JSON.parse(fenceMatch[1].trim()));
    } catch {
      // Continue to brace extraction.
    }
  }

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return unwrapEnvelope(JSON.parse(raw.slice(firstBrace, lastBrace + 1)));
    } catch {
      // Continue to bracket extraction.
    }
  }

  const firstBracket = raw.indexOf('[');
  const lastBracket = raw.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return unwrapEnvelope(JSON.parse(raw.slice(firstBracket, lastBracket + 1)));
    } catch {
      return null;
    }
  }

  return null;
}

function extractSessionCandidates(content: string | null | undefined): unknown[] {
  const parsed = parseAIProgramPayload(content);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    const sessions = (parsed as { sessions?: unknown }).sessions;
    if (Array.isArray(sessions)) return sessions;
  }
  return [];
}

function normalizeExercise(exercise: unknown): HydratedProgramExercise | null {
  if (!exercise || typeof exercise !== 'object') return null;

  const source = exercise as Record<string, unknown>;
  return {
    name: typeof source.name === 'string' ? source.name : '',
    ...(toOptionalNumber(source.sets) !== undefined ? { sets: toOptionalNumber(source.sets) } : {}),
    ...(toOptionalString(source.reps) !== undefined ? { reps: toOptionalString(source.reps) } : {}),
    ...(toOptionalNumber(source.duration) !== undefined ? { duration: toOptionalNumber(source.duration) } : {}),
    ...(toOptionalNumber(source.rest) !== undefined ? { rest: toOptionalNumber(source.rest) } : {}),
    ...(typeof source.notes === 'string' ? { notes: source.notes } : {}),
  };
}

function normalizeSession(session: unknown): HydratedProgramSession | null {
  if (!session || typeof session !== 'object') return null;

  const source = session as Record<string, unknown>;
  const weekNumber = toOptionalNumber(source.weekNumber);
  const dayOfWeek = toOptionalNumber(source.dayOfWeek);
  const derivedDayNumber =
    weekNumber && dayOfWeek
      ? ((weekNumber - 1) * 7) + dayOfWeek
      : undefined;
  const dayNumber = derivedDayNumber ?? toOptionalNumber(source.dayNumber);
  const id = toOptionalNumber(source.id);
  if (!dayNumber || dayNumber < 1) return null;

  const exercises = safeParseExercises(source.exercises)
    .map(normalizeExercise)
    .filter((exercise): exercise is HydratedProgramExercise => exercise !== null);

  return {
    ...(id !== undefined ? { id } : {}),
    dayNumber,
    title: typeof source.title === 'string' ? source.title : '',
    description: typeof source.description === 'string' ? source.description : '',
    exercises,
    isRestDay: source.isRestDay === true || source.isRestDay === 'true',
    ...(typeof source.isCompleted === 'boolean' ? { isCompleted: source.isCompleted } : {}),
  };
}

export function normalizeProgramSessions(sessions: unknown[] | null | undefined): HydratedProgramSession[] {
  if (!Array.isArray(sessions)) return [];

  return sessions
    .map(normalizeSession)
    .filter((session): session is HydratedProgramSession => session !== null)
    .sort((left, right) => left.dayNumber - right.dayNumber)
    .map((session) => cloneSession(session));
}

export function hydrateProgramSessions(
  program: ProgramSessionHydrationInput,
): HydratedProgramSessionsResult {
  const persistedSessions = normalizeProgramSessions(program.sessions);
  if (persistedSessions.length > 0) {
    return { sessions: persistedSessions, source: 'persisted' };
  }

  const textSessions = normalizeProgramSessions(extractSessionCandidates(program.textContent));
  if (textSessions.length > 0) {
    return { sessions: textSessions, source: 'textContent' };
  }

  const descriptionSessions = normalizeProgramSessions(extractSessionCandidates(program.description));
  if (descriptionSessions.length > 0) {
    return { sessions: descriptionSessions, source: 'description' };
  }

  return { sessions: [], source: 'none' };
}

function expandWeeklyTemplate(
  sessions: HydratedProgramSession[],
  totalWeeks: number,
): HydratedProgramSession[] {
  const expanded: HydratedProgramSession[] = [];

  for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex += 1) {
    const dayOffset = weekIndex * 7;
    for (const session of sessions) {
      expanded.push(
        cloneSession(session, {
          id: undefined,
          dayNumber: session.dayNumber + dayOffset,
        }),
      );
    }
  }

  return expanded.sort((left, right) => left.dayNumber - right.dayNumber);
}

function fillSessionGaps(
  sessions: HydratedProgramSession[],
  totalDays: number,
): HydratedProgramSession[] {
  const sessionByDay = new Map<number, HydratedProgramSession>();

  for (const session of sessions) {
    if (!sessionByDay.has(session.dayNumber)) {
      sessionByDay.set(session.dayNumber, cloneSession(session));
    }
  }

  const filled: HydratedProgramSession[] = [];
  for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
    filled.push(sessionByDay.get(dayNumber) ?? createEmptySession(dayNumber));
  }

  return filled;
}

function shouldExpandSingleWeekTemplate(
  program: ProgramSessionHydrationInput,
  source: ProgramSessionHydrationSource,
  maxDayNumber: number,
): boolean {
  if (maxDayNumber > 7) return false;
  const durationWeeks = toWeeks(program.duration);
  if (durationWeeks <= 1) return false;

  return source !== 'persisted' || program.generatedBy === 'ai';
}

export function buildProgramEditorState(
  program: ProgramSessionHydrationInput,
  options: { minimumWeeks?: number } = {},
): ProgramEditorStateResult {
  const hydrated = hydrateProgramSessions(program);
  const durationWeeks = toWeeks(program.duration);
  const minimumWeeks = toWeeks(options.minimumWeeks);
  const maxDayNumber = hydrated.sessions.reduce(
    (maxDay, session) => Math.max(maxDay, session.dayNumber),
    0,
  );

  if (hydrated.source === 'persisted') {
    const weeks = Math.max(1, durationWeeks, Math.ceil(maxDayNumber / 7), minimumWeeks);
    return {
      ...hydrated,
      weeks,
      sessions: fillSessionGaps(hydrated.sessions, weeks * 7),
    };
  }

  let editorSessions = hydrated.sessions;
  let weeks = Math.max(1, durationWeeks, Math.ceil(maxDayNumber / 7), minimumWeeks);

  if (editorSessions.length > 0 && maxDayNumber <= 7 && weeks > 1) {
    editorSessions = expandWeeklyTemplate(editorSessions, weeks);
  }

  return {
    source: hydrated.source,
    weeks,
    sessions: fillSessionGaps(editorSessions, weeks * 7),
  };
}

export function buildProgramDetailState(
  program: ProgramSessionHydrationInput,
): ProgramDetailStateResult {
  const hydrated = hydrateProgramSessions(program);
  const durationWeeks = toWeeks(program.duration);
  const maxDayNumber = hydrated.sessions.reduce(
    (maxDay, session) => Math.max(maxDay, session.dayNumber),
    0,
  );
  const weeks = Math.max(1, durationWeeks, Math.ceil(maxDayNumber / 7));

  let sessions = hydrated.sessions;
  if (sessions.length > 0 && shouldExpandSingleWeekTemplate(program, hydrated.source, maxDayNumber)) {
    sessions = expandWeeklyTemplate(sessions, weeks);
  }

  return {
    source: hydrated.source,
    weeks,
    sessions,
  };
}
