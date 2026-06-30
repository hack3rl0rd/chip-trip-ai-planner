import LegalLayout from "@/app/pages/legal/LegalLayout";

const Terms = () => (
  <LegalLayout title="Điều khoản sử dụng" lastUpdated="27/06/2026">
    <p>
      Chào mừng bạn đến với ChipTrip. Khi truy cập hoặc sử dụng ứng dụng ChipTrip
      (“Dịch vụ”), bạn đồng ý chịu sự ràng buộc của các điều khoản dưới đây. Nếu
      bạn không đồng ý, vui lòng ngừng sử dụng Dịch vụ.
    </p>

    <h2>1. Dịch vụ</h2>
    <p>
      ChipTrip là nền tảng lập kế hoạch du lịch sử dụng AI, hỗ trợ tạo lịch trình,
      gợi ý địa điểm, quản lý chuyến đi và chia sẻ với cộng đồng. Lịch trình và
      thông tin (chi phí, địa điểm, giờ mở cửa, giá phòng) do AI và các nguồn bên
      thứ ba sinh ra mang tính <strong>tham khảo</strong>; bạn cần tự kiểm chứng
      trước khi quyết định. ChipTrip không phải đại lý du lịch (OTA) và không trực
      tiếp bán vé/đặt phòng — các liên kết đặt chỗ dẫn tới dịch vụ của bên thứ ba.
    </p>

    <h2>2. Tài khoản</h2>
    <ul>
      <li>Bạn phải cung cấp thông tin chính xác và đủ 16 tuổi để đăng ký.</li>
      <li>Bạn chịu trách nhiệm bảo mật mật khẩu và mọi hoạt động dưới tài khoản của mình.</li>
      <li>Mỗi tài khoản dành cho một cá nhân; không chia sẻ hoặc mua bán tài khoản.</li>
    </ul>

    <h2>3. Lượt AI, gói trả phí và thanh toán</h2>
    <ul>
      <li>
        ChipTrip cung cấp một số lượt dùng thử miễn phí mỗi ngày. Để tạo thêm
        lịch trình hoặc mở khóa tính năng nâng cao, bạn có thể mua credit qua các
        gói trả phí.
      </li>
      <li>
        Thanh toán được xử lý qua cổng SePay (chuyển khoản VietQR). Credit được
        cộng vào tài khoản sau khi giao dịch được đối soát thành công.
      </li>
      <li>
        Credit đã mua không quy đổi thành tiền mặt. Trạng thái “Premium” gắn với
        số credit trả phí còn lại; khi dùng hết, tài khoản trở về mức tiêu chuẩn.
      </li>
      <li>
        Khiếu nại giao dịch (cộng nhầm/thiếu credit) vui lòng liên hệ hỗ trợ kèm
        mã đơn hàng trong vòng 7 ngày.
      </li>
    </ul>

    <h2>4. Nội dung do người dùng tạo</h2>
    <p>
      Khi bạn đăng lịch trình công khai, bình luận hoặc đánh giá, bạn cấp cho
      ChipTrip quyền hiển thị nội dung đó trong Dịch vụ. Bạn cam kết không đăng nội dung:
    </p>
    <ul>
      <li>Vi phạm pháp luật Việt Nam, xâm phạm quyền của người khác.</li>
      <li>Mang tính bôi nhọ, thù ghét, lừa đảo, spam hoặc quảng cáo trái phép.</li>
      <li>Chứa thông tin cá nhân của người khác khi chưa được phép.</li>
    </ul>
    <p>
      ChipTrip có quyền gỡ nội dung vi phạm và khóa tài khoản tái phạm. Người dùng
      có thể báo cáo nội dung không phù hợp; đội ngũ quản trị sẽ xem xét và xử lý.
    </p>

    <h2>5. Sử dụng được phép</h2>
    <p>
      Bạn không được dò quét, can thiệp, làm quá tải hệ thống, khai thác lỗ hổng,
      hay dùng công cụ tự động để truy cập Dịch vụ ngoài giao diện được cung cấp.
    </p>

    <h2>6. Giới hạn trách nhiệm</h2>
    <p>
      Dịch vụ được cung cấp “nguyên trạng”. ChipTrip không bảo đảm thông tin do AI
      hoặc bên thứ ba cung cấp luôn chính xác, và không chịu trách nhiệm cho thiệt
      hại phát sinh từ việc bạn dựa vào các thông tin đó hoặc từ dịch vụ của bên
      thứ ba (đặt phòng, vé, bản đồ, thời tiết).
    </p>

    <h2>7. Thay đổi điều khoản</h2>
    <p>
      Chúng tôi có thể cập nhật Điều khoản này. Thay đổi quan trọng sẽ được thông
      báo trong ứng dụng. Việc tiếp tục sử dụng sau khi cập nhật đồng nghĩa bạn
      chấp nhận điều khoản mới.
    </p>

    <h2>8. Liên hệ</h2>
    <p>
      Mọi thắc mắc về Điều khoản, vui lòng liên hệ qua kênh hỗ trợ trong ứng dụng
      hoặc email <a href="mailto:support@chiptrip.online">support@chiptrip.online</a>.
    </p>
  </LegalLayout>
);

export default Terms;
