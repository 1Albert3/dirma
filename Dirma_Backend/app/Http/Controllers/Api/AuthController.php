<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Contrôleur d'authentification DIRMA.
 * Gère l'inscription, la connexion et la déconnexion via Sanctum.
 */
class AuthController extends Controller
{
    /**
     * Inscription d'un nouvel utilisateur.
     */
    public function register(Request $request)
    {
        $data = $request->validate([
            'name'               => 'required|string|max:100',
            'prenom'             => 'required|string|max:100',
            'email'              => 'required|email|unique:users,email',
            'password'           => 'required|string|min:8|confirmed',
            'role'               => 'required|in:etudiant,chef_departement,directeur_adjoint',
            'departement'        => 'nullable|string|max:100',
            'matricule'          => 'nullable|string|unique:users,matricule',
        ]);

        $user = User::create([
            'name'        => $data['name'],
            'prenom'      => $data['prenom'],
            'email'       => $data['email'],
            'password'    => Hash::make($data['password']),
            'role'        => $data['role'],
            'departement' => $data['departement'] ?? null,
            'matricule'   => $data['matricule'] ?? null,
        ]);

        $token = $user->createToken('dirma-token')->plainTextToken;

        return response()->json([
            'message' => 'Compte créé avec succès.',
            'token'   => $token,
            'user'    => $this->formatUser($user),
        ], 201);
    }

    /**
     * Connexion d'un utilisateur (email ou matricule + mot de passe).
     */
    public function login(Request $request)
    {
        $request->validate([
            'identifiant' => 'required|string',
            'password'    => 'required|string',
        ]);

        // Recherche par email ou matricule
        $user = User::where('email', $request->identifiant)
                    ->orWhere('matricule', $request->identifiant)
                    ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'identifiant' => ['Identifiant ou mot de passe incorrect.'],
            ]);
        }

        // Révoquer les anciens tokens
        $user->tokens()->delete();
        $token = $user->createToken('dirma-token')->plainTextToken;

        return response()->json([
            'message' => 'Connexion réussie.',
            'token'   => $token,
            'user'    => $this->formatUser($user),
        ]);
    }

    /**
     * Déconnexion (révocation du token courant).
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    /**
     * Réinitialise le mot de passe via matricule ou email.
     */
    public function reinitialiserMotDePasse(Request $request)
    {
        $data = $request->validate([
            'identifiant'          => 'required|string',
            'nouveau_mot_de_passe' => 'required|string|min:8|confirmed',
        ]);

        $user = User::where('email', $data['identifiant'])
                    ->orWhere('matricule', $data['identifiant'])
                    ->first();

        if (!$user) {
            return response()->json(['message' => 'Identifiant introuvable.'], 404);
        }

        $user->update(['password' => Hash::make($data['nouveau_mot_de_passe'])]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Mot de passe réinitialisé avec succès.']);
    }

    /**
     * Retourne le profil de l'utilisateur connecté.
     */
    public function profil(Request $request)
    {
        return response()->json(['user' => $this->formatUser($request->user())]);
    }

    /**
     * Formate les données utilisateur pour la réponse API.
     */
    private function formatUser(User $user): array
    {
        return [
            'id'          => $user->id,
            'name'        => $user->name,
            'prenom'      => $user->prenom,
            'email'       => $user->email,
            'matricule'   => $user->matricule,
            'role'        => $user->role,
            'departement' => $user->departement,
        ];
    }
}
