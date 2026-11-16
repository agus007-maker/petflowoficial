CREATE TYPE "public"."petflow_appointment_status" AS ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."petflow_notification_type" AS ENUM('appointment_reminder', 'appointment_status', 'stock_alert');--> statement-breakpoint
CREATE TYPE "public"."petflow_payment_method" AS ENUM('cash', 'card', 'transfer', 'other');--> statement-breakpoint
CREATE TYPE "public"."petflow_user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "petflow_appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerUserId" integer NOT NULL,
	"clientId" integer NOT NULL,
	"petId" integer NOT NULL,
	"service" varchar(100) NOT NULL,
	"scheduledAt" timestamp with time zone NOT NULL,
	"durationMinutes" integer DEFAULT 60 NOT NULL,
	"status" "petflow_appointment_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"reminderSentAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petflow_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerUserId" integer NOT NULL,
	"fullName" varchar(160) NOT NULL,
	"phone" varchar(48),
	"email" varchar(320),
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petflow_notification_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerUserId" integer NOT NULL,
	"remindersEnabled" boolean DEFAULT true NOT NULL,
	"reminderLeadMinutes" integer DEFAULT 60 NOT NULL,
	"scheduleCronTaskUid" varchar(65),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petflow_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerUserId" integer NOT NULL,
	"appointmentId" integer,
	"type" "petflow_notification_type" NOT NULL,
	"title" varchar(180) NOT NULL,
	"content" text NOT NULL,
	"readAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petflow_pets" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerUserId" integer NOT NULL,
	"clientId" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"species" varchar(40) NOT NULL,
	"breed" varchar(100),
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petflow_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerUserId" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"sku" varchar(80),
	"category" varchar(48) NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"minStock" integer DEFAULT 3 NOT NULL,
	"costPrice" numeric(12, 2) DEFAULT '0' NOT NULL,
	"salePrice" numeric(12, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petflow_sale_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"saleId" integer NOT NULL,
	"productId" integer,
	"productName" varchar(160) NOT NULL,
	"unitPrice" numeric(12, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"lineTotal" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petflow_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerUserId" integer NOT NULL,
	"clientId" integer,
	"paymentMethod" "petflow_payment_method" NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petflow_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "petflow_user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "petflow_users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
ALTER TABLE "petflow_appointments" ADD CONSTRAINT "petflow_appointments_ownerUserId_petflow_users_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES "public"."petflow_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_appointments" ADD CONSTRAINT "petflow_appointments_clientId_petflow_clients_id_fk" FOREIGN KEY ("clientId") REFERENCES "public"."petflow_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_appointments" ADD CONSTRAINT "petflow_appointments_petId_petflow_pets_id_fk" FOREIGN KEY ("petId") REFERENCES "public"."petflow_pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_clients" ADD CONSTRAINT "petflow_clients_ownerUserId_petflow_users_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES "public"."petflow_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_notification_settings" ADD CONSTRAINT "petflow_notification_settings_ownerUserId_petflow_users_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES "public"."petflow_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_notifications" ADD CONSTRAINT "petflow_notifications_ownerUserId_petflow_users_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES "public"."petflow_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_notifications" ADD CONSTRAINT "petflow_notifications_appointmentId_petflow_appointments_id_fk" FOREIGN KEY ("appointmentId") REFERENCES "public"."petflow_appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_pets" ADD CONSTRAINT "petflow_pets_ownerUserId_petflow_users_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES "public"."petflow_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_pets" ADD CONSTRAINT "petflow_pets_clientId_petflow_clients_id_fk" FOREIGN KEY ("clientId") REFERENCES "public"."petflow_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_products" ADD CONSTRAINT "petflow_products_ownerUserId_petflow_users_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES "public"."petflow_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_sale_items" ADD CONSTRAINT "petflow_sale_items_saleId_petflow_sales_id_fk" FOREIGN KEY ("saleId") REFERENCES "public"."petflow_sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_sale_items" ADD CONSTRAINT "petflow_sale_items_productId_petflow_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."petflow_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_sales" ADD CONSTRAINT "petflow_sales_ownerUserId_petflow_users_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES "public"."petflow_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_sales" ADD CONSTRAINT "petflow_sales_clientId_petflow_clients_id_fk" FOREIGN KEY ("clientId") REFERENCES "public"."petflow_clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "petflow_appointments_owner_date_idx" ON "petflow_appointments" USING btree ("ownerUserId","scheduledAt");--> statement-breakpoint
CREATE INDEX "petflow_appointments_reminder_idx" ON "petflow_appointments" USING btree ("ownerUserId","reminderSentAt");--> statement-breakpoint
CREATE INDEX "petflow_clients_owner_idx" ON "petflow_clients" USING btree ("ownerUserId");--> statement-breakpoint
CREATE INDEX "petflow_clients_owner_name_idx" ON "petflow_clients" USING btree ("ownerUserId","fullName");--> statement-breakpoint
CREATE UNIQUE INDEX "petflow_notification_settings_owner_unique" ON "petflow_notification_settings" USING btree ("ownerUserId");--> statement-breakpoint
CREATE INDEX "petflow_notification_settings_task_idx" ON "petflow_notification_settings" USING btree ("scheduleCronTaskUid");--> statement-breakpoint
CREATE INDEX "petflow_notifications_owner_created_idx" ON "petflow_notifications" USING btree ("ownerUserId","createdAt");--> statement-breakpoint
CREATE INDEX "petflow_pets_owner_idx" ON "petflow_pets" USING btree ("ownerUserId");--> statement-breakpoint
CREATE INDEX "petflow_pets_client_idx" ON "petflow_pets" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "petflow_products_owner_idx" ON "petflow_products" USING btree ("ownerUserId");--> statement-breakpoint
CREATE INDEX "petflow_products_owner_category_idx" ON "petflow_products" USING btree ("ownerUserId","category");--> statement-breakpoint
CREATE INDEX "petflow_sale_items_sale_idx" ON "petflow_sale_items" USING btree ("saleId");--> statement-breakpoint
CREATE INDEX "petflow_sales_owner_created_idx" ON "petflow_sales" USING btree ("ownerUserId","createdAt");--> statement-breakpoint
CREATE INDEX "petflow_sales_client_idx" ON "petflow_sales" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "petflow_users_open_id_idx" ON "petflow_users" USING btree ("openId");