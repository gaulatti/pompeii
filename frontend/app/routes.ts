import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  layout('./layouts/private.tsx', [
    index('pages/home.tsx'),
    route('/users', './pages/users.tsx'),
    route('/teams', './pages/teams.tsx'),
    route('/applications', './pages/applications.tsx'),
    route('/governance', './pages/governance.tsx'),
    route('/applications/:id', './pages/application-detail.tsx'),
    route('/applications/:appId/permissions/:id', './pages/permission-detail.tsx'),
    route('/logout', './pages/auth/logout.tsx'),
  ]),
  route('/login', './pages/auth/login.tsx'),
] satisfies RouteConfig;
