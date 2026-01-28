-- Insert a test Zone (Building A)
insert into public.zones (name, type, total_floors, gate_x, gate_y)
values ('Building A', 'building', 1, 100, 100)
returning id;

-- Insert some test Spots for the Zone (Assuming Zone ID is 1, change if needed)
-- Note: In a real script we might use a variable, but for Supabase Editor, we can assuming ID 1 if it's the first run, or subquery.

insert into public.spots (zone_id, spot_number, floor_level, status, x_coord, y_coord)
values 
  ((select id from public.zones where name='Building A' limit 1), 'A-01', 0, 0, 10, 10), -- Available
  ((select id from public.zones where name='Building A' limit 1), 'A-02', 0, 1, 10, 20), -- Reserved
  ((select id from public.zones where name='Building A' limit 1), 'A-03', 0, 2, 10, 30), -- Occupied
  ((select id from public.zones where name='Building A' limit 1), 'A-04', 0, 0, 10, 40),
  ((select id from public.zones where name='Building A' limit 1), 'A-05', 0, 0, 10, 50);
