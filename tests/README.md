# DIRMA — Tests Selenium & API

## Structure

```
tests/
├── config.py          # Configuration (URLs, comptes de test)
├── test_api.py        # Tests API REST (sans navigateur)
├── test_selenium.py   # Tests Selenium (interface React)
├── run_tests.py       # Lanceur de tous les tests
├── install.sh         # Script d'installation des dépendances
└── README.md
```

## Installation

```bash
sudo apt-get install -y python3-pip
sudo pip3 install selenium==4.27.1 webdriver-manager==4.0.2 requests==2.32.3 --break-system-packages
```

## Lancer les tests

### Prérequis : démarrer les serveurs

```bash
# Terminal 1 — Backend Laravel
cd /home/albert/Projet/Dirma/Dirma_Backend
php artisan serve --port=8000

# Terminal 2 — Frontend React
cd /home/albert/Projet/Dirma/Dirma_Frontend
npm run dev
```

### Tous les tests

```bash
python3 /home/albert/Projet/Dirma/tests/run_tests.py
```

### Tests API uniquement (sans navigateur)

```bash
python3 /home/albert/Projet/Dirma/tests/test_api.py
```

### Tests Selenium uniquement (interface React)

```bash
python3 /home/albert/Projet/Dirma/tests/test_selenium.py
```

## Couverture des tests

### test_api.py — 19 tests

| Classe              | Tests                                              |
|---------------------|----------------------------------------------------|
| TestAuthAPI         | Login étudiant/chef/DA, mauvais password, matricule, profil, logout |
| TestRoleAccesAPI    | Accès par rôle, blocage routes croisées, notifications |
| TestThemeAPI        | Soumission thème, validation, liste par rôle       |
| TestNotificationAPI | Liste, non lues, marquer lues                      |

### test_selenium.py — 17 tests

| Classe                  | Tests                                          |
|-------------------------|------------------------------------------------|
| TestPageLogin           | Accessibilité, champs, login 3 rôles, erreurs  |
| TestProtectionRoutes    | Redirection si non connecté (3 dashboards)     |
| TestDashboardEtudiant   | Chargement, navigation thèmes                  |
| TestDashboardChef       | Chargement, accès liste thèmes                 |
| TestDashboardDA         | Chargement, accès statistiques                 |

## Comptes de test (créés par le seeder)

| Rôle               | Email                    | Matricule | Mot de passe |
|--------------------|--------------------------|-----------|--------------|
| Étudiant           | ahmed.benali@univ.bf     | 20240001  | password     |
| Chef Département   | chef.info@univ.bf        | —         | password     |
| Directeur Adjoint  | da@univ.bf               | —         | password     |
