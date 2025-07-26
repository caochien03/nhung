import sys
import base64
import cv2
import numpy as np
import warnings
import os
from paddleocr import PaddleOCR

# Tắt warning
os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'
warnings.filterwarnings("ignore", category=UserWarning)

def main():
    # Đọc dữ liệu ảnh từ stdin
    img_data = sys.stdin.buffer.read()
    img_array = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    
    # Khởi tạo PaddleOCR với model tiếng Trung (hỗ trợ tốt cho biển số)
    ocr = PaddleOCR(use_textline_orientation=True, lang='ch')
    
    # Nhận diện text
    results = ocr.predict(img)
    
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
            print(plate_text)
        else:
            print("")
    else:
        print("")

if __name__ == "__main__":
    main() 