<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ThemeController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\VerificationController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\StatistiqueController;

/*
|--------------------------------------------------------------------------
| Routes publiques (sans authentification)
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('register',                    [AuthController::class, 'register']);
    Route::post('login',                       [AuthController::class, 'login']);
    Route::post('mot-de-passe/reinitialiser',  [AuthController::class, 'reinitialiserMotDePasse']);
});

/*
|--------------------------------------------------------------------------
| Routes protégées (authentification requise via Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Authentification
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/profil',  [AuthController::class, 'profil']);

    // Notifications (tous les rôles)
    Route::get('notifications',           [NotificationController::class, 'index']);
    Route::get('notifications/non-lues',  [NotificationController::class, 'nonLues']);
    Route::post('notifications/lues',     [NotificationController::class, 'marquerLues']);

    /*
    |----------------------------------------------------------------------
    | Routes ÉTUDIANT
    |----------------------------------------------------------------------
    */
    Route::middleware('role:etudiant')->group(function () {
        // Thèmes
        Route::get('etudiant/themes',                   [ThemeController::class, 'index']);
        Route::post('etudiant/themes',                  [ThemeController::class, 'store']);
        Route::get('etudiant/themes/{theme}',            [ThemeController::class, 'show']);
        Route::post('etudiant/themes/{theme}/confirmer', [ThemeController::class, 'confirmer']);
        Route::delete('etudiant/themes/{theme}/abandonner', [ThemeController::class, 'abandonner']);

        // Documents
        Route::get('etudiant/documents',              [DocumentController::class, 'index']);
        Route::post('etudiant/documents',             [DocumentController::class, 'store']);
        Route::get('etudiant/documents/{document}',   [DocumentController::class, 'show']);
        Route::get('etudiant/documents/{document}/telecharger', [DocumentController::class, 'telecharger']);
        Route::post('etudiant/documents/{document}/verifier',   [DocumentController::class, 'lancerVerification']);

        // Vérifications
        Route::get('etudiant/verifications',                          [VerificationController::class, 'index']);
        Route::get('etudiant/verifications/{verification}',           [VerificationController::class, 'show']);
        Route::get('etudiant/verifications/{verification}/rapport',   [VerificationController::class, 'telechargerRapport']);
    });

    /*
    |----------------------------------------------------------------------
    | Routes CHEF DE DÉPARTEMENT
    |----------------------------------------------------------------------
    */
    Route::middleware('role:chef_departement')->group(function () {
        // Thèmes
        Route::get('chef/themes',                          [ThemeController::class, 'index']);
        Route::get('chef/themes/{theme}',                  [ThemeController::class, 'show']);
        Route::post('chef/themes/{theme}/reanalyser',      [ThemeController::class, 'reanalyser']);
        Route::post('chef/themes/{theme}/decision',        [ThemeController::class, 'decisionChef']);

        // Documents
        Route::get('chef/documents',                       [DocumentController::class, 'index']);
        Route::get('chef/documents/{document}',            [DocumentController::class, 'show']);
        Route::get('chef/documents/{document}/telecharger',[DocumentController::class, 'telecharger']);
        Route::post('chef/documents/{document}/decision',  [DocumentController::class, 'decisionChef']);

        // Vérifications (lecture seule)
        Route::get('chef/verifications/{verification}',          [VerificationController::class, 'show']);
        Route::get('chef/verifications/{verification}/rapport',  [VerificationController::class, 'telechargerRapport']);
    });

    /*
    |----------------------------------------------------------------------
    | Routes DIRECTEUR ADJOINT
    |----------------------------------------------------------------------
    */
    Route::middleware('role:directeur_adjoint')->group(function () {
        // Thèmes
        Route::get('da/themes',                        [ThemeController::class, 'index']);
        Route::get('da/themes/{theme}',                [ThemeController::class, 'show']);
        Route::post('da/themes/{theme}/decision',      [ThemeController::class, 'decisionDA']);

        // Documents
        Route::get('da/documents',                     [DocumentController::class, 'index']);
        Route::get('da/documents/{document}',          [DocumentController::class, 'show']);
        Route::get('da/documents/{document}/telecharger', [DocumentController::class, 'telecharger']);
        Route::post('da/documents/{document}/decision',[DocumentController::class, 'decisionDA']);

        // Statistiques globales
        Route::get('da/statistiques',                  [StatistiqueController::class, 'index']);
        Route::get('da/statistiques/export',           [StatistiqueController::class, 'exportCsv']);

        // Gestion utilisateurs (DA uniquement)
        Route::get('da/utilisateurs',                  [StatistiqueController::class, 'utilisateurs']);
        Route::post('da/utilisateurs',                 [StatistiqueController::class, 'creerUtilisateur']);
        Route::delete('da/utilisateurs/{user}',        [StatistiqueController::class, 'supprimerUtilisateur']);

        // Vérifications (lecture seule)
        Route::get('da/verifications/{verification}',         [VerificationController::class, 'show']);
        Route::get('da/verifications/{verification}/rapport', [VerificationController::class, 'telechargerRapport']);
    });
});
