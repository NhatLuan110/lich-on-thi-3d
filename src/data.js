export const STORAGE_KEY = 'studyverse_3d_ptit_2026_v2';

export const SUBJECTS = [
  { code: 'BAS1158', short: 'Tiếng Anh', name: 'Tiếng Anh (Course 2)', credits: 4, examDate: '2026-12-15', shift: 'Ca 3', room: '2A23', format: '3 kỹ năng (L-R-W)', color: '#38bdf8', alert: 'Thi đầu tiên' },
  { code: 'BAS1151', short: 'KTCT Mác-Lênin', name: 'Kinh tế chính trị Mác - Lênin', credits: 2, examDate: '2026-12-18', shift: 'Ca 4', room: '2B33', format: 'Trắc nghiệm', color: '#c084fc', alert: '' },
  { code: 'BSA1309', short: 'Kinh tế lượng', name: 'Kinh tế lượng', credits: 3, examDate: '2026-12-22', shift: 'Ca 3', room: '2B32', format: 'Thi viết', color: '#fb923c', alert: 'Nặng mô hình' },
  { code: 'FIA1389', short: 'Kế toán KD', name: 'Kế toán cho kinh doanh', credits: 3, examDate: '2026-12-24', shift: 'Ca 2', room: '2A16', format: 'Thi viết', color: '#fb7185', alert: 'Cách KTL 1,5 ngày' },
  { code: 'MAR1424', short: 'QT Marketing', name: 'Quản trị Marketing', credits: 2, examDate: '2026-12-25', shift: 'Ca 1', room: '2B34', format: 'Thi viết', color: '#f472b6', alert: 'Sát Kế toán (1 tối)' },
  { code: 'SKD1103', short: 'Tạo lập VB', name: 'Kỹ năng tạo lập Văn bản', credits: 1, examDate: '2026-12-30', shift: 'Ca 4', room: '2A33', format: 'Thuyết trình', color: '#2dd4bf', alert: '' },
  { code: 'BSA1328', short: 'Quản trị học', name: 'Quản trị học', credits: 3, examDate: '2027-01-07', shift: 'Ca 2', room: '2A16', format: 'Thi viết', color: '#34d399', alert: 'Cày sâu sau 25/12' },
  { code: 'SKD1102', short: 'Làm việc nhóm', name: 'Kỹ năng làm việc nhóm', credits: 1, examDate: '2027-01-08', shift: 'Ca 4', room: '2B03', format: 'Thuyết trình', color: '#818cf8', alert: '' },
];

export const SUBJ_MAP = Object.fromEntries(SUBJECTS.map((s) => [s.code, s]));

