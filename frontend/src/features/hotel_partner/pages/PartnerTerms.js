import React, { useState } from 'react';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const partnerTerms = {
  title: 'THOA THUAN VA DIEU KHOAN DANH CHO DOI TAC KHACH SAN',
  displayTitle: 'THỎA THUẬN VÀ ĐIỀU KHOẢN DÀNH CHO ĐỐI TÁC KHÁCH SẠN',
  version: '1.0',
  effectiveDate: '23/09/2026',
  sections: [
    {
      title: '1. Giới thiệu',
      paragraphs: [
        'Thỏa thuận và Điều khoản dành cho Đối tác Khách sạn (“Thỏa thuận”) quy định các điều kiện áp dụng đối với khách sạn, cơ sở lưu trú hoặc đơn vị kinh doanh lưu trú (“Đối tác”) khi đăng ký và cung cấp dịch vụ lưu trú trên nền tảng VinaStay.',
        'Bằng việc tạo tài khoản Đối tác, chấp nhận Thỏa thuận này và đăng tải cơ sở lưu trú lên Nền tảng, Đối tác xác nhận rằng mình đã đọc, hiểu và đồng ý tuân thủ các điều khoản dưới đây.',
        'Nếu Đối tác không đồng ý với bất kỳ điều khoản nào, Đối tác không được tiếp tục đăng ký hoặc đăng tải cơ sở lưu trú trên Nền tảng.'
      ]
    },
    {
      title: '2. Điều kiện để trở thành Đối tác',
      paragraphs: [
        '2.1. Đối tác phải cung cấp thông tin đăng ký chính xác, đầy đủ và hợp lệ.',
        '2.2. Đối tác phải có quyền hợp pháp để quản lý, vận hành hoặc đại diện cho cơ sở lưu trú được đăng tải trên Nền tảng.',
        '2.3. Đối tác chịu trách nhiệm về tính chính xác của các thông tin cung cấp cho Nền tảng, bao gồm nhưng không giới hạn:'
      ],
      bullets: [
        'Tên cơ sở lưu trú;',
        'Địa chỉ;',
        'Thông tin liên hệ;',
        'Loại hình cơ sở lưu trú;',
        'Hình ảnh;',
        'Tiện nghi;',
        'Loại phòng;',
        'Giá phòng;',
        'Chính sách đặt phòng;',
        'Chính sách hủy phòng;',
        'Chính sách nhận và trả phòng;',
        'Số lượng phòng có thể cung cấp.'
      ],
      afterBullets: [
        '2.4. Nền tảng có quyền yêu cầu Đối tác cung cấp thêm thông tin hoặc tài liệu để xác minh cơ sở lưu trú trước khi cho phép cơ sở lưu trú được công khai.'
      ]
    },
    {
      title: '3. Quyền và trách nhiệm của Đối tác',
      subsections: [
        {
          title: '3.1. Cung cấp thông tin chính xác',
          paragraphs: [
            'Đối tác cam kết mọi thông tin được cung cấp trên Nền tảng là chính xác, không gây hiểu nhầm và được cập nhật khi có thay đổi.',
            'Đối tác không được:'
          ],
          bullets: [
            'Cung cấp thông tin sai lệch về cơ sở lưu trú;',
            'Sử dụng hình ảnh không phản ánh đúng cơ sở lưu trú;',
            'Công bố tiện nghi hoặc dịch vụ mà cơ sở lưu trú không cung cấp;',
            'Đăng giá hoặc chính sách không áp dụng thực tế.'
          ]
        },
        {
          title: '3.2. Duy trì tình trạng phòng',
          paragraphs: [
            'Đối tác có trách nhiệm cập nhật chính xác số lượng phòng còn trống và tình trạng phòng trên Nền tảng.',
            'Nếu phòng đã được đặt thông qua Nền tảng, Đối tác phải tôn trọng và thực hiện đặt phòng theo thông tin đã được xác nhận.',
            'Đối tác không được cố ý nhận vượt quá số lượng phòng có thể cung cấp (“overbooking”) do quản lý không chính xác tình trạng phòng.'
          ]
        },
        {
          title: '3.3. Thực hiện đặt phòng',
          paragraphs: [
            'Khi một đặt phòng được hệ thống xác nhận, Đối tác có trách nhiệm cung cấp phòng và dịch vụ phù hợp với thông tin đã công bố.',
            'Đối tác phải đảm bảo:'
          ],
          bullets: [
            'Phòng đáp ứng đúng loại phòng khách đã đặt;',
            'Giá và các khoản phí được áp dụng đúng theo thông tin đặt phòng;',
            'Các tiện nghi đã cam kết được cung cấp;',
            'Chính sách nhận/trả phòng được thực hiện đúng;',
            'Các yêu cầu đặc biệt của khách được xử lý trong phạm vi khả năng cung cấp.'
          ]
        },
        {
          title: '3.4. Không tự ý hủy đặt phòng',
          paragraphs: [
            'Đối tác không được tự ý hủy đặt phòng đã được xác nhận, trừ trường hợp có lý do hợp lệ hoặc được Nền tảng chấp thuận.',
            'Trong trường hợp không thể cung cấp phòng đã đặt, Đối tác phải thông báo cho Nền tảng trong thời gian sớm nhất và phối hợp để giải quyết vấn đề cho khách hàng.'
          ]
        }
      ]
    },
    {
      title: '4. Giá phòng và chính sách',
      paragraphs: [
        '4.1. Đối tác có trách nhiệm cung cấp giá phòng chính xác trên Nền tảng.',
        '4.2. Đối tác phải thông báo rõ các khoản phí bổ sung, phụ phí hoặc điều kiện đặc biệt có thể áp dụng cho khách hàng.',
        '4.3. Đối tác không được thu thêm các khoản phí đã được xác định là đã bao gồm trong giá đặt phòng, trừ khi khoản phí đó được công bố rõ ràng và được phép theo chính sách của Nền tảng.',
        '4.4. Đối tác có trách nhiệm cập nhật giá, chương trình khuyến mại và chính sách phòng khi có thay đổi.'
      ]
    },
    {
      title: '5. Hình ảnh và nội dung của cơ sở lưu trú',
      paragraphs: [
        '5.1. Đối tác đảm bảo rằng mình có quyền sử dụng các hình ảnh, logo, mô tả và nội dung được tải lên Nền tảng.',
        '5.2. Đối tác không được tải lên nội dung:'
      ],
      bullets: [
        'Vi phạm pháp luật;',
        'Xâm phạm quyền sở hữu trí tuệ của bên thứ ba;',
        'Có nội dung lừa đảo hoặc gây hiểu nhầm;',
        'Có nội dung không phù hợp với mục đích của Nền tảng.'
      ],
      afterBullets: [
        '5.3. Đối tác cho phép Nền tảng sử dụng các nội dung do Đối tác cung cấp nhằm mục đích hiển thị, quảng bá và hỗ trợ việc đặt phòng trên Nền tảng.'
      ]
    },
    {
      title: '6. Tiêu chuẩn dịch vụ',
      paragraphs: [
        'Đối tác có trách nhiệm duy trì chất lượng dịch vụ phù hợp với thông tin đã công bố trên Nền tảng.',
        'Cơ sở lưu trú phải đảm bảo các yêu cầu cơ bản về:'
      ],
      bullets: [
        'Vệ sinh;',
        'An toàn;',
        'Tình trạng phòng;',
        'Trang thiết bị;',
        'Dịch vụ đã cam kết;',
        'Thái độ phục vụ khách hàng.'
      ],
      afterBullets: [
        'Nếu Nền tảng nhận được nhiều phản ánh hoặc khiếu nại liên quan đến chất lượng dịch vụ, Nền tảng có quyền yêu cầu Đối tác giải trình và thực hiện biện pháp khắc phục.'
      ]
    },
    {
      title: '7. Đặt phòng, thanh toán và hoa hồng',
      paragraphs: [
        '7.1. Các khoản phí, hoa hồng hoặc chi phí dịch vụ mà Đối tác phải thanh toán cho Nền tảng sẽ được xác định theo chính sách hoặc thỏa thuận áp dụng cho từng Đối tác.',
        '7.2. Đối tác có trách nhiệm thanh toán các khoản phí phát sinh theo đúng thời hạn.',
        '7.3. Trong trường hợp Nền tảng cung cấp dịch vụ xử lý thanh toán, việc xử lý thanh toán sẽ được thực hiện theo phương thức và chính sách thanh toán được Nền tảng công bố.',
        '7.4. Đối tác không được thực hiện hành vi nhằm né tránh hoặc gian lận phí dịch vụ của Nền tảng.'
      ]
    },
    {
      title: '8. Hủy phòng và hoàn tiền',
      paragraphs: [
        '8.1. Đối tác phải thiết lập chính sách hủy phòng rõ ràng đối với từng loại phòng hoặc phương án giá.',
        '8.2. Chính sách hủy phòng đã được khách hàng chấp nhận tại thời điểm đặt phòng phải được tôn trọng.',
        '8.3. Việc hoàn tiền, nếu có, phải được thực hiện theo chính sách hủy phòng và phương thức thanh toán tương ứng.',
        '8.4. Đối tác không được tự ý thay đổi điều kiện hủy phòng sau khi khách đã hoàn tất đặt phòng nếu việc thay đổi gây bất lợi cho khách hàng.'
      ]
    },
    {
      title: '9. Khiếu nại và tranh chấp',
      paragraphs: [
        '9.1. Đối tác có trách nhiệm phối hợp với Nền tảng để xử lý các khiếu nại liên quan đến đặt phòng hoặc dịch vụ lưu trú.',
        '9.2. Khi nhận được yêu cầu từ Nền tảng, Đối tác phải cung cấp thông tin cần thiết để hỗ trợ giải quyết khiếu nại.',
        '9.3. Nền tảng có thể liên hệ với Đối tác để xác minh các vấn đề phát sinh giữa Đối tác và khách hàng.',
        '9.4. Đối tác không được cố ý cung cấp thông tin sai lệch nhằm gây ảnh hưởng đến quá trình giải quyết khiếu nại.'
      ]
    },
    {
      title: '10. Đánh giá của khách hàng',
      paragraphs: [
        '10.1. Nền tảng có thể cho phép khách hàng đánh giá và nhận xét về cơ sở lưu trú sau khi sử dụng dịch vụ.',
        '10.2. Đối tác không được:'
      ],
      bullets: [
        'Tạo đánh giá giả;',
        'Yêu cầu người khác tạo đánh giá giả;',
        'Thao túng hoặc mua đánh giá;',
        'Đe dọa hoặc gây áp lực để khách hàng thay đổi đánh giá.'
      ],
      afterBullets: [
        '10.3. Đối tác có thể phản hồi các đánh giá của khách hàng thông qua các chức năng được Nền tảng cung cấp.'
      ]
    },
    {
      title: '11. Bảo mật tài khoản',
      paragraphs: [
        '11.1. Đối tác chịu trách nhiệm bảo vệ thông tin đăng nhập tài khoản của mình.',
        '11.2. Đối tác không được chia sẻ thông tin đăng nhập cho người không có thẩm quyền.',
        '11.3. Nếu phát hiện tài khoản bị truy cập trái phép hoặc có dấu hiệu bất thường, Đối tác phải thông báo cho Nền tảng trong thời gian sớm nhất.',
        '11.4. Đối tác chịu trách nhiệm đối với các hoạt động được thực hiện thông qua tài khoản của mình, trừ trường hợp chứng minh được việc sử dụng trái phép không xuất phát từ lỗi của Đối tác.'
      ]
    },
    {
      title: '12. Quyền kiểm duyệt của Nền tảng',
      paragraphs: [
        'Nền tảng có quyền kiểm tra, xác minh và đánh giá thông tin của cơ sở lưu trú trước hoặc sau khi cơ sở lưu trú được đăng tải.',
        'Nền tảng có thể:'
      ],
      bullets: [
        'Yêu cầu Đối tác bổ sung tài liệu;',
        'Yêu cầu chỉnh sửa thông tin;',
        'Tạm thời ẩn cơ sở lưu trú;',
        'Tạm dừng nhận đặt phòng;',
        'Từ chối đăng tải cơ sở lưu trú;',
        'Tạm khóa hoặc chấm dứt tài khoản Đối tác;'
      ],
      afterBullets: [
        'nếu phát hiện thông tin không chính xác, hành vi gian lận, vi phạm Thỏa thuận hoặc các vấn đề có thể ảnh hưởng đến khách hàng và hoạt động của Nền tảng.'
      ]
    },
    {
      title: '13. Vi phạm điều khoản',
      paragraphs: [
        'Các hành vi sau có thể được xem là vi phạm Thỏa thuận:'
      ],
      bullets: [
        'Cung cấp thông tin giả mạo;',
        'Đăng cơ sở lưu trú mà Đối tác không có quyền quản lý;',
        'Cố ý cung cấp phòng không tồn tại;',
        'Cố ý overbooking;',
        'Từ chối thực hiện đặt phòng mà không có lý do hợp lệ;',
        'Gian lận về giá hoặc phí;',
        'Tạo đánh giá giả;',
        'Sử dụng hình ảnh hoặc nội dung trái phép;',
        'Gian lận thanh toán hoặc né tránh phí dịch vụ;',
        'Sử dụng Nền tảng cho mục đích bất hợp pháp;',
        'Vi phạm quyền lợi của khách hàng;',
        'Vi phạm các điều khoản khác của Thỏa thuận.'
      ],
      afterBullets: [
        'Tùy theo mức độ vi phạm, Nền tảng có thể cảnh báo, yêu cầu khắc phục, tạm ngừng hoạt động hoặc chấm dứt quyền sử dụng tài khoản của Đối tác.'
      ]
    },
    {
      title: '14. Tạm ngừng hoặc chấm dứt hợp tác',
      paragraphs: [
        'Nền tảng có quyền tạm ngừng hoặc chấm dứt quyền cung cấp dịch vụ của Đối tác trong trường hợp:'
      ],
      bullets: [
        'Đối tác vi phạm nghiêm trọng Thỏa thuận;',
        'Có dấu hiệu gian lận;',
        'Cung cấp thông tin sai lệch;',
        'Có hành vi gây ảnh hưởng nghiêm trọng đến khách hàng;',
        'Không thực hiện nghĩa vụ thanh toán;',
        'Hoặc trong các trường hợp khác được quy định trong chính sách của Nền tảng.'
      ],
      afterBullets: [
        'Khi tài khoản bị tạm ngừng hoặc chấm dứt, Nền tảng có thể hạn chế việc nhận đặt phòng mới và thực hiện các biện pháp cần thiết đối với những đặt phòng đang tồn tại.'
      ]
    },
    {
      title: '15. Bảo vệ thông tin và dữ liệu',
      paragraphs: [
        '15.1. Đối tác phải bảo mật các thông tin của khách hàng mà mình được cung cấp thông qua Nền tảng.',
        '15.2. Đối tác chỉ được sử dụng thông tin khách hàng cho mục đích thực hiện và hỗ trợ đặt phòng, trừ khi pháp luật hoặc chính sách áp dụng cho phép mục đích khác.',
        '15.3. Đối tác không được bán, trao đổi hoặc sử dụng trái phép thông tin khách hàng.'
      ]
    },
    {
      title: '16. Thay đổi điều khoản',
      paragraphs: [
        'Nền tảng có thể cập nhật hoặc sửa đổi Thỏa thuận này khi cần thiết để phù hợp với sự thay đổi của dịch vụ, chính sách hoặc yêu cầu pháp luật.',
        'Trong trường hợp có thay đổi quan trọng, Nền tảng sẽ thông báo cho Đối tác bằng phương thức phù hợp.',
        'Việc Đối tác tiếp tục sử dụng các dịch vụ dành cho Đối tác sau khi điều khoản mới có hiệu lực có thể được xem là chấp nhận các thay đổi theo quy định được thông báo.'
      ]
    },
    {
      title: '17. Luật áp dụng và giải quyết tranh chấp',
      paragraphs: [
        'Thỏa thuận này được điều chỉnh và giải thích theo pháp luật áp dụng đối với Nền tảng và Đối tác.',
        'Các bên sẽ ưu tiên giải quyết tranh chấp thông qua thương lượng và trao đổi thiện chí.',
        'Nếu tranh chấp không thể được giải quyết bằng thương lượng, tranh chấp sẽ được giải quyết theo cơ chế và thẩm quyền được pháp luật áp dụng quy định.'
      ]
    },
    {
      title: '18. Xác nhận của Đối tác',
      paragraphs: [
        'Bằng việc tích vào ô “Tôi đồng ý với Thỏa thuận và Điều khoản dành cho Đối tác Khách sạn”, Đối tác xác nhận rằng:'
      ],
      bullets: [
        'Tôi đã đọc và hiểu các điều khoản trên;',
        'Tôi có quyền đại diện hoặc quản lý cơ sở lưu trú mà tôi đăng tải;',
        'Tôi cam kết cung cấp thông tin chính xác và đầy đủ;',
        'Tôi đồng ý tuân thủ các chính sách của Nền tảng;',
        'Tôi hiểu rằng việc vi phạm các điều khoản có thể dẫn đến việc cơ sở lưu trú bị từ chối, ẩn, tạm ngừng hoặc gỡ khỏi Nền tảng.'
      ]
    }
  ]
};

