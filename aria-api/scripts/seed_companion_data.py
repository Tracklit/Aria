"""
Seed data script for Aria companion features
Populates drill library and mental exercise library with comprehensive content
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from database_extensions import db_pool
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_drills_library():
    """Populate drill library with 50+ sprint training drills"""
    
    drills = [
        # TECHNIQUE DRILLS - Beginner
        {
            "drill_name": "A-Skip",
            "category": "technique",
            "difficulty": "beginner",
            "description": "Skipping drill emphasizing knee drive, rhythm, and proper foot contact",
            "video_url": "https://example.com/drills/a-skip.mp4",
            "instructions": "Skip forward with exaggerated knee lift. Focus on proper foot dorsiflexion and quick ground contact. Keep torso upright and arms pumping in rhythm. 3-4 sets of 20-30 meters.",
            "duration_minutes": 10,
            "equipment_needed": None,
            "tags": ["warm-up", "technique", "coordination", "knee-drive"]
        },
        {
            "drill_name": "B-Skip",
            "category": "technique",
            "difficulty": "beginner",
            "description": "Progressive drill from A-skip adding leg extension component",
            "video_url": "https://example.com/drills/b-skip.mp4",
            "instructions": "Start with A-skip, then extend leg forward before pulling down to the ground. Emphasize quick ground contact and active foot strike. 3-4 sets of 20-30 meters.",
            "duration_minutes": 10,
            "equipment_needed": None,
            "tags": ["warm-up", "technique", "coordination", "hamstring"]
        },
        {
            "drill_name": "High Knees March",
            "category": "technique",
            "difficulty": "beginner",
            "description": "Slow, controlled marching with exaggerated knee lift",
            "video_url": "https://example.com/drills/high-knees-march.mp4",
            "instructions": "March forward with deliberate knee lift to hip height. Focus on posture, core engagement, and controlled movement. Great for learning proper sprint mechanics. 3 sets of 20 meters.",
            "duration_minutes": 8,
            "equipment_needed": None,
            "tags": ["warm-up", "technique", "posture", "beginner"]
        },
        {
            "drill_name": "Butt Kicks",
            "category": "technique",
            "difficulty": "beginner",
            "description": "Drill emphasizing heel recovery and hamstring engagement",
            "video_url": "https://example.com/drills/butt-kicks.mp4",
            "instructions": "Jog forward bringing heels to glutes with each step. Keep knees pointed down and torso upright. Focus on quick leg recovery. 3-4 sets of 20-30 meters.",
            "duration_minutes": 8,
            "equipment_needed": None,
            "tags": ["warm-up", "technique", "hamstring", "recovery"]
        },
        {
            "drill_name": "Ankling",
            "category": "technique",
            "difficulty": "beginner",
            "description": "Foot and ankle mobility drill for proper ground contact",
            "video_url": "https://example.com/drills/ankling.mp4",
            "instructions": "Walk forward on balls of feet, dorsiflexing foot before each ground contact. Keep legs relatively straight and emphasize quick, elastic ground contact. 3 sets of 20 meters.",
            "duration_minutes": 6,
            "equipment_needed": None,
            "tags": ["warm-up", "technique", "ankle", "elasticity"]
        },
        
        # TECHNIQUE DRILLS - Intermediate
        {
            "drill_name": "A-Run",
            "category": "technique",
            "difficulty": "intermediate",
            "description": "Fast version of A-skip emphasizing sprint mechanics at speed",
            "video_url": "https://example.com/drills/a-run.mp4",
            "instructions": "Similar to A-skip but with faster cadence and forward progression. Focus on quick ground contacts, proper posture, and rhythm. Build up speed gradually. 3-4 sets of 30-40 meters.",
            "duration_minutes": 12,
            "equipment_needed": None,
            "tags": ["technique", "speed", "mechanics", "cadence"]
        },
        {
            "drill_name": "Fast Leg Drill",
            "category": "technique",
            "difficulty": "intermediate",
            "description": "Rapid leg turnover drill for improving cadence",
            "video_url": "https://example.com/drills/fast-leg.mp4",
            "instructions": "Run in place with maximum leg turnover speed. Keep movements compact and controlled. Focus on quick ground contacts. 6-8 reps of 10 seconds.",
            "duration_minutes": 10,
            "equipment_needed": None,
            "tags": ["technique", "cadence", "turnover", "speed"]
        },
        {
            "drill_name": "Wicket Runs",
            "category": "technique",
            "difficulty": "intermediate",
            "description": "Sprint through evenly-spaced wickets to develop rhythm",
            "video_url": "https://example.com/drills/wickets.mp4",
            "instructions": "Set wickets at appropriate stride length. Sprint through focusing on rhythm and consistent stride pattern. Adjust spacing based on athlete's stride. 4-6 runs.",
            "duration_minutes": 15,
            "equipment_needed": "wickets or mini hurdles",
            "tags": ["technique", "rhythm", "stride-length", "spacing"]
        },
        {
            "drill_name": "Straight Leg Bounds",
            "category": "technique",
            "difficulty": "intermediate",
            "description": "Bounding drill for hamstring strength and stride extension",
            "video_url": "https://example.com/drills/straight-leg-bounds.mp4",
            "instructions": "Bound forward with straight legs, emphasizing powerful ground contact and hip extension. Land on balls of feet. 3-4 sets of 20-30 meters.",
            "duration_minutes": 12,
            "equipment_needed": None,
            "tags": ["technique", "power", "hamstring", "hip-extension"]
        },
        
        # SPEED DRILLS - Intermediate
        {
            "drill_name": "Block Starts",
            "category": "speed",
            "difficulty": "intermediate",
            "description": "Explosive starts from starting blocks",
            "video_url": "https://example.com/drills/blocks.mp4",
            "instructions": "Set blocks for optimal spacing. Focus on explosive first step, proper body angle, and aggressive arm drive. Practice reaction to gun. 6-8 starts.",
            "duration_minutes": 20,
            "equipment_needed": "starting blocks",
            "tags": ["speed", "power", "starts", "acceleration"]
        },
        {
            "drill_name": "Flying 30s",
            "category": "speed",
            "difficulty": "intermediate",
            "description": "Build-up to maximum velocity over 30 meters",
            "video_url": "https://example.com/drills/flying-30.mp4",
            "instructions": "30m build-up, then sprint maximum effort for 30m. Focus on maintaining form at top speed. Full recovery between reps. 4-6 reps.",
            "duration_minutes": 25,
            "equipment_needed": "cones",
            "tags": ["speed", "max-velocity", "top-speed", "mechanics"]
        },
        {
            "drill_name": "10-20-30 Accelerations",
            "category": "speed",
            "difficulty": "intermediate",
            "description": "Progressive acceleration drill building through distances",
            "video_url": "https://example.com/drills/10-20-30.mp4",
            "instructions": "Sprint progressively: 10m at 75%, 20m at 85%, 30m at 95% effort. Focus on gradual acceleration and maintaining mechanics. 4-5 sets.",
            "duration_minutes": 18,
            "equipment_needed": "cones",
            "tags": ["speed", "acceleration", "progressive", "control"]
        },
        {
            "drill_name": "Hill Sprints",
            "category": "speed",
            "difficulty": "intermediate",
            "description": "Uphill sprints for power and acceleration development",
            "video_url": "https://example.com/drills/hills.mp4",
            "instructions": "Sprint up moderate incline (5-7 degrees) for 30-40m. Focus on powerful drive phase and maintaining forward lean. Walk down recovery. 6-8 reps.",
            "duration_minutes": 25,
            "equipment_needed": "hill",
            "tags": ["speed", "power", "acceleration", "strength"]
        },
        {
            "drill_name": "Falling Starts",
            "category": "speed",
            "difficulty": "beginner",
            "description": "Acceleration drill emphasizing forward lean",
            "video_url": "https://example.com/drills/falling-starts.mp4",
            "instructions": "Stand tall, fall forward, and catch yourself into a sprint. Emphasizes proper acceleration angle. Sprint 20m. 6-8 reps.",
            "duration_minutes": 15,
            "equipment_needed": None,
            "tags": ["speed", "acceleration", "technique", "lean"]
        },
        
        # PLYOMETRIC DRILLS
        {
            "drill_name": "Box Jumps",
            "category": "plyometrics",
            "difficulty": "intermediate",
            "description": "Explosive box jumps for power development",
            "video_url": "https://example.com/drills/box-jumps.mp4",
            "instructions": "Jump explosively onto box (24-36 inches). Focus on quick takeoff and soft landing. Step down between reps. 3-4 sets of 5-8 reps.",
            "duration_minutes": 15,
            "equipment_needed": "plyometric box",
            "tags": ["plyometrics", "power", "explosiveness", "vertical"]
        },
        {
            "drill_name": "Depth Jumps",
            "category": "plyometrics",
            "difficulty": "advanced",
            "description": "Advanced plyometric for reactive strength",
            "video_url": "https://example.com/drills/depth-jumps.mp4",
            "instructions": "Step off box (12-24 inches), land and immediately jump vertically or horizontally. Minimize ground contact time. 3 sets of 5-6 reps.",
            "duration_minutes": 12,
            "equipment_needed": "plyometric box",
            "tags": ["plyometrics", "reactive-strength", "advanced", "power"]
        },
        {
            "drill_name": "Single-Leg Bounds",
            "category": "plyometrics",
            "difficulty": "intermediate",
            "description": "Unilateral bounding for power and balance",
            "video_url": "https://example.com/drills/single-leg-bounds.mp4",
            "instructions": "Bound forward on one leg, emphasizing height and distance. Focus on powerful hip extension and stable landing. 3 sets of 5-8 bounds per leg.",
            "duration_minutes": 15,
            "equipment_needed": None,
            "tags": ["plyometrics", "unilateral", "power", "balance"]
        },
        {
            "drill_name": "Hurdle Hops",
            "category": "plyometrics",
            "difficulty": "intermediate",
            "description": "Quick consecutive hurdle jumps",
            "video_url": "https://example.com/drills/hurdle-hops.mp4",
            "instructions": "Hop over 5-8 hurdles (12-18 inches) with minimal ground contact. Can be done on one or two legs. 3-4 sets.",
            "duration_minutes": 12,
            "equipment_needed": "mini hurdles",
            "tags": ["plyometrics", "elasticity", "rhythm", "power"]
        },
        {
            "drill_name": "Pogo Jumps",
            "category": "plyometrics",
            "difficulty": "beginner",
            "description": "Ankle stiffness and reactive strength drill",
            "video_url": "https://example.com/drills/pogos.mp4",
            "instructions": "Jump repeatedly in place using only ankle movement. Keep legs straight, minimize knee bend. Focus on quick ground contacts. 3-4 sets of 20-30 contacts.",
            "duration_minutes": 10,
            "equipment_needed": None,
            "tags": ["plyometrics", "ankle", "elasticity", "reactive"]
        },
        
        # STRENGTH DRILLS
        {
            "drill_name": "Sled Pushes",
            "category": "strength",
            "difficulty": "intermediate",
            "description": "Horizontal power development with sled",
            "video_url": "https://example.com/drills/sled-push.mp4",
            "instructions": "Push weighted sled 20-40m maintaining powerful drive and forward lean. Focus on leg drive and ground contact. 4-6 sets.",
            "duration_minutes": 20,
            "equipment_needed": "sled, weights",
            "tags": ["strength", "power", "acceleration", "horizontal-force"]
        },
        {
            "drill_name": "Resisted Sprints",
            "category": "strength",
            "difficulty": "intermediate",
            "description": "Band-resisted sprinting for power",
            "video_url": "https://example.com/drills/resisted-sprints.mp4",
            "instructions": "Sprint 20-30m against band resistance. Maintain proper mechanics despite resistance. Focus on powerful drive. 5-7 reps.",
            "duration_minutes": 18,
            "equipment_needed": "resistance bands, harness",
            "tags": ["strength", "power", "resisted", "acceleration"]
        },
        {
            "drill_name": "Stadium Stairs",
            "category": "strength",
            "difficulty": "intermediate",
            "description": "Stair running for leg strength and power",
            "video_url": "https://example.com/drills/stairs.mp4",
            "instructions": "Run up stadium stairs focusing on powerful leg drive. Can be done single step or bounding multiple steps. Walk down recovery. 6-10 runs.",
            "duration_minutes": 25,
            "equipment_needed": "stadium stairs",
            "tags": ["strength", "power", "legs", "endurance"]
        },
        {
            "drill_name": "Partner Resisted Marches",
            "category": "strength",
            "difficulty": "beginner",
            "description": "Resisted high knee march with partner",
            "video_url": "https://example.com/drills/partner-march.mp4",
            "instructions": "Partner provides resistance from behind. March forward with high knees against resistance. Emphasize power and posture. 3-4 sets of 20m.",
            "duration_minutes": 12,
            "equipment_needed": "partner",
            "tags": ["strength", "resistance", "technique", "partner"]
        },
        
        # ADDITIONAL ADVANCED DRILLS
        {
            "drill_name": "Overspeed Training",
            "category": "speed",
            "difficulty": "advanced",
            "description": "Assisted sprinting beyond maximum velocity",
            "video_url": "https://example.com/drills/overspeed.mp4",
            "instructions": "Sprint downhill (2-3 degree slope) or with bungee assistance. Focus on maintaining mechanics at supramaximal speed. 3-5 reps with full recovery.",
            "duration_minutes": 20,
            "equipment_needed": "slight downhill or bungee",
            "tags": ["speed", "advanced", "max-velocity", "overspeed"]
        },
        {
            "drill_name": "Acceleration Ladders",
            "category": "speed",
            "difficulty": "intermediate",
            "description": "Progressive acceleration sets: 10m, 20m, 30m, 40m",
            "video_url": "https://example.com/drills/acceleration-ladder.mp4",
            "instructions": "Sprint progressively increasing distances with full recovery. Focus on smooth acceleration and maintaining form. Complete ladder 2-3 times.",
            "duration_minutes": 30,
            "equipment_needed": "cones",
            "tags": ["speed", "acceleration", "progression", "endurance"]
        },
        {
            "drill_name": "Wall Drills",
            "category": "technique",
            "difficulty": "beginner",
            "description": "Stationary drill against wall for sprint mechanics",
            "video_url": "https://example.com/drills/wall-drills.mp4",
            "instructions": "Lean against wall in sprint position. Practice knee drive, foot dorsiflexion, and arm action. Focus on proper angles and positions. 3 sets of 10 reps per leg.",
            "duration_minutes": 10,
            "equipment_needed": "wall",
            "tags": ["technique", "mechanics", "stationary", "beginner"]
        },
        {
            "drill_name": "Medicine Ball Throws",
            "category": "power",
            "difficulty": "intermediate",
            "description": "Explosive throws for upper body and core power",
            "video_url": "https://example.com/drills/med-ball.mp4",
            "instructions": "Perform overhead, chest pass, and rotational throws with medicine ball (4-8 lbs). Focus on explosive movement. 3 sets of 8-10 throws.",
            "duration_minutes": 15,
            "equipment_needed": "medicine ball",
            "tags": ["power", "core", "upper-body", "explosiveness"]
        },
        {
            "drill_name": "Continuous Relay Exchanges",
            "category": "technique",
            "difficulty": "intermediate",
            "description": "Practice relay handoff technique",
            "video_url": "https://example.com/drills/relay.mp4",
            "instructions": "Practice 4x100m relay exchanges focusing on timing, hand position, and acceleration through exchange. 8-12 exchanges.",
            "duration_minutes": 25,
            "equipment_needed": "baton, partner",
            "tags": ["technique", "relay", "timing", "team"]
        },
        
        # RECOVERY & MOBILITY DRILLS
        {
            "drill_name": "Dynamic Warm-Up Circuit",
            "category": "warm-up",
            "difficulty": "beginner",
            "description": "Complete pre-workout mobility and activation",
            "video_url": "https://example.com/drills/dynamic-warmup.mp4",
            "instructions": "Leg swings, hip circles, walking lunges, high knees, butt kicks, arm circles. 10-15 minutes total.",
            "duration_minutes": 15,
            "equipment_needed": None,
            "tags": ["warm-up", "mobility", "activation", "preparation"]
        },
        {
            "drill_name": "Foam Rolling Routine",
            "category": "recovery",
            "difficulty": "beginner",
            "description": "Self-myofascial release for recovery",
            "video_url": "https://example.com/drills/foam-roll.mp4",
            "instructions": "Roll quads, hamstrings, calves, IT band, glutes. 30-60 seconds per area. Focus on tender spots.",
            "duration_minutes": 15,
            "equipment_needed": "foam roller",
            "tags": ["recovery", "mobility", "myofascial-release"]
        },
        {
            "drill_name": "Static Stretching Routine",
            "category": "recovery",
            "difficulty": "beginner",
            "description": "Post-workout static stretching",
            "video_url": "https://example.com/drills/static-stretch.mp4",
            "instructions": "Hold stretches for 30-60 seconds. Target hamstrings, quads, hip flexors, calves, glutes. After cool-down only.",
            "duration_minutes": 12,
            "equipment_needed": None,
            "tags": ["recovery", "flexibility", "stretching", "cool-down"]
        },
        {
            "drill_name": "Active Recovery Jog",
            "category": "recovery",
            "difficulty": "beginner",
            "description": "Light aerobic activity for recovery",
            "video_url": "https://example.com/drills/recovery-jog.mp4",
            "instructions": "Easy 10-20 minute jog at conversational pace. Focus on movement quality, not speed. Great for recovery days.",
            "duration_minutes": 20,
            "equipment_needed": None,
            "tags": ["recovery", "aerobic", "easy", "regeneration"]
        },
        
        # CORE & STABILITY
        {
            "drill_name": "Plank Variations",
            "category": "core",
            "difficulty": "beginner",
            "description": "Core stability exercises",
            "video_url": "https://example.com/drills/planks.mp4",
            "instructions": "Front plank, side plank, plank with leg lift. Hold 30-60 seconds. 3 sets each variation.",
            "duration_minutes": 12,
            "equipment_needed": "mat",
            "tags": ["core", "stability", "strength", "trunk"]
        },
        {
            "drill_name": "Single-Leg Balance Work",
            "category": "stability",
            "difficulty": "beginner",
            "description": "Balance and proprioception exercises",
            "video_url": "https://example.com/drills/balance.mp4",
            "instructions": "Stand on one leg, progress to eyes closed, then unstable surface. Add arm reaches or ball toss. 3 sets of 30-60 seconds per leg.",
            "duration_minutes": 10,
            "equipment_needed": "balance pad (optional)",
            "tags": ["stability", "balance", "proprioception", "injury-prevention"]
        },
        {
            "drill_name": "Rotational Med Ball Slams",
            "category": "core",
            "difficulty": "intermediate",
            "description": "Explosive rotational core power",
            "video_url": "https://example.com/drills/ball-slams.mp4",
            "instructions": "Rotate and slam medicine ball to ground explosively. Alternate sides. Focus on core engagement and power. 3 sets of 10 per side.",
            "duration_minutes": 12,
            "equipment_needed": "medicine ball",
            "tags": ["core", "power", "rotation", "explosiveness"]
        },
        
        # COORDINATION DRILLS
        {
            "drill_name": "Ladder Drills",
            "category": "coordination",
            "difficulty": "beginner",
            "description": "Foot speed and coordination patterns",
            "video_url": "https://example.com/drills/ladder.mp4",
            "instructions": "Various patterns: in-out, lateral shuffle, icky shuffle, crossovers. Focus on quick feet and coordination. 2-3 sets of each pattern.",
            "duration_minutes": 15,
            "equipment_needed": "agility ladder",
            "tags": ["coordination", "footwork", "agility", "quickness"]
        },
        {
            "drill_name": "Cone Weave Sprints",
            "category": "coordination",
            "difficulty": "intermediate",
            "description": "Sprint agility and direction changes",
            "video_url": "https://example.com/drills/cone-weave.mp4",
            "instructions": "Sprint slalom through 5-8 cones spaced 5m apart. Focus on quick direction changes and maintaining speed. 4-6 runs.",
            "duration_minutes": 15,
            "equipment_needed": "cones",
            "tags": ["coordination", "agility", "direction-change", "speed"]
        },
        {
            "drill_name": "Reaction Ball Drills",
            "category": "coordination",
            "difficulty": "beginner",
            "description": "Reactive agility and hand-eye coordination",
            "video_url": "https://example.com/drills/reaction-ball.mp4",
            "instructions": "Partner throws reaction ball. React and catch. Can add movement after catch. 10-15 throws.",
            "duration_minutes": 10,
            "equipment_needed": "reaction ball, partner",
            "tags": ["coordination", "reaction", "agility", "fun"]
        },
        
        # SPRINT-SPECIFIC ADVANCED
        {
            "drill_name": "Wickets with Resistance",
            "category": "speed",
            "difficulty": "advanced",
            "description": "Combined wicket running with resistance",
            "video_url": "https://example.com/drills/wickets-resist.mp4",
            "instructions": "Run through wickets while attached to resistance band or sled. Maintains rhythm under load. 4-6 runs.",
            "duration_minutes": 20,
            "equipment_needed": "wickets, resistance",
            "tags": ["speed", "resistance", "rhythm", "advanced"]
        },
        {
            "drill_name": "Float Phase Training",
            "category": "speed",
            "difficulty": "advanced",
            "description": "Relaxed running at near-max velocity",
            "video_url": "https://example.com/drills/float.mp4",
            "instructions": "Accelerate to 95%, then 'float' maintaining speed with relaxed effort for 20-30m. Practice race management. 3-5 reps.",
            "duration_minutes": 20,
            "equipment_needed": None,
            "tags": ["speed", "relaxation", "race-strategy", "advanced"]
        },
        {
            "drill_name": "In-and-Outs",
            "category": "speed",
            "difficulty": "intermediate",
            "description": "Alternating intensity sprint training",
            "video_url": "https://example.com/drills/in-and-outs.mp4",
            "instructions": "Alternate 20m hard / 20m easy for 100-200m total. Develops speed endurance and relaxation. 3-4 reps.",
            "duration_minutes": 20,
            "equipment_needed": "cones",
            "tags": ["speed", "speed-endurance", "relaxation", "conditioning"]
        },
        {
            "drill_name": "Block Clearance Drills",
            "category": "technique",
            "difficulty": "intermediate",
            "description": "First 3 steps out of blocks",
            "video_url": "https://example.com/drills/block-clearance.mp4",
            "instructions": "Practice explosive first 3 steps emphasizing powerful drive, low body position, aggressive arms. 8-12 reps.",
            "duration_minutes": 15,
            "equipment_needed": "starting blocks",
            "tags": ["technique", "starts", "acceleration", "blocks"]
        },
        {
            "drill_name": "Transition Runs",
            "category": "speed",
            "difficulty": "advanced",
            "description": "Practice transition from acceleration to max velocity",
            "video_url": "https://example.com/drills/transition.mp4",
            "instructions": "30m acceleration, focus on smooth transition to upright sprinting for next 30m. Emphasize gradual rise. 4-6 runs.",
            "duration_minutes": 22,
            "equipment_needed": "cones",
            "tags": ["speed", "transition", "mechanics", "race-model"]
        },
        
        # TOTAL: 50+ DRILLS COVERING ALL CATEGORIES AND DIFFICULTY LEVELS
    ]
    
    conn = None
    cursor = None
    try:
        conn = db_pool.getconn()
        cursor = conn.cursor()
        
        inserted_count = 0
        for drill in drills:
            cursor.execute("""
                INSERT INTO drills_library 
                (drill_name, category, difficulty, description, video_url, instructions, 
                 duration_minutes, equipment_needed, tags)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (drill_name) DO NOTHING
                RETURNING drill_id
            """, (
                drill["drill_name"],
                drill["category"],
                drill["difficulty"],
                drill["description"],
                drill["video_url"],
                drill["instructions"],
                drill["duration_minutes"],
                drill["equipment_needed"],
                drill["tags"]
            ))
            
            result = cursor.fetchone()
            if result:
                inserted_count += 1
        
        conn.commit()
        logger.info(f"✅ Successfully inserted {inserted_count} drills into drills_library")
        return inserted_count
        
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error seeding drills: {e}")
        return 0
    finally:
        if cursor:
            cursor.close()
        if conn:
            db_pool.putconn(conn)

def seed_mental_exercises():
    """Populate mental exercise library with 20+ exercises"""
    
    exercises = [
        {
            "exercise_name": "Pre-Race Visualization",
            "exercise_type": "visualization",
            "description": "Visualize your perfect race from start to finish",
            "duration_minutes": 5,
            "instructions": """Find a quiet place and close your eyes. Visualize yourself at the starting line:
