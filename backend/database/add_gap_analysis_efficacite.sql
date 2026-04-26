-- Migration: add efficacite workflow to gap_analysis
-- Run this script once on existing databases

USE qrqc_prod;

-- 1) Add efficacite column if missing
SET @has_efficacite := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'gap_analysis'
    AND COLUMN_NAME = 'efficacite'
);

SET @sql_add_efficacite := IF(
  @has_efficacite = 0,
  'ALTER TABLE gap_analysis ADD COLUMN efficacite TINYINT NULL AFTER statut',
  'SELECT "efficacite already exists"'
);
PREPARE stmt FROM @sql_add_efficacite;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Ensure status enum contains cloture_valide
ALTER TABLE gap_analysis
MODIFY COLUMN statut ENUM('en_attente', 'en_cours', 'refuse', 'cloture', 'cloture_valide') DEFAULT 'en_attente';

-- 3) Auto-fix historical closed actions with existing efficacite
UPDATE gap_analysis
SET statut = 'cloture_valide'
WHERE statut = 'cloture'
  AND efficacite IN (0, 1);

SELECT 'gap_analysis efficacite migration completed' AS message;
