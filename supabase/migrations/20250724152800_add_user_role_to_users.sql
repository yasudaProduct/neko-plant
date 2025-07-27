-- Add role column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Create an index for role column for better query performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Update existing users to have 'user' role
UPDATE public.users SET role = 'user' WHERE role IS NULL;

-- Add a check constraint to ensure valid roles
ALTER TABLE public.users ADD CONSTRAINT check_user_role CHECK (role IN ('user', 'admin', 'moderator'));