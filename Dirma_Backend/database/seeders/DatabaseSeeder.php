<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Theme;
use App\Models\Document;
use App\Models\Decision;
use App\Models\NotificationDirma;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Utilisateurs ─────────────────────────────────────────────────────

        $chef = User::firstOrCreate(['email' => 'chef.info@univ.bf'], [
            'name' => 'Ouedraogo', 'prenom' => 'Moussa',
            'password' => Hash::make('password'),
            'role' => 'chef_departement', 'departement' => 'Informatique',
        ]);

        $da = User::firstOrCreate(['email' => 'da@univ.bf'], [
            'name' => 'Sawadogo', 'prenom' => 'Issouf',
            'password' => Hash::make('password'),
            'role' => 'directeur_adjoint', 'departement' => 'Direction',
        ]);

        $etudiants = [
            ['name' => 'Benali',    'prenom' => 'Ahmed',    'email' => 'ahmed.benali@univ.bf',    'matricule' => '20240001'],
            ['name' => 'Kaboré',    'prenom' => 'Fatima',   'email' => 'fatima.kabore@univ.bf',   'matricule' => '20240002'],
            ['name' => 'Traoré',    'prenom' => 'Ibrahim',  'email' => 'ibrahim.traore@univ.bf',  'matricule' => '20240003'],
            ['name' => 'Zongo',     'prenom' => 'Aïcha',    'email' => 'aicha.zongo@univ.bf',     'matricule' => '20240004'],
            ['name' => 'Compaoré',  'prenom' => 'Seydou',   'email' => 'seydou.compaore@univ.bf', 'matricule' => '20240005'],
        ];

        $users = [];
        foreach ($etudiants as $e) {
            $users[] = User::firstOrCreate(['matricule' => $e['matricule']], array_merge($e, [
                'password' => Hash::make('password'),
                'role' => 'etudiant', 'departement' => 'Informatique',
            ]));
        }

        // ── Thèmes ────────────────────────────────────────────────────────────

        $themesData = [
            [
                'etudiant' => $users[0],
                'titre' => 'Système de gestion des ressources hydriques au Burkina Faso',
                'description' => 'Cette étude analyse les méthodes innovantes de collecte et distribution de l\'eau potable dans les zones rurales du Burkina Faso. Nous proposons l\'utilisation de technologies IoT pour optimiser la gestion des forages et réduire les pertes en eau. L\'objectif est de développer un système de surveillance en temps réel permettant aux gestionnaires de prendre des décisions éclairées sur la distribution des ressources hydriques.',
                'score' => 12.5, 'statut' => 'valide',
            ],
            [
                'etudiant' => $users[1],
                'titre' => 'Application mobile de suivi des cultures agricoles',
                'description' => 'Ce projet vise à développer une application mobile permettant aux agriculteurs burkinabè de suivre l\'état de leurs cultures en temps réel. L\'application intégrera des capteurs de sol, des données météorologiques et des algorithmes de prédiction pour aider les agriculteurs à optimiser leurs rendements et réduire les pertes dues aux aléas climatiques.',
                'score' => 8.3, 'statut' => 'valide',
            ],
            [
                'etudiant' => $users[2],
                'titre' => 'Plateforme de e-learning pour l\'enseignement secondaire',
                'description' => 'Face aux défis de l\'éducation en zones rurales, ce projet propose une plateforme d\'apprentissage en ligne adaptée aux contraintes de connectivité du Burkina Faso. La solution fonctionnera en mode hors-ligne et synchronisera les données lors de la disponibilité d\'une connexion internet, permettant ainsi aux élèves des zones reculées d\'accéder à des ressources pédagogiques de qualité.',
                'score' => 15.7, 'statut' => 'en_attente_da',
            ],
            [
                'etudiant' => $users[3],
                'titre' => 'Système de détection précoce des maladies du bétail',
                'description' => 'Ce travail de recherche porte sur le développement d\'un système intelligent de détection précoce des maladies affectant le bétail au Burkina Faso. En combinant l\'intelligence artificielle et des capteurs biométriques, le système permettra aux éleveurs d\'identifier rapidement les animaux malades et de prendre les mesures préventives nécessaires pour éviter la propagation des maladies.',
                'score' => 22.1, 'statut' => 'en_attente_chef',
            ],
            [
                'etudiant' => $users[4],
                'titre' => 'Optimisation de la chaîne logistique des produits agricoles',
                'description' => 'Cette étude s\'intéresse à l\'amélioration de la chaîne logistique des produits agricoles au Burkina Faso, depuis la production jusqu\'à la commercialisation. Nous proposons un système de traçabilité basé sur la blockchain pour garantir la qualité des produits et réduire les pertes post-récolte. L\'objectif est d\'augmenter les revenus des agriculteurs en leur permettant d\'accéder directement aux marchés urbains.',
                'score' => 18.4, 'statut' => 'analyse_complete',
            ],
            [
                'etudiant' => $users[0],
                'titre' => 'Gestion des tickets de transport urbain via mobile',
                'description' => 'Ce projet propose une solution numérique pour moderniser le système de transport urbain à Ouagadougou. L\'application permettra aux usagers d\'acheter et valider leurs tickets de transport via leur smartphone, réduisant ainsi les files d\'attente et améliorant l\'efficacité du système. Une interface d\'administration permettra aux gestionnaires de suivre les flux de passagers en temps réel.',
                'score' => 71.2, 'statut' => 'en_attente_chef',
            ],
            [
                'etudiant' => $users[1],
                'titre' => 'Analyse des données de santé pour la prévention des épidémies',
                'description' => 'Ce travail propose un système d\'analyse des données de santé publique pour détecter et prévenir les épidémies au Burkina Faso. En exploitant les données des centres de santé, le système utilisera des algorithmes de machine learning pour identifier les patterns épidémiques et alerter les autorités sanitaires avant que les épidémies ne se propagent.',
                'score' => 5.2, 'statut' => 'rejete_chef',
            ],
        ];

        $themes = [];
        foreach ($themesData as $td) {
            $themes[] = Theme::create([
                'etudiant_id'        => $td['etudiant']->id,
                'titre'              => $td['titre'],
                'description'        => $td['description'],
                'departement'        => 'Informatique',
                'annee_universitaire'=> '2024-2025',
                'score_similarite'   => $td['score'],
                'statut'             => $td['statut'],
            ]);
        }

        // ── Décisions sur les thèmes ──────────────────────────────────────────

        // Thème 0 validé par chef puis DA
        Decision::create([
            'decideur_id' => $chef->id, 'decidable_type' => Theme::class,
            'decidable_id' => $themes[0]->id, 'type_decideur' => 'chef_departement',
            'decision' => 'valide', 'motif' => null,
        ]);
        Decision::create([
            'decideur_id' => $da->id, 'decidable_type' => Theme::class,
            'decidable_id' => $themes[0]->id, 'type_decideur' => 'directeur_adjoint',
            'decision' => 'valide', 'note_officielle' => 'Thème pertinent et original. Approuvé pour la rédaction du mémoire.',
        ]);

        // Thème 1 validé
        Decision::create([
            'decideur_id' => $chef->id, 'decidable_type' => Theme::class,
            'decidable_id' => $themes[1]->id, 'type_decideur' => 'chef_departement',
            'decision' => 'valide',
        ]);
        Decision::create([
            'decideur_id' => $da->id, 'decidable_type' => Theme::class,
            'decidable_id' => $themes[1]->id, 'type_decideur' => 'directeur_adjoint',
            'decision' => 'valide', 'note_officielle' => 'Sujet innovant avec un fort impact social. Approuvé.',
        ]);

        // Thème 2 validé chef, en attente DA
        Decision::create([
            'decideur_id' => $chef->id, 'decidable_type' => Theme::class,
            'decidable_id' => $themes[2]->id, 'type_decideur' => 'chef_departement',
            'decision' => 'valide',
        ]);

        // Thème 6 rejeté chef
        Decision::create([
            'decideur_id' => $chef->id, 'decidable_type' => Theme::class,
            'decidable_id' => $themes[6]->id, 'type_decideur' => 'chef_departement',
            'decision' => 'rejete', 'motif' => 'Sujet trop similaire à des travaux existants dans le département.',
        ]);

        // ── Notifications ─────────────────────────────────────────────────────

        $notifData = [
            [$users[0]->id, 'Thème validé !', 'Votre thème "Système de gestion des ressources hydriques" a été officiellement validé.', 'succes'],
            [$users[1]->id, 'Thème validé !', 'Votre thème "Application mobile de suivi des cultures" a été officiellement validé.', 'succes'],
            [$users[2]->id, 'Thème transmis au DA', 'Votre thème a été validé par le Chef et transmis au Directeur Adjoint.', 'info'],
            [$users[3]->id, 'Thème soumis', 'Votre thème est en attente d\'examen par le Chef de Département.', 'info'],
            [$users[4]->id, 'Analyse terminée', 'L\'analyse de votre thème est terminée. Score : 18.4%. Consultez les résultats.', 'info'],
            [$users[1]->id, 'Thème rejeté', 'Votre thème a été rejeté. Motif : Sujet trop similaire à des travaux existants.', 'erreur'],
        ];

        foreach ($notifData as [$uid, $titre, $msg, $type]) {
            NotificationDirma::create([
                'destinataire_id' => $uid,
                'titre'   => $titre,
                'message' => $msg,
                'type'    => $type,
                'lu'      => false,
            ]);
        }

        $this->command->info('✓ Base de données peuplée avec succès.');
        $this->command->info('  - ' . User::count() . ' utilisateurs');
        $this->command->info('  - ' . Theme::count() . ' thèmes');
        $this->command->info('  - ' . Decision::count() . ' décisions');
        $this->command->info('  - ' . NotificationDirma::count() . ' notifications');
    }
}
