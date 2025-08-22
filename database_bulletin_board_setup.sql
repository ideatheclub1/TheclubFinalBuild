-- =====================================================
-- BULLETIN BOARD SYSTEM SETUP
-- =====================================================

-- Create bulletin_board table
CREATE TABLE IF NOT EXISTS bulletin_board (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  thumbnail_url TEXT,
  note_type TEXT CHECK (note_type IN ('sticky', 'currency')) DEFAULT 'sticky',
  amount INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bulletin_board_user_id ON bulletin_board(user_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_board_created_at ON bulletin_board(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulletin_board_note_type ON bulletin_board(note_type);

-- Enable Row Level Security
ALTER TABLE bulletin_board ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Policy: Users can view their own bulletin board notes
CREATE POLICY "Users can view own bulletin board notes" ON bulletin_board
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can view bulletin board notes of profiles they can see
CREATE POLICY "Users can view bulletin board notes of visible profiles" ON bulletin_board
  FOR SELECT USING (
    user_id IN (
      SELECT p.user_id 
      FROM host_profiles p 
      WHERE p.visibility = 'public' 
      OR (p.visibility = 'private' AND auth.uid() IN (
        SELECT CASE 
          WHEN f.follower_id = auth.uid() THEN f.following_id
          WHEN f.following_id = auth.uid() THEN f.follower_id
          ELSE NULL
        END
        FROM followers f 
        WHERE (f.follower_id = auth.uid() AND f.following_id = p.user_id)
           OR (f.following_id = auth.uid() AND f.follower_id = p.user_id)
      ))
    )
  );

-- Policy: Users can insert their own bulletin board notes
CREATE POLICY "Users can insert own bulletin board notes" ON bulletin_board
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own bulletin board notes
CREATE POLICY "Users can update own bulletin board notes" ON bulletin_board
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own bulletin board notes
CREATE POLICY "Users can delete own bulletin board notes" ON bulletin_board
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bulletin_board_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_bulletin_board_updated_at
  BEFORE UPDATE ON bulletin_board
  FOR EACH ROW
  EXECUTE FUNCTION update_bulletin_board_updated_at();

-- Grant permissions
GRANT ALL ON bulletin_board TO authenticated;
GRANT ALL ON bulletin_board TO service_role;

COMMENT ON TABLE bulletin_board IS 'Stores user bulletin board notes with images and descriptions';
COMMENT ON COLUMN bulletin_board.note_type IS 'Type of note: sticky (general notes) or currency (achievement with amount)';
COMMENT ON COLUMN bulletin_board.amount IS 'Amount for currency type notes (earnings, achievements, etc.)';
COMMENT ON COLUMN bulletin_board.image_url IS 'Full resolution image URL';
COMMENT ON COLUMN bulletin_board.thumbnail_url IS 'Thumbnail image URL for previews';