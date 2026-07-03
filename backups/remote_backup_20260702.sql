


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."current_profile_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
    and is_internal = true
  limit 1
$$;


ALTER FUNCTION "public"."current_profile_role"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "email" "text",
    "role" "text",
    "phone" "text",
    "avatar_url" "text",
    "position" "text",
    "full_name" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_type" "text" DEFAULT 'internal'::"text" NOT NULL,
    "is_internal" boolean DEFAULT true NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'comercial'::"text", 'ingenieria'::"text", 'project_manager'::"text", 'instalador'::"text", 'compras'::"text", 'finanzas'::"text", 'client'::"text"]))),
    CONSTRAINT "profiles_user_type_check" CHECK (("user_type" = ANY (ARRAY['internal'::"text", 'client_portal'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_current_user_profile"() RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  profile public.profiles;
  jwt_user_type text;
  next_user_type text;
  next_is_internal boolean;
  next_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  jwt_user_type := auth.jwt() -> 'user_metadata' ->> 'user_type';
  next_user_type := case
    when jwt_user_type = 'client_portal'
      or auth.jwt() -> 'user_metadata' ->> 'portal' = 'client'
      or auth.jwt() -> 'user_metadata' ->> 'role' = 'client'
    then 'client_portal'
    else 'internal'
  end;

  next_is_internal := next_user_type = 'internal';
  next_role := case
    when next_user_type = 'client_portal' then 'client'
    else 'comercial'
  end;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    user_type,
    is_internal,
    is_active
  )
  values (
    auth.uid(),
    auth.jwt() ->> 'email',
    coalesce(
      nullif(auth.jwt() -> 'user_metadata' ->> 'full_name', ''),
      nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
      nullif(auth.jwt() ->> 'email', '')
    ),
    next_role,
    next_user_type,
    next_is_internal,
    true
  )
  on conflict (id) do update
  set email = coalesce(public.profiles.email, excluded.email),
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      role = case
        when excluded.user_type = 'client_portal' then 'client'
        else public.profiles.role
      end,
      user_type = case
        when excluded.user_type = 'client_portal' then 'client_portal'
        else public.profiles.user_type
      end,
      is_internal = case
        when excluded.user_type = 'client_portal' then false
        else public.profiles.is_internal
      end,
      updated_at = now();

  select *
  into profile
  from public.profiles
  where id = auth.uid();

  return profile;
end;
$$;


ALTER FUNCTION "public"."ensure_current_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  next_user_type text;
  next_is_internal boolean;
  next_role text;
begin
  next_user_type := case
    when new.raw_user_meta_data ->> 'user_type' = 'client_portal'
      or new.raw_user_meta_data ->> 'portal' = 'client'
      or new.raw_user_meta_data ->> 'role' = 'client'
    then 'client_portal'
    else 'internal'
  end;

  next_is_internal := next_user_type = 'internal';
  next_role := case
    when next_user_type = 'client_portal' then 'client'
    else 'comercial'
  end;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    user_type,
    is_internal,
    is_active
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.email, '')
    ),
    next_role,
    next_user_type,
    next_is_internal,
    true
  )
  on conflict (id) do update
  set email = coalesce(public.profiles.email, excluded.email),
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      role = case
        when excluded.user_type = 'client_portal' then 'client'
        else public.profiles.role
      end,
      user_type = case
        when excluded.user_type = 'client_portal' then 'client_portal'
        else public.profiles.user_type
      end,
      is_internal = case
        when excluded.user_type = 'client_portal' then false
        else public.profiles.is_internal
      end,
      updated_at = now();

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_project_invoice_internal_folio"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  sequence_number bigint;
  candidate text;
begin
  loop
    sequence_number := nextval('public.project_invoice_internal_folio_seq'::regclass);
    candidate := 'FAC-' || lpad(sequence_number::text, 4, '0');

    if not exists (
      select 1
      from public.project_invoices
      where internal_folio = candidate
    ) then
      return candidate;
    end if;
  end loop;
end;
$$;


ALTER FUNCTION "public"."next_project_invoice_internal_folio"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_project_profitability_report_number"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  sequence_number bigint;
  candidate text;
begin
  loop
    sequence_number := nextval('public.project_profitability_report_number_seq'::regclass);
    candidate := 'RENT-' || lpad(sequence_number::text, 5, '0');

    if not exists (
      select 1
      from public.project_profitability_reports
      where report_number = candidate
    ) then
      return candidate;
    end if;
  end loop;
end;
$$;


ALTER FUNCTION "public"."next_project_profitability_report_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_project_deliveries_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_project_deliveries_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_project_profitability_reports_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_project_profitability_reports_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_project_warranties_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_project_warranties_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" bigint NOT NULL,
    "project_type" "text" NOT NULL,
    "progress" bigint,
    "name" "text",
    "status" "text",
    "description" "text",
    "site_manager" "text",
    "start_date" "date",
    "due_date" "date",
    "responsible_user_id" "uuid" DEFAULT "gen_random_uuid"(),
    "quote_id" bigint,
    "client_id" bigint,
    "project_number" "text",
    "estimated_delivery_date" "date",
    "actual_delivery_date" "date",
    "estimated_equipment_cost" numeric,
    "estimated_installation_cost" numeric,
    "estimated_total_sale" numeric,
    "estimated_profit" numeric,
    "created_by" "uuid" DEFAULT "gen_random_uuid"()
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


ALTER TABLE "public"."projects" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Projects_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cfdi_use_catalog" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "applies_to_person_type" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "cfdi_use_catalog_applies_to_person_type_check" CHECK (("applies_to_person_type" = ANY (ARRAY['physical'::"text", 'moral'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."cfdi_use_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_portal_project_access" (
    "id" bigint NOT NULL,
    "client_portal_user_id" bigint NOT NULL,
    "client_project_id" bigint NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_portal_project_access" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."client_portal_project_access_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."client_portal_project_access_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."client_portal_project_access_id_seq" OWNED BY "public"."client_portal_project_access"."id";



CREATE TABLE IF NOT EXISTS "public"."client_portal_users" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" bigint NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invited_at" timestamp with time zone,
    "invitation_status" "text",
    "invitation_error" "text"
);


ALTER TABLE "public"."client_portal_users" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."client_portal_users_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."client_portal_users_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."client_portal_users_id_seq" OWNED BY "public"."client_portal_users"."id";



CREATE TABLE IF NOT EXISTS "public"."client_projects" (
    "id" bigint NOT NULL,
    "client_id" bigint NOT NULL,
    "project_number" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'opportunity'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sales_stage" "text" DEFAULT 'lead'::"text" NOT NULL,
    "estimated_value_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "probability_percent" integer DEFAULT 0 NOT NULL,
    "expected_close_date" "date",
    "lost_reason" "text",
    "crew_lead_name" "text",
    "crew_lead_phone" "text",
    "site_contact_name" "text",
    "site_contact_phone" "text",
    "site_address" "text",
    "site_google_maps_url" "text",
    CONSTRAINT "client_projects_probability_percent_check" CHECK ((("probability_percent" >= 0) AND ("probability_percent" <= 100))),
    CONSTRAINT "client_projects_sales_stage_check" CHECK (("sales_stage" = ANY (ARRAY['lead'::"text", 'prospect'::"text", 'site_visit'::"text", 'engineering'::"text", 'quote'::"text", 'quoted'::"text", 'negotiation'::"text", 'won'::"text", 'lost'::"text", 'installed'::"text", 'delivered'::"text", 'warranty'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."client_projects" OWNER TO "postgres";


ALTER TABLE "public"."client_projects" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."client_projects_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "email" "text",
    "phone" "text",
    "company" "text",
    "address" "text",
    "client_number" integer NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_name" "text",
    "notes" "text",
    "source" "text" DEFAULT 'Prospectación Directa'::"text",
    "lead_captured_at" timestamp with time zone,
    "tax_rfc" "text",
    "tax_business_name" "text",
    "tax_regime" "text",
    "default_cfdi_use" "text",
    "tax_zip_code" "text",
    "billing_email" "text",
    "fiscal_regime" "text",
    "cfdi_use" "text",
    CONSTRAINT "clients_source_check" CHECK ((("source" IS NULL) OR ("source" = ANY (ARRAY['Landing Web'::"text", 'Referido'::"text", 'LinkedIn'::"text", 'Google'::"text", 'Prospectación Directa'::"text", 'Cliente Existente'::"text"]))))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


ALTER TABLE "public"."clients" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."clients_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."commercial_partners" (
    "id" bigint NOT NULL,
    "commercial_name" "text" NOT NULL,
    "logo_url" "text",
    "logo_storage_path" "text",
    "primary_color" "text" DEFAULT '#9E1B32'::"text" NOT NULL,
    "secondary_color" "text" DEFAULT '#111111'::"text",
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "commercial_partners_primary_color_hex" CHECK (("primary_color" ~ '^#[0-9A-Fa-f]{6}$'::"text")),
    CONSTRAINT "commercial_partners_secondary_color_hex" CHECK ((("secondary_color" IS NULL) OR ("secondary_color" ~ '^#[0-9A-Fa-f]{6}$'::"text")))
);


ALTER TABLE "public"."commercial_partners" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."commercial_partners_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."commercial_partners_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."commercial_partners_id_seq" OWNED BY "public"."commercial_partners"."id";



CREATE TABLE IF NOT EXISTS "public"."contractor_account_movements" (
    "id" bigint NOT NULL,
    "contractor_id" bigint NOT NULL,
    "client_project_id" bigint,
    "work_order_id" bigint,
    "movement_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "movement_type" "text" NOT NULL,
    "amount_mxn" numeric(14,2) NOT NULL,
    "description" "text",
    "payment_method" "text",
    "reference" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contractor_account_movements_movement_type_check" CHECK (("movement_type" = ANY (ARRAY['advance_payment'::"text", 'work_charge'::"text", 'adjustment'::"text", 'refund'::"text"])))
);


ALTER TABLE "public"."contractor_account_movements" OWNER TO "postgres";


ALTER TABLE "public"."contractor_account_movements" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."contractor_account_movements_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."contractors" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "specialty" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contractors" OWNER TO "postgres";


ALTER TABLE "public"."contractors" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."contractors_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."delivery_documents" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" bigint,
    "delivery_document_number" "text",
    "generated_by" "uuid" DEFAULT "gen_random_uuid"(),
    "client_name" "text",
    "client_email" "text",
    "signed_document_url" "text",
    "signature_status" "text",
    "signed_at" timestamp with time zone,
    "delivery_notes" "text",
    "warranty_start_date" "date",
    "warranty_end_date" "date"
);


ALTER TABLE "public"."delivery_documents" OWNER TO "postgres";


ALTER TABLE "public"."delivery_documents" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."delivery_documents_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" bigint,
    "name" "text",
    "type" "text",
    "file_url" "text",
    "category" "text",
    "visibility" "text",
    "is_client_visible" boolean DEFAULT false NOT NULL,
    "document_type" "text",
    "bucket_id" "text",
    "storage_path" "text",
    "file_name" "text",
    "mime_type" "text"
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


ALTER TABLE "public"."documents" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."documents_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."engineering_quotes" (
    "id" bigint NOT NULL,
    "quote_number" "text",
    "client_id" bigint,
    "client_project_id" bigint,
    "version" integer DEFAULT 1 NOT NULL,
    "version_letter" "text" DEFAULT 'A'::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "attention_to" "text",
    "project_name" "text",
    "intro_text" "text",
    "selected_systems" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "deliverables" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "requirements" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "commercial_terms" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "delivery_time" "text",
    "total_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "parent_quote_id" bigint,
    "is_latest" boolean DEFAULT true NOT NULL,
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."engineering_quotes" OWNER TO "postgres";


ALTER TABLE "public"."engineering_quotes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."engineering_quotes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."fiscal_document_email_logs" (
    "id" bigint NOT NULL,
    "document_type" "text" NOT NULL,
    "document_id" bigint NOT NULL,
    "document_uuid" "text",
    "to_email" "text" NOT NULL,
    "cc_email" "text",
    "subject" "text" NOT NULL,
    "message" "text",
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "resend_email_id" "text",
    "error_message" "text",
    "sent_by" "uuid",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fiscal_document_email_logs_document_type_check" CHECK (("document_type" = ANY (ARRAY['invoice'::"text", 'payment_complement'::"text"]))),
    CONSTRAINT "fiscal_document_email_logs_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."fiscal_document_email_logs" OWNER TO "postgres";


ALTER TABLE "public"."fiscal_document_email_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fiscal_document_email_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."fiscal_regime_catalog" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "applies_to_person_type" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "fiscal_regime_catalog_applies_to_person_type_check" CHECK (("applies_to_person_type" = ANY (ARRAY['physical'::"text", 'moral'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."fiscal_regime_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."installation_evidences" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "installation_order_id" bigint,
    "uploaded_by" "uuid" DEFAULT "gen_random_uuid"(),
    "title" "text",
    "description" "text",
    "file_url" "text",
    "evidence_type" "text",
    "visible_to_client" boolean
);


ALTER TABLE "public"."installation_evidences" OWNER TO "postgres";


ALTER TABLE "public"."installation_evidences" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."installation_evidences_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."installation_orders" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" bigint,
    "subcontractor_id" bigint,
    "installation_order_number" "text",
    "status" "text",
    "assigned_by" "uuid" DEFAULT "gen_random_uuid"(),
    "approved_budget" numeric,
    "advance_payment" numeric,
    "final_payment" numeric,
    "total_installation_cost" numeric,
    "scope_of_work" "text",
    "internal_notes" "text",
    "subcontractor_notes" "text",
    "requires_nda" boolean,
    "nda_signed" boolean,
    "nda_signed_at" timestamp with time zone,
    "start_date" "date",
    "estimated_completion_date" "date",
    "actual_completion_date" "date",
    "released_by" "uuid" DEFAULT "gen_random_uuid"(),
    "released_at" timestamp with time zone
);


ALTER TABLE "public"."installation_orders" OWNER TO "postgres";


ALTER TABLE "public"."installation_orders" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."installation_orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."installation_release_request" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "installation_order_id" bigint,
    "requested_by" "uuid" DEFAULT "gen_random_uuid"(),
    "status" "text",
    "request_notes" "text",
    "reviewed_by" "uuid" DEFAULT "gen_random_uuid"(),
    "review_notes" "text",
    "requested_at" timestamp with time zone,
    "reviewed_at" timestamp with time zone
);


ALTER TABLE "public"."installation_release_request" OWNER TO "postgres";


ALTER TABLE "public"."installation_release_request" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."installation_release_request_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."invoice_email_logs" (
    "id" bigint NOT NULL,
    "invoice_id" bigint NOT NULL,
    "to_email" "text" NOT NULL,
    "cc_email" "text",
    "subject" "text" NOT NULL,
    "message" "text",
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "resend_email_id" "text",
    "error_message" "text",
    "sent_by" "uuid",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "invoice_email_logs_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."invoice_email_logs" OWNER TO "postgres";


ALTER TABLE "public"."invoice_email_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."invoice_email_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."labor_activity_catalog" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "default_unit" "text" DEFAULT 'pieza'::"text" NOT NULL,
    "default_internal_cost_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "default_sale_price_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "category" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."labor_activity_catalog" OWNER TO "postgres";


ALTER TABLE "public"."labor_activity_catalog" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."labor_activity_catalog_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "customer_type" "text" NOT NULL,
    "company" "text",
    "phone" "text" NOT NULL,
    "service" "text" NOT NULL,
    "message" "text",
    "source" "text" DEFAULT 'Landing Web'::"text" NOT NULL,
    "status" "text" DEFAULT 'nuevo'::"text" NOT NULL,
    "raw_payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "interest" "text",
    "budget_range" "text",
    "timeline" "text",
    "client_id" bigint,
    CONSTRAINT "leads_customer_type_check" CHECK (("customer_type" = ANY (ARRAY['residencial'::"text", 'comercial'::"text", 'corporativo'::"text", 'industrial'::"text"]))),
    CONSTRAINT "leads_source_check" CHECK (("source" = ANY (ARRAY['Landing Web'::"text", 'Referido'::"text", 'LinkedIn'::"text", 'Google'::"text", 'Prospectación Directa'::"text", 'Cliente Existente'::"text"]))),
    CONSTRAINT "leads_status_check" CHECK (("status" = ANY (ARRAY['nuevo'::"text", 'contactado'::"text", 'calificado'::"text", 'convertido'::"text", 'descartado'::"text"])))
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


ALTER TABLE "public"."leads" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."leads_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."notification_events" (
    "id" bigint NOT NULL,
    "event_type" "text" NOT NULL,
    "client_project_id" bigint,
    "title" "text",
    "message" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "provider_response" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_events" OWNER TO "postgres";


ALTER TABLE "public"."notification_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."notification_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."notification_recipients" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "channel" "text" DEFAULT 'whatsapp'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_recipients" OWNER TO "postgres";


ALTER TABLE "public"."notification_recipients" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."notification_recipients_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."payment_reminders" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_id" bigint,
    "project_id" bigint,
    "reminder_status" "text",
    "reminder_type" "text",
    "schedule_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "recipient_email" "text",
    "message" "text"
);


