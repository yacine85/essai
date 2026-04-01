-- Migration: enforce service-based ownership for Plan d'actions
-- This migration does three things:
-- 1) Adds a mandatory service_code on gap_analysis
-- 2) Normalizes old statuses to the new workflow statuses
-- 3) Rebuilds pilot links so each action is tied to principal + secondary reps of the service

USE qrqc_prod;

-- 1) Add service_code if missing
ALTER TABLE gap_analysis
ADD COLUMN service_code ENUM('test', 'maintenance', 'depannage', 'info_trace', 'qualite', 'logistique', 'cms2', 'methode', 'process', 'integration') NULL;

-- 2) Backfill service_code using assigned pilots first
UPDATE gap_analysis ga
JOIN (
  SELECT
    gap.gap_analysis_id,
    CASE
      WHEN u.role IN ('pilote_test', 'pilote_test_sec') THEN 'test'
      WHEN u.role IN ('pilote_maintenance', 'pilote_maintenance_sec') THEN 'maintenance'
      WHEN u.role IN ('pilote_depannage', 'pilote_depannage_sec') THEN 'depannage'
      WHEN u.role IN ('pilote_info_trace', 'pilote_info_trace_sec') THEN 'info_trace'
      WHEN u.role IN ('pilote_qualite', 'pilote_qualite_sec') THEN 'qualite'
      WHEN u.role IN ('pilote_logistique', 'pilote_logistique_sec') THEN 'logistique'
      WHEN u.role IN ('pilote_cms2', 'pilote_cms2_sec') THEN 'cms2'
      WHEN u.role IN ('pilote_methode', 'pilote_methode_sec') THEN 'methode'
      WHEN u.role IN ('pilote_process', 'pilote_process_sec') THEN 'process'
      WHEN u.role IN ('pilote_integration', 'pilote_integration_sec') THEN 'integration'
      ELSE NULL
    END AS inferred_service
  FROM gap_analysis_pilots gap
  JOIN users u ON u.id = gap.pilot_id
) mapped ON mapped.gap_analysis_id = ga.id
SET ga.service_code = mapped.inferred_service
WHERE ga.service_code IS NULL
  AND mapped.inferred_service IS NOT NULL;

-- Fallback mapping when legacy actions have no pilot link
UPDATE gap_analysis
SET service_code = CASE
  WHEN atelier_id = 1 THEN 'cms2'
  WHEN atelier_id = 2 THEN 'integration'
  ELSE 'test'
END
WHERE service_code IS NULL;

-- 3) Normalize statuses from old enum values
UPDATE gap_analysis
SET statut = CASE statut
  WHEN 'validee' THEN 'en_cours'
  WHEN 'terminee' THEN 'cloture'
  WHEN 'non_conforme' THEN 'refuse'
  ELSE statut
END;

-- 4) Make status enum match workflow
ALTER TABLE gap_analysis
MODIFY COLUMN statut ENUM('en_attente', 'en_cours', 'refuse', 'cloture') NOT NULL DEFAULT 'en_attente';

-- 5) Make service_code mandatory
ALTER TABLE gap_analysis
MODIFY COLUMN service_code ENUM('test', 'maintenance', 'depannage', 'info_trace', 'qualite', 'logistique', 'cms2', 'methode', 'process', 'integration') NOT NULL;

-- 6) Rebuild representative links according to service_code
DELETE FROM gap_analysis_pilots;

INSERT INTO gap_analysis_pilots (gap_analysis_id, pilot_id)
SELECT ga.id, u.id
FROM gap_analysis ga
JOIN users u ON (
  (ga.service_code = 'test' AND u.role IN ('pilote_test', 'pilote_test_sec')) OR
  (ga.service_code = 'maintenance' AND u.role IN ('pilote_maintenance', 'pilote_maintenance_sec')) OR
  (ga.service_code = 'depannage' AND u.role IN ('pilote_depannage', 'pilote_depannage_sec')) OR
  (ga.service_code = 'info_trace' AND u.role IN ('pilote_info_trace', 'pilote_info_trace_sec')) OR
  (ga.service_code = 'qualite' AND u.role IN ('pilote_qualite', 'pilote_qualite_sec')) OR
  (ga.service_code = 'logistique' AND u.role IN ('pilote_logistique', 'pilote_logistique_sec')) OR
  (ga.service_code = 'cms2' AND u.role IN ('pilote_cms2', 'pilote_cms2_sec')) OR
  (ga.service_code = 'methode' AND u.role IN ('pilote_methode', 'pilote_methode_sec')) OR
  (ga.service_code = 'process' AND u.role IN ('pilote_process', 'pilote_process_sec')) OR
  (ga.service_code = 'integration' AND u.role IN ('pilote_integration', 'pilote_integration_sec'))
);

-- Optional checks
-- SELECT service_code, COUNT(*) FROM gap_analysis GROUP BY service_code;
-- SELECT statut, COUNT(*) FROM gap_analysis GROUP BY statut;
