-- Seed default vault content
insert into vault_content (title, type, url, min_tier, active) values
('Visual Memory 001', 'image', 'https://photos.google.com', 1, true),
('Steinberg - Audio Source', 'audio', 'https://dropbox.com', 2, true),
('The Signal (Live Feed)', 'video', '#', 3, true);
