"""
Trực tiếp thay thế các chuỗi tiếng Việt bị corrupt trong source code.
Dùng regex để tìm pattern và thay bằng chuỗi đúng.
"""
import os
import re

# Map từ pattern bị hỏng -> chuỗi đúng
# Dùng bytes để tránh encoding issues trong script này
REPLACEMENTS = {
    # Nhà tài trợ patterns
    "Nh\xa0 t\xa0i tr\u1ee3": "Nhà tài trợ",
    "nh\xa0 t\xa0i tr\u1ee3": "nhà tài trợ",
    "Nh\xa0 T\xa0i Tr\u1ee3": "Nhà Tài Trợ",
    "Qu\u1ea3n l\xfd": "Quản lý",
    "qu\u1ea3n l\xfd": "quản lý",
    "Qu\u1ea3n l\xfd Nh\xa0 t\xa0i tr\u1ee3": "Quản lý Nhà tài trợ",
    "Th\xf4ng tin T\xe0i tr\u1ee3": "Thông tin Tài trợ",
    "th\xf4ng tin g\xf3i t\xe0i tr\u1ee3": "thông tin gói tài trợ",
    "c\u1eadp nh\u1eadt th\xf4ng tin g\xf3i t\xe0i tr\u1ee3": "cập nhật thông tin gói tài trợ",
    "Theo d\xf5i, th\xeam m\u1edbi v\xe0 qu\u1ea3n l\xfd c\xe1c nh\xa0 t\xa0i tr\u1ee3": "Theo dõi, thêm mới và quản lý các nhà tài trợ",
    "Xem v\xe0 c\u1eadp nh\u1eadt th\xf4ng tin g\xf3i t\xe0i tr\u1ee3 c\u1ee7a b\u1ea1n.": "Xem và cập nhật thông tin gói tài trợ của bạn.",
    
    # Role names
    "'Nh\xa0 t\xa0i tr\u1ee3'": "'Nhà tài trợ'",
    '"Nh\xa0 t\xa0i tr\u1ee3"': '"Nhà tài trợ"',
    
    # Common words
    "\xa0": "à",  # fallback - replace non-breaking space with à (common substitution)
}

def fix_file(filepath, replacements):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            content = f.read()
        
        original = content
        for bad, good in replacements.items():
            content = content.replace(bad, good)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8', newline='') as f:
                f.write(content)
            return True
    except Exception as e:
        print(f"  ERROR: {e}")
    return False

# Quét toàn bộ project
root = r'c:\VSAPS2026'
exclude_dirs = {'node_modules', 'dist', '.git', '__pycache__'}
extensions = ('.tsx', '.ts', '.html')

total = 0
for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
    for fn in filenames:
        if fn.endswith(extensions):
            fp = os.path.join(dirpath, fn)
            if fix_file(fp, REPLACEMENTS):
                print(f"Fixed: {os.path.relpath(fp, root)}")
                total += 1

print(f"\nDone. Total files patched: {total}")
