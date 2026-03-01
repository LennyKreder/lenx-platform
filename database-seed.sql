-- Seed data for lbl-website
-- Run this AFTER database-schema.sql

-- Languages (required for foreign key constraints)
INSERT INTO "language" ("id", "name", "nativeName", "isActive", "sortOrder") VALUES
('en', 'English', 'English', true, 1),
('nl', 'Dutch', 'Nederlands', true, 2),
('de', 'German', 'Deutsch', true, 3),
('fr', 'French', 'Français', true, 4),
('es', 'Spanish', 'Español', true, 5),
('it', 'Italian', 'Italiano', true, 6);
