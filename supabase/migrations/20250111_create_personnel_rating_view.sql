-- View to aggregate personnel ratings for sorting
-- This view allows sorting personnel by their average rating on the backend
create or replace view personnel_with_rating as
select 
  p.*,
  coalesce(avg(fr.rating), 0) as average_rating
from personnel p
left join freelancer_ratings fr on p.id = fr.freelancer_id
group by p.id;

-- Grant access to authenticated users
grant select on personnel_with_rating to authenticated;
