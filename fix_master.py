"""
MASTER FIX: Decode all layers of UTF-8 corruption in Vietnamese text.

The files contain text that was re-encoded multiple times. This script
decodes all byte-level corruption patterns found in the files.

Key patterns found:
- C3 83 C3 A0 → C3 A0  (Ã + à → à)
- C3 83 C2 A0 → C3 A0  (Ã + nbsp → à)  
- C3 A1 C2 BA xx → E1 BA xx  (3-byte Vietnamese chars)
- C3 A1 C2 BB xx → E1 BB xx  (3-byte Vietnamese chars)
- C3 82 C2 B0 → C2 B0  (° degree sign)
- C3 82 → remove (spurious Â)
- Various C3 8x C2 xx → C3 xx patterns
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')

def fix_bytes(data):
    """Fix corrupted UTF-8 bytes. Apply multiple passes until stable."""
    for iteration in range(10):
        prev = data
        data = fix_pass(data)
        if data == prev:
            break
    return data

def fix_pass(raw):
    """Single pass of byte-level fixes."""
    out = bytearray()
    i = 0
    n = len(raw)
    
    while i < n:
        b = raw[i]
        
        # Pattern 1: C3 A1 C2 BA/BB [byte] → E1 BA/BB [byte]
        # (double-encoded 3-byte Vietnamese char in range U+1B80-U+1BFF)
        if (b == 0xC3 and i+4 < n and raw[i+1] == 0xA1
                and raw[i+2] == 0xC2 and raw[i+3] in (0xBA, 0xBB, 0xB8, 0xB9)):
            # Next byte could be C2 xx or C3 xx
            second = raw[i+3]
            if i+4 < n:
                next_b = raw[i+4]
                if next_b == 0xC2 and i+5 < n:
                    third = raw[i+5]
                    out.extend([0xE1, second, third])
                    i += 6
                    continue
                elif next_b == 0xC3 and i+5 < n:
                    third = raw[i+5]
                    # third byte should be 0x80-0xBF for valid continuation
                    if 0x80 <= third <= 0xBF:
                        out.extend([0xE1, second, third])
                        i += 6
                        continue
        
        # Pattern 2: C3 83 [C3|C2] [xx] → C3 xx  (double-encoded Latin Extended)
        # C3 83 = 'Ã', followed by another encoding of the actual char
        if (b == 0xC3 and i+3 < n and raw[i+1] == 0x83):
            next_lead = raw[i+2]
            if next_lead == 0xC3 and 0x80 <= raw[i+3] <= 0xBF:
                # C3 83 C3 A0 → C3 A0
                out.extend([0xC3, raw[i+3]])
                i += 4
                continue
            elif next_lead == 0xC2 and 0x80 <= raw[i+3] <= 0xBF:
                # C3 83 C2 A0 → C3 A0 (treating C2 A0 as the lower byte of C3 xx)
                # Note: C2 A0 = U+00A0 (NBSP), but in this context it's corrupted 'à'
                # Map: C2 A0..BF → C3 A0..BF
                out.extend([0xC3, raw[i+3]])
                i += 4
                continue
        
        # Pattern 3: C3 82 C2 [xx] → C2 xx  (double-encoded C2 range)
        if (b == 0xC3 and i+3 < n and raw[i+1] == 0x82
                and raw[i+2] == 0xC2 and 0x80 <= raw[i+3] <= 0xBF):
            out.extend([0xC2, raw[i+3]])
            i += 4
            continue
        
        # No pattern matched - keep byte as-is
        out.append(b)
        i += 1
    
    return bytes(out)

# Process all project files
root = r'c:\VSAPS2026'
exclude = {'node_modules', 'dist', '.git', '__pycache__', 'fix_encoding.py', 
           'fix_strings.py', 'fix_c2a0.py', 'fix_final.py', 'analyze.py', 'fix_master.py'}
extensions = ('.tsx', '.ts', '.html', '.css')
total_fixed = 0
total_checked = 0

for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in exclude]
    for fn in filenames:
        if fn in exclude or not fn.endswith(extensions):
            continue
        fp = os.path.join(dirpath, fn)
        try:
            with open(fp, 'rb') as f:
                raw = f.read()
            
            fixed = fix_bytes(raw)
            total_checked += 1
            
            if fixed != raw:
                with open(fp, 'wb') as f:
                    f.write(fixed)
                total_fixed += 1
                rel = os.path.relpath(fp, root)
                print(f"FIXED: {rel}")
        except Exception as e:
            print(f"ERROR {fp}: {e}")

print(f"\nChecked: {total_checked}, Fixed: {total_fixed}")

# Verification
print("\n=== Verification ===")
test_files = [
    r'c:\VSAPS2026\pages\Sponsors.tsx',
    r'c:\VSAPS2026\pages\Users.tsx', 
    r'c:\VSAPS2026\pages\Dashboard.tsx',
    r'c:\VSAPS2026\pages\Submissions.tsx',
]
for fp in test_files:
    with open(fp, 'rb') as f:
        raw = f.read()
    
    # Check for remaining C3 83 patterns (corruption indicator)
    has_corruption = b'\xc3\x83\xc3' in raw or b'\xc3\x83\xc2' in raw
    has_triple = b'\xc3\xa1\xc2\xba' in raw or b'\xc3\xa1\xc2\xbb' in raw
    
    status = "OK" if (not has_corruption and not has_triple) else "STILL CORRUPTED"
    fn = os.path.basename(fp)
    print(f"  {fn}: {status}")
    
    if not has_corruption:
        # Show a Vietnamese sample
        try:
            text = raw.decode('utf-8')
            # Find first Vietnamese char
            for j, c in enumerate(text):
                if ord(c) > 0x200:
                    print(f"    Sample: {text[max(0,j-5):j+20]!r}")
                    break
        except:
            pass
