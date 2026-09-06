import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { competitionSeasons, matches, rounds, teams } from '@/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Minúsculas, sin acentos, sin puntuación, espacios colapsados. */
function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Slug estable para URLs: "CR Cisneros" -> "cr-cisneros". */
function slugify(input: string): string {
  return normalize(input).replace(/\s/g, '-');
}

/** iSquad puede escribir "played"; nuestro CHECK usa "finished". */
const STATUS_MAP: Record<string, string> = {
  scheduled: 'scheduled',
  live: 'live',
  halftime: 'halftime',
  played: 'finished',
  finished: 'finished',
  postponed: 'postponed',
  cancelled: 'cancelled',
  walkover: 'walkover',
};

/* ------------------------------------------------------------------ *
 * Validación
 * ------------------------------------------------------------------ */

const matchInputSchema = z.object({
  competitionSeasonSlug: z.string().min(1),

  /* Clave de deduplicación.
   *
   * iSquad NO expone un id de partido, así que la construimos nosotros a
   * partir de piezas que sí son estables: jornada + ids de los dos equipos.
   * Se puede enviar explícitamente en `matchCode`; si no, el endpoint la
   * genera. Es única dentro de cada competition_season.                   */
  matchCode: z.string().min(1).nullish(),

  /* Fase: "f1", "grupo-a", "grupo-b"... Evita que la jornada 1 de la
   * segunda fase choque con la jornada 1 de la liga regular.              */
  phase: z.string().min(1).nullish(),

  round: z.number().int().positive().nullish(),

  /* Opcional: si algún día iSquad expone id de partido, entra aquí. */
  isquadId: z.number().int().positive().nullish(),

  kickoffAt: z.string().datetime({ offset: true }).nullish(),
  kickoffTbd: z.boolean().nullish(),
  venueName: z.string().nullish(),

  /* Equipos: por id de iSquad (preferido) o por nombre (fallback aliases). */
  homeTeamIsquadId: z.number().int().positive().nullish(),
  awayTeamIsquadId: z.number().int().positive().nullish(),
  homeTeam: z.string().nullish(),
  awayTeam: z.string().nullish(),

  homeScore: z.number().int().min(0).nullish(),
  awayScore: z.number().int().min(0).nullish(),

  status: z
    .enum([
      'scheduled',
      'live',
      'halftime',
      'played',
      'finished',
      'postponed',
      'cancelled',
      'walkover',
    ])
    .nullish(),

  walkoverWinnerIsquadId: z.number().int().positive().nullish(),
  walkoverWinner: z.string().nullish(),

  refereeName: z.string().nullish(),

  raw: z.unknown().nullish(),
});

const bodySchema = z.union([
  matchInputSchema,
  z.array(matchInputSchema).min(1).max(500),
]);

type MatchInput = z.infer<typeof matchInputSchema>;

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.INGEST_API_KEY;
  if (!token) return false;
  return req.headers.get('authorization') === `Bearer ${token}`;
}

/* ------------------------------------------------------------------ *
 * Resolución de equipos
 * ------------------------------------------------------------------ */

type TeamRow = {
  id: number;
  slug: string;
  name: string;
  isquadId: number | null;
  aliases: string[] | null;
};

type TeamIndex = {
  byIsquad: Map<number, TeamRow>;
  byName: Map<string, TeamRow | 'ambiguous'>;
};

function buildTeamIndex(rows: TeamRow[]): TeamIndex {
  const byIsquad = new Map<number, TeamRow>();
  const byName = new Map<string, TeamRow | 'ambiguous'>();

  for (const t of rows) {
    if (t.isquadId != null) byIsquad.set(t.isquadId, t);

    const keys = [t.name, ...(t.aliases ?? [])].map(normalize).filter(Boolean);
    for (const k of keys) {
      const prev = byName.get(k);
      byName.set(k, prev && prev !== t ? 'ambiguous' : t);
    }
  }

  return { byIsquad, byName };
}

type Resolution = { ok: true; team: TeamRow } | { ok: false; reason: string };

