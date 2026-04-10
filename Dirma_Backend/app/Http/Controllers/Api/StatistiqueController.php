<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\Theme;
use App\Models\User;
use App\Models\Verification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class StatistiqueController extends Controller
{
    public function index(Request $request)
    {
        $parDepartement = User::where('role', 'etudiant')
            ->select('departement', DB::raw('count(*) as total'))
            ->groupBy('departement')
            ->pluck('total', 'departement')
            ->toArray();

        return response()->json([
            'total_etudiants'       => User::where('role', 'etudiant')->count(),
            'total_themes'          => Theme::count(),
            'themes_valides'        => Theme::where('statut', 'valide')->count(),
            'themes_en_attente'     => Theme::whereIn('statut', ['en_attente_chef', 'en_attente_da'])->count(),
            'total_documents'       => Document::count(),
            'documents_valides'     => Document::where('statut', 'valide')->count(),
            'documents_en_attente'  => Document::whereIn('statut', ['en_attente_chef', 'en_attente_da'])->count(),
            'total_verifications'   => Verification::count(),
            'score_moyen_global'    => round(Verification::whereNotNull('score_global')->avg('score_global'), 1) ?? 0,
            'par_departement'       => $parDepartement,
        ]);
    }

    /**
     * Export CSV des statistiques.
     */
    public function exportCsv()
    {
        $themes = Theme::with('etudiant:id,name,prenom,matricule,departement')
            ->latest()->get();

        $lignes = ["Matricule,Etudiant,Departement,Titre,Score Similarite,Statut,Date"];
        foreach ($themes as $t) {
            $lignes[] = implode(',', [
                $t->etudiant->matricule ?? '',
                '"' . ($t->etudiant->prenom . ' ' . $t->etudiant->name) . '"',
                $t->departement,
                '"' . $t->titre . '"',
                $t->score_similarite . '%',
                $t->statut,
                $t->created_at->format('d/m/Y'),
            ]);
        }

        $csv = implode("\n", $lignes);

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="dirma-statistiques-' . now()->format('Y-m-d') . '.csv"',
        ]);
    }

    /**
     * Liste tous les utilisateurs.
     */
    public function utilisateurs()
    {
        $users = User::select('id', 'name', 'prenom', 'email', 'matricule', 'role', 'departement', 'created_at')
            ->latest()->get();
        return response()->json($users);
    }

    /**
     * Crée un nouvel utilisateur (DA uniquement).
     */
    public function creerUtilisateur(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'prenom'      => 'required|string|max:100',
            'email'       => 'required|email|unique:users,email',
            'role'        => 'required|in:etudiant,chef_departement,directeur_adjoint',
            'departement' => 'required|string',
            'matricule'   => 'nullable|string|unique:users,matricule',
        ]);

        $user = User::create(array_merge($data, [
            'password' => Hash::make('password'), // mot de passe par défaut
        ]));

        return response()->json([
            'message' => 'Utilisateur créé. Mot de passe par défaut : password',
            'user'    => $user,
        ], 201);
    }

    /**
     * Supprime un utilisateur.
     */
    public function supprimerUtilisateur(User $user)
    {
        if ($user->role === 'directeur_adjoint') {
            return response()->json(['message' => 'Impossible de supprimer un Directeur Adjoint.'], 422);
        }
        $user->delete();
        return response()->json(['message' => 'Utilisateur supprimé.']);
    }
}
