# Luyện tập Hệ điều hành

[Luyện 110 câu trên GitHub Pages](https://nguyenkhanhtv12345ko-lang.github.io/luyen-tap-he-dieu-hanh/).

Bộ câu hỏi được trích từ **110_cau_trac_nghiem_He_dieu_hanh_C1_C2.docx** theo thứ tự tài liệu. Mỗi câu có bốn lựa chọn và lấy đáp án từ phần tô vàng. 100 câu đầu thuộc bộ ôn tập C1/C2. Câu 101–110 là phần mini game đã biên tập trong Word. Sau khi chấm, trang hiện ghi chú và trang PDF đối chiếu của Word ngay dưới đáp án.

| Bộ | Câu gốc |
| --- | --- |
| Đề 1 | 1–28 |
| Đề 2 | 29–56 |
| Đề 3 | 57–83 |
| Đề 4 | 84–110 |

Có thể đảo câu hỏi, phương án hoặc cả hai. Trang chấm bằng ID của nội dung đáp án. Phương án tổng hợp giữ vị trí khi cần. Câu 105 giữ thứ tự vì đáp án gọi tên nhận định A, B, C. Câu 108 cập nhật chữ cái của hai mục được nhắc trong phương án tổng hợp.

Trang lưu thứ tự, vị trí, câu đã làm và các câu đánh dấu trên cùng trình duyệt.

## Chạy và kiểm tra

    python -m http.server 8000
    node --test tests/quiz.test.mjs

Mở http://localhost:8000/. Để nhập lại dữ liệu từ bản Word có cùng định dạng:

    python tools/import_questions.py "110_cau_trac_nghiem_He_dieu_hanh_C1_C2.docx" questions.json

