-- QRQC Production Management Database Schema
-- MySQL

-- Create database
CREATE DATABASE IF NOT EXISTS qrqc_prod;
USE qrqc_prod;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'chef_atelier', 'management', 
        'pilote_test', 'pilote_test_sec',
        'pilote_maintenance', 'pilote_maintenance_sec',
        'pilote_depannage', 'pilote_depannage_sec',
        'pilote_info_trace', 'pilote_info_trace_sec',
        'pilote_qualite', 'pilote_qualite_sec',
        'pilote_logistique', 'pilote_logistique_sec',
        'pilote_cms2', 'pilote_cms2_sec',
        'pilote_methode', 'pilote_methode_sec',
        'pilote_process', 'pilote_process_sec',
        'pilote_integration', 'pilote_integration_sec') NOT NULL DEFAULT 'chef_atelier',
    atelier_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Ateliers table
CREATE TABLE IF NOT EXISTS ateliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lignes table
CREATE TABLE IF NOT EXISTS lignes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    atelier_id INT NOT NULL,
    nom VARCHAR(100) NOT NULL,
    FOREIGN KEY (atelier_id) REFERENCES ateliers(id) ON DELETE CASCADE
);

-- Production table
CREATE TABLE IF NOT EXISTS production (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    atelier_id INT NOT NULL,
    ligne_id INT NOT NULL,
    objectif INT NOT NULL,
    realise INT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (atelier_id) REFERENCES ateliers(id),
    FOREIGN KEY (ligne_id) REFERENCES lignes(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Arrets table (stops)
CREATE TABLE IF NOT EXISTS arrets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    atelier_id INT NOT NULL,
    ligne_id INT NOT NULL,
    duree INT NOT NULL, -- in minutes
    cause VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (atelier_id) REFERENCES ateliers(id),
    FOREIGN KEY (ligne_id) REFERENCES lignes(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Qualite table
CREATE TABLE IF NOT EXISTS qualite (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    atelier_id INT NOT NULL,
    ligne_id INT NOT NULL,
    taux_non_conformite DECIMAL(5,2) DEFAULT 0,
    fpy DECIMAL(5,2) DEFAULT 0,
    fpy_ict DECIMAL(5,2) DEFAULT 0,
    fpy_wc DECIMAL(5,2) DEFAULT 0,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (atelier_id) REFERENCES ateliers(id),
    FOREIGN KEY (ligne_id) REFERENCES lignes(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Effectifs table
CREATE TABLE IF NOT EXISTS effectif (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    atelier_id INT NOT NULL,
    ligne_id INT NOT NULL,
    nombre_operateurs INT NOT NULL,
    nombre_techniciens INT NOT NULL,
    dmh DECIMAL(5,2) DEFAULT 0, -- Durée moyenne de travail
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (atelier_id) REFERENCES ateliers(id),
    FOREIGN KEY (ligne_id) REFERENCES lignes(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    atelier_id INT NOT NULL,
    ligne_id INT NOT NULL,
    description TEXT NOT NULL,
    type ENUM('technique', 'qualite', 'securite', 'it', 'autre') NOT NULL,
    statut ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    priorite ENUM('basse', 'moyenne', 'haute', 'critique') DEFAULT 'moyenne',
    created_by INT NOT NULL,
    resolved_by INT DEFAULT NULL,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (atelier_id) REFERENCES ateliers(id),
    FOREIGN KEY (ligne_id) REFERENCES lignes(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id)
);

-- Indicateurs table (for KPI tracking)
CREATE TABLE IF NOT EXISTS indicateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    atelier_id INT NOT NULL,
    ligne_id INT NOT NULL,
    trg DECIMAL(5,2) DEFAULT 0,
    trs DECIMAL(5,2) DEFAULT 0,
    form DECIMAL(5,2) DEFAULT 0,
    encours_pannes INT DEFAULT 0,
    incident_it INT DEFAULT 0,
    qrqc_score DECIMAL(5,2) DEFAULT 0,
    score_5s DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (atelier_id) REFERENCES ateliers(id),
    FOREIGN KEY (ligne_id) REFERENCES lignes(id)
);

-- Gap Analysis table
CREATE TABLE IF NOT EXISTS gap_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    atelier_id INT NOT NULL,
    ligne_id INT NOT NULL,
    kpi_nom VARCHAR(100) DEFAULT '',
    ecart DECIMAL(5,2) NOT NULL,
    causes TEXT,
    actions TEXT,
    impact DECIMAL(5,2) DEFAULT 0,
    service_code ENUM('test', 'maintenance', 'depannage', 'info_trace', 'qualite', 'logistique', 'cms2', 'methode', 'process', 'integration') NOT NULL,
    pilot_id INT,
    deadline DATE,
    realise BOOLEAN DEFAULT FALSE,
    statut ENUM('en_attente', 'en_cours', 'refuse', 'cloture') DEFAULT 'en_attente',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (atelier_id) REFERENCES ateliers(id),
    FOREIGN KEY (ligne_id) REFERENCES lignes(id),
    FOREIGN KEY (pilot_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- BBS (Bon de Sortie) table
CREATE TABLE IF NOT EXISTS bbs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    atelier_id INT NOT NULL,
    type ENUM('maintenance', 'depanage', 'autre') NOT NULL,
    valeur DECIMAL(10,2) DEFAULT 0,
    description TEXT,
    statut ENUM('en_cours', 'termine') DEFAULT 'en_cours',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (atelier_id) REFERENCES ateliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    table_name VARCHAR(100),
    record_id INT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Presence tracking table for daily meetings
CREATE TABLE IF NOT EXISTS presences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    present BOOLEAN DEFAULT FALSE,
    arrive_heure TIME,
    commentaires TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_user_date (user_id, date)
);

-- Insert default data
INSERT INTO ateliers (nom, description) VALUES 
('CMS 2', 'Atelier CMS 2 - Production cartes électroniques'),
('Intégration', 'Atelier Intégration - Montage final');

INSERT INTO lignes (atelier_id, nom) VALUES 
(1, 'EE PRO'),
(1, 'Cabro'),
(1, 'W1000'),
(2, 'EE'),
(2, 'W4000'),
(2, 'OTII');

INSERT INTO users (nom, prenom, email, password, role, atelier_id) VALUES 
('Dupont', 'Jean', 'admin@qrqc.fr', 'admin123', 'admin', NULL),
('Martin', 'Sophie', 'chef@qrqc.fr', 'chef123', 'chef_atelier', 1),
('Bernard', 'Pierre', 'manager@qrqc.fr', 'manager123', 'management', NULL);

