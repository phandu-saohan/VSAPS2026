"""
Final polish of remaining corrupted Vietnamese strings.
"""
import os

REPLACEMENTS = {
    'ChỰnh': 'Chỉnh',
    'bỹ': 'bị',
    'chỘi': 'chối',
    'chỰ': 'chỉ',
    'SỘ': 'Số',
    'TỢng': 'Tổng',
    'ĐỜng': 'Đồng',
    'Vỹ': 'Vị',
    'hiỡn': 'hiện',
    'hỜ': 'hồ', 
    'hỡ': 'hệ', 
    'kiỡn': 'kiện', 
    'mỺi': 'mới',
    'muỘn': 'muốn',
    'Tỡp': 'Tệp',
    'tỡp': 'tệp',
    'Điỡn': 'Điện',
    'trỹ': 'trị',
    'xuỘng': 'xuống',
    'đỄ\xef\xbf\xbdng': 'động', 
    'đỒ': 'để', 
    'Xoà': 'Xóa',
}

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            text = f.read()
            
        original = text
        for bad, good in REPLACEMENTS.items():
            text = text.replace(bad, good)
            
        if text != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(text)
            print(f'Fixed {os.path.basename(filepath)}')
    except Exception as e:
        print(f'Error processing {filepath}: {e}')

root = r'c:\VSAPS2026'
for dp, dns, fns in os.walk(root):
    dns[:] = [d for d in dns if d not in {'node_modules', 'dist', '.git'}]
    for fn in fns:
        if fn.endswith(('.tsx', '.ts')):
            fix_file(os.path.join(dp, fn))

print("Done final string replacement.")
