-- Adiciona coluna de logo na tabela ongs
ALTER TABLE ongs ADD COLUMN logo VARCHAR(255) DEFAULT NULL;
