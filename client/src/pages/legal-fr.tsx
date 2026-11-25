// French translation of the Privacy policy and Terms of use. The English version in legal.tsx controls;
// keep the sections in step with it.
import { Link } from "wouter";
import { AFFILIATES, ENTITY, Mailto, PLACE, Source } from "./legal-common";
import type { Sec } from "./legal";

const FR_NOTE: Sec = {
  h: "Version française",
  body: (
    <p>
      Cette traduction vous est fournie pour votre commodité. En cas de différence entre cette version et la version anglaise, la version anglaise
      prévaut, sauf si la loi de votre pays en dispose autrement.
    </p>
  ),
};

export function PRIVACY_FR(): Sec[] {
  return [
    FR_NOTE,
    {
      h: "Demander à FilaShift : une aide privée pour les visiteurs",
      body: <p>L'assistant compare ce que vous tapez ou collez aux guides FilaShift, sur votre appareil. Si votre navigateur dispose déjà d'un modèle d'IA local compatible, vous pouvez lui demander d'expliquer un résultat. Aucune de ces deux options n'envoie votre question à FilaShift ni à un fournisseur d'IA externe. L'assistant ne peut pas lire automatiquement votre projet ni votre rapport de conversion. FilaShift ne conserve aucun historique de discussion ; fermer l'assistant efface son texte. L'envoi d'un signalement de problème est une action distincte, décrite ci-dessous.</p>,
    },
    {
      h: "Qui sommes-nous",
      body: (
        <p>
          FilaShift est exploité par {ENTITY}, une société à responsabilité limitée (LLC) du Wisconsin et filiale de Jackson Consolidated Group of
          Companies LLC, {PLACE}. Nous sommes responsables des quelques données personnelles décrites ci-dessous (au sens du droit européen et
          britannique, nous sommes le « responsable du traitement »). Contact : <Mailto />.
        </p>
      ),
    },
    {
      h: "Vos fichiers 3MF restent sur votre appareil",
      body: (
        <p>
          <strong>La conversion se fait entièrement dans votre navigateur.</strong> Vos fichiers de projet sont lus, convertis et enregistrés sur
          votre propre ordinateur ou téléphone. Ils ne sont jamais envoyés à FilaShift ni à qui que ce soit, et nous ne pouvons pas les voir.
        </p>
      ),
    },
    {
      h: "Ce que le site charge et enregistre",
      body: (
        <>
          <p>
            Votre navigateur télécharge l'application, les profils, les polices et les prix uniquement depuis filashift.com. Nous n'utilisons aucun
            outil d'analyse, aucune publicité, aucun pixel de suivi ni aucun cookie tiers. Lorsque vous ouvrez, rechargez ou affichez une page, une
            requête vide incrémente un compteur quotidien pour l'ensemble du site. Il n'enregistre que la date UTC et le nombre total de vues, pas les
            adresses IP, les adresses des pages, les sites référents, les identifiants de visiteur ni les informations de projet. Il ne compte pas les
            personnes uniques. Nous ne comptons pas la visite lorsque Do Not Track ou Global Privacy Control est activé.
          </p>
          <p>
            Pour que FilaShift se charge rapidement et fonctionne hors ligne, votre navigateur garde une copie des fichiers propres à l'application
            (code, profils, icônes et listes de prix) dans son cache d'application intégré, à l'aide d'un « service worker ». Ce cache ne contient que
            les fichiers de FilaShift, jamais vos projets, et rien sur vous. Il ne contient aucun identifiant et ne sert pas à vous reconnaître. Vous
            pouvez le supprimer à tout moment en effaçant les données du site filashift.com dans les réglages de votre navigateur, ou en désinstallant
            l'application si vous l'avez installée. Vos choix de langue et de thème sont mémorisés dans le stockage local de votre navigateur et ne
            nous sont jamais envoyés. Si vous utilisez « Suivre cette recherche » sur la page des prix du filament, les filtres de la recherche, le prix
            au kg le plus bas à ce moment-là et la date d'enregistrement y sont aussi conservés, uniquement sur cet appareil, pour que la page puisse vous
            signaler une baisse de prix. La vérification utilise la même liste publique de prix que tout le monde télécharge ; rien sur vos recherches
            suivies ne nous est envoyé. Supprimez-les avec « Retirer » ou « Tout effacer » sur cette page, ou en effaçant les données du site.
          </p>
        </>
      ),
    },
    {
      h: "Journaux du serveur",
      body: (
        <p>
          Notre serveur web est configuré pour ne pas conserver de journaux d'accès des visiteurs. Comme pour tout site web, votre adresse internet
          (IP) est visible par le serveur pendant qu'il fournit une page. Les journaux système du serveur peuvent enregistrer brièvement des erreurs
          techniques pour que nous puissions maintenir le site en service. Ils ne servent pas à identifier ni à suivre les visiteurs et sont supprimés
          automatiquement sous 30 jours.
        </p>
      ),
    },
    {
      h: "Signalements de problèmes",
      body: (
        <>
          <p>Si vous envoyez un signalement via « Signaler un problème », nous recevons :</p>
          <ul>
            <li>ce que vous saisissez</li>
            <li>le lien facultatif vers le modèle</li>
            <li>votre adresse e-mail, si vous en indiquez une</li>
            <li>la page sur laquelle vous étiez</li>
            <li>l'heure d'envoi</li>
            <li>
              uniquement si vous laissez cochée la case « Inclure les détails de la conversion », un bref résumé de la conversion : nom du fichier,
              imprimantes d'origine et de destination, nombre de plateaux et de filaments, avertissements et la chaîne user-agent de votre navigateur
              (navigateur, version et système d'exploitation)
            </li>
          </ul>
          <p>
            Si vous utilisez « Demander une imprimante », nous recevons uniquement la marque et le modèle d'imprimante que vous saisissez, le
            trancheur et la note facultatifs, la page sur laquelle vous étiez et l'heure d'envoi. Ce formulaire n'a pas de champ e-mail. Nous
            utilisons ces demandes uniquement pour décider quelles imprimantes ajouter ; pour le reste, elles sont stockées, traitées et supprimées
            comme les signalements de problèmes, décrits ci-dessous.
          </p>
          <p>
            Nous ne recevons jamais le fichier lui-même. Pour lutter contre le spam, le serveur garde brièvement votre adresse IP en mémoire afin de
            limiter le nombre de signalements envoyés. Elle n'est pas enregistrée avec votre signalement.
          </p>
          <p>
            Nous utilisons les signalements uniquement pour étudier et corriger les problèmes et, si vous avez indiqué une adresse e-mail, pour vous
            répondre. Nous ne vous inscrivons à aucune liste de diffusion et nous ne vendons ni ne partageons les signalements à des fins marketing.
            Les signalements sont stockés sur notre serveur aux États-Unis (hébergé par DigitalOcean) et lus par notre équipe. Pour nous aider à trier
            et résumer les signalements, nous utilisons aussi un service d'assistant IA (Perplexity) qui traite leur contenu pour notre compte selon
            ses conditions professionnelles. Il ne les utilise pas pour entraîner ses modèles. Les signalements sont supprimés automatiquement au bout
            de 12 mois, ou plus tôt si vous le demandez.
          </p>
          <p>
            L'envoi d'un signalement est entièrement facultatif. Si vous ne souhaitez pas utiliser le formulaire, vous pouvez nous écrire par e-mail.
            Merci de ne pas inclure d'informations personnelles sensibles dans un signalement.
          </p>
        </>
      ),
    },
    {
      h: "E-mail",
      body: (
        <p>
          Si vous écrivez à <Mailto />, nous utilisons votre message et votre adresse uniquement pour vous répondre. Nous conservons l'échange aussi
          longtemps que nécessaire pour vous aider, et au plus 12 mois après sa fin, sauf obligation légale contraire.
        </p>
      ),
    },
    {
      h: "Liens vers les boutiques et liens d'affiliation",
      body: (
        <p>
          Les prix du filament proviennent des fiches produits publiques des boutiques des marques, que nous collectons sur notre propre serveur.
          Lorsque vous cliquez sur un lien vers une boutique ou vers Amazon, vous quittez FilaShift et la politique de confidentialité de cette
          boutique s'applique. Certains liens sont des liens d'affiliation ({AFFILIATES}). Après un clic, la boutique ou son réseau d'affiliation
          peut déposer son propre cookie afin de verser une commission à FilaShift si vous achetez, sans surcoût pour vous. FilaShift ne reçoit des
          boutiques ni votre nom, ni votre commande, ni vos données de paiement. Les offres sont classées par prix, et non selon que nous touchons
          une commission ou non. En tant que Partenaire Amazon, FilaShift est rémunéré pour les achats éligibles.
        </p>
      ),
    },
    {
      h: "Do Not Track",
      body: (
        <p>
          FilaShift ne suit pas les visiteurs dans le temps ni d'un site à l'autre. Nous ne faisons pas non plus le comptage quotidien anonyme
          lorsque votre navigateur signale Do Not Track ou Global Privacy Control. Les boutiques que vous visitez via nos liens appliquent leurs
          propres politiques.
        </p>
      ),
    },
    {
      h: "Page Créateurs",
      body: (
        <p>
          Les créateurs peuvent demander à figurer sur notre page <Link href="/creators">Créateurs</Link>. Nous publions uniquement le nom et le
          lien de profil que le créateur nous donne, avec son autorisation, et nous les retirons sur demande.
        </p>
      ),
    },
    {
      h: "Vos choix et vos droits",
      body: (
        <>
          <p>
            Vous pouvez nous demander de vous montrer, de corriger ou de supprimer tout signalement ou e-mail que vous nous avez envoyé. Écrivez
            simplement à <Mailto /> en indiquant à peu près quand vous l'avez envoyé. Nous répondons sous 30 jours. Si vous vous trouvez dans
            l'Espace économique européen ou au Royaume-Uni, vous avez aussi le droit :
          </p>
          <ul>
            <li>de vous opposer à l'utilisation de vos informations ou d'en demander la limitation</li>
            <li>d'en recevoir une copie dans un format portable</li>
            <li>
              d'introduire une réclamation auprès de votre autorité locale de protection des données (en France, la CNIL ; au Royaume-Uni,
              l'Information Commissioner's Office)
            </li>
          </ul>
          <p>
            Notre base juridique pour le traitement des signalements et des e-mails est notre intérêt légitime à corriger les problèmes de FilaShift
            et à répondre aux personnes qui nous contactent. Pour la page Créateurs, il s'agit du consentement du créateur. Nous ne prenons aucune
            décision automatisée vous concernant. Nous ne vendons ni ne « partageons » d'informations personnelles au sens des lois sur la vie privée
            des États américains.
          </p>
        </>
      ),
    },
    {
      h: "Sécurité",
      body: (
        <p>
          Le site utilise HTTPS. Les signalements sont conservés sur un serveur auquel seule notre équipe a accès. Aucun système n'est parfaitement
          sûr : merci de ne rien mettre de sensible dans vos signalements.
        </p>
      ),
    },
    {
      h: "Enfants",
      body: (
        <p>
          FilaShift est un outil destiné à tous les publics et ne s'adresse pas aux enfants de moins de 13 ans. Les enfants de moins de 13 ans ne
          doivent pas envoyer de signalements ni d'e-mails contenant des informations personnelles. Si vous êtes parent et pensez que votre enfant
          nous a envoyé des informations, écrivez-nous et nous les supprimerons.
        </p>
      ),
    },
    {
      h: "Modifications de cette politique",
      body: (
        <p>
          Si nous modifions cette politique, nous mettrons à jour la date en haut de cette page. Si une modification est importante, par exemple si
          nous commençons à collecter de nouvelles informations, nous afficherons aussi un avis sur la page d'accueil de FilaShift au moins 30 jours
          avant son entrée en vigueur. Les modifications ne s'appliquent qu'aux informations collectées après leur entrée en vigueur, sauf accord
          contraire de votre part.
        </p>
      ),
    },
    {
      h: "Contact",
      body: (
        <p>
          Questions sur la confidentialité, ou demande de consultation ou de suppression d'un signalement : <Mailto />, ou par courrier à {ENTITY},{" "}
          {PLACE}.
        </p>
      ),
    },
  ];
}

