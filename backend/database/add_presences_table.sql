-- Migration: Add presences table to existing database
-- Run this SQL to add the presences table

USE qrqc_prod;

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