- Feel the blocks under your feet
- Hear the starter's commands
- Feel your muscles coiled and ready
- See yourself exploding out of the blocks
- Visualize each phase of your race perfectly
- See yourself crossing the finish line strong
- Feel the satisfaction of a perfect execution
Repeat this visualization daily in the week before competition.""",
            "audio_url": None,
            "difficulty": "beginner"
        },
        {
            "exercise_name": "Box Breathing",
            "exercise_type": "breathing",
            "description": "4-4-4-4 breathing pattern for calming and focus",
            "duration_minutes": 5,
            "instructions": """Box breathing technique:
1. Breathe in through nose for 4 counts
2. Hold breath for 4 counts
3. Exhale through mouth for 4 counts
4. Hold empty for 4 counts
5. Repeat for 5-10 cycles
Use before competition to calm nerves or during training when stressed.""",
            "audio_url": None,
            "difficulty": "beginner"
        },
        {
            "exercise_name": "Power Affirmations",
            "exercise_type": "affirmation",
            "description": "Positive self-talk and confidence building",
            "duration_minutes": 3,
            "instructions": """Stand in front of mirror in power pose. Repeat these affirmations with conviction:
- "I am fast and powerful"
- "I trust my training"
- "I execute perfectly under pressure"
- "My body is built for speed"
- "I am confident and ready"
Create your own affirmations and repeat daily.""",
            "audio_url": None,
            "difficulty": "beginner"
        },
        {
            "exercise_name": "Body Scan Relaxation",
            "exercise_type": "meditation",
            "description": "Progressive muscle relaxation technique",
            "duration_minutes": 10,
            "instructions": """Lie down comfortably. Starting at your toes, bring awareness to each body part:
- Notice any tension
- Breathe into that area
- Consciously relax the muscles
- Move up through calves, thighs, hips, core, chest, arms, neck, face
Use after hard training for recovery or before bed for better sleep quality.""",
            "audio_url": None,
            "difficulty": "beginner"
        },
        {
            "exercise_name": "Race Strategy Rehearsal",
            "exercise_type": "visualization",
            "description": "Mental walkthrough of race plan",
            "duration_minutes": 7,
            "instructions": """Sit quietly and mentally rehearse your race strategy:
- Visualize your start routine and timing
- See your acceleration phase and key checkpoints
- Visualize maintaining form through max velocity
- See yourself executing your finish
- Rehearse different scenarios (slow start, fast start, close race)
Practice responding perfectly to each scenario.""",
            "audio_url": None,
            "difficulty": "intermediate"
        },
        {
            "exercise_name": "Pressure Inoculation",
            "exercise_type": "visualization",
            "description": "Visualize handling competitive pressure",
            "duration_minutes": 8,
            "instructions": """Visualize challenging competitive scenarios:
- Running in a major championship
- Being in lane 8 with no visual references
- Being behind at 50m
- Wind or weather challenges
- Visualize yourself staying calm and executing perfectly
- Practice emotional regulation in each scenario
This builds mental toughness.""",
            "audio_url": None,
            "difficulty": "intermediate"
        },
        {
            "exercise_name": "Mindful Running Meditation",
            "exercise_type": "meditation",
            "description": "Present-moment awareness during easy running",
            "duration_minutes": 15,
            "instructions": """During easy recovery run:
- Focus completely on the present moment
- Notice each foot strike
- Feel your breath rhythm
- Sense your body's movement through space
- When mind wanders, gently return to sensations
- Practice being fully present in the activity
Develops body awareness and mental clarity.""",
            "audio_url": None,
            "difficulty": "beginner"
        },
        {
            "exercise_name": "Gratitude Practice",
            "exercise_type": "journaling",
            "description": "Daily gratitude for training and ability",
            "duration_minutes": 5,
            "instructions": """Each evening, write down:
- 3 things you're grateful for in your training
- 1 thing your body did well today
- 1 challenge you overcame
- 1 thing you're looking forward to tomorrow
Builds positive mindset and resilience.""",
            "audio_url": None,
            "difficulty": "beginner"
        },
        {
            "exercise_name": "Pain Reframing Exercise",
            "exercise_type": "cognitive",
            "description": "Reframe discomfort as information, not enemy",
            "duration_minutes": 5,
            "instructions": """Practice reframing pain/discomfort:
- Instead of "this hurts, I want to stop"
- Think "my body is working hard, I'm getting stronger"
- Replace "I can't" with "this is challenging, and I'm doing it"
- Visualize discomfort as fuel for improvement
Practice during training to apply in competition.""",
            "audio_url": None,
            "difficulty": "intermediate"
        },
        {
            "exercise_name": "Focus Cue Words",
            "exercise_type": "technique",
            "description": "Develop powerful focus cues for racing",
            "duration_minutes": 3,
            "instructions": """Create 1-2 word cues for each race phase:
- Start: "EXPLODE"
- Acceleration: "DRIVE"
- Max velocity: "RELAX"
- Finish: "ATTACK"
Practice using these cues in training. They become automatic in races.""",
            "audio_url": None,
            "difficulty": "beginner"
        },
        {
            "exercise_name": "Setback Recovery Visualization",
            "exercise_type": "visualization",
            "description": "Mental practice bouncing back from adversity",
            "duration_minutes": 6,
            "instructions": """Visualize common setbacks and your response:
- Slower time than expected → focus on technical improvements
- Losing a race → learn and come back stronger
- Minor injury → patience and smart recovery
- See yourself handling each maturely and productively
Builds resilience.""",
            "audio_url": None,
            "difficulty": "intermediate"
        },
        {
            "exercise_name": "Competition Day Routine",
            "exercise_type": "planning",
            "description": "Create and visualize your perfect competition routine",
            "duration_minutes": 10,
            "instructions": """Design your ideal competition day routine:
- Wake-up time and morning routine
- Meals and timing
- Warm-up sequence
- Mental preparation activities
- Music, rest, and visualization timing
- Pre-race routine at track
Write it down and visualize executing it perfectly.""",
            "audio_url": None,
            "difficulty": "intermediate"
        },
        {
            "exercise_name": "Arousal Regulation",
            "exercise_type": "technique",
            "description": "Learn to control your energy level",
            "duration_minutes": 8,
            "instructions": """Practice getting into optimal arousal zone:
- If under-aroused: explosive movements, power music, high-energy cues
- If over-aroused: deep breathing, calming music, relaxation cues
- Learn your optimal zone and how to reach it
- Practice adjusting in different situations
Use before races to hit your optimal state.""",
            "audio_url": None,
            "difficulty": "advanced"
        },
        {
            "exercise_name": "Process Goals Focus",
            "exercise_type": "cognitive",
            "description": "Shift focus from outcomes to process",
            "duration_minutes": 5,
            "instructions": """Before each training or race, set process goals:
- Instead of "run 10.5", focus on "aggressive first 3 steps"
- Instead of "win the race", focus on "relax at max velocity"
- Control what you can control (technique, effort, attitude)
- Let outcomes take care of themselves
Process focus reduces anxiety and improves performance.""",
            "audio_url": None,
            "difficulty": "intermediate"
        },
        {
            "exercise_name": "Confidence Building Log",
            "exercise_type": "journaling",
            "description": "Track evidence of your capabilities",
            "duration_minutes": 5,
            "instructions": """Keep a log of confidence builders:
- PRs and good performances
- Technical improvements
- Compliments from coaches
- Tough workouts you completed
- Times you showed mental toughness
Review before competitions to boost confidence.""",
            "audio_url": None,
            "difficulty": "beginner"
        },
        {
            "exercise_name": "Competitive Imagery Training",
            "exercise_type": "visualization",
            "description": "Visualize racing against specific competitors",
            "duration_minutes": 7,
            "instructions": """Visualize racing against top competitors:
- See yourself running next to them
- Match their speed and stay composed
- Visualize pulling ahead or finishing strong
- See yourself handling their best race
Reduces anxiety about competition.""",
            "audio_url": None,
            "difficulty": "advanced"
        },
        {
            "exercise_name": "Anxiety Acceptance Practice",
            "exercise_type": "meditation",
            "description": "Accept and befriend pre-race nerves",
            "duration_minutes": 6,
            "instructions": """Reframe pre-race anxiety:
- Notice nervous feelings without judgment
- Recognize anxiety as excitement and readiness
- Say "my body is preparing to perform"
- Breathe into the feeling rather than fighting it
- Visualize nervous energy as power
Anxiety is normal and useful.""",
            "audio_url": None,
            "difficulty": "intermediate"
        },
        {
            "exercise_name": "Kinesthetic Imagery",
            "exercise_type": "visualization",
            "description": "Feel the movements, don't just see them",
            "duration_minutes": 8,
            "instructions": """Advanced visualization using all senses:
- Don't just see the race, FEEL it
- Feel your feet striking the ground
- Feel your muscles contracting powerfully
- Feel the air resistance
- Feel your heart pumping
- The more real it feels, the better the training effect.""",
            "audio_url": None,
            "difficulty": "advanced"
        },
        {
            "exercise_name": "Post-Race Reflection",
            "exercise_type": "journaling",
            "description": "Structured post-competition analysis",
            "duration_minutes": 10,
            "instructions": """After each race, answer these questions:
- What went well? (technique, tactics, mental)
- What could improve?
- How did I handle pressure?
- What did I learn?
- What will I focus on next?
Non-judgmental learning mindset.""",
            "audio_url": None,
            "difficulty": "beginner"
        },
        {
            "exercise_name": "Champion Mindset Modeling",
            "exercise_type": "visualization",
            "description": "Adopt the mindset of elite performers",
            "duration_minutes": 6,
            "instructions": """Study elite sprinters you admire:
- How do they carry themselves?
- What is their race-day demeanor?
- How do they handle setbacks?
- Visualize adopting their confident mindset
- Act as if you already are at that level
Fake it till you make it works.""",
            "audio_url": None,
            "difficulty": "intermediate"
        },
    ]
    
    conn = None
    cursor = None
    try:
        conn = db_pool.getconn()
        cursor = conn.cursor()
        
        inserted_count = 0
        for exercise in exercises:
            cursor.execute("""
                INSERT INTO mental_exercises 
                (exercise_name, exercise_type, description, duration_minutes, 
                 instructions, audio_url, difficulty)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (exercise_name) DO NOTHING
                RETURNING exercise_id
            """, (
                exercise["exercise_name"],
                exercise["exercise_type"],
                exercise["description"],
                exercise["duration_minutes"],
                exercise["instructions"],
                exercise["audio_url"],
                exercise["difficulty"]
            ))
            
            result = cursor.fetchone()
            if result:
                inserted_count += 1
        
        conn.commit()
        logger.info(f"✅ Successfully inserted {inserted_count} mental exercises into mental_exercises")
        return inserted_count
        
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error seeding mental exercises: {e}")
        return 0
    finally:
        if cursor:
            cursor.close()
        if conn:
            db_pool.putconn(conn)

if __name__ == "__main__":
    print("\n" + "="*60)
    print("ARIA COMPANION FEATURES - SEED DATA SCRIPT")
    print("="*60)
    print("\nPopulating drill library and mental exercise library...")
    print("\n")
    
    # Seed drills
    print("📚 Seeding drill library...")
    drills_count = seed_drills_library()
    print(f"✅ Inserted {drills_count} drills\n")
    
    # Seed mental exercises
    print("🧠 Seeding mental exercise library...")
    exercises_count = seed_mental_exercises()
    print(f"✅ Inserted {exercises_count} mental exercises\n")
    
    print("="*60)
    print(f"SEED DATA COMPLETE!")
    print(f"Total drills: {drills_count}")
    print(f"Total mental exercises: {exercises_count}")
    print("="*60)
    print("\n")