export const INITIAL_DAYS = [
  // TUẦN 1: 16/11 - 22/11
  { date: '2026-11-16', wd: 'Thứ 2', shortWd: 'T2', week: 1, mwfBusy: true, slots: [
    { id: 'd01-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BSA1309', task: 'Chương 1–2: Mô hình hồi quy đơn & bản chất OLS' },
    { id: 'd01-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BAS1158', task: '[Listening] Luyện nghe bài mẫu + học từ vựng trọng tâm' },
    { id: 'd01-t', period: 'Tối', time: '22:00–23:00', mins: 60, subj: 'BAS1151', task: 'Đọc & gạch ý chính Chương 1–2 KTCT' },
  ]},
  { date: '2026-11-17', wd: 'Thứ 3', shortWd: 'T3', week: 1, mwfBusy: false, slots: [
    { id: 'd02-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'FIA1389', task: 'Nguyên lý kế toán, đối tượng & phương trình cân đối' },
    { id: 'd02-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'MAR1424', task: 'Tổng quan Marketing, môi trường & hành vi khách hàng' },
    { id: 'd02-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'BAS1158', task: '[Reading] Kỹ năng skimming/scanning + giải 2 bài đọc' },
  ]},
  { date: '2026-11-18', wd: 'Thứ 4', shortWd: 'T4', week: 1, mwfBusy: true, slots: [
    { id: 'd03-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BSA1309', task: 'Ước lượng OLS bằng tay & giải bài tập hồi quy đơn' },
    { id: 'd03-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BSA1328', task: 'Tổng quan quản trị & các trường phái lý thuyết' },
    { id: 'd03-t', period: 'Tối', time: '22:00–23:00', mins: 60, subj: 'SKD1103', task: 'Chốt đề tài thuyết trình & lập dàn ý khung' },
  ]},
  { date: '2026-11-19', wd: 'Thứ 5', shortWd: 'T5', week: 1, mwfBusy: false, slots: [
    { id: 'd04-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BAS1158', task: '[Writing] Cấu trúc bài viết chuẩn & luyện viết 1 bài mẫu' },
    { id: 'd04-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'FIA1389', task: 'Hệ thống tài khoản kế toán & nguyên tắc ghi sổ kép' },
    { id: 'd04-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'MAR1424', task: 'Nghiên cứu thị trường & chiến lược STP' },
  ]},
  { date: '2026-11-20', wd: 'Thứ 6', shortWd: 'T6', week: 1, mwfBusy: true, slots: [
    { id: 'd05-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BSA1309', task: 'Bài tập tính hệ số xác định R², phương sai & sai số chuẩn' },
    { id: 'd05-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BAS1151', task: 'Chương 3: Học thuyết Giá trị thặng dư & tích lũy tư bản' },
    { id: 'd05-t', period: 'Tối', time: '22:00–23:00', mins: 60, subj: 'SKD1102', task: 'Chốt chủ đề nhóm, chia phần & thống nhất deadline' },
  ]},
  { date: '2026-11-21', wd: 'Thứ 7', shortWd: 'T7', week: 1, mwfBusy: false, slots: [
    { id: 'd06-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'FIA1389', task: 'Thực hành định khoản các nghiệp vụ kinh tế cơ bản' },
    { id: 'd06-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BAS1158', task: '[Listening] Luyện nghe trọn bộ đề mẫu + chép lại chỗ hụt' },
    { id: 'd06-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'BSA1328', task: 'Chức năng Hoạch định & ra quyết định quản trị' },
  ]},
  { date: '2026-11-22', wd: 'Chủ nhật', shortWd: 'CN', week: 1, mwfBusy: false, slots: [
    { id: 'd07-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BAS1158', task: '[Reading + Writing] Luyện 2 bài đọc dài + viết đoạn thân bài' },
    { id: 'd07-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'MAR1424', task: 'Chiến lược Sản phẩm (Product, vòng đời SP, thương hiệu)' },
    { id: 'd07-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'BSA1309', task: 'Tổng hợp sổ tay công thức Tuần 1 + làm bài tập ôn tập' },
  ]},

  // TUẦN 2: 23/11 - 29/11
  { date: '2026-11-23', wd: 'Thứ 2', shortWd: 'T2', week: 2, mwfBusy: true, slots: [
    { id: 'd08-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'FIA1389', task: 'Kế toán mua hàng, hàng tồn kho & tính giá xuất kho' },
    { id: 'd08-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BAS1158', task: '[Listening] Luyện nghe dạng điền từ & trắc nghiệm nhanh' },
    { id: 'd08-t', period: 'Tối', time: '22:00–23:00', mins: 60, subj: 'SKD1103', task: 'Viết nội dung chi tiết cho dàn ý thuyết trình Văn bản' },
  ]},
  { date: '2026-11-24', wd: 'Thứ 3', shortWd: 'T3', week: 2, mwfBusy: false, slots: [
    { id: 'd09-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BSA1309', task: 'Mô hình hồi quy bội & ý nghĩa hệ số hồi quy riêng' },
    { id: 'd09-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BAS1151', task: 'Chương 4: Cạnh tranh, độc quyền & độc quyền nhà nước' },
    { id: 'd09-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'FIA1389', task: 'Bài tập định khoản bán hàng, doanh thu & giảm trừ' },
  ]},
  { date: '2026-11-25', wd: 'Thứ 4', shortWd: 'T4', week: 2, mwfBusy: true, slots: [
    { id: 'd10-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BAS1158', task: '[Writing] Viết bài hoàn chỉnh + tự rà lỗi ngữ pháp' },
    { id: 'd10-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'MAR1424', task: 'Chiến lược Giá (Price): phương pháp & điều chỉnh giá' },
    { id: 'd10-t', period: 'Tối', time: '22:00–23:00', mins: 60, subj: 'SKD1102', task: 'Soạn nội dung phần được phân công trong nhóm' },
  ]},
  { date: '2026-11-26', wd: 'Thứ 5', shortWd: 'T5', week: 2, mwfBusy: false, slots: [
    { id: 'd11-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BSA1309', task: 'Khoảng tin cậy & kiểm định giả thuyết (t, F)' },
    { id: 'd11-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BSA1328', task: 'Chức năng Tổ chức & Lãnh đạo (cơ cấu, động viên)' },
    { id: 'd11-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'BAS1158', task: '[Reading] Luyện đọc học thuật & phân tích bẫy từ đồng nghĩa' },
  ]},
  { date: '2026-11-27', wd: 'Thứ 6', shortWd: 'T6', week: 2, mwfBusy: true, slots: [
    { id: 'd12-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'FIA1389', task: 'Kế toán chi phí, kết quả KD & bút toán kết chuyển' },
    { id: 'd12-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'MAR1424', task: 'Phân phối (Place) & Xúc tiến hỗn hợp (Promotion)' },
    { id: 'd12-t', period: 'Tối', time: '22:00–23:00', mins: 60, subj: 'BAS1151', task: 'Làm 60–80 câu trắc nghiệm Chương 1–4 + note câu sai' },
  ]},
  { date: '2026-11-28', wd: 'Thứ 7', shortWd: 'T7', week: 2, mwfBusy: false, slots: [
    { id: 'd13-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BAS1158', task: '[3 kỹ năng] 1 Listening + 1 Reading + lập dàn ý Writing' },
    { id: 'd13-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BSA1309', task: 'Biến giả (Dummy) & đọc bảng kết quả phần mềm' },
    { id: 'd13-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'BSA1328', task: 'Chức năng Kiểm soát + tóm tắt khung kiến thức' },
  ]},
  { date: '2026-11-29', wd: 'Chủ nhật', shortWd: 'CN', week: 2, mwfBusy: false, slots: [
    { id: 'd14-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'FIA1389', task: 'Thực hành lập Bảng cân đối kế toán & Báo cáo KQKD' },
    { id: 'd14-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BAS1151', task: 'Chương 5–6 KTCT + làm trắc nghiệm từng chương' },
    { id: 'd14-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'MAR1424', task: 'Hệ thống toàn bộ STP + 4P thành sơ đồ tư duy khung' },
  ]},

  // TUẦN 3: 30/11 - 06/12
  { date: '2026-11-30', wd: 'Thứ 2', shortWd: 'T2', week: 3, mwfBusy: true, slots: [
    { id: 'd15-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BSA1309', task: 'Đa cộng tuyến & Phương sai sai số thay đổi' },
    { id: 'd15-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BAS1158', task: '[Listening] Luyện đề bấm giờ chuẩn thi thật' },
    { id: 'd15-t', period: 'Tối', time: '22:00–23:00', mins: 60, subj: 'BAS1151', task: 'Ôn lại nhóm câu trắc nghiệm hay nhầm Chương 1–4' },
  ]},
  { date: '2026-12-01', wd: 'Thứ 3', shortWd: 'T3', week: 3, mwfBusy: false, slots: [
    { id: 'd16-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'FIA1389', task: 'Giải bài tập tổng hợp chuỗi 10–15 nghiệp vụ cuối kỳ' },
    { id: 'd16-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'MAR1424', task: 'Luyện trả lời câu hỏi tự luận lý thuyết & tình huống' },
    { id: 'd16-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'BSA1309', task: 'Tự tương quan, chọn dạng hàm & đọc bảng kết quả' },
  ]},
  { date: '2026-12-02', wd: 'Thứ 4', shortWd: 'T4', week: 3, mwfBusy: true, slots: [
    { id: 'd17-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BAS1158', task: '[Reading + Writing] Luyện tốc độ Reading + viết 1 bài' },
    { id: 'd17-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BSA1328', task: 'Hoàn thành tóm tắt các chương Quản trị học còn lại' },
    { id: 'd17-t', period: 'Tối', time: '22:00–23:00', mins: 60, subj: 'SKD1103', task: 'Dựng xong bản slide nháp Tạo lập Văn bản' },
  ]},
  { date: '2026-12-03', wd: 'Thứ 5', shortWd: 'T5', week: 3, mwfBusy: false, slots: [
    { id: 'd18-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'FIA1389', task: 'Kiểm tra các lỗi mất điểm phổ biến khi cân bảng BCTC' },
    { id: 'd18-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BAS1151', task: 'Giải 2 đề trắc nghiệm tổng hợp toàn bộ giáo trình' },
    { id: 'd18-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'BAS1158', task: '[Writing] Viết 2 bài theo template chuẩn & chốt mẫu câu' },
  ]},
  { date: '2026-12-04', wd: 'Thứ 6', shortWd: 'T6', week: 3, mwfBusy: true, slots: [
    { id: 'd19-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BSA1309', task: 'Giải đề thi viết Kinh tế lượng mẫu #1' },
    { id: 'd19-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'MAR1424', task: 'Giải các câu hỏi tình huống Marketing thực tế' },
    { id: 'd19-t', period: 'Tối', time: '22:00–23:00', mins: 60, subj: 'SKD1102', task: 'Ráp nội dung vào khung slide nháp của nhóm' },
  ]},
  { date: '2026-12-05', wd: 'Thứ 7', shortWd: 'T7', week: 3, mwfBusy: false, slots: [
    { id: 'd20-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BAS1158', task: '[Mock Test #1] Thi thử trọn vẹn 3 kỹ năng L-R-W' },
    { id: 'd20-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'FIA1389', task: 'Giải đề thi thử Kế toán #1 (bấm giờ)' },
    { id: 'd20-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'MAR1424', task: 'Tổng hợp bộ câu hỏi tủ + từ khóa cốt lõi từng chương' },
  ]},
  { date: '2026-12-06', wd: 'Chủ nhật', shortWd: 'CN', week: 3, mwfBusy: false, slots: [
    { id: 'd21-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BSA1309', task: 'Giải đề thi viết Kinh tế lượng mẫu #2 + rà bảng tra' },
    { id: 'd21-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BSA1328', task: 'Đọc lướt ngân hàng câu hỏi ôn thi (cất sang 26/12)' },
    { id: 'd21-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'FIA1389', task: 'Rà soát toàn bộ sổ tay định khoản & công thức tính giá' },
  ]},

  // TUẦN 4: 07/12 - 13/12
  { date: '2026-12-07', wd: 'Thứ 2', shortWd: 'T2', week: 4, mwfBusy: true, slots: [
    { id: 'd22-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BAS1158', task: '[Mock Test #2] Thi thử trọn vẹn 3 kỹ năng L-R-W' },
    { id: 'd22-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BSA1309', task: 'Chữa kỹ đề #1, #2 & dạng kiểm định hay nhầm' },
    { id: 'd22-t', period: 'Tối', time: '22:00–23:00', mins: 60, subj: 'BAS1151', task: 'Làm nhanh 1 đề trắc nghiệm tổng hợp' },
  ]},
  { date: '2026-12-08', wd: 'Thứ 3', shortWd: 'T3', week: 4, mwfBusy: false, slots: [
    { id: 'd23-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'FIA1389', task: 'Giải đề thi thử Kế toán #2 (bấm giờ như thi thật)' },
    { id: 'd23-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'MAR1424', task: 'Viết thử 1 đề Marketing hoàn chỉnh + rút ý trọng tâm' },
    { id: 'd23-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'BAS1158', task: '[Chữa đề #2] Phân tích câu sai L-R & viết lại Writing' },
  ]},
  { date: '2026-12-09', wd: 'Thứ 4', shortWd: 'T4', week: 4, mwfBusy: true, slots: [
    { id: 'd24-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BSA1309', task: 'Giải đề thi viết Kinh tế lượng #3 (bấm giờ chuẩn)' },
    { id: 'd24-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BAS1151', task: 'Tổng hợp danh sách câu trắc nghiệm hay sai / câu bẫy' },
    { id: 'd24-t', period: 'Tối', time: '22:00–23:00', mins: 60, subj: 'BAS1158', task: '[Writing] Ôn cụm collocations & mẫu câu nối ăn điểm' },
  ]},
  { date: '2026-12-10', wd: 'Thứ 5', shortWd: 'T5', week: 4, mwfBusy: false, slots: [
    { id: 'd25-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BAS1158', task: '[Mock Test #3] Thi thử trọn vẹn 3 kỹ năng L-R-W' },
    { id: 'd25-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'FIA1389', task: 'Chữa lỗi đề #2 & chốt bảng công thức tính giá/khấu hao' },
    { id: 'd25-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'MAR1424', task: 'Hoàn thiện TỜ TÓM TẮT 2 MẶT / MINDMAP (cho tối 24/12)' },
  ]},
  { date: '2026-12-11', wd: 'Thứ 6', shortWd: 'T6', week: 4, mwfBusy: true, slots: [
    { id: 'd26-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BSA1309', task: 'Chốt sổ tay công thức + quy trình giải từng dạng viết' },
    { id: 'd26-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BAS1158', task: 'Luyện sâu kỹ năng yếu nhất (Listening / Reading)' },
    { id: 'd26-t', period: 'Tối', time: '22:00–23:00', mins: 60, subj: 'BAS1151', task: 'Chạy 1 đề trắc nghiệm tốc độ cao' },
  ]},
  { date: '2026-12-12', wd: 'Thứ 7', shortWd: 'T7', week: 4, mwfBusy: false, slots: [
    { id: 'd27-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'FIA1389', task: 'Giải nhanh đề Kế toán #3 để giữ độ chắc tay' },
    { id: 'd27-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'MAR1424', task: 'Đọc thuộc lại toàn bộ tờ mindmap 2 mặt' },
    { id: 'd27-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'BSA1309', task: 'Giải nốt dạng bài lạ / câu phân loại lấy điểm cao' },
  ]},
  { date: '2026-12-13', wd: 'Chủ nhật', shortWd: 'CN', week: 4, mwfBusy: false, slots: [
    { id: 'd28-s', period: 'Sáng', time: '08:00–10:25', mins: 145, subj: 'BAS1158', task: '[Mock Test #4] Thi thử tổng hợp chốt phong độ' },
    { id: 'd28-c', period: 'Chiều', time: '15:30–17:20', mins: 110, subj: 'BAS1151', task: 'Chốt gọn bộ câu hỏi sai KTCT (để 16/12 lấy ra ôn)' },
    { id: 'd28-t', period: 'Tối', time: '20:00–22:15', mins: 135, subj: 'BAS1158', task: 'Rà lỗi chính tả/ngữ pháp Writing + giữ sức thi 15/12' },
  ]},
];

export const EXAM_CHECKLIST_INIT = [
  { id: 'ex1', code: 'BAS1158', label: '14/12 – 15/12 (Ca 3): Ôn nhẹ & thi Tiếng Anh (3 kỹ năng L-R-W) · P.2A23', done: false },
  { id: 'ex2', code: 'BAS1151', label: 'Tối 15/12 – Sáng 18/12 (Ca 4): Cày bộ câu sai trắc nghiệm & thi KTCT · P.2B33', done: false },
  { id: 'ex3', code: 'BSA1309', label: 'Tối 18/12 – Sáng 22/12 (Ca 3): Luyện đề tốc độ & thi viết Kinh tế lượng · P.2B32', done: false },
  { id: 'ex4', code: 'FIA1389', label: 'Tối 22/12 – 23/12 → 24/12 (Ca 2): Sổ tay định khoản & thi Kế toán · P.2A16', done: false },
  { id: 'ex5', code: 'MAR1424', label: 'Chiều-Tối 24/12 → 25/12 (Ca 1): Đọc mindmap 2 mặt, ngủ sớm & thi Marketing · P.2B34', done: false },
  { id: 'ex6', code: 'SKD1103', label: '26/12 – Sáng 30/12 (Ca 4): Hoàn thiện slide, tập nói & thuyết trình Văn bản · P.2A33', done: false },
  { id: 'ex7', code: 'BSA1328', label: '31/12 – 06/01 → 07/01 (Ca 2): Cày sâu & thi viết Quản trị học · P.2A16', done: false },
  { id: 'ex8', code: 'SKD1102', label: 'Chiều 07/01 – Sáng 08/01 (Ca 4): Tổng duyệt nhóm & thuyết trình · P.2B03', done: false },
];
