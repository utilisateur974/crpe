PRAGMA foreign_keys = ON;

CREATE TABLE domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('sage', 'terracotta', 'blue')),
  note TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  page_count INTEGER NOT NULL CHECK (page_count > 0)
);

CREATE TABLE chapters (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  section TEXT NOT NULL,
  position INTEGER NOT NULL,
  UNIQUE (domain_id, title)
);

CREATE TABLE definitions (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL REFERENCES chapters(id),
  concept TEXT NOT NULL CHECK (length(trim(concept)) > 0),
  definition TEXT NOT NULL CHECK (length(trim(definition)) > 0),
  source_id TEXT NOT NULL REFERENCES sources(id),
  source_page INTEGER NOT NULL CHECK (source_page > 0),
  source_item INTEGER NOT NULL CHECK (source_item > 0),
  source_excerpt TEXT NOT NULL,
  review_note TEXT,
  position INTEGER NOT NULL,
  UNIQUE (chapter_id, concept)
);

CREATE INDEX idx_definitions_chapter ON definitions(chapter_id, position);
CREATE INDEX idx_chapters_domain ON chapters(domain_id, position);

-- Aucun distracteur n’est créé automatiquement à partir des définitions.
CREATE TABLE quiz_distractors (
  definition_id TEXT NOT NULL REFERENCES definitions(id),
  distractor_id TEXT NOT NULL REFERENCES definitions(id),
  position INTEGER NOT NULL,
  PRIMARY KEY (definition_id, distractor_id),
  CHECK (definition_id <> distractor_id)
);

-- Vue de consultation avec les trois champs demandés et leur provenance.
CREATE VIEW definition_catalog AS
SELECT d.id, c.domain_id, c.title AS chapter_title, c.section,
       d.concept, d.definition, s.title AS source_title,
       d.source_page, d.source_excerpt, d.review_note,
       c.position AS chapter_position, d.position
FROM definitions d
JOIN chapters c ON c.id = d.chapter_id
JOIN sources s ON s.id = d.source_id;

PRAGMA user_version = 1;
