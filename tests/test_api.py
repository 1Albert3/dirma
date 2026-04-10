"""
DIRMA - Tests API REST (sans navigateur)
Teste directement les endpoints Laravel via requests.
"""

import unittest
import requests
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from config import BACKEND_URL, USERS


JSON_HEADERS = {"Accept": "application/json", "Content-Type": "application/json"}


class TestAuthAPI(unittest.TestCase):
    """Tests d'authentification via l'API REST."""

    def test_01_login_etudiant_succes(self):
        """Connexion réussie avec les identifiants étudiant."""
        r = requests.post(f"{BACKEND_URL}/auth/login", json={
            "identifiant": USERS["etudiant"]["identifiant"],
            "password":    USERS["etudiant"]["password"],
        }, headers=JSON_HEADERS)
        self.assertEqual(r.status_code, 200, f"Réponse: {r.text}")
        data = r.json()
        self.assertIn("token", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["role"], "etudiant")
        print(f"  ✓ Login étudiant OK — token: {data['token'][:20]}...")

    def test_02_login_chef_succes(self):
        """Connexion réussie avec les identifiants chef de département."""
        r = requests.post(f"{BACKEND_URL}/auth/login", json={
            "identifiant": USERS["chef"]["identifiant"],
            "password":    USERS["chef"]["password"],
        }, headers=JSON_HEADERS)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["user"]["role"], "chef_departement")
        print("  ✓ Login chef département OK")

    def test_03_login_da_succes(self):
        """Connexion réussie avec les identifiants directeur adjoint."""
        r = requests.post(f"{BACKEND_URL}/auth/login", json={
            "identifiant": USERS["da"]["identifiant"],
            "password":    USERS["da"]["password"],
        }, headers=JSON_HEADERS)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["user"]["role"], "directeur_adjoint")
        print("  ✓ Login directeur adjoint OK")

    def test_04_login_mauvais_password(self):
        """Connexion échouée avec un mauvais mot de passe."""
        r = requests.post(f"{BACKEND_URL}/auth/login", json={
            "identifiant": USERS["etudiant"]["identifiant"],
            "password":    "mauvais_password",
        }, headers=JSON_HEADERS)
        self.assertEqual(r.status_code, 422)
        print("  ✓ Rejet mauvais mot de passe OK")

    def test_05_login_identifiant_inexistant(self):
        """Connexion échouée avec un identifiant inexistant."""
        r = requests.post(f"{BACKEND_URL}/auth/login", json={
            "identifiant": "inconnu@test.bf",
            "password":    "password",
        }, headers=JSON_HEADERS)
        self.assertEqual(r.status_code, 422)
        print("  ✓ Rejet identifiant inexistant OK")

    def test_06_login_par_matricule(self):
        """Connexion via matricule (étudiant)."""
        r = requests.post(f"{BACKEND_URL}/auth/login", json={
            "identifiant": "20240001",
            "password":    "password",
        }, headers=JSON_HEADERS)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["user"]["matricule"], "20240001")
        print("  ✓ Login par matricule OK")

    def test_07_profil_avec_token(self):
        """Accès au profil avec un token valide."""
        token = self._get_token("etudiant")
        r = requests.get(f"{BACKEND_URL}/auth/profil", headers=self._headers(token))
        self.assertEqual(r.status_code, 200)
        self.assertIn("user", r.json())
        print("  ✓ Accès profil avec token OK")

    def test_08_profil_sans_token(self):
        """Accès au profil sans token → 401."""
        r = requests.get(f"{BACKEND_URL}/auth/profil", headers={"Accept": "application/json"})
        self.assertEqual(r.status_code, 401)
        print("  ✓ Rejet accès sans token OK")

    def test_09_logout(self):
        """Déconnexion et invalidation du token."""
        token = self._get_token("etudiant")
        r = requests.post(f"{BACKEND_URL}/auth/logout", headers=self._headers(token))
        self.assertEqual(r.status_code, 200)

        # Le token ne doit plus fonctionner
        r2 = requests.get(f"{BACKEND_URL}/auth/profil", headers=self._headers(token))
        self.assertEqual(r2.status_code, 401)
        print("  ✓ Logout et invalidation token OK")

    def _get_token(self, role: str) -> str:
        r = requests.post(f"{BACKEND_URL}/auth/login", json={
            "identifiant": USERS[role]["identifiant"],
            "password":    USERS[role]["password"],
        }, headers=JSON_HEADERS)
        return r.json()["token"]

    def _headers(self, token: str) -> dict:
        return {"Authorization": f"Bearer {token}", "Accept": "application/json"}


