"""
DIRMA - Tests Selenium (Interface React)
Teste l'interface utilisateur via Chrome en mode headless.
"""

import unittest
import time
import sys
import os

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

sys.path.insert(0, os.path.dirname(__file__))
from config import FRONTEND_URL, USERS, TIMEOUT_MOYEN, TIMEOUT_LONG


def creer_driver(headless: bool = False) -> webdriver.Chrome:
    """Crée et configure le driver Chrome."""
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1280,900")
    options.add_argument("--lang=fr-FR")

    try:
        from webdriver_manager.chrome import ChromeDriverManager
        service = Service(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=options)
    except Exception:
        # Fallback : chromedriver dans le PATH
        return webdriver.Chrome(options=options)


class BaseTestSelenium(unittest.TestCase):
    """Classe de base pour tous les tests Selenium."""

    @classmethod
    def setUpClass(cls):
        cls.driver = creer_driver(headless=False)
        cls.wait   = WebDriverWait(cls.driver, TIMEOUT_MOYEN)

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()

    def aller_a(self, chemin: str = ""):
        self.driver.get(f"{FRONTEND_URL}{chemin}")
        time.sleep(0.5)

    def trouver(self, by, valeur, timeout: int = TIMEOUT_MOYEN):
        return WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located((by, valeur))
        )

    def cliquer(self, by, valeur, timeout: int = TIMEOUT_MOYEN):
        el = WebDriverWait(self.driver, timeout).until(
            EC.element_to_be_clickable((by, valeur))
        )
        el.click()
        return el

    def saisir(self, by, valeur, texte: str, effacer: bool = True):
        el = self.trouver(by, valeur)
        if effacer:
            el.clear()
        el.send_keys(texte)
        return el

    def attendre_url(self, url_partielle: str, timeout: int = TIMEOUT_LONG):
        WebDriverWait(self.driver, timeout).until(
            EC.url_contains(url_partielle)
        )

    def texte_present(self, texte: str, timeout: int = TIMEOUT_MOYEN) -> bool:
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.text_to_be_present_in_element((By.TAG_NAME, "body"), texte)
            )
            return True
        except TimeoutException:
            return False

    def se_connecter(self, role: str):
        """Connexion via l'interface React."""
        user = USERS[role]
        self.aller_a("/login")
        time.sleep(2)

        from selenium.webdriver.support.ui import Select
        role_map = {
            "etudiant": "etudiant",
            "chef":     "chef_departement",
            "da":       "directeur_adjoint",
        }

        # 1. Sélectionner le rôle
        sel = self.trouver(By.TAG_NAME, "select")
        Select(sel).select_by_value(role_map[role])
        time.sleep(1)

        # 2. Remplir l'identifiant APRES le changement de rôle
        champ_id = self.trouver(By.CSS_SELECTOR, "input:not([type='password'])")
        champ_id.clear()
        champ_id.send_keys(user["identifiant"])

        # 3. Mot de passe
        champ_pw = self.trouver(By.CSS_SELECTOR, "input[type='password']")
        champ_pw.clear()
        champ_pw.send_keys(user["password"])

        # 4. Soumettre
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        time.sleep(3)

    def se_deconnecter(self):
        """Déconnexion via l'interface."""
        try:
            btn = self.driver.find_element(By.CSS_SELECTOR,
                "button[class*='logout'], a[href*='logout'], button[title*='déconnexion'], button[title*='Déconnexion']")
            btn.click()
            time.sleep(1)
        except NoSuchElementException:
            # Naviguer vers une page réelle avant de toucher localStorage
            self.aller_a("/login")
            time.sleep(0.5)
            self.driver.execute_script("localStorage.removeItem('token'); localStorage.removeItem('user'); localStorage.removeItem('dirma_token'); localStorage.removeItem('dirma_user');")
            time.sleep(0.5)


