CREATE TYPE "public"."transaction_form" AS ENUM('PAYMENT', 'RECEIVE');--> statement-breakpoint
CREATE TABLE "transaction_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"amount_satang" bigint NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "transaction_allocations_transaction_account_unique" UNIQUE("transaction_id","account_id"),
	CONSTRAINT "transaction_allocations_amount_positive" CHECK ("transaction_allocations"."amount_satang" > 0),
	CONSTRAINT "transaction_allocations_amount_max" CHECK ("transaction_allocations"."amount_satang" <= 100000000000)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"form" "transaction_form" NOT NULL,
	"primary_account_id" uuid NOT NULL,
	"occurred_on" date NOT NULL,
	"total_satang" bigint NOT NULL,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_owner_id_id_unique" UNIQUE("owner_id","id"),
	CONSTRAINT "transactions_total_positive" CHECK ("transactions"."total_satang" > 0),
	CONSTRAINT "transactions_total_max" CHECK ("transactions"."total_satang" <= 100000000000)
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_owner_id_id_unique" UNIQUE("owner_id","id");--> statement-breakpoint
ALTER TABLE "transaction_allocations" ADD CONSTRAINT "transaction_allocations_owner_transaction_fk" FOREIGN KEY ("owner_id","transaction_id") REFERENCES "public"."transactions"("owner_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_allocations" ADD CONSTRAINT "transaction_allocations_owner_account_fk" FOREIGN KEY ("owner_id","account_id") REFERENCES "public"."accounts"("owner_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_owner_primary_account_fk" FOREIGN KEY ("owner_id","primary_account_id") REFERENCES "public"."accounts"("owner_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transaction_allocations_transaction_position_idx" ON "transaction_allocations" USING btree ("transaction_id","position");--> statement-breakpoint
CREATE INDEX "transactions_owner_date_id_idx" ON "transactions" USING btree ("owner_id","occurred_on","id");
