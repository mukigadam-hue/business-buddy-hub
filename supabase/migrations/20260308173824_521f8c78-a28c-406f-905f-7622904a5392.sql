
-- Reviews/comments table for business discovery
CREATE TABLE public.business_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  comment text NOT NULL DEFAULT '',
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view reviews
CREATE POLICY "Anyone can view reviews"
  ON public.business_reviews FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can add reviews
CREATE POLICY "Authenticated users can add reviews"
  ON public.business_reviews FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- Users can update own reviews
CREATE POLICY "Users can update own reviews"
  ON public.business_reviews FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid());

-- Users can delete own reviews
CREATE POLICY "Users can delete own reviews"
  ON public.business_reviews FOR DELETE
  TO authenticated
  USING (reviewer_id = auth.uid());

-- Review likes table
CREATE TABLE public.review_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.business_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
  ON public.review_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add likes"
  ON public.review_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own likes"
  ON public.review_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to get public products for a business (retail prices only)
CREATE OR REPLACE FUNCTION public.get_business_public_products(_business_id uuid, _limit int DEFAULT 50)
RETURNS TABLE(
  id uuid,
  name text,
  category text,
  quality text,
  retail_price numeric,
  quantity integer,
  image_url_1 text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.id, s.name, s.category, s.quality, s.retail_price, s.quantity, s.image_url_1
  FROM public.stock_items s
  WHERE s.business_id = _business_id AND s.deleted_at IS NULL
  ORDER BY s.name ASC
  LIMIT _limit;
$$;

-- Function to get reviews with reviewer info
CREATE OR REPLACE FUNCTION public.get_business_reviews(_business_id uuid, _limit int DEFAULT 50, _offset int DEFAULT 0)
RETURNS TABLE(
  id uuid,
  reviewer_id uuid,
  reviewer_name text,
  rating integer,
  comment text,
  likes_count integer,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT r.id, r.reviewer_id, COALESCE(p.full_name, 'Anonymous'), r.rating, r.comment, r.likes_count, r.created_at
  FROM public.business_reviews r
  LEFT JOIN public.profiles p ON p.id = r.reviewer_id
  WHERE r.business_id = _business_id
  ORDER BY r.created_at DESC
  LIMIT _limit OFFSET _offset;
$$;