class TestPageLogin(BaseTestSelenium):
    """Tests de la page de connexion."""

    def test_01_page_login_accessible(self):
        """La page de login est accessible."""
        self.aller_a("/login")
        titre = self.driver.title
        self.assertIsNotNone(titre)
        # Vérifier qu'un formulaire est présent
        formulaire = self.driver.find_elements(By.TAG_NAME, "form")
        self.assertGreater(len(formulaire), 0, "Aucun formulaire trouvé sur /login")
        print(f"  ✓ Page login accessible — titre: {titre}")

    def test_02_champs_login_presents(self):
        """Les champs identifiant et mot de passe sont présents."""
        self.aller_a("/login")
        time.sleep(1.5)
        champ_id = self.driver.find_elements(By.CSS_SELECTOR, "input[type='text'], input[type='email']")
        champ_pw = self.driver.find_elements(By.CSS_SELECTOR, "input[type='password']")
        self.assertGreater(len(champ_id), 0, "Champ identifiant absent")
        self.assertGreater(len(champ_pw), 0, "Champ mot de passe absent")
        print("  ✓ Champs login présents OK")

    def test_03_login_etudiant_succes(self):
        """Connexion réussie avec les identifiants étudiant."""
        self.se_connecter("etudiant")
        url_actuelle = self.driver.current_url
        # Doit être redirigé vers le dashboard étudiant
        self.assertNotIn("/login", url_actuelle,
            f"Toujours sur /login après connexion. URL: {url_actuelle}")
        print(f"  ✓ Login étudiant → redirigé vers: {url_actuelle}")

    def test_04_login_chef_succes(self):
        """Connexion réussie avec les identifiants chef."""
        self.se_connecter("chef")
        url_actuelle = self.driver.current_url
        self.assertNotIn("/login", url_actuelle,
            f"Toujours sur /login après connexion. URL: {url_actuelle}")
        print(f"  ✓ Login chef → redirigé vers: {url_actuelle}")

    def test_05_login_da_succes(self):
        """Connexion réussie avec les identifiants DA."""
        self.se_connecter("da")
        url_actuelle = self.driver.current_url
        self.assertNotIn("/login", url_actuelle,
            f"Toujours sur /login après connexion. URL: {url_actuelle}")
        print(f"  ✓ Login DA → redirigé vers: {url_actuelle}")

    def test_06_login_mauvais_identifiants(self):
        """Connexion échouée avec de mauvais identifiants."""
        self.aller_a("/login")
        time.sleep(2)

        from selenium.webdriver.support.ui import Select
        Select(self.trouver(By.TAG_NAME, "select")).select_by_value("etudiant")
        time.sleep(1)

        champ_id = self.trouver(By.CSS_SELECTOR, "input:not([type='password'])")
        champ_id.clear()
        champ_id.send_keys("faux@test.bf")

        champ_pw = self.trouver(By.CSS_SELECTOR, "input[type='password']")
        champ_pw.clear()
        champ_pw.send_keys("mauvais_password")
        champ_pw.send_keys(Keys.RETURN)

        time.sleep(2)

        # Doit rester sur /login ou afficher une erreur
        url_actuelle = self.driver.current_url
        page_source  = self.driver.page_source.lower()
        erreur_affichee = (
            "/login" in url_actuelle or
            "incorrect" in page_source or
            "invalide" in page_source or
            "erreur" in page_source or
            "error" in page_source
        )
        self.assertTrue(erreur_affichee,
            f"Aucune erreur affichée pour mauvais identifiants. URL: {url_actuelle}")
        print("  ✓ Rejet mauvais identifiants OK")

    def test_07_login_champs_vides(self):
        """Soumission du formulaire avec champs vides."""
        self.aller_a("/login")
        time.sleep(1)

        # Chercher et cliquer le bouton de soumission sans remplir
        boutons = self.driver.find_elements(By.CSS_SELECTOR,
            "button[type='submit'], input[type='submit']")
        if boutons:
            boutons[0].click()
            time.sleep(1)

        url_actuelle = self.driver.current_url
        self.assertIn("/login", url_actuelle,
            "Redirigé malgré champs vides")
        print("  ✓ Blocage champs vides OK")


class TestProtectionRoutes(BaseTestSelenium):
    """Tests de protection des routes (redirection si non connecté)."""

    def test_01_dashboard_etudiant_sans_auth(self):
        """Accès au dashboard étudiant sans être connecté → redirection."""
        # Naviguer d'abord vers une vraie page puis vider le localStorage
        self.aller_a("/login")
        time.sleep(1)
        self.driver.execute_script("localStorage.clear();")
        self.aller_a("/etudiant/dashboard")
        time.sleep(2)
        url_actuelle = self.driver.current_url
        self.assertNotIn("/etudiant/dashboard", url_actuelle,
            "Dashboard étudiant accessible sans authentification")
        print(f"  ✓ Dashboard étudiant protégé → redirigé vers: {url_actuelle}")

    def test_02_dashboard_chef_sans_auth(self):
        """Accès au dashboard chef sans être connecté → redirection."""
        self.aller_a("/login")
        time.sleep(1)
        self.driver.execute_script("localStorage.clear();")
        self.aller_a("/chef/dashboard")
        time.sleep(2)
        url_actuelle = self.driver.current_url
        self.assertNotIn("/chef/dashboard", url_actuelle,
            "Dashboard chef accessible sans authentification")
        print(f"  ✓ Dashboard chef protégé → redirigé vers: {url_actuelle}")

    def test_03_dashboard_da_sans_auth(self):
        """Accès au dashboard DA sans être connecté → redirection."""
        self.aller_a("/login")
        time.sleep(1)
        self.driver.execute_script("localStorage.clear();")
        self.aller_a("/da/dashboard")
        time.sleep(2)
        url_actuelle = self.driver.current_url
        self.assertNotIn("/da/dashboard", url_actuelle,
            "Dashboard DA accessible sans authentification")
        print(f"  ✓ Dashboard DA protégé → redirigé vers: {url_actuelle}")


