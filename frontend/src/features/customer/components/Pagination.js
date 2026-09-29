import React from 'react';
import { Pagination as BSPagination } from 'react-bootstrap';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  const getPageNumbers = () => {
    const delta = 2;
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        pages.push(i);
      }
    }
    const result = [];
    let prev = null;
    for (const page of pages) {
      if (prev !== null && page - prev > 1) result.push('...');
      result.push(page);
      prev = page;
    }
    return result;
  };

  return (
    <BSPagination className="justify-content-center mt-4 flex-wrap">
      <BSPagination.Prev
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />
      {getPageNumbers().map((page, idx) =>
        page === '...' ? (
          <BSPagination.Ellipsis key={`e-${idx}`} disabled />
        ) : (
          <BSPagination.Item
            key={page}
            active={page === currentPage}
            onClick={() => onPageChange(page)}
          >
            {page}
          </BSPagination.Item>
        )
      )}
      <BSPagination.Next
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
    </BSPagination>
  );
};

export default Pagination;
