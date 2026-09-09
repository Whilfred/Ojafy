-- ============================================
-- MIGRATION : stockage des images en base de données
-- + personnalisation boutique (logo + couleurs)
-- À exécuter une seule fois sur la base Postgres de production
-- ============================================

-- Table de stockage binaire des images (remplace le disque éphémère)
CREATE TABLE IF NOT EXISTS medias (
    id            SERIAL PRIMARY KEY,
    data          BYTEA NOT NULL,
    mimetype      VARCHAR(100) NOT NULL,
    taille        INTEGER NOT NULL,
    nom_original  VARCHAR(255),
    user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medias_user_id ON medias(user_id);

-- Personnalisation boutique : logo + couleurs
ALTER TABLE boutiques ADD COLUMN IF NOT EXISTS logo_media_id INTEGER REFERENCES medias(id) ON DELETE SET NULL;
ALTER TABLE boutiques ADD COLUMN IF NOT EXISTS couleur_primaire   VARCHAR(7) DEFAULT '#1A6BFF';
ALTER TABLE boutiques ADD COLUMN IF NOT EXISTS couleur_secondaire VARCHAR(7) DEFAULT '#14314d';
