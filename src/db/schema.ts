import { pgTable, index, unique, check, serial, text, integer, boolean, timestamp, date, uniqueIndex, foreignKey, bigserial, bigint, jsonb, numeric, uuid, primaryKey, pgView } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const teams = pgTable("teams", {
	id: serial().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	shortName: text("short_name"),
	aliases: text().array(),
	city: text(),
	region: text(),
	country: text().default('ES'),
	foundedYear: integer("founded_year"),
	stadiumName: text("stadium_name"),
	stadiumCapacity: integer("stadium_capacity"),
	crestUrl: text("crest_url"),
	websiteUrl: text("website_url"),
	isNational: boolean("is_national").default(false),
	gender: text().default('male'),
	active: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("teams_aliases_idx").using("gin", table.aliases.asc().nullsLast().op("array_ops")),
	index("teams_name_trgm").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	unique("teams_slug_key").on(table.slug),
	check("teams_gender_check", sql`gender = ANY (ARRAY['male'::text, 'female'::text])`),
]);

export const players = pgTable("players", {
	id: serial().primaryKey().notNull(),
	slug: text().notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	fullName: text("full_name").generatedAlwaysAs(sql`((first_name || ' '::text) || last_name)`),
	aliases: text().array(),
	birthDate: date("birth_date"),
	nationality: text(),
	position: text(),
	heightCm: integer("height_cm"),
	weightKg: integer("weight_kg"),
	photoUrl: text("photo_url"),
	caps: integer().default(0),
	active: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("players_aliases_idx").using("gin", table.aliases.asc().nullsLast().op("array_ops")),
	index("players_name_trgm").using("gin", table.fullName.asc().nullsLast().op("gin_trgm_ops")),
	unique("players_slug_key").on(table.slug),
	check("players_position_check", sql`"position" = ANY (ARRAY['pilier'::text, 'talonador'::text, 'segunda'::text, 'tercera'::text, 'numero8'::text, 'medio-melee'::text, 'apertura'::text, 'centro'::text, 'ala'::text, 'zaguero'::text])`),
]);

export const seasons = pgTable("seasons", {
	id: serial().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	isCurrent: boolean("is_current").default(false),
}, (table) => [
	uniqueIndex("one_current_season").using("btree", table.isCurrent.asc().nullsLast().op("bool_ops")).where(sql`is_current`),
	unique("seasons_slug_key").on(table.slug),
]);

export const teamPlayers = pgTable("team_players", {
	id: serial().primaryKey().notNull(),
	teamId: integer("team_id").notNull(),
	playerId: integer("player_id").notNull(),
	seasonId: integer("season_id"),
	shirtNumber: integer("shirt_number"),
	isCaptain: boolean("is_captain").default(false),
	joinedAt: date("joined_at"),
	leftAt: date("left_at"),
}, (table) => [
	index("team_players_player_idx").using("btree", table.playerId.asc().nullsLast().op("int4_ops")),
	index("team_players_team_idx").using("btree", table.teamId.asc().nullsLast().op("int4_ops"), table.seasonId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [players.id],
			name: "team_players_player_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.seasonId],
			foreignColumns: [seasons.id],
			name: "team_players_season_id_fkey"
		}),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "team_players_team_id_fkey"
		}).onDelete("cascade"),
	unique("team_players_team_id_player_id_season_id_key").on(table.teamId, table.playerId, table.seasonId),
]);

export const categories = pgTable("categories", {
	id: serial().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	description: text(),
	parentId: integer("parent_id"),
	sortOrder: integer("sort_order").default(0),
	active: boolean().default(true),
}, (table) => [
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "categories_parent_id_fkey"
		}).onDelete("set null"),
	unique("categories_slug_key").on(table.slug),
]);

export const sources = pgTable("sources", {
	id: serial().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	kind: text().default('rss').notNull(),
	feedUrl: text("feed_url"),
	siteUrl: text("site_url"),
	language: text().default('es'),
	defaultCategoryId: integer("default_category_id"),
	trustLevel: integer("trust_level").default(3),
	fetchIntervalMinutes: integer("fetch_interval_minutes").default(60),
	lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true, mode: 'string' }),
	lastError: text("last_error"),
	active: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.defaultCategoryId],
			foreignColumns: [categories.id],
			name: "sources_default_category_id_fkey"
		}),
	unique("sources_slug_key").on(table.slug),
	check("sources_kind_check", sql`kind = ANY (ARRAY['rss'::text, 'scrape'::text, 'api'::text, 'social'::text, 'manual'::text])`),
	check("sources_trust_level_check", sql`(trust_level >= 1) AND (trust_level <= 5)`),
]);

export const rawArticles = pgTable("raw_articles", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	sourceId: integer("source_id").notNull(),
	url: text().notNull(),
	urlHash: text("url_hash").notNull(),
	contentHash: text("content_hash"),
	title: text().notNull(),
	summary: text(),
	content: text(),
	author: text(),
	imageUrl: text("image_url"),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	language: text().default('es'),
	status: text().default('pending').notNull(),
	skipReason: text("skip_reason"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	duplicateOfId: bigint("duplicate_of_id", { mode: "number" }),
	errorMessage: text("error_message"),
	attempts: integer().default(0),
	rawPayload: jsonb("raw_payload"),
}, (table) => [
	index("raw_articles_content_hash").using("btree", table.contentHash.asc().nullsLast().op("text_ops")),
	index("raw_articles_source_idx").using("btree", table.sourceId.asc().nullsLast().op("int4_ops"), table.publishedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("raw_articles_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops"), table.fetchedAt.asc().nullsLast().op("timestamptz_ops")),
	index("raw_articles_title_trgm").using("gin", table.title.asc().nullsLast().op("gin_trgm_ops")),
	foreignKey({
			columns: [table.duplicateOfId],
			foreignColumns: [table.id],
			name: "raw_articles_duplicate_of_id_fkey"
		}),
	foreignKey({
			columns: [table.sourceId],
			foreignColumns: [sources.id],
			name: "raw_articles_source_id_fkey"
		}).onDelete("cascade"),
	unique("raw_articles_url_hash_key").on(table.urlHash),
	check("raw_articles_status_check", sql`status = ANY (ARRAY['pending'::text, 'processing'::text, 'processed'::text, 'skipped'::text, 'duplicate'::text, 'error'::text])`),
]);

