CREATE TABLE IF NOT EXISTS "nutrition_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"nutrition_plan_id" integer,
	"meal_name" varchar(100) NOT NULL,
	"status" varchar(20) NOT NULL,
	"date" timestamp NOT NULL,
	"calories" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "sub_events" json;--> statement-breakpoint
ALTER TABLE "nutrition_plans" ADD COLUMN "meals_per_day" integer;--> statement-breakpoint
ALTER TABLE "nutrition_plans" ADD COLUMN "wake_time" varchar(10);--> statement-breakpoint
ALTER TABLE "nutrition_plans" ADD COLUMN "sleep_time" varchar(10);--> statement-breakpoint
ALTER TABLE "nutrition_plans" ADD COLUMN "lunch_time" varchar(10);--> statement-breakpoint
ALTER TABLE "nutrition_plans" ADD COLUMN "training_time" varchar(10);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_nutrition_plan_id_nutrition_plans_id_fk" FOREIGN KEY ("nutrition_plan_id") REFERENCES "public"."nutrition_plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nutrition_logs_user_date_idx" ON "nutrition_logs" ("user_id","date");