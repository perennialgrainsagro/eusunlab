CREATE TABLE IF NOT EXISTS site_content (
  tab text PRIMARY KEY,
  rows jsonb NOT NULL CHECK (jsonb_typeof(rows) = 'array'),
  options jsonb CHECK (options IS NULL OR jsonb_typeof(options) = 'array'),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE site_content ADD COLUMN IF NOT EXISTS options jsonb CHECK (options IS NULL OR jsonb_typeof(options) = 'array');

CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  writer_name text NOT NULL DEFAULT '',
  excerpt text NOT NULL DEFAULT '',
  main_image_url text NOT NULL DEFAULT '',
  main_image_alt text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS blog_posts_published_date ON blog_posts (published_at DESC) WHERE published;

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS writer_name text NOT NULL DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS main_image_url text NOT NULL DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS main_image_alt text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  data bytea NOT NULL CHECK (octet_length(data) <= 3145728),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now()
);
