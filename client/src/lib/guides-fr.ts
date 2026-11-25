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
  "creality-print-to-bambu": {
    title: "Convertir un projet Creality Print pour Bambu Lab",
    meta: "Convertir des 3MF Creality Print, ElegooSlicer et Anycubic Slicer Next pour Bambu Studio | FilaShift",
    desc: "Transférez un projet 3MF Creality Print (ainsi que des projets ElegooSlicer ou Anycubic Slicer Next) vers une imprimante Bambu Lab : couleurs attribuées aux emplacements AMS, profils Bambu appliqués et réglages propres au trancheur d'origine supprimés. Avec les limites des filaments mélangés de Creality Print et des plateaux spéciaux.",
    intro:
      "Creality Print, ElegooSlicer et Anycubic Slicer Next reposent tous sur le même code qu'OrcaSlicer et Bambu Studio : leurs projets 3MF peuvent donc passer sur une imprimante Bambu Lab. FilaShift reconnaît lequel de ces trancheurs a enregistré le fichier, conserve le modèle, la peinture et les réglages du créateur, et applique les profils d'imprimante, de traitement et de filament propres à Bambu Lab.",
    steps: [
      "Dans Creality Print, ElegooSlicer ou Anycubic Slicer Next, enregistrez le projet avec Fichier → Enregistrer le projet sous (un projet .3mf, pas un STL exporté ni du G-code).",
      "Déposez le 3MF dans FilaShift et choisissez votre imprimante Bambu Lab. La fiche du fichier indique quel trancheur a enregistré le projet.",
      "Attribuez chaque couleur à un emplacement AMS. Si vous avez moins d'emplacements que le projet n'a de couleurs, les couleurs proches partagent un emplacement.",
      "Convertissez, téléchargez et lisez le rapport, en particulier les lignes sur les plateaux et les filaments mélangés.",
      open("Bambu Studio"),
    ],
    cta: "Convertir pour la Bambu Lab X1 Carbon",
    sections: [
      {
        h: "Ce qui est conservé",
        list: [
          "Tous les plateaux, objets et pièces, avec les couleurs peintes, les supports peints et les coutures.",
          "La hauteur de couche, les parois, le remplissage, les supports, la bordure, la couture et le lissage du créateur, traduits avec les noms et les unités de Bambu Studio (par exemple, les largeurs de ligne en pourcentage deviennent des millimètres).",
          "Les types et couleurs de filament, associés aux profils de filament propres à Bambu Lab pour que l'AMS les reconnaisse.",
        ],
      },
      {
        h: "Ce qui est supprimé ou modifié",
        list: [
          "Les réglages que seul le trancheur d'origine comprend ne sont pas copiés : les clés de purge CFS et de méthode multicolore de Creality, support_mms d'Elegoo, ainsi que les réglages d'emplacements ACE et les variantes en acier trempé d'Anycubic. Les réglages normaux contiennent déjà les valeurs que vous avez choisies.",
          "Le fichier ne se présente plus comme provenant de Creality Print, d'ElegooSlicer ou d'Anycubic Slicer Next : il reçoit un en-tête Bambu Studio propre et le creality.config de Creality est supprimé.",
          "La tour de purge utilise la largeur par défaut de l'imprimante Bambu (certains profils CFS utilisent des tours bien plus larges), et les valeurs hors des plages autorisées par Bambu Studio sont ramenées à la limite et figurent dans le rapport.",
          "Les fichiers convertis s'ouvrent dans Bambu Studio 2.9.1 ou ultérieur.",
        ],
      },
      {
        h: "Limites à vérifier",
        list: [
          "Les filaments mélangés de Creality Print 7 (mélanges de couleurs) n'existent que dans Creality Print. Aucun autre trancheur ne peut les imprimer : les pièces ou la peinture qui utilisent un mélange s'impriment donc avec l'emplacement 1. Le rapport vous avertit ; réattribuez ces pièces dans Bambu Studio.",
          "Les plateaux propres à Creality, comme Epoxy Resin ou Customized, n'ont pas d'équivalent chez Bambu. Le plateau de l'imprimante Bambu est utilisé et le rapport l'indique ; vérifiez la température du plateau avant d'imprimer.",
        ],
      },
    ],
    faq: [
      {
        q: "Cela fonctionne-t-il aussi pour ElegooSlicer et Anycubic Slicer Next ?",
        a: "Oui. FilaShift reconnaît les projets ElegooSlicer et Anycubic Slicer Next, même quand Anycubic Slicer Next présente le fichier comme provenant de Bambu Studio, et les convertit de la même manière.",
      },
      {
        q: "Comment cela a-t-il été testé ?",
        a: "Les projets de test ElegooSlicer et Anycubic Slicer Next ont été exportés avec leurs propres outils en ligne de commande. Les projets de test Creality Print sont construits à partir des profils et de la structure de fichier de Creality Print, car son outil en ligne de commande ne peut pas enregistrer de projets. Les fichiers convertis ont été tranchés sans erreur dans les outils en ligne de commande des trancheurs de destination.",
      },
      {
        q: "Puis-je revenir de Bambu Lab vers une imprimante Creality ?",
        a: "Oui. La conversion fonctionne dans les deux sens : déposez un projet Bambu Studio et choisissez votre imprimante Creality.",
      },
    ],
  },
  "bambu-to-prusaslicer-mmu3-xl": {
    title: "De Bambu Studio à PrusaSlicer pour MMU3 et XL (projets PrusaSlicer natifs)",
    meta: "Convertir des 3MF Bambu Studio et MakerWorld pour PrusaSlicer avec MMU3 et Prusa XL | FilaShift",
    desc: "Transformez un 3MF Bambu Studio ou MakerWorld en projet PrusaSlicer 2.9 natif pour la Prusa MK4S MMU3, la CORE One MMU3 ou la XL : profils système PrusaSlicer, couleurs peintes, changements de couleur et plateaux convertis en plateaux PrusaSlicer. Explique ce que changent les profils PrusaSlicer.",
    intro:
      "Pour les imprimantes Prusa, FilaShift peut écrire un véritable projet PrusaSlicer au lieu d'un fichier OrcaSlicer. Il utilise les profils système propres à PrusaSlicer pour votre imprimante, que PrusaSlicer affiche donc comme profils système, et reprend les pièces, la peinture et les changements de couleur dans le format propre à PrusaSlicer.",
    steps: [
      "Téléchargez le 3MF depuis MakerWorld ou enregistrez votre projet dans Bambu Studio.",
      "Déposez-le dans FilaShift et choisissez votre imprimante Prusa, par exemple la MK4S MMU3, la CORE One MMU3, la XL 2T ou la XL 5T.",
      "Dans le panneau des réglages, laissez Sortie pour : PrusaSlicer (l'option par défaut pour les imprimantes Prusa). Les imprimantes qui n'existent que dans PrusaSlicer, comme la MK4S MMU3 et la XL 2T, reçoivent toujours un projet PrusaSlicer.",
      "Attribuez chaque couleur à un emplacement MMU3 ou à un outil de la XL, puis convertissez et lisez le rapport.",
      open("PrusaSlicer 2.9 ou ultérieur"),
    ],
    cta: "Convertir pour la Prusa MK4S MMU3",
    sections: [
      {
        h: "Ce que contient le projet PrusaSlicer",
        list: [
          "Les profils système d'imprimante, d'impression et de filament de PrusaSlicer pour votre imprimante ; le profil d'impression retenu est celui dont la hauteur de couche est la plus proche de celle du projet.",
          "Les objets avec leurs pièces, noms, extrudeurs, modificateurs et réglages par objet.",
          "Les couleurs peintes, les supports peints et les coutures peintes dans le format propre à PrusaSlicer.",
          "Les changements de couleur et les pauses sous forme de changements par couche PrusaSlicer (M600), et chaque plateau comme un plateau PrusaSlicer distinct.",
        ],
      },
      {
        h: "Les profils PrusaSlicer fixent températures et vitesses",
        p: [
          "PrusaSlicer stocke ses réglages autrement que Bambu Studio : les températures et les vitesses proviennent donc des profils PrusaSlicer pour votre imprimante et votre filament, et non du projet d'origine. Les choix du créateur qui peuvent être repris, comme les parois, le remplissage et les supports, sont appliqués par-dessus les profils et listés dans le rapport.",
          "Les réglages par objet sans équivalent dans PrusaSlicer gardent les valeurs du profil (le rapport les liste). La hauteur de couche variable et les modificateurs par plage de hauteur ne sont pas repris.",
        ],
      },
      {
        h: "Différences entre MMU3 et XL",
        list: [
          "Les imprimantes à MMU3 ont une seule buse et ont besoin d'une tour de purge. FilaShift vérifie la place disponible pour la tour de PrusaSlicer, plus large, et la déplace vers un endroit libre ; s'il n'y en a pas, le rapport vous demande de mettre le modèle à l'échelle ou de le réorganiser.",
          "Sur le MMU3, un changement de couleur pour un filament qui n'imprime pas à cette hauteur devient une pause (M601). C'est ainsi que PrusaSlicer le gère.",
          "La XL change de tête d'outil au lieu de charger du filament : chaque couleur va donc à un outil. Quand il y a plus de couleurs que d'outils, les couleurs les plus proches partagent un outil.",
          "Si un modèle est plus grand que le plateau, le convertisseur avertit et propose une échelle. Mettez-le à l'échelle ou découpez-le dans PrusaSlicer avant de trancher.",
        ],
      },
    ],
    faq: [
      {
        q: "Puis-je quand même obtenir un fichier OrcaSlicer pour ma Prusa ?",
        a: "Oui, pour les imprimantes Prusa prises en charge par OrcaSlicer : choisissez Sortie pour : OrcaSlicer dans le panneau des réglages. Les imprimantes qui n'existent que dans PrusaSlicer, comme la MK4S MMU3, la MK3S MMU3 et la XL 2T, reçoivent toujours un projet PrusaSlicer.",
      },
      {
        q: "Pourquoi les températures diffèrent-elles du projet Bambu ?",
        a: "La sortie PrusaSlicer utilise les profils de filament propres à PrusaSlicer, qui fixent les températures pour votre imprimante et votre matériau. Vérifiez-les dans PrusaSlicer si vous avez besoin des valeurs du créateur.",
      },
      {
        q: "Comment cela a-t-il été testé ?",
        a: "Des projets d'exemple, dont deux projets MakerWorld peints, ont été convertis pour chaque imprimante Prusa et chaque variante de buse, puis tranchés avec l'outil en ligne de commande de PrusaSlicer. Les seuls échecs concernaient un modèle MakerWorld plus grand que le plateau de la CORE One MMU3, que le convertisseur signale avec une échelle suggérée.",
      },
    ],
  },
  "bambu-h3c-p3c-multicolour": {
    title: "Multicolore sur les changeurs d'outils Bambu Lab H3C et P3C (PrintTools, outil TPU)",
    meta: "Convertir des 3MF multicolores pour les PrintTools des Bambu Lab H3C et P3C | FilaShift",
    desc: "Comment FilaShift attribue chaque couleur d'un projet 3MF à un PrintTool sur les changeurs d'outils Bambu Lab H3C et P3C, garde le filament rigide à l'écart de l'outil TPU 2,85 mm de la H3C et partage l'AMS quand vous avez plus de couleurs que d'outils.",
    intro:
      "Les Bambu Lab H3C et P3C changent de PrintTool complet au lieu de faire passer toutes les couleurs par une seule buse. Quand vous convertissez un projet pour elles, FilaShift écrit un outil pour chaque filament dans le fichier, afin que Bambu Studio conserve cette attribution au lieu de la deviner.",
    steps: [
      "Téléchargez le 3MF du projet depuis MakerWorld ou enregistrez-le dans Bambu Studio, OrcaSlicer ou un autre trancheur pris en charge.",
      "Déposez-le dans FilaShift et choisissez la Bambu Lab H3C ou P3C.",
      "Attribuez chaque couleur à un emplacement, puis convertissez.",
      "Lisez le rapport : il indique quel filament va sur quel PrintTool et quel outil vous devez éventuellement installer.",
      open("Bambu Studio 2.9.1 ou ultérieur"),
    ],
    cta: "Convertir pour la Bambu Lab H3C",
    sections: [
      {
        h: "Comment les filaments sont attribués aux PrintTools",
        list: [
          "Chaque couleur utilisée par le modèle reçoit son propre PrintTool, et le fichier est réglé sur Nozzle Manual pour que Bambu Studio conserve l'attribution. Le rapport la liste, par exemple filament 1 → PrintTool 1.",
          "La H3C d'origine compte 9 PrintTools : huit pour du filament 1,75 mm et un, le PrintTool 8, pour du TPU 2,85 mm. La P3C d'origine compte 5 PrintTools dans 7 docks.",
          "Quand un projet provient du même modèle d'imprimante, chaque filament garde si possible l'outil qu'il y utilisait.",
          "Quand tous les outils installés sont utilisés, FilaShift vous demande, avec un avertissement, d'installer un autre outil dans un dock libre (P3C) ; au-delà, les couleurs supplémentaires partagent le PrintTool 1 via l'AMS. Le rapport indique lesquelles.",
        ],
      },
      {
        h: "L'outil TPU 2,85 mm de la H3C",
        list: [
          "Seul le filament flexible 2,85 mm va sur l'outil TPU, avec le profil de filament TPU 2,85 mm de l'imprimante. Le filament rigide ne lui est jamais attribué.",
          "Le filament flexible 1,75 mm (du TPU issu d'un projet AMS, par exemple) ne peut pas utiliser l'outil 2,85 mm : il s'imprime donc avec un PrintTool standard. Le rapport l'indique.",
          "Sur la P3C, un filament TPU 2,85 mm nécessite un outil TPU supplémentaire dans un dock libre. FilaShift le demande avec un avertissement : installez cet outil avant d'imprimer ou changez de filament.",
        ],
      },
      {
        h: "Limites à vérifier",
        list: [
          "Les projets qui utilisaient des tailles de buse différentes selon l'outil reçoivent une taille de buse unique sur la H3C et la P3C, avec un avertissement, car lors des tests les fichiers convertis avec des tailles mélangées ne se tranchaient pas de façon fiable. Réglez la buse de chaque outil dans Bambu Studio si vous avez besoin de tailles différentes.",
          "S'il faut plus d'outils que l'imprimante d'origine n'en possède, le rapport nomme les outils à installer. Vous pouvez aussi fusionner des couleurs avant de convertir.",
          "La H2C fonctionne différemment : Bambu Studio attribue automatiquement son rack de hotends pour réduire la purge.",
          "Une conversion de la H3C ou de la P3C vers une imprimante à buse unique conserve les couleurs sous forme d'emplacements AMS.",
        ],
      },
    ],
    faq: [
      {
        q: "Bambu Studio va-t-il modifier mon attribution d'outils ?",
        a: "Pas sur la H3C et la P3C : le fichier utilise le mode Nozzle Manual, donc Bambu Studio conserve le PrintTool de chaque filament. Si un outil indiqué dans le fichier est absent ou ne convient pas au filament, Bambu Studio en choisit un autre.",
      },
      {
        q: "Cela a-t-il été testé ?",
        a: "Oui, de façon logicielle. Les projets d'exemple standard convertis pour la H3C et la P3C se tranchent sans erreur dans l'outil en ligne de commande de Bambu Studio (voir la page des résultats de test). Des projets de test avec un filament TPU 2,85 mm, 10 couleurs et des tailles de buse mélangées sont aussi convertis et tranchés, et l'attribution des outils est relue dans le G-code.",
      },
    ],
  },
};
