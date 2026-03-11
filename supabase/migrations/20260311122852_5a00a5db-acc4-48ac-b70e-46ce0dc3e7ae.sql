
-- Table to track proof video requests between boss and workers/tenants
CREATE TABLE public.video_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  requested_from uuid,
  target_role text NOT NULL DEFAULT 'worker',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);

ALTER TABLE public.video_requests ENABLE ROW LEVEL SECURITY;

-- Members can view video requests for their business
CREATE POLICY "Members can view video requests"
  ON public.video_requests FOR SELECT TO public
  USING (is_business_member(auth.uid(), business_id) OR requested_from = auth.uid());

-- Owner/admin can create video requests
CREATE POLICY "Owner/admin can create video requests"
  ON public.video_requests FOR INSERT TO public
  WITH CHECK (is_owner_or_admin(auth.uid(), business_id));

-- Members can update video requests (to mark as recording/completed)
CREATE POLICY "Members can update video requests"
  ON public.video_requests FOR UPDATE TO public
  USING (is_business_member(auth.uid(), business_id) OR requested_from = auth.uid());

-- Owner can delete video requests
CREATE POLICY "Owner can delete video requests"
  ON public.video_requests FOR DELETE TO public
  USING (is_owner_or_admin(auth.uid(), business_id));

-- Enable realtime for video requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_requests;
