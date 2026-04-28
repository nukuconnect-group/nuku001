UPDATE public.formations f
SET summary = sub.combined
FROM (
  SELECT formation_id, string_agg(title || ' — ' || COALESCE(description, ''), E'\n\n' ORDER BY sort_order) AS combined
  FROM public.formation_modules
  GROUP BY formation_id
) sub
WHERE f.id = sub.formation_id
  AND (f.summary IS NULL OR f.summary = '');