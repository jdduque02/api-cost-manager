-- ============================================================
-- SCHEMA COMPLETO: api-cost-manager
-- Base de datos: PostgreSQL 16
-- Generado: 2026-07-26
-- Total: 7 schemas, 5 enums, 17 tablas
-- ============================================================
-- USO:
--   psql -U <usuario> -d <database> -f schema.sql
-- ============================================================

-- ============================================================
-- 0. EXTENSIONES NECESARIAS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. SCHEMAS
-- ============================================================
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS banking;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS intelligence;
CREATE SCHEMA IF NOT EXISTS news;

-- ============================================================
-- 2. TIPOS ENUM
-- ============================================================

-- transaction_type_enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type_enum') THEN
    CREATE TYPE transaction_type_enum AS ENUM ('income', 'expense');
  END IF;
END
$$;

-- payment_method_enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
    CREATE TYPE payment_method_enum AS ENUM (
      'bank_transfer', 'cash', 'debit_card', 'credit_card',
      'digital_wallet', 'mobile_payment', 'check', 'crypto'
    );
  END IF;
END
$$;

-- financial_objective_type_enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financial_objective_type_enum') THEN
    CREATE TYPE financial_objective_type_enum AS ENUM ('loan', 'savings', 'goal');
  END IF;
END
$$;

-- frequency_enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'frequency_enum') THEN
    CREATE TYPE frequency_enum AS ENUM (
      'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
    );
  ELSE
    -- Agregar 'biweekly' si no existe
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'frequency_enum' AND e.enumlabel = 'biweekly'
    ) THEN
      ALTER TYPE frequency_enum ADD VALUE 'biweekly' BEFORE 'monthly';
    END IF;
  END IF;
END
$$;

-- audit_action_enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action_enum') THEN
    CREATE TYPE audit_action_enum AS ENUM ('INSERT', 'UPDATE', 'DELETE');
  END IF;
END
$$;

-- ============================================================
-- 3. SCHEMA: identity
-- ============================================================

-- ── identity.app_user ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS identity.app_user (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_id            VARCHAR(36)   UNIQUE,
  username               CITEXT        NOT NULL UNIQUE,
  email                  CITEXT        NOT NULL UNIQUE,
  locale                 VARCHAR(10)   NOT NULL DEFAULT 'es-CO',
  timezone               VARCHAR(50)   NOT NULL DEFAULT 'America/Bogota',
  metadata               JSONB         NOT NULL DEFAULT '{}',
  created_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP,
  deleted_at             TIMESTAMP,
  is_active              BOOLEAN       NOT NULL DEFAULT TRUE,
  -- Campos sensibles (encriptados con AES-256-GCM en capa de servicio)
  phone                  VARCHAR(500),
  address                VARCHAR(1000),
  full_name              VARCHAR(500),
  document_id            VARCHAR(500),
  -- FK inversa para OneToOne con financial_profile
  financial_profile_id   BIGINT
);

CREATE INDEX IF NOT EXISTS idx_user_external_id ON identity.app_user (external_id);
CREATE INDEX IF NOT EXISTS idx_user_email       ON identity.app_user (email);
CREATE INDEX IF NOT EXISTS idx_user_active      ON identity.app_user (is_active);

COMMENT ON TABLE  identity.app_user IS 'Usuarios de la plataforma. Datos sensibles cifrados con AES-256-GCM.';
COMMENT ON COLUMN identity.app_user.phone       IS 'Telefono cifrado (AES-256-GCM)';
COMMENT ON COLUMN identity.app_user.address     IS 'Direccion cifrada (AES-256-GCM)';
COMMENT ON COLUMN identity.app_user.full_name   IS 'Nombre completo cifrado (AES-256-GCM)';
COMMENT ON COLUMN identity.app_user.document_id IS 'Documento de identidad cifrado (AES-256-GCM)';

