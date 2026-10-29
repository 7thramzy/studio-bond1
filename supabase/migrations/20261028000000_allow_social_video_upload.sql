-- Permit generated social MP4 files in the existing public media bucket.
-- Keep the existing 30 MiB bucket limit and all previously allowed content types.
UPDATE storage.buckets
SET allowed_mime_types = CASE
  WHEN allowed_mime_types IS NULL THEN ARRAY['video/mp4']::text[]
  WHEN 'video/mp4' = ANY (allowed_mime_types) THEN allowed_mime_types
  ELSE array_append(allowed_mime_types, 'video/mp4')
END
WHERE id = 'orchest-media';
