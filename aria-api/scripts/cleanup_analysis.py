"""
Project Cleanup Script
Identifies and optionally removes unnecessary files after reorganization
"""

import os
from pathlib import Path

# Change to project root
script_dir = Path(__file__).parent
project_root = script_dir.parent
os.chdir(project_root)

print("=" * 80)
print("🧹 PROJECT CLEANUP ANALYSIS")
print("=" * 80)

# Files that can be safely deleted after reorganization
files_to_check = {
    "Deprecated/Moved Files": [
        # These were moved to other locations
    ],
    "Build Artifacts": [
        "__pycache__",
        "src/__pycache__",
        "tests/__pycache__",
        "scripts/__pycache__",
        ".pytest_cache",
        "htmlcov",
        ".coverage",
        "coverage.json",
        "*.pyc",
        "*.pyo",
        "*.pyd",
        ".Python"
    ],
    "Temporary Files": [
        "*.log",
        "*.tmp",
        "*.swp",
        "*~",
        ".DS_Store"
    ],
    "Optional/Legacy": [
        "requirements_no_compile.txt"  # If not needed, can be removed
    ]
}

# Check for old test files in root (should all be in tests/ now)
old_test_files = []
for item in os.listdir('.'):
    if item.startswith('test_') and item.endswith('.py') and os.path.isfile(item):
        old_test_files.append(item)

if old_test_files:
    files_to_check["Old Test Files (moved to tests/)"] = old_test_files

# Check for old source files in root (should all be in src/ now)
old_source_files = []
source_file_names = [
    'main.py', 'database.py', 'cache.py', 'rate_limit.py',
    'auth_middleware.py', 'observability.py', 'wearable_integration.py',
    'tracklit_integration.py'
]
for item in source_file_names:
    if os.path.isfile(item):
        old_source_files.append(item)

if old_source_files:
    files_to_check["Old Source Files (moved to src/)"] = old_source_files

# Check for old documentation in root (should be in docs/)
old_doc_files = []
doc_patterns = ['README.md', 'IMPLEMENTATION_SUMMARY.md', 'PRODUCTION_READINESS_REPORT.md', 
                'TESTING.md', 'QUICK_START_DEPLOYMENT.md']
for item in doc_patterns:
    if os.path.isfile(item):
        old_doc_files.append(item)

if old_doc_files:
    files_to_check["Old Documentation (moved to docs/)"] = old_doc_files

# Check for old scripts in root (should be in scripts/)
old_script_files = []
script_names = ['run_tests.py', 'verify_migration.py']
for item in script_names:
    if os.path.isfile(item):
        old_script_files.append(item)

if old_script_files:
    files_to_check["Old Scripts (moved to scripts/)"] = old_script_files

# Display analysis
total_items = 0
for category, items in files_to_check.items():
    if items:
        print(f"\n📁 {category}:")
        for item in items:
            if os.path.exists(item):
                if os.path.isdir(item):
                    print(f"   📂 {item}/ (directory)")
                else:
                    file_size = os.path.getsize(item) / 1024  # KB
                    print(f"   📄 {item} ({file_size:.1f} KB)")
                total_items += 1
            else:
                print(f"   ⚠️  {item} (pattern - would need glob search)")

if total_items == 0:
    print("\n✅ No unnecessary files found! Project is clean.")
else:
    print("\n" + "=" * 80)
    print(f"Found {total_items} items that may be unnecessary")
    print("=" * 80)
    
    print("\n⚠️  IMPORTANT: Review items carefully before deletion!")
    print("\nTo delete these files, you can:")
    print("1. Review each file/directory manually")
    print("2. Delete confirmed unnecessary items")
    print("\nRecommended deletions:")
    print("  - Build artifacts (__pycache__, .pytest_cache, htmlcov, etc.)")
    print("  - Old test files in root (already moved to tests/)")
    print("  - Old source files in root (already moved to src/)")
    print("  - Old documentation in root (already moved to docs/)")
    print("  - Old scripts in root (already moved to scripts/)")
    
    print("\nDO NOT DELETE:")
    print("  - .env (contains your credentials)")
    print("  - .env.example (template for others)")
    print("  - requirements.txt (Python dependencies)")
    print("  - pytest.ini (test configuration)")
    print("  - Dockerfile, docker-compose.yml (containerization)")
    print("  - .gitignore (git configuration)")

print("\n" + "=" * 80)
print("Cleanup analysis complete. Review the output above.")
print("=" * 80)

# Create a cleanup command script
cleanup_commands = []

if old_test_files:
    cleanup_commands.append("# Delete old test files (moved to tests/)")
    for f in old_test_files:
        cleanup_commands.append(f'Remove-Item "{f}" -Force')

if old_source_files:
    cleanup_commands.append("\n# Delete old source files (moved to src/)")
    for f in old_source_files:
        cleanup_commands.append(f'Remove-Item "{f}" -Force')

if old_doc_files:
    cleanup_commands.append("\n# Delete old documentation (moved to docs/)")
    for f in old_doc_files:
        cleanup_commands.append(f'Remove-Item "{f}" -Force')

if old_script_files:
    cleanup_commands.append("\n# Delete old scripts (moved to scripts/)")
    for f in old_script_files:
        cleanup_commands.append(f'Remove-Item "{f}" -Force')

# Add build artifacts cleanup
cleanup_commands.append("\n# Clean build artifacts")
cleanup_commands.append('Remove-Item -Recurse -Force __pycache__ -ErrorAction SilentlyContinue')
cleanup_commands.append('Remove-Item -Recurse -Force src/__pycache__ -ErrorAction SilentlyContinue')
cleanup_commands.append('Remove-Item -Recurse -Force tests/__pycache__ -ErrorAction SilentlyContinue')
cleanup_commands.append('Remove-Item -Recurse -Force scripts/__pycache__ -ErrorAction SilentlyContinue')
cleanup_commands.append('Remove-Item -Recurse -Force .pytest_cache -ErrorAction SilentlyContinue')
cleanup_commands.append('Remove-Item -Recurse -Force htmlcov -ErrorAction SilentlyContinue')
cleanup_commands.append('Remove-Item -Force .coverage -ErrorAction SilentlyContinue')
cleanup_commands.append('Remove-Item -Force coverage.json -ErrorAction SilentlyContinue')

if cleanup_commands:
    cleanup_script_path = project_root / "cleanup_commands.ps1"
    with open(cleanup_script_path, 'w') as f:
        f.write("# Project Cleanup Commands\n")
        f.write("# Generated by cleanup_analysis.py\n")
        f.write("# Review carefully before executing!\n\n")
        f.write('\n'.join(cleanup_commands))
    
    print(f"\n💾 Cleanup commands saved to: cleanup_commands.ps1")
    print("   Review the file, then execute with: .\\cleanup_commands.ps1")
