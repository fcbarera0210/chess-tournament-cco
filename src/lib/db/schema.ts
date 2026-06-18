import {
  pgTable,
  uuid,
  text,
  date,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const tournamentFormatEnum = pgEnum('tournament_format', ['swiss', 'knockout']);
export const tournamentStatusEnum = pgEnum('tournament_status', [
  'draft',
  'registration_open',
  'registration_closed',
  'live',
  'finished',
]);
export const playerStatusEnum = pgEnum('player_status', [
  'registered',
  'waitlist',
  'checked_in',
  'withdrawn',
]);
export const roundStatusEnum = pgEnum('round_status', ['draft', 'active', 'completed']);
export const gameResultEnum = pgEnum('game_result', [
  'pending',
  'white',
  'black',
  'draw',
  'bye',
  'forfeit_white',
  'forfeit_black',
]);

export const tournaments = pgTable('tournaments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  eventDate: date('event_date').notNull(),
  eventTimeStart: text('event_time_start').notNull().default('15:00'),
  eventTimeEnd: text('event_time_end').notNull().default('20:00'),
  venue: text('venue').notNull(),
  venueMapsUrl: text('venue_maps_url'),
  format: tournamentFormatEnum('format').notNull().default('swiss'),
  maxPlayers: integer('max_players').notNull().default(20),
  plannedRounds: integer('planned_rounds').notNull().default(4),
  timeControl: text('time_control').notNull().default('10+5'),
  status: tournamentStatusEnum('status').notNull().default('registration_open'),
  waitlistEnabled: boolean('waitlist_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id')
    .notNull()
    .references(() => tournaments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  contact: text('contact').notNull(),
  clubLevel: text('club_level'),
  status: playerStatusEnum('status').notNull().default('registered'),
  seed: integer('seed'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rounds = pgTable('rounds', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournamentId: uuid('tournament_id')
    .notNull()
    .references(() => tournaments.id, { onDelete: 'cascade' }),
  roundNumber: integer('round_number').notNull(),
  status: roundStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  roundId: uuid('round_id')
    .notNull()
    .references(() => rounds.id, { onDelete: 'cascade' }),
  boardNumber: integer('board_number').notNull(),
  whitePlayerId: uuid('white_player_id').references(() => players.id, { onDelete: 'set null' }),
  blackPlayerId: uuid('black_player_id').references(() => players.id, { onDelete: 'set null' }),
  result: gameResultEnum('result').notNull().default('pending'),
  isBye: boolean('is_bye').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  players: many(players),
  rounds: many(rounds),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [players.tournamentId],
    references: [tournaments.id],
  }),
  whiteGames: many(games, { relationName: 'whitePlayer' }),
  blackGames: many(games, { relationName: 'blackPlayer' }),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [rounds.tournamentId],
    references: [tournaments.id],
  }),
  games: many(games),
}));

export const gamesRelations = relations(games, ({ one }) => ({
  round: one(rounds, {
    fields: [games.roundId],
    references: [rounds.id],
  }),
  whitePlayer: one(players, {
    fields: [games.whitePlayerId],
    references: [players.id],
    relationName: 'whitePlayer',
  }),
  blackPlayer: one(players, {
    fields: [games.blackPlayerId],
    references: [players.id],
    relationName: 'blackPlayer',
  }),
}));
