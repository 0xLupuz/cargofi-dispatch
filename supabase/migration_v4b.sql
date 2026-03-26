-- ============================================================
-- CargoFi Dispatch — Migration v4b
-- Add missing fields to vendors and items (from AllwaysTrack screenshots)
-- ============================================================

-- VENDORS: add is_repair_shop, address2, toll_free, fax, telephone_ext
alter table vendors add column if not exists address2       text;
alter table vendors add column if not exists telephone_ext  text;
alter table vendors add column if not exists toll_free      text;
alter table vendors add column if not exists fax            text;
alter table vendors add column if not exists is_repair_shop boolean default false;

-- ITEMS: add whole_qty (when true = integer qty only; when false = allow decimals)
alter table items add column if not exists whole_qty boolean default true;
