import sys
import base64
import cv2
import numpy as np
import warnings
import os
import time
from paddleocr import PaddleOCR

# Tắt warning
os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'
warnings.filterwarnings("ignore", category=UserWarning)

# Tạo model singleton - khởi tạo một lần duy nhất
print("Đang khởi tạo PaddleOCR model...", file=sys.stderr)
ocr = PaddleOCR(use_textline_orientation=True, lang='en')  # Dùng model tiếng Anh thay vì tiếng Trung
print("PaddleOCR model đã sẵn sàng!", file=sys.stderr)

def main():
    # Đọc dữ liệu ảnh từ stdin
    img_data = sys.stdin.buffer.read()
    img_array = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    
    # Bắt đầu đo thời gian
    start_time = time.time()
    
    # Nhận diện text - sử dụng model đã khởi tạo
    results = ocr.predict(img)
    
    # Kết thúc đo thời gian
    end_time = time.time()
    processing_time = (end_time - start_time) * 1000  # Chuyển sang milliseconds
    
    if results and len(results) > 0:
        # Lấy tất cả text được nhận diện
        texts = []
        
        # PaddleOCR trả về list các dict, mỗi dict chứa 'rec_texts' và 'rec_scores'
        for result in results:
            if 'rec_texts' in result and 'rec_scores' in result:
                rec_texts = result['rec_texts']
                rec_scores = result['rec_scores']
                
                # Ghép text và score tương ứng
                for i, text in enumerate(rec_texts):
                    if i < len(rec_scores):
                        confidence = rec_scores[i]
                        if confidence > 0.5:  # Chỉ lấy text có độ tin cậy > 50%
                            texts.append(text.replace(' ', ''))
        
        if texts:
            # Gộp tất cả text với dấu * giữa các phần
            plate_text = '*'.join(texts)
            # In thời gian xử lý cùng với kết quả
            print(f"{plate_text}|{processing_time:.2f}ms")
        else:
            print(f"|{processing_time:.2f}ms")
    else:
        print(f"|{processing_time:.2f}ms")

if __name__ == "__main__":
    main() 