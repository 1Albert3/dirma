import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LayoutDashboard, BookOpen, FileText, Search, BarChart2, Users } from 'lucide-react';

// Auth
import Welcome  from './pages/auth/welcome';
import Login    from './pages/auth/login';
import Register from './pages/auth/register';

// Étudiant
import EtudiantDashboard     from './pages/etudiant/dashboard';
import EtudiantThemes        from './pages/etudiant/themes';
import EtudiantDocuments     from './pages/etudiant/documents';
import EtudiantVerifications from './pages/etudiant/verifications';
import EtudiantHistoric      from './pages/etudiant/historic';
import EtudiantRapport       from './pages/etudiant/Rapport';
import EtudiantAnalyse       from './pages/etudiant/Analyse';

// Chef de département
import ChefDashboard  from './pages/chef/dashboard';
import ChefThemes     from './pages/chef/themes';
import ChefDocuments  from './pages/chef/documents';

// Directeur Adjoint
import DADashboard     from './pages/da/dashboard';
import DAThemes        from './pages/da/themes';
import DADocuments     from './pages/da/documents';
import DAStatistiques  from './pages/da/statistiques';
import DAUtilisateurs  from './pages/da/utilisateurs';
import Notifications   from './pages/shared/Notifications';
import ReinitialisationMotDePasse from './pages/auth/ReinitialisationMotDePasse';

export const chefNav = [
  { path: '/chef/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/chef/themes',    icon: BookOpen,         label: 'Thèmes' },
  { path: '/chef/documents', icon: FileText,         label: 'Documents' },
];

export const daNav = [
  { path: '/da/dashboard',    icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/da/themes',       icon: BookOpen,        label: 'Thèmes' },
  { path: '/da/documents',    icon: FileText,        label: 'Documents' },
  { path: '/da/statistiques', icon: BarChart2,       label: 'Statistiques' },
  { path: '/da/utilisateurs', icon: Users,          label: 'Utilisateurs' },
];

// Garde de route selon le rôle
function PrivateRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const auth = useAuth() as any;
  const user = auth?.user;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const auth = useAuth() as any;
  const user = auth?.user;

  const homeRedirect = () => {
    if (!user) return <Navigate to="/welcome" replace />;
    const routes: Record<string, string> = {
      etudiant:           '/etudiant/dashboard',
      chef_departement:   '/chef/dashboard',
      directeur_adjoint:  '/da/dashboard',
    };
    return <Navigate to={routes[user.role] || '/welcome'} replace />;
  };

  return (
    <Routes>
      {/* Racine */}
      <Route path="/" element={homeRedirect()} />

      {/* Pages publiques */}
      <Route path="/welcome"  element={<Welcome />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ReinitialisationMotDePasse />} />

      {/* Notifications (tous rôles) */}
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

      {/* Étudiant */}
      <Route path="/etudiant/dashboard"       element={<PrivateRoute role="etudiant"><EtudiantDashboard /></PrivateRoute>} />
      <Route path="/etudiant/themes"          element={<PrivateRoute role="etudiant"><EtudiantThemes /></PrivateRoute>} />
      <Route path="/etudiant/documents"       element={<PrivateRoute role="etudiant"><EtudiantDocuments /></PrivateRoute>} />
      <Route path="/etudiant/verifications"   element={<PrivateRoute role="etudiant"><EtudiantVerifications /></PrivateRoute>} />
      <Route path="/etudiant/historique"        element={<PrivateRoute role="etudiant"><EtudiantHistoric /></PrivateRoute>} />
      <Route path="/etudiant/verifications/:id"  element={<PrivateRoute role="etudiant"><EtudiantRapport /></PrivateRoute>} />
      <Route path="/etudiant/analyse/:type/:id"  element={<PrivateRoute role="etudiant"><EtudiantAnalyse /></PrivateRoute>} />

      {/* Chef de département */}
      <Route path="/chef/dashboard" element={<PrivateRoute role="chef_departement"><ChefDashboard /></PrivateRoute>} />
      <Route path="/chef/themes"    element={<PrivateRoute role="chef_departement"><ChefThemes /></PrivateRoute>} />
      <Route path="/chef/documents" element={<PrivateRoute role="chef_departement"><ChefDocuments /></PrivateRoute>} />

      {/* Directeur Adjoint */}
      <Route path="/da/dashboard"    element={<PrivateRoute role="directeur_adjoint"><DADashboard /></PrivateRoute>} />
      <Route path="/da/themes"       element={<PrivateRoute role="directeur_adjoint"><DAThemes /></PrivateRoute>} />
      <Route path="/da/documents"    element={<PrivateRoute role="directeur_adjoint"><DADocuments /></PrivateRoute>} />
      <Route path="/da/statistiques" element={<PrivateRoute role="directeur_adjoint"><DAStatistiques /></PrivateRoute>} />
      <Route path="/da/utilisateurs"  element={<PrivateRoute role="directeur_adjoint"><DAUtilisateurs /></PrivateRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