export const articles = pgTable("articles", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	rawArticleId: bigint("raw_article_id", { mode: "number" }),
	slug: text().notNull(),
	title: text().notNull(),
	subtitle: text(),
	excerpt: text(),
	body: text().notNull(),
	coverImageUrl: text("cover_image_url"),
	coverImageAlt: text("cover_image_alt"),
	categoryId: integer("category_id"),
	authorName: text("author_name").default('Redacción'),
	sourceId: integer("source_id"),
	sourceUrl: text("source_url"),
	sourceTitle: text("source_title"),
	status: text().default('draft').notNull(),
	isFeatured: boolean("is_featured").default(false),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	metaTitle: text("meta_title"),
	metaDescription: text("meta_description"),
	generatedBy: text("generated_by"),
	llmModel: text("llm_model"),
	llmPromptVersion: text("llm_prompt_version"),
	reviewedBy: text("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	viewCount: integer("view_count").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	coverImageCredit: text("cover_image_credit"),
}, (table) => [
	index("articles_category_idx").using("btree", table.categoryId.asc().nullsLast().op("int4_ops"), table.publishedAt.desc().nullsFirst().op("int4_ops")),
	index("articles_featured_idx").using("btree", table.isFeatured.asc().nullsLast().op("timestamptz_ops"), table.publishedAt.desc().nullsFirst().op("bool_ops")).where(sql`is_featured`),
	index("articles_published_idx").using("btree", table.status.asc().nullsLast().op("timestamptz_ops"), table.publishedAt.desc().nullsFirst().op("timestamptz_ops")).where(sql`(status = 'published'::text)`),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "articles_category_id_fkey"
		}),
	foreignKey({
			columns: [table.rawArticleId],
			foreignColumns: [rawArticles.id],
			name: "articles_raw_article_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.sourceId],
			foreignColumns: [sources.id],
			name: "articles_source_id_fkey"
		}),
	unique("articles_slug_key").on(table.slug),
	check("articles_status_check", sql`status = ANY (ARRAY['draft'::text, 'review'::text, 'published'::text, 'archived'::text])`),
]);

export const tags = pgTable("tags", {
	id: serial().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	usageCount: integer("usage_count").default(0),
}, (table) => [
	unique("tags_slug_key").on(table.slug),
]);

export const competitions = pgTable("competitions", {
	id: serial().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	shortName: text("short_name"),
	gender: text().default('male').notNull(),
	level: text(),
	country: text().default('ES'),
	isDomestic: boolean("is_domestic").default(true),
	logoUrl: text("logo_url"),
	active: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("competitions_slug_key").on(table.slug),
	check("competitions_gender_check", sql`gender = ANY (ARRAY['male'::text, 'female'::text, 'mixed'::text])`),
	check("competitions_level_check", sql`level = ANY (ARRAY['senior'::text, 'sub23'::text, 'sub18'::text, 'sub16'::text, 'veteranos'::text])`),
]);

export const competitionSeasons = pgTable("competition_seasons", {
	id: serial().primaryKey().notNull(),
	competitionId: integer("competition_id").notNull(),
	seasonId: integer("season_id").notNull(),
	slug: text().notNull(),
	format: text().default('league'),
	pointsWin: integer("points_win").default(4),
	pointsDraw: integer("points_draw").default(2),
	pointsLoss: integer("points_loss").default(0),
	bonusTryThreshold: integer("bonus_try_threshold").default(4),
	bonusLosingMargin: integer("bonus_losing_margin").default(7),
	teamsCount: integer("teams_count"),
	promotionSpots: integer("promotion_spots").default(0),
	relegationSpots: integer("relegation_spots").default(0),
	playoffSpots: integer("playoff_spots").default(0),
	status: text().default('upcoming'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.competitionId],
			foreignColumns: [competitions.id],
			name: "competition_seasons_competition_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.seasonId],
			foreignColumns: [seasons.id],
			name: "competition_seasons_season_id_fkey"
		}).onDelete("cascade"),
	unique("competition_seasons_competition_id_season_id_key").on(table.competitionId, table.seasonId),
	unique("competition_seasons_slug_key").on(table.slug),
	check("competition_seasons_format_check", sql`format = ANY (ARRAY['league'::text, 'knockout'::text, 'group_knockout'::text, 'friendly'::text])`),
	check("competition_seasons_status_check", sql`status = ANY (ARRAY['upcoming'::text, 'ongoing'::text, 'finished'::text])`),
]);

export const competitionSeasonTeams = pgTable("competition_season_teams", {
	id: serial().primaryKey().notNull(),
	competitionSeasonId: integer("competition_season_id").notNull(),
	teamId: integer("team_id").notNull(),
	groupName: text("group_name"),
	pointsAdjustment: integer("points_adjustment").default(0),
	adjustmentReason: text("adjustment_reason"),
}, (table) => [
	foreignKey({
			columns: [table.competitionSeasonId],
			foreignColumns: [competitionSeasons.id],
			name: "competition_season_teams_competition_season_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "competition_season_teams_team_id_fkey"
		}).onDelete("cascade"),
	unique("competition_season_teams_competition_season_id_team_id_key").on(table.competitionSeasonId, table.teamId),
]);

