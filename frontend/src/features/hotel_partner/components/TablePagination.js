import { Button } from "react-bootstrap";

const TablePagination = ({ pagination, onChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  return (
    <div className="d-flex justify-content-between align-items-center small text-muted">
      <span>Trang {page}/{totalPages} · {total} kết quả</span>
      <span className="d-flex gap-2">
        <Button size="sm" variant="outline-dark" disabled={page <= 1} onClick={() => onChange(page - 1)}>Trước</Button>
        <Button size="sm" variant="outline-dark" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Sau</Button>
      </span>
    </div>
  );
};

export default TablePagination;
