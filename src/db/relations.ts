import { relations } from "drizzle-orm/relations";
import { players, teamPlayers, seasons, teams, categories, sources, rawArticles, articles, competitions, competitionSeasons, competitionSeasonTeams, rounds, matches, venues, matchLineups, matchEvents, standings, playerSeasonStats, searchQueries, users, accounts, sessions, userFollows, newsletterSubscribers, comments, commentReports, articleRevisions, editorialQueue, workflows, workflowRuns, workflowRunItems, llmPrompts, llmCalls, media, settings, articleTags, tags, articleCompetitions, userSavedArticles, newsletterCampaignArticles, newsletterCampaigns, commentLikes, articleTeams, articlePlayers, articleRelated, articleMedia, articleDailyStats } from "./schema";

export const teamPlayersRelations = relations(teamPlayers, ({one}) => ({
	player: one(players, {
		fields: [teamPlayers.playerId],
		references: [players.id]
	}),
	season: one(seasons, {
		fields: [teamPlayers.seasonId],
		references: [seasons.id]
	}),
	team: one(teams, {
		fields: [teamPlayers.teamId],
		references: [teams.id]
	}),
}));

export const playersRelations = relations(players, ({many}) => ({
	teamPlayers: many(teamPlayers),
	matchLineups: many(matchLineups),
	matchEvents_playerId: many(matchEvents, {
		relationName: "matchEvents_playerId_players_id"
	}),
	matchEvents_relatedPlayerId: many(matchEvents, {
		relationName: "matchEvents_relatedPlayerId_players_id"
	}),
	playerSeasonStats: many(playerSeasonStats),
	articlePlayers: many(articlePlayers),
}));

export const seasonsRelations = relations(seasons, ({many}) => ({
	teamPlayers: many(teamPlayers),
	competitionSeasons: many(competitionSeasons),
}));

export const teamsRelations = relations(teams, ({many}) => ({
	teamPlayers: many(teamPlayers),
	competitionSeasonTeams: many(competitionSeasonTeams),
	matches_awayTeamId: many(matches, {
		relationName: "matches_awayTeamId_teams_id"
	}),
	matches_homeTeamId: many(matches, {
		relationName: "matches_homeTeamId_teams_id"
	}),
	matchLineups: many(matchLineups),
	matchEvents: many(matchEvents),
	standings: many(standings),
	playerSeasonStats: many(playerSeasonStats),
	articleTeams: many(articleTeams),
}));

export const categoriesRelations = relations(categories, ({one, many}) => ({
	category: one(categories, {
		fields: [categories.parentId],
		references: [categories.id],
		relationName: "categories_parentId_categories_id"
	}),
	categories: many(categories, {
		relationName: "categories_parentId_categories_id"
	}),
	sources: many(sources),
	articles: many(articles),
	articleRevisions: many(articleRevisions),
}));

export const sourcesRelations = relations(sources, ({one, many}) => ({
	category: one(categories, {
		fields: [sources.defaultCategoryId],
		references: [categories.id]
	}),
	rawArticles: many(rawArticles),
	articles: many(articles),
}));

export const rawArticlesRelations = relations(rawArticles, ({one, many}) => ({
	rawArticle: one(rawArticles, {
		fields: [rawArticles.duplicateOfId],
		references: [rawArticles.id],
		relationName: "rawArticles_duplicateOfId_rawArticles_id"
	}),
	rawArticles: many(rawArticles, {
		relationName: "rawArticles_duplicateOfId_rawArticles_id"
	}),
	source: one(sources, {
		fields: [rawArticles.sourceId],
		references: [sources.id]
	}),
	articles: many(articles),
}));

