<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1C1C1C; margin: 0; padding: 20px; }
        .header { background: #1C1C1C; color: white; padding: 20px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; color: #E87722; }
        .header p  { margin: 4px 0 0; font-size: 11px; color: #ccc; }
        .section { margin-bottom: 16px; }
        .section-title { background: #E87722; color: white; padding: 6px 12px; font-weight: bold; font-size: 12px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        td, th { padding: 6px 10px; border: 1px solid #ddd; }
        th { background: #f5f5f5; font-weight: bold; text-align: left; }
        .score-box { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; color: white; }
        .risque-eleve   { background: #dc2626; }
        .risque-modere  { background: #f59e0b; }
        .risque-faible  { background: #16a34a; }
        .score-global { font-size: 28px; font-weight: bold; color: #E87722; text-align: center; padding: 16px; border: 2px solid #E87722; margin: 10px 0; }
        .conclusion { background: #f9f9f9; border-left: 4px solid #E87722; padding: 12px; font-style: italic; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
    </style>
</head>
<body>

<div class="header">
    <h1>DIRMA — Rapport de Vérification</h1>
    <p>Ton travail, ta signature &nbsp;|&nbsp; Généré le {{ $meta['date'] }} &nbsp;|&nbsp; Réf. #{{ $meta['verification_id'] }}</p>
</div>

<div class="section">
    <div class="section-title">Informations Étudiant & Document</div>
    <table>
        <tr><th>Étudiant</th><td>{{ $etudiant['nom'] }}</td><th>Matricule</th><td>{{ $etudiant['matricule'] }}</td></tr>
        <tr><th>Département</th><td>{{ $etudiant['departement'] }}</td><th>Niveau</th><td>{{ $document['niveau'] }}</td></tr>
        <tr><th>Titre du document</th><td colspan="3">{{ $document['titre'] }}</td></tr>
        <tr><th>Type</th><td>{{ $document['type'] }}</td><th>Année universitaire</th><td>{{ $document['annee_universitaire'] }}</td></tr>
    </table>
</div>

<div class="section">
    <div class="section-title">Scores de Vérification</div>
    <div class="score-global">Score Global : {{ $scores['global'] }}</div>
    <table>
        <tr>
            <th>Analyse</th>
            <th>Score</th>
            <th>Pondération</th>
        </tr>
        <tr>
            <td>Similarité locale (Shingling + Jaccard)</td>
            <td>{{ $scores['local'] }}</td>
            <td>{{ $ponderation['local'] }}</td>
        </tr>
        <tr>
            <td>Détection IA (Perplexité + Burstiness)</td>
            <td>{{ $scores['ia'] }}</td>
            <td>{{ $ponderation['ia'] }}</td>
        </tr>
        <tr>
            <td>Recherche web (Rabin-Karp)</td>
            <td>{{ $scores['web'] }}</td>
            <td>{{ $ponderation['web'] }}</td>
        </tr>
        <tr>
            <th>Niveau de risque</th>
            <td colspan="2">
                <span class="score-box risque-{{ strtolower(str_replace('é', 'e', $scores['niveau_risque'])) }}">
                    {{ $scores['niveau_risque'] }}
                </span>
            </td>
        </tr>
    </table>
</div>

@if(!empty($details_ia))
<div class="section">
    <div class="section-title">Détails Analyse IA (XGBoost)</div>
    <table>
        <tr>
            <th>Connecteurs logiques</th><td>{{ $details_ia['connecteurs_logiques'] ?? 'N/A' }}%</td>
            <th>Formalité</th><td>{{ $details_ia['formalite'] ?? 'N/A' }}%</td>
        </tr>
        <tr>
            <th>Uniformité phrases</th><td>{{ $details_ia['uniformite_phrases'] ?? 'N/A' }}%</td>
            <th>Absence marqueurs humains</th><td>{{ $details_ia['absence_marqueurs_humains'] ?? 'N/A' }}%</td>
        </tr>
        <tr>
            <th>Adverbes formels</th><td>{{ $details_ia['adverbes_formels'] ?? 'N/A' }}%</td>
            <th>Nominalisations</th><td>{{ $details_ia['nominalisations'] ?? 'N/A' }}%</td>
        </tr>
        <tr>
            <th>Nombre de mots</th><td>{{ $details_ia['nb_mots'] ?? 'N/A' }}</td>
            <th>Nombre de phrases</th><td>{{ $details_ia['nb_phrases'] ?? 'N/A' }}</td>
        </tr>
    </table>
</div>
@endif

@if($sources_local->count() > 0)
<div class="section">
    <div class="section-title">Sources Locales Détectées ({{ $sources_local->count() }})</div>
    <table>
        <tr><th>Document référence</th><th>Taux de similarité</th></tr>
        @foreach($sources_local as $source)
        <tr>
            <td>{{ $source->document_ref }}</td>
            <td>{{ $source->taux_similarite }}%</td>
        </tr>
        @endforeach
    </table>
</div>
@endif

@if($sources_web->count() > 0)
<div class="section">
    <div class="section-title">Sources Web Détectées ({{ $sources_web->count() }})</div>
    <table>
        <tr><th>URL</th><th>Taux de similarité</th></tr>
        @foreach($sources_web as $source)
        <tr>
            <td>{{ $source->url }}</td>
            <td>{{ $source->taux_similarite }}%</td>
        </tr>
        @endforeach
    </table>
</div>
@endif

<div class="section">
    <div class="section-title">Conclusion</div>
    <div class="conclusion">{{ $conclusion }}</div>
</div>

<div class="footer">
    DIRMA — Système de Détection de Plagiat &nbsp;|&nbsp; Burkina Faso &nbsp;|&nbsp; "Ton travail, ta signature"
</div>

</body>
</html>