ALTER TABLE "public"."payment_reminders" OWNER TO "postgres";


ALTER TABLE "public"."payment_reminders" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."payment_reminders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" bigint,
    "payment_type" "text",
    "payment_status" "text",
    "concept" "text",
    "amount" numeric,
    "currency" "text",
    "due_date" "date",
    "paid_at" timestamp with time zone,
    "payment_method" "text",
    "payment_reference" "text",
    "payment_link" "text",
    "notes" "text",
    "created_by" "uuid" DEFAULT "gen_random_uuid"()
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


ALTER TABLE "public"."payments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."payments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_categories" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_categories" OWNER TO "postgres";


ALTER TABLE "public"."product_categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."product_categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_tag_assignments" (
    "product_id" bigint NOT NULL,
    "tag_id" bigint NOT NULL
);


ALTER TABLE "public"."product_tag_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_tags" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_tags" OWNER TO "postgres";


ALTER TABLE "public"."product_tags" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."product_tags_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sku" "text",
    "brand" "text",
    "model" "text",
    "name" "text",
    "description" "text",
    "image_url" "text",
    "category" "text",
    "supplier" "text",
    "cost_price" numeric,
    "cost_currency" "text",
    "public_price" numeric,
    "sale_currency" "text",
    "sat_product_key" "text",
    "sat_unit_key" "text",
    "unit_name" "text",
    "tax_rate" numeric,
    "is_active" boolean,
    "labor_unit_cost" numeric,
    "labor_sale_multiplier" numeric,
    "labor_unit_sale_price" numeric,
    "pricing_method" "text",
    "target_margin" numeric,
    "calculated_sale_price" numeric,
    "category_id" bigint,
    "is_favorite" boolean DEFAULT false NOT NULL,
    "partner_discount_eligible" boolean DEFAULT true NOT NULL,
    "sat_product_service_code" "text",
    "sat_unit_code" "text",
    "sat_unit_name" "text",
    "fiscal_object" "text" DEFAULT '02'::"text" NOT NULL,
    "fiscal_description" "text"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


ALTER TABLE "public"."products" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_deliveries" (
    "id" bigint NOT NULL,
    "client_project_id" bigint NOT NULL,
    "delivery_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "delivered_to_name" "text" NOT NULL,
    "delivered_to_role" "text",
    "delivered_by_name" "text",
    "observations" "text",
    "client_signature_image_url" "text",
    "alfa_signature_image_url" "text",
    "pdf_url" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "delivery_email_sent_at" timestamp with time zone,
    "delivery_email_sent_to" "text",
    "delivery_email_status" "text",
    "delivery_email_error" "text",
    CONSTRAINT "project_deliveries_email_status_check" CHECK ((("delivery_email_status" IS NULL) OR ("delivery_email_status" = ANY (ARRAY['sent'::"text", 'error'::"text"])))),
    CONSTRAINT "project_deliveries_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'delivered'::"text", 'accepted'::"text"])))
);


ALTER TABLE "public"."project_deliveries" OWNER TO "postgres";


ALTER TABLE "public"."project_deliveries" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_deliveries_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_delivery_email_history" (
    "id" bigint NOT NULL,
    "project_delivery_id" bigint NOT NULL,
    "sent_to" "text" NOT NULL,
    "cc" "text",
    "subject" "text" NOT NULL,
    "body_html" "text" NOT NULL,
    "attachment_names" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "text" NOT NULL,
    "error_message" "text",
    "resend_response" "jsonb",
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_user_id" "uuid",
    CONSTRAINT "project_delivery_email_history_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."project_delivery_email_history" OWNER TO "postgres";


ALTER TABLE "public"."project_delivery_email_history" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_delivery_email_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_delivery_evidences" (
    "id" bigint NOT NULL,
    "project_delivery_id" bigint NOT NULL,
    "file_url" "text" NOT NULL,
    "caption" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "file_path" "text",
    "file_name" "text",
    "file_type" "text",
    "file_size" bigint,
    "uploaded_by" "uuid"
);


ALTER TABLE "public"."project_delivery_evidences" OWNER TO "postgres";


ALTER TABLE "public"."project_delivery_evidences" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_delivery_evidences_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_delivery_pending_items" (
    "id" bigint NOT NULL,
    "project_delivery_id" bigint NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_delivery_pending_items_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."project_delivery_pending_items" OWNER TO "postgres";


ALTER TABLE "public"."project_delivery_pending_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_delivery_pending_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_delivery_systems" (
    "id" bigint NOT NULL,
    "project_delivery_id" bigint NOT NULL,
    "system_name" "text" NOT NULL,
    "delivered" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_delivery_systems" OWNER TO "postgres";


ALTER TABLE "public"."project_delivery_systems" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_delivery_systems_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE SEQUENCE IF NOT EXISTS "public"."project_invoice_internal_folio_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."project_invoice_internal_folio_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_invoice_items" (
    "id" bigint NOT NULL,
    "project_invoice_id" bigint NOT NULL,
    "source_quote_item_id" bigint,
    "product_id" bigint,
    "description" "text" NOT NULL,
    "quantity" numeric(14,4) DEFAULT 1 NOT NULL,
    "unit_price_mxn" numeric(14,2) NOT NULL,
    "subtotal_mxn" numeric(14,2) NOT NULL,
    "iva_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "total_mxn" numeric(14,2) NOT NULL,
    "sat_product_service_code" "text" NOT NULL,
    "sat_unit_code" "text" NOT NULL,
    "sat_unit_name" "text" NOT NULL,
    "fiscal_object" "text" DEFAULT '02'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "gross_amount_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "discount_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "net_amount_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    CONSTRAINT "project_invoice_items_discount_mxn_check" CHECK (("discount_mxn" >= (0)::numeric)),
    CONSTRAINT "project_invoice_items_gross_amount_mxn_check" CHECK (("gross_amount_mxn" >= (0)::numeric)),
    CONSTRAINT "project_invoice_items_iva_mxn_check" CHECK (("iva_mxn" >= (0)::numeric)),
    CONSTRAINT "project_invoice_items_net_amount_mxn_check" CHECK (("net_amount_mxn" >= (0)::numeric)),
    CONSTRAINT "project_invoice_items_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "project_invoice_items_subtotal_mxn_check" CHECK (("subtotal_mxn" >= (0)::numeric)),
    CONSTRAINT "project_invoice_items_total_mxn_check" CHECK (("total_mxn" >= (0)::numeric)),
    CONSTRAINT "project_invoice_items_unit_price_mxn_check" CHECK (("unit_price_mxn" >= (0)::numeric))
);


ALTER TABLE "public"."project_invoice_items" OWNER TO "postgres";


ALTER TABLE "public"."project_invoice_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_invoice_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_invoices" (
    "id" bigint NOT NULL,
    "internal_folio" "text" DEFAULT "public"."next_project_invoice_internal_folio"() NOT NULL,
    "client_project_id" bigint NOT NULL,
    "client_id" bigint NOT NULL,
    "invoice_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "subtotal" numeric(14,2) DEFAULT 0 NOT NULL,
    "iva" numeric(14,2) DEFAULT 0 NOT NULL,
    "total" numeric(14,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'MXN'::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "xml_url" "text",
    "pdf_url" "text",
    "sat_uuid" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subtotal_mxn" numeric(14,2),
    "iva_mxn" numeric(14,2),
    "total_mxn" numeric(14,2),
    "facturama_id" "text",
    "source_type" "text" DEFAULT 'manual'::"text",
    "source_quote_id" bigint,
    "source_service_report_id" bigint,
    "last_error" "text",
    "facturama_response" "jsonb",
    "payment_method_code" "text" DEFAULT 'PUE'::"text" NOT NULL,
    "payment_form_code" "text" DEFAULT '03'::"text" NOT NULL,
    "requires_payment_complement" boolean DEFAULT false NOT NULL,
    "payment_complement_status" "text" DEFAULT 'not_required'::"text" NOT NULL,
    "discount_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "taxable_subtotal_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    CONSTRAINT "project_invoices_currency_check" CHECK (("currency" = ANY (ARRAY['MXN'::"text", 'USD'::"text"]))),
    CONSTRAINT "project_invoices_discount_mxn_check" CHECK (("discount_mxn" >= (0)::numeric)),
    CONSTRAINT "project_invoices_iva_check" CHECK (("iva" >= (0)::numeric)),
    CONSTRAINT "project_invoices_payment_complement_rule_check" CHECK (((("payment_method_code" = 'PPD'::"text") AND ("requires_payment_complement" = true) AND ("payment_complement_status" = ANY (ARRAY['pending'::"text", 'partial'::"text", 'completed'::"text"]))) OR (("payment_method_code" = 'PUE'::"text") AND ("requires_payment_complement" = false) AND ("payment_complement_status" = 'not_required'::"text")))),
    CONSTRAINT "project_invoices_payment_complement_status_check" CHECK (("payment_complement_status" = ANY (ARRAY['not_required'::"text", 'pending'::"text", 'partial'::"text", 'completed'::"text"]))),
    CONSTRAINT "project_invoices_payment_method_code_check" CHECK (("payment_method_code" = ANY (ARRAY['PUE'::"text", 'PPD'::"text"]))),
    CONSTRAINT "project_invoices_ppd_payment_form_check" CHECK (((("payment_method_code" = 'PPD'::"text") AND ("payment_form_code" = '99'::"text")) OR ("payment_method_code" = 'PUE'::"text"))),
    CONSTRAINT "project_invoices_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'issued'::"text", 'cancelled'::"text", 'paid'::"text"]))),
    CONSTRAINT "project_invoices_subtotal_check" CHECK (("subtotal" >= (0)::numeric)),
    CONSTRAINT "project_invoices_taxable_subtotal_mxn_check" CHECK (("taxable_subtotal_mxn" >= (0)::numeric)),
    CONSTRAINT "project_invoices_total_check" CHECK (("total" >= (0)::numeric))
);


ALTER TABLE "public"."project_invoices" OWNER TO "postgres";


ALTER TABLE "public"."project_invoices" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_invoices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_material_deliveries" (
    "id" bigint NOT NULL,
    "client_project_id" bigint NOT NULL,
    "delivered_to_name" "text" NOT NULL,
    "delivered_to_phone" "text",
    "delivered_by_name" "text",
    "delivery_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "notes" "text",
    "evidence_photo_url" "text" NOT NULL,
    "signature_image_url" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_material_deliveries" OWNER TO "postgres";


ALTER TABLE "public"."project_material_deliveries" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_material_deliveries_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_material_delivery_items" (
    "id" bigint NOT NULL,
    "delivery_id" bigint NOT NULL,
    "project_purchase_line_id" bigint,
    "product_brand" "text",
    "product_model" "text",
    "product_name" "text",
    "quantity_delivered" numeric(14,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_material_delivery_items_quantity_delivered_check" CHECK (("quantity_delivered" > (0)::numeric))
);


ALTER TABLE "public"."project_material_delivery_items" OWNER TO "postgres";


ALTER TABLE "public"."project_material_delivery_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_material_delivery_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_members" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" bigint,
    "user_id" "uuid" DEFAULT "gen_random_uuid"(),
    "role_in_project" "text",
    "access_status" "text",
    "access_starts_at" timestamp with time zone,
    "access_ends_at" timestamp with time zone
);


ALTER TABLE "public"."project_members" OWNER TO "postgres";


ALTER TABLE "public"."project_members" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_members_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_operational_item_labor_activities" (
    "id" bigint NOT NULL,
    "project_operational_item_id" bigint NOT NULL,
    "source_quote_item_labor_activity_id" bigint,
    "labor_activity_id" bigint,
    "name_snapshot" "text" NOT NULL,
    "quantity" numeric(14,2) DEFAULT 1 NOT NULL,
    "unit" "text" DEFAULT 'pieza'::"text" NOT NULL,
    "internal_unit_cost_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "sale_unit_price_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "internal_total_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "sale_total_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "assigned_contractor_id" bigint,
    "work_order_id" bigint,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_operational_item_labor_activities_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'assigned'::"text", 'in_progress'::"text", 'completed'::"text", 'validated'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."project_operational_item_labor_activities" OWNER TO "postgres";


ALTER TABLE "public"."project_operational_item_labor_activities" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_operational_item_labor_activities_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_operational_items" (
    "id" bigint NOT NULL,
    "client_project_id" bigint NOT NULL,
    "source_quote_id" bigint,
    "source_quote_item_id" bigint,
    "system_name" "text",
    "product_id" bigint,
    "product_brand" "text",
    "product_model" "text",
    "product_name" "text",
    "product_image_url" "text",
    "quantity" numeric(14,2) DEFAULT 0 NOT NULL,
    "original_quantity" numeric(14,2) DEFAULT 0 NOT NULL,
    "original_unit_cost" numeric(14,2) DEFAULT 0 NOT NULL,
    "operational_unit_cost" numeric(14,2) DEFAULT 0 NOT NULL,
    "cost_currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "exchange_rate" numeric(14,4),
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "change_origin" "text" DEFAULT 'quote_seed'::"text" NOT NULL,
    "created_by_user_id" "uuid",
    "updated_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_operational_items_change_origin_check" CHECK (("change_origin" = ANY (ARRAY['quote_seed'::"text", 'translation'::"text", 'commercial_change'::"text", 'manual'::"text"]))),
    CONSTRAINT "project_operational_items_cost_currency_check" CHECK (("cost_currency" = ANY (ARRAY['USD'::"text", 'MXN'::"text"]))),
    CONSTRAINT "project_operational_items_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'locked'::"text", 'purchased'::"text", 'partially_purchased'::"text", 'delivered'::"text", 'pending_director_approval'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."project_operational_items" OWNER TO "postgres";


