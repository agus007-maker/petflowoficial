CREATE TYPE "public"."petflow_membership_role" AS ENUM('owner', 'manager', 'cashier', 'assistant', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."petflow_membership_status" AS ENUM('active', 'invited', 'suspended');--> statement-breakpoint
CREATE TABLE "petflow_membership_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"membershipId" integer NOT NULL,
	"permission" varchar(80) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "petflow_shop_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerUserId" integer NOT NULL,
	"userId" integer NOT NULL,
	"role" "petflow_membership_role" DEFAULT 'assistant' NOT NULL,
	"status" "petflow_membership_status" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "petflow_membership_permissions" ADD CONSTRAINT "petflow_membership_permissions_membershipId_petflow_shop_memberships_id_fk" FOREIGN KEY ("membershipId") REFERENCES "public"."petflow_shop_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_shop_memberships" ADD CONSTRAINT "petflow_shop_memberships_ownerUserId_petflow_users_id_fk" FOREIGN KEY ("ownerUserId") REFERENCES "public"."petflow_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "petflow_shop_memberships" ADD CONSTRAINT "petflow_shop_memberships_userId_petflow_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."petflow_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "petflow_membership_permissions_unique" ON "petflow_membership_permissions" USING btree ("membershipId","permission");--> statement-breakpoint
CREATE INDEX "petflow_membership_permissions_membership_idx" ON "petflow_membership_permissions" USING btree ("membershipId");--> statement-breakpoint
CREATE UNIQUE INDEX "petflow_shop_memberships_owner_user_unique" ON "petflow_shop_memberships" USING btree ("ownerUserId","userId");--> statement-breakpoint
CREATE INDEX "petflow_shop_memberships_user_idx" ON "petflow_shop_memberships" USING btree ("userId");