function resolveTeam(
  index: TeamIndex,
  isquadId: number | null | undefined,
  name: string | null | undefined,
): Resolution {
  if (isquadId != null) {
    const hit = index.byIsquad.get(isquadId);
    if (hit) return { ok: true, team: hit };
    return {
      ok: false,
      reason: `equipo sin isquad_id ${isquadId}${name ? ` ("${name}")` : ''}`,
    };
  }

  if (name) {
    const hit = index.byName.get(normalize(name));
    if (hit === 'ambiguous') return { ok: false, reason: `alias ambiguo: "${name}"` };
    if (hit) return { ok: true, team: hit };
    return { ok: false, reason: `equipo sin alias: "${name}"` };
  }

  return { ok: false, reason: 'falta equipo (ni isquadId ni nombre)' };
}

/** Pieza del match_code para un equipo: su id de iSquad, o el interno. */
function teamKey(t: TeamRow): string {
  return t.isquadId != null ? String(t.isquadId) : `t${t.id}`;
}

/* ================================================================== *
 * POST — ingesta
 * ================================================================== */

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation failed', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const items: MatchInput[] = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  const rejected: { matchCode: string | null; reason: string }[] = [];

  /* --- 1. Competiciones-temporada --- */
  const csSlugs = [...new Set(items.map((i) => i.competitionSeasonSlug))];
  const csRows = await db
    .select({ id: competitionSeasons.id, slug: competitionSeasons.slug })
    .from(competitionSeasons)
    .where(inArray(competitionSeasons.slug, csSlugs));

  const csMap = new Map(csRows.map((c) => [c.slug, c.id]));

  /* --- 2. Jornadas: crear las que falten --- */
  const roundSlug = (phase: string | null | undefined, n: number) =>
    phase ? `${slugify(phase)}-jornada-${String(n).padStart(2, '0')}`
          : `jornada-${String(n).padStart(2, '0')}`;

  const neededRounds = new Map<
    string,
    { competitionSeasonId: number; number: number; slug: string; name: string }
  >();

  for (const i of items) {
    const csId = csMap.get(i.competitionSeasonSlug);
    if (!csId || i.round == null) continue;
    const slug = roundSlug(i.phase, i.round);
    neededRounds.set(`${csId}:${slug}`, {
      competitionSeasonId: csId,
      number: i.round,
      slug,
      name: i.phase ? `${i.phase} — Jornada ${i.round}` : `Jornada ${i.round}`,
    });
  }

  if (neededRounds.size > 0) {
    await db
      .insert(rounds)
      .values(
        [...neededRounds.values()].map((r) => ({
          competitionSeasonId: r.competitionSeasonId,
          number: r.number,
          name: r.name,
          slug: r.slug,
          stage: 'regular',
        })),
      )
      .onConflictDoNothing({ target: [rounds.competitionSeasonId, rounds.slug] });
  }

  const csIds = [...new Set(csRows.map((c) => c.id))];
  const roundRows = csIds.length
    ? await db
        .select({
          id: rounds.id,
          competitionSeasonId: rounds.competitionSeasonId,
          slug: rounds.slug,
        })
        .from(rounds)
        .where(inArray(rounds.competitionSeasonId, csIds))
    : [];

  const roundMap = new Map(
    roundRows.map((r) => [`${r.competitionSeasonId}:${r.slug}`, r.id]),
  );

  /* --- 3. Índice de equipos --- */
  const teamRows = (await db
    .select({
      id: teams.id,
      slug: teams.slug,
      name: teams.name,
      isquadId: teams.isquadId,
      aliases: teams.aliases,
    })
    .from(teams)) as TeamRow[];

  const teamIndex = buildTeamIndex(teamRows);

  /* --- 4. Construir filas --- */
  const rows: (typeof matches.$inferInsert)[] = [];
  const seenCodes = new Set<string>();

  for (const i of items) {
    const competitionSeasonId = csMap.get(i.competitionSeasonSlug);
    if (!competitionSeasonId) {
      rejected.push({
        matchCode: i.matchCode ?? null,
        reason: `competición-temporada desconocida: ${i.competitionSeasonSlug}`,
      });
      continue;
    }

    const home = resolveTeam(teamIndex, i.homeTeamIsquadId, i.homeTeam);
    const away = resolveTeam(teamIndex, i.awayTeamIsquadId, i.awayTeam);

    if (!home.ok || !away.ok) {
      rejected.push({
        matchCode: i.matchCode ?? null,
        reason: [
          !home.ok ? `local: ${home.reason}` : null,
          !away.ok ? `visitante: ${away.reason}` : null,
        ]
          .filter(Boolean)
          .join(' | '),
      });
      continue;
    }

    if (home.team.id === away.team.id) {
      rejected.push({ matchCode: i.matchCode ?? null, reason: 'local = visitante' });
      continue;
    }

    /* --- match_code: el que venga, o uno construido --- */
    let matchCode = i.matchCode ?? null;

    if (!matchCode) {
      if (i.round == null) {
        rejected.push({
          matchCode: null,
          reason: 'sin matchCode y sin round: no se puede generar clave',
        });
        continue;
      }
      const phasePart = i.phase ? `${slugify(i.phase)}-` : '';
      matchCode =
        `${phasePart}J${String(i.round).padStart(2, '0')}` +
        `-${teamKey(home.team)}-${teamKey(away.team)}`;
    }

    /* Un mismo lote no puede traer dos veces la misma clave: Postgres
     * aborta el INSERT entero con "ON CONFLICT DO UPDATE command cannot
     * affect row a second time". Mejor rechazar el duplicado aquí.       */
    const dedupKey = `${competitionSeasonId}:${matchCode}`;
    if (seenCodes.has(dedupKey)) {
      rejected.push({ matchCode, reason: 'clave duplicada dentro del mismo lote' });
      continue;
    }
    seenCodes.add(dedupKey);

    const hasScore = i.homeScore != null && i.awayScore != null;
    const status = STATUS_MAP[i.status ?? (hasScore ? 'finished' : 'scheduled')];

    /* Ganador por incomparecencia */
    let walkoverWinnerId: number | null = null;
    if (status === 'walkover') {
      const w = resolveTeam(teamIndex, i.walkoverWinnerIsquadId, i.walkoverWinner);
      if (!w.ok) {
        rejected.push({ matchCode, reason: `walkover — ${w.reason}` });
        continue;
      }
      if (w.team.id !== home.team.id && w.team.id !== away.team.id) {
        rejected.push({
          matchCode,
          reason: `walkover: "${w.team.name}" no juega este partido`,
        });
        continue;
      }
      walkoverWinnerId = w.team.id;
    }

    const roundId =
      i.round != null
        ? roundMap.get(`${competitionSeasonId}:${roundSlug(i.phase, i.round)}`) ?? null
        : null;

    const slug = slugify(
      `${i.competitionSeasonSlug}-${matchCode}-${home.team.slug}-vs-${away.team.slug}`,
    );

    rows.push({
      competitionSeasonId,
      roundId,
      slug,
      matchCode,
      isquadId: i.isquadId ?? null,
      homeTeamId: home.team.id,
      awayTeamId: away.team.id,
      kickoffAt: i.kickoffAt ?? null,
      kickoffTbd: i.kickoffTbd ?? false,
      venueName: i.venueName ?? null,
      homeScore: hasScore ? i.homeScore! : null,
      awayScore: hasScore ? i.awayScore! : null,
      status,
      walkoverWinnerId,
      refereeName: i.refereeName ?? null,
      dataSource: 'scrape',
      raw: (i.raw ?? null) as never,
    });
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { received: items.length, inserted: 0, updated: 0, unchanged: 0, rejected },
      { status: rejected.length ? 422 : 200 },
    );
  }

  /* --- 5. Upsert sobre (competition_season_id, match_code) --- *
   * El índice es parcial (WHERE match_code IS NOT NULL), así que hay que
   * replicar esa condición en targetWhere.
   *
   * NO se tocan aquí: slug (URL pública), home_tries / away_tries, los
   * league_points ni los flags de bonus. Eso lo llenan las actas y el
   * cálculo de clasificación; sobrescribirlo con null borraría trabajo.  */
  const result = await db
    .insert(matches)
    .values(rows)
    .onConflictDoUpdate({
      target: [matches.competitionSeasonId, matches.matchCode],
      targetWhere: sql`${matches.matchCode} is not null`,
      set: {
        roundId: sql`excluded.round_id`,
        isquadId: sql`excluded.isquad_id`,
        homeTeamId: sql`excluded.home_team_id`,
        awayTeamId: sql`excluded.away_team_id`,
        kickoffAt: sql`excluded.kickoff_at`,
        kickoffTbd: sql`excluded.kickoff_tbd`,
        venueName: sql`excluded.venue_name`,
        homeScore: sql`excluded.home_score`,
        awayScore: sql`excluded.away_score`,
        status: sql`excluded.status`,
        walkoverWinnerId: sql`excluded.walkover_winner_id`,
        refereeName: sql`excluded.referee_name`,
        raw: sql`excluded.raw`,
        updatedAt: sql`now()`,
      },
      setWhere: sql`
        ${matches.homeScore}           is distinct from excluded.home_score
        or ${matches.awayScore}        is distinct from excluded.away_score
        or ${matches.status}           is distinct from excluded.status
        or ${matches.kickoffAt}        is distinct from excluded.kickoff_at
        or ${matches.venueName}        is distinct from excluded.venue_name
        or ${matches.roundId}          is distinct from excluded.round_id
        or ${matches.homeTeamId}       is distinct from excluded.home_team_id
        or ${matches.awayTeamId}       is distinct from excluded.away_team_id
        or ${matches.refereeName}      is distinct from excluded.referee_name
        or ${matches.walkoverWinnerId} is distinct from excluded.walkover_winner_id
      `,
    })
    .returning({
      id: matches.id,
      matchCode: matches.matchCode,
      isNew: sql<boolean>`(xmax = 0)`,
    });

  const inserted = result.filter((r) => r.isNew).length;

  return NextResponse.json({
    received: items.length,
    inserted,
    updated: result.length - inserted,
    unchanged: rows.length - result.length,
    rejected,
  });
}

