-- Remplacement demandé des tables littéraires et de leur vue dépendante.
DROP VIEW literary_reference_catalog;
DROP TABLE literary_reference_themes;
DROP TABLE literary_references;
DROP TABLE literary_sources;

CREATE TABLE literary_sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  sheet_count INTEGER NOT NULL CHECK (sheet_count > 0)
);

CREATE TABLE literary_references (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id),
  source_id TEXT NOT NULL REFERENCES literary_sources(id),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  creator TEXT NOT NULL CHECK (length(trim(creator)) > 0),
  publication_date TEXT NOT NULL,
  reference_text TEXT NOT NULL CHECK (length(trim(reference_text)) > 0),
  analysis_text TEXT CHECK (analysis_text IS NULL OR length(trim(analysis_text)) > 0),
  excerpt_text TEXT,
  excerpt_source TEXT,
  source_reference TEXT NOT NULL,
  source_text TEXT,
  source_themes TEXT,
  sheet_name TEXT NOT NULL,
  source_row INTEGER NOT NULL CHECK (source_row > 1),
  position INTEGER NOT NULL,
  UNIQUE (source_id, sheet_name, source_row)
);

CREATE TABLE literary_reference_themes (
  reference_id TEXT NOT NULL REFERENCES literary_references(id),
  theme TEXT NOT NULL CHECK (length(trim(theme)) > 0),
  position INTEGER NOT NULL,
  PRIMARY KEY (reference_id, theme)
);

CREATE INDEX idx_literary_references_domain ON literary_references(domain_id, position);

CREATE VIEW literary_reference_catalog AS
SELECT r.*, s.title AS source_title, s.filename AS source_filename,
       CASE WHEN r.analysis_text IS NOT NULL AND length(trim(COALESCE(r.source_text, ''))) > 0
         THEN 1 ELSE 0 END AS is_complete,
       CASE WHEN r.excerpt_text IS NULL OR r.excerpt_text LIKE 'À compléter%' THEN 'missing'
         WHEN r.excerpt_text LIKE 'Aucun locuteur%' THEN 'not-applicable'
         ELSE 'provided' END AS excerpt_status
FROM literary_references r
JOIN literary_sources s ON s.id = r.source_id;

PRAGMA user_version = 3;
