-- Diagnóstico de integridade (só leitura). Uso: docker compose exec -T db psql -U pedigree -d pedigree < integridade.sql
SELECT (SELECT count(*) FROM usuarios) AS usuarios, (SELECT count(*) FROM pombos) AS pombos,
       (SELECT count(*) FROM resultados) AS resultados, pg_size_pretty(pg_database_size(current_database())) AS tamanho;
-- pombos que são ancestrais de si mesmos (ciclo)
WITH RECURSIVE sobe(origem, atual, prof) AS (
  SELECT p.id, x.par, 1 FROM pombos p CROSS JOIN LATERAL unnest(ARRAY[p.pai_id, p.mae_id]) AS x(par) WHERE x.par IS NOT NULL
  UNION ALL
  SELECT s.origem, x.par, s.prof + 1 FROM sobe s JOIN pombos p ON p.id = s.atual
  CROSS JOIN LATERAL unnest(ARRAY[p.pai_id, p.mae_id]) AS x(par)
  WHERE x.par IS NOT NULL AND s.prof < 40 AND s.atual <> s.origem
)
SELECT count(DISTINCT origem) AS pombos_em_ciclo FROM sobe WHERE atual = origem;
-- pai fêmea / mãe macho
SELECT count(*) FILTER (WHERE pai.sexo = 'F') AS pai_femea, count(*) FILTER (WHERE mae.sexo = 'M') AS mae_macho
FROM pombos p LEFT JOIN pombos pai ON pai.id = p.pai_id LEFT JOIN pombos mae ON mae.id = p.mae_id;
-- vínculos que cruzam plantéis (não deveriam existir)
SELECT count(*) AS vinculos_entre_planteis FROM pombos p JOIN pombos x ON x.id IN (p.pai_id, p.mae_id) WHERE x.usuario_id <> p.usuario_id;
