import { LayoutDashboard, BookOpen, FileText, Search, Clock } from 'lucide-react';

export const etudiantNav = [
  { path: '/etudiant/dashboard',     icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/etudiant/themes',        icon: BookOpen,        label: 'Mes thèmes' },
  { path: '/etudiant/documents',     icon: FileText,        label: 'Mes documents' },
  { path: '/etudiant/verifications', icon: Search,          label: 'Vérifications' },
  { path: '/etudiant/historique',    icon: Clock,           label: 'Historique' },
];
