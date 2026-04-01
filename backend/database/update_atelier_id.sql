-- Script pour assigner atelier_id aux représentants selon leur rôle
-- CMS 2 = id 1, Intégration = id 2

-- Représentants CMS 2
UPDATE users SET atelier_id = 1 WHERE role = 'pilote_cms2';
UPDATE users SET atelier_id = 1 WHERE role = 'pilote_cms2_sec';

-- Représentants Intégration
UPDATE users SET atelier_id = 2 WHERE role = 'pilote_integration';
UPDATE users SET atelier_id = 2 WHERE role = 'pilote_integration_sec';

-- Représentants Test (à assigner selon votre organisation)
-- UPDATE users SET atelier_id = 1 WHERE role = 'pilote_test';
-- UPDATE users SET atelier_id = 1 WHERE role = 'pilote_test_sec';

-- Représentants Maintenance (à assigner selon votre organisation)
-- UPDATE users SET atelier_id = 1 WHERE role = 'pilote_maintenance';
-- UPDATE users SET atelier_id = 1 WHERE role = 'pilote_maintenance_sec';

-- Représentants Dépannage (à assigner selon votre organisation)
-- UPDATE users SET atelier_id = 1 WHERE role = 'pilote_depannage';
-- UPDATE users SET atelier_id = 1 WHERE role = 'pilote_depannage_sec';

-- Représentants Qualité (à assigner selon votre organisation)
-- UPDATE users SET atelier_id = 1 WHERE role = 'pilote_qualite';
-- UPDATE users SET atelier_id = 1 WHERE role = 'pilote_qualite_sec';

-- Représentants Logistique (à assigner selon votre organisation)
-- UPDATE users SET atelier_id = 1 WHERE role = 'pilote_logistique';
-- UPDATE users SET atelier_id = 1 WHERE role = 'pilote_logistique_sec';

-- Représentants Méthode (à assigner selon votre organisation)
-- UPDATE users SET atelier_id = 1 WHERE role = 'pilote_methode';
-- UPDATE users SET atelier_id = 1 WHERE role = 'pilote_methode_sec';

-- Représentants Process (à assigner selon votre organisation)
-- UPDATE users SET atelier_id = 1 WHERE role = 'pilote_process';
-- UPDATE users SET atelier_id = 1 WHERE role = 'pilote_process_sec';

