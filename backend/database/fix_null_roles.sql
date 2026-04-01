-- Fix NULL roles in users table
-- Safe one-time migration for existing NULL roles

USE qrqc_prod;

UPDATE users SET role = 'chef_atelier' WHERE role IS NULL;

ALTER TABLE users
MODIFY COLUMN role ENUM('admin', 'chef_atelier', 'management',
	'pilote_test', 'pilote_test_sec',
	'pilote_maintenance', 'pilote_maintenance_sec',
	'pilote_depannage', 'pilote_depannage_sec',
	'pilote_info_trace', 'pilote_info_trace_sec',
	'pilote_qualite', 'pilote_qualite_sec',
	'pilote_logistique', 'pilote_logistique_sec',
	'pilote_cms2', 'pilote_cms2_sec',
	'pilote_methode', 'pilote_methode_sec',
	'pilote_process', 'pilote_process_sec',
	'pilote_integration', 'pilote_integration_sec') NOT NULL DEFAULT 'chef_atelier';

-- Verification queries (uncomment to run)
-- SELECT COUNT(*) as null_count FROM users WHERE role IS NULL;
-- SELECT role, COUNT(*) FROM users GROUP BY role ORDER BY count DESC;