export const rounds = pgTable("rounds", {
	id: serial().primaryKey().notNull(),
	competitionSeasonId: integer("competition_season_id").notNull(),
	number: integer(),
	name: text().notNull(),
	slug: text().notNull(),
	stage: text().default('regular'),
	startDate: date("start_date"),
	endDate: date("end_date"),
}, (table) => [
	foreignKey({
			columns: [table.competitionSeasonId],
			foreignColumns: [competitionSeasons.id],
			name: "rounds_competition_season_id_fkey"
		}).onDelete("cascade"),
	unique("rounds_competition_season_id_slug_key").on(table.competitionSeasonId, table.slug),
	check("rounds_stage_check", sql`stage = ANY (ARRAY['regular'::text, 'playoff'::text, 'quarterfinal'::text, 'semifinal'::text, 'final'::text, 'promotion'::text])`),
]);

export const venues = pgTable("venues", {
	id: serial().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	city: text(),
	region: text(),
	capacity: integer(),
	surface: text(),
	latitude: numeric({ precision: 9, scale:  6 }),
	longitude: numeric({ precision: 9, scale:  6 }),
}, (table) => [
	unique("venues_slug_key").on(table.slug),
	check("venues_surface_check", sql`surface = ANY (ARRAY['natural'::text, 'artificial'::text, 'hybrid'::text])`),
]);

export const matches = pgTable("matches", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	competitionSeasonId: integer("competition_season_id").notNull(),
	roundId: integer("round_id"),
	slug: text().notNull(),
	homeTeamId: integer("home_team_id").notNull(),
	awayTeamId: integer("away_team_id").notNull(),
	venueId: integer("venue_id"),
	kickoffAt: timestamp("kickoff_at", { withTimezone: true, mode: 'string' }),
	kickoffTbd: boolean("kickoff_tbd").default(false),
	status: text().default('scheduled').notNull(),
	homeScore: integer("home_score"),
	awayScore: integer("away_score"),
	homeScoreHt: integer("home_score_ht"),
	awayScoreHt: integer("away_score_ht"),
	homeTries: integer("home_tries"),
	awayTries: integer("away_tries"),
	homeLeaguePoints: integer("home_league_points"),
	awayLeaguePoints: integer("away_league_points"),
	homeBonusTry: boolean("home_bonus_try").default(false),
	homeBonusLosing: boolean("home_bonus_losing").default(false),
	awayBonusTry: boolean("away_bonus_try").default(false),
	awayBonusLosing: boolean("away_bonus_losing").default(false),
	attendance: integer(),
	refereeName: text("referee_name"),
	broadcastUrl: text("broadcast_url"),
	highlightsUrl: text("highlights_url"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	previewArticleId: bigint("preview_article_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	reportArticleId: bigint("report_article_id", { mode: "number" }),
	dataSource: text("data_source").default('manual'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("matches_away_team_idx").using("btree", table.awayTeamId.asc().nullsLast().op("timestamptz_ops"), table.kickoffAt.desc().nullsFirst().op("timestamptz_ops")),
	index("matches_home_team_idx").using("btree", table.homeTeamId.asc().nullsLast().op("timestamptz_ops"), table.kickoffAt.desc().nullsFirst().op("timestamptz_ops")),
	index("matches_kickoff_idx").using("btree", table.kickoffAt.desc().nullsFirst().op("timestamptz_ops")),
	index("matches_round_idx").using("btree", table.roundId.asc().nullsLast().op("int4_ops")),
	index("matches_status_idx").using("btree", table.status.asc().nullsLast().op("timestamptz_ops"), table.kickoffAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.awayTeamId],
			foreignColumns: [teams.id],
			name: "matches_away_team_id_fkey"
		}),
	foreignKey({
			columns: [table.competitionSeasonId],
			foreignColumns: [competitionSeasons.id],
			name: "matches_competition_season_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.homeTeamId],
			foreignColumns: [teams.id],
			name: "matches_home_team_id_fkey"
		}),
	foreignKey({
			columns: [table.previewArticleId],
			foreignColumns: [articles.id],
			name: "matches_preview_article_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.reportArticleId],
			foreignColumns: [articles.id],
			name: "matches_report_article_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.roundId],
			foreignColumns: [rounds.id],
			name: "matches_round_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.venueId],
			foreignColumns: [venues.id],
			name: "matches_venue_id_fkey"
		}),
	unique("matches_slug_key").on(table.slug),
	check("different_teams", sql`home_team_id <> away_team_id`),
	check("matches_data_source_check", sql`data_source = ANY (ARRAY['manual'::text, 'scrape'::text, 'api'::text, 'import'::text])`),
	check("matches_status_check", sql`status = ANY (ARRAY['scheduled'::text, 'live'::text, 'halftime'::text, 'finished'::text, 'postponed'::text, 'cancelled'::text, 'walkover'::text])`),
]);

export const matchLineups = pgTable("match_lineups", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	matchId: bigint("match_id", { mode: "number" }).notNull(),
	teamId: integer("team_id").notNull(),
	playerId: integer("player_id"),
	playerName: text("player_name").notNull(),
	shirtNumber: integer("shirt_number"),
	position: text(),
	isStarter: boolean("is_starter").default(true),
	isCaptain: boolean("is_captain").default(false),
	minutesPlayed: integer("minutes_played"),
	cameOnMinute: integer("came_on_minute"),
	wentOffMinute: integer("went_off_minute"),
}, (table) => [
	index("match_lineups_match_idx").using("btree", table.matchId.asc().nullsLast().op("int8_ops"), table.teamId.asc().nullsLast().op("int8_ops")),
	index("match_lineups_player_idx").using("btree", table.playerId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.matchId],
			foreignColumns: [matches.id],
			name: "match_lineups_match_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [players.id],
			name: "match_lineups_player_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "match_lineups_team_id_fkey"
		}),
	unique("match_lineups_match_id_team_id_shirt_number_key").on(table.matchId, table.teamId, table.shirtNumber),
]);

