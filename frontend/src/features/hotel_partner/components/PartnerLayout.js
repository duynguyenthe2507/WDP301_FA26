import React from 'react';
import { Outlet } from 'react-router-dom';
import NavigationBar from '../../../components/NavigationBar';

const PartnerLayout = () => {
  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <NavigationBar />
      <main className="flex-grow-1 p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default PartnerLayout;
