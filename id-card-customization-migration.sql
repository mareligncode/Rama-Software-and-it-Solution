-- ID Card Customization Migration for Rama Software
-- Run this in your Supabase SQL Editor
-- This migration adds additional customization options for ID cards

-- Add new columns to company_settings table
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS id_card_font_family text DEFAULT 'sans-serif',
ADD COLUMN IF NOT EXISTS id_card_font_size text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS id_card_qr_code_size numeric DEFAULT 90,
ADD COLUMN IF NOT EXISTS id_card_border_radius numeric DEFAULT 16,
ADD COLUMN IF NOT EXISTS id_card_card_width numeric DEFAULT 350,
ADD COLUMN IF NOT EXISTS id_card_card_height numeric DEFAULT 550,
ADD COLUMN IF NOT EXISTS id_card_header_height numeric DEFAULT 144,
ADD COLUMN IF NOT EXISTS id_card_show_phone boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS id_card_show_department boolean DEFAULT true;