ALTER TABLE "public"."project_operational_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_operational_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_payment_audit_log" (
    "id" bigint NOT NULL,
    "project_payment_id" bigint NOT NULL,
    "changed_by_user_id" "uuid",
    "old_values" "jsonb" NOT NULL,
    "new_values" "jsonb" NOT NULL,
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_payment_audit_log" OWNER TO "postgres";


ALTER TABLE "public"."project_payment_audit_log" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_payment_audit_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_payment_complements" (
    "id" bigint NOT NULL,
    "project_invoice_id" bigint NOT NULL,
    "project_payment_id" bigint,
    "client_project_id" bigint NOT NULL,
    "client_id" bigint NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "complement_env" "text" DEFAULT 'sandbox'::"text" NOT NULL,
    "partiality_number" integer NOT NULL,
    "previous_balance_mxn" numeric(14,2) NOT NULL,
    "amount_paid_mxn" numeric(14,2) NOT NULL,
    "outstanding_balance_mxn" numeric(14,2) NOT NULL,
    "payment_date" "date" NOT NULL,
    "payment_form_code" "text" NOT NULL,
    "currency" "text" DEFAULT 'MXN'::"text" NOT NULL,
    "exchange_rate" numeric(14,6),
    "payment_reference" "text",
    "payload_preview" "jsonb" NOT NULL,
    "facturama_id" "text",
    "sat_uuid" "text",
    "facturama_response" "jsonb",
    "last_error" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "paid_amount_mxn" numeric(14,2) NOT NULL,
    "source_payment_amount_mxn" numeric(14,2),
    "manual_amount_override" boolean DEFAULT false NOT NULL,
    "manual_override_reason" "text",
    "pdf_url" "text",
    "xml_url" "text",
    "issued_by_user_id" "uuid",
    "issued_at" timestamp with time zone,
    CONSTRAINT "project_payment_complements_amount_paid_mxn_check" CHECK (("amount_paid_mxn" > (0)::numeric)),
    CONSTRAINT "project_payment_complements_balance_check" CHECK (("round"(("previous_balance_mxn" - "paid_amount_mxn"), 2) = "outstanding_balance_mxn")),
    CONSTRAINT "project_payment_complements_currency_check" CHECK (("currency" = 'MXN'::"text")),
    CONSTRAINT "project_payment_complements_env_check" CHECK (("complement_env" = ANY (ARRAY['sandbox'::"text", 'production'::"text"]))),
    CONSTRAINT "project_payment_complements_outstanding_balance_mxn_check" CHECK (("outstanding_balance_mxn" >= (0)::numeric)),
    CONSTRAINT "project_payment_complements_override_reason_check" CHECK ((("manual_amount_override" = false) OR (NULLIF(TRIM(BOTH FROM COALESCE("manual_override_reason", ''::"text")), ''::"text") IS NOT NULL))),
    CONSTRAINT "project_payment_complements_partiality_number_check" CHECK (("partiality_number" > 0)),
    CONSTRAINT "project_payment_complements_previous_balance_mxn_check" CHECK (("previous_balance_mxn" >= (0)::numeric)),
    CONSTRAINT "project_payment_complements_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'validated'::"text", 'issued'::"text", 'stamped'::"text", 'cancelled'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."project_payment_complements" OWNER TO "postgres";


ALTER TABLE "public"."project_payment_complements" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_payment_complements_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_payments" (
    "id" bigint NOT NULL,
    "client_project_id" bigint NOT NULL,
    "payment_date" "date" NOT NULL,
    "payment_method" "text",
    "payment_reference" "text",
    "payment_category" "text" NOT NULL,
    "currency" "text" NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "exchange_rate" numeric(14,4),
    "amount_mxn" numeric(14,2),
    "notes" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_form_code" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "project_payments_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "project_payments_currency_check" CHECK (("currency" = ANY (ARRAY['USD'::"text", 'MXN'::"text"]))),
    CONSTRAINT "project_payments_labor_mxn_check" CHECK ((("payment_category" <> 'labor'::"text") OR ("currency" = 'MXN'::"text"))),
    CONSTRAINT "project_payments_payment_category_check" CHECK (("payment_category" = ANY (ARRAY['equipment'::"text", 'labor'::"text"]))),
    CONSTRAINT "project_payments_usd_exchange_rate_check" CHECK ((("currency" <> 'USD'::"text") OR ("exchange_rate" IS NOT NULL)))
);


ALTER TABLE "public"."project_payments" OWNER TO "postgres";


ALTER TABLE "public"."project_payments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_payments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_photos" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" bigint,
    "title" "text",
    "image_url" "text"
);


ALTER TABLE "public"."project_photos" OWNER TO "postgres";


ALTER TABLE "public"."project_photos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_photos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE SEQUENCE IF NOT EXISTS "public"."project_profitability_report_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."project_profitability_report_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."project_profitability_reports" (
    "id" bigint NOT NULL,
    "client_project_id" bigint NOT NULL,
    "report_number" "text" DEFAULT "public"."next_project_profitability_report_number"() NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "generated_by_user_id" "uuid",
    "total_sold_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "equipment_purchase_total_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "work_orders_total_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "other_costs_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "operating_profit_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "operating_margin_percent" numeric(8,4) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "director_email_sent_at" timestamp with time zone,
    "director_email_sent_to" "text",
    "director_email_status" "text",
    "director_email_error" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_profitability_reports_director_email_status_check" CHECK ((("director_email_status" IS NULL) OR ("director_email_status" = ANY (ARRAY['sent'::"text", 'error'::"text"])))),
    CONSTRAINT "project_profitability_reports_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'generated'::"text", 'sent'::"text"])))
);


ALTER TABLE "public"."project_profitability_reports" OWNER TO "postgres";


ALTER TABLE "public"."project_profitability_reports" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_profitability_reports_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_purchase_events" (
    "id" bigint NOT NULL,
    "project_purchase_line_id" bigint NOT NULL,
    "purchase_date" "date" NOT NULL,
    "quantity" numeric(14,2) NOT NULL,
    "unit_cost" numeric(14,2) DEFAULT 0 NOT NULL,
    "cost_currency" "text" NOT NULL,
    "supplier" "text",
    "invoice_reference" "text",
    "warehouse_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "exchange_rate" numeric(14,4),
    CONSTRAINT "project_purchase_events_cost_currency_check" CHECK (("cost_currency" = ANY (ARRAY['USD'::"text", 'MXN'::"text"]))),
    CONSTRAINT "project_purchase_events_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "project_purchase_events_warehouse_status_check" CHECK (("warehouse_status" = ANY (ARRAY['pending'::"text", 'received'::"text", 'delivered_to_site'::"text"])))
);


ALTER TABLE "public"."project_purchase_events" OWNER TO "postgres";


ALTER TABLE "public"."project_purchase_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_purchase_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_purchase_lines" (
    "id" bigint NOT NULL,
    "client_project_id" bigint NOT NULL,
    "quote_item_id" bigint,
    "product_id" bigint,
    "supplier" "text",
    "product_brand" "text",
    "product_model" "text",
    "product_name" "text",
    "quantity_required" numeric(14,2) DEFAULT 0 NOT NULL,
    "quantity_purchased" numeric(14,2) DEFAULT 0 NOT NULL,
    "cost_currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "unit_cost" numeric(14,2) DEFAULT 0 NOT NULL,
    "total_required_cost" numeric(14,2) DEFAULT 0 NOT NULL,
    "total_purchased_cost" numeric(14,2) DEFAULT 0 NOT NULL,
    "total_pending_cost" numeric(14,2) DEFAULT 0 NOT NULL,
    "purchase_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_operational_item_id" bigint,
    CONSTRAINT "project_purchase_lines_cost_currency_check" CHECK (("cost_currency" = ANY (ARRAY['USD'::"text", 'MXN'::"text"]))),
    CONSTRAINT "project_purchase_lines_purchase_status_check" CHECK (("purchase_status" = ANY (ARRAY['pending'::"text", 'partial'::"text", 'purchased'::"text", 'in_warehouse'::"text", 'delivered_to_site'::"text"])))
);


ALTER TABLE "public"."project_purchase_lines" OWNER TO "postgres";


ALTER TABLE "public"."project_purchase_lines" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_purchase_lines_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_site_visit_note_photos" (
    "id" bigint NOT NULL,
    "project_site_visit_note_id" bigint NOT NULL,
    "image_url" "text" NOT NULL,
    "caption" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_site_visit_note_photos" OWNER TO "postgres";


ALTER TABLE "public"."project_site_visit_note_photos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_site_visit_note_photos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_site_visit_notes" (
    "id" bigint NOT NULL,
    "project_site_visit_id" bigint NOT NULL,
    "note_text" "text" NOT NULL,
    "informed_to" "text",
    "commitment_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_site_visit_notes" OWNER TO "postgres";


ALTER TABLE "public"."project_site_visit_notes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_site_visit_notes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_site_visits" (
    "id" bigint NOT NULL,
    "client_project_id" bigint NOT NULL,
    "created_by_user_id" "uuid",
    "visit_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "title" "text" NOT NULL,
    "general_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."project_site_visits" OWNER TO "postgres";


ALTER TABLE "public"."project_site_visits" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_site_visits_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_translation_changes" (
    "id" bigint NOT NULL,
    "client_project_id" bigint NOT NULL,
    "operational_item_id" bigint,
    "change_type" "text" NOT NULL,
    "old_product_name" "text",
    "new_product_name" "text",
    "old_quantity" numeric(14,2),
    "new_quantity" numeric(14,2),
    "old_unit_cost" numeric(14,2),
    "new_unit_cost" numeric(14,2),
    "cost_difference" numeric(14,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_translation_changes_change_type_check" CHECK (("change_type" = ANY (ARRAY['substitute'::"text", 'quantity_change'::"text", 'add'::"text", 'delete'::"text"])))
);


ALTER TABLE "public"."project_translation_changes" OWNER TO "postgres";


ALTER TABLE "public"."project_translation_changes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_translation_changes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_updates" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" bigint,
    "title" "text",
    "description" "text",
    "status" "text",
    "created_by" "uuid" DEFAULT "gen_random_uuid"()
);


ALTER TABLE "public"."project_updates" OWNER TO "postgres";


ALTER TABLE "public"."project_updates" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_updates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_warranties" (
    "id" bigint NOT NULL,
    "client_project_id" bigint NOT NULL,
    "warranty_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "installed_systems" "text" NOT NULL,
    "equipment_warranty_months" integer DEFAULT 12 NOT NULL,
    "equipment_warranty_start_date" "date" NOT NULL,
    "equipment_warranty_end_date" "date" NOT NULL,
    "installation_warranty_months" integer DEFAULT 12 NOT NULL,
    "installation_warranty_start_date" "date" NOT NULL,
    "installation_warranty_end_date" "date" NOT NULL,
    "preventive_maintenance_required" boolean DEFAULT false NOT NULL,
    "preventive_maintenance_frequency_months" integer,
    "preventive_maintenance_cost_mxn" numeric(14,2),
    "warranty_management_included_until" "date",
    "warranty_management_requires_contract_after" boolean DEFAULT true NOT NULL,
    "maintenance_policy_active" boolean DEFAULT false NOT NULL,
    "maintenance_policy_reference" "text",
    "support_email" "text" NOT NULL,
    "alfa_representative_name" "text" NOT NULL,
    "status" "text" DEFAULT 'issued'::"text" NOT NULL,
    "pdf_url" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_warranties_equipment_warranty_months_check" CHECK (("equipment_warranty_months" >= 0)),
    CONSTRAINT "project_warranties_installation_warranty_months_check" CHECK (("installation_warranty_months" >= 0)),
    CONSTRAINT "project_warranties_preventive_maintenance_cost_mxn_check" CHECK ((("preventive_maintenance_cost_mxn" IS NULL) OR ("preventive_maintenance_cost_mxn" >= (0)::numeric))),
    CONSTRAINT "project_warranties_preventive_maintenance_frequency_month_check" CHECK ((("preventive_maintenance_frequency_months" IS NULL) OR ("preventive_maintenance_frequency_months" > 0))),
    CONSTRAINT "project_warranties_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'issued'::"text"])))
);


ALTER TABLE "public"."project_warranties" OWNER TO "postgres";


ALTER TABLE "public"."project_warranties" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."project_warranties_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."public_document_access_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "public_document_link_id" bigint NOT NULL,
    "accessed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_hash" "text",
    "user_agent" "text",
    "result" "text" NOT NULL,
    "request_id" "text"
);


ALTER TABLE "public"."public_document_access_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."public_document_links" (
    "id" bigint NOT NULL,
    "token" "text" NOT NULL,
    "document_type" "text" NOT NULL,
    "client_project_id" bigint,
    "project_delivery_id" bigint,
    "project_warranty_id" bigint,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quote_id" bigint,
    "document_id" bigint,
    "project_invoice_id" bigint,
    "file_format" "text",
    "revoked_at" timestamp with time zone,
    "revoked_by_user_id" "uuid",
    "access_count" integer DEFAULT 0 NOT NULL,
    "last_accessed_at" timestamp with time zone,
    CONSTRAINT "public_document_links_document_type_check" CHECK (("document_type" = ANY (ARRAY['project_delivery'::"text", 'project_warranty'::"text", 'approved_quote'::"text", 'authorized_plan'::"text", 'project_invoice_pdf'::"text", 'project_invoice_xml'::"text"])))
);


ALTER TABLE "public"."public_document_links" OWNER TO "postgres";


ALTER TABLE "public"."public_document_links" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."public_document_links_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."purchase_order_items" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "purchase_order_id" bigint,
    "quote_item_id" bigint,
    "category" "text",
    "brand" "text",
    "model" "text",
    "description" "text",
    "supplier" "text",
    "quantity" numeric,
    "quoted_cost_unit_price" numeric,
    "actual_cost_unit_price" numeric,
    "currency" "text",
    "subtotal_quoted_cost" numeric,
    "subtotal_actual_cost" numeric,
    "cost_variation" numeric,
    "received_quantity" numeric,
    "pending_quantity" numeric,
    "status" "text",
    "notes" "text"
);


ALTER TABLE "public"."purchase_order_items" OWNER TO "postgres";


ALTER TABLE "public"."purchase_order_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."purchase_order_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."purchase_orders" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "project_id" bigint,
    "quote_id" bigint,
    "supplier_name" "text",
    "purchase_order_numer" "text",
    "status" "text",
    "requested_by" "uuid" DEFAULT "gen_random_uuid"(),
    "approved_by" "uuid" DEFAULT "gen_random_uuid"(),
    "subtotal_cost" numeric,
    "tax_amount" numeric,
    "total_cost" numeric,
    "estimated_delivery_date" "date",
    "actual_delivery_date" "date",
    "notes" "text"
);


