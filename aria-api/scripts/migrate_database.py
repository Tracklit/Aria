"""
Database Migration Script for New Features
Creates all tables required for the new functionality
"""
import logging
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_all_tables():
    """Create all tables for new features"""
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        logger.info("Starting database migration...")
        
        # =============================================================================
        # SOCIAL FEATURES TABLES
        # =============================================================================
        
        logger.info("Creating social features tables...")
        
        # Athlete connections (follow/following)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS athlete_connections (
                connection_id SERIAL PRIMARY KEY,
                follower_id VARCHAR(255) NOT NULL,
                following_id VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(follower_id, following_id)
            )
        """)
        
        # Direct messages
        cur.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                message_id SERIAL PRIMARY KEY,
                sender_id VARCHAR(255) NOT NULL,
                recipient_id VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Training groups
        cur.execute("""
            CREATE TABLE IF NOT EXISTS training_groups (
                group_id SERIAL PRIMARY KEY,
                creator_id VARCHAR(255) NOT NULL,
                group_name VARCHAR(255) NOT NULL,
                description TEXT,
                is_private BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Training group members
        cur.execute("""
            CREATE TABLE IF NOT EXISTS training_group_members (
                member_id SERIAL PRIMARY KEY,
                group_id INTEGER REFERENCES training_groups(group_id),
                user_id VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Leaderboards
        cur.execute("""
            CREATE TABLE IF NOT EXISTS leaderboard_entries (
                entry_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                leaderboard_type VARCHAR(100) NOT NULL,
                metric_value FLOAT NOT NULL,
                metric_unit VARCHAR(50) DEFAULT 'seconds',
                period VARCHAR(50) DEFAULT 'all_time',
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Activity feed
        cur.execute("""
            CREATE TABLE IF NOT EXISTS activity_feed (
                activity_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                activity_type VARCHAR(100) NOT NULL,
                activity_data JSONB,
                is_public BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Activity comments
        cur.execute("""
            CREATE TABLE IF NOT EXISTS activity_comments (
                comment_id SERIAL PRIMARY KEY,
                activity_id INTEGER REFERENCES activity_feed(activity_id),
                user_id VARCHAR(255) NOT NULL,
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Activity reactions
        cur.execute("""
            CREATE TABLE IF NOT EXISTS activity_reactions (
                reaction_id SERIAL PRIMARY KEY,
                activity_id INTEGER REFERENCES activity_feed(activity_id),
                user_id VARCHAR(255) NOT NULL,
                reaction_type VARCHAR(50) DEFAULT 'like',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(activity_id, user_id, reaction_type)
            )
        """)
        
        logger.info("✓ Social features tables created")
        
        # =============================================================================
        # RACE MANAGEMENT TABLES
        # =============================================================================
        
        logger.info("Creating race management tables...")
        
        # Races
        cur.execute("""
            CREATE TABLE IF NOT EXISTS races (
                race_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                race_name VARCHAR(255) NOT NULL,
                race_date DATE NOT NULL,
                race_distance VARCHAR(50) NOT NULL,
                race_location VARCHAR(255),
                goal_time FLOAT,
                status VARCHAR(50) DEFAULT 'upcoming',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Race preparation plans
        cur.execute("""
            CREATE TABLE IF NOT EXISTS race_prep_plans (
                plan_id SERIAL PRIMARY KEY,
                race_id INTEGER REFERENCES races(race_id),
                week_number INTEGER NOT NULL,
                plan_data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Race results
        cur.execute("""
            CREATE TABLE IF NOT EXISTS race_results (
                result_id SERIAL PRIMARY KEY,
                race_id INTEGER REFERENCES races(race_id),
                user_id VARCHAR(255) NOT NULL,
                finish_time FLOAT NOT NULL,
                placement INTEGER,
                splits JSONB,
                weather_conditions JSONB,
                notes TEXT,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Race checklists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS race_checklists (
                checklist_id SERIAL PRIMARY KEY,
                race_id INTEGER REFERENCES races(race_id),
                checklist_items JSONB NOT NULL,
                completed_items JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Warmup routines
        cur.execute("""
            CREATE TABLE IF NOT EXISTS warmup_routines (
                routine_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                routine_name VARCHAR(255) NOT NULL,
                exercises JSONB NOT NULL,
                duration_minutes INTEGER,
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        logger.info("✓ Race management tables created")
        
        # =============================================================================
        # GDPR COMPLIANCE TABLES
        # =============================================================================
        
        logger.info("Creating GDPR compliance tables...")
        
        # Deletion requests
        cur.execute("""
            CREATE TABLE IF NOT EXISTS deletion_requests (
                request_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                verification_code VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
        """)
        
        # Data access logs
        cur.execute("""
            CREATE TABLE IF NOT EXISTS data_access_logs (
                log_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                accessed_by VARCHAR(255) NOT NULL,
                purpose TEXT,
                data_categories JSONB,
                access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        logger.info("✓ GDPR compliance tables created")
        
        # =============================================================================
        # EQUIPMENT TRACKING TABLES
        # =============================================================================
        
        logger.info("Creating equipment tracking tables...")
        
        # Equipment inventory
        cur.execute("""
            CREATE TABLE IF NOT EXISTS equipment (
                equipment_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                equipment_type VARCHAR(100) NOT NULL,
                brand VARCHAR(100),
                model VARCHAR(100),
                purchase_date DATE,
                initial_mileage FLOAT DEFAULT 0.0,
                current_mileage FLOAT DEFAULT 0.0,
                max_mileage FLOAT,
                status VARCHAR(50) DEFAULT 'active',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Equipment usage logs
        cur.execute("""
            CREATE TABLE IF NOT EXISTS equipment_usage (
                usage_id SERIAL PRIMARY KEY,
                equipment_id INTEGER REFERENCES equipment(equipment_id),
                user_id VARCHAR(255) NOT NULL,
                miles_added FLOAT NOT NULL,
                usage_date DATE NOT NULL,
                session_type VARCHAR(100),
                notes TEXT,
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Equipment maintenance
        cur.execute("""
            CREATE TABLE IF NOT EXISTS equipment_maintenance (
                maintenance_id SERIAL PRIMARY KEY,
                equipment_id INTEGER REFERENCES equipment(equipment_id),
                maintenance_type VARCHAR(100) NOT NULL,
                maintenance_date DATE NOT NULL,
                cost DECIMAL(10, 2),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        logger.info("✓ Equipment tracking tables created")
        
        # =============================================================================
        # GAMIFICATION TABLES
        # =============================================================================
        
        logger.info("Creating gamification tables...")
        
        # User levels and XP
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_levels (
                user_id VARCHAR(255) PRIMARY KEY,
                total_xp INTEGER DEFAULT 0,
                current_level INTEGER DEFAULT 1,
                current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0,
                last_activity_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Achievements
        cur.execute("""
            CREATE TABLE IF NOT EXISTS achievements (
                achievement_id SERIAL PRIMARY KEY,
                achievement_name VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                category VARCHAR(100),
                xp_reward INTEGER DEFAULT 0,
                badge_icon VARCHAR(255),
                rarity VARCHAR(50),
                requirements JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # User achievements
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_achievements (
                user_achievement_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                achievement_id INTEGER REFERENCES achievements(achievement_id),
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                progress JSONB
            )
        """)
        
        # Virtual races
        cur.execute("""
            CREATE TABLE IF NOT EXISTS virtual_races (
                virtual_race_id SERIAL PRIMARY KEY,
                race_name VARCHAR(255) NOT NULL,
                description TEXT,
                distance VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                entry_xp_cost INTEGER DEFAULT 0,
                completion_xp_reward INTEGER DEFAULT 500,
                prize_pool JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Virtual race participants
        cur.execute("""
            CREATE TABLE IF NOT EXISTS virtual_race_participants (
                participant_id SERIAL PRIMARY KEY,
                virtual_race_id INTEGER REFERENCES virtual_races(virtual_race_id),
                user_id VARCHAR(255) NOT NULL,
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completion_time FLOAT,
                completed_at TIMESTAMP,
                placement INTEGER,
                proof_data JSONB
            )
        """)
        
        # Challenges
        cur.execute("""
            CREATE TABLE IF NOT EXISTS challenges (
                challenge_id SERIAL PRIMARY KEY,
                challenge_name VARCHAR(255) NOT NULL,
                description TEXT,
                challenge_type VARCHAR(100) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                goal_value FLOAT NOT NULL,
                goal_unit VARCHAR(50),
                xp_reward INTEGER DEFAULT 300,
                badge_reward VARCHAR(255),
                is_public BOOLEAN DEFAULT TRUE,
                created_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Challenge participants
        cur.execute("""
            CREATE TABLE IF NOT EXISTS challenge_participants (
                participant_id SERIAL PRIMARY KEY,
                challenge_id INTEGER REFERENCES challenges(challenge_id),
                user_id VARCHAR(255) NOT NULL,
                current_progress FLOAT DEFAULT 0.0,
                completed BOOLEAN DEFAULT FALSE,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
        """)
        
        # XP transactions log
        cur.execute("""
            CREATE TABLE IF NOT EXISTS xp_transactions (
                transaction_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                xp_amount INTEGER NOT NULL,
                action_type VARCHAR(100) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        logger.info("✓ Gamification tables created")
        
        # =============================================================================
        # CREATE INDEXES FOR PERFORMANCE
        # =============================================================================
        
        logger.info("Creating indexes...")
        
        # Social indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_athlete_connections_follower ON athlete_connections(follower_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_athlete_connections_following ON athlete_connections(following_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_leaderboard_type_period ON leaderboard_entries(leaderboard_type, period)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id)")
        
        # Race indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_races_user ON races(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_races_date ON races(race_date)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_race_results_user ON race_results(user_id)")
        
        # Equipment indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_user ON equipment(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_equipment_usage_equipment ON equipment_usage(equipment_id)")
        
        # Gamification indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_user_levels_user ON user_levels(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id)")
        
        logger.info("✓ Indexes created")
        
        # Commit all changes
        conn.commit()
        
        logger.info("=" * 60)
        logger.info("DATABASE MIGRATION COMPLETED SUCCESSFULLY!")
        logger.info("=" * 60)
        logger.info("Tables created:")
        logger.info("  - 8 social features tables")
        logger.info("  - 5 race management tables")
        logger.info("  - 2 GDPR compliance tables")
        logger.info("  - 3 equipment tracking tables")
        logger.info("  - 7 gamification tables")
        logger.info("  Total: 25 new tables + indexes")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        conn.rollback()
        return False
        
    finally:
        cur.close()
        conn.close()


def verify_tables():
    """Verify all tables were created"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'athlete_connections', 'messages', 'training_groups', 'training_group_members',
                'leaderboard_entries', 'activity_feed', 'activity_comments', 'activity_reactions',
                'races', 'race_prep_plans', 'race_results', 'race_checklists', 'warmup_routines',
                'deletion_requests', 'data_access_logs',
                'equipment', 'equipment_usage', 'equipment_maintenance',
                'user_levels', 'achievements', 'user_achievements', 'virtual_races',
                'virtual_race_participants', 'challenges', 'challenge_participants', 'xp_transactions'
            )
            ORDER BY table_name
        """)
        
        tables = cur.fetchall()
        
        logger.info("\n" + "=" * 60)
        logger.info("VERIFICATION RESULTS")
        logger.info("=" * 60)
        logger.info(f"Found {len(tables)} tables:")
        for table in tables:
            logger.info(f"  ✓ {table[0]}")
        logger.info("=" * 60 + "\n")
        
        return len(tables) >= 25
        
    except Exception as e:
        logger.error(f"Error verifying tables: {e}")
        return False
        
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    logger.info("Starting database migration for new features...")
    logger.info("=" * 60 + "\n")
    
    # Create tables
    success = create_all_tables()
    
    if success:
        # Verify tables
        verify_success = verify_tables()
        
        if verify_success:
            logger.info("✅ Migration completed successfully!")
            logger.info("All tables verified and ready to use.\n")
            sys.exit(0)
        else:
            logger.error("❌ Verification failed - some tables may be missing")
            sys.exit(1)
    else:
        logger.error("❌ Migration failed - check logs for errors")
        sys.exit(1)
