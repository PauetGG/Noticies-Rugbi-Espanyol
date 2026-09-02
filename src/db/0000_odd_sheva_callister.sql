-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"aliases" text[],
	"city" text,
	"region" text,
	"country" text DEFAULT 'ES',
	"founded_year" integer,
	"stadium_name" text,
	"stadium_capacity" integer,
	"crest_url" text,
	"website_url" text,
	"is_national" boolean DEFAULT false,
	"gender" text DEFAULT 'male',
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "teams_slug_key" UNIQUE("slug"),
	CONSTRAINT "teams_gender_check" CHECK (gender = ANY (ARRAY['male'::text, 'female'::text]))
);
--> statement-breakpoint
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"full_name" text GENERATED ALWAYS AS (((first_name || ' '::text) || last_name)) STORED,
	"aliases" text[],
	"birth_date" date,
	"nationality" text,
	"position" text,
	"height_cm" integer,
	"weight_kg" integer,
	"photo_url" text,
	"caps" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "players_slug_key" UNIQUE("slug"),
	CONSTRAINT "players_position_check" CHECK ("position" = ANY (ARRAY['pilier'::text, 'talonador'::text, 'segunda'::text, 'tercera'::text, 'numero8'::text, 'medio-melee'::text, 'apertura'::text, 'centro'::text, 'ala'::text, 'zaguero'::text]))
);
--> statement-breakpoint
ALTER TABLE "players" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"is_current" boolean DEFAULT false,
	CONSTRAINT "seasons_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "seasons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "team_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"season_id" integer,
	"shirt_number" integer,
	"is_captain" boolean DEFAULT false,
	"joined_at" date,
	"left_at" date,
	CONSTRAINT "team_players_team_id_player_id_season_id_key" UNIQUE("team_id","player_id","season_id")
);
--> statement-breakpoint
ALTER TABLE "team_players" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_id" integer,
	"sort_order" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	CONSTRAINT "categories_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'rss' NOT NULL,
	"feed_url" text,
	"site_url" text,
	"language" text DEFAULT 'es',
	"default_category_id" integer,
	"trust_level" integer DEFAULT 3,
	"fetch_interval_minutes" integer DEFAULT 60,
	"last_fetched_at" timestamp with time zone,
	"last_error" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "sources_slug_key" UNIQUE("slug"),
	CONSTRAINT "sources_kind_check" CHECK (kind = ANY (ARRAY['rss'::text, 'scrape'::text, 'api'::text, 'social'::text, 'manual'::text])),
	CONSTRAINT "sources_trust_level_check" CHECK ((trust_level >= 1) AND (trust_level <= 5))
);
--> statement-breakpoint
ALTER TABLE "sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "raw_articles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"url" text NOT NULL,
	"url_hash" text NOT NULL,
	"content_hash" text,
	"title" text NOT NULL,
	"summary" text,
	"content" text,
	"author" text,
	"image_url" text,
	"published_at" timestamp with time zone,
	"fetched_at" timestamp with time zone DEFAULT now(),
	"language" text DEFAULT 'es',
	"status" text DEFAULT 'pending' NOT NULL,
	"skip_reason" text,
	"duplicate_of_id" bigint,
	"error_message" text,
	"attempts" integer DEFAULT 0,
	"raw_payload" jsonb,
	CONSTRAINT "raw_articles_url_hash_key" UNIQUE("url_hash"),
	CONSTRAINT "raw_articles_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'processed'::text, 'skipped'::text, 'duplicate'::text, 'error'::text]))
);
--> statement-breakpoint
ALTER TABLE "raw_articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "articles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"raw_article_id" bigint,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"excerpt" text,
	"body" text NOT NULL,
	"cover_image_url" text,
	"cover_image_alt" text,
	"category_id" integer,
	"author_name" text DEFAULT 'Redacción',
	"source_id" integer,
	"source_url" text,
	"source_title" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false,
	"published_at" timestamp with time zone,
	"meta_title" text,
	"meta_description" text,
	"generated_by" text,
	"llm_model" text,
	"llm_prompt_version" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"search_vector" "tsvector" GENERATED ALWAYS AS (((setweight(to_tsvector('spanish'::regconfig, COALESCE(title, ''::text)), 'A'::"char") || setweight(to_tsvector('spanish'::regconfig, COALESCE(excerpt, ''::text)), 'B'::"char")) || setweight(to_tsvector('spanish'::regconfig, COALESCE(body, ''::text)), 'C'::"char"))) STORED,
	CONSTRAINT "articles_slug_key" UNIQUE("slug"),
	CONSTRAINT "articles_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'review'::text, 'published'::text, 'archived'::text]))
);
--> statement-breakpoint
ALTER TABLE "articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"usage_count" integer DEFAULT 0,
	CONSTRAINT "tags_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"gender" text DEFAULT 'male' NOT NULL,
	"level" text,
	"country" text DEFAULT 'ES',
	"is_domestic" boolean DEFAULT true,
	"logo_url" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "competitions_slug_key" UNIQUE("slug"),
	CONSTRAINT "competitions_gender_check" CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'mixed'::text])),
	CONSTRAINT "competitions_level_check" CHECK (level = ANY (ARRAY['senior'::text, 'sub23'::text, 'sub18'::text, 'sub16'::text, 'veteranos'::text]))
);
--> statement-breakpoint
ALTER TABLE "competitions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "competition_seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"competition_id" integer NOT NULL,
	"season_id" integer NOT NULL,
	"slug" text NOT NULL,
	"format" text DEFAULT 'league',
	"points_win" integer DEFAULT 4,
	"points_draw" integer DEFAULT 2,
	"points_loss" integer DEFAULT 0,
	"bonus_try_threshold" integer DEFAULT 4,
	"bonus_losing_margin" integer DEFAULT 7,
	"teams_count" integer,
	"promotion_spots" integer DEFAULT 0,
	"relegation_spots" integer DEFAULT 0,
	"playoff_spots" integer DEFAULT 0,
	"status" text DEFAULT 'upcoming',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "competition_seasons_competition_id_season_id_key" UNIQUE("competition_id","season_id"),
	CONSTRAINT "competition_seasons_slug_key" UNIQUE("slug"),
	CONSTRAINT "competition_seasons_format_check" CHECK (format = ANY (ARRAY['league'::text, 'knockout'::text, 'group_knockout'::text, 'friendly'::text])),
	CONSTRAINT "competition_seasons_status_check" CHECK (status = ANY (ARRAY['upcoming'::text, 'ongoing'::text, 'finished'::text]))
);
--> statement-breakpoint
ALTER TABLE "competition_seasons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "competition_season_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"competition_season_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"group_name" text,
	"points_adjustment" integer DEFAULT 0,
	"adjustment_reason" text,
	CONSTRAINT "competition_season_teams_competition_season_id_team_id_key" UNIQUE("competition_season_id","team_id")
);
--> statement-breakpoint
ALTER TABLE "competition_season_teams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"competition_season_id" integer NOT NULL,
	"number" integer,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"stage" text DEFAULT 'regular',
	"start_date" date,
	"end_date" date,
	CONSTRAINT "rounds_competition_season_id_slug_key" UNIQUE("competition_season_id","slug"),
	CONSTRAINT "rounds_stage_check" CHECK (stage = ANY (ARRAY['regular'::text, 'playoff'::text, 'quarterfinal'::text, 'semifinal'::text, 'final'::text, 'promotion'::text]))
);
--> statement-breakpoint
ALTER TABLE "rounds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"region" text,
	"capacity" integer,
	"surface" text,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	CONSTRAINT "venues_slug_key" UNIQUE("slug"),
	CONSTRAINT "venues_surface_check" CHECK (surface = ANY (ARRAY['natural'::text, 'artificial'::text, 'hybrid'::text]))
);
--> statement-breakpoint
ALTER TABLE "venues" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "matches" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"competition_season_id" integer NOT NULL,
	"round_id" integer,
	"slug" text NOT NULL,
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"venue_id" integer,
	"kickoff_at" timestamp with time zone,
	"kickoff_tbd" boolean DEFAULT false,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"home_score_ht" integer,
	"away_score_ht" integer,
	"home_tries" integer,
	"away_tries" integer,
	"home_league_points" integer,
	"away_league_points" integer,
	"home_bonus_try" boolean DEFAULT false,
	"home_bonus_losing" boolean DEFAULT false,
	"away_bonus_try" boolean DEFAULT false,
	"away_bonus_losing" boolean DEFAULT false,
	"attendance" integer,
	"referee_name" text,
	"broadcast_url" text,
	"highlights_url" text,
	"preview_article_id" bigint,
	"report_article_id" bigint,
	"data_source" text DEFAULT 'manual',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "matches_slug_key" UNIQUE("slug"),
	CONSTRAINT "different_teams" CHECK (home_team_id <> away_team_id),
	CONSTRAINT "matches_data_source_check" CHECK (data_source = ANY (ARRAY['manual'::text, 'scrape'::text, 'api'::text, 'import'::text])),
	CONSTRAINT "matches_status_check" CHECK (status = ANY (ARRAY['scheduled'::text, 'live'::text, 'halftime'::text, 'finished'::text, 'postponed'::text, 'cancelled'::text, 'walkover'::text]))
);
--> statement-breakpoint
ALTER TABLE "matches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "match_lineups" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"match_id" bigint NOT NULL,
	"team_id" integer NOT NULL,
	"player_id" integer,
	"player_name" text NOT NULL,
	"shirt_number" integer,
	"position" text,
	"is_starter" boolean DEFAULT true,
	"is_captain" boolean DEFAULT false,
	"minutes_played" integer,
	"came_on_minute" integer,
	"went_off_minute" integer,
	CONSTRAINT "match_lineups_match_id_team_id_shirt_number_key" UNIQUE("match_id","team_id","shirt_number")
);
--> statement-breakpoint
ALTER TABLE "match_lineups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "match_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"match_id" bigint NOT NULL,
	"team_id" integer,
	"player_id" integer,
	"player_name" text,
	"related_player_id" integer,
	"event_type" text NOT NULL,
	"minute" integer,
	"period" integer DEFAULT 1,
	"points" integer DEFAULT 0,
	"home_score_after" integer,
	"away_score_after" integer,
	"notes" text,
	CONSTRAINT "match_events_event_type_check" CHECK (event_type = ANY (ARRAY['try'::text, 'penalty_try'::text, 'conversion'::text, 'penalty'::text, 'drop_goal'::text, 'yellow_card'::text, 'red_card'::text, 'substitution'::text, 'injury'::text]))
);
--> statement-breakpoint
ALTER TABLE "match_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "standings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"competition_season_id" integer NOT NULL,
	"round_id" integer,
	"team_id" integer NOT NULL,
	"group_name" text,
	"position" integer NOT NULL,
	"previous_position" integer,
	"played" integer DEFAULT 0,
	"won" integer DEFAULT 0,
	"drawn" integer DEFAULT 0,
	"lost" integer DEFAULT 0,
	"points_for" integer DEFAULT 0,
	"points_against" integer DEFAULT 0,
	"points_difference" integer GENERATED ALWAYS AS ((points_for - points_against)) STORED,
	"tries_for" integer DEFAULT 0,
	"tries_against" integer DEFAULT 0,
	"bonus_try" integer DEFAULT 0,
	"bonus_losing" integer DEFAULT 0,
	"points_adjustment" integer DEFAULT 0,
	"total_points" integer DEFAULT 0,
	"is_current" boolean DEFAULT false,
	"calculated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "standings_competition_season_id_round_id_team_id_key" UNIQUE("competition_season_id","round_id","team_id")
);
--> statement-breakpoint
ALTER TABLE "standings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "player_season_stats" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"player_id" integer NOT NULL,
	"competition_season_id" integer NOT NULL,
	"team_id" integer,
	"matches_played" integer DEFAULT 0,
	"matches_started" integer DEFAULT 0,
	"minutes_played" integer DEFAULT 0,
	"tries" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"penalties" integer DEFAULT 0,
	"drop_goals" integer DEFAULT 0,
	"total_points" integer DEFAULT 0,
	"yellow_cards" integer DEFAULT 0,
	"red_cards" integer DEFAULT 0,
	"calculated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "player_season_stats_player_id_competition_season_id_key" UNIQUE("player_id","competition_season_id")
);
--> statement-breakpoint
ALTER TABLE "player_season_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "search_queries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"normalized" text NOT NULL,
	"results_count" integer DEFAULT 0,
	"clicked_article_id" bigint,
	"searched_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "search_queries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp with time zone,
	"image" text,
	"username" text,
	"bio" text,
	"role" text DEFAULT 'reader' NOT NULL,
	"is_banned" boolean DEFAULT false,
	"banned_reason" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_username_key" UNIQUE("username"),
	CONSTRAINT "users_role_check" CHECK (role = ANY (ARRAY['reader'::text, 'contributor'::text, 'editor'::text, 'admin'::text]))
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" bigint,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_key" UNIQUE("provider","provider_account_id")
);
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "sessions_session_token_key" UNIQUE("session_token")
);
--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_follows" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"notify_email" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_follows_user_id_entity_type_entity_id_key" UNIQUE("user_id","entity_type","entity_id"),
	CONSTRAINT "user_follows_entity_type_check" CHECK (entity_type = ANY (ARRAY['team'::text, 'player'::text, 'competition'::text, 'category'::text]))
);
--> statement-breakpoint
ALTER TABLE "user_follows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"user_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"confirm_token" text,
	"confirmed_at" timestamp with time zone,
	"unsubscribe_token" text DEFAULT encode(gen_random_bytes(24), 'hex'::text) NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"frequency" text DEFAULT 'weekly',
	"source" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "newsletter_subscribers_email_key" UNIQUE("email"),
	CONSTRAINT "newsletter_subscribers_confirm_token_key" UNIQUE("confirm_token"),
	CONSTRAINT "newsletter_subscribers_unsubscribe_token_key" UNIQUE("unsubscribe_token"),
	CONSTRAINT "newsletter_subscribers_frequency_check" CHECK (frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'breaking_only'::text])),
	CONSTRAINT "newsletter_subscribers_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'unsubscribed'::text, 'bounced'::text]))
);
--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "newsletter_campaigns" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"preview_text" text,
	"body_html" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduled_for" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"recipients_count" integer DEFAULT 0,
	"opens_count" integer DEFAULT 0,
	"clicks_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "newsletter_campaigns_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'sending'::text, 'sent'::text, 'failed'::text]))
);
--> statement-breakpoint
ALTER TABLE "newsletter_campaigns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "comments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"article_id" bigint NOT NULL,
	"user_id" uuid,
	"parent_id" bigint,
	"body" text NOT NULL,
	"status" text DEFAULT 'approved' NOT NULL,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"likes_count" integer DEFAULT 0,
	"reports_count" integer DEFAULT 0,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "body_not_empty" CHECK (length(TRIM(BOTH FROM body)) > 0),
	CONSTRAINT "comments_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'deleted'::text]))
);
--> statement-breakpoint
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "comment_reports" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"comment_id" bigint NOT NULL,
	"reporter_id" uuid,
	"reason" text NOT NULL,
	"details" text,
	"resolved" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "comment_reports_comment_id_reporter_id_key" UNIQUE("comment_id","reporter_id"),
	CONSTRAINT "comment_reports_reason_check" CHECK (reason = ANY (ARRAY['spam'::text, 'harassment'::text, 'hate'::text, 'offtopic'::text, 'other'::text]))
);
--> statement-breakpoint
ALTER TABLE "comment_reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "article_revisions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"article_id" bigint NOT NULL,
	"revision_number" integer NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"excerpt" text,
	"body" text NOT NULL,
	"category_id" integer,
	"edited_by" uuid,
	"edit_summary" text,
	"source_kind" text DEFAULT 'human',
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "article_revisions_article_id_revision_number_key" UNIQUE("article_id","revision_number"),
	CONSTRAINT "article_revisions_source_kind_check" CHECK (source_kind = ANY (ARRAY['llm'::text, 'human'::text, 'import'::text]))
);
--> statement-breakpoint
ALTER TABLE "article_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "editorial_queue" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"article_id" bigint NOT NULL,
	"assigned_to" uuid,
	"priority" integer DEFAULT 0,
	"state" text DEFAULT 'waiting' NOT NULL,
	"auto_flags" text[],
	"confidence" numeric(3, 2),
	"similarity_score" numeric(3, 2),
	"reviewer_notes" text,
	"rejection_reason" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "editorial_queue_article_id_key" UNIQUE("article_id"),
	CONSTRAINT "editorial_queue_state_check" CHECK (state = ANY (ARRAY['waiting'::text, 'in_review'::text, 'approved'::text, 'rejected'::text]))
);
--> statement-breakpoint
ALTER TABLE "editorial_queue" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"n8n_workflow_id" text,
	"expected_interval_minutes" integer,
	"is_enabled" boolean DEFAULT true,
	"last_run_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	CONSTRAINT "workflows_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "workflows" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"workflow_id" integer NOT NULL,
	"n8n_execution_id" text,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now(),
	"finished_at" timestamp with time zone,
	"duration_ms" integer,
	"items_in" integer DEFAULT 0,
	"items_ok" integer DEFAULT 0,
	"items_skipped" integer DEFAULT 0,
	"items_failed" integer DEFAULT 0,
	"error_message" text,
	"metadata" jsonb,
	CONSTRAINT "workflow_runs_status_check" CHECK (status = ANY (ARRAY['running'::text, 'success'::text, 'partial'::text, 'failed'::text, 'timeout'::text]))
);
--> statement-breakpoint
ALTER TABLE "workflow_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workflow_run_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" bigint NOT NULL,
	"entity_type" text,
	"entity_id" bigint,
	"result" text,
	"reason" text,
	"payload" jsonb,
	CONSTRAINT "workflow_run_items_result_check" CHECK (result = ANY (ARRAY['ok'::text, 'skipped'::text, 'failed'::text]))
);
--> statement-breakpoint
ALTER TABLE "workflow_run_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "llm_prompts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"version" integer NOT NULL,
	"system_prompt" text NOT NULL,
	"user_template" text NOT NULL,
	"model" text NOT NULL,
	"temperature" numeric(3, 2) DEFAULT '0.7',
	"max_tokens" integer,
	"is_active" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "llm_prompts_slug_version_key" UNIQUE("slug","version")
);
--> statement-breakpoint
ALTER TABLE "llm_prompts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "llm_calls" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"prompt_id" integer,
	"run_id" bigint,
	"entity_type" text,
	"entity_id" bigint,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(10, 6),
	"latency_ms" integer,
	"status" text DEFAULT 'ok',
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "llm_calls_status_check" CHECK (status = ANY (ARRAY['ok'::text, 'error'::text, 'rate_limited'::text]))
);
--> statement-breakpoint
ALTER TABLE "llm_calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"scopes" text[] DEFAULT '{""}' NOT NULL,
	"last_used_at" timestamp with time zone,
	"request_count" bigint DEFAULT 0,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "api_keys_key_hash_key" UNIQUE("key_hash")
);
--> statement-breakpoint
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_type" text DEFAULT 'user' NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"changes" jsonb,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "audit_log_actor_type_check" CHECK (actor_type = ANY (ARRAY['user'::text, 'system'::text, 'api_key'::text, 'workflow'::text]))
);
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "media" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"url" text NOT NULL,
	"storage_key" text,
	"mime_type" text,
	"size_bytes" bigint,
	"width" integer,
	"height" integer,
	"blurhash" text,
	"alt_text" text,
	"caption" text,
	"credit" text,
	"license" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "redirects" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"status_code" integer DEFAULT 301,
	"hit_count" integer DEFAULT 0,
	"last_hit_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "redirects_from_path_key" UNIQUE("from_path"),
	CONSTRAINT "redirects_status_code_check" CHECK (status_code = ANY (ARRAY[301, 302, 307, 308]))
);
--> statement-breakpoint
ALTER TABLE "redirects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "article_tags" (
	"article_id" bigint NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "article_tags_pkey" PRIMARY KEY("article_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "article_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "article_competitions" (
	"article_id" bigint NOT NULL,
	"competition_id" integer NOT NULL,
	CONSTRAINT "article_competitions_pkey" PRIMARY KEY("article_id","competition_id")
);
--> statement-breakpoint
ALTER TABLE "article_competitions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_pkey" PRIMARY KEY("identifier","token"),
	CONSTRAINT "verification_tokens_token_key" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "verification_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_saved_articles" (
	"user_id" uuid NOT NULL,
	"article_id" bigint NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_saved_articles_pkey" PRIMARY KEY("user_id","article_id")
);
--> statement-breakpoint
ALTER TABLE "user_saved_articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "newsletter_campaign_articles" (
	"campaign_id" bigint NOT NULL,
	"article_id" bigint NOT NULL,
	"sort_order" integer DEFAULT 0,
	CONSTRAINT "newsletter_campaign_articles_pkey" PRIMARY KEY("campaign_id","article_id")
);
--> statement-breakpoint
ALTER TABLE "newsletter_campaign_articles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "comment_likes" (
	"comment_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "comment_likes_pkey" PRIMARY KEY("comment_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "comment_likes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "article_teams" (
	"article_id" bigint NOT NULL,
	"team_id" integer NOT NULL,
	"relevance" text DEFAULT 'mentioned',
	"confidence" numeric(3, 2),
	CONSTRAINT "article_teams_pkey" PRIMARY KEY("article_id","team_id"),
	CONSTRAINT "article_teams_relevance_check" CHECK (relevance = ANY (ARRAY['primary'::text, 'mentioned'::text]))
);
--> statement-breakpoint
ALTER TABLE "article_teams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "article_players" (
	"article_id" bigint NOT NULL,
	"player_id" integer NOT NULL,
	"relevance" text DEFAULT 'mentioned',
	"confidence" numeric(3, 2),
	CONSTRAINT "article_players_pkey" PRIMARY KEY("article_id","player_id"),
	CONSTRAINT "article_players_relevance_check" CHECK (relevance = ANY (ARRAY['primary'::text, 'mentioned'::text]))
);
--> statement-breakpoint
ALTER TABLE "article_players" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "article_related" (
	"article_id" bigint NOT NULL,
	"related_id" bigint NOT NULL,
	"relation_type" text DEFAULT 'manual',
	"sort_order" integer DEFAULT 0,
	CONSTRAINT "article_related_pkey" PRIMARY KEY("article_id","related_id"),
	CONSTRAINT "article_related_relation_type_check" CHECK (relation_type = ANY (ARRAY['manual'::text, 'follow_up'::text, 'series'::text, 'correction'::text])),
	CONSTRAINT "no_self_relation" CHECK (article_id <> related_id)
);
--> statement-breakpoint
ALTER TABLE "article_related" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "article_media" (
	"article_id" bigint NOT NULL,
	"media_id" bigint NOT NULL,
	"role" text DEFAULT 'inline' NOT NULL,
	"sort_order" integer DEFAULT 0,
	CONSTRAINT "article_media_pkey" PRIMARY KEY("article_id","media_id","role"),
	CONSTRAINT "article_media_role_check" CHECK (role = ANY (ARRAY['cover'::text, 'inline'::text, 'gallery'::text]))
);
--> statement-breakpoint
ALTER TABLE "article_media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "article_daily_stats" (
	"article_id" bigint NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0,
	"unique_views" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"avg_seconds" integer,
	CONSTRAINT "article_daily_stats_pkey" PRIMARY KEY("article_id","day")
);
--> statement-breakpoint
ALTER TABLE "article_daily_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "team_players" ADD CONSTRAINT "team_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_players" ADD CONSTRAINT "team_players_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_players" ADD CONSTRAINT "team_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_default_category_id_fkey" FOREIGN KEY ("default_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_articles" ADD CONSTRAINT "raw_articles_duplicate_of_id_fkey" FOREIGN KEY ("duplicate_of_id") REFERENCES "public"."raw_articles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_articles" ADD CONSTRAINT "raw_articles_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_raw_article_id_fkey" FOREIGN KEY ("raw_article_id") REFERENCES "public"."raw_articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_seasons" ADD CONSTRAINT "competition_seasons_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_seasons" ADD CONSTRAINT "competition_seasons_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_season_teams" ADD CONSTRAINT "competition_season_teams_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "public"."competition_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_season_teams" ADD CONSTRAINT "competition_season_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "public"."competition_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "public"."competition_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_preview_article_id_fkey" FOREIGN KEY ("preview_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_report_article_id_fkey" FOREIGN KEY ("report_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_related_player_id_fkey" FOREIGN KEY ("related_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "public"."competition_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_competition_season_id_fkey" FOREIGN KEY ("competition_season_id") REFERENCES "public"."competition_seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_queries" ADD CONSTRAINT "search_queries_clicked_article_id_fkey" FOREIGN KEY ("clicked_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reports" ADD CONSTRAINT "comment_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_revisions" ADD CONSTRAINT "article_revisions_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_queue" ADD CONSTRAINT "editorial_queue_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "editorial_queue" ADD CONSTRAINT "editorial_queue_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_run_items" ADD CONSTRAINT "workflow_run_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_calls" ADD CONSTRAINT "llm_calls_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "public"."llm_prompts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_calls" ADD CONSTRAINT "llm_calls_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_competitions" ADD CONSTRAINT "article_competitions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_competitions" ADD CONSTRAINT "article_competitions_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_articles" ADD CONSTRAINT "user_saved_articles_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_articles" ADD CONSTRAINT "user_saved_articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_campaign_articles" ADD CONSTRAINT "newsletter_campaign_articles_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_campaign_articles" ADD CONSTRAINT "newsletter_campaign_articles_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."newsletter_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_likes" ADD CONSTRAINT "comment_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_teams" ADD CONSTRAINT "article_teams_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_teams" ADD CONSTRAINT "article_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_players" ADD CONSTRAINT "article_players_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_players" ADD CONSTRAINT "article_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_related" ADD CONSTRAINT "article_related_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_related" ADD CONSTRAINT "article_related_related_id_fkey" FOREIGN KEY ("related_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_media" ADD CONSTRAINT "article_media_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_media" ADD CONSTRAINT "article_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_daily_stats" ADD CONSTRAINT "article_daily_stats_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "teams_aliases_idx" ON "teams" USING gin ("aliases" array_ops);--> statement-breakpoint
CREATE INDEX "teams_name_trgm" ON "teams" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "players_aliases_idx" ON "players" USING gin ("aliases" array_ops);--> statement-breakpoint
CREATE INDEX "players_name_trgm" ON "players" USING gin ("full_name" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "one_current_season" ON "seasons" USING btree ("is_current" bool_ops) WHERE is_current;--> statement-breakpoint
CREATE INDEX "team_players_player_idx" ON "team_players" USING btree ("player_id" int4_ops);--> statement-breakpoint
CREATE INDEX "team_players_team_idx" ON "team_players" USING btree ("team_id" int4_ops,"season_id" int4_ops);--> statement-breakpoint
CREATE INDEX "raw_articles_content_hash" ON "raw_articles" USING btree ("content_hash" text_ops);--> statement-breakpoint
CREATE INDEX "raw_articles_source_idx" ON "raw_articles" USING btree ("source_id" int4_ops,"published_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "raw_articles_status_idx" ON "raw_articles" USING btree ("status" text_ops,"fetched_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "raw_articles_title_trgm" ON "raw_articles" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "articles_category_idx" ON "articles" USING btree ("category_id" int4_ops,"published_at" int4_ops);--> statement-breakpoint
CREATE INDEX "articles_featured_idx" ON "articles" USING btree ("is_featured" timestamptz_ops,"published_at" bool_ops) WHERE is_featured;--> statement-breakpoint
CREATE INDEX "articles_published_idx" ON "articles" USING btree ("status" timestamptz_ops,"published_at" timestamptz_ops) WHERE (status = 'published'::text);--> statement-breakpoint
CREATE INDEX "articles_search_idx" ON "articles" USING gin ("search_vector" tsvector_ops);--> statement-breakpoint
CREATE INDEX "matches_away_team_idx" ON "matches" USING btree ("away_team_id" timestamptz_ops,"kickoff_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "matches_home_team_idx" ON "matches" USING btree ("home_team_id" timestamptz_ops,"kickoff_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "matches_kickoff_idx" ON "matches" USING btree ("kickoff_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "matches_round_idx" ON "matches" USING btree ("round_id" int4_ops);--> statement-breakpoint
CREATE INDEX "matches_status_idx" ON "matches" USING btree ("status" timestamptz_ops,"kickoff_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "match_lineups_match_idx" ON "match_lineups" USING btree ("match_id" int8_ops,"team_id" int8_ops);--> statement-breakpoint
CREATE INDEX "match_lineups_player_idx" ON "match_lineups" USING btree ("player_id" int4_ops);--> statement-breakpoint
CREATE INDEX "match_events_match_idx" ON "match_events" USING btree ("match_id" int4_ops,"minute" int8_ops);--> statement-breakpoint
CREATE INDEX "match_events_player_idx" ON "match_events" USING btree ("player_id" int4_ops,"event_type" int4_ops);--> statement-breakpoint
CREATE INDEX "standings_current_idx" ON "standings" USING btree ("competition_season_id" int4_ops,"position" int4_ops) WHERE is_current;--> statement-breakpoint
CREATE INDEX "player_stats_points_idx" ON "player_season_stats" USING btree ("competition_season_id" int4_ops,"total_points" int4_ops);--> statement-breakpoint
CREATE INDEX "player_stats_tries_idx" ON "player_season_stats" USING btree ("competition_season_id" int4_ops,"tries" int4_ops);--> statement-breakpoint
CREATE INDEX "search_queries_empty_idx" ON "search_queries" USING btree ("normalized" text_ops) WHERE (results_count = 0);--> statement-breakpoint
CREATE INDEX "search_queries_normalized_idx" ON "search_queries" USING btree ("normalized" text_ops,"searched_at" text_ops);--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "user_follows_entity_idx" ON "user_follows" USING btree ("entity_type" int4_ops,"entity_id" text_ops);--> statement-breakpoint
CREATE INDEX "newsletter_status_idx" ON "newsletter_subscribers" USING btree ("status" text_ops) WHERE (status = 'confirmed'::text);--> statement-breakpoint
CREATE INDEX "comments_article_idx" ON "comments" USING btree ("article_id" timestamptz_ops,"created_at" int8_ops) WHERE (status = 'approved'::text);--> statement-breakpoint
CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_id" int8_ops);--> statement-breakpoint
CREATE INDEX "comments_pending_idx" ON "comments" USING btree ("created_at" timestamptz_ops) WHERE (status = 'pending'::text);--> statement-breakpoint
CREATE INDEX "article_revisions_article_idx" ON "article_revisions" USING btree ("article_id" int8_ops,"revision_number" int8_ops);--> statement-breakpoint
CREATE INDEX "editorial_queue_assigned_idx" ON "editorial_queue" USING btree ("assigned_to" text_ops,"state" uuid_ops);--> statement-breakpoint
CREATE INDEX "editorial_queue_flags_idx" ON "editorial_queue" USING gin ("auto_flags" array_ops);--> statement-breakpoint
CREATE INDEX "editorial_queue_state_idx" ON "editorial_queue" USING btree ("state" timestamptz_ops,"priority" text_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "workflow_runs_failed_idx" ON "workflow_runs" USING btree ("started_at" timestamptz_ops) WHERE (status = ANY (ARRAY['failed'::text, 'timeout'::text, 'partial'::text]));--> statement-breakpoint
CREATE INDEX "workflow_runs_workflow_idx" ON "workflow_runs" USING btree ("workflow_id" int4_ops,"started_at" int4_ops);--> statement-breakpoint
CREATE INDEX "workflow_run_items_run_idx" ON "workflow_run_items" USING btree ("run_id" int8_ops,"result" int8_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "llm_prompts_one_active" ON "llm_prompts" USING btree ("slug" text_ops) WHERE is_active;--> statement-breakpoint
CREATE INDEX "llm_calls_created_idx" ON "llm_calls" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "llm_calls_entity_idx" ON "llm_calls" USING btree ("entity_type" int8_ops,"entity_id" int8_ops);--> statement-breakpoint
CREATE INDEX "api_keys_active_idx" ON "api_keys" USING btree ("key_hash" text_ops) WHERE (revoked_at IS NULL);--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("action" text_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_type" timestamptz_ops,"actor_id" text_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type" text_ops,"entity_id" timestamptz_ops,"created_at" text_ops);--> statement-breakpoint
CREATE INDEX "article_teams_team_idx" ON "article_teams" USING btree ("team_id" int4_ops);--> statement-breakpoint
CREATE INDEX "article_players_player_idx" ON "article_players" USING btree ("player_id" int4_ops);--> statement-breakpoint
CREATE INDEX "article_daily_stats_day_idx" ON "article_daily_stats" USING btree ("day" int4_ops,"views" date_ops);--> statement-breakpoint
CREATE VIEW "public"."trending_articles" AS (SELECT a.id, a.slug, a.title, a.cover_image_url, a.published_at, sum(s.views::numeric * (1.0 / (1 + (CURRENT_DATE - s.day))::numeric)) AS trend_score FROM articles a JOIN article_daily_stats s ON s.article_id = a.id WHERE a.status = 'published'::text AND s.day >= (CURRENT_DATE - '3 days'::interval) GROUP BY a.id ORDER BY (sum(s.views::numeric * (1.0 / (1 + (CURRENT_DATE - s.day))::numeric))) DESC);--> statement-breakpoint
CREATE VIEW "public"."llm_daily_cost" AS (SELECT date_trunc('day'::text, created_at)::date AS day, model, count(*) AS calls, sum(input_tokens) AS input_tokens, sum(output_tokens) AS output_tokens, round(sum(cost_usd), 4) AS cost_usd FROM llm_calls GROUP BY (date_trunc('day'::text, created_at)::date), model ORDER BY (date_trunc('day'::text, created_at)::date) DESC);--> statement-breakpoint
CREATE VIEW "public"."system_health" AS (SELECT ( SELECT count(*) AS count FROM raw_articles WHERE raw_articles.status = 'pending'::text) AS pendientes_ingesta, ( SELECT count(*) AS count FROM raw_articles WHERE raw_articles.status = 'error'::text) AS errores_ingesta, ( SELECT count(*) AS count FROM editorial_queue WHERE editorial_queue.state = 'waiting'::text) AS pendientes_revision, ( SELECT count(*) AS count FROM articles WHERE articles.status = 'published'::text AND articles.published_at > (now() - '24:00:00'::interval)) AS publicados_24h, ( SELECT count(*) AS count FROM comments WHERE comments.status = 'pending'::text) AS comentarios_pendientes, ( SELECT count(*) AS count FROM sources WHERE sources.active AND (sources.last_fetched_at IS NULL OR sources.last_fetched_at < (now() - (((sources.fetch_interval_minutes * 2) || ' minutes'::text)::interval)))) AS fuentes_atascadas, ( SELECT count(*) AS count FROM workflow_runs WHERE (workflow_runs.status = ANY (ARRAY['failed'::text, 'timeout'::text])) AND workflow_runs.started_at > (now() - '24:00:00'::interval)) AS workflows_fallidos_24h, ( SELECT COALESCE(round(sum(llm_calls.cost_usd), 4), 0::numeric) AS "coalesce" FROM llm_calls WHERE llm_calls.created_at > (now() - '24:00:00'::interval)) AS coste_llm_24h);
*/