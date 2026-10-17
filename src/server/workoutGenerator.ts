import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Create Gemini client according to AI Studio guidelines
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

export interface AIWorkoutRequest {
  goal?: string;
  muscleGroup?: string;
  duration?: number;
  fitnessLevel?: string;
  equipment?: string;
  notes?: string;
}

export interface GeneratedExercise {
  name: string;
  category: string;
  targetMuscle: string;
  description: string;
  tips: string;
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number;
  restSeconds: number;
  iconKey?: string;
}

export interface GeneratedWorkout {
  name: string;
  description: string;
  targetMuscles: string[];
  estimatedDurationMinutes: number;
  difficulty: string;
  exercises: GeneratedExercise[];
}

export async function generateWorkoutWithGemini(params: AIWorkoutRequest): Promise<GeneratedWorkout> {
  const ai = getGeminiClient();

  const goal = params.goal || 'Hypertrophie (Volume musculaire)';
  const muscleGroup = params.muscleGroup || 'Full Body (Corps complet)';
  const duration = params.duration || 45;
  const fitnessLevel = params.fitnessLevel || 'Intermédiaire';
  const equipment = params.equipment || 'Salle de musculation complète';
  const notes = params.notes ? `Exigences supplémentaires de l'athlète: "${params.notes}".` : '';

  if (ai && process.env.GEMINI_API_KEY) {
    try {
      const prompt = `Génère une séance d'entraînement de musculation / fitness complète, structurée et ultra efficace en français pour cet athlète:
- Objectif: ${goal}
- Groupe(s) musculaire(s) / Focus: ${muscleGroup}
- Durée estimée: ${duration} minutes
- Niveau: ${fitnessLevel}
- Équipement disponible: ${equipment}
${notes}

Fournis entre 4 et 6 exercices optimaux, avec descriptions courtes, consignes de sécurité/forme, nombre de séries (3 à 5), répétitions cibles (6 à 15), charge indicative réaliste en kg (ou 0 pour poids de corps), et temps de repos conseillé en secondes (45 à 120s).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'Tu es un préparateur physique d\'élite et coach sportif expert. Tu crées des programmes d\'entraînement sur mesure et précis en français, adaptés aux contraintes biomécaniques et aux objectifs de progression.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'Titre dynamique et motivant de la séance' },
              description: { type: Type.STRING, description: 'Brève description de l\'intention de la séance' },
              targetMuscles: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Muscles principaux sollicités',
              },
              estimatedDurationMinutes: { type: Type.INTEGER, description: 'Durée en minutes' },
              difficulty: { type: Type.STRING, description: 'Débutant, Intermédiaire, ou Avancé' },
              exercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: 'Nom de l\'exercice en français' },
                    category: { type: Type.STRING, description: 'Pectoraux, Dos, Jambes, Épaules, Bras, ou Abdos' },
                    targetMuscle: { type: Type.STRING, description: 'Muscle principal visé' },
                    description: { type: Type.STRING, description: 'Explication concise du mouvement (1 à 2 phrases)' },
                    tips: { type: Type.STRING, description: 'Astuce technique ou consigne de respiration' },
                    defaultSets: { type: Type.INTEGER, description: 'Nombre de séries recommandé (ex: 3 ou 4)' },
                    defaultReps: { type: Type.INTEGER, description: 'Nombre de répétitions par série (ex: 10)' },
                    defaultWeight: { type: Type.NUMBER, description: 'Poids conseillé en kg (0 pour poids du corps)' },
                    restSeconds: { type: Type.INTEGER, description: 'Temps de repos conseillé en secondes (ex: 60, 90)' },
                    iconKey: { type: Type.STRING, description: 'Un mot-clé parmi: bench_press, squat, deadlift, pullup, row, shoulder_press, curl, dip, plank, lunge' }
                  },
                  required: ['name', 'category', 'targetMuscle', 'description', 'tips', 'defaultSets', 'defaultReps', 'defaultWeight', 'restSeconds'],
                },
              },
            },
            required: ['name', 'description', 'targetMuscles', 'estimatedDurationMinutes', 'difficulty', 'exercises'],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim()) as GeneratedWorkout;
        if (parsed.exercises && parsed.exercises.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error generating workout with Gemini:', err);
    }
  }

  // Curated fallback routine if Gemini API key is missing or encounters a network issue
  return generateCuratedFallback(params);
}

function generateCuratedFallback(params: AIWorkoutRequest): GeneratedWorkout {
  const muscle = (params.muscleGroup || '').toLowerCase();
  const goal = params.goal || 'Hypertrophie';

  if (muscle.includes('push') || muscle.includes('pect') || muscle.includes('tricep')) {
    return {
      name: `Séance Push Force & Définition (${goal})`,
      description: 'Développement complet des pectoraux, du faisceau antérieur des épaules et des triceps.',
      targetMuscles: ['Pectoraux', 'Épaules', 'Triceps'],
      estimatedDurationMinutes: params.duration || 50,
      difficulty: params.fitnessLevel || 'Intermédiaire',
      exercises: [
        {
          name: 'Développé couché à la barre',
          category: 'Pectoraux',
          targetMuscle: 'Grand pectoral (faisceau sternal)',
          description: 'Allongé sur le banc plat, descendez la barre sous contrôle au niveau des tétons puis poussez vigoureusement.',
          tips: 'Pieds au sol, fessiers serrés et omoplates rétractées contre le banc.',
          defaultSets: 4,
          defaultReps: 8,
          defaultWeight: 60,
          restSeconds: 90,
          iconKey: 'bench_press'
        },
        {
          name: 'Développé incliné aux haltères',
          category: 'Pectoraux',
          targetMuscle: 'Haut des pectoraux (claviculaire)',
          description: 'Sur banc à 30°, poussez les haltères verticalement en convergeant sans les entrechoquer.',
          tips: 'Contrôlez l\'étirement en bas pendant 1 seconde.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeight: 22,
          restSeconds: 75,
          iconKey: 'bench_press'
        },
        {
          name: 'Développé militaire debout',
          category: 'Épaules',
          targetMuscle: 'Deltoïde antérieur et latéral',
          description: 'Debout, gainer les abdominaux et pousser la barre au-dessus de la tête jusqu\'au verrouillage contrôlé.',
          tips: 'Rentrez le menton à la descente et serrez les fessiers pour protéger les lombaires.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeight: 40,
          restSeconds: 75,
          iconKey: 'shoulder_press'
        },
        {
          name: 'Élévations latérales aux haltères',
          category: 'Épaules',
          targetMuscle: 'Faisceau moyen de l\'épaule',
          description: 'Levez les haltères sur les côtés jusqu\'à l\'horizontale avec les coudes légèrement fléchis.',
          tips: 'Pensez à verser de l\'eau avec des pichets pour bien engager le deltoïde latéral.',
          defaultSets: 4,
          defaultReps: 12,
          defaultWeight: 10,
          restSeconds: 60,
          iconKey: 'shoulder_press'
        },
        {
          name: 'Dips à la barre parallèle',
          category: 'Bras',
          targetMuscle: 'Triceps et bas des pectoraux',
          description: 'Fléchissez les coudes jusqu\'à 90 degrés puis remontez en verrouillant les triceps.',
          tips: 'Gardez le buste droit pour cibler en priorité les triceps.',
          defaultSets: 3,
          defaultReps: 12,
          defaultWeight: 0,
          restSeconds: 60,
          iconKey: 'dip'
        }
      ]
    };
  }

  if (muscle.includes('pull') || muscle.includes('dos') || muscle.includes('bicep')) {
    return {
      name: `Séance Pull Densité & Largeur (${goal})`,
      description: 'Accent sur la largeur du grand dorsal, l\'épaisseur des trapèzes et le pic des biceps.',
      targetMuscles: ['Grand Dorsal', 'Trapèzes', 'Biceps', 'Arrière d\'épaules'],
      estimatedDurationMinutes: params.duration || 50,
      difficulty: params.fitnessLevel || 'Intermédiaire',
      exercises: [
        {
          name: 'Tractions prise pronation',
          category: 'Dos',
          targetMuscle: 'Grand dorsal (largeur)',
          description: 'Suspendez-vous à la barre et hissez votre poitrine vers la barre en initiant le mouvement avec le dos.',
          tips: 'Ne balancez pas les jambes, tirez les coudes vers le bas et l\'arrière.',
          defaultSets: 4,
          defaultReps: 8,
          defaultWeight: 0,
          restSeconds: 90,
          iconKey: 'pullup'
        },
        {
          name: 'Rowing barre buste penché',
          category: 'Dos',
          targetMuscle: 'Épaisseur du dos & Trapèzes',
          description: 'Buste incliné à 45°, tirez la barre vers le nombril en serrant puissamment les omoplates.',
          tips: 'Dos rigoureusement droit et genoux déverrouillés.',
          defaultSets: 4,
          defaultReps: 10,
          defaultWeight: 50,
          restSeconds: 75,
          iconKey: 'row'
        },
        {
          name: 'Tirage vertical à la poulie haute',
          category: 'Dos',
          targetMuscle: 'Grand dorsal',
          description: 'Assis sous le boudin, amenez la barre sur le haut de la poitrine en maintenant un léger cambré naturel.',
          tips: 'Expirez à la traction et retenez la montée sur 2 secondes.',
          defaultSets: 3,
          defaultReps: 12,
          defaultWeight: 55,
          restSeconds: 60,
          iconKey: 'row'
        },
        {
          name: 'Curl barre EZ debout',
          category: 'Bras',
          targetMuscle: 'Biceps brachial',
          description: 'Coudes collés aux côtes, montez la barre jusqu\'à contraction maximale du biceps.',
          tips: 'Évitez tout balancement du dos.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeight: 25,
          restSeconds: 60,
          iconKey: 'curl'
        },
        {
          name: 'Face-pull à la corde',
          category: 'Épaules',
          targetMuscle: 'Arrière des épaules et rotateurs',
          description: 'Poulie à hauteur des yeux, tirez la corde vers le front en écartant les poignets.',
          tips: 'Excellente posture pour la santé de l\'épaule.',
          defaultSets: 3,
          defaultReps: 15,
          defaultWeight: 20,
          restSeconds: 45,
          iconKey: 'shoulder_press'
        }
      ]
    };
  }

  if (muscle.includes('jambe') || muscle.includes('leg') || muscle.includes('fessier')) {
    return {
      name: `Séance Legs Puissance & Hypertrophie (${goal})`,
      description: 'Programme lourd et structuré pour quadriceps, ischio-jambiers, fessiers et mollets.',
      targetMuscles: ['Quadriceps', 'Fessiers', 'Ischio-jambiers', 'Mollets'],
      estimatedDurationMinutes: params.duration || 55,
      difficulty: params.fitnessLevel || 'Intermédiaire',
      exercises: [
        {
          name: 'Squat à la barre nuque',
          category: 'Jambes',
          targetMuscle: 'Quadriceps et fessiers',
          description: 'Barre calée sur les trapèzes, descendez les fesses vers l\'arrière jusqu\'aux cuisses parallèles au sol.',
          tips: 'Gardez les genoux alignés avec les orteils et le torse fier.',
          defaultSets: 4,
          defaultReps: 8,
          defaultWeight: 80,
          restSeconds: 100,
          iconKey: 'squat'
        },
        {
          name: 'Presse à cuisses 45°',
          category: 'Jambes',
          targetMuscle: 'Quadriceps',
          description: 'Pieds largeur d\'épaules, descendez le plateau jusqu\'à 90 degrés aux genoux sans décoller le bassin.',
          tips: 'Ne verrouillez jamais complètement les genoux en haut.',
          defaultSets: 4,
          defaultReps: 12,
          defaultWeight: 140,
          restSeconds: 75,
          iconKey: 'squat'
        },
        {
          name: 'Soulevé de terre jambes tendues',
          category: 'Jambes',
          targetMuscle: 'Ischio-jambiers et fessiers',
          description: 'Poussez les hanches en arrière en descendant la barre le long des tibias pour ressentir l\'étirement des ischios.',
          tips: 'Dos verrouillé et léger flex dans les genoux.',
          defaultSets: 3,
          defaultReps: 10,
          defaultWeight: 65,
          restSeconds: 75,
          iconKey: 'deadlift'
        },
        {
          name: 'Fentes marchées aux haltères',
          category: 'Jambes',
          targetMuscle: 'Fessiers et quadriceps',
          description: 'Avancez en posant le genou arrière à quelques centimètres du sol puis repoussez sur le talon avant.',
          tips: 'Buste droit et gainage abdominal engagé.',
          defaultSets: 3,
          defaultReps: 12,
          defaultWeight: 14,
          restSeconds: 60,
          iconKey: 'lunge'
        },
        {
          name: 'Élévations des mollets debout',
          category: 'Jambes',
          targetMuscle: 'Gastrocnémiens (mollets)',
          description: 'Montez sur la pointe des pieds à amplitude complète et marquez une pause d\'une seconde en haut.',
          tips: 'Étirez bien en bas avant chaque répétition.',
          defaultSets: 4,
          defaultReps: 15,
          defaultWeight: 50,
          restSeconds: 45,
          iconKey: 'squat'
        }
      ]
    };
  }

  // Full Body Default
  return {
    name: `Séance Full Body Athlétique (${goal})`,
    description: 'Séance complète sollicitant l\'ensemble des grandes chaînes musculaires pour un maximum d\'énergie et de stimulation.',
    targetMuscles: ['Pectoraux', 'Dos', 'Quadriceps', 'Épaules', 'Abdominaux'],
    estimatedDurationMinutes: params.duration || 45,
    difficulty: params.fitnessLevel || 'Intermédiaire',
    exercises: [
      {
        name: 'Goblet Squat aux haltères',
        category: 'Jambes',
        targetMuscle: 'Quadriceps et fessiers',
        description: 'Tenez un haltère lourd contre votre poitrine et descendez profondément entre vos genoux.',
        tips: 'Torse droit et talons solidement encrés au sol.',
        defaultSets: 4,
        defaultReps: 10,
        defaultWeight: 24,
        restSeconds: 75,
        iconKey: 'squat'
      },
      {
        name: 'Développé couché avec haltères',
        category: 'Pectoraux',
        targetMuscle: 'Grand pectoral',
        description: 'Sur banc plat, descendez les haltères avec un angle de bras à 45° puis poussez en convergeant.',
        tips: 'Contrôlez la descente sur 2 secondes complètes.',
        defaultSets: 4,
        defaultReps: 10,
        defaultWeight: 22,
        restSeconds: 75,
        iconKey: 'bench_press'
      },
      {
        name: 'Tirage horizontal à la poulie basse',
        category: 'Dos',
        targetMuscle: 'Milieu du dos et grand dorsal',
        description: 'Dos droit, tirez la poignée vers le nombril en sortant la poitrine et en serrant les omoplates.',
        tips: 'Ne donnez pas d\'élan avec le buste.',
        defaultSets: 3,
        defaultReps: 12,
        defaultWeight: 50,
        restSeconds: 60,
        iconKey: 'row'
      },
      {
        name: 'Développé épaules assis aux haltères',
        category: 'Épaules',
        targetMuscle: 'Deltoïdes',
        description: 'Assis sur un banc droit, levez les haltères au-dessus de la tête sans cambrer le bas du dos.',
        tips: 'Expirez pendant la poussée vers le haut.',
        defaultSets: 3,
        defaultReps: 10,
        defaultWeight: 16,
        restSeconds: 60,
        iconKey: 'shoulder_press'
      },
      {
        name: 'Planche gainage dynamique',
        category: 'Abdos',
        targetMuscle: 'Transverse et grand droit',
        description: 'En appui sur les avant-bras, maintenez le corps droit comme une flèche en alternant de légers tapotements de pieds.',
        tips: 'Aspirez le nombril vers la colonne vertébrale.',
        defaultSets: 3,
        defaultReps: 45,
        defaultWeight: 0,
        restSeconds: 45,
        iconKey: 'plank'
      }
    ]
  };
}
