CREATE TABLE IF NOT EXISTS "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"date" timestamp NOT NULL,
	"location" varchar(200),
	"distance" real,
	"distance_label" varchar(50),
	"goal_time" real,
	"notes" text,
	"priority" varchar(20) DEFAULT 'medium',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "health_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"provider" varchar(50) NOT NULL,
	"sleep_duration_seconds" integer,
	"sleep_efficiency" real,
	"deep_sleep_seconds" integer,
	"rem_sleep_seconds" integer,
	"sleep_score" integer,
	"bedtime" timestamp,
	"wake_time" timestamp,
	"resting_heart_rate" integer,
	"avg_heart_rate" integer,
	"max_heart_rate" integer,
	"hrv_rmssd" real,
	"readiness_score" integer,
	"recovery_score" integer,
	"stress_score" integer,
	"body_battery" integer,
	"weight_kg" real,
	"body_fat_percentage" real,
	"steps" integer,
	"active_minutes" integer,
	"calories_burned" integer,
	"raw_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connected_devices" ADD COLUMN "sync_preferences" json DEFAULT '{"workouts":true,"heartRate":true,"sleep":true,"recovery":true,"bodyMetrics":true,"steps":true}'::json;--> statement-breakpoint
ALTER TABLE "nutrition_plans" ADD COLUMN "is_multi_day" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "nutrition_plans" ADD COLUMN "daily_meal_plans" json;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "active_week" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "average_sleep_hours" real;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "sleep_quality" varchar(20);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "current_mood" varchar(20);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "training_days_per_week" integer;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "injury_status" varchar(20);--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "training_focus" json DEFAULT '[]'::json;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_user_date_idx" ON "events" ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_metrics_user_date_provider_idx" ON "health_metrics" ("user_id","date","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_metrics_user_date_idx" ON "health_metrics" ("user_id","date");