-- ── identity.financial_profile ──────────────────────────────
CREATE TABLE IF NOT EXISTS identity.financial_profile (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           BIGINT        NOT NULL,
  profile_name      VARCHAR(50)   NOT NULL DEFAULT '50-30-20',
  is_custom         BOOLEAN       NOT NULL DEFAULT FALSE,
  needs_ratio       NUMERIC(5,2)  NOT NULL DEFAULT 50,
  wants_ratio       NUMERIC(5,2)  NOT NULL DEFAULT 30,
  savings_ratio     NUMERIC(5,2)  NOT NULL DEFAULT 20,
  max_debt_ratio    NUMERIC(5,2)  NOT NULL DEFAULT 40,
  metadata          JSONB         NOT NULL DEFAULT '{}',
  monthly_income    VARCHAR(500),   -- Encriptado (AES-256-GCM)
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP,

  CONSTRAINT ck_ratios_positive
    CHECK (needs_ratio >= 0 AND wants_ratio >= 0 AND savings_ratio >= 0),
  CONSTRAINT ck_ratios_max
    CHECK ((needs_ratio + wants_ratio + savings_ratio) <= 100.00),

  CONSTRAINT fk_financial_profile_user
    FOREIGN KEY (user_id) REFERENCES identity.app_user(id) ON DELETE CASCADE
);

COMMENT ON TABLE  identity.financial_profile IS 'Perfiles financieros (50-30-20, personalizados). Relacion 1:1 con app_user.';
COMMENT ON COLUMN identity.financial_profile.monthly_income IS 'Ingreso mensual cifrado (AES-256-GCM)';

-- FK bidireccional OneToOne: app_user.financial_profile_id
ALTER TABLE identity.app_user
  ADD CONSTRAINT fk_app_user_financial_profile
  FOREIGN KEY (financial_profile_id) REFERENCES identity.financial_profile(id)
  ON DELETE SET NULL;

-- ============================================================
-- 4. SCHEMA: finance
-- ============================================================

