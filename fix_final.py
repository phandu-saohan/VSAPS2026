"""
Fix triple-encoded UTF-8 Vietnamese text.
Pattern: 'à' (C3 A0) was encoded as C3 83 C3 A0 (= 'Ã' + 'à' in UTF-8).
Also fixes other similar triple-encoding patterns.

Approach: replace multi-byte sequences that are double/triple-encoded back to single UTF-8.
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')

# Map from corrupted byte sequences → correct UTF-8 bytes
# Each entry: (corrupted_bytes) → (correct_bytes)
# These are the specific patterns found in the files.
#
# How to derive them:
# 'à' U+00E0 → UTF-8: C3 A0
# When C3 A0 is read as Latin-1 and re-encoded as UTF-8:
#   C3 → UTF-8: C3 83  (Ã)
#   A0 → UTF-8: C2 A0  (non-breaking space)
# So C3 A0 becomes C3 83 C2 A0 = double-encoded
#
# But the file shows C3 83 C3 A0 (not C2 A0).
# This suggests the fix_encoding.py already partially fixed C2 A0 → C3 A0,
# turning double-encoded C3 83 C2 A0 into C3 83 C3 A0.
# We now need to reverse: C3 83 C3 A0 → C3 A0

# Build replacement map for all common Vietnamese chars
# Format: (wrong_bytes_hex, correct_bytes_hex, description)
FIXES = [
    # 'à' U+00E0 - double encoded
    (b'\xc3\x83\xc3\xa0', b'\xc3\xa0', 'à'),
    # 'á' U+00E1 
    (b'\xc3\x83\xc3\xa1', b'\xc3\xa1', 'á'),
    # 'â' U+00E2
    (b'\xc3\x83\xc3\xa2', b'\xc3\xa2', 'â'),
    # 'ã' U+00E3
    (b'\xc3\x83\xc3\xa3', b'\xc3\xa3', 'ã'),
    # 'è' U+00E8
    (b'\xc3\x83\xc3\xa8', b'\xc3\xa8', 'è'),
    # 'é' U+00E9
    (b'\xc3\x83\xc3\xa9', b'\xc3\xa9', 'é'),
    # 'ê' U+00EA
    (b'\xc3\x83\xc3\xaa', b'\xc3\xaa', 'ê'),
    # 'ì' U+00EC
    (b'\xc3\x83\xc3\xac', b'\xc3\xac', 'ì'),
    # 'í' U+00ED
    (b'\xc3\x83\xc3\xad', b'\xc3\xad', 'í'),
    # 'ò' U+00F2
    (b'\xc3\x83\xc3\xb2', b'\xc3\xb2', 'ò'),
    # 'ó' U+00F3
    (b'\xc3\x83\xc3\xb3', b'\xc3\xb3', 'ó'),
    # 'ô' U+00F4
    (b'\xc3\x83\xc3\xb4', b'\xc3\xb4', 'ô'),
    # 'õ' U+00F5
    (b'\xc3\x83\xc3\xb5', b'\xc3\xb5', 'õ'),
    # 'ö' U+00F6
    (b'\xc3\x83\xc3\xb6', b'\xc3\xb6', 'ö'),
    # 'ù' U+00F9
    (b'\xc3\x83\xc3\xb9', b'\xc3\xb9', 'ù'),
    # 'ú' U+00FA
    (b'\xc3\x83\xc3\xba', b'\xc3\xba', 'ú'),
    # 'ü' U+00FC
    (b'\xc3\x83\xc3\xbc', b'\xc3\xbc', 'ü'),
    # 'ý' U+00FD
    (b'\xc3\x83\xc3\xbd', b'\xc3\xbd', 'ý'),
    # 'ÿ' U+00FF
    (b'\xc3\x83\xc3\xbf', b'\xc3\xbf', 'ÿ'),
    
    # C3 83 followed by C2 xx patterns (other corrupted chars)
    (b'\xc3\x83\xc2\xa0', b'\xc3\xa0', 'à (via C2)'),
    (b'\xc3\x83\xc2\xa1', b'\xc3\xa1', 'á (via C2)'),
    (b'\xc3\x83\xc2\xa2', b'\xc3\xa2', 'â (via C2)'),
    (b'\xc3\x83\xc2\xa3', b'\xc3\xa3', 'ã (via C2)'),
    (b'\xc3\x83\xc2\xa8', b'\xc3\xa8', 'è (via C2)'),
    (b'\xc3\x83\xc2\xa9', b'\xc3\xa9', 'é (via C2)'),
    (b'\xc3\x83\xc2\xaa', b'\xc3\xaa', 'ê (via C2)'),
    (b'\xc3\x83\xc2\xac', b'\xc3\xac', 'ì (via C2)'),
    (b'\xc3\x83\xc2\xb2', b'\xc3\xb2', 'ò (via C2)'),
    (b'\xc3\x83\xc2\xb3', b'\xc3\xb3', 'ó (via C2)'),
    (b'\xc3\x83\xc2\xb4', b'\xc3\xb4', 'ô (via C2)'),
    (b'\xc3\x83\xc2\xb5', b'\xc3\xb5', 'õ (via C2)'),
    (b'\xc3\x83\xc2\xb9', b'\xc3\xb9', 'ù (via C2)'),
    (b'\xc3\x83\xc2\xba', b'\xc3\xba', 'ú (via C2)'),
    (b'\xc3\x83\xc2\xbd', b'\xc3\xbd', 'ý (via C2)'),
    (b'\xc3\x83\xc2\xbf', b'\xc3\xbf', 'ÿ (via C2)'),
    
    # 3-byte Vietnamese chars that got double-encoded
    # Pattern: 3-byte UTF-8 char (E1 BA xx or E1 BB xx) gets encoded again
    # E1 → C3 A1 + remaining bytes also encoded
    # E1 BA → becomes C3 A1 C2 BA then...
    # Let's handle: trợ = 74 72 E1 BB A3
    # E1 → C3 A1, BB → C2 BB, A3 → C2 A3  → C3 A1 C2 BB C2 A3
    # which we see as C3 A1 C2 BB C2 A3 in the hex dump... YES! matches!
    # So we need to reverse E1 BB A3 ← C3 A1 C2 BB C2 A3
    
    # This is getting complex. Let me handle via the Latin-1 decode approach
    # but applied at byte level more carefully.
]

def fix_file_targeted(filepath):
    with open(filepath, 'rb') as f:
        raw = f.read()
    
    original = raw
    result = raw
    
    # Apply targeted replacements (longest first to avoid partial matches)
    for wrong, correct, name in sorted(FIXES, key=lambda x: -len(x[0])):
        result = result.replace(wrong, correct)
    
    # Now handle 3-byte Vietnamese chars that were double-encoded.
    # Pattern: C3 A1 C2 BB → E1 BB (for chars U+1B80..U+1BFF range)
    # Actually Vietnamese uses U+1EA0..U+1EFF range = E1 BA xx or E1 BB xx
    # When E1 BA xx is Latin-1 re-encoded:
    # E1 → C3 A1, BA → C2 BA, xx → C2/C3 xx
    # So E1 BA A0 → C3 A1 C2 BA C2 A0 (6 bytes → 3 bytes)
    # We need to reverse all E1 BA/BB patterns
    
    i = 0
    out = bytearray()
    result_bytes = bytes(result)
    while i < len(result_bytes):
        b = result_bytes[i]
        # Check for pattern C3 A1 C2 BA or C3 A1 C2 BB (double-encoded E1 BA/BB)
        if (b == 0xC3 and i+5 < len(result_bytes) and result_bytes[i+1] == 0xA1
            and result_bytes[i+2] == 0xC2 and result_bytes[i+3] in (0xBA, 0xBB)
            and result_bytes[i+4] == 0xC2):
            # E1 + BA/BB + third byte
            e1_second = result_bytes[i+3]  # BA or BB
            # Third byte: C2 xx or C3 xx -> original byte
            if result_bytes[i+4] == 0xC2:
                e1_third = result_bytes[i+5]  # the actual third byte
            else:
                e1_third = result_bytes[i+5]
            out.extend(bytes([0xE1, e1_second, e1_third]))
            i += 6
        elif (b == 0xC3 and i+5 < len(result_bytes) and result_bytes[i+1] == 0xA1
              and result_bytes[i+2] == 0xC2 and result_bytes[i+3] in (0xBA, 0xBB)
              and result_bytes[i+4] == 0xC3):
            e1_second = result_bytes[i+3]
            e1_third = result_bytes[i+5]
            out.extend(bytes([0xE1, e1_second, e1_third]))
            i += 6
        else:
            out.append(b)
            i += 1
    
    result = bytes(out)
    
    if result != original:
        with open(filepath, 'wb') as f:
            f.write(result)
        return True
    return False

# Process all files
root = r'c:\VSAPS2026'
exclude_dirs = {'node_modules', 'dist', '.git', '__pycache__'}
extensions = ('.tsx', '.ts', '.html')
total = 0

for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
    for fn in filenames:
        if fn.endswith(extensions):
            fp = os.path.join(dirpath, fn)
            try:
                if fix_file_targeted(fp):
                    print(f"Fixed: {os.path.relpath(fp, root)}")
                    total += 1
            except Exception as e:
                print(f"ERROR {fp}: {e}")

print(f"\nTotal: {total} files fixed")

# Verify
print("\nVerify Sponsors.tsx:")
with open(r'c:\VSAPS2026\pages\Sponsors.tsx', 'rb') as f:
    raw = f.read()
pos = raw.find(b'isSponsorRole')
chunk = raw[pos:pos+60]
print("Hex:", ' '.join(f'{b:02X}' for b in chunk))
try:
    print("Text:", chunk.decode('utf-8'))
except:
    print("Text (replace):", chunk.decode('utf-8', errors='replace'))
