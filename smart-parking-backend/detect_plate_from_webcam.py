import cv2
import easyocr
import requests

def main():
    # Khởi tạo webcam (0 là camera mặc định)
    cap = cv2.VideoCapture(1)
    if not cap.isOpened():
        print("Không mở được webcam!")
        return

    print("Nhấn SPACE để chụp ảnh, ESC để thoát.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Không lấy được frame từ webcam!")
            break

        cv2.imshow("Webcam - Nhấn SPACE để chụp", frame)
        key = cv2.waitKey(1)
        if key == 27:  # ESC
            break
        elif key == 32:  # SPACE
            # Chụp ảnh
            cv2.imwrite("capture.jpg", frame)
            print("Đã chụp ảnh, đang nhận diện biển số...")

            # Nhận diện biển số
            reader = easyocr.Reader(['en', 'vi'])
            results = reader.readtext(frame)
            if results:
                # Gộp tất cả text lại thành 1 dòng, loại bỏ khoảng trắng dư thừa
                plate_text = ''.join([text.replace(' ', '') for _, text, _ in results])
                print("Biển số gộp lại:", plate_text)
                # Gửi lên server
                url = "http://localhost:8080/api/parking"  # Đổi lại nếu server chạy ở nơi khác
                data = {
                    "licensePlate": plate_text,
                    "rfid": ""  # hoặc truyền mã RFID nếu có
                }
                try:
                    response = requests.post(url, json=data)
                    print("Server response (raw):", response.text)
                except Exception as e:
                    print("Lỗi khi gửi lên server:", e)
            else:
                print("Không nhận diện được biển số!")

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main() 