export const articlesRelations = relations(articles, ({one, many}) => ({
	category: one(categories, {
		fields: [articles.categoryId],
		references: [categories.id]
	}),
	rawArticle: one(rawArticles, {
		fields: [articles.rawArticleId],
		references: [rawArticles.id]
	}),
	source: one(sources, {
		fields: [articles.sourceId],
		references: [sources.id]
	}),
	matches_previewArticleId: many(matches, {
		relationName: "matches_previewArticleId_articles_id"
	}),
	matches_reportArticleId: many(matches, {
		relationName: "matches_reportArticleId_articles_id"
	}),
	searchQueries: many(searchQueries),
	comments: many(comments),
	articleRevisions: many(articleRevisions),
	editorialQueues: many(editorialQueue),
	articleTags: many(articleTags),
	articleCompetitions: many(articleCompetitions),
	userSavedArticles: many(userSavedArticles),
	newsletterCampaignArticles: many(newsletterCampaignArticles),
	articleTeams: many(articleTeams),
	articlePlayers: many(articlePlayers),
	articleRelateds_articleId: many(articleRelated, {
		relationName: "articleRelated_articleId_articles_id"
	}),
	articleRelateds_relatedId: many(articleRelated, {
		relationName: "articleRelated_relatedId_articles_id"
	}),
	articleMedias: many(articleMedia),
	articleDailyStats: many(articleDailyStats),
}));

export const competitionSeasonsRelations = relations(competitionSeasons, ({one, many}) => ({
	competition: one(competitions, {
		fields: [competitionSeasons.competitionId],
		references: [competitions.id]
	}),
	season: one(seasons, {
		fields: [competitionSeasons.seasonId],
		references: [seasons.id]
	}),
	competitionSeasonTeams: many(competitionSeasonTeams),
	rounds: many(rounds),
	matches: many(matches),
	standings: many(standings),
	playerSeasonStats: many(playerSeasonStats),
}));

export const competitionsRelations = relations(competitions, ({many}) => ({
	competitionSeasons: many(competitionSeasons),
	articleCompetitions: many(articleCompetitions),
}));

export const competitionSeasonTeamsRelations = relations(competitionSeasonTeams, ({one}) => ({
	competitionSeason: one(competitionSeasons, {
		fields: [competitionSeasonTeams.competitionSeasonId],
		references: [competitionSeasons.id]
	}),
	team: one(teams, {
		fields: [competitionSeasonTeams.teamId],
		references: [teams.id]
	}),
}));

export const roundsRelations = relations(rounds, ({one, many}) => ({
	competitionSeason: one(competitionSeasons, {
		fields: [rounds.competitionSeasonId],
		references: [competitionSeasons.id]
	}),
	matches: many(matches),
	standings: many(standings),
}));

export const matchesRelations = relations(matches, ({one, many}) => ({
	team_awayTeamId: one(teams, {
		fields: [matches.awayTeamId],
		references: [teams.id],
		relationName: "matches_awayTeamId_teams_id"
	}),
	competitionSeason: one(competitionSeasons, {
		fields: [matches.competitionSeasonId],
		references: [competitionSeasons.id]
	}),
	team_homeTeamId: one(teams, {
		fields: [matches.homeTeamId],
		references: [teams.id],
		relationName: "matches_homeTeamId_teams_id"
	}),
	article_previewArticleId: one(articles, {
		fields: [matches.previewArticleId],
		references: [articles.id],
		relationName: "matches_previewArticleId_articles_id"
	}),
	article_reportArticleId: one(articles, {
		fields: [matches.reportArticleId],
		references: [articles.id],
		relationName: "matches_reportArticleId_articles_id"
	}),
	round: one(rounds, {
		fields: [matches.roundId],
		references: [rounds.id]
	}),
	venue: one(venues, {
		fields: [matches.venueId],
		references: [venues.id]
	}),
	matchLineups: many(matchLineups),
	matchEvents: many(matchEvents),
}));

export const venuesRelations = relations(venues, ({many}) => ({
	matches: many(matches),
}));

export const matchLineupsRelations = relations(matchLineups, ({one}) => ({
	match: one(matches, {
		fields: [matchLineups.matchId],
		references: [matches.id]
	}),
	player: one(players, {
		fields: [matchLineups.playerId],
		references: [players.id]
	}),
	team: one(teams, {
		fields: [matchLineups.teamId],
		references: [teams.id]
	}),
}));

export const matchEventsRelations = relations(matchEvents, ({one}) => ({
	match: one(matches, {
		fields: [matchEvents.matchId],
		references: [matches.id]
	}),
	player_playerId: one(players, {
		fields: [matchEvents.playerId],
		references: [players.id],
		relationName: "matchEvents_playerId_players_id"
	}),
	player_relatedPlayerId: one(players, {
		fields: [matchEvents.relatedPlayerId],
		references: [players.id],
		relationName: "matchEvents_relatedPlayerId_players_id"
	}),
	team: one(teams, {
		fields: [matchEvents.teamId],
		references: [teams.id]
	}),
}));

