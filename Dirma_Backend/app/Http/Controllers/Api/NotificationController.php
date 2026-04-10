<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationDirma;
use App\Services\NotificationService;
use Illuminate\Http\Request;

/**
 * Contrôleur des notifications DIRMA.
 */
class NotificationController extends Controller
{
    public function __construct(private NotificationService $notifService) {}

    /**
     * Liste toutes les notifications de l'utilisateur connecté.
     */
    public function index(Request $request)
    {
        $notifications = NotificationDirma::where('destinataire_id', $request->user()->id)
            ->latest()
            ->take(50)
            ->get();

        return response()->json(['notifications' => $notifications]);
    }

    /**
     * Retourne uniquement les notifications non lues avec leur nombre.
     */
    public function nonLues(Request $request)
    {
        $notifications = NotificationDirma::where('destinataire_id', $request->user()->id)
            ->where('lu', false)
            ->latest()
            ->get();

        return response()->json([
            'notifications' => $notifications,
            'count'         => $notifications->count(),
        ]);
    }

    /**
     * Marque toutes les notifications comme lues.
     */
    public function marquerLues(Request $request)
    {
        $this->notifService->marquerToutesLues($request->user()->id);

        return response()->json(['message' => 'Notifications marquées comme lues.']);
    }
}