const renderSectionContent = (section) => (
  <>
    {section.paragraphs?.map((paragraph) => (
      <p key={paragraph}>{paragraph}</p>
    ))}

    {section.bullets && (
      <ul>
        {section.bullets.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )}

    {section.afterBullets?.map((paragraph) => (
      <p key={paragraph}>{paragraph}</p>
    ))}

    {section.subsections?.map((subsection) => (
      <div key={subsection.title} className="mt-3">
        <h4 className="h6 fw-bold">{subsection.title}</h4>
        {renderSectionContent(subsection)}
      </div>
    ))}
  </>
);

const PartnerTerms = () => {
  const [accepted, setAccepted] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();

  const handleNext = () => {
    if (!accepted) {
      setShowWarning(true);
      return;
    }

    navigate('/partner');
  };

  return (
    <div className="min-vh-100 bg-light py-5">
      <Card className="mx-auto shadow-sm border-0" style={{ maxWidth: '960px' }}>
        <Card.Body className="p-4 p-md-5">
          <div className="text-center mb-4">
            <h1 className="h3 fw-bold">{partnerTerms.displayTitle}</h1>
            <p className="text-muted mb-0">
              Phiên bản: {partnerTerms.version} | Ngày hiệu lực: {partnerTerms.effectiveDate}
            </p>
          </div>

          <div
            className="border rounded-3 bg-white p-4 mb-4"
            style={{ maxHeight: '58vh', overflowY: 'auto' }}
          >
            {partnerTerms.sections.map((section) => (
              <section key={section.title} className="mb-4">
                <h2 className="h5 fw-bold mb-3">{section.title}</h2>
                {renderSectionContent(section)}
              </section>
            ))}
          </div>

          {showWarning && !accepted && (
            <Alert variant="warning" className="border-0">
              Bạn cần đọc và đồng ý với thỏa thuận trước khi tiếp tục.
            </Alert>
          )}

          <Form.Check
            id="partner-terms-accepted"
            className="mb-4"
            checked={accepted}
            onChange={(event) => {
              setAccepted(event.target.checked);
              setShowWarning(false);
            }}
            label="Tôi đã đọc và đồng ý với Thỏa thuận và Điều khoản dành cho Đối tác Khách sạn."
          />

          <div className="d-flex justify-content-between gap-3">
            <Button variant="outline-secondary" onClick={() => navigate('/register')}>
              Quay lại
            </Button>
            <Button variant="primary" onClick={handleNext}>
              Tiếp theo
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default PartnerTerms;
