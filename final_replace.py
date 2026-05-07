"""
Fix specific known corrupted Vietnamese strings and modal background.
"""
import os

REPLACEMENTS = {
    # Replace modal background
    'bg-primary bg-opacity-50': 'bg-black bg-opacity-50',
    'bg-secondary bg-opacity-50': 'bg-black bg-opacity-50',
    'bg-primary bg-opacity-75': 'bg-black bg-opacity-75',
    'bg-secondary bg-opacity-75': 'bg-black bg-opacity-75',

    # String fixes
    'Ä\x90': 'Đ',
    'Æ°': 'ư',
    'Æ¡': 'ơ',
    'Ä‘Ờng': 'đồng',
    'Ä Ờng': 'Đồng',
    'Ä‘Ờ': 'đồ',
    'Ä‘Ễng': 'động',
    'Ä‘Ễng': 'động',
    'tỡp': 'tệp',
    'lỔi': 'lỗi',
    'LỔi': 'Lỗi',
    'trỘng': 'trống',
    'LÆ°u': 'Lưu',
    'HÄ\x90': 'HĐ',
    'Ä‘ã': 'đã',
    'Ä ã': 'Đã',
    'Ä‘ang': 'đang',
    'Ä ang': 'Đang',
    'Ä‘óng': 'đóng',
    'Ä óng': 'Đóng',
    'Ä‘': 'đ', # fallback for remaining 'đ'
    
    # Other specifics from logs
    'Truy cập bỀ từ chỀi': 'Truy cập bị từ chối',
    'thực hiỀn hành': 'thực hiện hành',
    'tài trỀ': 'tài trợ',
    'TỀng giá trỀ': 'Tổng giá trị',
    'thêm mỀi': 'thêm mới',
    'sự kiỀn': 'sự kiện',
    'ChỀnh sửa': 'Chỉnh sửa',
    'liên hỀ': 'liên hệ',
    'Ä iỀn thoại': 'Điện thoại',
    'xuỀng': 'xuống',
    'muỀn': 'muốn',
    'bỀ': 'bị',
    'chỀi': 'chối',
    'TỀp': 'Tệp',
    'LỀi': 'Lỗi',
    'lỀi': 'lỗi',
    
    # Fallbacks for any remaining with replacement chars
    'bỀ\xef\xbf\xbd': 'bị',
    'chỀ\xef\xbf\xbd': 'chối',
    'LỀ\xef\xbf\xbd': 'Lỗi',
    'lỀ\xef\xbf\xbd': 'lỗi',
    'hiỀ\xef\xbf\xbd': 'hiện',
    'kiỀ\xef\xbf\xbd': 'kiện',
    'mỀ\xef\xbf\xbd': 'mới',
    'TỀ\xef\xbf\xbd': 'Tổng',
    'tỀ\xef\xbf\xbd': 'tệp',
    'trỀ\xef\xbf\xbd': 'trống',
    'xuỀ\xef\xbf\xbd': 'xuống',
    'hỀ\xef\xbf\xbd': 'hệ',
    'ChỀ\xef\xbf\xbd': 'Chỉnh',
    'muỀ\xef\xbf\xbd': 'muốn',
}

def fix_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
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

print("Done string replacement and modal overlay fix.")
