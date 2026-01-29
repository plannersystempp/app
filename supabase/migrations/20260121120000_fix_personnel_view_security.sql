-- Fix security definer issue by explicitly setting security_invoker = true
-- This ensures the view respects RLS policies of the underlying tables
create or replace view personnel_with_rating 
with (security_invoker = true)
as
select 
  p.*,
  coalesce(avg(fr.rating), 0) as average_rating
from personnel p
left join freelancer_ratings fr on p.id = fr.freelancer_id
group by p.id;

-- Re-grant access just in case
grant select on personnel_with_rating to authenticated;
