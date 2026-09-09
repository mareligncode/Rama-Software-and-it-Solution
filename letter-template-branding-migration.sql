-- Add branding and customization fields to letter_templates table
ALTER TABLE letter_templates 
ADD COLUMN IF NOT EXISTS header_color VARCHAR(50) DEFAULT '#1e40af',
ADD COLUMN IF NOT EXISTS footer_color VARCHAR(50) DEFAULT '#1e40af',
ADD COLUMN IF NOT EXISTS accent_color VARCHAR(50) DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS text_color VARCHAR(50) DEFAULT '#1f2937',
ADD COLUMN IF NOT EXISTS background_color VARCHAR(50) DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
ADD COLUMN IF NOT EXISTS show_qr_code BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS qr_code_content TEXT,
ADD COLUMN IF NOT EXISTS show_company_info BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS header_text TEXT,
ADD COLUMN IF NOT EXISTS footer_text TEXT,
ADD COLUMN IF NOT EXISTS font_family VARCHAR(50) DEFAULT 'Arial',
ADD COLUMN IF NOT EXISTS font_size INT DEFAULT 12,
ADD COLUMN IF NOT EXISTS margin_top INT DEFAULT 40,
ADD COLUMN IF NOT EXISTS margin_bottom INT DEFAULT 40,
ADD COLUMN IF NOT EXISTS margin_left INT DEFAULT 40,
ADD COLUMN IF NOT EXISTS margin_right INT DEFAULT 40;

-- Add company manager and contacts to company_settings table
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS manager_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS manager_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS manager_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS manager_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_fax VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_website VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_registration_number VARCHAR(50);

-- Add recipient details to generated_letters table
ALTER TABLE generated_letters
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS recipient_address TEXT,
ADD COLUMN IF NOT EXISTS recipient_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS recipient_country VARCHAR(100),
ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS letter_date DATE,
ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);
