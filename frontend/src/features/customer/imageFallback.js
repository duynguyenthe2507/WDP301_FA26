// Không dùng ảnh mặc định: thiếu ảnh hoặc link hỏng thì hiện ô xám trống
export const BLANK_IMG = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

export const imgBg = { backgroundColor: '#e2e8f0' };

export const onImgError = (e) => {
  if (e.currentTarget.src !== BLANK_IMG) e.currentTarget.src = BLANK_IMG;
};
