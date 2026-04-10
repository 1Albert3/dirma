"""
DIRMA - Lanceur de tous les tests
Lance les tests API puis les tests Selenium dans l'ordre.
"""

import subprocess
import sys
import os
import time
import requests

BACKEND_URL  = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"
PYTHON = sys.executable


def verifier_serveur(url: str, nom: str, timeout: int = 5) -> bool:
    """Vérifie qu'un serveur est accessible."""
    try:
        r = requests.get(url, timeout=timeout)
        print(f"  ✓ {nom} accessible ({url})")
        return True
    except Exception:
        print(f"  ✗ {nom} inaccessible ({url})")
        return False


def lancer_tests(fichier: str, nom: str) -> bool:
    """Lance un fichier de tests et retourne True si succès."""
    print(f"\n{'='*60}")
    print(f"  {nom}")
    print(f"{'='*60}")

    result = subprocess.run(
        [PYTHON, fichier],
        capture_output=False,
        cwd=os.path.dirname(__file__)
    )
    return result.returncode == 0


def main():
    print("\n" + "="*60)
    print("  DIRMA — Suite de Tests Complète")
    print("="*60)

    # Vérification des serveurs
    print("\n[1/3] Vérification des serveurs...")
    backend_ok  = verifier_serveur(f"{BACKEND_URL}/up", "Backend Laravel")
    frontend_ok = verifier_serveur(FRONTEND_URL, "Frontend React")

    if not backend_ok:
        print("\n  ⚠ Backend non démarré. Lance :")
        print("    cd Dirma_Backend && php artisan serve --port=8000")

    if not frontend_ok:
        print("\n  ⚠ Frontend non démarré. Lance :")
        print("    cd Dirma_Frontend && npm run dev")

    if not backend_ok:
        print("\n  Impossible de lancer les tests sans le backend.")
        sys.exit(1)

    resultats = {}

    # Tests API (ne nécessite pas le frontend)
    print("\n[2/3] Tests API REST...")
    resultats["api"] = lancer_tests(
        os.path.join(os.path.dirname(__file__), "test_api.py"),
        "Tests API REST — Authentification & Rôles"
    )

    # Tests Selenium (nécessite le frontend)
    if frontend_ok:
        print("\n[3/3] Tests Selenium (Interface React)...")
        resultats["selenium"] = lancer_tests(
            os.path.join(os.path.dirname(__file__), "test_selenium.py"),
            "Tests Selenium — Interface Utilisateur"
        )
    else:
        print("\n[3/3] Tests Selenium ignorés (frontend non démarré)")
        resultats["selenium"] = None

    # Résumé final
    print("\n" + "="*60)
    print("  RÉSUMÉ FINAL")
    print("="*60)
    for nom, succes in resultats.items():
        if succes is None:
            statut = "⚠ IGNORÉ"
        elif succes:
            statut = "✓ SUCCÈS"
        else:
            statut = "✗ ÉCHEC"
        print(f"  {statut}  —  Tests {nom.upper()}")
    print("="*60 + "\n")

    tous_ok = all(v for v in resultats.values() if v is not None)
    sys.exit(0 if tous_ok else 1)


if __name__ == "__main__":
    main()
