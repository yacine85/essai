-- Migration: Add Multi-Pilot Support for Gap Analysis Actions
-- Step 1 of TODO.md

-- 1. Create junction table
CREATE TABLE IF NOT EXISTS `gap_analysis_pilots` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `gap_analysis_id` INT NOT NULL,
  `pilot_id` INT NOT NULL,
  `assigned_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_gap_analysis` (`gap_analysis_id`),
  INDEX `idx_pilot` (`pilot_id`),
  FOREIGN KEY (`gap_analysis_id`) REFERENCES `gap_analysis`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`pilot_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_pilot_per_action` (`gap_analysis_id`, `pilot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Migrate existing single pilot assignments
INSERT IGNORE INTO `gap_analysis_pilots` (`gap_analysis_id`, `pilot_id`)
SELECT `id`, `pilot_id` 
FROM `gap_analysis` 
WHERE `pilot_id` IS NOT NULL;

-- 3. Make original pilot_id nullable (legacy support)
ALTER TABLE `gap_analysis` MODIFY COLUMN `pilot_id` INT NULL;

-- Verify migration
SELECT 
  ga.id as action_id,
  COUNT(gap.pilot_id) as pilot_count,
  GROUP_CONCAT(u.prenom, ' ', u.nom SEPARATOR ', ') as pilots
FROM gap_analysis ga
LEFT JOIN gap_analysis_pilots gap ON ga.id = gap.gap_analysis_id
LEFT JOIN users u ON gap.pilot_id = u.id
GROUP BY ga.id
ORDER BY ga.id DESC
LIMIT 10;

-- Migration complete! Ready for backend code updates.

