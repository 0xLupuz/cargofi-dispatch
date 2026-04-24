-- ============================================================
-- CargoFi Dispatch — Fix RLS (tablas sin Row-Level Security)
-- Ejecutar en Supabase SQL Editor → proyecto cargofi-prod
-- Generado: 2026-03-31
-- ============================================================

-- Tablas de migration_v3 (trailers, customers, factoring_companies)
ALTER TABLE trailers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE factoring_companies  ENABLE ROW LEVEL SECURITY;

-- Tablas de migration_v4 (vendors, items, repair_orders, ro_parts, ro_labor)
ALTER TABLE vendors              ENABLE ROW LEVEL SECURITY;
ALTER TABLE items                ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ro_parts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ro_labor             ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Políticas: solo service_role puede leer/escribir
-- (el backend usa service_role key, nunca el anon key)
-- ============================================================

-- trailers
CREATE POLICY "service_role_all" ON trailers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- customers
CREATE POLICY "service_role_all" ON customers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- factoring_companies
CREATE POLICY "service_role_all" ON factoring_companies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- vendors
CREATE POLICY "service_role_all" ON vendors
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- items
CREATE POLICY "service_role_all" ON items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- repair_orders
CREATE POLICY "service_role_all" ON repair_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ro_parts
CREATE POLICY "service_role_all" ON ro_parts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ro_labor
CREATE POLICY "service_role_all" ON ro_labor
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Verificación: debe devolver 0 tablas sin RLS
-- ============================================================
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename FROM pg_tables
    JOIN pg_class ON pg_class.relname = pg_tables.tablename
    JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
      AND pg_namespace.nspname = 'public'
    WHERE pg_class.relrowsecurity = true
  );
