-- Update display name
UPDATE profiles SET first_name = 'Stéphane', updated_at = now() WHERE id = '5b05c221-29b8-4922-9e1d-d857b79f0cbc';

-- Insert admin role
INSERT INTO user_roles (user_id, role) VALUES ('5b05c221-29b8-4922-9e1d-d857b79f0cbc', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;