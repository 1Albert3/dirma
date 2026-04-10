INSERT IGNORE INTO migrations (migration, batch) VALUES
  ('2025_01_01_000003_create_documents_table', 2),
  ('2026_03_21_115235_create_personal_access_tokens_table', 2);

CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL UNIQUE,
  `abilities` text,
  `last_used_at` timestamp NULL,
  `expires_at` timestamp NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  INDEX `pat_tokenable_index` (`tokenable_type`, `tokenable_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `verifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `document_id` bigint unsigned NOT NULL,
  `etudiant_id` bigint unsigned NOT NULL,
  `score_local` double NULL,
  `score_ia` double NULL,
  `score_web` double NULL,
  `score_global` double NULL,
  `details_local` json NULL,
  `details_ia` json NULL,
  `details_web` json NULL,
  `passages_suspects` json NULL,
  `statut` enum('en_cours','termine','erreur') NOT NULL DEFAULT 'en_cours',
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`etudiant_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sources_plagiat` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `verification_id` bigint unsigned NOT NULL,
  `type` enum('local','web') NOT NULL,
  `url` varchar(255) NULL,
  `document_ref` varchar(255) NULL,
  `taux_similarite` double NOT NULL,
  `passage_original` text NULL,
  `passage_source` text NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`verification_id`) REFERENCES `verifications`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `decisions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `decideur_id` bigint unsigned NOT NULL,
  `decidable_type` varchar(255) NOT NULL,
  `decidable_id` bigint unsigned NOT NULL,
  `type_decideur` enum('chef_departement','directeur_adjoint') NOT NULL,
  `decision` enum('valide','rejete') NOT NULL,
  `motif` text NULL,
  `note_officielle` text NULL,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  INDEX `decisions_poly_index` (`decidable_type`, `decidable_id`),
  FOREIGN KEY (`decideur_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications_dirma` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `destinataire_id` bigint unsigned NOT NULL,
  `titre` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','succes','avertissement','erreur') NOT NULL DEFAULT 'info',
  `lien` varchar(255) NULL,
  `lu` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  FOREIGN KEY (`destinataire_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO migrations (migration, batch) VALUES
  ('2025_01_01_000004_create_verifications_table', 2),
  ('2025_01_01_000005_create_sources_plagiat_table', 2),
  ('2025_01_01_000006_create_decisions_table', 2),
  ('2025_01_01_000007_create_notifications_dirma_table', 2);
