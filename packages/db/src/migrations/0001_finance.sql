CREATE TYPE "public"."account_type" AS ENUM('CASH', 'LOAN_TAKEN', 'LOAN_GIVEN', 'INCOME', 'EXPENSE');--> statement-breakpoint
CREATE TYPE "public"."transaction_form" AS ENUM('PAYMENT', 'RECEIVE');--> statement-breakpoint
CREATE TABLE "allocation_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "allocation_lines_transaction_account" UNIQUE("transaction_id","account_id"),
	CONSTRAINT "allocation_lines_transaction_position" UNIQUE("transaction_id","position"),
	CONSTRAINT "allocation_lines_amount_positive" CHECK ("allocation_lines"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "financial_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"opening_amount_minor" bigint DEFAULT 0 NOT NULL,
	"opening_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_accounts_owner_name" UNIQUE("owner_id","name"),
	CONSTRAINT "financial_accounts_opening_non_negative" CHECK ("financial_accounts"."opening_amount_minor" >= 0),
	CONSTRAINT "financial_accounts_currency_thb" CHECK ("financial_accounts"."currency" = 'THB')
);
--> statement-breakpoint
CREATE TABLE "financial_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"form" "transaction_form" NOT NULL,
	"primary_account_id" uuid NOT NULL,
	"date" date NOT NULL,
	"total_minor" bigint NOT NULL,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_transactions_total_positive" CHECK ("financial_transactions"."total_minor" > 0)
);
--> statement-breakpoint
ALTER TABLE "allocation_lines" ADD CONSTRAINT "allocation_lines_transaction_id_financial_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."financial_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_lines" ADD CONSTRAINT "allocation_lines_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_primary_account_id_financial_accounts_id_fk" FOREIGN KEY ("primary_account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "allocation_lines_account" ON "allocation_lines" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "financial_transactions_owner_date" ON "financial_transactions" USING btree ("owner_id","date");