/* ================================================================== *
 * GET — consulta
 *
 *   /api/matches?competition=division-de-honor-2025-26&round=1
 *   /api/matches?from=2025-09-27T00:00:00Z&to=2025-09-29T00:00:00Z
 *   /api/matches?status=finished&limit=20
 * ================================================================== */

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const competitionSlug = sp.get('competition');
  const roundParam = sp.get('round');
  const statusParam = sp.get('status');
  const from = sp.get('from');
  const to = sp.get('to');
  const limit = Math.min(Number(sp.get('limit') ?? 100) || 100, 500);

  const conditions = [];
  let competitionSeasonId: number | null = null;

  if (competitionSlug) {
    const [cs] = await db
      .select({ id: competitionSeasons.id })
      .from(competitionSeasons)
      .where(eq(competitionSeasons.slug, competitionSlug))
      .limit(1);

    if (!cs) {
      return NextResponse.json(
        { error: 'competition season not found' },
        { status: 404 },
      );
    }
    competitionSeasonId = cs.id;
    conditions.push(eq(matches.competitionSeasonId, cs.id));
  }

  if (roundParam) {
    const n = Number(roundParam);
    if (!Number.isInteger(n)) {
      return NextResponse.json({ error: 'invalid round' }, { status: 400 });
    }
    const roundConds = [eq(rounds.number, n)];
    if (competitionSeasonId != null) {
      roundConds.push(eq(rounds.competitionSeasonId, competitionSeasonId));
    }
    const roundIds = await db
      .select({ id: rounds.id })
      .from(rounds)
      .where(and(...roundConds));

    if (roundIds.length === 0) return NextResponse.json({ count: 0, matches: [] });

    conditions.push(inArray(matches.roundId, roundIds.map((r) => r.id)));
  }

  if (statusParam) conditions.push(eq(matches.status, statusParam));
  if (from) conditions.push(gte(matches.kickoffAt, from));
  if (to) conditions.push(lte(matches.kickoffAt, to));

  const rows = await db
    .select({
      id: matches.id,
      slug: matches.slug,
      matchCode: matches.matchCode,
      roundId: matches.roundId,
      kickoffAt: matches.kickoffAt,
      kickoffTbd: matches.kickoffTbd,
      venueName: matches.venueName,
      status: matches.status,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      homeTries: matches.homeTries,
      awayTries: matches.awayTries,
      walkoverWinnerId: matches.walkoverWinnerId,
    })
    .from(matches)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(matches.kickoffAt), asc(matches.id))
    .limit(limit);

  const teamIds = [...new Set(rows.flatMap((r) => [r.homeTeamId, r.awayTeamId]))];

  const teamRows = teamIds.length
    ? await db
        .select({
          id: teams.id,
          slug: teams.slug,
          name: teams.name,
          shortName: teams.shortName,
          crestUrl: teams.crestUrl,
        })
        .from(teams)
        .where(inArray(teams.id, teamIds))
    : [];

  const tMap = new Map(teamRows.map((t) => [t.id, t]));

  const data = rows.map((r) => ({
    ...r,
    id: Number(r.id),
    homeTeam: tMap.get(r.homeTeamId) ?? null,
    awayTeam: tMap.get(r.awayTeamId) ?? null,
  }));

  return NextResponse.json({ count: data.length, matches: data });
}