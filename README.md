# Tool1 — Parts Card Printer

Tool in Parts Card từ Excel cho trợ lý. **Excel vẫn là nguồn dữ liệu duy nhất**; tool không thay đổi file và không lưu PO/LOT vào database. Không liên quan đến ERP Kumitech/VNJS.

## Chạy tại công ty

Yêu cầu **Node.js >= 22.16** (không có npm dependencies).

```bash
npm start
```

Mở `http://localhost:4173` trên máy chạy tool, hoặc `http://<IP-máy-chạy-tool>:4173` từ máy khác trong mạng LAN. Đổi cổng bằng `PORT=4180 npm start` (Windows PowerShell: `$env:PORT=4180; npm start`). Máy server cần cho phép kết nối đến cổng tương ứng, và chỉ mở trong LAN; chưa có đăng nhập, **không mở Internet công khai**.

## Cách dùng

1. Trợ lý cập nhật Excel như mọi khi, lưu định dạng `.xlsx`.
2. Mở tool → **Chọn file Excel**; app tự tìm sheet có `P.O NO`, `NEW LOT NO`, `PART NO`, `NEW Q'TY`.
3. Tìm kiếm theo mã SP / PO / LOT, chọn dòng cần in. Có thể chọn tất cả dòng trong bộ lọc.
4. Chọn một trong hai chế độ:
   - **Giấy trắng · in nền màu:** in đầy đủ màu tem trên máy in màu.
   - **Giấy màu sẵn · chỉ in chữ:** chỉ được chọn Lot cùng màu để không đặt nhầm giấy.
5. **Xem trước và in** → trong tab mới bấm **In / Lưu PDF** → Ctrl+P → chọn máy in hoặc **Save as PDF**. Đặt **A4 / Portrait / Scale 100% / Margins None / Background graphics On** để đủ 12 tem/trang.

Nếu trình duyệt chặn tab mới, tool mở bản in ngay trong tab hiện tại.

## Quy định màu (file “Quy định sử dụng Parts Card theo màu”)

- **Cam:** LOT bắt đầu `6` hoặc `8` (ưu tiên cao nhất).
- **Xanh lá:** tháng 1,5,9 → `501`, `505`, `509`; `001`, `005`, `009`; `RS01/05/09`, `SK01/05/09`, `BK01/05/09`.
- **Trắng:** tháng 2,6,10 → `502`, `506`, `510`; `002`, `006`, `010`; `RS02/06/10`, `SK02/06/10`, `BK02/06/10`.
- **Xanh da trời:** tháng 3,7,11 → `503`, `507`, `511`; `003`, `007`, `011`; `RS03/07/11`, `SK03/07/11`, `BK03/07/11`.
- **Vàng:** tháng 4,8,12 → `504`, `508`, `512`; `004`, `008`, `012`; `RS04/08/12`, `SK04/08/12`, `BK04/08/12`.

Không xét màu tô ô Excel. LOT không khớp quy định bị đánh dấu và **không cho in**. Lỗi số lượng/PO cũng bị chặn.

## Mapping dữ liệu và giới hạn

| Excel dữ liệu | Parts Card |
| --- | --- |
| A — P.O NO | PO NO |
| B — NEW LOT NO | LOT NO + màu |
| C — FACTORY CODE | MODEL No. |
| D — PART NO | PARTS No. |
| E — PART NAME | PARTS NAME |
| F — NEW Q'TY | QUANTITY |

**SUPPLIER và ASSY DAY để trống:** File Excel nguồn không có hai trường tương ứng. Không tự thay ASSY DAY bằng DELIVERY NEW hoặc ngày hiện tại. Đây là quyết định an toàn để không in sai nghiệp vụ; muốn tự điền cần cung cấp nguồn/giá trị chuẩn. Ứng dụng không nhân số tem theo Q'TY: mặc định **1 Lot được chọn = 1 tem**, đúng cơ chế chọn PO/Lot. Chỉ đọc một sheet PO hợp lệ đầu tiên, tránh in trùng sheet `6g1973` và `con lai` trong file mẫu.

## Kỹ thuật

- Backend Node.js/TypeScript không phụ thuộc thư viện ngoài. Bộ đọc `.xlsx` stream ZIP/XML, không nạp một triệu dòng ô đã format vào RAM.
- Frontend HTML/CSS/JavaScript chạy trong trình duyệt; in với CSS `@page size: A4`, grid `3 × 4`.
- Chỉ lưu file Excel trên thư mục tạm trong thời gian import rồi xóa. Dữ liệu trả về trình duyệt đang mở, không dùng DB, không lưu trên server sau import.
- Header/CSP chống render nội dung Excel thành HTML, tất cả chuỗi bảng in dùng `textContent`.

## Kiểm thử

```bash
npm test
```

**Trước khi dùng đại trà:** in thử một trang với máy in thực tế, so kích thước/canh tem với mẫu `.xlsx`. Vị trí giấy và margin máy in có thể cần hiệu chỉnh 1–2 mm; không mặc định bản CSS đã được nghiệm thu in giấy thật.
