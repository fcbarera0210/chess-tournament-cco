-- Backup del torneo actual (Neon SQL Editor)
-- Cambia el slug si no es curico-2026

-- Opción A: un solo JSON con todo (copia el resultado y guárdalo en un .json)
SELECT jsonb_pretty(
  jsonb_build_object(
    'exportedAt', to_jsonb(now()),
    'tournament', (
      SELECT to_jsonb(tr)
      FROM tournaments tr
      WHERE tr.slug = 'curico-2026'
    ),
    'players', (
      SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.name), '[]'::jsonb)
      FROM players p
      INNER JOIN tournaments tr ON tr.id = p.tournament_id
      WHERE tr.slug = 'curico-2026'
    ),
    'rounds', (
      SELECT COALESCE(
        jsonb_agg(
          to_jsonb(r) || jsonb_build_object(
            'games',
            (
              SELECT COALESCE(
                jsonb_agg(
                  to_jsonb(g) || jsonb_build_object(
                    'white_name', wp.name,
                    'black_name', bp.name
                  )
                  ORDER BY g.board_number
                ),
                '[]'::jsonb
              )
              FROM games g
              LEFT JOIN players wp ON g.white_player_id = wp.id
              LEFT JOIN players bp ON g.black_player_id = bp.id
              WHERE g.round_id = r.id
            )
          )
          ORDER BY r.round_number
        ),
        '[]'::jsonb
      )
      FROM rounds r
      INNER JOIN tournaments tr ON tr.id = r.tournament_id
      WHERE tr.slug = 'curico-2026'
    )
  )
) AS backup;

-- Opción B: consultas por tabla (más fácil de leer en la consola)

-- SELECT * FROM tournaments WHERE slug = 'curico-2026';

-- SELECT p.*
-- FROM players p
-- INNER JOIN tournaments tr ON tr.id = p.tournament_id
-- WHERE tr.slug = 'curico-2026'
-- ORDER BY p.name;

-- SELECT r.*
-- FROM rounds r
-- INNER JOIN tournaments tr ON tr.id = r.tournament_id
-- WHERE tr.slug = 'curico-2026'
-- ORDER BY r.round_number;

-- SELECT
--   r.round_number,
--   g.board_number,
--   wp.name AS white_name,
--   bp.name AS black_name,
--   g.result,
--   g.is_bye
-- FROM games g
-- INNER JOIN rounds r ON r.id = g.round_id
-- INNER JOIN tournaments tr ON tr.id = r.tournament_id
-- LEFT JOIN players wp ON g.white_player_id = wp.id
-- LEFT JOIN players bp ON g.black_player_id = bp.id
-- WHERE tr.slug = 'curico-2026'
-- ORDER BY r.round_number, g.board_number;