ALTER TABLE "public"."purchase_orders" OWNER TO "postgres";


ALTER TABLE "public"."purchase_orders" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."purchase_orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quote_approvals" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quote_id" bigint,
    "approved_by_name" "text",
    "approved_by_email" "text",
    "approval_status" "text",
    "approved_at" timestamp with time zone,
    "signature_url" "text",
    "notes" "text"
);


ALTER TABLE "public"."quote_approvals" OWNER TO "postgres";


ALTER TABLE "public"."quote_approvals" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quote_approvals_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quote_groups" (
    "id" bigint NOT NULL,
    "base_number" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_quote_id" bigint
);


ALTER TABLE "public"."quote_groups" OWNER TO "postgres";


ALTER TABLE "public"."quote_groups" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quote_groups_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quote_item_labor_activities" (
    "id" bigint NOT NULL,
    "quote_item_id" bigint NOT NULL,
    "labor_activity_id" bigint,
    "name_snapshot" "text" NOT NULL,
    "quantity" numeric(14,2) DEFAULT 1 NOT NULL,
    "unit" "text" DEFAULT 'pieza'::"text" NOT NULL,
    "internal_unit_cost_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "sale_unit_price_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "internal_total_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "sale_total_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "assigned_role" "text",
    "notes" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quote_item_labor_activities" OWNER TO "postgres";


ALTER TABLE "public"."quote_item_labor_activities" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quote_item_labor_activities_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quote_items" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quote_id" bigint,
    "quote_section_id" bigint,
    "category" "text",
    "brand" "text",
    "model" "text",
    "description" "text",
    "image_url" "text",
    "supplier" "text",
    "quantity" numeric,
    "cost_unit_price" numeric,
    "cost_currency" "text",
    "margin_type" "text",
    "margin_value" numeric,
    "public_unit_price" numeric,
    "sale_unit_price" numeric,
    "sale_currency" "text",
    "subtotal_cost" numeric,
    "subtotal_sale" numeric,
    "estimated_profit" numeric,
    "sort_order" bigint,
    "product_id" bigint,
    "labor_unit_cost" numeric,
    "labor_sale_multiplier" numeric,
    "labor_unit_sale_price" numeric,
    "labor_subtotal_cost" numeric,
    "labor_subtotal_sale" numeric,
    "labor_profit" numeric,
    "unit_equipment_price" numeric(14,2) DEFAULT 0 NOT NULL,
    "unit_labor_price" numeric(14,2) DEFAULT 0 NOT NULL,
    "equipment_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "labor_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "line_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "product_brand" "text",
    "product_model" "text",
    "product_name" "text",
    "product_image_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "unit_equipment_price_usd" numeric(14,2),
    "equipment_total_usd" numeric(14,2),
    "invoice_description_snapshot" "text"
);


ALTER TABLE "public"."quote_items" OWNER TO "postgres";


ALTER TABLE "public"."quote_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quote_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quote_sections" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "description" "text",
    "sort_order" bigint,
    "subtotal_usd" numeric,
    "subtotal_mxn" numeric,
    "quotes_id" bigint,
    "quote_id" bigint NOT NULL,
    "equipment_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "labor_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "total" numeric(14,2) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quote_sections" OWNER TO "postgres";


ALTER TABLE "public"."quote_sections" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quote_sections_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quote_terms_settings" (
    "id" bigint NOT NULL,
    "quote_id" bigint,
    "payment_100_equipment" boolean DEFAULT true NOT NULL,
    "labor_payment_mode" "text" DEFAULT '50_50'::"text" NOT NULL,
    "payment_100_advance" boolean DEFAULT false NOT NULL,
    "is_local_guadalajara" boolean DEFAULT true NOT NULL,
    "includes_travel_expenses" boolean DEFAULT false NOT NULL,
    "includes_conduit" boolean DEFAULT false NOT NULL,
    "includes_cabling" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."quote_terms_settings" OWNER TO "postgres";


