-- Bot robusto: tipos menu | keyword | fallback + sector + palabras clave

ALTER TABLE bot_faqs ADD COLUMN IF NOT EXISTS faq_type VARCHAR(16) NOT NULL DEFAULT 'menu';
ALTER TABLE bot_faqs ADD COLUMN IF NOT EXISTS sector VARCHAR(32);
ALTER TABLE bot_faqs ADD COLUMN IF NOT EXISTS keywords TEXT;

UPDATE bot_faqs SET faq_type = 'menu' WHERE faq_type IS NULL OR faq_type = '';

CREATE INDEX IF NOT EXISTS idx_bot_faqs_type ON bot_faqs (faq_type, active);
CREATE INDEX IF NOT EXISTS idx_bot_faqs_sector ON bot_faqs (sector) WHERE sector IS NOT NULL;