export const standingsRelations = relations(standings, ({one}) => ({
	competitionSeason: one(competitionSeasons, {
		fields: [standings.competitionSeasonId],
		references: [competitionSeasons.id]
	}),
	round: one(rounds, {
		fields: [standings.roundId],
		references: [rounds.id]
	}),
	team: one(teams, {
		fields: [standings.teamId],
		references: [teams.id]
	}),
}));

export const playerSeasonStatsRelations = relations(playerSeasonStats, ({one}) => ({
	competitionSeason: one(competitionSeasons, {
		fields: [playerSeasonStats.competitionSeasonId],
		references: [competitionSeasons.id]
	}),
	player: one(players, {
		fields: [playerSeasonStats.playerId],
		references: [players.id]
	}),
	team: one(teams, {
		fields: [playerSeasonStats.teamId],
		references: [teams.id]
	}),
}));

export const searchQueriesRelations = relations(searchQueries, ({one}) => ({
	article: one(articles, {
		fields: [searchQueries.clickedArticleId],
		references: [articles.id]
	}),
}));

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	accounts: many(accounts),
	sessions: many(sessions),
	userFollows: many(userFollows),
	newsletterSubscribers: many(newsletterSubscribers),
	comments_moderatedBy: many(comments, {
		relationName: "comments_moderatedBy_users_id"
	}),
	comments_userId: many(comments, {
		relationName: "comments_userId_users_id"
	}),
	commentReports: many(commentReports),
	articleRevisions: many(articleRevisions),
	editorialQueues: many(editorialQueue),
	media: many(media),
	settings: many(settings),
	userSavedArticles: many(userSavedArticles),
	commentLikes: many(commentLikes),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const userFollowsRelations = relations(userFollows, ({one}) => ({
	user: one(users, {
		fields: [userFollows.userId],
		references: [users.id]
	}),
}));

export const newsletterSubscribersRelations = relations(newsletterSubscribers, ({one}) => ({
	user: one(users, {
		fields: [newsletterSubscribers.userId],
		references: [users.id]
	}),
}));

export const commentsRelations = relations(comments, ({one, many}) => ({
	article: one(articles, {
		fields: [comments.articleId],
		references: [articles.id]
	}),
	user_moderatedBy: one(users, {
		fields: [comments.moderatedBy],
		references: [users.id],
		relationName: "comments_moderatedBy_users_id"
	}),
	comment: one(comments, {
		fields: [comments.parentId],
		references: [comments.id],
		relationName: "comments_parentId_comments_id"
	}),
	comments: many(comments, {
		relationName: "comments_parentId_comments_id"
	}),
	user_userId: one(users, {
		fields: [comments.userId],
		references: [users.id],
		relationName: "comments_userId_users_id"
	}),
	commentReports: many(commentReports),
	commentLikes: many(commentLikes),
}));

export const commentReportsRelations = relations(commentReports, ({one}) => ({
	comment: one(comments, {
		fields: [commentReports.commentId],
		references: [comments.id]
	}),
	user: one(users, {
		fields: [commentReports.reporterId],
		references: [users.id]
	}),
}));

export const articleRevisionsRelations = relations(articleRevisions, ({one}) => ({
	article: one(articles, {
		fields: [articleRevisions.articleId],
		references: [articles.id]
	}),
	category: one(categories, {
		fields: [articleRevisions.categoryId],
		references: [categories.id]
	}),
	user: one(users, {
		fields: [articleRevisions.editedBy],
		references: [users.id]
	}),
}));

export const editorialQueueRelations = relations(editorialQueue, ({one}) => ({
	article: one(articles, {
		fields: [editorialQueue.articleId],
		references: [articles.id]
	}),
	user: one(users, {
		fields: [editorialQueue.assignedTo],
		references: [users.id]
	}),
}));

export const workflowRunsRelations = relations(workflowRuns, ({one, many}) => ({
	workflow: one(workflows, {
		fields: [workflowRuns.workflowId],
		references: [workflows.id]
	}),
	workflowRunItems: many(workflowRunItems),
	llmCalls: many(llmCalls),
}));

export const workflowsRelations = relations(workflows, ({many}) => ({
	workflowRuns: many(workflowRuns),
}));

