CREATE TABLE "clips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"start_seconds" real NOT NULL,
	"end_seconds" real NOT NULL,
	"duration_seconds" real NOT NULL,
	"summary" text,
	"reason" text NOT NULL,
	"file_name" text NOT NULL,
	"public_path" text NOT NULL,
	"captions_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"review_status" varchar(32) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_url" text NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"duration_seconds" real,
	"output_root" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clips" ADD CONSTRAINT "clips_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;