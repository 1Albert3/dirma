<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * Middleware qui vérifie que l'utilisateur connecté possède le rôle requis.
 * Utilisé pour protéger les routes selon le rôle.
 */
class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): mixed
    {
        $user = $request->user();

        if (!$user || !in_array($user->role, $roles)) {
            return response()->json([
                'message' => 'Accès refusé. Vous n\'avez pas les droits nécessaires.',
            ], 403);
        }

        return $next($request);
    }
}
