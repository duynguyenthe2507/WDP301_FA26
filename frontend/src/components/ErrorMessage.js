import React from 'react';
import { Alert, Button } from 'react-bootstrap';

const ErrorMessage = ({ message, onRetry }) => (
  <Alert variant="danger" className="d-flex align-items-center justify-content-between rounded-3 shadow-sm">
    <span>{message || 'Đã xảy ra lỗi. Vui lòng thử lại.'}</span>
    {onRetry && (
      <Button
        variant="outline-danger"
        size="sm"
        onClick={onRetry}
        className="ms-3 rounded-pill px-3"
      >
        Thử lại
      </Button>
    )}
  </Alert>
);

export default ErrorMessage;
