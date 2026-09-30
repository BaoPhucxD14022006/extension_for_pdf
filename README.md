# 📚 Edge AI PDF Translator & Reader (NVIDIA Nemotron 3.5 Lightning)

Extension trình đọc và dịch thuật PDF thông minh dành cho **Microsoft Edge** và **Google Chrome (Manifest V3)**, tích hợp mô hình Mixture-of-Experts thế hệ mới **NVIDIA Nemotron 3.5 Lightning 30B A3B (`nvidia/nemotron-3.5-lightning-30b-a3b`)**.

---

## ✨ Tính Năng Nổi Bật

1. **⚡ Dịch Thuật Trí Tuệ Nhân Tạo NVIDIA Nemotron 3.5 Lightning (30B/3B MoE)**:
   - Gọi trực tiếp đến API NVIDIA NIM (`nvidia/nemotron-3.5-lightning-30b-a3b`).
   - **Tối ưu hóa Structured JSON Schema**: Ép mô hình trả về cấu trúc JSON chuẩn `{"translation": "..."}`, loại bỏ hoàn toàn các câu thừa thãi hay suy nghĩ lan man.
   - **Lọc suy nghĩ thông minh (Thinking/Reasoning filter)**: Tự động loại bỏ thẻ `<think>...</think>` của các mô hình MoE reasoning, chỉ giữ lại văn bản dịch thuần túy, mượt mà và chuẩn học thuật.
   - Tự động khắc phục lỗi ngắt dòng của PDF (*glues broken lines & hyphens*), giúp câu văn liền mạch.

2. **🪄 Bôi Đen Nổi Bong Bóng Tức Thì (Floating Action Bubble)**:
   - Khi bôi đen văn bản trong file PDF, bong bóng công cụ xuất hiện ngay tại vị trí con trỏ chuột.
   - Hỗ trợ dịch tự động, phát âm tiếng Anh (Text-to-Speech), sao chép câu văn sạch.

3. **🖍️ Highlight Đa Sắc Màu (5 Cấp Độ)**:
   - Tô màu văn bản: 🟡 Vàng, 🟢 Xanh lá, 🔵 Xanh dương, 🟣 Hồng, 🟠 Cam.
   - Tọa độ lưu theo tỷ lệ phần trăm (percentage-based), đảm bảo khi phóng to/thu nhỏ (Zoom in/out) hay xoay trang thì highlight vẫn bám chuẩn xác từng chữ.
   - Rê chuột vào đoạn highlight để xem lại ngay bản dịch tiếng Việt trước đó!

4. **📝 Chú Thích & Ghi Chú Chuyên Sâu (Annotations & Notes)**:
   - Gắn ghi chú cá nhân, phân tích bài học vào từng đoạn văn bản.
   - Danh sách ghi chú tự động gom vào thanh bên (Sidebar), click là nhảy ngay đến đúng trang.

5. **💾 Xuất File Linh Hoạt**:
   - **Tải PDF đã Highlight**: Nhúng trực tiếp các vết highlight vào file PDF bằng `pdf-lib` (mở trên Edge, Adobe Acrobat hay Foxit Reader đều xem được).
   - **Xuất Sổ từ vựng (Markdown)**: Dành cho Obsidian, Notion, Logseq.
   - **Xuất Flashcards Anki (`.txt`)**: Định dạng sẵn sàng nạp 1-click vào phần mềm Anki.

6. **👁️ 4 Chế Độ Đọc Thân Thiện Với Mắt**:
   - **Light** (Sáng mặc định)
   - **Dark** (Nền tối chống mỏi mắt ban đêm)
   - **Sepia** (Màu ngả vàng giống trang sách cổ điển)
   - **Green** (Màu xanh dịu bảo vệ mắt)

---

## 🚀 Hướng Dẫn Cài Đặt Vào Microsoft Edge

### Bước 1: Mở trang quản lý tiện ích của Edge
1. Mở trình duyệt **Microsoft Edge**.
2. Nhập vào thanh địa chỉ: `edge://extensions` và bấm **Enter**.

### Bước 2: Bật Chế độ dành cho nhà phát triển (Developer Mode)
- Ở thanh menu bên trái, bật công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** sang trạng thái **BẬT (ON)**.

### Bước 3: Nạp Extension
1. Nhấp vào nút **"Tải tiện ích đã giải nén" (Load unpacked)** ở góc trên.
2. Chọn thư mục dự án: `d:\Extension_translate_pdf` và bấm **Select Folder**.
3. Extension sẽ xuất hiện trên thanh công cụ của Edge với biểu tượng **Edge AI PDF**.

---

## 🔑 Hướng Dẫn Cấu Hình NVIDIA API Key

1. Bấm vào biểu tượng của tiện ích trên thanh công cụ Edge để mở cửa sổ nhỏ (Popup).
2. Dán mã **NVIDIA API Key** (bắt đầu bằng `nvapi-...`) vào ô nhập liệu.
3. Bấm **"Lưu Key"** rồi bấm **"Kiểm tra kết nối"** để thử nghiệm mô hình `nvidia/nemotron-3.5-lightning-30b-a3b`.
4. Khi thấy thông báo *"Kết nối NVIDIA API thành công!"*, bạn đã sẵn sàng sử dụng!

---

## 📖 Cách Sử Dụng

1. **Mở Trình Đọc PDF**:
   - Bấm vào icon extension ➔ Chọn **"Mở Trình đọc PDF"** hoặc chọn/kéo thả file PDF vào ô tải.
   - Hoặc bạn có thể bấm **"Mở tài liệu mẫu thử nghiệm"** để trải nghiệm ngay văn bản mẫu có sẵn.
2. **Dịch & Highlight**:
   - Dùng chuột bôi đen đoạn văn tiếng Anh bạn muốn đọc.
   - Bấm nút **Dịch AI** (hoặc xem thẻ dịch tự động xuất hiện).
   - Bấm chọn màu để **Highlight đoạn văn & lưu vào sổ từ vựng**.
3. **Xem & Ôn Tập**:
   - Mở thanh bên trái (Sidebar) để xem danh sách toàn bộ từ vựng và chú thích đã lưu.
   - Bấm **"Xuất file"** trên thanh công cụ khi muốn tải file PDF đã highlight hoặc xuất sang Anki/Markdown.
