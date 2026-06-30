import LegalLayout from "@/app/pages/legal/LegalLayout";

const Privacy = () => (
  <LegalLayout title="Chính sách quyền riêng tư" lastUpdated="27/06/2026">
    <p>
      Chính sách này giải thích ChipTrip thu thập, sử dụng và bảo vệ dữ liệu cá
      nhân của bạn như thế nào, phù hợp với Nghị định 13/2023/NĐ-CP về bảo vệ dữ
      liệu cá nhân. Bằng việc sử dụng Dịch vụ, bạn đồng ý với chính sách này.
    </p>

    <h2>1. Dữ liệu chúng tôi thu thập</h2>
    <ul>
      <li><strong>Thông tin tài khoản:</strong> email, họ tên, ảnh đại diện, mật khẩu (được mã hóa).</li>
      <li><strong>Đăng nhập Google:</strong> nếu bạn dùng Google, chúng tôi nhận email, tên và ảnh đại diện từ tài khoản Google của bạn.</li>
      <li><strong>Dữ liệu sử dụng:</strong> lịch trình, chuyến đi, gu du lịch (preferences), checklist, bình luận, đánh giá, tin nhắn hỗ trợ.</li>
      <li><strong>Dữ liệu thanh toán:</strong> mã đơn hàng, số tiền, trạng thái giao dịch. Chúng tôi <strong>không</strong> lưu số thẻ — thanh toán xử lý qua cổng SePay.</li>
      <li><strong>Dữ liệu kỹ thuật:</strong> sự kiện sử dụng ẩn danh phục vụ thống kê (qua PostHog), nhật ký truy cập cơ bản.</li>
    </ul>

    <h2>2. Mục đích sử dụng</h2>
    <ul>
      <li>Cung cấp và vận hành Dịch vụ: tạo lịch trình, cá nhân hóa gợi ý theo gu du lịch.</li>
      <li>Xử lý thanh toán và cộng credit.</li>
      <li>Gửi thông báo liên quan đến chuyến đi, hỗ trợ và bảo mật tài khoản.</li>
      <li>Phân tích ẩn danh để cải thiện sản phẩm và đo lường hiệu quả.</li>
    </ul>

    <h2>3. Chia sẻ với bên thứ ba</h2>
    <p>
      Chúng tôi chỉ chia sẻ dữ liệu ở mức tối thiểu cần thiết với các nhà cung cấp
      sau để vận hành Dịch vụ:
    </p>
    <ul>
      <li><strong>Goong</strong> — bản đồ, geocoding (truy vấn tìm địa điểm).</li>
      <li><strong>SerpApi</strong> — làm giàu thông tin địa điểm/khách sạn.</li>
      <li><strong>Nhà cung cấp AI</strong> — sinh nội dung lịch trình từ dữ liệu bạn nhập.</li>
      <li><strong>SePay</strong> — xử lý thanh toán.</li>
      <li><strong>Google</strong> — đăng nhập OAuth (nếu bạn chọn).</li>
      <li><strong>Cloudflare R2</strong> — lưu trữ ảnh bạn gửi trong chat hỗ trợ.</li>
      <li><strong>PostHog</strong> — phân tích hành vi ẩn danh.</li>
    </ul>
    <p>Chúng tôi <strong>không bán</strong> dữ liệu cá nhân của bạn cho bên thứ ba.</p>

    <h2>4. Lưu trữ và bảo mật</h2>
    <p>
      Mật khẩu được băm (BCrypt), token được lưu dưới dạng hash. Dữ liệu được lưu
      trong thời gian tài khoản còn hoạt động và theo yêu cầu pháp luật. Chúng tôi
      áp dụng các biện pháp kỹ thuật hợp lý để bảo vệ dữ liệu, song không hệ thống
      nào an toàn tuyệt đối.
    </p>

    <h2>5. Quyền của bạn</h2>
    <p>Theo Nghị định 13/2023/NĐ-CP, bạn có quyền:</p>
    <ul>
      <li>Truy cập, chỉnh sửa thông tin cá nhân trong trang Hồ sơ.</li>
      <li>Yêu cầu xóa tài khoản và dữ liệu liên quan.</li>
      <li>Rút lại sự đồng ý xử lý dữ liệu (có thể ảnh hưởng đến việc dùng Dịch vụ).</li>
      <li>Khiếu nại về việc xử lý dữ liệu cá nhân của bạn.</li>
    </ul>

    <h2>6. Cookie và lưu trữ cục bộ</h2>
    <p>
      Chúng tôi dùng localStorage/cookie để duy trì phiên đăng nhập và phục vụ
      thống kê ẩn danh. Bạn có thể xóa chúng trong trình duyệt, nhưng điều này có
      thể khiến bạn phải đăng nhập lại.
    </p>

    <h2>7. Liên hệ</h2>
    <p>
      Mọi yêu cầu liên quan đến dữ liệu cá nhân, vui lòng liên hệ qua kênh hỗ trợ
      trong ứng dụng hoặc email <a href="mailto:support@chiptrip.online">support@chiptrip.online</a>.
    </p>
  </LegalLayout>
);

export default Privacy;
