USE qrqc_prod;

-- 1) Add persistent color per production line
ALTER TABLE lignes
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) NULL;

-- Backfill existing lines with deterministic palette
SET @palette_1 = '#1f77b4';
SET @palette_2 = '#ff7f0e';
SET @palette_3 = '#2ca02c';
SET @palette_4 = '#d62728';
SET @palette_5 = '#9467bd';
SET @palette_6 = '#8c564b';
SET @palette_7 = '#e377c2';
SET @palette_8 = '#7f7f7f';
SET @palette_9 = '#bcbd22';
SET @palette_10 = '#17becf';

SET @rank := 0;
UPDATE lignes
SET color = CASE ((@rank := @rank + 1) - 1) % 10
  WHEN 0 THEN @palette_1
  WHEN 1 THEN @palette_2
  WHEN 2 THEN @palette_3
  WHEN 3 THEN @palette_4
  WHEN 4 THEN @palette_5
  WHEN 5 THEN @palette_6
  WHEN 6 THEN @palette_7
  WHEN 7 THEN @palette_8
  WHEN 8 THEN @palette_9
  ELSE @palette_10
END
WHERE color IS NULL
ORDER BY atelier_id, id;

ALTER TABLE lignes
  MODIFY COLUMN color VARCHAR(7) NOT NULL DEFAULT '#1f77b4';

-- 2) Dynamic KPI configuration per atelier
CREATE TABLE IF NOT EXISTS kpi_definitions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  atelier_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  objective DECIMAL(10,2) NOT NULL DEFAULT 0,
  alert_threshold DECIMAL(10,2) NOT NULL DEFAULT 0,
  inverse BOOLEAN NOT NULL DEFAULT FALSE,
  unit VARCHAR(20) NOT NULL DEFAULT '%',
  sort_order INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_kpi_per_atelier (atelier_id, name),
  CONSTRAINT fk_kpi_def_atelier FOREIGN KEY (atelier_id) REFERENCES ateliers(id) ON DELETE CASCADE
);

-- 3) Dynamic KPI values per date/line/kpi
CREATE TABLE IF NOT EXISTS kpi_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  atelier_id INT NOT NULL,
  ligne_id INT NOT NULL,
  kpi_id INT NOT NULL,
  value DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_kpi_value_unique (date, atelier_id, ligne_id, kpi_id),
  INDEX idx_kpi_values_date (date),
  INDEX idx_kpi_values_atelier (atelier_id),
  INDEX idx_kpi_values_ligne (ligne_id),
  INDEX idx_kpi_values_kpi (kpi_id),
  CONSTRAINT fk_kpi_values_atelier FOREIGN KEY (atelier_id) REFERENCES ateliers(id) ON DELETE CASCADE,
  CONSTRAINT fk_kpi_values_ligne FOREIGN KEY (ligne_id) REFERENCES lignes(id) ON DELETE CASCADE,
  CONSTRAINT fk_kpi_values_kpi FOREIGN KEY (kpi_id) REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  CONSTRAINT fk_kpi_values_user FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 4) Seed default KPI definitions for CMS2 / Integration only if missing
INSERT INTO kpi_definitions (atelier_id, name, objective, alert_threshold, inverse, unit, sort_order)
SELECT a.id, t.name, t.objective, t.alert_threshold, t.inverse, t.unit, t.sort_order
FROM ateliers a
JOIN (
  SELECT 'TRG' AS name, 95.00 AS objective, 90.00 AS alert_threshold, 0 AS inverse, '%' AS unit, 1 AS sort_order
  UNION ALL SELECT 'FOR', 95.00, 90.00, 0, '%', 2
  UNION ALL SELECT 'FPY', 98.00, 95.00, 0, '%', 3
  UNION ALL SELECT 'Qtés', 1000.00, 800.00, 0, '', 4
  UNION ALL SELECT 'DMH', 8.00, 10.00, 1, 'h', 5
) t
WHERE (a.nom LIKE '%CMS%' OR a.nom LIKE '%Intégr%')
  AND NOT EXISTS (
    SELECT 1
    FROM kpi_definitions kd
    WHERE kd.atelier_id = a.id AND kd.name = t.name
  );