export const workflowRunItemsRelations = relations(workflowRunItems, ({one}) => ({
	workflowRun: one(workflowRuns, {
		fields: [workflowRunItems.runId],
		references: [workflowRuns.id]
	}),
}));

export const llmCallsRelations = relations(llmCalls, ({one}) => ({
	llmPrompt: one(llmPrompts, {
		fields: [llmCalls.promptId],
		references: [llmPrompts.id]
	}),
	workflowRun: one(workflowRuns, {
		fields: [llmCalls.runId],
		references: [workflowRuns.id]
	}),
}));

export const llmPromptsRelations = relations(llmPrompts, ({many}) => ({
	llmCalls: many(llmCalls),
}));

export const mediaRelations = relations(media, ({one, many}) => ({
	user: one(users, {
		fields: [media.uploadedBy],
		references: [users.id]
	}),
	articleMedias: many(articleMedia),
}));

export const settingsRelations = relations(settings, ({one}) => ({
	user: one(users, {
		fields: [settings.updatedBy],
		references: [users.id]
	}),
}));

export const articleTagsRelations = relations(articleTags, ({one}) => ({
	article: one(articles, {
		fields: [articleTags.articleId],
		references: [articles.id]
	}),
	tag: one(tags, {
		fields: [articleTags.tagId],
		references: [tags.id]
	}),
}));

export const tagsRelations = relations(tags, ({many}) => ({
	articleTags: many(articleTags),
}));

export const articleCompetitionsRelations = relations(articleCompetitions, ({one}) => ({
	article: one(articles, {
		fields: [articleCompetitions.articleId],
		references: [articles.id]
	}),
	competition: one(competitions, {
		fields: [articleCompetitions.competitionId],
		references: [competitions.id]
	}),
}));

export const userSavedArticlesRelations = relations(userSavedArticles, ({one}) => ({
	article: one(articles, {
		fields: [userSavedArticles.articleId],
		references: [articles.id]
	}),
	user: one(users, {
		fields: [userSavedArticles.userId],
		references: [users.id]
	}),
}));

export const newsletterCampaignArticlesRelations = relations(newsletterCampaignArticles, ({one}) => ({
	article: one(articles, {
		fields: [newsletterCampaignArticles.articleId],
		references: [articles.id]
	}),
	newsletterCampaign: one(newsletterCampaigns, {
		fields: [newsletterCampaignArticles.campaignId],
		references: [newsletterCampaigns.id]
	}),
}));

export const newsletterCampaignsRelations = relations(newsletterCampaigns, ({many}) => ({
	newsletterCampaignArticles: many(newsletterCampaignArticles),
}));

export const commentLikesRelations = relations(commentLikes, ({one}) => ({
	comment: one(comments, {
		fields: [commentLikes.commentId],
		references: [comments.id]
	}),
	user: one(users, {
		fields: [commentLikes.userId],
		references: [users.id]
	}),
}));

export const articleTeamsRelations = relations(articleTeams, ({one}) => ({
	article: one(articles, {
		fields: [articleTeams.articleId],
		references: [articles.id]
	}),
	team: one(teams, {
		fields: [articleTeams.teamId],
		references: [teams.id]
	}),
}));

export const articlePlayersRelations = relations(articlePlayers, ({one}) => ({
	article: one(articles, {
		fields: [articlePlayers.articleId],
		references: [articles.id]
	}),
	player: one(players, {
		fields: [articlePlayers.playerId],
		references: [players.id]
	}),
}));

export const articleRelatedRelations = relations(articleRelated, ({one}) => ({
	article_articleId: one(articles, {
		fields: [articleRelated.articleId],
		references: [articles.id],
		relationName: "articleRelated_articleId_articles_id"
	}),
	article_relatedId: one(articles, {
		fields: [articleRelated.relatedId],
		references: [articles.id],
		relationName: "articleRelated_relatedId_articles_id"
	}),
}));

export const articleMediaRelations = relations(articleMedia, ({one}) => ({
	article: one(articles, {
		fields: [articleMedia.articleId],
		references: [articles.id]
	}),
	media: one(media, {
		fields: [articleMedia.mediaId],
		references: [media.id]
	}),
}));

export const articleDailyStatsRelations = relations(articleDailyStats, ({one}) => ({
	article: one(articles, {
		fields: [articleDailyStats.articleId],
		references: [articles.id]
	}),
}));