class TestRoleAccesAPI(unittest.TestCase):
    """Tests de contrôle d'accès par rôle."""

    def setUp(self):
        self.tokens = {}
        for role in ["etudiant", "chef", "da"]:
            r = requests.post(f"{BACKEND_URL}/auth/login", json={
                "identifiant": USERS[role]["identifiant"],
                "password":    USERS[role]["password"],
            }, headers=JSON_HEADERS)
            self.tokens[role] = r.json()["token"]

    def _headers(self, role: str) -> dict:
        return {"Authorization": f"Bearer {self.tokens[role]}", "Accept": "application/json"}

    def test_01_etudiant_acces_ses_routes(self):
        """L'étudiant peut accéder à ses propres routes."""
        r = requests.get(f"{BACKEND_URL}/etudiant/themes", headers=self._headers("etudiant"))
        self.assertEqual(r.status_code, 200)
        print("  ✓ Étudiant accède à /etudiant/themes OK")

    def test_02_etudiant_bloque_routes_chef(self):
        """L'étudiant ne peut pas accéder aux routes chef."""
        r = requests.get(f"{BACKEND_URL}/chef/themes", headers=self._headers("etudiant"))
        self.assertEqual(r.status_code, 403)
        print("  ✓ Étudiant bloqué sur /chef/themes OK")

    def test_03_etudiant_bloque_routes_da(self):
        """L'étudiant ne peut pas accéder aux routes DA."""
        r = requests.get(f"{BACKEND_URL}/da/statistiques", headers=self._headers("etudiant"))
        self.assertEqual(r.status_code, 403)
        print("  ✓ Étudiant bloqué sur /da/statistiques OK")

    def test_04_chef_acces_ses_routes(self):
        """Le chef peut accéder à ses propres routes."""
        r = requests.get(f"{BACKEND_URL}/chef/themes", headers=self._headers("chef"))
        self.assertEqual(r.status_code, 200)
        print("  ✓ Chef accède à /chef/themes OK")

    def test_05_chef_bloque_routes_da(self):
        """Le chef ne peut pas accéder aux routes DA."""
        r = requests.get(f"{BACKEND_URL}/da/statistiques", headers=self._headers("chef"))
        self.assertEqual(r.status_code, 403)
        print("  ✓ Chef bloqué sur /da/statistiques OK")

    def test_06_da_acces_statistiques(self):
        """Le DA peut accéder aux statistiques."""
        r = requests.get(f"{BACKEND_URL}/da/statistiques", headers=self._headers("da"))
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn("total_etudiants", data)
        self.assertIn("total_themes", data)
        print("  ✓ DA accède aux statistiques OK")

    def test_07_notifications_tous_roles(self):
        """Tous les rôles peuvent accéder aux notifications."""
        for role in ["etudiant", "chef", "da"]:
            r = requests.get(f"{BACKEND_URL}/notifications", headers=self._headers(role))
            self.assertEqual(r.status_code, 200, f"Rôle {role} bloqué")
        print("  ✓ Notifications accessibles à tous les rôles OK")


