"""
Database migration: Add voice_interactions table
Run with: python scripts/add_voice_interactions_table.py
"""
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def add_voice_interactions_table():
    """Add voice_interactions table to database"""
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()
    
    try:
        # Create voice_interactions table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS voice_interactions (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                interaction_type VARCHAR(50) NOT NULL,  -- 'transcription', 'synthesis', 'conversation'
                input_text TEXT,
                output_text TEXT,
                audio_duration_seconds INTEGER,
                language VARCHAR(10),
                voice_name VARCHAR(100),
                confidence_score FLOAT,
                audio_size_bytes INTEGER,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_voice_user FOREIGN KEY (user_id) 
                    REFERENCES athlete_profiles(user_id) ON DELETE CASCADE
            );
        """)
        
        # Create indexes for performance
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_voice_user_id 
            ON voice_interactions(user_id);
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_voice_created_at 
            ON voice_interactions(created_at DESC);
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_voice_type 
            ON voice_interactions(interaction_type);
        """)
        
        conn.commit()
        print("✅ voice_interactions table created successfully")
        print("✅ Indexes created successfully")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating table: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    add_voice_interactions_table()
