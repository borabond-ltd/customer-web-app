-- Add has_seen_onboarding_tour column to existing onboarding_details table
ALTER TABLE onboarding_details 
ADD COLUMN IF NOT EXISTS has_seen_onboarding_tour BOOLEAN DEFAULT FALSE;

-- Update existing records to have the default value
UPDATE onboarding_details 
SET has_seen_onboarding_tour = FALSE 
WHERE has_seen_onboarding_tour IS NULL;

-- Create index for faster lookups on the new column
CREATE INDEX IF NOT EXISTS idx_onboarding_details_tour_status ON onboarding_details(has_seen_onboarding_tour);

-- Add comment to document the column
COMMENT ON COLUMN onboarding_details.has_seen_onboarding_tour IS 'Tracks whether user has completed the interactive onboarding tour';
