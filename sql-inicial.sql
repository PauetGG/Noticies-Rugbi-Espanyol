-- =====================================================================
-- RUGBY ESPAÑOL — BLOQUE 1: CONTENIDO
-- PostgreSQL 15+
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- búsqueda y similitud de títulos
CREATE EXTENSION IF NOT EXISTS unaccent;   -- búsqueda ignorando tildes

-- =====================================================================
-- 1. ENTIDADES BASE
-- Viven aquí porque el contenido las referencia. El bloque de datos
-- deportivos las ampliará (calendario, clasificación, estadísticas).
-- =====================================================================

CREATE TABLE competitions (
    id            SERIAL PRIMARY KEY,
    slug          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    short_name    TEXT,
    gender        TEXT NOT NULL DEFAULT 'male'
                  CHECK (gender IN ('male','female','mixed')),
    level         TEXT
                  CHECK (level IN ('senior','sub23','sub18','sub16','veteranos')),
    country       TEXT DEFAULT 'ES',
    is_domestic   BOOLEAN DEFAULT TRUE,
    logo_url      TEXT,
    active        BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE seasons (
    id            SERIAL PRIMARY KEY,
    slug          TEXT NOT NULL UNIQUE,      -- '2025-26'
    name          TEXT NOT NULL,
    start_date    DATE,
    end_date      DATE,
    is_current    BOOLEAN DEFAULT FALSE
);

-- Solo una temporada marcada como actual
CREATE UNIQUE INDEX one_current_season
    ON seasons (is_current) WHERE is_current;

CREATE TABLE teams (
    id            SERIAL PRIMARY KEY,
    slug          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    short_name    TEXT,
    aliases       TEXT[],                    -- para detectar menciones en texto
    city          TEXT,
    region        TEXT,                      -- comunidad autónoma
    country       TEXT DEFAULT 'ES',
    founded_year  INT,
    stadium_name  TEXT,
    stadium_capacity INT,
    crest_url     TEXT,
    website_url   TEXT,
    is_national   BOOLEAN DEFAULT FALSE,     -- selecciones
    gender        TEXT DEFAULT 'male'
                  CHECK (gender IN ('male','female')),
    active        BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX teams_aliases_idx ON teams USING GIN (aliases);
CREATE INDEX teams_name_trgm   ON teams USING GIN (name gin_trgm_ops);

CREATE TABLE players (
    id            SERIAL PRIMARY KEY,
    slug          TEXT NOT NULL UNIQUE,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    full_name     TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    aliases       TEXT[],
    birth_date    DATE,
    nationality   TEXT,
    position      TEXT
                  CHECK (position IN ('pilier','talonador','segunda','tercera',
                                      'numero8','medio-melee','apertura',
                                      'centro','ala','zaguero')),
    height_cm     INT,
    weight_kg     INT,
    photo_url     TEXT,
    caps          INT DEFAULT 0,             -- internacionalidades
    active        BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX players_aliases_idx ON players USING GIN (aliases);
CREATE INDEX players_name_trgm   ON players USING GIN (full_name gin_trgm_ops);

-- Plantilla: un jugador puede estar en varios clubes a lo largo del tiempo
CREATE TABLE team_players (
    id            SERIAL PRIMARY KEY,
    team_id       INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    player_id     INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    season_id     INT REFERENCES seasons(id),
    shirt_number  INT,
    is_captain    BOOLEAN DEFAULT FALSE,
    joined_at     DATE,
    left_at       DATE,
    UNIQUE (team_id, player_id, season_id)
);

CREATE INDEX team_players_player_idx ON team_players (player_id);
CREATE INDEX team_players_team_idx   ON team_players (team_id, season_id);

-- =====================================================================
-- 2. TAXONOMÍA
-- =====================================================================

CREATE TABLE categories (
    id            SERIAL PRIMARY KEY,
    slug          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    description   TEXT,
    parent_id     INT REFERENCES categories(id) ON DELETE SET NULL,
    sort_order    INT DEFAULT 0,
    active        BOOLEAN DEFAULT TRUE
);

CREATE TABLE tags (
    id            SERIAL PRIMARY KEY,
    slug          TEXT NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    usage_count   INT DEFAULT 0
);

-- =====================================================================
-- 3. INGESTA — lo que llega de fuera, sin tocar
-- =====================================================================

CREATE TABLE sources (
    id              SERIAL PRIMARY KEY,
    slug            TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    kind            TEXT NOT NULL DEFAULT 'rss'
                    CHECK (kind IN ('rss','scrape','api','social','manual')),
    feed_url        TEXT,
    site_url        TEXT,
    language        TEXT DEFAULT 'es',
    default_category_id INT REFERENCES categories(id),
    trust_level     INT DEFAULT 3 CHECK (trust_level BETWEEN 1 AND 5),
    fetch_interval_minutes INT DEFAULT 60,
    last_fetched_at TIMESTAMPTZ,
    last_error      TEXT,
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE raw_articles (
    id              BIGSERIAL PRIMARY KEY,
    source_id       INT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    url_hash        TEXT NOT NULL UNIQUE,      -- sha256 de la URL canónica
    content_hash    TEXT,                      -- sha256 del cuerpo, detecta reediciones
    title           TEXT NOT NULL,
    summary         TEXT,
    content         TEXT,
    author          TEXT,
    image_url       TEXT,
    published_at    TIMESTAMPTZ,
    fetched_at      TIMESTAMPTZ DEFAULT NOW(),
    language        TEXT DEFAULT 'es',
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','processed',
                                      'skipped','duplicate','error')),
    skip_reason     TEXT,
    duplicate_of_id BIGINT REFERENCES raw_articles(id),
    error_message   TEXT,
    attempts        INT DEFAULT 0,
    raw_payload     JSONB                       -- el item original completo
);

CREATE INDEX raw_articles_status_idx    ON raw_articles (status, fetched_at);
CREATE INDEX raw_articles_source_idx    ON raw_articles (source_id, published_at DESC);
CREATE INDEX raw_articles_title_trgm    ON raw_articles USING GIN (title gin_trgm_ops);
CREATE INDEX raw_articles_content_hash  ON raw_articles (content_hash);

-- =====================================================================
-- 4. ARTÍCULOS PUBLICABLES
-- =====================================================================

CREATE TABLE articles (
    id              BIGSERIAL PRIMARY KEY,
    raw_article_id  BIGINT REFERENCES raw_articles(id) ON DELETE SET NULL,
    slug            TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    subtitle        TEXT,
    excerpt         TEXT,
    body            TEXT NOT NULL,             -- markdown
    cover_image_url TEXT,
    cover_image_alt TEXT,

    category_id     INT REFERENCES categories(id),
    author_name     TEXT DEFAULT 'Redacción',

    -- Atribución a la fuente original: obligatoria, no opcional
    source_id       INT REFERENCES sources(id),
    source_url      TEXT,
    source_title    TEXT,

    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','review','published','archived')),
    is_featured     BOOLEAN DEFAULT FALSE,
    published_at    TIMESTAMPTZ,

    -- SEO
    meta_title       TEXT,
    meta_description TEXT,

    -- Trazabilidad del paso por LLM
    generated_by     TEXT,                     -- 'llm' | 'human' | 'hybrid'
    llm_model        TEXT,
    llm_prompt_version TEXT,
    reviewed_by      TEXT,
    reviewed_at      TIMESTAMPTZ,

    view_count      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX articles_published_idx ON articles (status, published_at DESC)
    WHERE status = 'published';
CREATE INDEX articles_category_idx  ON articles (category_id, published_at DESC);
CREATE INDEX articles_featured_idx  ON articles (is_featured, published_at DESC)
    WHERE is_featured;

-- Búsqueda de texto completo en español
ALTER TABLE articles ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('spanish', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('spanish', coalesce(excerpt,'')), 'B') ||
        setweight(to_tsvector('spanish', coalesce(body,'')), 'C')
    ) STORED;

CREATE INDEX articles_search_idx ON articles USING GIN (search_vector);

-- =====================================================================
-- 5. RELACIONES CRUZADAS
-- Esto es lo que convierte el sitio en una base de datos, no un blog.
-- =====================================================================

CREATE TABLE article_tags (
    article_id  BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    tag_id      INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE article_teams (
    article_id  BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    team_id     INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    relevance   TEXT DEFAULT 'mentioned'
                CHECK (relevance IN ('primary','mentioned')),
    confidence  NUMERIC(3,2),                 -- 0.00–1.00 si lo extrae el LLM
    PRIMARY KEY (article_id, team_id)
);

CREATE TABLE article_players (
    article_id  BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    player_id   INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    relevance   TEXT DEFAULT 'mentioned'
                CHECK (relevance IN ('primary','mentioned')),
    confidence  NUMERIC(3,2),
    PRIMARY KEY (article_id, player_id)
);

CREATE TABLE article_competitions (
    article_id      BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    competition_id  INT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, competition_id)
);

CREATE INDEX article_teams_team_idx     ON article_teams (team_id);
CREATE INDEX article_players_player_idx ON article_players (player_id);

-- =====================================================================
-- 6. TRIGGER updated_at
-- =====================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_articles_updated
    BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_teams_updated
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_players_updated
    BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_competitions_updated
    BEFORE UPDATE ON competitions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 7. DATOS INICIALES
-- =====================================================================

INSERT INTO categories (slug, name, sort_order) VALUES
    ('seleccion',        'Selección',            1),
    ('division-honor',   'División de Honor',    2),
    ('femenino',         'Femenino',             3),
    ('cantera',          'Cantera',              4),
    ('internacional',    'Internacional',        5),
    ('fichajes',         'Fichajes',             6);

INSERT INTO seasons (slug, name, start_date, end_date, is_current) VALUES
    ('2025-26', 'Temporada 2025/26', '2025-09-01', '2026-06-30', TRUE);

-- =====================================================================
-- RUGBY ESPAÑOL — BLOQUE 2: DATOS DEPORTIVOS
-- Depende de 01_contenido.sql (competitions, seasons, teams, players)
-- =====================================================================

-- =====================================================================
-- 1. EDICIÓN DE COMPETICIÓN
-- Una competición + una temporada = una edición, con sus propias reglas.
-- División de Honor 2025/26 no tiene por qué puntuar igual que la Copa.
-- =====================================================================

CREATE TABLE competition_seasons (
    id                  SERIAL PRIMARY KEY,
    competition_id      INT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    season_id           INT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    slug                TEXT NOT NULL UNIQUE,   -- 'division-honor-2025-26'
    format              TEXT DEFAULT 'league'
                        CHECK (format IN ('league','knockout','group_knockout','friendly')),

    -- Reglas de puntuación (rugby: configurables por competición)
    points_win          INT DEFAULT 4,
    points_draw         INT DEFAULT 2,
    points_loss         INT DEFAULT 0,
    bonus_try_threshold INT DEFAULT 4,          -- ensayos para punto ofensivo
    bonus_losing_margin INT DEFAULT 7,          -- derrota por <= X puntos

    teams_count         INT,
    promotion_spots     INT DEFAULT 0,
    relegation_spots    INT DEFAULT 0,
    playoff_spots       INT DEFAULT 0,

    status              TEXT DEFAULT 'upcoming'
                        CHECK (status IN ('upcoming','ongoing','finished')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (competition_id, season_id)
);

-- Equipos inscritos en una edición
CREATE TABLE competition_season_teams (
    id                  SERIAL PRIMARY KEY,
    competition_season_id INT NOT NULL REFERENCES competition_seasons(id) ON DELETE CASCADE,
    team_id             INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    group_name          TEXT,                   -- 'Grupo A' si hay grupos
    points_adjustment   INT DEFAULT 0,          -- sanciones administrativas
    adjustment_reason   TEXT,
    UNIQUE (competition_season_id, team_id)
);

-- =====================================================================
-- 2. JORNADAS Y SEDES
-- =====================================================================

CREATE TABLE rounds (
    id                  SERIAL PRIMARY KEY,
    competition_season_id INT NOT NULL REFERENCES competition_seasons(id) ON DELETE CASCADE,
    number              INT,                    -- NULL en eliminatorias
    name                TEXT NOT NULL,          -- 'Jornada 5', 'Semifinal'
    slug                TEXT NOT NULL,
    stage               TEXT DEFAULT 'regular'
                        CHECK (stage IN ('regular','playoff','quarterfinal',
                                         'semifinal','final','promotion')),
    start_date          DATE,
    end_date            DATE,
    UNIQUE (competition_season_id, slug)
);

CREATE TABLE venues (
    id                  SERIAL PRIMARY KEY,
    slug                TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    city                TEXT,
    region              TEXT,
    capacity            INT,
    surface             TEXT CHECK (surface IN ('natural','artificial','hybrid')),
    latitude            NUMERIC(9,6),
    longitude           NUMERIC(9,6)
);

-- =====================================================================
-- 3. PARTIDOS
-- =====================================================================

CREATE TABLE matches (
    id                  BIGSERIAL PRIMARY KEY,
    competition_season_id INT NOT NULL REFERENCES competition_seasons(id) ON DELETE CASCADE,
    round_id            INT REFERENCES rounds(id) ON DELETE SET NULL,
    slug                TEXT NOT NULL UNIQUE,

    home_team_id        INT NOT NULL REFERENCES teams(id),
    away_team_id        INT NOT NULL REFERENCES teams(id),
    venue_id            INT REFERENCES venues(id),

    kickoff_at          TIMESTAMPTZ,
    kickoff_tbd         BOOLEAN DEFAULT FALSE,

    status              TEXT NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','live','halftime','finished',
                                          'postponed','cancelled','walkover')),

    -- Marcador
    home_score          INT,
    away_score          INT,
    home_score_ht       INT,                    -- descanso
    away_score_ht       INT,
    home_tries          INT,
    away_tries          INT,

    -- Puntos de liga (calculados al cerrar el partido)
    home_league_points  INT,
    away_league_points  INT,
    home_bonus_try      BOOLEAN DEFAULT FALSE,
    home_bonus_losing   BOOLEAN DEFAULT FALSE,
    away_bonus_try      BOOLEAN DEFAULT FALSE,
    away_bonus_losing   BOOLEAN DEFAULT FALSE,

    attendance          INT,
    referee_name        TEXT,
    broadcast_url       TEXT,
    highlights_url      TEXT,

    -- Enlace con contenido
    preview_article_id  BIGINT REFERENCES articles(id) ON DELETE SET NULL,
    report_article_id   BIGINT REFERENCES articles(id) ON DELETE SET NULL,

    data_source         TEXT DEFAULT 'manual'
                        CHECK (data_source IN ('manual','scrape','api','import')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT different_teams CHECK (home_team_id <> away_team_id)
);

CREATE INDEX matches_kickoff_idx     ON matches (kickoff_at DESC);
CREATE INDEX matches_status_idx      ON matches (status, kickoff_at);
CREATE INDEX matches_home_team_idx   ON matches (home_team_id, kickoff_at DESC);
CREATE INDEX matches_away_team_idx   ON matches (away_team_id, kickoff_at DESC);
CREATE INDEX matches_round_idx       ON matches (round_id);

-- =====================================================================
-- 4. ALINEACIONES Y EVENTOS
-- Opcionales: un partido es válido sin ellos. Rellénalos solo en los
-- partidos que te importen (selección, finales, División de Honor).
-- =====================================================================

CREATE TABLE match_lineups (
    id                  BIGSERIAL PRIMARY KEY,
    match_id            BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id             INT NOT NULL REFERENCES teams(id),
    player_id           INT REFERENCES players(id) ON DELETE SET NULL,
    player_name         TEXT NOT NULL,          -- se guarda aunque no exista ficha
    shirt_number        INT,
    position            TEXT,
    is_starter          BOOLEAN DEFAULT TRUE,
    is_captain          BOOLEAN DEFAULT FALSE,
    minutes_played      INT,
    came_on_minute      INT,
    went_off_minute     INT,
    UNIQUE (match_id, team_id, shirt_number)
);

CREATE INDEX match_lineups_player_idx ON match_lineups (player_id);
CREATE INDEX match_lineups_match_idx  ON match_lineups (match_id, team_id);

CREATE TABLE match_events (
    id                  BIGSERIAL PRIMARY KEY,
    match_id            BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_id             INT REFERENCES teams(id),
    player_id           INT REFERENCES players(id) ON DELETE SET NULL,
    player_name         TEXT,
    related_player_id   INT REFERENCES players(id) ON DELETE SET NULL,  -- sustituciones

    event_type          TEXT NOT NULL
                        CHECK (event_type IN ('try','penalty_try','conversion',
                                              'penalty','drop_goal',
                                              'yellow_card','red_card',
                                              'substitution','injury')),
    minute              INT,
    period              INT DEFAULT 1,          -- 1, 2, prórroga = 3
    points              INT DEFAULT 0,
    home_score_after    INT,
    away_score_after    INT,
    notes               TEXT
);

CREATE INDEX match_events_match_idx  ON match_events (match_id, minute);
CREATE INDEX match_events_player_idx ON match_events (player_id, event_type);

-- =====================================================================
-- 5. CLASIFICACIÓN
-- Snapshot por jornada. Se recalcula desde matches, nunca se edita a mano
-- salvo points_adjustment (que vive en competition_season_teams).
-- =====================================================================

CREATE TABLE standings (
    id                  BIGSERIAL PRIMARY KEY,
    competition_season_id INT NOT NULL REFERENCES competition_seasons(id) ON DELETE CASCADE,
    round_id            INT REFERENCES rounds(id) ON DELETE CASCADE,
    team_id             INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    group_name          TEXT,

    position            INT NOT NULL,
    previous_position   INT,
    played              INT DEFAULT 0,
    won                 INT DEFAULT 0,
    drawn               INT DEFAULT 0,
    lost                INT DEFAULT 0,
    points_for          INT DEFAULT 0,
    points_against      INT DEFAULT 0,
    points_difference   INT GENERATED ALWAYS AS (points_for - points_against) STORED,
    tries_for           INT DEFAULT 0,
    tries_against       INT DEFAULT 0,
    bonus_try           INT DEFAULT 0,
    bonus_losing        INT DEFAULT 0,
    points_adjustment   INT DEFAULT 0,
    total_points        INT DEFAULT 0,

    is_current          BOOLEAN DEFAULT FALSE,  -- la fila de la tabla "en vivo"
    calculated_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (competition_season_id, round_id, team_id)
);

CREATE INDEX standings_current_idx
    ON standings (competition_season_id, position)
    WHERE is_current;

-- =====================================================================
-- 6. ESTADÍSTICAS AGREGADAS
-- Tabla derivada: se recalcula desde match_events. Existe por velocidad.
-- =====================================================================

CREATE TABLE player_season_stats (
    id                  BIGSERIAL PRIMARY KEY,
    player_id           INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    competition_season_id INT NOT NULL REFERENCES competition_seasons(id) ON DELETE CASCADE,
    team_id             INT REFERENCES teams(id),

    matches_played      INT DEFAULT 0,
    matches_started     INT DEFAULT 0,
    minutes_played      INT DEFAULT 0,
    tries               INT DEFAULT 0,
    conversions         INT DEFAULT 0,
    penalties           INT DEFAULT 0,
    drop_goals          INT DEFAULT 0,
    total_points        INT DEFAULT 0,
    yellow_cards        INT DEFAULT 0,
    red_cards           INT DEFAULT 0,

    calculated_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (player_id, competition_season_id)
);

CREATE INDEX player_stats_tries_idx
    ON player_season_stats (competition_season_id, tries DESC);
CREATE INDEX player_stats_points_idx
    ON player_season_stats (competition_season_id, total_points DESC);

-- =====================================================================
-- 7. RECÁLCULO DE CLASIFICACIÓN
-- =====================================================================

CREATE OR REPLACE FUNCTION recalculate_standings(p_competition_season_id INT)
RETURNS VOID AS $$
BEGIN
    -- Marcar la clasificación anterior como no vigente
    UPDATE standings
       SET is_current = FALSE
     WHERE competition_season_id = p_competition_season_id
       AND is_current;

    WITH match_rows AS (
        -- Cada partido genera dos filas: una por equipo
        SELECT m.home_team_id AS team_id, m.home_score AS pf, m.away_score AS pa,
               m.home_tries AS tf, m.away_tries AS ta,
               m.home_league_points AS lp,
               m.home_bonus_try::int AS bt, m.home_bonus_losing::int AS bl
          FROM matches m
         WHERE m.competition_season_id = p_competition_season_id
           AND m.status = 'finished'
        UNION ALL
        SELECT m.away_team_id, m.away_score, m.home_score,
               m.away_tries, m.home_tries,
               m.away_league_points,
               m.away_bonus_try::int, m.away_bonus_losing::int
          FROM matches m
         WHERE m.competition_season_id = p_competition_season_id
           AND m.status = 'finished'
    ),
    aggregated AS (
        SELECT cst.team_id,
               cst.group_name,
               cst.points_adjustment,
               COUNT(mr.team_id)                         AS played,
               COUNT(*) FILTER (WHERE mr.pf > mr.pa)     AS won,
               COUNT(*) FILTER (WHERE mr.pf = mr.pa)     AS drawn,
               COUNT(*) FILTER (WHERE mr.pf < mr.pa)     AS lost,
               COALESCE(SUM(mr.pf), 0)                   AS points_for,
               COALESCE(SUM(mr.pa), 0)                   AS points_against,
               COALESCE(SUM(mr.tf), 0)                   AS tries_for,
               COALESCE(SUM(mr.ta), 0)                   AS tries_against,
               COALESCE(SUM(mr.bt), 0)                   AS bonus_try,
               COALESCE(SUM(mr.bl), 0)                   AS bonus_losing,
               COALESCE(SUM(mr.lp), 0) + cst.points_adjustment AS total_points
          FROM competition_season_teams cst
          LEFT JOIN match_rows mr ON mr.team_id = cst.team_id
         WHERE cst.competition_season_id = p_competition_season_id
         GROUP BY cst.team_id, cst.group_name, cst.points_adjustment
    ),
    ranked AS (
        SELECT *,
               ROW_NUMBER() OVER (
                   PARTITION BY group_name
                   ORDER BY total_points DESC,
                            (points_for - points_against) DESC,
                            points_for DESC,
                            tries_for DESC
               ) AS position
          FROM aggregated
    )
    INSERT INTO standings (
        competition_season_id, round_id, team_id, group_name, position,
        played, won, drawn, lost, points_for, points_against,
        tries_for, tries_against, bonus_try, bonus_losing,
        points_adjustment, total_points, is_current
    )
    SELECT p_competition_season_id, NULL, team_id, group_name, position,
           played, won, drawn, lost, points_for, points_against,
           tries_for, tries_against, bonus_try, bonus_losing,
           points_adjustment, total_points, TRUE
      FROM ranked
    ON CONFLICT (competition_season_id, round_id, team_id)
    DO UPDATE SET
        position          = EXCLUDED.position,
        played            = EXCLUDED.played,
        won               = EXCLUDED.won,
        drawn             = EXCLUDED.drawn,
        lost              = EXCLUDED.lost,
        points_for        = EXCLUDED.points_for,
        points_against    = EXCLUDED.points_against,
        tries_for         = EXCLUDED.tries_for,
        tries_against     = EXCLUDED.tries_against,
        bonus_try         = EXCLUDED.bonus_try,
        bonus_losing      = EXCLUDED.bonus_losing,
        points_adjustment = EXCLUDED.points_adjustment,
        total_points      = EXCLUDED.total_points,
        is_current        = TRUE,
        calculated_at     = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 8. CÁLCULO DE PUNTOS DE LIGA AL CERRAR UN PARTIDO
-- =====================================================================

CREATE OR REPLACE FUNCTION apply_league_points()
RETURNS TRIGGER AS $$
DECLARE
    cs RECORD;
BEGIN
    IF NEW.status <> 'finished' OR NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT points_win, points_draw, points_loss,
           bonus_try_threshold, bonus_losing_margin
      INTO cs
      FROM competition_seasons
     WHERE id = NEW.competition_season_id;

    -- Puntos por resultado
    IF NEW.home_score > NEW.away_score THEN
        NEW.home_league_points := cs.points_win;
        NEW.away_league_points := cs.points_loss;
    ELSIF NEW.home_score < NEW.away_score THEN
        NEW.home_league_points := cs.points_loss;
        NEW.away_league_points := cs.points_win;
    ELSE
        NEW.home_league_points := cs.points_draw;
        NEW.away_league_points := cs.points_draw;
    END IF;

    -- Bonus ofensivo
    NEW.home_bonus_try := COALESCE(NEW.home_tries, 0) >= cs.bonus_try_threshold;
    NEW.away_bonus_try := COALESCE(NEW.away_tries, 0) >= cs.bonus_try_threshold;

    -- Bonus defensivo
    NEW.home_bonus_losing := NEW.home_score < NEW.away_score
                             AND (NEW.away_score - NEW.home_score) <= cs.bonus_losing_margin;
    NEW.away_bonus_losing := NEW.away_score < NEW.home_score
                             AND (NEW.home_score - NEW.away_score) <= cs.bonus_losing_margin;

    NEW.home_league_points := NEW.home_league_points
                              + NEW.home_bonus_try::int + NEW.home_bonus_losing::int;
    NEW.away_league_points := NEW.away_league_points
                              + NEW.away_bonus_try::int + NEW.away_bonus_losing::int;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_matches_league_points
    BEFORE INSERT OR UPDATE OF status, home_score, away_score, home_tries, away_tries
    ON matches
    FOR EACH ROW EXECUTE FUNCTION apply_league_points();

CREATE TRIGGER trg_matches_updated
    BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =====================================================================
-- RUGBY ESPAÑOL — BLOQUE 3: DESCUBRIMIENTO Y USUARIOS
-- Depende de 01_contenido.sql y 02_datos_deportivos.sql
-- =====================================================================

-- =====================================================================
-- PARTE A — DESCUBRIMIENTO
-- =====================================================================

-- ---------------------------------------------------------------------
-- A1. Artículos relacionados
-- Se calculan por entidades compartidas (equipos, jugadores, categoría).
-- Esta tabla es solo para forzar relaciones a mano cuando el cálculo
-- no acierta: seguimiento de un fichaje, serie de reportajes, etc.
-- ---------------------------------------------------------------------

CREATE TABLE article_related (
    article_id      BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    related_id      BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    relation_type   TEXT DEFAULT 'manual'
                    CHECK (relation_type IN ('manual','follow_up','series','correction')),
    sort_order      INT DEFAULT 0,
    PRIMARY KEY (article_id, related_id),
    CONSTRAINT no_self_relation CHECK (article_id <> related_id)
);

-- Cálculo automático por entidades compartidas.
-- Puntúa: mismo jugador (3), mismo equipo (2), misma categoría (1).
CREATE OR REPLACE FUNCTION get_related_articles(p_article_id BIGINT, p_limit INT DEFAULT 5)
RETURNS TABLE (article_id BIGINT, score BIGINT) AS $$
    SELECT a.id, SUM(w.weight) AS score
      FROM articles a
      JOIN (
            SELECT ap2.article_id, 3 AS weight
              FROM article_players ap1
              JOIN article_players ap2 ON ap2.player_id = ap1.player_id
             WHERE ap1.article_id = p_article_id
            UNION ALL
            SELECT at2.article_id, 2
              FROM article_teams at1
              JOIN article_teams at2 ON at2.team_id = at1.team_id
             WHERE at1.article_id = p_article_id
            UNION ALL
            SELECT a2.id, 1
              FROM articles a1
              JOIN articles a2 ON a2.category_id = a1.category_id
             WHERE a1.id = p_article_id
      ) w ON w.article_id = a.id
     WHERE a.id <> p_article_id
       AND a.status = 'published'
     GROUP BY a.id
     ORDER BY score DESC, a.published_at DESC
     LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------
-- A2. Métricas de lectura
-- Agregado diario, no una fila por visita. Suficiente para "lo más leído"
-- y no crece sin control.
-- ---------------------------------------------------------------------

CREATE TABLE article_daily_stats (
    article_id      BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    day             DATE NOT NULL,
    views           INT DEFAULT 0,
    unique_views    INT DEFAULT 0,
    shares          INT DEFAULT 0,
    avg_seconds     INT,
    PRIMARY KEY (article_id, day)
);

CREATE INDEX article_daily_stats_day_idx ON article_daily_stats (day DESC, views DESC);

-- Tendencias: vistas de los últimos 3 días con decaimiento por antigüedad
CREATE OR REPLACE VIEW trending_articles AS
SELECT a.id,
       a.slug,
       a.title,
       a.cover_image_url,
       a.published_at,
       SUM(s.views * (1.0 / (1 + (CURRENT_DATE - s.day)))) AS trend_score
  FROM articles a
  JOIN article_daily_stats s ON s.article_id = a.id
 WHERE a.status = 'published'
   AND s.day >= CURRENT_DATE - INTERVAL '3 days'
 GROUP BY a.id
 ORDER BY trend_score DESC;

-- ---------------------------------------------------------------------
-- A3. Búsquedas
-- Sirve para ver qué busca la gente y no encuentra: ahí está tu
-- siguiente artículo.
-- ---------------------------------------------------------------------

CREATE TABLE search_queries (
    id              BIGSERIAL PRIMARY KEY,
    query           TEXT NOT NULL,
    normalized      TEXT NOT NULL,
    results_count   INT DEFAULT 0,
    clicked_article_id BIGINT REFERENCES articles(id) ON DELETE SET NULL,
    searched_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX search_queries_normalized_idx ON search_queries (normalized, searched_at DESC);
CREATE INDEX search_queries_empty_idx      ON search_queries (normalized)
    WHERE results_count = 0;

-- =====================================================================
-- PARTE B — USUARIOS
-- Tablas compatibles con Auth.js (NextAuth v5).
-- =====================================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT,
    email           TEXT UNIQUE,
    email_verified  TIMESTAMPTZ,
    image           TEXT,
    username        TEXT UNIQUE,
    bio             TEXT,
    role            TEXT NOT NULL DEFAULT 'reader'
                    CHECK (role IN ('reader','contributor','editor','admin')),
    is_banned       BOOLEAN DEFAULT FALSE,
    banned_reason   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                TEXT NOT NULL,
    provider            TEXT NOT NULL,
    provider_account_id TEXT NOT NULL,
    refresh_token       TEXT,
    access_token        TEXT,
    expires_at          BIGINT,
    token_type          TEXT,
    scope               TEXT,
    id_token            TEXT,
    session_state       TEXT,
    UNIQUE (provider, provider_account_id)
);

CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token   TEXT NOT NULL UNIQUE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires         TIMESTAMPTZ NOT NULL
);

CREATE TABLE verification_tokens (
    identifier      TEXT NOT NULL,
    token           TEXT NOT NULL UNIQUE,
    expires         TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (identifier, token)
);

CREATE INDEX accounts_user_idx ON accounts (user_id);
CREATE INDEX sessions_user_idx ON sessions (user_id);

-- ---------------------------------------------------------------------
-- B1. Seguimientos y guardados
-- Una sola tabla para seguir equipos, jugadores, competiciones o
-- categorías. Evita cuatro tablas casi idénticas.
-- ---------------------------------------------------------------------

CREATE TABLE user_follows (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type     TEXT NOT NULL
                    CHECK (entity_type IN ('team','player','competition','category')),
    entity_id       INT NOT NULL,
    notify_email    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX user_follows_entity_idx ON user_follows (entity_type, entity_id);

CREATE TABLE user_saved_articles (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id      BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    saved_at        TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, article_id)
);

-- ---------------------------------------------------------------------
-- B2. Newsletter
-- Independiente de las cuentas: suscribirse no exige registrarse.
-- ---------------------------------------------------------------------

CREATE TABLE newsletter_subscribers (
    id              BIGSERIAL PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','unsubscribed','bounced')),
    confirm_token   TEXT UNIQUE,
    confirmed_at    TIMESTAMPTZ,
    unsubscribe_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
    unsubscribed_at TIMESTAMPTZ,
    frequency       TEXT DEFAULT 'weekly'
                    CHECK (frequency IN ('daily','weekly','breaking_only')),
    source          TEXT,                       -- de dónde vino el alta
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX newsletter_status_idx ON newsletter_subscribers (status)
    WHERE status = 'confirmed';

CREATE TABLE newsletter_campaigns (
    id              BIGSERIAL PRIMARY KEY,
    subject         TEXT NOT NULL,
    preview_text    TEXT,
    body_html       TEXT,
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','scheduled','sending','sent','failed')),
    scheduled_for   TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    recipients_count INT DEFAULT 0,
    opens_count     INT DEFAULT 0,
    clicks_count    INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE newsletter_campaign_articles (
    campaign_id     BIGINT NOT NULL REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
    article_id      BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    sort_order      INT DEFAULT 0,
    PRIMARY KEY (campaign_id, article_id)
);

-- ---------------------------------------------------------------------
-- B3. Comentarios
-- Anidados por parent_id, con moderación. Empieza con
-- status = 'pending' por defecto si no quieres sorpresas.
-- ---------------------------------------------------------------------

CREATE TABLE comments (
    id              BIGSERIAL PRIMARY KEY,
    article_id      BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    parent_id       BIGINT REFERENCES comments(id) ON DELETE CASCADE,
    body            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'approved'
                    CHECK (status IN ('pending','approved','rejected','deleted')),
    moderated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    moderated_at    TIMESTAMPTZ,
    likes_count     INT DEFAULT 0,
    reports_count   INT DEFAULT 0,
    ip_hash         TEXT,                       -- hash, nunca la IP en claro
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT body_not_empty CHECK (length(trim(body)) > 0)
);

CREATE INDEX comments_article_idx ON comments (article_id, created_at DESC)
    WHERE status = 'approved';
CREATE INDEX comments_parent_idx  ON comments (parent_id);
CREATE INDEX comments_pending_idx ON comments (created_at)
    WHERE status = 'pending';

CREATE TABLE comment_likes (
    comment_id      BIGINT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (comment_id, user_id)
);

CREATE TABLE comment_reports (
    id              BIGSERIAL PRIMARY KEY,
    comment_id      BIGINT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    reporter_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    reason          TEXT NOT NULL
                    CHECK (reason IN ('spam','harassment','hate','offtopic','other')),
    details         TEXT,
    resolved        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (comment_id, reporter_id)
);

-- Contadores automáticos
CREATE OR REPLACE FUNCTION sync_comment_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'comment_likes' THEN
        UPDATE comments
           SET likes_count = (SELECT COUNT(*) FROM comment_likes
                               WHERE comment_id = COALESCE(NEW.comment_id, OLD.comment_id))
         WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);
    ELSE
        UPDATE comments
           SET reports_count = (SELECT COUNT(*) FROM comment_reports
                                 WHERE comment_id = COALESCE(NEW.comment_id, OLD.comment_id))
         WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_likes_count
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION sync_comment_counters();

CREATE TRIGGER trg_comment_reports_count
    AFTER INSERT OR DELETE ON comment_reports
    FOR EACH ROW EXECUTE FUNCTION sync_comment_counters();

CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_comments_updated
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- RUGBY ESPAÑOL — BLOQUE 4: ADMINISTRACIÓN
-- Depende de los bloques 01, 02 y 03
-- =====================================================================

-- =====================================================================
-- 1. VERSIONADO DE ARTÍCULOS
-- Una fila por edición. Permite ver qué escribió el LLM antes de que
-- tú lo tocaras, y revertir si hace falta.
-- =====================================================================

CREATE TABLE article_revisions (
    id              BIGSERIAL PRIMARY KEY,
    article_id      BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    revision_number INT NOT NULL,
    title           TEXT NOT NULL,
    subtitle        TEXT,
    excerpt         TEXT,
    body            TEXT NOT NULL,
    category_id     INT REFERENCES categories(id),
    edited_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    edit_summary    TEXT,
    source_kind     TEXT DEFAULT 'human'
                    CHECK (source_kind IN ('llm','human','import')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (article_id, revision_number)
);

CREATE INDEX article_revisions_article_idx
    ON article_revisions (article_id, revision_number DESC);

-- Guarda automáticamente la versión anterior antes de cada cambio de texto
CREATE OR REPLACE FUNCTION save_article_revision()
RETURNS TRIGGER AS $$
DECLARE
    next_rev INT;
BEGIN
    IF OLD.title IS NOT DISTINCT FROM NEW.title
       AND OLD.body IS NOT DISTINCT FROM NEW.body
       AND OLD.excerpt IS NOT DISTINCT FROM NEW.excerpt THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(MAX(revision_number), 0) + 1
      INTO next_rev
      FROM article_revisions
     WHERE article_id = OLD.id;

    INSERT INTO article_revisions (
        article_id, revision_number, title, subtitle, excerpt,
        body, category_id, source_kind
    ) VALUES (
        OLD.id, next_rev, OLD.title, OLD.subtitle, OLD.excerpt,
        OLD.body, OLD.category_id,
        CASE WHEN OLD.generated_by = 'llm' THEN 'llm' ELSE 'human' END
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_article_revision
    BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION save_article_revision();

-- =====================================================================
-- 2. COLA EDITORIAL
-- El panel de revisión: qué borradores hay, quién los mira, qué pasó.
-- =====================================================================

CREATE TABLE editorial_queue (
    id              BIGSERIAL PRIMARY KEY,
    article_id      BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
    priority        INT DEFAULT 0,              -- mayor = antes
    state           TEXT NOT NULL DEFAULT 'waiting'
                    CHECK (state IN ('waiting','in_review','approved','rejected')),

    -- Señales automáticas que ayudan a decidir sin leerlo entero
    auto_flags      TEXT[],                     -- {'baja_confianza','sin_fuente','texto_corto'}
    confidence      NUMERIC(3,2),
    similarity_score NUMERIC(3,2),              -- parecido con el original

    reviewer_notes  TEXT,
    rejection_reason TEXT,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (article_id)
);

CREATE INDEX editorial_queue_state_idx
    ON editorial_queue (state, priority DESC, created_at);
CREATE INDEX editorial_queue_assigned_idx
    ON editorial_queue (assigned_to, state);
CREATE INDEX editorial_queue_flags_idx
    ON editorial_queue USING GIN (auto_flags);

-- =====================================================================
-- 3. EJECUCIONES DE WORKFLOWS
-- Sin esto, cuando n8n deje de traer noticias no sabrás por qué.
-- =====================================================================

CREATE TABLE workflows (
    id              SERIAL PRIMARY KEY,
    slug            TEXT NOT NULL UNIQUE,       -- 'ingesta','reescritura','publicacion'
    name            TEXT NOT NULL,
    description     TEXT,
    n8n_workflow_id TEXT,
    expected_interval_minutes INT,              -- para alertar si no corre
    is_enabled      BOOLEAN DEFAULT TRUE,
    last_run_at     TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ
);

CREATE TABLE workflow_runs (
    id              BIGSERIAL PRIMARY KEY,
    workflow_id     INT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    n8n_execution_id TEXT,
    status          TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running','success','partial','failed','timeout')),
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    finished_at     TIMESTAMPTZ,
    duration_ms     INT,

    items_in        INT DEFAULT 0,
    items_ok        INT DEFAULT 0,
    items_skipped   INT DEFAULT 0,
    items_failed    INT DEFAULT 0,

    error_message   TEXT,
    metadata        JSONB
);

CREATE INDEX workflow_runs_workflow_idx ON workflow_runs (workflow_id, started_at DESC);
CREATE INDEX workflow_runs_failed_idx   ON workflow_runs (started_at DESC)
    WHERE status IN ('failed','timeout','partial');

-- Detalle por elemento: solo para depurar, se puede purgar a los 30 días
CREATE TABLE workflow_run_items (
    id              BIGSERIAL PRIMARY KEY,
    run_id          BIGINT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    entity_type     TEXT,                       -- 'raw_article','article'
    entity_id       BIGINT,
    result          TEXT CHECK (result IN ('ok','skipped','failed')),
    reason          TEXT,
    payload         JSONB
);

CREATE INDEX workflow_run_items_run_idx ON workflow_run_items (run_id, result);

-- =====================================================================
-- 4. PROMPTS Y LLAMADAS AL LLM
-- Los prompts versionados en base de datos, no incrustados en n8n.
-- Así puedes cambiar uno sin tocar el workflow y saber qué versión
-- generó cada artículo.
-- =====================================================================

CREATE TABLE llm_prompts (
    id              SERIAL PRIMARY KEY,
    slug            TEXT NOT NULL,              -- 'reescritura','extraccion_entidades'
    version         INT NOT NULL,
    system_prompt   TEXT NOT NULL,
    user_template   TEXT NOT NULL,
    model           TEXT NOT NULL,
    temperature     NUMERIC(3,2) DEFAULT 0.7,
    max_tokens      INT,
    is_active       BOOLEAN DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (slug, version)
);

-- Solo una versión activa por prompt
CREATE UNIQUE INDEX llm_prompts_one_active
    ON llm_prompts (slug) WHERE is_active;

CREATE TABLE llm_calls (
    id              BIGSERIAL PRIMARY KEY,
    prompt_id       INT REFERENCES llm_prompts(id) ON DELETE SET NULL,
    run_id          BIGINT REFERENCES workflow_runs(id) ON DELETE SET NULL,
    entity_type     TEXT,
    entity_id       BIGINT,

    model           TEXT NOT NULL,
    input_tokens    INT,
    output_tokens   INT,
    cost_usd        NUMERIC(10,6),
    latency_ms      INT,
    status          TEXT DEFAULT 'ok' CHECK (status IN ('ok','error','rate_limited')),
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX llm_calls_created_idx ON llm_calls (created_at DESC);
CREATE INDEX llm_calls_entity_idx  ON llm_calls (entity_type, entity_id);

-- Gasto diario, para no llevarte sustos a fin de mes
CREATE OR REPLACE VIEW llm_daily_cost AS
SELECT date_trunc('day', created_at)::date AS day,
       model,
       COUNT(*)                 AS calls,
       SUM(input_tokens)        AS input_tokens,
       SUM(output_tokens)       AS output_tokens,
       ROUND(SUM(cost_usd), 4)  AS cost_usd
  FROM llm_calls
 GROUP BY 1, 2
 ORDER BY 1 DESC;

-- =====================================================================
-- 5. CLAVES DE API
-- Para que n8n escriba en /api/ingest. Se guarda el hash, nunca la clave.
-- =====================================================================

CREATE TABLE api_keys (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    key_hash        TEXT NOT NULL UNIQUE,       -- sha256 de la clave
    key_prefix      TEXT NOT NULL,              -- primeros 8 chars, para identificarla
    scopes          TEXT[] NOT NULL DEFAULT '{}',  -- {'ingest:write','articles:publish'}
    last_used_at    TIMESTAMPTZ,
    request_count   BIGINT DEFAULT 0,
    expires_at      TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX api_keys_active_idx ON api_keys (key_hash)
    WHERE revoked_at IS NULL;

-- =====================================================================
-- 6. AUDITORÍA
-- Quién hizo qué. Sobre todo: quién publicó y quién borró.
-- =====================================================================

CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    actor_type      TEXT NOT NULL DEFAULT 'user'
                    CHECK (actor_type IN ('user','system','api_key','workflow')),
    actor_id        TEXT,
    action          TEXT NOT NULL,              -- 'article.publish','source.disable'
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    changes         JSONB,                      -- {campo: {antes, despues}}
    ip_hash         TEXT,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX audit_log_entity_idx  ON audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX audit_log_actor_idx   ON audit_log (actor_type, actor_id, created_at DESC);
CREATE INDEX audit_log_action_idx  ON audit_log (action, created_at DESC);

-- =====================================================================
-- 7. BIBLIOTECA DE MEDIOS
-- =====================================================================

CREATE TABLE media (
    id              BIGSERIAL PRIMARY KEY,
    filename        TEXT NOT NULL,
    url             TEXT NOT NULL,
    storage_key     TEXT,                       -- ruta en S3/R2/Blob
    mime_type       TEXT,
    size_bytes      BIGINT,
    width           INT,
    height          INT,
    blurhash        TEXT,                       -- placeholder mientras carga
    alt_text        TEXT,
    caption         TEXT,
    credit          TEXT,                       -- autoría de la foto
    license         TEXT,
    uploaded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE article_media (
    article_id      BIGINT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    media_id        BIGINT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
    role            TEXT DEFAULT 'inline'
                    CHECK (role IN ('cover','inline','gallery')),
    sort_order      INT DEFAULT 0,
    PRIMARY KEY (article_id, media_id, role)
);

-- =====================================================================
-- 8. REDIRECCIONES
-- Para no perder las URLs de la web de WordPress al migrar.
-- =====================================================================

CREATE TABLE redirects (
    id              SERIAL PRIMARY KEY,
    from_path       TEXT NOT NULL UNIQUE,
    to_path         TEXT NOT NULL,
    status_code     INT DEFAULT 301 CHECK (status_code IN (301, 302, 307, 308)),
    hit_count       INT DEFAULT 0,
    last_hit_at     TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 9. AJUSTES DEL SITIO
-- Clave-valor. Evita redesplegar por cambiar un texto de portada.
-- =====================================================================

CREATE TABLE settings (
    key             TEXT PRIMARY KEY,
    value           JSONB NOT NULL,
    description     TEXT,
    updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value, description) VALUES
    ('site.name',            '"Rugby Español"',  'Nombre del sitio'),
    ('publish.auto',         'false',            'Publicar sin revisión humana'),
    ('publish.min_confidence','0.75',            'Confianza mínima para auto-publicar'),
    ('ingest.max_per_run',   '25',               'Artículos máximos por ejecución'),
    ('llm.daily_budget_usd', '2.00',             'Tope de gasto diario en LLM');

-- =====================================================================
-- 10. VISTA DE SALUD DEL SISTEMA
-- Una consulta para el dashboard de admin.
-- =====================================================================

CREATE OR REPLACE VIEW system_health AS
SELECT
    (SELECT COUNT(*) FROM raw_articles WHERE status = 'pending')          AS pendientes_ingesta,
    (SELECT COUNT(*) FROM raw_articles WHERE status = 'error')            AS errores_ingesta,
    (SELECT COUNT(*) FROM editorial_queue WHERE state = 'waiting')        AS pendientes_revision,
    (SELECT COUNT(*) FROM articles WHERE status = 'published'
        AND published_at > NOW() - INTERVAL '24 hours')                   AS publicados_24h,
    (SELECT COUNT(*) FROM comments WHERE status = 'pending')              AS comentarios_pendientes,
    (SELECT COUNT(*) FROM sources WHERE active AND (
        last_fetched_at IS NULL
        OR last_fetched_at < NOW() - (fetch_interval_minutes * 2 || ' minutes')::interval
     ))                                                                   AS fuentes_atascadas,
    (SELECT COUNT(*) FROM workflow_runs
      WHERE status IN ('failed','timeout')
        AND started_at > NOW() - INTERVAL '24 hours')                     AS workflows_fallidos_24h,
    (SELECT COALESCE(ROUND(SUM(cost_usd), 4), 0) FROM llm_calls
      WHERE created_at > NOW() - INTERVAL '24 hours')                     AS coste_llm_24h;


password supabase = '6E6o4DjFY67mpdpr'
