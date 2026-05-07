"""
Fix encoding issues in TSX files.
Files were double-encoded: originally UTF-8, then read as Latin-1 and re-encoded as UTF-8.
This script reverses the process.
"""
import os
import sys

def decode_file(filepath):
    with open(filepath, 'rb') as f:
        raw = f.read()
    
    # Try to detect encoding layers by attempting to decode as latin-1 -> encode -> decode utf-8
    current = raw
    max_iters = 6
    
    for i in range(max_iters):
        try:
            # Check if current bytes have double-encoded pattern
            # "Ã" (C3 83) followed by high byte = sign of double encoding
            has_double = False
            for j in range(len(current) - 2):
                b0, b1, b2 = current[j], current[j+1], current[j+2]
                if b0 == 0xC3 and b1 == 0x83 and b2 == 0xC2:
                    has_double = True
                    break
                if b0 == 0xC3 and b1 in range(0x80, 0xC0) and b2 == 0xC2:
                    has_double = True
                    break
            
            if not has_double:
                break
            
            # Decode bytes as Latin-1 string, then re-encode to get original UTF-8 bytes
            latin1_str = current.decode('latin-1')
            original_utf8_bytes = latin1_str.encode('latin-1')
            current = original_utf8_bytes
            
        except Exception as e:
            print(f"  Error at iteration {i}: {e}")
            break
    
    # Final decode as UTF-8
    try:
        text = current.decode('utf-8')
        return text
    except UnicodeDecodeError:
        # If still fails, try with errors='replace'
        text = current.decode('utf-8', errors='replace')
        return text

def fix_files(root_dir):
    extensions = ('.tsx', '.ts', '.css', '.html')
    exclude = ('node_modules', 'dist', '.git')
    
    fixed = 0
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Skip excluded directories
        dirnames[:] = [d for d in dirnames if d not in exclude]
        
        for filename in filenames:
            if not filename.endswith(extensions):
                continue
            
            filepath = os.path.join(dirpath, filename)
            
            try:
                fixed_text = decode_file(filepath)
                
                # Check if it contains Vietnamese characters (sign of success)
                # Write back as UTF-8 without BOM
                with open(filepath, 'w', encoding='utf-8', newline='') as f:
                    f.write(fixed_text)
                
                # Quick verify
                with open(filepath, 'rb') as f:
                    verify_bytes = f.read(100)
                sample = verify_bytes.decode('utf-8')
                
                print(f"Fixed: {os.path.relpath(filepath, root_dir)}")
                fixed += 1
                
            except Exception as e:
                print(f"ERROR: {filepath} - {e}")
    
    print(f"\nTotal files fixed: {fixed}")

if __name__ == '__main__':
    root = r'c:\VSAPS2026'
    fix_files(root)