export const matchEvents = pgTable("match_events", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	matchId: bigint("match_id", { mode: "number" }).notNull(),
	teamId: integer("team_id"),
	playerId: integer("player_id"),
	playerName: text("player_name"),
	relatedPlayerId: integer("related_player_id"),
	eventType: text("event_type").notNull(),
	minute: integer(),
	period: integer().default(1),
	points: integer().default(0),
	homeScoreAfter: integer("home_score_after"),
	awayScoreAfter: integer("away_score_after"),
	notes: text(),
}, (table) => [
	index("match_events_match_idx").using("btree", table.matchId.asc().nullsLast().op("int4_ops"), table.minute.asc().nullsLast().op("int8_ops")),
	index("match_events_player_idx").using("btree", table.playerId.asc().nullsLast().op("int4_ops"), table.eventType.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.matchId],
			foreignColumns: [matches.id],
			name: "match_events_match_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [players.id],
			name: "match_events_player_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.relatedPlayerId],
			foreignColumns: [players.id],
			name: "match_events_related_player_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "match_events_team_id_fkey"
		}),
	check("match_events_event_type_check", sql`event_type = ANY (ARRAY['try'::text, 'penalty_try'::text, 'conversion'::text, 'penalty'::text, 'drop_goal'::text, 'yellow_card'::text, 'red_card'::text, 'substitution'::text, 'injury'::text])`),
]);

export const standings = pgTable("standings", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	competitionSeasonId: integer("competition_season_id").notNull(),
	roundId: integer("round_id"),
	teamId: integer("team_id").notNull(),
	groupName: text("group_name"),
	position: integer().notNull(),
	previousPosition: integer("previous_position"),
	played: integer().default(0),
	won: integer().default(0),
	drawn: integer().default(0),
	lost: integer().default(0),
	pointsFor: integer("points_for").default(0),
	pointsAgainst: integer("points_against").default(0),
	pointsDifference: integer("points_difference").generatedAlwaysAs(sql`(points_for - points_against)`),
	triesFor: integer("tries_for").default(0),
	triesAgainst: integer("tries_against").default(0),
	bonusTry: integer("bonus_try").default(0),
	bonusLosing: integer("bonus_losing").default(0),
	pointsAdjustment: integer("points_adjustment").default(0),
	totalPoints: integer("total_points").default(0),
	isCurrent: boolean("is_current").default(false),
	calculatedAt: timestamp("calculated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("standings_current_idx").using("btree", table.competitionSeasonId.asc().nullsLast().op("int4_ops"), table.position.asc().nullsLast().op("int4_ops")).where(sql`is_current`),
	foreignKey({
			columns: [table.competitionSeasonId],
			foreignColumns: [competitionSeasons.id],
			name: "standings_competition_season_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roundId],
			foreignColumns: [rounds.id],
			name: "standings_round_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "standings_team_id_fkey"
		}).onDelete("cascade"),
	unique("standings_competition_season_id_round_id_team_id_key").on(table.competitionSeasonId, table.roundId, table.teamId),
]);

export const playerSeasonStats = pgTable("player_season_stats", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	playerId: integer("player_id").notNull(),
	competitionSeasonId: integer("competition_season_id").notNull(),
	teamId: integer("team_id"),
	matchesPlayed: integer("matches_played").default(0),
	matchesStarted: integer("matches_started").default(0),
	minutesPlayed: integer("minutes_played").default(0),
	tries: integer().default(0),
	conversions: integer().default(0),
	penalties: integer().default(0),
	dropGoals: integer("drop_goals").default(0),
	totalPoints: integer("total_points").default(0),
	yellowCards: integer("yellow_cards").default(0),
	redCards: integer("red_cards").default(0),
	calculatedAt: timestamp("calculated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("player_stats_points_idx").using("btree", table.competitionSeasonId.asc().nullsLast().op("int4_ops"), table.totalPoints.desc().nullsFirst().op("int4_ops")),
	index("player_stats_tries_idx").using("btree", table.competitionSeasonId.asc().nullsLast().op("int4_ops"), table.tries.desc().nullsFirst().op("int4_ops")),
	foreignKey({
			columns: [table.competitionSeasonId],
			foreignColumns: [competitionSeasons.id],
			name: "player_season_stats_competition_season_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [players.id],
			name: "player_season_stats_player_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "player_season_stats_team_id_fkey"
		}),
	unique("player_season_stats_player_id_competition_season_id_key").on(table.playerId, table.competitionSeasonId),
]);

export const searchQueries = pgTable("search_queries", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	query: text().notNull(),
	normalized: text().notNull(),
	resultsCount: integer("results_count").default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	clickedArticleId: bigint("clicked_article_id", { mode: "number" }),
	searchedAt: timestamp("searched_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("search_queries_empty_idx").using("btree", table.normalized.asc().nullsLast().op("text_ops")).where(sql`(results_count = 0)`),
	index("search_queries_normalized_idx").using("btree", table.normalized.asc().nullsLast().op("text_ops"), table.searchedAt.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.clickedArticleId],
			foreignColumns: [articles.id],
			name: "search_queries_clicked_article_id_fkey"
		}).onDelete("set null"),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text(),
	email: text(),
	emailVerified: timestamp("email_verified", { withTimezone: true, mode: 'string' }),
	image: text(),
	username: text(),
	bio: text(),
	role: text().default('reader').notNull(),
	isBanned: boolean("is_banned").default(false),
	bannedReason: text("banned_reason"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_email_key").on(table.email),
	unique("users_username_key").on(table.username),
	check("users_role_check", sql`role = ANY (ARRAY['reader'::text, 'contributor'::text, 'editor'::text, 'admin'::text])`),
]);

