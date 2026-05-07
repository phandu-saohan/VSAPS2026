"""Deep analysis and comprehensive fix for all Vietnamese encoding layers."""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')

fp = r'c:\VSAPS2026\pages\Sponsors.tsx'
with open(fp, 'rb') as f:
    raw = f.read()

# Find 'Nh' (4E 68) near 'isSponsorRole'
# First find 'isSponsorRole'
target = b'isSponsorRole'
pos = raw.find(target)
print(f"isSponsorRole at byte {pos}")

# Print 60 bytes after it
chunk = raw[pos:pos+120]
print("Hex:", ' '.join(f'{b:02X}' for b in chunk))
print("Chars:", ''.join(chr(b) if 32 <= b < 127 else '?' for b in chunk))
print("UTF8:", chunk.decode('utf-8', errors='replace'))
