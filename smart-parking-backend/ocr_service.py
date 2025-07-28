from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import base64
import cv2
import numpy as np
import time
import warnings
import os
from paddleocr import PaddleOCR

# Tắt warning
os.environ['PYTORCH_ENABLE_MPS_FALLBACK'] = '1'
warnings.filterwarnings("ignore", category=UserWarning)

app = FastAPI(title="OCR Service", description="License plate recognition service")

# Khởi tạo model một lần duy nhất khi service start
print("Đang khởi tạo PaddleOCR model...")
ocr = PaddleOCR(use_textline_orientation=True, lang='ch')  # Dùng model tiếng Trung để nhận diện tốt hơn
print("PaddleOCR model đã sẵn sàng!")

class ImageRequest(BaseModel):
    image: str  # base64 image

@app.post("/recognize")
async def recognize_plate(request: ImageRequest):
    try:
        start_time = time.time()
        
        # Decode base64 image
        img_data = base64.b64decode(request.image.split(',')[1])
        img_array = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        # Nhận diện
        results = ocr.predict(img)
        
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000
        
        # Xử lý kết quả
        plate_text = ""
        texts = []
        confidences = []
        
        if results and len(results) > 0:
            for result in results:
                if 'rec_texts' in result and 'rec_scores' in result:
                    rec_texts = result['rec_texts']
                    rec_scores = result['rec_scores']
                    
                    for i, text in enumerate(rec_texts):
                        if i < len(rec_scores):
                            confidence = rec_scores[i]
                            if confidence > 0.5:
                                texts.append(text.replace(' ', ''))
                                confidences.append(confidence)
            
            if texts:
                # Gộp tất cả text với dấu * giữa các phần
                plate_text = '*'.join(texts)
        
        return {
            "licensePlate": plate_text,
            "processingTime": f"{processing_time:.2f}ms",
            "success": True,
            "debug": {
                "totalResults": len(results) if results else 0,
                "allTexts": texts,
                "confidences": confidences
            }
        }
        
    except Exception as e:
        return {
            "licensePlate": "Lỗi xử lý",
            "processingTime": "0ms",
            "success": False,
            "error": str(e)
        }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": "loaded"}

if __name__ == "__main__":
    import uvicorn
    print("Starting OCR Service on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000) 