export const accounts = pgTable("accounts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text("provider_account_id").notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	expiresAt: bigint("expires_at", { mode: "number" }),
	tokenType: text("token_type"),
	scope: text(),
	idToken: text("id_token"),
	sessionState: text("session_state"),
}, (table) => [
	index("accounts_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_user_id_fkey"
		}).onDelete("cascade"),
	unique("accounts_provider_provider_account_id_key").on(table.provider, table.providerAccountId),
]);

export const sessions = pgTable("sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	sessionToken: text("session_token").notNull(),
	userId: uuid("user_id").notNull(),
	expires: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("sessions_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_fkey"
		}).onDelete("cascade"),
	unique("sessions_session_token_key").on(table.sessionToken),
]);

export const userFollows = pgTable("user_follows", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	entityType: text("entity_type").notNull(),
	entityId: integer("entity_id").notNull(),
	notifyEmail: boolean("notify_email").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("user_follows_entity_idx").using("btree", table.entityType.asc().nullsLast().op("int4_ops"), table.entityId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_follows_user_id_fkey"
		}).onDelete("cascade"),
	unique("user_follows_user_id_entity_type_entity_id_key").on(table.userId, table.entityType, table.entityId),
	check("user_follows_entity_type_check", sql`entity_type = ANY (ARRAY['team'::text, 'player'::text, 'competition'::text, 'category'::text])`),
]);

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	email: text().notNull(),
	userId: uuid("user_id"),
	status: text().default('pending').notNull(),
	confirmToken: text("confirm_token"),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }),
	unsubscribeToken: text("unsubscribe_token").default(sql`encode(gen_random_bytes(24), 'hex')`).notNull(),
	unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true, mode: 'string' }),
	frequency: text().default('weekly'),
	source: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("newsletter_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")).where(sql`(status = 'confirmed'::text)`),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "newsletter_subscribers_user_id_fkey"
		}).onDelete("set null"),
	unique("newsletter_subscribers_email_key").on(table.email),
	unique("newsletter_subscribers_confirm_token_key").on(table.confirmToken),
	unique("newsletter_subscribers_unsubscribe_token_key").on(table.unsubscribeToken),
	check("newsletter_subscribers_frequency_check", sql`frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'breaking_only'::text])`),
	check("newsletter_subscribers_status_check", sql`status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'unsubscribed'::text, 'bounced'::text])`),
]);

export const newsletterCampaigns = pgTable("newsletter_campaigns", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	subject: text().notNull(),
	previewText: text("preview_text"),
	bodyHtml: text("body_html"),
	status: text().default('draft').notNull(),
	scheduledFor: timestamp("scheduled_for", { withTimezone: true, mode: 'string' }),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	recipientsCount: integer("recipients_count").default(0),
	opensCount: integer("opens_count").default(0),
	clicksCount: integer("clicks_count").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	check("newsletter_campaigns_status_check", sql`status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'sending'::text, 'sent'::text, 'failed'::text])`),
]);