ALTER TABLE "public"."quote_terms_settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quote_terms_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_id" bigint,
    "quote_number" "text",
    "status" "text",
    "exchange_rate" numeric,
    "equipment_total_usd" numeric,
    "equipment_total_mxn" numeric,
    "installation_total_mxn" numeric,
    "grand_total_mxn" numeric,
    "created_by" "uuid" DEFAULT "gen_random_uuid"(),
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "equipment_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "labor_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "tax_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "discount_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "grand_total" numeric(14,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "valid_until" "date",
    "version" integer DEFAULT 1 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "quote_group_id" bigint,
    "parent_quote_id" bigint,
    "quote_base_number" "text",
    "is_latest" boolean DEFAULT true NOT NULL,
    "client_project_id" bigint,
    "exchange_rate_source" "text",
    "exchange_rate_date" "date",
    "discount_type" "text" DEFAULT 'none'::"text" NOT NULL,
    "discount_percent" numeric(8,4) DEFAULT 0 NOT NULL,
    "discount_amount_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "subtotal_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "taxable_base_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "iva_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "total_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "includes_travel_expenses_detail" boolean DEFAULT false NOT NULL,
    "travel_fuel_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "travel_tolls_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "travel_food_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "travel_total_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "is_partner_quote" boolean DEFAULT false NOT NULL,
    "partner_equipment_discount_percent" numeric(8,4) DEFAULT 15 NOT NULL,
    "partner_labor_discount_percent" numeric(8,4) DEFAULT 25 NOT NULL,
    "partner_equipment_discount_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "partner_labor_discount_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "partner_total_discount_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "commercial_partner_id" bigint
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


ALTER TABLE "public"."quotes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."quotes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sat_payment_form_catalog" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."sat_payment_form_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sat_product_service_catalog" (
    "code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."sat_product_service_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sat_unit_catalog" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."sat_unit_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_report_email_history" (
    "id" bigint NOT NULL,
    "service_report_id" bigint NOT NULL,
    "sent_to" "text" NOT NULL,
    "cc" "text",
    "subject" "text" NOT NULL,
    "body_html" "text" NOT NULL,
    "attachment_names" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "status" "text" NOT NULL,
    "error_message" "text",
    "resend_response" "jsonb",
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_user_id" "uuid",
    CONSTRAINT "service_report_email_history_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'error'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."service_report_email_history" OWNER TO "postgres";


ALTER TABLE "public"."service_report_email_history" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."service_report_email_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."service_report_photos" (
    "id" bigint NOT NULL,
    "service_report_id" bigint NOT NULL,
    "image_url" "text" NOT NULL,
    "caption" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_report_photos" OWNER TO "postgres";


ALTER TABLE "public"."service_report_photos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."service_report_photos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."service_reports" (
    "id" bigint NOT NULL,
    "service_number" "text",
    "client_id" bigint,
    "client_project_id" bigint,
    "service_location" "text",
    "google_maps_url" "text",
    "performed_by_name" "text",
    "service_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "background" "text",
    "diagnosis" "text",
    "solution_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "solution_description" "text",
    "requires_parts" boolean DEFAULT false NOT NULL,
    "required_parts_notes" "text",
    "technician_cost_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "labor_sale_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "related_quote_id" bigint,
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "service_discount_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "service_discount_percent" numeric(8,4) DEFAULT 0 NOT NULL,
    "service_discount_type" "text" DEFAULT 'none'::"text" NOT NULL,
    "service_discount_reason" "text",
    "recommendations" "text",
    "completed_at" timestamp with time zone,
    "service_email_sent_at" timestamp with time zone,
    "service_email_sent_to" "text",
    "service_email_status" "text",
    "service_email_error" "text",
    CONSTRAINT "service_reports_email_status_check" CHECK ((("service_email_status" IS NULL) OR ("service_email_status" = ANY (ARRAY['sent'::"text", 'error'::"text"])))),
    CONSTRAINT "service_reports_service_discount_type_check" CHECK (("service_discount_type" = ANY (ARRAY['none'::"text", 'amount'::"text", 'percent'::"text"]))),
    CONSTRAINT "service_reports_solution_status_check" CHECK (("solution_status" = ANY (ARRAY['solved'::"text", 'not_solved'::"text", 'pending'::"text"]))),
    CONSTRAINT "service_reports_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."service_reports" OWNER TO "postgres";


ALTER TABLE "public"."service_reports" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."service_reports_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."subcontractors" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "company" "text",
    "email" "text",
    "phone" "text",
    "tax_id" "text",
    "status" "text"
);


ALTER TABLE "public"."subcontractors" OWNER TO "postgres";


ALTER TABLE "public"."subcontractors" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."subcontractors_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."tax_object_catalog" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."tax_object_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_order_activities" (
    "id" bigint NOT NULL,
    "work_order_id" bigint NOT NULL,
    "project_operational_item_labor_activity_id" bigint,
    "system_name" "text",
    "product_brand" "text",
    "product_model" "text",
    "product_name" "text",
    "activity_name" "text",
    "quantity_assigned" numeric(14,2) DEFAULT 0 NOT NULL,
    "quantity_completed" numeric(14,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "completion_notes" "text",
    "evidence_photo_url" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "work_order_activities_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'validated'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."work_order_activities" OWNER TO "postgres";


ALTER TABLE "public"."work_order_activities" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."work_order_activities_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."work_orders" (
    "id" bigint NOT NULL,
    "client_project_id" bigint NOT NULL,
    "work_order_number" "text",
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "assigned_to_name" "text",
    "assigned_to_phone" "text",
    "scheduled_start" "date",
    "scheduled_end" "date",
    "notes" "text",
    "created_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "contractor_id" bigint,
    "contractor_amount_mxn" numeric(14,2) DEFAULT 0 NOT NULL,
    "contractor_payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    CONSTRAINT "work_orders_contractor_payment_status_check" CHECK (("contractor_payment_status" = ANY (ARRAY['pending'::"text", 'applied_to_balance'::"text", 'paid_direct'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "work_orders_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'assigned'::"text", 'in_progress'::"text", 'completed'::"text", 'validated'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."work_orders" OWNER TO "postgres";


ALTER TABLE "public"."work_orders" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."work_orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."client_portal_project_access" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."client_portal_project_access_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."client_portal_users" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."client_portal_users_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."commercial_partners" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."commercial_partners_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "Projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cfdi_use_catalog"
    ADD CONSTRAINT "cfdi_use_catalog_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."client_portal_project_access"
    ADD CONSTRAINT "client_portal_project_access_client_portal_user_id_client_p_key" UNIQUE ("client_portal_user_id", "client_project_id");



ALTER TABLE ONLY "public"."client_portal_project_access"
    ADD CONSTRAINT "client_portal_project_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_portal_users"
    ADD CONSTRAINT "client_portal_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_portal_users"
    ADD CONSTRAINT "client_portal_users_user_id_client_id_key" UNIQUE ("user_id", "client_id");



ALTER TABLE ONLY "public"."client_projects"
    ADD CONSTRAINT "client_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commercial_partners"
    ADD CONSTRAINT "commercial_partners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractor_account_movements"
    ADD CONSTRAINT "contractor_account_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contractors"
    ADD CONSTRAINT "contractors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_documents"
    ADD CONSTRAINT "delivery_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."engineering_quotes"
    ADD CONSTRAINT "engineering_quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."engineering_quotes"
    ADD CONSTRAINT "engineering_quotes_quote_number_key" UNIQUE ("quote_number");



ALTER TABLE ONLY "public"."fiscal_document_email_logs"
    ADD CONSTRAINT "fiscal_document_email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fiscal_regime_catalog"
    ADD CONSTRAINT "fiscal_regime_catalog_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."installation_evidences"
    ADD CONSTRAINT "installation_evidences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."installation_orders"
    ADD CONSTRAINT "installation_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."installation_release_request"
    ADD CONSTRAINT "installation_release_request_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_email_logs"
    ADD CONSTRAINT "invoice_email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."labor_activity_catalog"
    ADD CONSTRAINT "labor_activity_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_events"
    ADD CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_recipients"
    ADD CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."product_tag_assignments"
    ADD CONSTRAINT "product_tag_assignments_pkey" PRIMARY KEY ("product_id", "tag_id");



ALTER TABLE ONLY "public"."product_tags"
    ADD CONSTRAINT "product_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_tags"
    ADD CONSTRAINT "product_tags_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_deliveries"
    ADD CONSTRAINT "project_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_delivery_email_history"
    ADD CONSTRAINT "project_delivery_email_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_delivery_evidences"
    ADD CONSTRAINT "project_delivery_evidences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_delivery_pending_items"
    ADD CONSTRAINT "project_delivery_pending_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_delivery_systems"
    ADD CONSTRAINT "project_delivery_systems_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_invoice_items"
    ADD CONSTRAINT "project_invoice_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_invoices"
    ADD CONSTRAINT "project_invoices_internal_folio_key" UNIQUE ("internal_folio");



ALTER TABLE ONLY "public"."project_invoices"
    ADD CONSTRAINT "project_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_material_deliveries"
    ADD CONSTRAINT "project_material_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_material_delivery_items"
    ADD CONSTRAINT "project_material_delivery_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_members"
    ADD CONSTRAINT "project_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_operational_item_labor_activities"
    ADD CONSTRAINT "project_operational_item_labor_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_operational_items"
    ADD CONSTRAINT "project_operational_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_payment_audit_log"
    ADD CONSTRAINT "project_payment_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_payment_complements"
    ADD CONSTRAINT "project_payment_complements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_payments"
    ADD CONSTRAINT "project_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_photos"
    ADD CONSTRAINT "project_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_profitability_reports"
    ADD CONSTRAINT "project_profitability_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_profitability_reports"
    ADD CONSTRAINT "project_profitability_reports_report_number_key" UNIQUE ("report_number");



ALTER TABLE ONLY "public"."project_purchase_events"
    ADD CONSTRAINT "project_purchase_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_purchase_lines"
    ADD CONSTRAINT "project_purchase_lines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_site_visit_note_photos"
    ADD CONSTRAINT "project_site_visit_note_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_site_visit_notes"
    ADD CONSTRAINT "project_site_visit_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_site_visits"
    ADD CONSTRAINT "project_site_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_translation_changes"
    ADD CONSTRAINT "project_translation_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_updates"
    ADD CONSTRAINT "project_updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_warranties"
    ADD CONSTRAINT "project_warranties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."public_document_access_events"
    ADD CONSTRAINT "public_document_access_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."public_document_links"
    ADD CONSTRAINT "public_document_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."public_document_links"
    ADD CONSTRAINT "public_document_links_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_approvals"
    ADD CONSTRAINT "quote_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_groups"
    ADD CONSTRAINT "quote_groups_base_number_key" UNIQUE ("base_number");



ALTER TABLE ONLY "public"."quote_groups"
    ADD CONSTRAINT "quote_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_item_labor_activities"
    ADD CONSTRAINT "quote_item_labor_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_sections"
    ADD CONSTRAINT "quote_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sat_payment_form_catalog"
    ADD CONSTRAINT "sat_payment_form_catalog_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."sat_product_service_catalog"
    ADD CONSTRAINT "sat_product_service_catalog_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."sat_unit_catalog"
    ADD CONSTRAINT "sat_unit_catalog_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."service_report_email_history"
    ADD CONSTRAINT "service_report_email_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_report_photos"
    ADD CONSTRAINT "service_report_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_reports"
    ADD CONSTRAINT "service_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_reports"
    ADD CONSTRAINT "service_reports_service_number_key" UNIQUE ("service_number");



ALTER TABLE ONLY "public"."subcontractors"
    ADD CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tax_object_catalog"
    ADD CONSTRAINT "tax_object_catalog_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."work_order_activities"
    ADD CONSTRAINT "work_order_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_work_order_number_key" UNIQUE ("work_order_number");



CREATE INDEX "cfdi_use_catalog_name_trgm_idx" ON "public"."cfdi_use_catalog" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "client_portal_project_access_project_idx" ON "public"."client_portal_project_access" USING "btree" ("client_project_id");



CREATE INDEX "client_portal_project_access_user_idx" ON "public"."client_portal_project_access" USING "btree" ("client_portal_user_id");



CREATE INDEX "client_portal_users_client_id_idx" ON "public"."client_portal_users" USING "btree" ("client_id");



CREATE INDEX "client_portal_users_user_id_idx" ON "public"."client_portal_users" USING "btree" ("user_id");



CREATE INDEX "client_projects_client_id_idx" ON "public"."client_projects" USING "btree" ("client_id");



CREATE UNIQUE INDEX "client_projects_client_project_number_uidx" ON "public"."client_projects" USING "btree" ("client_id", "project_number");



CREATE INDEX "client_projects_client_stage_idx" ON "public"."client_projects" USING "btree" ("client_id", "sales_stage");



CREATE INDEX "client_projects_expected_close_date_idx" ON "public"."client_projects" USING "btree" ("expected_close_date");



CREATE INDEX "client_projects_sales_stage_idx" ON "public"."client_projects" USING "btree" ("sales_stage");



CREATE UNIQUE INDEX "clients_client_number_uidx" ON "public"."clients" USING "btree" ("client_number");



CREATE INDEX "commercial_partners_active_name_idx" ON "public"."commercial_partners" USING "btree" ("is_active", "commercial_name");



CREATE INDEX "contractor_account_movements_contractor_id_idx" ON "public"."contractor_account_movements" USING "btree" ("contractor_id");



CREATE INDEX "contractor_account_movements_date_idx" ON "public"."contractor_account_movements" USING "btree" ("movement_date");



CREATE INDEX "contractor_account_movements_project_id_idx" ON "public"."contractor_account_movements" USING "btree" ("client_project_id");



CREATE INDEX "contractor_account_movements_work_order_id_idx" ON "public"."contractor_account_movements" USING "btree" ("work_order_id");



CREATE INDEX "contractors_is_active_idx" ON "public"."contractors" USING "btree" ("is_active");



CREATE INDEX "documents_client_visible_idx" ON "public"."documents" USING "btree" ("project_id", "is_client_visible", "document_type");



CREATE INDEX "documents_storage_idx" ON "public"."documents" USING "btree" ("bucket_id", "storage_path");



CREATE INDEX "engineering_quotes_client_project_idx" ON "public"."engineering_quotes" USING "btree" ("client_id", "client_project_id");



CREATE INDEX "engineering_quotes_latest_idx" ON "public"."engineering_quotes" USING "btree" ("is_latest");



CREATE UNIQUE INDEX "engineering_quotes_quote_number_uidx" ON "public"."engineering_quotes" USING "btree" ("quote_number");



CREATE INDEX "engineering_quotes_status_idx" ON "public"."engineering_quotes" USING "btree" ("status");



CREATE INDEX "fiscal_document_email_logs_document_idx" ON "public"."fiscal_document_email_logs" USING "btree" ("document_type", "document_id", "created_at" DESC);



CREATE INDEX "fiscal_document_email_logs_sent_by_idx" ON "public"."fiscal_document_email_logs" USING "btree" ("sent_by");



CREATE INDEX "fiscal_regime_catalog_name_trgm_idx" ON "public"."fiscal_regime_catalog" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "invoice_email_logs_invoice_idx" ON "public"."invoice_email_logs" USING "btree" ("invoice_id", "created_at" DESC);



CREATE INDEX "invoice_email_logs_sent_by_idx" ON "public"."invoice_email_logs" USING "btree" ("sent_by");



CREATE UNIQUE INDEX "labor_activity_catalog_name_key" ON "public"."labor_activity_catalog" USING "btree" ("lower"("name"));



CREATE INDEX "leads_client_id_idx" ON "public"."leads" USING "btree" ("client_id");



CREATE INDEX "leads_created_at_idx" ON "public"."leads" USING "btree" ("created_at" DESC);



CREATE INDEX "leads_status_idx" ON "public"."leads" USING "btree" ("status");



CREATE INDEX "notification_events_project_idx" ON "public"."notification_events" USING "btree" ("client_project_id");



CREATE INDEX "notification_events_type_idx" ON "public"."notification_events" USING "btree" ("event_type");



CREATE INDEX "notification_recipients_active_idx" ON "public"."notification_recipients" USING "btree" ("is_active", "channel");



CREATE INDEX "product_categories_active_sort_idx" ON "public"."product_categories" USING "btree" ("is_active", "sort_order");



CREATE INDEX "product_tags_active_sort_idx" ON "public"."product_tags" USING "btree" ("is_active", "sort_order");



CREATE INDEX "products_category_id_idx" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "products_fiscal_description_idx" ON "public"."products" USING "btree" ("id") WHERE ("fiscal_description" IS NOT NULL);



CREATE INDEX "products_is_favorite_idx" ON "public"."products" USING "btree" ("is_favorite");



CREATE INDEX "project_deliveries_delivery_date_idx" ON "public"."project_deliveries" USING "btree" ("delivery_date");



CREATE INDEX "project_deliveries_project_id_idx" ON "public"."project_deliveries" USING "btree" ("client_project_id");



CREATE INDEX "project_deliveries_status_idx" ON "public"."project_deliveries" USING "btree" ("status");



CREATE INDEX "project_delivery_email_history_delivery_id_idx" ON "public"."project_delivery_email_history" USING "btree" ("project_delivery_id");



CREATE INDEX "project_delivery_email_history_sent_at_idx" ON "public"."project_delivery_email_history" USING "btree" ("sent_at");



CREATE INDEX "project_delivery_evidences_delivery_id_idx" ON "public"."project_delivery_evidences" USING "btree" ("project_delivery_id");



CREATE INDEX "project_delivery_pending_items_delivery_id_idx" ON "public"."project_delivery_pending_items" USING "btree" ("project_delivery_id");



CREATE INDEX "project_delivery_systems_delivery_id_idx" ON "public"."project_delivery_systems" USING "btree" ("project_delivery_id");



CREATE INDEX "project_invoice_items_invoice_id_idx" ON "public"."project_invoice_items" USING "btree" ("project_invoice_id");



CREATE INDEX "project_invoice_items_product_id_idx" ON "public"."project_invoice_items" USING "btree" ("product_id");



CREATE INDEX "project_invoice_items_source_quote_item_idx" ON "public"."project_invoice_items" USING "btree" ("source_quote_item_id");



CREATE INDEX "project_invoices_client_id_idx" ON "public"."project_invoices" USING "btree" ("client_id");



CREATE INDEX "project_invoices_client_project_id_idx" ON "public"."project_invoices" USING "btree" ("client_project_id");



CREATE INDEX "project_invoices_facturama_id_idx" ON "public"."project_invoices" USING "btree" ("facturama_id");



CREATE UNIQUE INDEX "project_invoices_internal_folio_uidx" ON "public"."project_invoices" USING "btree" ("internal_folio");



CREATE INDEX "project_invoices_invoice_date_idx" ON "public"."project_invoices" USING "btree" ("invoice_date");



CREATE INDEX "project_invoices_payment_complement_status_idx" ON "public"."project_invoices" USING "btree" ("payment_complement_status");



CREATE INDEX "project_invoices_payment_method_code_idx" ON "public"."project_invoices" USING "btree" ("payment_method_code");



CREATE INDEX "project_invoices_source_quote_id_idx" ON "public"."project_invoices" USING "btree" ("source_quote_id");



CREATE INDEX "project_invoices_status_idx" ON "public"."project_invoices" USING "btree" ("status");



CREATE INDEX "project_material_deliveries_delivery_date_idx" ON "public"."project_material_deliveries" USING "btree" ("delivery_date");



CREATE INDEX "project_material_deliveries_project_id_idx" ON "public"."project_material_deliveries" USING "btree" ("client_project_id");



CREATE INDEX "project_material_delivery_items_delivery_id_idx" ON "public"."project_material_delivery_items" USING "btree" ("delivery_id");



CREATE INDEX "project_material_delivery_items_purchase_line_id_idx" ON "public"."project_material_delivery_items" USING "btree" ("project_purchase_line_id");



CREATE INDEX "project_operational_item_labor_activities_activity_id_idx" ON "public"."project_operational_item_labor_activities" USING "btree" ("labor_activity_id");



CREATE INDEX "project_operational_item_labor_activities_item_id_idx" ON "public"."project_operational_item_labor_activities" USING "btree" ("project_operational_item_id");



CREATE UNIQUE INDEX "project_operational_item_labor_activities_source_key" ON "public"."project_operational_item_labor_activities" USING "btree" ("source_quote_item_labor_activity_id") WHERE ("source_quote_item_labor_activity_id" IS NOT NULL);



CREATE INDEX "project_operational_item_labor_activities_status_idx" ON "public"."project_operational_item_labor_activities" USING "btree" ("status");



CREATE INDEX "project_operational_items_client_project_id_idx" ON "public"."project_operational_items" USING "btree" ("client_project_id");



CREATE INDEX "project_operational_items_product_id_idx" ON "public"."project_operational_items" USING "btree" ("product_id");



CREATE INDEX "project_operational_items_source_quote_id_idx" ON "public"."project_operational_items" USING "btree" ("source_quote_id");



CREATE UNIQUE INDEX "project_operational_items_source_quote_item_id_key" ON "public"."project_operational_items" USING "btree" ("source_quote_item_id") WHERE ("source_quote_item_id" IS NOT NULL);



CREATE INDEX "project_operational_items_status_idx" ON "public"."project_operational_items" USING "btree" ("status");



CREATE INDEX "project_payment_audit_log_created_idx" ON "public"."project_payment_audit_log" USING "btree" ("created_at");



CREATE INDEX "project_payment_audit_log_payment_idx" ON "public"."project_payment_audit_log" USING "btree" ("project_payment_id");



CREATE INDEX "project_payment_complements_invoice_idx" ON "public"."project_payment_complements" USING "btree" ("project_invoice_id");



CREATE INDEX "project_payment_complements_issued_at_idx" ON "public"."project_payment_complements" USING "btree" ("project_invoice_id", "issued_at") WHERE ("status" = ANY (ARRAY['issued'::"text", 'stamped'::"text"]));



CREATE INDEX "project_payment_complements_payment_idx" ON "public"."project_payment_complements" USING "btree" ("project_payment_id");



CREATE UNIQUE INDEX "project_payment_complements_payment_stamped_uidx" ON "public"."project_payment_complements" USING "btree" ("project_payment_id") WHERE (("project_payment_id" IS NOT NULL) AND ("status" = 'stamped'::"text"));



CREATE INDEX "project_payment_complements_project_idx" ON "public"."project_payment_complements" USING "btree" ("client_project_id");



CREATE INDEX "project_payment_complements_status_idx" ON "public"."project_payment_complements" USING "btree" ("status");



CREATE INDEX "project_payments_client_project_id_idx" ON "public"."project_payments" USING "btree" ("client_project_id");



CREATE INDEX "project_payments_payment_date_idx" ON "public"."project_payments" USING "btree" ("payment_date");



CREATE INDEX "project_profitability_reports_generated_at_idx" ON "public"."project_profitability_reports" USING "btree" ("generated_at");



CREATE INDEX "project_profitability_reports_project_id_idx" ON "public"."project_profitability_reports" USING "btree" ("client_project_id");



CREATE INDEX "project_profitability_reports_status_idx" ON "public"."project_profitability_reports" USING "btree" ("status");



CREATE INDEX "project_purchase_events_line_id_idx" ON "public"."project_purchase_events" USING "btree" ("project_purchase_line_id");



CREATE INDEX "project_purchase_lines_client_project_id_idx" ON "public"."project_purchase_lines" USING "btree" ("client_project_id");



CREATE INDEX "project_purchase_lines_operational_item_id_idx" ON "public"."project_purchase_lines" USING "btree" ("project_operational_item_id");



CREATE INDEX "project_purchase_lines_quote_item_id_idx" ON "public"."project_purchase_lines" USING "btree" ("quote_item_id");



CREATE UNIQUE INDEX "project_purchase_lines_quote_item_id_key" ON "public"."project_purchase_lines" USING "btree" ("quote_item_id") WHERE ("quote_item_id" IS NOT NULL);



CREATE INDEX "project_purchase_lines_status_idx" ON "public"."project_purchase_lines" USING "btree" ("purchase_status");



CREATE INDEX "project_purchase_lines_supplier_idx" ON "public"."project_purchase_lines" USING "btree" ("supplier");



CREATE INDEX "project_site_visit_note_photos_note_id_idx" ON "public"."project_site_visit_note_photos" USING "btree" ("project_site_visit_note_id");



CREATE INDEX "project_site_visit_notes_visit_id_idx" ON "public"."project_site_visit_notes" USING "btree" ("project_site_visit_id");



CREATE INDEX "project_site_visits_client_project_id_idx" ON "public"."project_site_visits" USING "btree" ("client_project_id");



CREATE INDEX "project_translation_changes_created_at_idx" ON "public"."project_translation_changes" USING "btree" ("created_at");



CREATE INDEX "project_translation_changes_operational_item_id_idx" ON "public"."project_translation_changes" USING "btree" ("operational_item_id");



CREATE INDEX "project_translation_changes_project_id_idx" ON "public"."project_translation_changes" USING "btree" ("client_project_id");



CREATE INDEX "project_warranties_maintenance_policy_active_idx" ON "public"."project_warranties" USING "btree" ("maintenance_policy_active");



CREATE INDEX "project_warranties_project_id_idx" ON "public"."project_warranties" USING "btree" ("client_project_id");



CREATE INDEX "project_warranties_status_idx" ON "public"."project_warranties" USING "btree" ("status");



CREATE INDEX "project_warranties_warranty_date_idx" ON "public"."project_warranties" USING "btree" ("warranty_date");



CREATE INDEX "public_document_access_events_link_idx" ON "public"."public_document_access_events" USING "btree" ("public_document_link_id", "accessed_at" DESC);



CREATE INDEX "public_document_access_events_result_idx" ON "public"."public_document_access_events" USING "btree" ("result", "accessed_at" DESC);



CREATE INDEX "public_document_links_delivery_idx" ON "public"."public_document_links" USING "btree" ("project_delivery_id");



CREATE INDEX "public_document_links_document_idx" ON "public"."public_document_links" USING "btree" ("document_id");



CREATE INDEX "public_document_links_expires_at_idx" ON "public"."public_document_links" USING "btree" ("expires_at");



CREATE INDEX "public_document_links_invoice_idx" ON "public"."public_document_links" USING "btree" ("project_invoice_id");



CREATE INDEX "public_document_links_quote_idx" ON "public"."public_document_links" USING "btree" ("quote_id");



CREATE INDEX "public_document_links_revoked_at_idx" ON "public"."public_document_links" USING "btree" ("revoked_at");



CREATE INDEX "public_document_links_token_idx" ON "public"."public_document_links" USING "btree" ("token");



CREATE INDEX "public_document_links_warranty_idx" ON "public"."public_document_links" USING "btree" ("project_warranty_id");



CREATE INDEX "quote_groups_approved_quote_id_idx" ON "public"."quote_groups" USING "btree" ("approved_quote_id");



CREATE INDEX "quote_item_labor_activities_labor_activity_id_idx" ON "public"."quote_item_labor_activities" USING "btree" ("labor_activity_id");



CREATE INDEX "quote_item_labor_activities_quote_item_id_idx" ON "public"."quote_item_labor_activities" USING "btree" ("quote_item_id");



CREATE INDEX "quote_items_equipment_total_usd_idx" ON "public"."quote_items" USING "btree" ("equipment_total_usd");



CREATE INDEX "quote_items_quote_id_idx" ON "public"."quote_items" USING "btree" ("quote_id");



CREATE INDEX "quote_items_quote_section_id_idx" ON "public"."quote_items" USING "btree" ("quote_section_id");



CREATE INDEX "quote_sections_quote_id_idx" ON "public"."quote_sections" USING "btree" ("quote_id");



CREATE UNIQUE INDEX "quote_terms_settings_quote_id_uidx" ON "public"."quote_terms_settings" USING "btree" ("quote_id");



CREATE INDEX "quotes_client_project_id_idx" ON "public"."quotes" USING "btree" ("client_project_id");



CREATE INDEX "quotes_commercial_partner_id_idx" ON "public"."quotes" USING "btree" ("commercial_partner_id");



CREATE INDEX "quotes_discount_type_idx" ON "public"."quotes" USING "btree" ("discount_type");



CREATE INDEX "quotes_is_latest_idx" ON "public"."quotes" USING "btree" ("is_latest");



CREATE UNIQUE INDEX "quotes_one_latest_per_group_uidx" ON "public"."quotes" USING "btree" ("quote_group_id") WHERE (("quote_group_id" IS NOT NULL) AND ("is_latest" = true));



CREATE INDEX "quotes_parent_quote_id_idx" ON "public"."quotes" USING "btree" ("parent_quote_id");



CREATE INDEX "quotes_quote_base_number_idx" ON "public"."quotes" USING "btree" ("quote_base_number");



CREATE INDEX "quotes_quote_group_id_idx" ON "public"."quotes" USING "btree" ("quote_group_id");



CREATE UNIQUE INDEX "quotes_quote_group_version_uidx" ON "public"."quotes" USING "btree" ("quote_group_id", "version") WHERE ("quote_group_id" IS NOT NULL);



CREATE UNIQUE INDEX "quotes_quote_number_uidx" ON "public"."quotes" USING "btree" ("quote_number") WHERE ("quote_number" IS NOT NULL);



CREATE INDEX "quotes_total_mxn_idx" ON "public"."quotes" USING "btree" ("total_mxn");



CREATE INDEX "sat_payment_form_catalog_name_trgm_idx" ON "public"."sat_payment_form_catalog" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "sat_product_service_catalog_description_trgm_idx" ON "public"."sat_product_service_catalog" USING "gin" ("description" "extensions"."gin_trgm_ops");



CREATE INDEX "sat_unit_catalog_description_trgm_idx" ON "public"."sat_unit_catalog" USING "gin" ("description" "extensions"."gin_trgm_ops");



CREATE INDEX "sat_unit_catalog_name_trgm_idx" ON "public"."sat_unit_catalog" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "service_report_email_history_report_id_idx" ON "public"."service_report_email_history" USING "btree" ("service_report_id");



CREATE INDEX "service_report_email_history_sent_at_idx" ON "public"."service_report_email_history" USING "btree" ("sent_at");



CREATE INDEX "service_report_photos_report_id_idx" ON "public"."service_report_photos" USING "btree" ("service_report_id");



CREATE INDEX "service_reports_client_id_idx" ON "public"."service_reports" USING "btree" ("client_id");



CREATE INDEX "service_reports_completed_at_idx" ON "public"."service_reports" USING "btree" ("completed_at");



CREATE INDEX "service_reports_project_id_idx" ON "public"."service_reports" USING "btree" ("client_project_id");



CREATE INDEX "service_reports_service_date_idx" ON "public"."service_reports" USING "btree" ("service_date");



CREATE INDEX "service_reports_status_idx" ON "public"."service_reports" USING "btree" ("status");



CREATE INDEX "tax_object_catalog_name_trgm_idx" ON "public"."tax_object_catalog" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "work_order_activities_operational_activity_id_idx" ON "public"."work_order_activities" USING "btree" ("project_operational_item_labor_activity_id");



CREATE INDEX "work_order_activities_status_idx" ON "public"."work_order_activities" USING "btree" ("status");



CREATE INDEX "work_order_activities_work_order_id_idx" ON "public"."work_order_activities" USING "btree" ("work_order_id");



CREATE INDEX "work_orders_contractor_id_idx" ON "public"."work_orders" USING "btree" ("contractor_id");



CREATE INDEX "work_orders_contractor_payment_status_idx" ON "public"."work_orders" USING "btree" ("contractor_payment_status");



CREATE INDEX "work_orders_project_id_idx" ON "public"."work_orders" USING "btree" ("client_project_id");



CREATE INDEX "work_orders_status_idx" ON "public"."work_orders" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_project_deliveries_updated_at" BEFORE UPDATE ON "public"."project_deliveries" FOR EACH ROW EXECUTE FUNCTION "public"."set_project_deliveries_updated_at"();



CREATE OR REPLACE TRIGGER "set_project_profitability_reports_updated_at" BEFORE UPDATE ON "public"."project_profitability_reports" FOR EACH ROW EXECUTE FUNCTION "public"."set_project_profitability_reports_updated_at"();



CREATE OR REPLACE TRIGGER "set_project_site_visit_note_photos_updated_at" BEFORE UPDATE ON "public"."project_site_visit_note_photos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_project_site_visit_notes_updated_at" BEFORE UPDATE ON "public"."project_site_visit_notes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_project_site_visits_updated_at" BEFORE UPDATE ON "public"."project_site_visits" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_project_warranties_updated_at" BEFORE UPDATE ON "public"."project_warranties" FOR EACH ROW EXECUTE FUNCTION "public"."set_project_warranties_updated_at"();



ALTER TABLE ONLY "public"."client_portal_project_access"
    ADD CONSTRAINT "client_portal_project_access_client_portal_user_id_fkey" FOREIGN KEY ("client_portal_user_id") REFERENCES "public"."client_portal_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_portal_project_access"
    ADD CONSTRAINT "client_portal_project_access_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_portal_users"
    ADD CONSTRAINT "client_portal_users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_portal_users"
    ADD CONSTRAINT "client_portal_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_projects"
    ADD CONSTRAINT "client_projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_cfdi_use_fkey" FOREIGN KEY ("cfdi_use") REFERENCES "public"."cfdi_use_catalog"("code");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_fiscal_regime_fkey" FOREIGN KEY ("fiscal_regime") REFERENCES "public"."fiscal_regime_catalog"("code");



ALTER TABLE ONLY "public"."contractor_account_movements"
    ADD CONSTRAINT "contractor_account_movements_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contractor_account_movements"
    ADD CONSTRAINT "contractor_account_movements_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contractor_account_movements"
    ADD CONSTRAINT "contractor_account_movements_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."contractor_account_movements"
    ADD CONSTRAINT "contractor_account_movements_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."delivery_documents"
    ADD CONSTRAINT "delivery_documents_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."delivery_documents"
    ADD CONSTRAINT "delivery_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."engineering_quotes"
    ADD CONSTRAINT "engineering_quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."engineering_quotes"
    ADD CONSTRAINT "engineering_quotes_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id");



ALTER TABLE ONLY "public"."engineering_quotes"
    ADD CONSTRAINT "engineering_quotes_parent_quote_id_fkey" FOREIGN KEY ("parent_quote_id") REFERENCES "public"."engineering_quotes"("id");



ALTER TABLE ONLY "public"."fiscal_document_email_logs"
    ADD CONSTRAINT "fiscal_document_email_logs_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."installation_evidences"
    ADD CONSTRAINT "installation_evidences_installation_order_id_fkey" FOREIGN KEY ("installation_order_id") REFERENCES "public"."installation_orders"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."installation_evidences"
    ADD CONSTRAINT "installation_evidences_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."installation_orders"
    ADD CONSTRAINT "installation_orders_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."installation_orders"
    ADD CONSTRAINT "installation_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."installation_orders"
    ADD CONSTRAINT "installation_orders_released_by_fkey" FOREIGN KEY ("released_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."installation_orders"
    ADD CONSTRAINT "installation_orders_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."installation_release_request"
    ADD CONSTRAINT "installation_release_request_installation_order_id_fkey" FOREIGN KEY ("installation_order_id") REFERENCES "public"."installation_orders"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."installation_release_request"
    ADD CONSTRAINT "installation_release_request_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."installation_release_request"
    ADD CONSTRAINT "installation_release_request_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."invoice_email_logs"
    ADD CONSTRAINT "invoice_email_logs_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."project_invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_email_logs"
    ADD CONSTRAINT "invoice_email_logs_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_events"
    ADD CONSTRAINT "notification_events_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id");



ALTER TABLE ONLY "public"."payment_reminders"
    ADD CONSTRAINT "payment_reminders_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."product_tag_assignments"
    ADD CONSTRAINT "product_tag_assignments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_tag_assignments"
    ADD CONSTRAINT "product_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."product_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_fiscal_object_fkey" FOREIGN KEY ("fiscal_object") REFERENCES "public"."tax_object_catalog"("code");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_sat_product_service_code_fkey" FOREIGN KEY ("sat_product_service_code") REFERENCES "public"."sat_product_service_catalog"("code");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_sat_unit_code_fkey" FOREIGN KEY ("sat_unit_code") REFERENCES "public"."sat_unit_catalog"("code");



ALTER TABLE ONLY "public"."project_deliveries"
    ADD CONSTRAINT "project_deliveries_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_deliveries"
    ADD CONSTRAINT "project_deliveries_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_delivery_email_history"
    ADD CONSTRAINT "project_delivery_email_history_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_delivery_email_history"
    ADD CONSTRAINT "project_delivery_email_history_project_delivery_id_fkey" FOREIGN KEY ("project_delivery_id") REFERENCES "public"."project_deliveries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_delivery_evidences"
    ADD CONSTRAINT "project_delivery_evidences_project_delivery_id_fkey" FOREIGN KEY ("project_delivery_id") REFERENCES "public"."project_deliveries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_delivery_evidences"
    ADD CONSTRAINT "project_delivery_evidences_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_delivery_pending_items"
    ADD CONSTRAINT "project_delivery_pending_items_project_delivery_id_fkey" FOREIGN KEY ("project_delivery_id") REFERENCES "public"."project_deliveries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_delivery_systems"
    ADD CONSTRAINT "project_delivery_systems_project_delivery_id_fkey" FOREIGN KEY ("project_delivery_id") REFERENCES "public"."project_deliveries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_invoice_items"
    ADD CONSTRAINT "project_invoice_items_fiscal_object_fkey" FOREIGN KEY ("fiscal_object") REFERENCES "public"."tax_object_catalog"("code");



ALTER TABLE ONLY "public"."project_invoice_items"
    ADD CONSTRAINT "project_invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_invoice_items"
    ADD CONSTRAINT "project_invoice_items_project_invoice_id_fkey" FOREIGN KEY ("project_invoice_id") REFERENCES "public"."project_invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_invoice_items"
    ADD CONSTRAINT "project_invoice_items_sat_product_service_code_fkey" FOREIGN KEY ("sat_product_service_code") REFERENCES "public"."sat_product_service_catalog"("code");



ALTER TABLE ONLY "public"."project_invoice_items"
    ADD CONSTRAINT "project_invoice_items_sat_unit_code_fkey" FOREIGN KEY ("sat_unit_code") REFERENCES "public"."sat_unit_catalog"("code");



ALTER TABLE ONLY "public"."project_invoice_items"
    ADD CONSTRAINT "project_invoice_items_source_quote_item_id_fkey" FOREIGN KEY ("source_quote_item_id") REFERENCES "public"."quote_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_invoices"
    ADD CONSTRAINT "project_invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_invoices"
    ADD CONSTRAINT "project_invoices_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_invoices"
    ADD CONSTRAINT "project_invoices_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_invoices"
    ADD CONSTRAINT "project_invoices_payment_form_code_fkey" FOREIGN KEY ("payment_form_code") REFERENCES "public"."sat_payment_form_catalog"("code");



ALTER TABLE ONLY "public"."project_invoices"
    ADD CONSTRAINT "project_invoices_source_quote_id_fkey" FOREIGN KEY ("source_quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_invoices"
    ADD CONSTRAINT "project_invoices_source_service_report_id_fkey" FOREIGN KEY ("source_service_report_id") REFERENCES "public"."service_reports"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_material_deliveries"
    ADD CONSTRAINT "project_material_deliveries_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_material_deliveries"
    ADD CONSTRAINT "project_material_deliveries_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_material_delivery_items"
    ADD CONSTRAINT "project_material_delivery_items_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "public"."project_material_deliveries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_material_delivery_items"
    ADD CONSTRAINT "project_material_delivery_items_project_purchase_line_id_fkey" FOREIGN KEY ("project_purchase_line_id") REFERENCES "public"."project_purchase_lines"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_operational_item_labor_activities"
    ADD CONSTRAINT "project_operational_item_labo_source_quote_item_labor_acti_fkey" FOREIGN KEY ("source_quote_item_labor_activity_id") REFERENCES "public"."quote_item_labor_activities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_operational_item_labor_activities"
    ADD CONSTRAINT "project_operational_item_labor_activitie_labor_activity_id_fkey" FOREIGN KEY ("labor_activity_id") REFERENCES "public"."labor_activity_catalog"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_operational_item_labor_activities"
    ADD CONSTRAINT "project_operational_item_labor_activities_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_operational_item_labor_activities"
    ADD CONSTRAINT "project_operational_item_labor_project_operational_item_id_fkey" FOREIGN KEY ("project_operational_item_id") REFERENCES "public"."project_operational_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_operational_items"
    ADD CONSTRAINT "project_operational_items_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_operational_items"
    ADD CONSTRAINT "project_operational_items_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_operational_items"
    ADD CONSTRAINT "project_operational_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_operational_items"
    ADD CONSTRAINT "project_operational_items_source_quote_id_fkey" FOREIGN KEY ("source_quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_operational_items"
    ADD CONSTRAINT "project_operational_items_source_quote_item_id_fkey" FOREIGN KEY ("source_quote_item_id") REFERENCES "public"."quote_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_operational_items"
    ADD CONSTRAINT "project_operational_items_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_payment_audit_log"
    ADD CONSTRAINT "project_payment_audit_log_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_payment_audit_log"
    ADD CONSTRAINT "project_payment_audit_log_project_payment_id_fkey" FOREIGN KEY ("project_payment_id") REFERENCES "public"."project_payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_payment_complements"
    ADD CONSTRAINT "project_payment_complements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_payment_complements"
    ADD CONSTRAINT "project_payment_complements_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_payment_complements"
    ADD CONSTRAINT "project_payment_complements_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_payment_complements"
    ADD CONSTRAINT "project_payment_complements_issued_by_user_id_fkey" FOREIGN KEY ("issued_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_payment_complements"
    ADD CONSTRAINT "project_payment_complements_payment_form_code_fkey" FOREIGN KEY ("payment_form_code") REFERENCES "public"."sat_payment_form_catalog"("code");



ALTER TABLE ONLY "public"."project_payment_complements"
    ADD CONSTRAINT "project_payment_complements_project_invoice_id_fkey" FOREIGN KEY ("project_invoice_id") REFERENCES "public"."project_invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_payment_complements"
    ADD CONSTRAINT "project_payment_complements_project_payment_id_fkey" FOREIGN KEY ("project_payment_id") REFERENCES "public"."project_payments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_payments"
    ADD CONSTRAINT "project_payments_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_payments"
    ADD CONSTRAINT "project_payments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_payments"
    ADD CONSTRAINT "project_payments_payment_form_code_fkey" FOREIGN KEY ("payment_form_code") REFERENCES "public"."sat_payment_form_catalog"("code");



ALTER TABLE ONLY "public"."project_photos"
    ADD CONSTRAINT "project_photos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_profitability_reports"
    ADD CONSTRAINT "project_profitability_reports_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_profitability_reports"
    ADD CONSTRAINT "project_profitability_reports_generated_by_user_id_fkey" FOREIGN KEY ("generated_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_purchase_events"
    ADD CONSTRAINT "project_purchase_events_project_purchase_line_id_fkey" FOREIGN KEY ("project_purchase_line_id") REFERENCES "public"."project_purchase_lines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_purchase_lines"
    ADD CONSTRAINT "project_purchase_lines_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_purchase_lines"
    ADD CONSTRAINT "project_purchase_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_purchase_lines"
    ADD CONSTRAINT "project_purchase_lines_project_operational_item_id_fkey" FOREIGN KEY ("project_operational_item_id") REFERENCES "public"."project_operational_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_purchase_lines"
    ADD CONSTRAINT "project_purchase_lines_quote_item_id_fkey" FOREIGN KEY ("quote_item_id") REFERENCES "public"."quote_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_site_visit_note_photos"
    ADD CONSTRAINT "project_site_visit_note_photos_project_site_visit_note_id_fkey" FOREIGN KEY ("project_site_visit_note_id") REFERENCES "public"."project_site_visit_notes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_site_visit_notes"
    ADD CONSTRAINT "project_site_visit_notes_project_site_visit_id_fkey" FOREIGN KEY ("project_site_visit_id") REFERENCES "public"."project_site_visits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_site_visits"
    ADD CONSTRAINT "project_site_visits_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_site_visits"
    ADD CONSTRAINT "project_site_visits_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_translation_changes"
    ADD CONSTRAINT "project_translation_changes_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_translation_changes"
    ADD CONSTRAINT "project_translation_changes_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."project_translation_changes"
    ADD CONSTRAINT "project_translation_changes_operational_item_id_fkey" FOREIGN KEY ("operational_item_id") REFERENCES "public"."project_operational_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_updates"
    ADD CONSTRAINT "project_updates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."project_updates"
    ADD CONSTRAINT "project_updates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_warranties"
    ADD CONSTRAINT "project_warranties_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_warranties"
    ADD CONSTRAINT "project_warranties_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."public_document_access_events"
    ADD CONSTRAINT "public_document_access_events_public_document_link_id_fkey" FOREIGN KEY ("public_document_link_id") REFERENCES "public"."public_document_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."public_document_links"
    ADD CONSTRAINT "public_document_links_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."public_document_links"
    ADD CONSTRAINT "public_document_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."public_document_links"
    ADD CONSTRAINT "public_document_links_project_delivery_id_fkey" FOREIGN KEY ("project_delivery_id") REFERENCES "public"."project_deliveries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."public_document_links"
    ADD CONSTRAINT "public_document_links_project_invoice_id_fkey" FOREIGN KEY ("project_invoice_id") REFERENCES "public"."project_invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."public_document_links"
    ADD CONSTRAINT "public_document_links_project_warranty_id_fkey" FOREIGN KEY ("project_warranty_id") REFERENCES "public"."project_warranties"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."public_document_links"
    ADD CONSTRAINT "public_document_links_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."public_document_links"
    ADD CONSTRAINT "public_document_links_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_quote_item_id_fkey" FOREIGN KEY ("quote_item_id") REFERENCES "public"."quote_items"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quote_groups"
    ADD CONSTRAINT "quote_groups_approved_quote_id_fkey" FOREIGN KEY ("approved_quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quote_item_labor_activities"
    ADD CONSTRAINT "quote_item_labor_activities_labor_activity_id_fkey" FOREIGN KEY ("labor_activity_id") REFERENCES "public"."labor_activity_catalog"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quote_item_labor_activities"
    ADD CONSTRAINT "quote_item_labor_activities_quote_item_id_fkey" FOREIGN KEY ("quote_item_id") REFERENCES "public"."quote_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_quote_section_id_fkey" FOREIGN KEY ("quote_section_id") REFERENCES "public"."quote_sections"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_sections"
    ADD CONSTRAINT "quote_sections_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_sections"
    ADD CONSTRAINT "quote_sections_quotes_id_fkey" FOREIGN KEY ("quotes_id") REFERENCES "public"."quotes"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_terms_settings"
    ADD CONSTRAINT "quote_terms_settings_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_commercial_partner_id_fkey" FOREIGN KEY ("commercial_partner_id") REFERENCES "public"."commercial_partners"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_parent_quote_id_fkey" FOREIGN KEY ("parent_quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_quote_group_id_fkey" FOREIGN KEY ("quote_group_id") REFERENCES "public"."quote_groups"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_report_email_history"
    ADD CONSTRAINT "service_report_email_history_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."service_report_email_history"
    ADD CONSTRAINT "service_report_email_history_service_report_id_fkey" FOREIGN KEY ("service_report_id") REFERENCES "public"."service_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_report_photos"
    ADD CONSTRAINT "service_report_photos_service_report_id_fkey" FOREIGN KEY ("service_report_id") REFERENCES "public"."service_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_reports"
    ADD CONSTRAINT "service_reports_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_reports"
    ADD CONSTRAINT "service_reports_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_reports"
    ADD CONSTRAINT "service_reports_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."service_reports"
    ADD CONSTRAINT "service_reports_related_quote_id_fkey" FOREIGN KEY ("related_quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_order_activities"
    ADD CONSTRAINT "work_order_activities_project_operational_item_labor_activ_fkey" FOREIGN KEY ("project_operational_item_labor_activity_id") REFERENCES "public"."project_operational_item_labor_activities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_order_activities"
    ADD CONSTRAINT "work_order_activities_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_client_project_id_fkey" FOREIGN KEY ("client_project_id") REFERENCES "public"."client_projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Allow read project members" ON "public"."project_members" FOR SELECT USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."client_projects" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."clients" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."contractor_account_movements" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."contractors" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."documents" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."engineering_quotes" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."labor_activity_catalog" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."leads" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."notification_events" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."notification_recipients" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."product_categories" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."product_tag_assignments" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."product_tags" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."products" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_deliveries" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_delivery_email_history" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_delivery_evidences" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_delivery_pending_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_delivery_systems" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_invoice_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_invoices" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_material_deliveries" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_material_delivery_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_operational_item_labor_activities" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_operational_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_payment_complements" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_payments" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_photos" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_purchase_events" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_purchase_lines" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_site_visit_note_photos" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_site_visit_notes" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_site_visits" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_translation_changes" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_updates" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."project_warranties" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."projects" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."public_document_links" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."quote_groups" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."quote_item_labor_activities" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."quote_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."quote_sections" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."quote_terms_settings" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."quotes" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."service_report_email_history" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."service_report_photos" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."service_reports" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."work_order_activities" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_delete" ON "public"."work_orders" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."client_projects" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."contractor_account_movements" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."contractors" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."engineering_quotes" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."fiscal_document_email_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."invoice_email_logs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."labor_activity_catalog" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."leads" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."notification_events" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."notification_recipients" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."product_categories" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."product_tag_assignments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."product_tags" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."products" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_deliveries" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_delivery_email_history" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_delivery_evidences" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_delivery_pending_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_delivery_systems" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_invoice_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_invoices" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_material_deliveries" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_material_delivery_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_operational_item_labor_activities" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_operational_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_payment_audit_log" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_payment_complements" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_payments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_photos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_purchase_events" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_purchase_lines" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_site_visit_note_photos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_site_visit_notes" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_site_visits" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_translation_changes" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_updates" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."project_warranties" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."projects" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."public_document_links" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."quote_groups" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."quote_item_labor_activities" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."quote_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."quote_sections" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."quote_terms_settings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."quotes" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."service_report_email_history" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."service_report_photos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."service_reports" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."work_order_activities" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_insert" ON "public"."work_orders" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "beta_authenticated_select" ON "public"."cfdi_use_catalog" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."client_projects" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."clients" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."contractor_account_movements" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."contractors" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."documents" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."engineering_quotes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."fiscal_document_email_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."fiscal_regime_catalog" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."invoice_email_logs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."labor_activity_catalog" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."leads" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."notification_events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."notification_recipients" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."product_categories" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."product_tag_assignments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."product_tags" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."products" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_deliveries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_delivery_email_history" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_delivery_evidences" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_delivery_pending_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_delivery_systems" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_invoice_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_invoices" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_material_deliveries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_material_delivery_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_operational_item_labor_activities" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_operational_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_payment_audit_log" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_payment_complements" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_payments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_photos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_purchase_events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_purchase_lines" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_site_visit_note_photos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_site_visit_notes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_site_visits" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_translation_changes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_updates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."project_warranties" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."projects" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."public_document_links" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."quote_groups" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."quote_item_labor_activities" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."quote_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."quote_sections" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."quote_terms_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."quotes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."sat_payment_form_catalog" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."sat_product_service_catalog" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."sat_unit_catalog" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."service_report_email_history" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."service_report_photos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."service_reports" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."tax_object_catalog" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."work_order_activities" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_select" ON "public"."work_orders" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "beta_authenticated_update" ON "public"."client_projects" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."clients" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."contractor_account_movements" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."contractors" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."documents" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."engineering_quotes" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."labor_activity_catalog" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."leads" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."notification_events" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."notification_recipients" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."product_categories" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."product_tag_assignments" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."product_tags" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."products" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_deliveries" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_delivery_email_history" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_delivery_evidences" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_delivery_pending_items" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_delivery_systems" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_invoice_items" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_invoices" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_material_deliveries" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_material_delivery_items" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_operational_item_labor_activities" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_operational_items" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_payment_complements" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_payments" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_photos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_purchase_events" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_purchase_lines" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_site_visit_note_photos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_site_visit_notes" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_site_visits" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_translation_changes" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_updates" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."project_warranties" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."projects" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."public_document_links" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."quote_groups" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."quote_item_labor_activities" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."quote_items" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."quote_sections" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."quote_terms_settings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."quotes" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."service_report_email_history" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."service_report_photos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."service_reports" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."work_order_activities" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "beta_authenticated_update" ON "public"."work_orders" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."cfdi_use_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_portal_project_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_portal_project_access_select_self" ON "public"."client_portal_project_access" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."client_portal_users" "cpu"
  WHERE (("cpu"."id" = "client_portal_project_access"."client_portal_user_id") AND ("cpu"."user_id" = "auth"."uid"()) AND ("cpu"."is_active" = true)))));



ALTER TABLE "public"."client_portal_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_portal_users_select_self" ON "public"."client_portal_users" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."client_projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commercial_partners" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "commercial_partners_delete_admin_direction" ON "public"."commercial_partners" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'direccion'::"text"]))))));



