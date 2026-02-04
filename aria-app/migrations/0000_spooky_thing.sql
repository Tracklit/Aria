CREATE TABLE IF NOT EXISTS "aria_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(200) DEFAULT 'New Conversation',
	"is_archived" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aria_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"prompt_cost" integer DEFAULT 0,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "connected_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_user_id" varchar(255),
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"scopes" json DEFAULT '[]'::json,
	"last_sync_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dashboard_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"mode" varchar(50) NOT NULL,
	"greeting" varchar(200),
	"subtitle" varchar(500),
	"cards" json DEFAULT '[]'::json,
	"generated_by" varchar(20) DEFAULT 'rules',
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dashboard_states_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text,
	"priority" varchar(20) DEFAULT 'normal',
	"payload" json,
	"action_type" varchar(50),
	"action_data" json,
	"is_read" boolean DEFAULT false,
	"is_dismissed" boolean DEFAULT false,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planned_workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"week_number" integer,
	"day_of_week" integer,
	"type" varchar(50) NOT NULL,
	"title" varchar(200),
	"description" text,
	"structure" json,
	"target_duration" integer,
	"target_distance" real,
	"target_pace" varchar(20),
	"notes" text,
	"priority" varchar(20) DEFAULT 'normal',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "races" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"distance" real,
	"distance_label" varchar(50),
	"date" timestamp NOT NULL,
	"location" varchar(200),
	"goal_time" integer,
	"notes" text,
	"is_completed" boolean DEFAULT false,
	"finish_time" integer,
	"finish_place" integer,
	"age_group_place" integer,
	"workout_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_name" varchar(200) NOT NULL,
	"description" text,
	"target_event_name" varchar(200),
	"target_event_date" timestamp,
	"target_distance" real,
	"target_time" integer,
	"status" varchar(20) DEFAULT 'active',
	"start_date" timestamp,
	"end_date" timestamp,
	"week_count" integer,
	"generated_by" varchar(20) DEFAULT 'user',
	"ai_plan_config" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"notification_prefs" json DEFAULT '{"workoutReminders":true,"dailyDigest":true,"weeklyReport":true,"coachingTips":true,"competitionAlerts":true}'::json,
	"privacy_prefs" json DEFAULT '{"shareWorkouts":false,"publicProfile":false,"dataAnalytics":true}'::json,
	"ai_coaching_style" varchar(50) DEFAULT 'balanced',
	"preferred_workout_days" json DEFAULT '[]'::json,
	"preferred_workout_time" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"display_name" varchar(100),
	"photo_url" varchar(500),
	"sport" varchar(50),
	"experience_level" varchar(50),
	"goal_tags" json DEFAULT '[]'::json,
	"units" varchar(10) DEFAULT 'imperial',
	"date_of_birth" timestamp,
	"gender" varchar(20),
	"height" real,
	"weight" real,
	"weekly_goal_distance" real,
	"weekly_goal_duration" integer,
	"onboarding_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255),
	"auth_provider" varchar(50) DEFAULT 'email',
	"apple_id" varchar(255),
	"refresh_token" varchar(512),
	"refresh_token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_apple_id_unique" UNIQUE("apple_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workout_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"planned_workout_id" integer NOT NULL,
	"actual_workout_id" integer,
	"status" varchar(20) DEFAULT 'pending',
	"compliance_score" real,
	"reason_skipped" text,
	"feedback" text,
	"perceived_effort" integer,
	"mood" varchar(20),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workout_samples" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_id" integer NOT NULL,
	"timestamp" timestamp NOT NULL,
	"heart_rate" integer,
	"pace" real,
	"cadence" integer,
	"latitude" real,
	"longitude" real,
	"elevation" real,
	"power" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workout_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"planned_workout_id" integer,
	"status" varchar(20) DEFAULT 'pending',
	"current_phase" varchar(50),
	"current_interval_index" integer DEFAULT 0,
	"started_at" timestamp,
	"paused_at" timestamp,
	"completed_at" timestamp,
	"total_paused_duration" integer DEFAULT 0,
	"live_metrics" json,
	"checkpoints" json DEFAULT '[]'::json,
	"final_workout_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider_source" varchar(50) DEFAULT 'manual',
	"external_id" varchar(255),
	"type" varchar(50) NOT NULL,
	"title" varchar(200),
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"timezone" varchar(50),
	"duration_seconds" integer,
	"distance_meters" real,
	"elevation_gain_meters" real,
	"avg_pace" varchar(20),
	"avg_speed" real,
	"max_speed" real,
	"avg_heart_rate" integer,
	"max_heart_rate" integer,
	"avg_cadence" integer,
	"calories" integer,
	"splits" json,
	"weather_conditions" json,
	"gps_route" json,
	"notes" text,
	"is_private" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aria_conversations" ADD CONSTRAINT "aria_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "aria_messages" ADD CONSTRAINT "aria_messages_conversation_id_aria_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."aria_conversations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "connected_devices" ADD CONSTRAINT "connected_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dashboard_states" ADD CONSTRAINT "dashboard_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "insights" ADD CONSTRAINT "insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_plan_id_training_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."training_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "races" ADD CONSTRAINT "races_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "races" ADD CONSTRAINT "races_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workout_completions" ADD CONSTRAINT "workout_completions_planned_workout_id_planned_workouts_id_fk" FOREIGN KEY ("planned_workout_id") REFERENCES "public"."planned_workouts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workout_completions" ADD CONSTRAINT "workout_completions_actual_workout_id_workouts_id_fk" FOREIGN KEY ("actual_workout_id") REFERENCES "public"."workouts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workout_samples" ADD CONSTRAINT "workout_samples_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_planned_workout_id_planned_workouts_id_fk" FOREIGN KEY ("planned_workout_id") REFERENCES "public"."planned_workouts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_final_workout_id_workouts_id_fk" FOREIGN KEY ("final_workout_id") REFERENCES "public"."workouts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workouts" ADD CONSTRAINT "workouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aria_conversations_user_created_idx" ON "aria_conversations" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aria_messages_conversation_created_idx" ON "aria_messages" ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "connected_devices_user_provider_idx" ON "connected_devices" ("user_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "insights_user_type_idx" ON "insights" ("user_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "insights_user_expires_idx" ON "insights" ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "planned_workouts_plan_date_idx" ON "planned_workouts" ("plan_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "races_user_date_idx" ON "races" ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_plans_user_status_idx" ON "training_plans" ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workout_samples_workout_timestamp_idx" ON "workout_samples" ("workout_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workout_sessions_user_status_idx" ON "workout_sessions" ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workouts_user_start_time_idx" ON "workouts" ("user_id","start_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workouts_user_type_idx" ON "workouts" ("user_id","type");