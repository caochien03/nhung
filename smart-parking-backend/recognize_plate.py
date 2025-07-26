import sys
import easyocr
import base64
import cv2
import numpy as np
import warnings
import os

# Tắt warning MPS
os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'
warnings.filterwarnings("ignore", category=UserWarning)

def main():
    # Đọc dữ liệu ảnh từ stdin
    img_data = sys.stdin.buffer.read()
    img_array = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    reader = easyocr.Reader(['en', 'vi'])
    results = reader.readtext(img)
    if results:
        # Gộp tất cả text với dấu * giữa các phần nhận diện
        plate_parts = [text.replace(' ', '') for _, text, _ in results]
        plate_text = '*'.join(plate_parts)
        print(plate_text)
    else:
        print("")

if __name__ == "__main__":
    main() 