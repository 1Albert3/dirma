# ============================================================
# DIRMA - Configuration des tests Selenium
# ============================================================

# URLs
FRONTEND_URL = "http://localhost:5173"
BACKEND_URL  = "http://localhost:8000/api"

# Comptes de test (créés par le seeder)
USERS = {
    "etudiant": {
        "identifiant": "ahmed.benali@univ.bf",
        "password":    "password",
        "role":        "etudiant",
        "nom":         "Ahmed Benali",
    },
    "chef": {
        "identifiant": "chef.info@univ.bf",
        "password":    "password",
        "role":        "chef_departement",
        "nom":         "Moussa Ouedraogo",
    },
    "da": {
        "identifiant": "da@univ.bf",
        "password":    "password",
        "role":        "directeur_adjoint",
        "nom":         "Issouf Sawadogo",
    },
}

# Timeouts (secondes)
TIMEOUT_COURT  = 5
TIMEOUT_MOYEN  = 10
TIMEOUT_LONG   = 30

# Seuils algorithmes
SEUIL_REJET_AUTO = 70.0
SEUIL_AVERT      = 50.0