-- ── finance.transaction_record (PARTICIONADA por RANGE trimestral) ──
CREATE TABLE IF NOT EXISTS finance.transaction_record (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id               BIGINT                  NOT NULL,
  category_id           BIGINT                  NOT NULL,
  subcategory_id        BIGINT,
  type                  transaction_type_enum   NOT NULL,
  amount                NUMERIC(15,2)           NOT NULL,
  payment_method        payment_method_enum,
  description           TEXT,
  reference_code        VARCHAR(100),
  attachments           TEXT[]                  DEFAULT '{}',
  source_account        VARCHAR(100),
  destination_account   VARCHAR(100),
  source_bank           VARCHAR(100),
  destination_bank      VARCHAR(100),
  addressee             VARCHAR(200),
  created_at            TIMESTAMP               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP,
  deleted_at            TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Particiones trimestrales (ejemplo: Q1-Q4 2026)
CREATE TABLE IF NOT EXISTS finance.transaction_record_2026_q1
  PARTITION OF finance.transaction_record
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

CREATE TABLE IF NOT EXISTS finance.transaction_record_2026_q2
  PARTITION OF finance.transaction_record
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

CREATE TABLE IF NOT EXISTS finance.transaction_record_2026_q3
  PARTITION OF finance.transaction_record
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

CREATE TABLE IF NOT EXISTS finance.transaction_record_2026_q4
  PARTITION OF finance.transaction_record
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

CREATE INDEX IF NOT EXISTS idx_transaction_user         ON finance.transaction_record (user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_user_created ON finance.transaction_record (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transaction_category     ON finance.transaction_record (category_id);
CREATE INDEX IF NOT EXISTS idx_transaction_type         ON finance.transaction_record (type);

COMMENT ON TABLE finance.transaction_record IS 'Registro de transacciones particionado por trimestre. SIEMPRE incluir created_at en WHERE.';

-- ── finance.objective_payment ───────────────────────────────
CREATE TABLE IF NOT EXISTS finance.objective_payment (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  objective_id    BIGINT          NOT NULL,
  user_id         BIGINT          NOT NULL,
  amount          NUMERIC(15,2)   NOT NULL,
  payment_date    DATE            NOT NULL,
  note            TEXT,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_objective_payment_objective ON finance.objective_payment (objective_id);
CREATE INDEX IF NOT EXISTS idx_objective_payment_user      ON finance.objective_payment (user_id);

-- ── finance.notification ────────────────────────────────────
CREATE TABLE IF NOT EXISTS finance.notification (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         BIGINT          NOT NULL,
  title           VARCHAR(100)    NOT NULL,
  description     TEXT,
  is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
  scheduled_at    TIMESTAMP,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_user   ON finance.notification (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_unread ON finance.notification (is_read) WHERE is_read = FALSE;

-- ── finance.financial_period ────────────────────────────────
CREATE TABLE IF NOT EXISTS finance.financial_period (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         BIGINT          NOT NULL,
  year            SMALLINT        NOT NULL,
  month           SMALLINT        NOT NULL,
  is_closed       BOOLEAN         NOT NULL DEFAULT FALSE,
  closed_at       TIMESTAMP,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_financial_period_user_year_month UNIQUE (user_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_financial_period_user ON finance.financial_period (user_id);

-- ── finance.financial_objective ─────────────────────────────
CREATE TABLE IF NOT EXISTS finance.financial_objective (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                 BIGINT                            NOT NULL,
  category_id             BIGINT,
  subcategory_id          BIGINT,
  name                    VARCHAR(200)                      NOT NULL,
  type                    financial_objective_type_enum     NOT NULL,
  target_amount           NUMERIC(15,2)                     NOT NULL,
  current_balance         NUMERIC(15,2)                     NOT NULL DEFAULT 0,
  interest_rate           NUMERIC(5,2),
  fees                    NUMERIC(15,2),
  monthly_payment         NUMERIC(15,2),
  owner                   VARCHAR(100),
  bank                    VARCHAR(500),                       -- Encriptado (AES-256-GCM)
  current_profitability   NUMERIC(5,2),
  frequency               frequency_enum,
  due_day                 SMALLINT,
  start_date              DATE,
  end_date                DATE,
  is_completed            BOOLEAN         NOT NULL DEFAULT FALSE,
  quota_calculation       JSONB,
  completed_at            TIMESTAMP,
  created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TIMESTAMP,
  deleted_at              TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_financial_objective_user ON finance.financial_objective (user_id);
CREATE INDEX IF NOT EXISTS idx_financial_objective_type ON finance.financial_objective (type);

COMMENT ON COLUMN finance.financial_objective.bank                  IS 'Banco cifrado (AES-256-GCM)';
COMMENT ON COLUMN finance.financial_objective.current_profitability  IS 'Rentabilidad anual vigente (ej: 11.50 = 11.5%)';
COMMENT ON COLUMN finance.financial_objective.quota_calculation     IS 'Resultado del ultimo calculo de cuota (reference, no creado)';

-- ============================================================
-- 5. SCHEMA: banking
-- ============================================================

-- ── banking.bank_account ────────────────────────────────────
CREATE TABLE IF NOT EXISTS banking.bank_account (
  id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                    BIGINT      NOT NULL,
  bank_name                  VARCHAR(100) NOT NULL,
  account_type               VARCHAR(50)  NOT NULL,
  encrypted_account_number   BYTEA       NOT NULL,   -- pgp_sym_encrypt
  encrypted_balance          BYTEA       NOT NULL,   -- pgp_sym_encrypt
  is_primary                 BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at                 TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 TIMESTAMP,
  deleted_at                 TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bank_account_user    ON banking.bank_account (user_id);
CREATE INDEX IF NOT EXISTS idx_bank_account_primary ON banking.bank_account (is_primary);

COMMENT ON TABLE  banking.bank_account IS 'Cuentas bancarias. Datos sensibles cifrados con pgcrypto (pgp_sym_encrypt).';
COMMENT ON COLUMN banking.bank_account.encrypted_account_number IS 'Numero de cuenta cifrado con pgp_sym_encrypt';
COMMENT ON COLUMN banking.bank_account.encrypted_balance        IS 'Saldo cifrado con pgp_sym_encrypt';

-- ── banking.financial_asset ─────────────────────────────────
CREATE TABLE IF NOT EXISTS banking.financial_asset (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         BIGINT          NOT NULL,
  asset_type      VARCHAR(50)     NOT NULL,
  name            VARCHAR(100)    NOT NULL,
  current_value   NUMERIC(15,2)   NOT NULL,
  currency        VARCHAR(3)      NOT NULL DEFAULT 'COP',
  encrypted_data  BYTEA,          -- pgp_sym_encrypt
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP,
  deleted_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_financial_asset_user ON banking.financial_asset (user_id);
CREATE INDEX IF NOT EXISTS idx_financial_asset_type ON banking.financial_asset (asset_type);

COMMENT ON TABLE  banking.financial_asset IS 'Activos financieros. Datos cifrados con pgcrypto.';
COMMENT ON COLUMN banking.financial_asset.encrypted_data IS 'Datos adicionales cifrados con pgp_sym_encrypt';

-- ── banking.financial_liability ─────────────────────────────
CREATE TABLE IF NOT EXISTS banking.financial_liability (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           BIGINT          NOT NULL,
  liability_type    VARCHAR(50)     NOT NULL,
  name              VARCHAR(100)    NOT NULL,
  current_balance   NUMERIC(15,2)   NOT NULL,
  interest_rate     NUMERIC(5,2),
  currency          VARCHAR(3)      NOT NULL DEFAULT 'COP',
  encrypted_data    BYTEA,          -- pgp_sym_encrypt
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP,
  deleted_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_financial_liability_user ON banking.financial_liability (user_id);
CREATE INDEX IF NOT EXISTS idx_financial_liability_type ON banking.financial_liability (liability_type);

COMMENT ON TABLE  banking.financial_liability IS 'Pasivos financieros. Datos cifrados con pgcrypto.';
COMMENT ON COLUMN banking.financial_liability.encrypted_data IS 'Datos adicionales cifrados con pgp_sym_encrypt';

-- ============================================================
-- 6. SCHEMA: audit
-- ============================================================

-- ── audit.audit_log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit.audit_log (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  schema_name   TEXT              NOT NULL,
  table_name    TEXT              NOT NULL,
  record_id     BIGINT            NOT NULL,
  action        audit_action_enum NOT NULL,
  old_data      JSONB,
  new_data      JSONB,
  changed_by    BIGINT,           -- NULL = proceso automatizado (trigger)
  created_at    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_schema_table ON audit.audit_log (schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record       ON audit.audit_log (record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by   ON audit.audit_log (changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at   ON audit.audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action       ON audit.audit_log (action);

COMMENT ON TABLE audit.audit_log IS 'Registro de auditoria. changed_by NULL indica trigger automatico.';

-- ============================================================
-- 7. SCHEMA: catalog
-- ============================================================

-- ── catalog.category ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalog.category (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          VARCHAR(100)    NOT NULL,
  group_type    transaction_type_enum NOT NULL,
  icon_key      VARCHAR(50),
  color_hex     VARCHAR(7),
  sort_order    INT             NOT NULL DEFAULT 0,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP,
  is_active     BOOLEAN         NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_category_group_type ON catalog.category (group_type);
CREATE INDEX IF NOT EXISTS idx_category_active     ON catalog.category (is_active);

-- ── catalog.subcategory ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS catalog.subcategory (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id   BIGINT          NOT NULL,
  user_id       BIGINT          NOT NULL,
  name          VARCHAR(100)    NOT NULL,
  icon_key      VARCHAR(50),
  color_hex     VARCHAR(7),
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP,
  is_active     BOOLEAN         NOT NULL DEFAULT TRUE,

  CONSTRAINT uq_subcategory_user_category_name UNIQUE (user_id, category_id, name),
  CONSTRAINT fk_subcategory_category
    FOREIGN KEY (category_id) REFERENCES catalog.category(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_subcategory_category ON catalog.subcategory (category_id);
CREATE INDEX IF NOT EXISTS idx_subcategory_user     ON catalog.subcategory (user_id);

-- ============================================================
-- 8. SCHEMA: intelligence
-- ============================================================

-- ── intelligence.financial_summary ──────────────────────────
CREATE TABLE IF NOT EXISTS intelligence.financial_summary (
  id                        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id                   BIGINT        NOT NULL,
  financial_period_id       BIGINT        NOT NULL,
  profile_id                BIGINT        NOT NULL,
  total_income              NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_expense             NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_debt                NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_worth                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  expense_ratio             NUMERIC(5,2),
  debt_ratio                NUMERIC(5,2),
  savings_rate              NUMERIC(5,2),
  recommended_max_expense   NUMERIC(15,2),
  recommended_savings       NUMERIC(15,2),
  is_over_spending          BOOLEAN       NOT NULL DEFAULT FALSE,
  is_over_indebted          BOOLEAN       NOT NULL DEFAULT FALSE,
  insights                  JSONB         DEFAULT '[]',
  calculated_at             TIMESTAMP,
  is_final                  BOOLEAN       NOT NULL DEFAULT FALSE,
  deleted_at                TIMESTAMP,

  CONSTRAINT uq_financial_summary_user_period UNIQUE (user_id, financial_period_id)
);

CREATE INDEX IF NOT EXISTS idx_financial_summary_user   ON intelligence.financial_summary (user_id);
CREATE INDEX IF NOT EXISTS idx_financial_summary_period ON intelligence.financial_summary (financial_period_id);
CREATE INDEX IF NOT EXISTS idx_financial_summary_final  ON intelligence.financial_summary (is_final);

COMMENT ON TABLE intelligence.financial_summary IS 'Resumen financiero mensual. Registros con is_final=TRUE no deben recalcularse.';

-- ── intelligence.summary_category_breakdown ─────────────────
CREATE TABLE IF NOT EXISTS intelligence.summary_category_breakdown (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  summary_id            BIGINT        NOT NULL,
  category_id           BIGINT        NOT NULL,
  total_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  transaction_count     INT           NOT NULL DEFAULT 0,
  percentage_of_income  NUMERIC(5,2),
  optimum_percentage    NUMERIC(5,2),
  is_over_budget        BOOLEAN       NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_summary_breakdown_summary  ON intelligence.summary_category_breakdown (summary_id);
CREATE INDEX IF NOT EXISTS idx_summary_breakdown_category ON intelligence.summary_category_breakdown (category_id);

-- ── intelligence.tax_summary ────────────────────────────────
CREATE TABLE IF NOT EXISTS intelligence.tax_summary (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           BIGINT          NOT NULL,
  fiscal_year       SMALLINT        NOT NULL,
  total_income      NUMERIC(15,2)   NOT NULL DEFAULT 0,
  total_assets      NUMERIC(15,2)   NOT NULL DEFAULT 0,
  total_liabilities NUMERIC(15,2)   NOT NULL DEFAULT 0,
  patrimony         NUMERIC(15,2)   GENERATED ALWAYS AS (total_assets - total_liabilities) STORED,
  income_in_uvt     NUMERIC(10,4)   GENERATED ALWAYS AS (
                      CASE WHEN uvt_value > 0 THEN total_income / uvt_value ELSE 0 END
                    ) STORED,
  assets_in_uvt     NUMERIC(10,4)   GENERATED ALWAYS AS (
                      CASE WHEN uvt_value > 0 THEN total_assets / uvt_value ELSE 0 END
                    ) STORED,
  uvt_value         NUMERIC(10,2)   NOT NULL,
  must_declare      BOOLEAN         NOT NULL DEFAULT FALSE,
  estimated_tax     NUMERIC(15,2),
  calculation_notes JSONB           DEFAULT '{}',
  created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_tax_summary_user_fiscal_year UNIQUE (user_id, fiscal_year)
);

CREATE INDEX IF NOT EXISTS idx_tax_summary_user        ON intelligence.tax_summary (user_id);
CREATE INDEX IF NOT EXISTS idx_tax_summary_fiscal_year ON intelligence.tax_summary (fiscal_year);

COMMENT ON TABLE  intelligence.tax_summary IS 'Resumen fiscal anual con columnas GENERATED STORED.';
COMMENT ON COLUMN intelligence.tax_summary.patrimony     IS 'GENERATED: total_assets - total_liabilities';
COMMENT ON COLUMN intelligence.tax_summary.income_in_uvt IS 'GENERATED: total_income / uvt_value';
COMMENT ON COLUMN intelligence.tax_summary.assets_in_uvt IS 'GENERATED: total_assets / uvt_value';

-- ============================================================
-- 9. SCHEMA: news
-- ============================================================

-- ── news.news_item ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news.news_item (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title         VARCHAR(300)    NOT NULL,
  summary       TEXT            NOT NULL,
  content       TEXT,
  category      VARCHAR(100),
  image_url     VARCHAR(1000),
  link          VARCHAR(1000),
  published_at  TIMESTAMP,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_news_item_title        ON news.news_item (title);
CREATE INDEX IF NOT EXISTS idx_news_item_category     ON news.news_item (category);
CREATE INDEX IF NOT EXISTS idx_news_item_published_at ON news.news_item (published_at DESC NULLS LAST);

COMMENT ON TABLE news.news_item IS 'Noticias y contenido informativo del sistema.';

-- ============================================================
-- FIN DEL SCHEMA
-- ============================================================
