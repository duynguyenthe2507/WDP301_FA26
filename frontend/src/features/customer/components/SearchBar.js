import React, { useState } from 'react';
import { Form, Button, InputGroup } from 'react-bootstrap';
import { FaSearch, FaMapMarkerAlt } from 'react-icons/fa';

const SearchBar = ({ initialLocation = '', onSearch, className = '' }) => {
  const [location, setLocation] = useState(initialLocation);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch({ location: location.trim() });
  };

  return (
    <Form onSubmit={handleSubmit} className={className}>
      <InputGroup
        className="shadow-lg"
        style={{ borderRadius: '50px', overflow: 'hidden', maxWidth: '650px', margin: '0 auto' }}
      >
        <InputGroup.Text
          style={{ background: '#fff', border: 'none', paddingLeft: '1.5rem', cursor: 'default' }}
        >
          <FaMapMarkerAlt style={{ color: '#d4af37', fontSize: '1.1rem' }} />
        </InputGroup.Text>
        <Form.Control
          type="text"
          placeholder="Nhập địa điểm bạn muốn đến..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={{
            border: 'none',
            fontSize: '1.05rem',
            padding: '1rem 0.5rem',
            boxShadow: 'none'
          }}
        />
        <Button
          type="submit"
          style={{
            background: '#d4af37',
            border: 'none',
            borderRadius: '0 50px 50px 0',
            padding: '0 2rem',
            fontWeight: 600,
            fontSize: '0.95rem'
          }}
        >
          <FaSearch className="me-2" />
          Tìm kiếm
        </Button>
      </InputGroup>
    </Form>
  );
};

export default SearchBar;