CREATE POLICY "commercial_partners_insert_admin_direction_commercial" ON "public"."commercial_partners" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'comercial'::"text", 'sales'::"text"]))))));



CREATE POLICY "commercial_partners_select_internal" ON "public"."commercial_partners" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'comercial'::"text", 'sales'::"text"]))))));



CREATE POLICY "commercial_partners_update_admin_direction_commercial" ON "public"."commercial_partners" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'comercial'::"text", 'sales'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'comercial'::"text", 'sales'::"text"]))))));



ALTER TABLE "public"."contractor_account_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contractors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."engineering_quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fiscal_document_email_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fiscal_regime_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."installation_evidences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."installation_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."installation_release_request" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_email_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."labor_activity_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_recipients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_tag_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_admin" ON "public"."profiles" FOR DELETE TO "authenticated" USING (("public"."current_profile_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"])));



CREATE POLICY "profiles_insert_self" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((("id" = "auth"."uid"()) AND ((("role" = 'comercial'::"text") AND ("user_type" = 'internal'::"text") AND ("is_internal" = true)) OR (("role" = 'client'::"text") AND ("user_type" = 'client_portal'::"text") AND ("is_internal" = false))) AND ("is_active" = true)));



CREATE POLICY "profiles_select_self_or_admin" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("public"."current_profile_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"]))));



