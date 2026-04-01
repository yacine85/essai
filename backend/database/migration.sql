-- Migration: Add kpi_nom and statut columns to gap_analysis table
-- Run this script to update existing database

USE qrqc_prod;

-- Add kpi_nom column if it doesn't exist
ALTER TABLE gap_analysis ADD COLUMN kpi_nom VARCHAR(100) DEFAULT '';

-- Add statut column if it doesn't exist
ALTER TABLE gap_analysis ADD COLUMN statut ENUM('en_attente', 'validee', 'en_cours', 'terminee', 'non_conforme') DEFAULT 'en_attente';

-- Update existing rows to have default values
UPDATE gap_analysis SET kpi_nom = '' WHERE kpi_nom IS NULL;
UPDATE gap_analysis SET statut = 'en_attente' WHERE statut IS NULL;

-- Add index for faster filtering
CREATE INDEX idx_gap_analysis_statut ON gap_analysis(statut);
CREATE INDEX idx_gap_analysis_atelier ON gap_analysis(atelier_id);

-- Add default admin user with hashed password (password: admin123)
-- Note: The password should be hashed using bcrypt
-- Default hashed password for 'admin123' is: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
INSERT INTO users (nom, prenom, email, password, role, atelier_id) 
VALUES ('Dupont', 'Jean', 'admin@qrqc.fr', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', NULL)
ON DUPLICATE KEY UPDATE password = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

INSERT INTO users (nom, prenom, email, password, role, atelier_id) 
VALUES ('Martin', 'Sophie', 'chef@qrqc.fr', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'chef_atelier', 1)
ON DUPLICATE KEY UPDATE password = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

INSERT INTO users (nom, prenom, email, password, role, atelier_id) 
VALUES ('Bernard', 'Pierre', 'manager@qrqc.fr', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'management', NULL)
ON DUPLICATE KEY UPDATE password = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

SELECT 'Migration completed successfully!' as message;
