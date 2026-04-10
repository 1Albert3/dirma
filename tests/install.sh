#!/bin/bash
# ============================================================
# DIRMA - Installation des dépendances de test Selenium
# ============================================================

echo "=== Installation pip ==="
sudo apt-get install -y python3-pip

echo "=== Installation des packages ==="
sudo pip3 install selenium==4.27.1 webdriver-manager==4.0.2 requests==2.32.3 --break-system-packages

echo "=== Vérification ==="
python3 -c "import selenium; print('Selenium', selenium.__version__, '✓')"
python3 -c "from webdriver_manager.chrome import ChromeDriverManager; print('WebDriverManager ✓')"
python3 -c "import requests; print('Requests', requests.__version__, '✓')"

echo ""
echo "=== Installation terminée ==="
echo "Pour lancer les tests :"
echo "  python3 /home/albert/Projet/Dirma/tests/run_tests.py"
