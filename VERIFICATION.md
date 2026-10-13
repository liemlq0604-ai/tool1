# Kết quả kiểm tra Parts Card — 13/10/2026

## Chuẩn áp dụng

Màu lấy duy nhất từ `Quy đinh sử dụng part card 3 (2).xls`, Sheet1. Không dùng màu tô hoặc ghi chú trong Excel data. Đã đọc độc lập đủ 62 tiền tố quy định: 12 tháng × 5 dạng tiền tố số/RS/SK/BK, cộng tiền tố 6 và 8 màu cam.

Nền màu được đối chiếu với các ảnh mẫu nhúng trong file quy định, không lấy màu demo cũ:

| Màu | RGB / HEX |
|---|---|
| Xanh lá | 102,255,153 / #66FF99 |
| Trắng | 255,255,255 / #FFFFFF |
| Xanh da trời | 153,204,255 / #99CCFF |
| Vàng | 255,255,153 / #FFFF99 |
| Cam | 196,89,17 / #C45911 |

Bố cục theo file output `PARTS CARD NGAY100 Trang có assyday) 2 (1).xlsx`: PO, LOT, MODEL, PART, PARTS NAME, QUANTITY, SUPPLIER, ASSY DAY; A4 dọc, 3×4 tem. SUPPLIER/ASSY DAY giữ trống vì bảng lấy hàng không cung cấp hai trường đó. Không dùng dữ liệu của file mẫu để điền vào lệnh khác, không thay ngày lắp ráp bằng ngày giao hàng.

## Đối chiếu toàn bộ data

Nguồn: `Copy of Dữ liệu lấy hàng 05.10-da loc thang 10 (1).xlsx`, A5:F247 của sheet `6g1973`. Sheet `con lai` có dữ liệu giống hoàn toàn và được báo là bản sao, không nhập hai lần.

| Mã SP | Số dòng / tem | Tổng sản phẩm |
|---|---:|---:|
| 6G1973011 | 181 | 87.305 |
| 6H4387021 | 34 | 2.850 |
| 6H4387031 | 23 | 2.859 |
| 6Q0698011 | 1 | 50 |
| 6Q3647010 | 4 | 360 |
| Tổng | 243 | 93.424 |

Màu: trắng 5, xanh da trời 158, vàng 66, cam 14; không có xanh lá trong data này. Tổng khớp Sheet2!B9. Đã so từng trường A:F của cả 243 dòng bằng bộ đọc độc lập, không chỉ so tổng.

## Kiểm thử phần mềm

- 10/10 test tự động pass trên Windows Node 24 và trực tiếp Ubuntu Node 22.23.2. Bao gồm màu, trường bắt buộc, sai màu, số lượng sai, health/assets, file hỏng, whitelist đường dẫn, sheet sao chép, sheet khác nhau, dòng sau khoảng trống dài, dòng sau 10.000, trùng dòng và vượt 50.000 dòng.
- Trình duyệt Chrome thật: import Excel 45 MB qua HTTP, lọc đủ 5 mã SP, chọn/in, kiểm tra màu và dữ liệu từng tem.
- Giấy trắng/in nền: 243 tem, 21 trang A4, trang cuối 3 tem.
- Giấy màu/chỉ chữ: chặn chọn nhiều màu. Đã xuất thử 158 Lot xanh da trời, 14 trang, nền PDF trắng.
- Kiểm tra cả 5 màu trên trình duyệt, gồm xanh lá bằng dữ liệu test riêng vì data thật không có Lot xanh lá.
- Đổi file/import lỗi: xóa dữ liệu cũ, khóa in; không thể in nhầm bảng trước.
- Trang in kiểm tra lại dữ liệu/màu theo Lot; không chấp nhận payload sai màu.
- Nội dung quá dài: báo lỗi/khóa in thay vì cắt chữ.
- Không có lỗi JavaScript trong các luồng kiểm tra chính.

## Kiểm tra PDF đã lưu

- `output/pdf/parts-card-all-color.pdf`: 21 trang A4, đủ 243 tem.
- `output/pdf/parts-card-blue-paper-black.pdf`: 14 trang A4, đủ 158 tem.
- Đọc lại PDF sau xuất bằng pypdf/pdfplumber: khớp PO/Lot/Model/mã SP/tên/số lượng từng tem, không chỉ đối chiếu DOM trước khi xuất.
- Kiểm tra màu nền thực trong PDF cho từng tem, kích thước A4 và số trang.
- Đã render và xem trang đầu, trang có cam/vàng và trang cuối; chữ, đường kẻ và các ô hiển thị rõ.

## Phạm vi đã đạt và giới hạn

Phần mềm và PDF mẫu đã đạt các kiểm tra trên. Chưa nghiệm thu máy in vật lý; khi in giấy cần dùng A4 dọc, 100%, không header/footer, không margin trình duyệt; bật background graphics cho giấy trắng. Màu trên giấy còn phụ thuộc máy in/giấy; RGB trên PDF đã đối chiếu đúng ảnh mẫu trong file quy định.

Đã chuẩn bị bộ cài service Ubuntu riêng cho Tool1; chưa tự cài/kích hoạt service production. Không dùng DB, không sửa service hoặc dữ liệu ERP Kumitech/VNJS.