export const comments = pgTable("comments", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	articleId: bigint("article_id", { mode: "number" }).notNull(),
	userId: uuid("user_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parentId: bigint("parent_id", { mode: "number" }),
	body: text().notNull(),
	status: text().default('approved').notNull(),
	moderatedBy: uuid("moderated_by"),
	moderatedAt: timestamp("moderated_at", { withTimezone: true, mode: 'string' }),
	likesCount: integer("likes_count").default(0),
	reportsCount: integer("reports_count").default(0),
	ipHash: text("ip_hash"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("comments_article_idx").using("btree", table.articleId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("int8_ops")).where(sql`(status = 'approved'::text)`),
	index("comments_parent_idx").using("btree", table.parentId.asc().nullsLast().op("int8_ops")),
	index("comments_pending_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")).where(sql`(status = 'pending'::text)`),
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "comments_article_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.moderatedBy],
			foreignColumns: [users.id],
			name: "comments_moderated_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "comments_parent_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "comments_user_id_fkey"
		}).onDelete("set null"),
	check("body_not_empty", sql`length(TRIM(BOTH FROM body)) > 0`),
	check("comments_status_check", sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'deleted'::text])`),
]);

export const commentReports = pgTable("comment_reports", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	commentId: bigint("comment_id", { mode: "number" }).notNull(),
	reporterId: uuid("reporter_id"),
	reason: text().notNull(),
	details: text(),
	resolved: boolean().default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.commentId],
			foreignColumns: [comments.id],
			name: "comment_reports_comment_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reporterId],
			foreignColumns: [users.id],
			name: "comment_reports_reporter_id_fkey"
		}).onDelete("set null"),
	unique("comment_reports_comment_id_reporter_id_key").on(table.commentId, table.reporterId),
	check("comment_reports_reason_check", sql`reason = ANY (ARRAY['spam'::text, 'harassment'::text, 'hate'::text, 'offtopic'::text, 'other'::text])`),
]);

export const articleRevisions = pgTable("article_revisions", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	articleId: bigint("article_id", { mode: "number" }).notNull(),
	revisionNumber: integer("revision_number").notNull(),
	title: text().notNull(),
	subtitle: text(),
	excerpt: text(),
	body: text().notNull(),
	categoryId: integer("category_id"),
	editedBy: uuid("edited_by"),
	editSummary: text("edit_summary"),
	sourceKind: text("source_kind").default('human'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("article_revisions_article_idx").using("btree", table.articleId.asc().nullsLast().op("int8_ops"), table.revisionNumber.desc().nullsFirst().op("int8_ops")),
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "article_revisions_article_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "article_revisions_category_id_fkey"
		}),
	foreignKey({
			columns: [table.editedBy],
			foreignColumns: [users.id],
			name: "article_revisions_edited_by_fkey"
		}).onDelete("set null"),
	unique("article_revisions_article_id_revision_number_key").on(table.articleId, table.revisionNumber),
	check("article_revisions_source_kind_check", sql`source_kind = ANY (ARRAY['llm'::text, 'human'::text, 'import'::text])`),
]);

export const editorialQueue = pgTable("editorial_queue", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	articleId: bigint("article_id", { mode: "number" }).notNull(),
	assignedTo: uuid("assigned_to"),
	priority: integer().default(0),
	state: text().default('waiting').notNull(),
	autoFlags: text("auto_flags").array(),
	confidence: numeric({ precision: 3, scale:  2 }),
	similarityScore: numeric("similarity_score", { precision: 3, scale:  2 }),
	reviewerNotes: text("reviewer_notes"),
	rejectionReason: text("rejection_reason"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("editorial_queue_assigned_idx").using("btree", table.assignedTo.asc().nullsLast().op("text_ops"), table.state.asc().nullsLast().op("uuid_ops")),
	index("editorial_queue_flags_idx").using("gin", table.autoFlags.asc().nullsLast().op("array_ops")),
	index("editorial_queue_state_idx").using("btree", table.state.asc().nullsLast().op("timestamptz_ops"), table.priority.desc().nullsFirst().op("text_ops"), table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "editorial_queue_article_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "editorial_queue_assigned_to_fkey"
		}).onDelete("set null"),
	unique("editorial_queue_article_id_key").on(table.articleId),
	check("editorial_queue_state_check", sql`state = ANY (ARRAY['waiting'::text, 'in_review'::text, 'approved'::text, 'rejected'::text])`),
]);

export const workflows = pgTable("workflows", {
	id: serial().primaryKey().notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	description: text(),
	n8NWorkflowId: text("n8n_workflow_id"),
	expectedIntervalMinutes: integer("expected_interval_minutes"),
	isEnabled: boolean("is_enabled").default(true),
	lastRunAt: timestamp("last_run_at", { withTimezone: true, mode: 'string' }),
	lastSuccessAt: timestamp("last_success_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("workflows_slug_key").on(table.slug),
]);

export const workflowRuns = pgTable("workflow_runs", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	workflowId: integer("workflow_id").notNull(),
	n8NExecutionId: text("n8n_execution_id"),
	status: text().default('running').notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }),
	durationMs: integer("duration_ms"),
	itemsIn: integer("items_in").default(0),
	itemsOk: integer("items_ok").default(0),
	itemsSkipped: integer("items_skipped").default(0),
	itemsFailed: integer("items_failed").default(0),
	errorMessage: text("error_message"),
	metadata: jsonb(),
}, (table) => [
	index("workflow_runs_failed_idx").using("btree", table.startedAt.desc().nullsFirst().op("timestamptz_ops")).where(sql`(status = ANY (ARRAY['failed'::text, 'timeout'::text, 'partial'::text]))`),
	index("workflow_runs_workflow_idx").using("btree", table.workflowId.asc().nullsLast().op("int4_ops"), table.startedAt.desc().nullsFirst().op("int4_ops")),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "workflow_runs_workflow_id_fkey"
		}).onDelete("cascade"),
	check("workflow_runs_status_check", sql`status = ANY (ARRAY['running'::text, 'success'::text, 'partial'::text, 'failed'::text, 'timeout'::text])`),
]);

export const workflowRunItems = pgTable("workflow_run_items", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	runId: bigint("run_id", { mode: "number" }).notNull(),
	entityType: text("entity_type"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	entityId: bigint("entity_id", { mode: "number" }),
	result: text(),
	reason: text(),
	payload: jsonb(),
}, (table) => [
	index("workflow_run_items_run_idx").using("btree", table.runId.asc().nullsLast().op("int8_ops"), table.result.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.runId],
			foreignColumns: [workflowRuns.id],
			name: "workflow_run_items_run_id_fkey"
		}).onDelete("cascade"),
	check("workflow_run_items_result_check", sql`result = ANY (ARRAY['ok'::text, 'skipped'::text, 'failed'::text])`),
]);

export const llmPrompts = pgTable("llm_prompts", {
	id: serial().primaryKey().notNull(),
	slug: text().notNull(),
	version: integer().notNull(),
	systemPrompt: text("system_prompt").notNull(),
	userTemplate: text("user_template").notNull(),
	model: text().notNull(),
	temperature: numeric({ precision: 3, scale:  2 }).default('0.7'),
	maxTokens: integer("max_tokens"),
	isActive: boolean("is_active").default(false),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("llm_prompts_one_active").using("btree", table.slug.asc().nullsLast().op("text_ops")).where(sql`is_active`),
	unique("llm_prompts_slug_version_key").on(table.slug, table.version),
]);

export const llmCalls = pgTable("llm_calls", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	promptId: integer("prompt_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	runId: bigint("run_id", { mode: "number" }),
	entityType: text("entity_type"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	entityId: bigint("entity_id", { mode: "number" }),
	model: text().notNull(),
	inputTokens: integer("input_tokens"),
	outputTokens: integer("output_tokens"),
	costUsd: numeric("cost_usd", { precision: 10, scale:  6 }),
	latencyMs: integer("latency_ms"),
	status: text().default('ok'),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("llm_calls_created_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("llm_calls_entity_idx").using("btree", table.entityType.asc().nullsLast().op("int8_ops"), table.entityId.asc().nullsLast().op("int8_ops")),
	foreignKey({
			columns: [table.promptId],
			foreignColumns: [llmPrompts.id],
			name: "llm_calls_prompt_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.runId],
			foreignColumns: [workflowRuns.id],
			name: "llm_calls_run_id_fkey"
		}).onDelete("set null"),
	check("llm_calls_status_check", sql`status = ANY (ARRAY['ok'::text, 'error'::text, 'rate_limited'::text])`),
]);

export const apiKeys = pgTable("api_keys", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	keyHash: text("key_hash").notNull(),
	keyPrefix: text("key_prefix").notNull(),
	scopes: text().array().default([""]).notNull(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: 'string' }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	requestCount: bigint("request_count", { mode: "number" }).default(0),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("api_keys_active_idx").using("btree", table.keyHash.asc().nullsLast().op("text_ops")).where(sql`(revoked_at IS NULL)`),
	unique("api_keys_key_hash_key").on(table.keyHash),
]);

export const auditLog = pgTable("audit_log", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	actorType: text("actor_type").default('user').notNull(),
	actorId: text("actor_id"),
	action: text().notNull(),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id").notNull(),
	changes: jsonb(),
	ipHash: text("ip_hash"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("audit_log_action_idx").using("btree", table.action.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("audit_log_actor_idx").using("btree", table.actorType.asc().nullsLast().op("timestamptz_ops"), table.actorId.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("audit_log_entity_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	check("audit_log_actor_type_check", sql`actor_type = ANY (ARRAY['user'::text, 'system'::text, 'api_key'::text, 'workflow'::text])`),
]);

export const media = pgTable("media", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	filename: text().notNull(),
	url: text().notNull(),
	storageKey: text("storage_key"),
	mimeType: text("mime_type"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	sizeBytes: bigint("size_bytes", { mode: "number" }),
	width: integer(),
	height: integer(),
	blurhash: text(),
	altText: text("alt_text"),
	caption: text(),
	credit: text(),
	license: text(),
	uploadedBy: uuid("uploaded_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "media_uploaded_by_fkey"
		}).onDelete("set null"),
]);

export const redirects = pgTable("redirects", {
	id: serial().primaryKey().notNull(),
	fromPath: text("from_path").notNull(),
	toPath: text("to_path").notNull(),
	statusCode: integer("status_code").default(301),
	hitCount: integer("hit_count").default(0),
	lastHitAt: timestamp("last_hit_at", { withTimezone: true, mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("redirects_from_path_key").on(table.fromPath),
	check("redirects_status_code_check", sql`status_code = ANY (ARRAY[301, 302, 307, 308])`),
]);

export const settings = pgTable("settings", {
	key: text().primaryKey().notNull(),
	value: jsonb().notNull(),
	description: text(),
	updatedBy: uuid("updated_by"),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "settings_updated_by_fkey"
		}).onDelete("set null"),
]);

export const articleTags = pgTable("article_tags", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	articleId: bigint("article_id", { mode: "number" }).notNull(),
	tagId: integer("tag_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "article_tags_article_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "article_tags_tag_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.articleId, table.tagId], name: "article_tags_pkey"}),
]);

export const articleCompetitions = pgTable("article_competitions", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	articleId: bigint("article_id", { mode: "number" }).notNull(),
	competitionId: integer("competition_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "article_competitions_article_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.competitionId],
			foreignColumns: [competitions.id],
			name: "article_competitions_competition_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.articleId, table.competitionId], name: "article_competitions_pkey"}),
]);

export const verificationTokens = pgTable("verification_tokens", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	primaryKey({ columns: [table.identifier, table.token], name: "verification_tokens_pkey"}),
	unique("verification_tokens_token_key").on(table.token),
]);

export const userSavedArticles = pgTable("user_saved_articles", {
	userId: uuid("user_id").notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	articleId: bigint("article_id", { mode: "number" }).notNull(),
	savedAt: timestamp("saved_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "user_saved_articles_article_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_saved_articles_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.articleId], name: "user_saved_articles_pkey"}),
]);

export const newsletterCampaignArticles = pgTable("newsletter_campaign_articles", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	campaignId: bigint("campaign_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	articleId: bigint("article_id", { mode: "number" }).notNull(),
	sortOrder: integer("sort_order").default(0),
}, (table) => [
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "newsletter_campaign_articles_article_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [newsletterCampaigns.id],
			name: "newsletter_campaign_articles_campaign_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.campaignId, table.articleId], name: "newsletter_campaign_articles_pkey"}),
]);

export const commentLikes = pgTable("comment_likes", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	commentId: bigint("comment_id", { mode: "number" }).notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.commentId],
			foreignColumns: [comments.id],
			name: "comment_likes_comment_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "comment_likes_user_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.commentId, table.userId], name: "comment_likes_pkey"}),
]);

export const articleTeams = pgTable("article_teams", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	articleId: bigint("article_id", { mode: "number" }).notNull(),
	teamId: integer("team_id").notNull(),
	relevance: text().default('mentioned'),
	confidence: numeric({ precision: 3, scale:  2 }),
}, (table) => [
	index("article_teams_team_idx").using("btree", table.teamId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "article_teams_article_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "article_teams_team_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.articleId, table.teamId], name: "article_teams_pkey"}),
	check("article_teams_relevance_check", sql`relevance = ANY (ARRAY['primary'::text, 'mentioned'::text])`),
]);

export const articlePlayers = pgTable("article_players", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	articleId: bigint("article_id", { mode: "number" }).notNull(),
	playerId: integer("player_id").notNull(),
	relevance: text().default('mentioned'),
	confidence: numeric({ precision: 3, scale:  2 }),
}, (table) => [
	index("article_players_player_idx").using("btree", table.playerId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "article_players_article_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.playerId],
			foreignColumns: [players.id],
			name: "article_players_player_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.articleId, table.playerId], name: "article_players_pkey"}),
	check("article_players_relevance_check", sql`relevance = ANY (ARRAY['primary'::text, 'mentioned'::text])`),
]);

export const articleRelated = pgTable("article_related", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	articleId: bigint("article_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	relatedId: bigint("related_id", { mode: "number" }).notNull(),
	relationType: text("relation_type").default('manual'),
	sortOrder: integer("sort_order").default(0),
}, (table) => [
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "article_related_article_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.relatedId],
			foreignColumns: [articles.id],
			name: "article_related_related_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.articleId, table.relatedId], name: "article_related_pkey"}),
	check("article_related_relation_type_check", sql`relation_type = ANY (ARRAY['manual'::text, 'follow_up'::text, 'series'::text, 'correction'::text])`),
	check("no_self_relation", sql`article_id <> related_id`),
]);

export const articleMedia = pgTable("article_media", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	articleId: bigint("article_id", { mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	mediaId: bigint("media_id", { mode: "number" }).notNull(),
	role: text().default('inline').notNull(),
	sortOrder: integer("sort_order").default(0),
}, (table) => [
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "article_media_article_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.mediaId],
			foreignColumns: [media.id],
			name: "article_media_media_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.articleId, table.mediaId, table.role], name: "article_media_pkey"}),
	check("article_media_role_check", sql`role = ANY (ARRAY['cover'::text, 'inline'::text, 'gallery'::text])`),
]);

export const articleDailyStats = pgTable("article_daily_stats", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	articleId: bigint("article_id", { mode: "number" }).notNull(),
	day: date().notNull(),
	views: integer().default(0),
	uniqueViews: integer("unique_views").default(0),
	shares: integer().default(0),
	avgSeconds: integer("avg_seconds"),
}, (table) => [
	index("article_daily_stats_day_idx").using("btree", table.day.desc().nullsFirst().op("int4_ops"), table.views.desc().nullsFirst().op("date_ops")),
	foreignKey({
			columns: [table.articleId],
			foreignColumns: [articles.id],
			name: "article_daily_stats_article_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.articleId, table.day], name: "article_daily_stats_pkey"}),
]);
export const trendingArticles = pgView("trending_articles", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }),
	slug: text(),
	title: text(),
	coverImageUrl: text("cover_image_url"),
	publishedAt: timestamp("published_at", { withTimezone: true, mode: 'string' }),
	trendScore: numeric("trend_score"),
}).as(sql`SELECT a.id, a.slug, a.title, a.cover_image_url, a.published_at, sum(s.views::numeric * (1.0 / (1 + (CURRENT_DATE - s.day))::numeric)) AS trend_score FROM articles a JOIN article_daily_stats s ON s.article_id = a.id WHERE a.status = 'published'::text AND s.day >= (CURRENT_DATE - '3 days'::interval) GROUP BY a.id ORDER BY (sum(s.views::numeric * (1.0 / (1 + (CURRENT_DATE - s.day))::numeric))) DESC`);

export const llmDailyCost = pgView("llm_daily_cost", {	day: date(),
	model: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	calls: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	inputTokens: bigint("input_tokens", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	outputTokens: bigint("output_tokens", { mode: "number" }),
	costUsd: numeric("cost_usd"),
}).as(sql`SELECT date_trunc('day'::text, created_at)::date AS day, model, count(*) AS calls, sum(input_tokens) AS input_tokens, sum(output_tokens) AS output_tokens, round(sum(cost_usd), 4) AS cost_usd FROM llm_calls GROUP BY (date_trunc('day'::text, created_at)::date), model ORDER BY (date_trunc('day'::text, created_at)::date) DESC`);

export const systemHealth = pgView("system_health", {	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pendientesIngesta: bigint("pendientes_ingesta", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	erroresIngesta: bigint("errores_ingesta", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	pendientesRevision: bigint("pendientes_revision", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	publicados24H: bigint("publicados_24h", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	comentariosPendientes: bigint("comentarios_pendientes", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fuentesAtascadas: bigint("fuentes_atascadas", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	workflowsFallidos24H: bigint("workflows_fallidos_24h", { mode: "number" }),
	costeLlm24H: numeric("coste_llm_24h"),
}).as(sql`SELECT ( SELECT count(*) AS count FROM raw_articles WHERE raw_articles.status = 'pending'::text) AS pendientes_ingesta, ( SELECT count(*) AS count FROM raw_articles WHERE raw_articles.status = 'error'::text) AS errores_ingesta, ( SELECT count(*) AS count FROM editorial_queue WHERE editorial_queue.state = 'waiting'::text) AS pendientes_revision, ( SELECT count(*) AS count FROM articles WHERE articles.status = 'published'::text AND articles.published_at > (now() - '24:00:00'::interval)) AS publicados_24h, ( SELECT count(*) AS count FROM comments WHERE comments.status = 'pending'::text) AS comentarios_pendientes, ( SELECT count(*) AS count FROM sources WHERE sources.active AND (sources.last_fetched_at IS NULL OR sources.last_fetched_at < (now() - (((sources.fetch_interval_minutes * 2) || ' minutes'::text)::interval)))) AS fuentes_atascadas, ( SELECT count(*) AS count FROM workflow_runs WHERE (workflow_runs.status = ANY (ARRAY['failed'::text, 'timeout'::text])) AND workflow_runs.started_at > (now() - '24:00:00'::interval)) AS workflows_fallidos_24h, ( SELECT COALESCE(round(sum(llm_calls.cost_usd), 4), 0::numeric) AS "coalesce" FROM llm_calls WHERE llm_calls.created_at > (now() - '24:00:00'::interval)) AS coste_llm_24h`);