export function TERMS_FR(): Sec[] {
  return [
    FR_NOTE,
    {
      h: "À propos de ces conditions",
      body: (
        <p>
          FilaShift (filashift.com) est un outil gratuit proposé par {ENTITY} (« nous »), filiale de Jackson Consolidated Group of Companies LLC.
          Ces conditions régissent votre utilisation du site filashift.com. En utilisant le site, vous les acceptez. Si vous ne les acceptez pas,
          merci de ne pas utiliser le site. Notre page <Link href="/privacy">Confidentialité</Link> explique comment nous traitons les informations.
        </p>
      ),
    },
    {
      h: "Vérifiez avant d'imprimer",
      body: (
        <p>
          Les projets convertis sont fournis au mieux de nos possibilités. Les imprimantes, les versions de trancheur et les filaments varient, donc{" "}
          <strong>
            ouvrez toujours le projet converti dans votre trancheur et vérifiez l'aperçu, les températures, les vitesses et les supports avant
            d'imprimer.
          </strong>{" "}
          Un badge « Testé en trancheur » signifie qu'un projet d'exemple converti pour cette imprimante a été tranché sans erreur dans la
          version de trancheur indiquée ; ce n'est pas une garantie pour votre fichier. Vous êtes responsable de ce que vous imprimez et de
          l'utilisation sûre de votre imprimante, conformément aux instructions de son fabricant. Ne laissez jamais une imprimante fonctionner sans
          surveillance si son fabricant le déconseille.
        </p>
      ),
    },
    {
      h: "Vos fichiers et les droits des créateurs",
      body: (
        <p>
          Ne convertissez que des fichiers que vous avez le droit d'utiliser. Convertir un modèle ne change pas sa licence. Respectez les conditions
          du créateur, y compris les éventuelles restrictions d'usage non commercial ou d'interdiction de remix, et citez le créateur lorsque vous
          partagez le modèle.
        </p>
      ),
    },
    {
      h: "Utilisation loyale du site",
      body: (
        <>
          <p>Merci de ne pas utiliser FilaShift de manière abusive. Cela exclut notamment de :</p>
          <ul>
            <li>perturber ou surcharger le site</li>
            <li>tenter de contourner les limites de débit</li>
            <li>envoyer du spam ou des contenus illicites via « Signaler un problème »</li>
            <li>utiliser le site pour enfreindre la loi ou les droits d'autrui</li>
          </ul>
          <p>Nous pouvons bloquer les accès qui nuisent au site ou aux autres utilisateurs.</p>
        </>
      ),
    },
    {
      h: "Prix, boutiques et liens d'affiliation",
      body: (
        <>
          <p>
            Les prix du filament, les stocks et les remises sont collectés environ quatre fois par jour à partir des fiches publiques des boutiques.
            Ils peuvent être obsolètes ou erronés et n'incluent ni la livraison ni les taxes. Seul le prix affiché au paiement par la boutique fait
            foi. FilaShift ne vend rien. Votre achat se fait entre vous et la boutique, dont les conditions s'appliquent.
          </p>
          <p>
            Certains liens et codes de réduction sont des liens ou codes d'affiliation : si vous achetez après en avoir utilisé un, FilaShift peut
            percevoir une commission, sans surcoût pour vous. Les offres sont classées par prix, et non par commission. En tant que Partenaire Amazon,
            FilaShift est rémunéré pour les achats éligibles.
          </p>
        </>
      ),
    },
    {
      h: "Logiciel libre",
      body: (
        <p>
          Le logiciel FilaShift est un logiciel libre distribué sous la licence publique générale GNU Affero version 3 (AGPL-3.0). Vous pouvez
          obtenir le code source complet <Source lang="fr" />. Les profils d'imprimante et de filament sont dérivés d'OrcaSlicer et de Bambu Studio,
          également sous AGPL-3.0. Rien dans ces conditions ne limite les droits que l'AGPL vous accorde pour utiliser, étudier, modifier et partager
          le logiciel. Ces conditions ne couvrent que le site web que nous exploitons.
        </p>
      ),
    },
    {
      h: "Marques",
      body: (
        <p>
          Bambu Lab, MakerWorld, Printables, PrusaSlicer, Snapmaker, Flashforge, Creality, Prusa, Elegoo, Anycubic, Qidi, Amazon et les autres noms
          de produits et de boutiques sont des marques de leurs propriétaires. Nous les utilisons uniquement pour décrire la compatibilité et les
          lieux de vente des produits. FilaShift n'est ni affilié à ces sociétés ni soutenu par elles, sauf en tant qu'affilié des boutiques citées
          sur notre page Confidentialité. Le nom FilaShift et l'emblème JTS appartiennent à {ENTITY}.
        </p>
      ),
    },
    {
      h: "Réclamations relatives aux droits d'auteur",
      body: (
        <>
          <p>
            Si vous pensez qu'un élément de FilaShift, par exemple un lien de notre page Créateurs, porte atteinte à vos droits d'auteur, envoyez une
            notification à notre agent désigné :
          </p>
          <ul>
            <li>
              Copyright Agent, {ENTITY}, {PLACE}
            </li>
            <li>
              <Mailto /> (objet : « Copyright notice »)
            </li>
          </ul>
          <p>Indiquez :</p>
          <ul>
            <li>l'œuvre que vous estimez contrefaite</li>
            <li>l'emplacement du contenu sur notre site</li>
            <li>vos coordonnées</li>
            <li>une déclaration selon laquelle vous estimez de bonne foi que l'utilisation n'est pas autorisée</li>
            <li>
              une déclaration, sous peine de parjure (penalty of perjury), attestant que votre notification est exacte et que vous êtes le titulaire
              des droits ou êtes autorisé à agir en son nom
            </li>
            <li>votre signature physique ou électronique</li>
          </ul>
          <p>Nous retirerons le contenu visé par une notification valide. Nous pouvons aussi exclure les contrefacteurs récidivistes.</p>
        </>
      ),
    },
    {
      h: "Absence de garantie",
      body: (
        <p>
          FILASHIFT EST FOURNI GRATUITEMENT, « EN L'ÉTAT » ET « SELON DISPONIBILITÉ ». DANS TOUTE LA MESURE PERMISE PAR LA LOI, NOUS N'OFFRONS
          AUCUNE GARANTIE D'AUCUNE SORTE, EXPRESSE OU IMPLICITE, Y COMPRIS TOUTE GARANTIE IMPLICITE DE QUALITÉ MARCHANDE, D'ADÉQUATION À UN USAGE
          PARTICULIER, D'EXACTITUDE OU D'ABSENCE DE CONTREFAÇON. Nous ne promettons pas que le site sera toujours disponible ou exempt d'erreurs, ni
          que les conversions ou les prix seront exacts.
        </p>
      ),
    },
    {
      h: "Limitation de notre responsabilité",
      body: (
        <>
          <p>
            DANS TOUTE LA MESURE PERMISE PAR LA LOI, NOUS NE SOMMES PAS RESPONSABLES DES IMPRESSIONS RATÉES, DES IMPRIMANTES OU AUTRES ÉQUIPEMENTS
            ENDOMMAGÉS, DU MATÉRIAU OU DU TEMPS PERDU, DES DONNÉES PERDUES, NI D'AUCUN DOMMAGE INDIRECT, ACCESSOIRE, SPÉCIAL OU CONSÉCUTIF RÉSULTANT
            DE VOTRE UTILISATION DU SITE OU DES BOUTIQUES VERS LESQUELLES NOUS RENVOYONS. Si notre responsabilité est néanmoins engagée, elle est
            limitée au total à 50 dollars américains.
          </p>
          <p>
            Certains États et pays n'autorisent pas l'exclusion ou la limitation de certaines garanties ou de certains dommages ; une partie de ce qui
            précède peut donc ne pas s'appliquer à vous. Rien dans ces conditions ne limite la responsabilité en cas de décès ou de dommage corporel
            causé par une négligence, en cas de fraude, ni pour tout ce qui ne peut être limité par la loi. Si vous êtes un consommateur, rien ici ne
            vous prive des droits que vous confère le droit de la consommation de votre lieu de résidence.
          </p>
        </>
      ),
    },
    {
      h: "Modifications, droit applicable et litiges",
      body: (
        <>
          <p>
            Nous pouvons mettre à jour ces conditions. La date ci-dessus indique la dernière version, et les modifications importantes seront aussi
            annoncées sur la page d'accueil pendant au moins 30 jours. Si vous continuez à utiliser le site après l'entrée en vigueur d'une
            modification, les nouvelles conditions s'appliquent.
          </p>
          <p>
            Ces conditions sont régies par le droit de l'État du Wisconsin, États-Unis, sans égard aux règles de conflit de lois. Tout litige sera
            porté devant les tribunaux d'État ou fédéraux du comté de Waukesha, Wisconsin. Toutefois, si vous êtes un consommateur résidant hors des
            États-Unis, vous conservez la protection des lois impératives de votre pays et pouvez saisir les tribunaux de votre lieu de résidence.
            Contactez-nous d'abord : la plupart des problèmes se règlent par e-mail.
          </p>
          <p>
            Si une partie de ces conditions est inapplicable, le reste demeure en vigueur. Le fait que nous n'appliquions pas immédiatement une
            disposition ne vaut pas renonciation.
          </p>
        </>
      ),
    },
    {
      h: "Contact",
      body: (
        <p>
          Questions sur ces conditions : <Mailto />.
        </p>
      ),
    },
  ];
}