CREATE POLICY "profiles_update_admin" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("public"."current_profile_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"]))) WITH CHECK (("public"."current_profile_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"])));



CREATE POLICY "profitability_reports_delete_financial_roles" ON "public"."project_profitability_reports" FOR DELETE TO "authenticated" USING (("public"."current_profile_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text"])));



CREATE POLICY "profitability_reports_insert_financial_roles" ON "public"."project_profitability_reports" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_profile_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'finanzas'::"text"])));



CREATE POLICY "profitability_reports_select_financial_roles" ON "public"."project_profitability_reports" FOR SELECT TO "authenticated" USING (("public"."current_profile_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'finanzas'::"text"])));



CREATE POLICY "profitability_reports_update_financial_roles" ON "public"."project_profitability_reports" FOR UPDATE TO "authenticated" USING (("public"."current_profile_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'finanzas'::"text"]))) WITH CHECK (("public"."current_profile_role"() = ANY (ARRAY['admin'::"text", 'direccion'::"text", 'finanzas'::"text"])));



ALTER TABLE "public"."project_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_delivery_email_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_delivery_evidences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_delivery_pending_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_delivery_systems" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_invoice_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_material_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_material_delivery_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_operational_item_labor_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_operational_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_payment_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_payment_complements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_profitability_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_purchase_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_purchase_lines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_site_visit_note_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_site_visit_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_site_visits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_translation_changes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_updates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_warranties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."public_document_access_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_document_access_events_insert_internal" ON "public"."public_document_access_events" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_internal" = true) AND ("p"."is_active" = true)))));



CREATE POLICY "public_document_access_events_select_internal" ON "public"."public_document_access_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_internal" = true) AND ("p"."is_active" = true)))));



