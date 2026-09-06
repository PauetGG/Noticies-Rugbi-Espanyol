import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { matchSheets, matches } from '@/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTA_URL = 'https://rugby.isquad.es/rugby_acta_completa_pdf.php?id_partido=';

/* ------------------------------------------------------------------ *
 * Validación
 * ------------------------------------------------------------------ */

const sheetSchema = z.object({
  isquadId: z.number().int().positive(),
  homeTries: z.number().int().min(0),
  awayTries: z.number().int().min(0),
  homeScoreCalc: z.number().int().min(0),
  awayScoreCalc: z.number().int().min(0),
  detalle: z.unknown().nullish(),
  error: z.string().nullish(),
});

const bodySchema = z.union([sheetSchema, z.array(sheetSchema).min(1).max(200)]);

function isAuthorized(req: NextRequest): boolean {
  const token = process.env.INGEST_API_KEY;
  if (!token) return false;
  return req.headers.get('authorization') === `Bearer ${token}`;
}

/* ================================================================== *
 * POST
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

  const items = Array.isArray(parsed.data) ? parsed.data : [parsed.data];

  /* --- Partidos correspondientes --- */
  const ids = items.map((i) => i.isquadId);
  const matchRows = await db
    .select({
      id: matches.id,
      isquadId: matches.isquadId,
      matchCode: matches.matchCode,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .where(inArray(matches.isquadId, ids));

  const matchMap = new Map(matchRows.map((m) => [Number(m.isquadId), m]));

  const ok: number[] = [];
  const mismatched: {
    isquadId: number;
    esperado: string;
    calculado: string;
  }[] = [];
  const skipped: { isquadId: number; reason: string }[] = [];

  for (const i of items) {
    const m = matchMap.get(i.isquadId);

    if (!m) {
      skipped.push({ isquadId: i.isquadId, reason: 'partido no encontrado' });
      continue;
    }

    if (m.homeScore == null || m.awayScore == null) {
      skipped.push({ isquadId: i.isquadId, reason: 'el partido no tiene marcador' });
      continue;
    }

    /* La validación que importa: si la suma de los eventos del acta no
     * reproduce el marcador que ya teníamos, el parseo está mal y NO se
     * escriben los ensayos. Mejor un hueco que un dato falso.          */
    const cuadra =
      i.homeScoreCalc === m.homeScore && i.awayScoreCalc === m.awayScore;

    const payload = {
      homeTries: i.homeTries,
      awayTries: i.awayTries,
      homeScoreCalc: i.homeScoreCalc,
      awayScoreCalc: i.awayScoreCalc,
      detalle: i.detalle ?? null,
    };

    /* No guardamos el PDF, así que el hash se calcula sobre el resultado
     * del parseo: si el acta no cambia, el hash tampoco.               */
    const fileHash = createHash('sha256')
      .update(`${i.isquadId}:${JSON.stringify(payload)}`)
      .digest('hex');

    await db
      .insert(matchSheets)
      .values({
        matchId: Number(m.id),
        isquadMatchId: i.isquadId,
        matchCode: m.matchCode,
        sourceUrl: `${ACTA_URL}${i.isquadId}`,
        fileHash,
        parsedPayload: payload as never,
        parseStatus: cuadra ? 'parsed' : 'score_mismatch',
        parseError: cuadra
          ? null
          : `calculado ${i.homeScoreCalc}-${i.awayScoreCalc}, ` +
            `esperado ${m.homeScore}-${m.awayScore}`,
        scoreCheckOk: cuadra,
        parsedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: matchSheets.isquadMatchId,
        targetWhere: sql`${matchSheets.isquadMatchId} is not null`,
        set: {
          matchId: sql`excluded.match_id`,
          matchCode: sql`excluded.match_code`,
          fileHash: sql`excluded.file_hash`,
          parsedPayload: sql`excluded.parsed_payload`,
          parseStatus: sql`excluded.parse_status`,
          parseError: sql`excluded.parse_error`,
          scoreCheckOk: sql`excluded.score_check_ok`,
          parsedAt: sql`now()`,
        },
      });

    if (!cuadra) {
      mismatched.push({
        isquadId: i.isquadId,
        esperado: `${m.homeScore}-${m.awayScore}`,
        calculado: `${i.homeScoreCalc}-${i.awayScoreCalc}`,
      });
      continue;
    }

    await db
      .update(matches)
      .set({
        homeTries: i.homeTries,
        awayTries: i.awayTries,
        updatedAt: sql`now()`,
      })
      .where(eq(matches.id, m.id));

    ok.push(i.isquadId);
  }

  return NextResponse.json({
    received: items.length,
    updated: ok.length,
    mismatched,
    skipped,
  });
}

/* ================================================================== *
 * GET — estado del parseo
 * ================================================================== */

export async function GET() {
  const rows = await db
    .select({
      isquadMatchId: matchSheets.isquadMatchId,
      matchCode: matchSheets.matchCode,
      parseStatus: matchSheets.parseStatus,
      scoreCheckOk: matchSheets.scoreCheckOk,
      parseError: matchSheets.parseError,
    })
    .from(matchSheets);

  return NextResponse.json({
    count: rows.length,
    ok: rows.filter((r) => r.scoreCheckOk).length,
    sheets: rows.map((r) => ({
      ...r,
      isquadMatchId: r.isquadMatchId != null ? Number(r.isquadMatchId) : null,
    })),
  });
}