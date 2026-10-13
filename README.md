# Tool1 — Parts Card Printer

Tool in Parts Card từ Excel cho trợ lý. **Excel vẫn là nguồn dữ liệu duy nhất**; tool không thay đổi file và không lưu PO/LOT vào database. Không liên quan đến ERP Kumitech/VNJS.

## Chạy tại công ty

Yêu cầu **Node.js >= 22.16** (không có npm dependencies).

```bash
npm start
```

Mở `http://localhost:4173`. Mặc định chỉ lắng nghe localhost; để dùng LAN đặt `HOST=0.0.0.0 npm start` (PowerShell: `$env:HOST='0.0.0.0'; npm start`). Đổi cổng bằng `PORT=4180 npm start`. Bộ cài Ubuntu bên dưới tự cấu hình HOST cho LAN. Tool chưa có đăng nhập; dùng trong mạng công ty.

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

**SUPPLIER và ASSY DAY để trống:** Bảng lấy hàng không có hai trường nguồn tương ứng. Không thay ASSY DAY bằng DELIVERY NEW hoặc ngày hiện tại. Mẫu output có hai ô này, nên giữ ô trống. Ứng dụng không nhân số tem theo Q'TY: **1 dòng được chọn = 1 tem**. Đọc toàn bộ các sheet có bảng A:F hợp lệ; chỉ bỏ sheet có toàn bộ dữ liệu giống sheet đã đọc và thông báo rõ. Giữ các dòng lặp trong cùng bảng, cảnh báo để người dùng kiểm tra. Không bỏ dữ liệu sau dòng 10.000 hoặc sau khoảng trống dài.

File `PARTS CARD ...xlsx` là mẫu output, không phải bảng A:F để import. Không tự gán dữ liệu của sheet UP trong file mẫu vào bảng lấy hàng khác.

**File quy định màu là chuẩn duy nhất.** Ghi chú và màu tô trong Excel data không thay đổi màu in. Backend, màn hình chọn và trang in dùng chung `public/lot-colors.js`; trang in kiểm tra lại màu theo Lot. Dữ liệu thiếu trường/số lượng không nguyên dương hoặc nội dung quá dài không được in. Đổi file sẽ xóa bảng cũ ngay; import lỗi không cho in nhầm dữ liệu cũ.

## Kỹ thuật

- Backend Node.js/TypeScript không phụ thuộc thư viện ngoài. Bộ đọc `.xlsx` stream ZIP/XML, không nạp một triệu dòng ô đã format vào RAM. Giới hạn 50.000 dòng dữ liệu; vượt giới hạn thì báo lỗi, không trả dữ liệu một phần.
- Frontend HTML/CSS/JavaScript chạy trong trình duyệt; in với CSS `@page size: A4`, grid `3 × 4`.
- Chỉ lưu file Excel trên thư mục tạm trong thời gian import rồi xóa. Dữ liệu trả về trình duyệt đang mở, không dùng DB, không lưu trên server sau import.
- Header/CSP chống render nội dung Excel thành HTML, tất cả chuỗi bảng in dùng `textContent`.

## Kiểm thử

```bash
npm test
```

**Trước khi dùng đại trà:** in thử một trang với máy in thực tế, so kích thước/canh tem với mẫu `.xlsx`. Vị trí giấy và margin máy in có thể cần hiệu chỉnh 1–2 mm; không mặc định bản CSS đã được nghiệm thu in giấy thật.

## Cài Ubuntu

Đặt source bundle `tool1-release.tar.gz` cùng file `install-ubuntu.sh` trong một folder, rồi chạy:

```bash
sudo bash install-ubuntu.sh
```

Bộ cài chạy test trước khi chuyển bản mới vào `/opt/tool1`, dùng service riêng `tool1.service`, port 4173. Không truy cập database hoặc sửa service của Kumitech/VNJS. Mở `http://<IP-Ubuntu>:4173` trong LAN; nếu có firewall, cấu hình truy cập LAN theo hạ tầng công ty. Trạng thái: `sudo systemctl status tool1`; log: `sudo journalctl -u tool1 -n 100 --no-pager`. Health: `/api/health`.

Kết quả đối chiếu dữ liệu mẫu và PDF nằm trong `VERIFICATION.md`. PDF mẫu được tạo từ trình duyệt Chrome với A4/100%/không header-footer/in nền.
