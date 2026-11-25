// French versions of the guides in guides.ts, keyed by slug. Keep them in step with the English text
// (same steps, sections and FAQ) and update `updated` in guides.ts when any language changes substantively.
import type { GuideText } from "./guides-es";
import { FILE_LIMIT } from "./conversion-facts";
import { buyingGuide, buyingSlug } from "./filament-buying-guide";

const OPEN =
  "Ouvrez le fichier téléchargé dans votre trancheur avec Fichier → Ouvrir un projet (pas Importer, qui ne garde que les formes), vérifiez l'aperçu et tranchez.";
const open = (slicer: string) => OPEN.replace("votre trancheur", slicer);

export const GUIDES_FR: Record<string, GuideText> = {
  [buyingSlug]: buyingGuide("fr"),
  "3mf-to-stl": {
    title: "Comment convertir un 3MF en STL ou OBJ",
    meta: "Convertir un 3MF en STL ou OBJ gratuitement, dans votre navigateur | FilaShift",
    desc: "Convertissez un fichier 3MF en STL ou OBJ en quelques secondes sans l'envoyer. Les pièces restent en place, les unités sont converties en millimètres et l'OBJ garde la couleur de chaque pièce. Guide pas à pas avec des solutions aux problèmes courants.",
    intro:
      "STL et OBJ sont des formats de maillage simples que presque tous les logiciels 3D savent ouvrir. FilaShift convertit un 3MF en STL ou OBJ dans votre navigateur : le fichier n'est jamais envoyé.",
    steps: [
      "Ouvrez le convertisseur FilaShift et déposez votre fichier .3mf sur la page (ou cliquez pour le choisir).",
      "Sous le fichier, cliquez sur Exporter en STL pour un maillage de forme seule, ou sur Exporter en OBJ pour garder aussi une couleur par pièce.",
      "Enregistrez le téléchargement. Un projet à plusieurs plateaux donne un fichier par plateau dans un .zip.",
      "Ouvrez le STL ou l'OBJ dans votre trancheur ou logiciel 3D et vérifiez la taille et l'orientation.",
    ],
    cta: "Ouvrir le convertisseur",
    sections: [
      {
        h: "Ce qui est conservé et ce qui est perdu",
        list: [
          "Conservé : chaque pièce imprimable, placée exactement comme sur le plateau, en millimètres (les 3MF en pouces, centimètres ou microns sont mis à l'échelle pour vous).",
          "OBJ uniquement : un matériau par pièce, coloré selon son filament, dans un fichier .mtl associé.",
          "Perdu dans les deux cas : les couleurs peintes, les attributions de filament, les plateaux, les supports et tous les réglages d'impression. Ni le STL ni l'OBJ ne peuvent les stocker.",
          "Ignoré : les volumes modificateurs, négatifs et bloqueurs de support, qui ne servent qu'au trancheur.",
        ],
      },
      {
        h: "STL ou OBJ : lequel choisir ?",
        p: [
          "Choisissez le STL quand une autre personne ou un autre logiciel a seulement besoin de la forme : c'est le format le plus largement pris en charge. Choisissez l'OBJ si vous voulez voir quelle pièce a quelle couleur, par exemple dans Blender ou un moteur de rendu.",
          "Si vous transférez une impression vers une autre imprimante, vous ne voulez généralement ni l'un ni l'autre. Convertissez plutôt le 3MF lui-même : FilaShift garde les couleurs, la peinture, les plateaux et les réglages du créateur.",
        ],
      },
      {
        h: "Résoudre les problèmes courants",
        list: [
          "Le modèle est minuscule ou énorme : le logiciel qui l'a ouvert a supposé des pouces ou des mètres. FilaShift écrit toujours en millimètres ; choisissez mm comme unité d'importation.",
          "Trous ou faces manquantes : le maillage d'origine n'était pas fermé. La plupart des trancheurs le réparent à l'importation ; Bambu Studio et OrcaSlicer ont « Réparer le modèle » et PrusaSlicer répare automatiquement.",
          "Les pièces fusionnent en une seule : le STL n'a pas de liste de pièces. Utilisez l'OBJ, qui garde un objet nommé par pièce, ou séparez les pièces dans votre trancheur.",
          "Les couleurs disparaissent : le STL n'a pas de couleur et l'OBJ en a une par pièce. Les détails peints ne survivent que dans un 3MF.",
        ],
      },
    ],
    faq: [
      { q: "Le 3MF est-il envoyé en ligne ?", a: "Non. L'export se fait dans l'onglet de votre navigateur. Rien n'est envoyé à FilaShift ni à qui que ce soit." },
      { q: "Y a-t-il une limite de taille ?", a: FILE_LIMIT.fr },
      {
        q: "Puis-je reconvertir un STL en 3MF ?",
        a: "Oui. Choisissez un STL dans FilaShift, sélectionnez l'imprimante, convertissez le modèle et téléchargez le nouveau 3MF. Le STL ne garde que la géométrie ; vérifiez l'échelle, le matériau et les réglages d'impression dans le trancheur de destination.",
      },
    ],
  },
  "makerworld-to-flashforge": {
    title: "Convertir des fichiers 3MF MakerWorld et Bambu Studio pour Flashforge",
    meta: "Imprimer des 3MF MakerWorld sur Flashforge AD5X, AD5M et Creator 5 | FilaShift",
    desc: "Convertissez des projets 3MF MakerWorld et Bambu Studio pour la Flashforge AD5X, l'Adventurer 5M et la Creator 5 sans refaire les couleurs, les plateaux ni les réglages. Gratuit, privé et pas à pas.",
    intro:
      "Les projets MakerWorld sont enregistrés pour les imprimantes Bambu Lab. En ouvrir un sur une Flashforge fait souvent perdre les couleurs ou les réglages. FilaShift réécrit le projet avec les profils d'imprimante et de filament Flashforge et conserve tout le reste.",
    steps: [
      "Sur MakerWorld, ouvrez le modèle, choisissez le profil d'impression voulu et téléchargez-le en 3MF (pas en STL).",
      "Déposez le 3MF dans FilaShift et choisissez votre imprimante Flashforge : AD5X, Adventurer 5M / 5M Pro ou Creator 5.",
      "Vérifiez la liste des couleurs. Chaque couleur du projet est attribuée à l'un des quatre emplacements IFS (AD5X) ou à une tête d'outil (Creator 5) ; modifiez l'attribution de votre choix.",
      "Cliquez sur Convertir, téléchargez le nouveau 3MF et lisez le rapport.",
      open("OrcaSlicer ou Orca-Flashforge"),
    ],
    cta: "Convertir pour la Flashforge AD5X",
    sections: [
      {
        h: "Ce qui est conservé",
        list: [
          "Tous les plateaux, les objets et les couleurs peintes, la peinture étant renumérotée vers vos emplacements.",
          "La hauteur de couche, les parois, le remplissage, les couches supérieures et inférieures, les supports, la bordure et la couture choisis par le créateur.",
          "Les réglages machine, le G-code de début et de fin et les températures de filament Flashforge remplacent ceux de Bambu, pour que l'imprimante fonctionne correctement.",
          "La tour de purge est déplacée vers un espace libre du plateau de 220 × 220 mm quand elle ne tient plus à sa place d'origine.",
        ],
      },
      {
        h: "Imprimantes Flashforge à extrudeur unique",
        p: [
          "L'Adventurer 5M et la 5M Pro n'ont qu'un seul trajet de filament. FilaShift peut fusionner toutes les couleurs en une seule ou, quand les couleurs sont à des hauteurs différentes (panneaux, badges, porte-clés), ajouter des pauses de changement de filament pour que l'imprimante s'arrête et que vous puissiez changer.",
        ],
      },
      {
        h: "Problèmes courants",
        list: [
          "Seules les formes apparaissent : le fichier a été importé. Utilisez Fichier → Ouvrir un projet.",
          "Le modèle est plus grand que le plateau : la plupart des plateaux Bambu Lab font 256 mm et celui de l'AD5X 220 mm. Le rapport indique quand un modèle ne tient pas et de combien le réduire.",
          "OrcaSlicer refuse de trancher à cause de températures mélangées : le projet mélange des matériaux comme le PLA et le PETG sur une même buse. Utilisez un seul type de matériau ou, si vous savez que le mélange est sûr, levez la restriction de températures mixtes dans les préférences d'OrcaSlicer.",
        ],
      },
    ],
    faq: [
      { q: "Cela fonctionne-t-il dans l'autre sens, de Flashforge vers Bambu ?", a: "Oui. Déposez un projet Flashforge ou Orca-Flashforge et choisissez une imprimante Bambu Lab." },
      { q: "Ai-je besoin d'Orca-Flashforge ?", a: "Non. Le fichier converti s'ouvre dans OrcaSlicer et dans Orca-Flashforge." },
    ],
  },
  "makerworld-to-creality": {
    title: "Convertir des fichiers 3MF MakerWorld et Bambu Studio pour les imprimantes Creality",
    meta: "Imprimer des 3MF MakerWorld sur Creality K1, K2, Hi et Ender-3 V3 | FilaShift",
    desc: "Convertissez des projets 3MF Bambu Studio et MakerWorld pour les Creality K1, K2 Plus, Hi avec CFS et Ender-3 V3, en conservant couleurs, plateaux et réglages du créateur.",
    intro:
      "Les imprimantes Creality utilisent des profils de la famille OrcaSlicer (OrcaSlicer et Creality Print). FilaShift convertit les projets Bambu vers ces profils et liste chaque modification, pour que vous imprimiez des modèles MakerWorld sur une K1, une K2 ou une Ender sans repartir de zéro.",
    steps: [
      "Téléchargez le modèle MakerWorld en 3MF avec le profil d'impression voulu.",
      "Déposez-le dans FilaShift et choisissez votre imprimante Creality, par exemple K2 Plus (CFS), Hi (CFS), K1C ou Ender-3 V3.",
      "Attribuez les couleurs aux emplacements CFS ou utilisez des pauses de changement de filament sur les modèles à extrudeur unique.",
      "Convertissez, téléchargez et lisez le rapport.",
      open("OrcaSlicer"),
    ],
    cta: "Convertir pour la Creality K2 Plus",
    sections: [
      {
        h: "Ce qui est conservé",
        list: [
          "Les plateaux, les objets et les couleurs peintes.",
          "La hauteur de couche, les parois, le remplissage, les supports, la bordure, la couture et le lissage.",
          "Les limites machine, le G-code de début et de fin et les profils de filament Creality.",
          "Les profils CFS de Creality utilisent des tours de purge très larges ; quand l'une d'elles ne tient pas à côté du modèle, FilaShift la rétrécit et vous le signale.",
        ],
      },
      {
        h: "Anciens profils d'imprimante",
        p: [
          "Certains anciens profils OrcaSlicer (par exemple Anycubic Kobra Max, Flashforge Adventurer 3 et UltiMaker S5) utilisent l'extrusion absolue ou omettent la remise à zéro de l'extrudeur exigée par OrcaSlicer. FilaShift ajoute l'extrusion relative et une remise à zéro G92 E0 à chaque couche quand le projet en a besoin, et l'indique dans le rapport.",
        ],
      },
    ],
    faq: [
      {
        q: "Cela fonctionne-t-il avec Creality Print ?",
        a: "Le fichier converti est un projet OrcaSlicer. Creality Print est basé sur OrcaSlicer et l'ouvre normalement ; sinon, utilisez OrcaSlicer.",
      },
      { q: "Puis-je passer un projet Creality vers Bambu ?", a: "Oui. Déposez le projet Creality Print ou OrcaSlicer et choisissez une imprimante Bambu Lab." },
    ],
  },
  "bambu-to-snapmaker-u1": {
    title: "Convertir des projets Bambu Studio et MakerWorld pour la Snapmaker U1",
    meta: "Imprimer des 3MF MakerWorld sur la Snapmaker U1 à changeur d'outils | FilaShift",
    desc: "Transférez des projets 3MF Bambu Studio et MakerWorld vers la Snapmaker U1 à quatre têtes, avec les couleurs attribuées à chaque tête et les réglages du créateur conservés.",
    intro:
      "La Snapmaker U1 imprime jusqu'à quatre couleurs avec quatre têtes d'outil au lieu d'un AMS. FilaShift attribue chaque couleur du projet à une tête et applique les profils propres à la U1.",
    steps: [
      "Téléchargez le 3MF du projet depuis MakerWorld ou enregistrez-le depuis Bambu Studio.",
      "Déposez-le dans FilaShift ; la Snapmaker U1 est sélectionnée par défaut.",
      "Vérifiez quelle couleur va sur quelle tête.",
      "Convertissez, téléchargez et lisez le rapport.",
      open("Snapmaker Orca ou OrcaSlicer"),
    ],
    cta: "Convertir pour la Snapmaker U1",
    sections: [
      {
        h: "Pourquoi un changeur d'outils purge moins",
        p: [
          "Une imprimante à AMS purge du filament à chaque changement de couleur ; un changeur d'outils gare une tête et en prend une autre. FilaShift utilise la taille de tour de purge propre à la U1 : la tour est donc bien plus petite que sur une imprimante Bambu.",
        ],
      },
      {
        h: "Plus de quatre couleurs",
        p: [
          "Quand un projet a plus de couleurs que de têtes, FilaShift regroupe les couleurs les plus proches ou ajoute des pauses pour que vous changiez de filament à la bonne hauteur.",
        ],
      },
    ],
    faq: [{ q: "Puis-je convertir des projets U1 pour Bambu ?", a: "Oui, la conversion fonctionne dans les deux sens." }],
  },
  "prusaslicer-to-bambu": {
    title: "Ouvrir des projets 3MF PrusaSlicer et Printables dans Bambu Studio ou OrcaSlicer",
    meta: "Convertir des 3MF PrusaSlicer / Printables pour Bambu Studio et OrcaSlicer | FilaShift",
    desc: "Convertissez des projets 3MF PrusaSlicer et Printables pour les imprimantes Bambu Lab, Flashforge, Creality et d'autres, en conservant pièces, couleurs peintes, changements de couleur et principaux réglages d'impression.",
    intro:
      "PrusaSlicer enregistre ses projets différemment de Bambu Studio et d'OrcaSlicer : en ouvrir un dans l'autre fait souvent perdre les pièces, les couleurs et les réglages. FilaShift traduit d'abord le projet PrusaSlicer, puis le convertit pour votre imprimante.",
    steps: [
      "Téléchargez le 3MF depuis Printables ou enregistrez votre projet dans PrusaSlicer 2.4 ou ultérieur.",
      "Déposez-le dans FilaShift et choisissez votre imprimante : Bambu Lab, Flashforge, Creality, Snapmaker ou une autre marque.",
      "Vérifiez la liste des couleurs : chaque extrudeur PrusaSlicer devient un filament.",
      "Convertissez et lisez le rapport : il liste les réglages traduits et ceux qui ne l'ont pas été.",
      open("Bambu Studio ou OrcaSlicer"),
    ],
    cta: "Convertir pour Bambu Lab",
    sections: [
      {
        h: "Ce qui est traduit",
        list: [
          "Les objets et leurs pièces (volumes PrusaSlicer), avec leurs noms et extrudeurs.",
          "Les couleurs peintes, les supports peints et les coutures peintes.",
          "Les changements de couleur par couche, qui deviennent des pauses sur la nouvelle imprimante.",
          "La hauteur de couche, les périmètres, le remplissage, les couches supérieures et inférieures, les supports, la bordure, la couture, le lissage, la tour de purge et les températures.",
        ],
      },
      {
        h: "Ce qui n'est pas traduit",
        list: [
          "Les vitesses et les largeurs de ligne, car PrusaSlicer les stocke autrement ; les valeurs réglées de la nouvelle imprimante sont utilisées.",
          "La hauteur de couche variable, qui n'a pas d'équivalent direct ; le rapport vous avertit quand un projet l'utilisait.",
        ],
      },
    ],
    faq: [
      {
        q: "Puis-je convertir des projets Bambu pour des imprimantes Prusa ?",
        a: "Oui. Choisissez une imprimante Prusa comme la MK4S ou la Core One : le résultat est un projet OrcaSlicer avec les profils Prusa.",
      },
    ],
  },
  "flashforge-creality-to-bambu": {
    title: "Ramener des projets Flashforge, Creality et Snapmaker vers Bambu Lab",
    meta: "Convertir des projets 3MF Flashforge, Creality ou Orca pour Bambu Studio | FilaShift",
    desc: "Convertissez des projets 3MF OrcaSlicer, Orca-Flashforge, Creality Print, ElegooSlicer, Anycubic Slicer Next et Snapmaker Orca pour Bambu Studio.",
    intro:
      "La conversion fonctionne dans les deux sens. Les projets de la famille OrcaSlicer peuvent passer sur des imprimantes Bambu Lab avec les profils et les emplacements AMS propres à Bambu.",
    steps: [
      "Enregistrez le projet en 3MF dans OrcaSlicer, Orca-Flashforge, Creality Print, ElegooSlicer, Anycubic Slicer Next ou Snapmaker Orca.",
      "Déposez-le dans FilaShift et choisissez votre imprimante Bambu Lab.",
      "Attribuez chaque couleur à un emplacement AMS.",
      "Convertissez, téléchargez et lisez le rapport.",
      open("Bambu Studio"),
    ],
    cta: "Convertir pour la Bambu Lab P1S",
    sections: [
      {
        h: "Ce dont Bambu Studio a besoin",
        list: [
          "Des largeurs de ligne en millimètres plutôt qu'en pourcentages : FilaShift les convertit.",
          "Des valeurs dans les plages acceptées par Bambu Studio : celles qui en sortent sont ramenées à la limite et figurent dans le rapport.",
          "Les profils d'imprimante et de filament Bambu sous leur nom, pour que l'AMS et le plateau soient reconnus.",
        ],
      },
    ],
    faq: [
      {
        q: "Bambu Studio affichera-t-il le projet comme modifié ?",
        a: "Oui, les réglages qui diffèrent des profils Bambu apparaissent comme des modifications, et c'est normal.",
      },
    ],
  },
  "multicolor-3mf": {
    title: "Conserver couleurs, plateaux et peinture en convertissant des fichiers 3MF multicolores",
    meta: "Convertir des fichiers 3MF multicolores sans perdre les couleurs | FilaShift",
    desc: "Comment FilaShift conserve les couleurs peintes, les plateaux et les changements de couleur en transférant des projets 3MF multicolores entre imprimantes, même vers des imprimantes avec moins d'emplacements.",
    intro:
      "La plupart des problèmes de conversion sont des problèmes de couleur : les détails peints disparaissent, les couleurs tombent dans le mauvais emplacement ou un modèle à 4 couleurs arrive sur une imprimante monocolore. Voici comment chaque cas est résolu.",
    steps: [
      "Téléchargez le 3MF du projet, pas le STL : seul le 3MF contient les couleurs.",
      "Déposez-le dans FilaShift et choisissez votre imprimante.",
      "Vérifiez la liste couleur → emplacement ; si vous avez moins d'emplacements, les couleurs proches sont regroupées.",
      "Si votre imprimante a moins d'emplacements que le projet n'a de couleurs, activez les pauses de changement de filament quand elles sont proposées.",
      "Convertissez et " + OPEN.charAt(0).toLowerCase() + OPEN.slice(1),
    ],
    cta: "Ouvrir le convertisseur",
    sections: [
      {
        h: "Couleurs peintes",
        p: ["Les triangles peints stockent un numéro de filament. FilaShift réécrit ces numéros vers vos emplacements pour que la peinture garde ses couleurs."],
      },
      {
        h: "Moins d'emplacements que de couleurs",
        list: [
          "Des couleurs proches peuvent partager un emplacement : le rapport indique lesquelles.",
          "Des couleurs à des hauteurs différentes peuvent être imprimées avec des pauses : l'imprimante s'arrête, vous changez le filament et elle reprend.",
          "Quand les couleurs se mélangent sur les mêmes couches, les pauses ne servent à rien ; FilaShift explique pourquoi et garde l'attribution à la couleur la plus proche.",
        ],
      },
      {
        h: "Plateaux",
        p: ["Tous les plateaux sont conservés et recentrés sur votre plateau d'impression. Si un plateau est plus grand que le vôtre, le rapport indique de combien le réduire."],
      },
    ],
    faq: [
      {
        q: "Pourquoi ne vois-je qu'une seule couleur à l'ouverture ?",
        a: "Le fichier a été importé au lieu d'être ouvert comme projet. Utilisez Fichier → Ouvrir un projet.",
      },
    ],
  },
};
