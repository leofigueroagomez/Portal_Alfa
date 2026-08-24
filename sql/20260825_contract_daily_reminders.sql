-- Migration: 20260825_contract_daily_reminders.sql
-- Add reminder tracking columns to project_contracts for automated daily onboarding & signature follow-up

ALTER TABLE public.project_contracts
ADD COLUMN IF NOT EXISTS last_onboarding_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_reminders_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_signing_reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signing_reminders_count INTEGER NOT NULL DEFAULT 0;
