import MainLayout from 'layout/MainLayout';
import { Navigate } from 'react-router';
import MainPage from 'views/home/MainPage';

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: <MainLayout />,
  children: [
    {
      index: true,
      element: <Navigate to="stake" replace />
    },
    {
      path: '/stake',
      element: <MainPage />
    }
  ]
};

export default MainRoutes;