class TestThemeAPI(unittest.TestCase):
    """Tests de soumission et gestion des thèmes."""

    def setUp(self):
        for role in ["etudiant", "chef", "da"]:
            r = requests.post(f"{BACKEND_URL}/auth/login", json={
                "identifiant": USERS[role]["identifiant"],
                "password":    USERS[role]["password"],
            }, headers=JSON_HEADERS)
            setattr(self, f"token_{role}", r.json()["token"])

    def _headers(self, token: str) -> dict:
        return {"Authorization": f"Bearer {token}", "Accept": "application/json"}

    def test_01_soumettre_theme_original(self):
        """Soumission d'un thème original (faible similarité)."""
        r = requests.post(f"{BACKEND_URL}/etudiant/themes",
            headers=self._headers(self.token_etudiant),
            json={
                "titre":               "Système de gestion des ressources hydriques au Burkina Faso",
                "description":         "Cette étude analyse les méthodes innovantes de collecte et distribution de l'eau potable dans les zones rurales du Burkina Faso, en utilisant des technologies IoT pour optimiser la gestion des forages.",
                "annee_universitaire": "2024-2025",
            }
        )
        self.assertEqual(r.status_code, 201)
        data = r.json()
        self.assertIn("theme", data)
        self.assertIn(data["theme"]["statut"], ["en_attente_chef", "rejete_auto"])
        print(f"  ✓ Soumission thème OK — statut: {data['theme']['statut']}, score: {data['theme']['score_similarite']}%")

    def test_02_soumettre_theme_champs_manquants(self):
        """Soumission d'un thème avec champs manquants → 422."""
        r = requests.post(f"{BACKEND_URL}/etudiant/themes",
            headers=self._headers(self.token_etudiant),
            json={"titre": "Thème incomplet"}
        )
        self.assertEqual(r.status_code, 422)
        print("  ✓ Rejet thème incomplet OK")

    def test_03_soumettre_theme_description_trop_courte(self):
        """Description trop courte (< 20 caractères) → 422."""
        r = requests.post(f"{BACKEND_URL}/etudiant/themes",
            headers=self._headers(self.token_etudiant),
            json={
                "titre":               "Test",
                "description":         "Trop court",
                "annee_universitaire": "2024-2025",
            }
        )
        self.assertEqual(r.status_code, 422)
        print("  ✓ Rejet description trop courte OK")

    def test_04_lister_themes_etudiant(self):
        """L'étudiant ne voit que ses propres thèmes."""
        r = requests.get(f"{BACKEND_URL}/etudiant/themes",
            headers=self._headers(self.token_etudiant))
        self.assertEqual(r.status_code, 200)
        themes = r.json()
        self.assertIsInstance(themes, list)
        print(f"  ✓ Liste thèmes étudiant OK — {len(themes)} thème(s)")

    def test_05_lister_themes_chef(self):
        """Le chef voit les thèmes de son département."""
        r = requests.get(f"{BACKEND_URL}/chef/themes",
            headers=self._headers(self.token_chef))
        self.assertEqual(r.status_code, 200)
        print(f"  ✓ Liste thèmes chef OK — {len(r.json())} thème(s)")


class TestNotificationAPI(unittest.TestCase):
    """Tests des notifications."""

    def setUp(self):
        r = requests.post(f"{BACKEND_URL}/auth/login", json={
            "identifiant": USERS["etudiant"]["identifiant"],
            "password":    USERS["etudiant"]["password"],
        }, headers=JSON_HEADERS)
        self.token = r.json()["token"]

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self.token}", "Accept": "application/json"}

    def test_01_lister_notifications(self):
        """Liste des notifications de l'utilisateur."""
        r = requests.get(f"{BACKEND_URL}/notifications", headers=self._headers())
        self.assertEqual(r.status_code, 200)
        self.assertIn("notifications", r.json())
        print(f"  ✓ Liste notifications OK — {len(r.json()['notifications'])} notification(s)")

    def test_02_notifications_non_lues(self):
        """Récupération des notifications non lues."""
        r = requests.get(f"{BACKEND_URL}/notifications/non-lues", headers=self._headers())
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn("count", data)
        self.assertIn("notifications", data)
        print(f"  ✓ Notifications non lues OK — {data['count']} non lue(s)")

    def test_03_marquer_notifications_lues(self):
        """Marquer toutes les notifications comme lues."""
        r = requests.post(f"{BACKEND_URL}/notifications/lues", headers=self._headers())
        self.assertEqual(r.status_code, 200)

        # Vérifier que le compteur est à 0
        r2 = requests.get(f"{BACKEND_URL}/notifications/non-lues", headers=self._headers())
        self.assertEqual(r2.json()["count"], 0)
        print("  ✓ Marquer notifications lues OK")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("  DIRMA — Tests API REST")
    print("="*60)
    print(f"  Backend : {BACKEND_URL}")
    print("="*60 + "\n")

    loader = unittest.TestLoader()
    suite  = unittest.TestSuite()

    suite.addTests(loader.loadTestsFromTestCase(TestAuthAPI))
    suite.addTests(loader.loadTestsFromTestCase(TestRoleAccesAPI))
    suite.addTests(loader.loadTestsFromTestCase(TestThemeAPI))
    suite.addTests(loader.loadTestsFromTestCase(TestNotificationAPI))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n" + "="*60)
    print(f"  Résultat : {result.testsRun} tests — "
          f"{len(result.failures)} échecs — {len(result.errors)} erreurs")
    print("="*60)

    sys.exit(0 if result.wasSuccessful() else 1)
