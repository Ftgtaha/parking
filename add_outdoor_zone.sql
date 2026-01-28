-- Insert the Outdoor Zone if it doesn't exist
insert into public.zones (id, name, type, total_floors, gate_x, gate_y)
values (2, 'Outdoor Gate C', 'outdoor', 1, 100, 100)
on conflict (id) do nothing;

-- Just to be safe, let's add one test spot there so you can see it works
insert into public.spots (zone_id, spot_number, floor_level, status, x_coord, y_coord)
values 
  (2, 'Test-01', 0, 0, 50, 50)
on conflict do nothing;
