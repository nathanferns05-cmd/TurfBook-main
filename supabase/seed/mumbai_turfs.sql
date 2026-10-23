-- 30 demo turfs across Mumbai's Western line stations.
-- Owner and UPI id are copied from the first turf already in the table, so every
-- demo listing belongs to that admin and any test payment goes to their own UPI.
-- No photos are set; listings show a placeholder until a photo is added in the admin form.
with owner as (
  select owner_id, upi_id from public.turfs order by created_at limit 1
)
insert into public.turfs (
  name, sport, location, address, description,
  price_per_hour, evening_price, evening_start_hour, advance_percent,
  open_hour, close_hour, amenities, is_active,
  owner_id, upi_id, payee_name, image_url
)
select
  v.name, v.sport, v.location, v.address, v.description,
  v.day_price, v.evening_price, v.evening_start, v.advance,
  v.open_hour, v.close_hour, v.amenities, true,
  owner.owner_id, owner.upi_id, v.name, null
from owner
cross join (values
  -- Cricket
  ('Shanti Park Box Cricket', 'cricket', 'Mira Road', 'Shanti Park, Mira Bhayandar Road, Mira Road East, Thane 401107', 'Covered box cricket arena with bowling machine on request.', 1000, 1400, 17, 30, 6, 24, array['Floodlights','Parking','Washroom','Drinking water','Equipment on rent']),
  ('Check Naka Cricket Arena', 'cricket', 'Dahisar', 'Near Dahisar Check Naka, SV Road, Dahisar East, Mumbai 400068', 'Full-size box turf with nets on the side for practice.', 1100, 1500, 18, 25, 6, 24, array['Floodlights','Parking','Washroom','Seating area']),
  ('Gorai Road Cricket Box', 'cricket', 'Borivali', 'Gorai Road, near Don Bosco School, Borivali West, Mumbai 400091', 'Rooftop box cricket with fresh FIFA-grade grass.', 1200, 1600, 17, 30, 6, 24, array['Floodlights','Washroom','Changing room','Drinking water','CCTV']),
  ('Thakur Village Strikers', 'cricket', 'Kandivali', 'Thakur Village, Kandivali East, Mumbai 400101', 'Popular weekend league venue, 8-a-side friendly.', 1200, 1700, 18, 40, 6, 24, array['Floodlights','Parking','Washroom','Cafeteria','Seating area']),
  ('Evershine Cricket Hub', 'cricket', 'Malad', 'Evershine Nagar, off Link Road, Malad West, Mumbai 400064', 'Box cricket with tennis and leather ball nets.', 1100, 1500, 17, 30, 6, 24, array['Floodlights','Parking','Equipment on rent','Drinking water']),
  ('Aarey Road Box Cricket', 'cricket', 'Goregaon', 'Aarey Road, near Goregaon Sports Club, Goregaon East, Mumbai 400063', 'Green surroundings, cool evenings, quick booking.', 1000, 1400, 18, 25, 6, 24, array['Floodlights','Parking','Washroom','First aid']),
  ('JVLR Cricket Dome', 'cricket', 'Jogeshwari', 'Jogeshwari-Vikhroli Link Road, Jogeshwari East, Mumbai 400060', 'Fully netted dome, playable through the monsoon.', 1300, 1800, 17, 40, 6, 24, array['Floodlights','Parking','Washroom','Changing room','CCTV','Shower']),
  ('Lokhandwala Box Cricket', 'cricket', 'Andheri', 'Back Road, Lokhandwala Complex, Andheri West, Mumbai 400053', 'Premium turf near the market with ample seating.', 1500, 2000, 18, 50, 6, 24, array['Floodlights','Washroom','Changing room','Cafeteria','Seating area','Wi-Fi']),
  ('Kalina Campus Cricket Turf', 'cricket', 'Santacruz', 'CST Road, Kalina, Santacruz East, Mumbai 400098', 'Student-friendly rates, near the university campus.', 900, 1300, 17, 25, 6, 24, array['Floodlights','Drinking water','Washroom','Equipment on rent']),
  ('Shivaji Park Cricket Corner', 'cricket', 'Dadar', 'Keluskar Road, near Shivaji Park, Dadar West, Mumbai 400028', 'Box cricket a short walk from Shivaji Park.', 1400, 1900, 18, 40, 6, 24, array['Floodlights','Washroom','Drinking water','First aid','CCTV']),
  ('Bellasis Road Cricket Box', 'cricket', 'Mumbai Central', 'Bellasis Road, near Mumbai Central Depot, Mumbai 400008', 'Compact box turf, great for quick after-work games.', 1200, 1600, 18, 30, 7, 24, array['Floodlights','Washroom','Drinking water']),
  ('Marine Lines Cricket Arena', 'cricket', 'Marine Lines', 'Maharshi Karve Road, near Marine Lines Station, Mumbai 400020', 'South Mumbai box cricket with sea breeze evenings.', 1600, 2200, 18, 50, 6, 24, array['Floodlights','Washroom','Changing room','Seating area','CCTV']),

  -- Football
  ('Kora Kendra Football Turf', 'football', 'Borivali', 'SVP Road, near Kora Kendra, Borivali West, Mumbai 400092', '5v5 and 7v7 pitch with shock-pad grass.', 1300, 1800, 18, 40, 6, 24, array['Floodlights','Parking','Washroom','Changing room','Drinking water']),
  ('Dahanukar Wadi Football Arena', 'football', 'Kandivali', 'Mahavir Nagar, Dahanukar Wadi, Kandivali West, Mumbai 400067', 'Rooftop 5-a-side with goalposts and bibs provided.', 1200, 1700, 18, 30, 6, 24, array['Floodlights','Washroom','Equipment on rent','Seating area']),
  ('Link Road Football Ground', 'football', 'Malad', 'New Link Road, near Infiniti Mall, Malad West, Mumbai 400064', '7v7 turf with spectator stand.', 1500, 2000, 18, 40, 6, 24, array['Floodlights','Parking','Washroom','Changing room','Cafeteria','CCTV']),
  ('Oshiwara Football Club Turf', 'football', 'Ram Mandir', 'Ram Mandir Road, Oshiwara, Goregaon West, Mumbai 400104', 'Hosts weekend 5-a-side tournaments.', 1300, 1800, 17, 30, 6, 24, array['Floodlights','Washroom','Drinking water','First aid']),
  ('Veera Desai Football Arena', 'football', 'Andheri', 'Veera Desai Road, Andheri West, Mumbai 400053', 'Large 7v7 pitch with pro lighting.', 1600, 2200, 18, 50, 6, 24, array['Floodlights','Parking','Washroom','Changing room','Shower','Cafeteria']),
  ('Juhu Scheme Football Turf', 'football', 'Vile Parle', 'N S Road No. 10, JVPD Scheme, Vile Parle West, Mumbai 400056', 'Quiet residential area, easy evening slots.', 1400, 1900, 18, 40, 6, 24, array['Floodlights','Washroom','Drinking water','Seating area']),
  ('Linking Road Football Box', 'football', 'Khar Road', '16th Road, off Linking Road, Khar West, Mumbai 400052', 'Rooftop futsal court near Khar station.', 1500, 2000, 18, 50, 7, 24, array['Floodlights','Washroom','Changing room','Wi-Fi']),
  ('BKC Football Arena', 'football', 'Bandra', 'G Block, Bandra Kurla Complex, Bandra East, Mumbai 400051', 'Corporate league favourite, 7v7 with dugouts.', 1800, 2500, 18, 50, 6, 24, array['Floodlights','Parking','Washroom','Changing room','Shower','Cafeteria','CCTV']),
  ('Kamala Mills Football Turf', 'football', 'Lower Parel', 'Kamala Mills Compound, Senapati Bapat Marg, Lower Parel, Mumbai 400013', 'Rooftop 5-a-side surrounded by cafes.', 1700, 2400, 18, 50, 7, 24, array['Floodlights','Washroom','Changing room','Cafeteria','Seating area']),

  -- Badminton
  ('Mira Road Shuttle Court', 'badminton', 'Mira Road', 'Beverly Park, Mira Road East, Thane 401107', 'Two wooden courts with BWF-approved mats.', 400, 600, 17, 30, 6, 23, array['Washroom','Drinking water','Equipment on rent','Changing room']),
  ('Goregaon Smash Badminton', 'badminton', 'Goregaon', 'MG Road, near Goregaon Station, Goregaon West, Mumbai 400104', 'Four indoor courts, coaching in the mornings.', 450, 650, 17, 30, 6, 23, array['Washroom','Changing room','Drinking water','Equipment on rent','CCTV']),
  ('Nehru Road Badminton Arena', 'badminton', 'Vile Parle', 'Nehru Road, Vile Parle East, Mumbai 400057', 'Air-conditioned courts close to the station.', 500, 700, 17, 40, 6, 23, array['Washroom','Changing room','Drinking water','Wi-Fi','Seating area']),
  ('Mahim Shuttle Club', 'badminton', 'Mahim Junction', 'Lady Jamshedji Road, Mahim West, Mumbai 400016', 'Three synthetic courts with good lighting.', 450, 650, 18, 30, 6, 23, array['Washroom','Drinking water','Equipment on rent']),
  ('Prabhadevi Badminton Centre', 'badminton', 'Prabhadevi', 'Appasaheb Marathe Marg, Prabhadevi, Mumbai 400025', 'Wooden flooring, shower and locker rooms.', 550, 750, 17, 40, 6, 23, array['Washroom','Changing room','Shower','Drinking water','CCTV']),

  -- 8 Ball Pool
  ('Cue Corner Kandivali', 'pool', 'Kandivali', 'SV Road, near Kandivali Station, Kandivali West, Mumbai 400067', 'Six club tables with snacks counter.', 250, 350, 18, 20, 11, 24, array['Cafeteria','Washroom','Wi-Fi','Seating area']),
  ('Pocket Kings Andheri', 'pool', 'Andheri', 'Chakala, Andheri-Kurla Road, Andheri East, Mumbai 400099', 'Lounge-style pool hall near the metro.', 300, 400, 18, 20, 11, 24, array['Cafeteria','Washroom','Wi-Fi','CCTV']),
  ('Matunga Break Room', 'pool', 'Matunga Road', 'Senapati Bapat Marg, Matunga West, Mumbai 400016', 'Quiet tables, great for practice sessions.', 250, 350, 18, 20, 11, 24, array['Drinking water','Washroom','Seating area']),
  ('Grant Road Cue Club', 'pool', 'Grant Road', 'Nana Chowk, Grant Road West, Mumbai 400007', 'Classic South Mumbai pool club since the 90s vibe.', 300, 400, 18, 25, 11, 24, array['Cafeteria','Washroom','Wi-Fi','Seating area','CCTV'])
) as v(name, sport, location, address, description, day_price, evening_price, evening_start, advance, open_hour, close_hour, amenities);
