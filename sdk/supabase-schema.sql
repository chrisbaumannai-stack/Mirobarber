-- ============================================
-- MIRO Booking System - Supabase Schema
-- ============================================
-- Run this in your Supabase SQL Editor to set up
-- the database for the booking system.
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Services ──
CREATE TABLE IF NOT EXISTS services (
  id          TEXT PRIMARY KEY DEFAULT 's' || extract(epoch from now())::bigint,
  shop_id     TEXT NOT NULL,
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration    INTEGER NOT NULL DEFAULT 30,
  description TEXT DEFAULT '',
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_services_shop ON services(shop_id);

-- ── Hours ──
CREATE TABLE IF NOT EXISTS hours (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id    TEXT NOT NULL,
  day        INTEGER NOT NULL CHECK (day >= 0 AND day <= 6),
  "open"     BOOLEAN DEFAULT true,
  "from"     TEXT DEFAULT '09:00',
  "to"       TEXT DEFAULT '19:00',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, day)
);

CREATE INDEX idx_hours_shop ON hours(shop_id);

-- ── Appointments ──
CREATE TABLE IF NOT EXISTS appointments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id       TEXT NOT NULL,
  "serviceId"   TEXT NOT NULL REFERENCES services(id) ON DELETE SET NULL,
  "serviceName" TEXT NOT NULL,
  date          DATE NOT NULL,
  time          TEXT NOT NULL,
  "customerName"  TEXT NOT NULL,
  "customerPhone" TEXT DEFAULT '',
  note          TEXT DEFAULT '',
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_appointments_shop ON appointments(shop_id);
CREATE INDEX idx_appointments_date ON appointments(shop_id, date);
CREATE INDEX idx_appointments_status ON appointments(shop_id, status);

-- ── Settings ──
CREATE TABLE IF NOT EXISTS settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         TEXT NOT NULL UNIQUE,
  "shopName"      TEXT DEFAULT 'Barber Shop',
  phone           TEXT DEFAULT '',
  address         TEXT DEFAULT '',
  "slotInterval"  INTEGER DEFAULT 30,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_settings_shop ON settings(shop_id);

-- ── Row Level Security ──
-- Enable RLS on all tables
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public read access for services, hours, settings (needed for booking page)
CREATE POLICY "Public read services" ON services FOR SELECT USING (true);
CREATE POLICY "Public read hours" ON hours FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);

-- Public insert for appointments (customers can book)
CREATE POLICY "Public insert appointments" ON appointments FOR INSERT WITH CHECK (true);

-- Public read appointments (needed for slot availability)
CREATE POLICY "Public read appointments" ON appointments FOR SELECT USING (true);

-- For admin operations, use service_role key or authenticated users
-- These policies allow anon key to do everything (for demo/simple setup)
-- In production, restrict write access to authenticated admin users
CREATE POLICY "Public update services" ON services FOR UPDATE USING (true);
CREATE POLICY "Public delete services" ON services FOR DELETE USING (true);
CREATE POLICY "Public insert services" ON services FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update hours" ON hours FOR UPDATE USING (true);
CREATE POLICY "Public insert hours" ON hours FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update settings" ON settings FOR UPDATE USING (true);
CREATE POLICY "Public insert settings" ON settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update appointments" ON appointments FOR UPDATE USING (true);
CREATE POLICY "Public delete appointments" ON appointments FOR DELETE USING (true);
