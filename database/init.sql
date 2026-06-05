CREATE EXTENSION IF NOT EXISTS postgis;

DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS airports;

CREATE TABLE airports (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL
);

CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    origin_code VARCHAR(3) NOT NULL,
    destination_code VARCHAR(3) NOT NULL,
    distance_km NUMERIC(10,2),

    CONSTRAINT fk_origin
        FOREIGN KEY (origin_code)
        REFERENCES airports(code),

    CONSTRAINT fk_destination
        FOREIGN KEY (destination_code)
        REFERENCES airports(code)
);

INSERT INTO airports (code, name, city, location) VALUES
('GRU', 'Aeroporto Internacional de Guarulhos', 'São Paulo',
    ST_GeogFromText('POINT(-46.4731 -23.4356)')),

('GIG', 'Aeroporto Internacional do Galeão', 'Rio de Janeiro',
    ST_GeogFromText('POINT(-43.2436 -22.8099)')),

('BSB', 'Aeroporto Internacional de Brasília', 'Brasília',
    ST_GeogFromText('POINT(-47.9139 -15.8711)')),

('SSA', 'Aeroporto Internacional de Salvador', 'Salvador',
    ST_GeogFromText('POINT(-38.3324 -12.9086)')),

('FOR', 'Aeroporto Internacional de Fortaleza', 'Fortaleza',
    ST_GeogFromText('POINT(-38.5326 -3.7762)')),

('MAO', 'Aeroporto Internacional de Manaus',
    'Manaus',
    ST_GeogFromText('POINT(-60.0491 -3.0386)'));

-- Rotas principais do grafo
INSERT INTO routes
(origin_code, destination_code, distance_km)

SELECT
    origem.code,
    destino.code,
    ROUND(
        (
            ST_Distance(
                origem.location,
                destino.location
            ) / 1000
        )::numeric,
        2
    )

FROM airports origem
JOIN airports destino ON

    (origem.code = 'GRU' AND destino.code = 'GIG')
 OR (origem.code = 'GRU' AND destino.code = 'BSB')
 OR (origem.code = 'GIG' AND destino.code = 'SSA')
 OR (origem.code = 'SSA' AND destino.code = 'FOR')
 OR (origem.code = 'BSB' AND destino.code = 'FOR')
 OR (origem.code = 'FOR' AND destino.code = 'MAO');

-- Rotas de retorno para representar grafo não direcionado
INSERT INTO routes (origin_code, destination_code, distance_km)
SELECT 
    destination_code,
    origin_code,
    distance_km
FROM routes;