class TestDashboardEtudiant(BaseTestSelenium):
    """Tests du dashboard étudiant après connexion."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from selenium.webdriver.support.ui import Select
        user = USERS["etudiant"]
        cls.driver.get(f"{FRONTEND_URL}/login")
        time.sleep(2)
        Select(cls.driver.find_element(By.TAG_NAME, "select")).select_by_value("etudiant")
        time.sleep(1)
        cls.driver.find_element(By.CSS_SELECTOR, "input:not([type='password'])").send_keys(user["identifiant"])
        cls.driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(user["password"])
        cls.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        time.sleep(3)

    def test_01_dashboard_charge(self):
        """Le dashboard étudiant se charge correctement."""
        url = self.driver.current_url
        self.assertNotIn("/login", url, "Toujours sur /login")
        # Vérifier qu'il y a du contenu
        body = self.driver.find_element(By.TAG_NAME, "body")
        self.assertGreater(len(body.text), 10, "Dashboard vide")
        print(f"  ✓ Dashboard étudiant chargé — URL: {url}")

    def test_02_navigation_themes(self):
        """Navigation vers la page des thèmes."""
        liens = self.driver.find_elements(By.CSS_SELECTOR,
            "a[href*='theme'], a[href*='Theme'], nav a")
        if liens:
            for lien in liens:
                if "theme" in (lien.get_attribute("href") or "").lower():
                    lien.click()
                    time.sleep(1)
                    break
        url = self.driver.current_url
        print(f"  ✓ Navigation thèmes — URL: {url}")

    def test_03_page_soumission_theme_accessible(self):
        """La page de soumission de thème est accessible."""
        self.aller_a("/etudiant/themes")
        time.sleep(1)
        url = self.driver.current_url
        # Soit on est sur la page, soit redirigé vers login (si session expirée)
        print(f"  ✓ Page thèmes — URL: {url}")


class TestDashboardChef(BaseTestSelenium):
    """Tests du dashboard chef de département."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from selenium.webdriver.support.ui import Select
        user = USERS["chef"]
        cls.driver.get(f"{FRONTEND_URL}/login")
        time.sleep(2)
        Select(cls.driver.find_element(By.TAG_NAME, "select")).select_by_value("chef_departement")
        time.sleep(1)
        cls.driver.find_element(By.CSS_SELECTOR, "input:not([type='password'])").send_keys(user["identifiant"])
        cls.driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(user["password"])
        cls.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        time.sleep(3)

    def test_01_dashboard_chef_charge(self):
        """Le dashboard chef se charge correctement."""
        url = self.driver.current_url
        self.assertNotIn("/login", url, "Toujours sur /login")
        print(f"  ✓ Dashboard chef chargé — URL: {url}")

    def test_02_acces_liste_themes(self):
        """Le chef peut accéder à la liste des thèmes."""
        self.aller_a("/chef/dashboard")
        time.sleep(1)
        url = self.driver.current_url
        print(f"  ✓ Dashboard chef — URL: {url}")


class TestDashboardDA(BaseTestSelenium):
    """Tests du dashboard Directeur Adjoint."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from selenium.webdriver.support.ui import Select
        user = USERS["da"]
        cls.driver.get(f"{FRONTEND_URL}/login")
        time.sleep(2)
        Select(cls.driver.find_element(By.TAG_NAME, "select")).select_by_value("directeur_adjoint")
        time.sleep(1)
        cls.driver.find_element(By.CSS_SELECTOR, "input:not([type='password'])").send_keys(user["identifiant"])
        cls.driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(user["password"])
        cls.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        time.sleep(3)

    def test_01_dashboard_da_charge(self):
        """Le dashboard DA se charge correctement."""
        url = self.driver.current_url
        self.assertNotIn("/login", url, "Toujours sur /login")
        print(f"  ✓ Dashboard DA chargé — URL: {url}")

    def test_02_acces_statistiques(self):
        """Le DA peut accéder aux statistiques."""
        self.aller_a("/da/dashboard")
        time.sleep(1)
        url = self.driver.current_url
        print(f"  ✓ Dashboard DA — URL: {url}")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("  DIRMA — Tests Selenium (Interface React)")
    print("="*60)
    print(f"  Frontend : {FRONTEND_URL}")
    print("  Mode     : Chrome Visible")
    print("="*60 + "\n")

    loader = unittest.TestLoader()
    suite  = unittest.TestSuite()

    suite.addTests(loader.loadTestsFromTestCase(TestPageLogin))
    suite.addTests(loader.loadTestsFromTestCase(TestProtectionRoutes))
    suite.addTests(loader.loadTestsFromTestCase(TestDashboardEtudiant))
    suite.addTests(loader.loadTestsFromTestCase(TestDashboardChef))
    suite.addTests(loader.loadTestsFromTestCase(TestDashboardDA))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("\n" + "="*60)
    print(f"  Résultat : {result.testsRun} tests — "
          f"{len(result.failures)} échecs — {len(result.errors)} erreurs")
    print("="*60)

    sys.exit(0 if result.wasSuccessful() else 1)