ALTER TABLE "public"."public_document_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public_document_links_delete_internal" ON "public"."public_document_links" FOR DELETE TO "authenticated" USING (("public"."current_profile_role"() IS NOT NULL));



CREATE POLICY "public_document_links_insert_internal" ON "public"."public_document_links" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_profile_role"() IS NOT NULL));



CREATE POLICY "public_document_links_select_internal_or_portal_access" ON "public"."public_document_links" FOR SELECT TO "authenticated" USING ((("public"."current_profile_role"() IS NOT NULL) OR (EXISTS ( SELECT 1
   FROM ("public"."client_portal_users" "cpu"
     JOIN "public"."client_portal_project_access" "cppa" ON (("cppa"."client_portal_user_id" = "cpu"."id")))
  WHERE (("cpu"."user_id" = "auth"."uid"()) AND ("cpu"."is_active" = true) AND ("cppa"."is_active" = true) AND ("cppa"."client_project_id" = "public_document_links"."client_project_id"))))));



CREATE POLICY "public_document_links_update_internal" ON "public"."public_document_links" FOR UPDATE TO "authenticated" USING (("public"."current_profile_role"() IS NOT NULL)) WITH CHECK (("public"."current_profile_role"() IS NOT NULL));



ALTER TABLE "public"."purchase_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_approvals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_item_labor_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_terms_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sat_payment_form_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sat_product_service_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sat_unit_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_report_email_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_report_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subcontractors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tax_object_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_order_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."work_orders" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



















































































































































































































































GRANT ALL ON FUNCTION "public"."current_profile_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_profile_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_profile_role"() TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_current_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_current_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_current_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."next_project_invoice_internal_folio"() TO "anon";
GRANT ALL ON FUNCTION "public"."next_project_invoice_internal_folio"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_project_invoice_internal_folio"() TO "service_role";



GRANT ALL ON FUNCTION "public"."next_project_profitability_report_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."next_project_profitability_report_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_project_profitability_report_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_project_deliveries_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_project_deliveries_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_project_deliveries_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_project_profitability_reports_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_project_profitability_reports_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_project_profitability_reports_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_project_warranties_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_project_warranties_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_project_warranties_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Projects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Projects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Projects_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cfdi_use_catalog" TO "anon";
GRANT ALL ON TABLE "public"."cfdi_use_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."cfdi_use_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."client_portal_project_access" TO "anon";
GRANT ALL ON TABLE "public"."client_portal_project_access" TO "authenticated";
GRANT ALL ON TABLE "public"."client_portal_project_access" TO "service_role";



GRANT ALL ON SEQUENCE "public"."client_portal_project_access_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."client_portal_project_access_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."client_portal_project_access_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."client_portal_users" TO "anon";
GRANT ALL ON TABLE "public"."client_portal_users" TO "authenticated";
GRANT ALL ON TABLE "public"."client_portal_users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."client_portal_users_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."client_portal_users_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."client_portal_users_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."client_projects" TO "anon";
GRANT ALL ON TABLE "public"."client_projects" TO "authenticated";
GRANT ALL ON TABLE "public"."client_projects" TO "service_role";



GRANT ALL ON SEQUENCE "public"."client_projects_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."client_projects_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."client_projects_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clients_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clients_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clients_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."commercial_partners" TO "anon";
GRANT ALL ON TABLE "public"."commercial_partners" TO "authenticated";
GRANT ALL ON TABLE "public"."commercial_partners" TO "service_role";



GRANT ALL ON SEQUENCE "public"."commercial_partners_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."commercial_partners_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."commercial_partners_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."contractor_account_movements" TO "anon";
GRANT ALL ON TABLE "public"."contractor_account_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."contractor_account_movements" TO "service_role";



GRANT ALL ON SEQUENCE "public"."contractor_account_movements_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."contractor_account_movements_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."contractor_account_movements_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."contractors" TO "anon";
GRANT ALL ON TABLE "public"."contractors" TO "authenticated";
GRANT ALL ON TABLE "public"."contractors" TO "service_role";



GRANT ALL ON SEQUENCE "public"."contractors_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."contractors_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."contractors_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_documents" TO "anon";
GRANT ALL ON TABLE "public"."delivery_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_documents" TO "service_role";



GRANT ALL ON SEQUENCE "public"."delivery_documents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."delivery_documents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."delivery_documents_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."engineering_quotes" TO "anon";
GRANT ALL ON TABLE "public"."engineering_quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."engineering_quotes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."engineering_quotes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."engineering_quotes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."engineering_quotes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."fiscal_document_email_logs" TO "anon";
GRANT ALL ON TABLE "public"."fiscal_document_email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."fiscal_document_email_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."fiscal_document_email_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."fiscal_document_email_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."fiscal_document_email_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."fiscal_regime_catalog" TO "anon";
GRANT ALL ON TABLE "public"."fiscal_regime_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."fiscal_regime_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."installation_evidences" TO "anon";
GRANT ALL ON TABLE "public"."installation_evidences" TO "authenticated";
GRANT ALL ON TABLE "public"."installation_evidences" TO "service_role";



GRANT ALL ON SEQUENCE "public"."installation_evidences_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."installation_evidences_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."installation_evidences_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."installation_orders" TO "anon";
GRANT ALL ON TABLE "public"."installation_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."installation_orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."installation_orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."installation_orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."installation_orders_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."installation_release_request" TO "anon";
GRANT ALL ON TABLE "public"."installation_release_request" TO "authenticated";
GRANT ALL ON TABLE "public"."installation_release_request" TO "service_role";



GRANT ALL ON SEQUENCE "public"."installation_release_request_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."installation_release_request_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."installation_release_request_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_email_logs" TO "anon";
GRANT ALL ON TABLE "public"."invoice_email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_email_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."invoice_email_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoice_email_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."invoice_email_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."labor_activity_catalog" TO "anon";
GRANT ALL ON TABLE "public"."labor_activity_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."labor_activity_catalog" TO "service_role";



GRANT ALL ON SEQUENCE "public"."labor_activity_catalog_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."labor_activity_catalog_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."labor_activity_catalog_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON SEQUENCE "public"."leads_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."leads_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."leads_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notification_events" TO "anon";
GRANT ALL ON TABLE "public"."notification_events" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notification_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notification_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notification_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notification_recipients" TO "anon";
GRANT ALL ON TABLE "public"."notification_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_recipients" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notification_recipients_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notification_recipients_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notification_recipients_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payment_reminders" TO "anon";
GRANT ALL ON TABLE "public"."payment_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_reminders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payment_reminders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payment_reminders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payment_reminders_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_categories" TO "anon";
GRANT ALL ON TABLE "public"."product_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."product_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_tag_assignments" TO "anon";
GRANT ALL ON TABLE "public"."product_tag_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."product_tag_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."product_tags" TO "anon";
GRANT ALL ON TABLE "public"."product_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."product_tags" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_tags_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_tags_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_tags_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."project_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."project_deliveries" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_deliveries_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_deliveries_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_deliveries_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_delivery_email_history" TO "anon";
GRANT ALL ON TABLE "public"."project_delivery_email_history" TO "authenticated";
GRANT ALL ON TABLE "public"."project_delivery_email_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_delivery_email_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_delivery_email_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_delivery_email_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_delivery_evidences" TO "anon";
GRANT ALL ON TABLE "public"."project_delivery_evidences" TO "authenticated";
GRANT ALL ON TABLE "public"."project_delivery_evidences" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_delivery_evidences_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_delivery_evidences_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_delivery_evidences_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_delivery_pending_items" TO "anon";
GRANT ALL ON TABLE "public"."project_delivery_pending_items" TO "authenticated";
GRANT ALL ON TABLE "public"."project_delivery_pending_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_delivery_pending_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_delivery_pending_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_delivery_pending_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_delivery_systems" TO "anon";
GRANT ALL ON TABLE "public"."project_delivery_systems" TO "authenticated";
GRANT ALL ON TABLE "public"."project_delivery_systems" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_delivery_systems_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_delivery_systems_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_delivery_systems_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_invoice_internal_folio_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_invoice_internal_folio_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_invoice_internal_folio_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_invoice_items" TO "anon";
GRANT ALL ON TABLE "public"."project_invoice_items" TO "authenticated";
GRANT ALL ON TABLE "public"."project_invoice_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_invoice_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_invoice_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_invoice_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_invoices" TO "anon";
GRANT ALL ON TABLE "public"."project_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."project_invoices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_invoices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_invoices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_invoices_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_material_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."project_material_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."project_material_deliveries" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_material_deliveries_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_material_deliveries_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_material_deliveries_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_material_delivery_items" TO "anon";
GRANT ALL ON TABLE "public"."project_material_delivery_items" TO "authenticated";
GRANT ALL ON TABLE "public"."project_material_delivery_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_material_delivery_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_material_delivery_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_material_delivery_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_members" TO "anon";
GRANT ALL ON TABLE "public"."project_members" TO "authenticated";
GRANT ALL ON TABLE "public"."project_members" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_members_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_members_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_members_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_operational_item_labor_activities" TO "anon";
GRANT ALL ON TABLE "public"."project_operational_item_labor_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."project_operational_item_labor_activities" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_operational_item_labor_activities_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_operational_item_labor_activities_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_operational_item_labor_activities_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_operational_items" TO "anon";
GRANT ALL ON TABLE "public"."project_operational_items" TO "authenticated";
GRANT ALL ON TABLE "public"."project_operational_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_operational_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_operational_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_operational_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_payment_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."project_payment_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."project_payment_audit_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_payment_audit_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_payment_audit_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_payment_audit_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_payment_complements" TO "anon";
GRANT ALL ON TABLE "public"."project_payment_complements" TO "authenticated";
GRANT ALL ON TABLE "public"."project_payment_complements" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_payment_complements_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_payment_complements_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_payment_complements_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_payments" TO "anon";
GRANT ALL ON TABLE "public"."project_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."project_payments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_payments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_payments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_payments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_photos" TO "anon";
GRANT ALL ON TABLE "public"."project_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."project_photos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_photos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_photos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_photos_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_profitability_report_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_profitability_report_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_profitability_report_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_profitability_reports" TO "anon";
GRANT ALL ON TABLE "public"."project_profitability_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."project_profitability_reports" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_profitability_reports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_profitability_reports_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_profitability_reports_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_purchase_events" TO "anon";
GRANT ALL ON TABLE "public"."project_purchase_events" TO "authenticated";
GRANT ALL ON TABLE "public"."project_purchase_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_purchase_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_purchase_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_purchase_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_purchase_lines" TO "anon";
GRANT ALL ON TABLE "public"."project_purchase_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."project_purchase_lines" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_purchase_lines_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_purchase_lines_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_purchase_lines_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_site_visit_note_photos" TO "anon";
GRANT ALL ON TABLE "public"."project_site_visit_note_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."project_site_visit_note_photos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_site_visit_note_photos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_site_visit_note_photos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_site_visit_note_photos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_site_visit_notes" TO "anon";
GRANT ALL ON TABLE "public"."project_site_visit_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."project_site_visit_notes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_site_visit_notes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_site_visit_notes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_site_visit_notes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_site_visits" TO "anon";
GRANT ALL ON TABLE "public"."project_site_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."project_site_visits" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_site_visits_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_site_visits_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_site_visits_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_translation_changes" TO "anon";
GRANT ALL ON TABLE "public"."project_translation_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."project_translation_changes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_translation_changes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_translation_changes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_translation_changes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_updates" TO "anon";
GRANT ALL ON TABLE "public"."project_updates" TO "authenticated";
GRANT ALL ON TABLE "public"."project_updates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_updates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_updates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_updates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_warranties" TO "anon";
GRANT ALL ON TABLE "public"."project_warranties" TO "authenticated";
GRANT ALL ON TABLE "public"."project_warranties" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_warranties_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_warranties_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_warranties_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."public_document_access_events" TO "anon";
GRANT ALL ON TABLE "public"."public_document_access_events" TO "authenticated";
GRANT ALL ON TABLE "public"."public_document_access_events" TO "service_role";



GRANT ALL ON TABLE "public"."public_document_links" TO "anon";
GRANT ALL ON TABLE "public"."public_document_links" TO "authenticated";
GRANT ALL ON TABLE "public"."public_document_links" TO "service_role";



GRANT ALL ON SEQUENCE "public"."public_document_links_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."public_document_links_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."public_document_links_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_order_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_order_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_order_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_order_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_orders" TO "anon";
GRANT ALL ON TABLE "public"."purchase_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_orders_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quote_approvals" TO "anon";
GRANT ALL ON TABLE "public"."quote_approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_approvals" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_approvals_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_approvals_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_approvals_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quote_groups" TO "anon";
GRANT ALL ON TABLE "public"."quote_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_groups" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_groups_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_groups_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_groups_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quote_item_labor_activities" TO "anon";
GRANT ALL ON TABLE "public"."quote_item_labor_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_item_labor_activities" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_item_labor_activities_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_item_labor_activities_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_item_labor_activities_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quote_items" TO "anon";
GRANT ALL ON TABLE "public"."quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quote_sections" TO "anon";
GRANT ALL ON TABLE "public"."quote_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_sections" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_sections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_sections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_sections_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quote_terms_settings" TO "anon";
GRANT ALL ON TABLE "public"."quote_terms_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_terms_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_terms_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_terms_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_terms_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quotes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quotes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quotes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sat_payment_form_catalog" TO "anon";
GRANT ALL ON TABLE "public"."sat_payment_form_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."sat_payment_form_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."sat_product_service_catalog" TO "anon";
GRANT ALL ON TABLE "public"."sat_product_service_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."sat_product_service_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."sat_unit_catalog" TO "anon";
GRANT ALL ON TABLE "public"."sat_unit_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."sat_unit_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."service_report_email_history" TO "anon";
GRANT ALL ON TABLE "public"."service_report_email_history" TO "authenticated";
GRANT ALL ON TABLE "public"."service_report_email_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."service_report_email_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."service_report_email_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."service_report_email_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."service_report_photos" TO "anon";
GRANT ALL ON TABLE "public"."service_report_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."service_report_photos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."service_report_photos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."service_report_photos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."service_report_photos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."service_reports" TO "anon";
GRANT ALL ON TABLE "public"."service_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."service_reports" TO "service_role";



GRANT ALL ON SEQUENCE "public"."service_reports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."service_reports_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."service_reports_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."subcontractors" TO "anon";
GRANT ALL ON TABLE "public"."subcontractors" TO "authenticated";
GRANT ALL ON TABLE "public"."subcontractors" TO "service_role";



GRANT ALL ON SEQUENCE "public"."subcontractors_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."subcontractors_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."subcontractors_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."tax_object_catalog" TO "anon";
GRANT ALL ON TABLE "public"."tax_object_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_object_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."work_order_activities" TO "anon";
GRANT ALL ON TABLE "public"."work_order_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."work_order_activities" TO "service_role";



GRANT ALL ON SEQUENCE "public"."work_order_activities_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."work_order_activities_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."work_order_activities_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."work_orders" TO "anon";
GRANT ALL ON TABLE "public"."work_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."work_orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."work_orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."work_orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."work_orders_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































