"""
Fix C2A0 (non-breaking space) corruption → C3A0 (à) in all tsx/ts files.
"""
import os
import sys

# Set stdout to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

root = r'c:\VSAPS2026'
exclude_dirs = {'node_modules', 'dist', '.git', '__pycache__'}
extensions = ('.tsx', '.ts', '.html', '.css')
total = 0

for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
    for fn in filenames:
        if fn.endswith(extensions):
            fp = os.path.join(dirpath, fn)
            try:
                with open(fp, 'rb') as f:
                    raw = f.read()
                
                original = raw
                # Fix: C2 A0 (U+00A0 non-breaking space) → C3 A0 (U+00E0 'à')
                fixed = raw.replace(b'\xc2\xa0', b'\xc3\xa0')
                
                if fixed != original:
                    with open(fp, 'wb') as f:
                        f.write(fixed)
                    total += 1
                    print(f"Fixed: {os.path.relpath(fp, root)}")
            except Exception as e:
                print(f"ERROR {fp}: {e}")

print(f"\nDone. Fixed {total} files.")

# Verify
print("\nVerifying Sponsors.tsx...")
with open(r'c:\VSAPS2026\pages\Sponsors.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
idx = c.find("isSponsorRole")
print("OK" if idx >= 0 else "Not found")
# Print bytes around 'Nh'
idx2 = c.find("Nh\u00e0")
if idx2 >= 0:
    print(f"Found 'Nha' at pos {idx2}: {c[idx2:idx2+20]!r}")
else:
    idx3 = c.find("Nh")
    print(f"Nh at {idx3}: {c[idx3:idx3+15]!r}")
