-- Carnet de voyage : un enregistrement = une fiche (trajet, hôtel, note, envie, profil…)
CREATE TABLE IF NOT EXISTS records (
  space      TEXT    NOT NULL,   -- empreinte SHA-256 du code du carnet
  id         TEXT    NOT NULL,
  data       TEXT    NOT NULL,   -- la fiche en JSON
  updated_at INTEGER NOT NULL,   -- horodatage de la modif (téléphone)
  rev        INTEGER NOT NULL,   -- horodatage de réception (serveur)
  PRIMARY KEY (space, id)
);
CREATE INDEX IF NOT EXISTS idx_records_rev ON records (space, rev);

-- Photos des souvenirs (une ligne par photo, 2 Mo max)
CREATE TABLE IF NOT EXISTS photos (
  space   TEXT    NOT NULL,
  id      TEXT    NOT NULL,
  mime    TEXT    NOT NULL,
  data    BLOB    NOT NULL,
  size    INTEGER NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (space, id)
);

-- Compteurs de place des photos (créée automatiquement au premier envoi, ici pour info)
--   k = 'r2' : total R2 · 'total' : total D1 · 's:<carnet>' : place utilisée par un carnet
CREATE TABLE IF NOT EXISTS photo_stats (k TEXT PRIMARY KEY, v INTEGER NOT NULL);
