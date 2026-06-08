-- CamSoft CRM schema + schemas auxiliares para Evolution y n8n

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS evolution;
CREATE SCHEMA IF NOT EXISTS n8n;

-- Contactos (web o WhatsApp)
CREATE TABLE IF NOT EXISTS contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200),
    email           VARCHAR(320),
    phone           VARCHAR(32),
    company         VARCHAR(200),
    source          VARCHAR(32) NOT NULL DEFAULT 'web'
                    CHECK (source IN ('web', 'whatsapp', 'manual')),
  external_id     VARCHAR(128),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_phone ON contacts (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_external ON contacts (source, external_id);

-- Conversaciones
CREATE TABLE IF NOT EXISTS conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    channel         VARCHAR(32) NOT NULL DEFAULT 'web'
                    CHECK (channel IN ('web', 'whatsapp')),
    status          VARCHAR(32) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'waiting', 'closed')),
    visitor_token   VARCHAR(64),
    assigned_to     VARCHAR(120),
    last_message_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations (contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations (status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_visitor ON conversations (visitor_token) WHERE visitor_token IS NOT NULL;

-- Mensajes
CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    author_type     VARCHAR(16) NOT NULL
                    CHECK (author_type IN ('visitor', 'bot', 'agent', 'system')),
    body            TEXT NOT NULL,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, created_at);

-- Leads CRM
CREATE TABLE IF NOT EXISTS leads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id      UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    stage           VARCHAR(32) NOT NULL DEFAULT 'new'
                    CHECK (stage IN ('new', 'contacted', 'proposal', 'won', 'lost')),
    sector          VARCHAR(64),
    score           INT NOT NULL DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads (stage, updated_at DESC);

-- FAQs del bot (editables desde CRM)
CREATE TABLE IF NOT EXISTS bot_faqs (
    id              SERIAL PRIMARY KEY,
    trigger_key     VARCHAR(64) NOT NULL UNIQUE,
    question        TEXT NOT NULL,
    answer          TEXT NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT TRUE
);

-- Usuario admin (contraseña bcrypt en API al primer arranque)
CREATE TABLE IF NOT EXISTS admin_users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(320) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(120) NOT NULL DEFAULT 'Admin',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configuración clave-valor
CREATE TABLE IF NOT EXISTS settings (
    key             VARCHAR(64) PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FAQs iniciales CamSoft
INSERT INTO bot_faqs (trigger_key, question, answer, sort_order) VALUES
('greeting', 'saludo', 'Hola, soy el asistente de CamSoft (Milton Narvaez). ¿En qué sector necesitas apoyo: público, salud, educación u otro?', 1),
('public', 'sector público', 'Desarrollamos portales gubernamentales, transparencia, PQRSD y gestión documental. ¿Tienes plazo definido para el proyecto?', 2),
('health', 'sector salud', 'Trabajamos historias clínicas, citas, farmacia y telemedicina. Cuéntame el alcance que tienes en mente.', 3),
('education', 'sector educación', 'Plataformas LMS, matrículas, evaluaciones y bibliotecas digitales. ¿Buscas MVP o migración de un sistema actual?', 4),
('human', 'hablar con humano', 'Perfecto. Un asesor revisará tu mensaje pronto. También puedes escribir por WhatsApp desde este mismo chat si lo prefieres.', 5),
('contact', 'contacto', 'Correo: nf_alejo@yahoo.com · Tel: +57 317 374 2174. Respuesta habitual en 24–48 h hábiles.', 6)
ON CONFLICT (trigger_key) DO NOTHING;

INSERT INTO settings (key, value) VALUES
('evolution_instance', 'camsoft'),
('whatsapp_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
