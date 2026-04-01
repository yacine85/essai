-- Migration: Add action notification history for Plan d'Actions email tracking

USE qrqc_prod;

CREATE TABLE IF NOT EXISTS action_notification_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gap_analysis_id INT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  recipient_user_id INT NULL,
  recipient_email VARCHAR(255) NULL,
  recipient_role VARCHAR(64) NULL,
  send_status VARCHAR(32) NOT NULL,
  error_message TEXT NULL,
  triggered_by INT NULL,
  payload JSON NULL,
  sent_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_action_notification_gap (gap_analysis_id),
  INDEX idx_action_notification_created_at (created_at),
  FOREIGN KEY (gap_analysis_id) REFERENCES gap_analysis(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
