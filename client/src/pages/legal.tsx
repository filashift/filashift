// Privacy policy and Terms of use, in English (controlling) and Spanish.
// Reviewed November 2026; see legal_review.md for the open attorney items.
import type { ReactNode } from "react";
import { Link } from "wouter";
import { SOURCE_URL } from "@/components/site-chrome";
import type { Lang } from "@/lib/i18n";

export const LEGAL_UPDATED: Record<Lang, string> = { en: "November 2026", es: "noviembre de 2026" };
const EMAIL = "support@jacksoncgc.com";
const ENTITY = "Jackson Technology Solutions LLC";
const PLACE = "Waukesha, Wisconsin, USA";

export type Sec = { h: string; body: ReactNode };
const Mailto = () => <a href={`mailto:${EMAIL}`}>{EMAIL}</a>;
const Source = ({ es }: { es?: boolean }) =>
  SOURCE_URL ? (
    <a href={SOURCE_URL} target="_blank" rel="noreferrer">
      {SOURCE_URL.replace(/^https?:\/\//, "")}
    </a>
  ) : es ? (
    <>
      escribiéndonos a <Mailto /> (te enviamos una copia completa del código fuente)
    </>
  ) : (
    <>
      by emailing <Mailto /> (we will send you a complete copy of the source code)
    </>
  );

const AFFILIATES = "Amazon Associates, Overture, Sunlu (UpPromote), Flashforge (Impact, when active)";

export function privacySections(lang: Lang): Sec[] {
  if (lang === "es") return PRIVACY_ES();
  return [
    {
      h: "Who we are",
      body: (
        <p>
          FilaShift is operated by {ENTITY}, a Wisconsin limited liability company and a subsidiary of Jackson Consolidated Group of Companies LLC,{" "}
          {PLACE}. We are responsible for the small amount of personal information described below (under European and UK law we are the
          "controller"). Contact: <Mailto />.
        </p>
      ),
    },
    {
      h: "Your 3MF files stay on your device",
      body: (
        <p>
          <strong>Conversion happens entirely in your browser.</strong> Your project files are read, converted and saved on your own computer or
          phone. They are never uploaded to FilaShift or anyone else, and we can't see them.
        </p>
      ),
    },
    {
      h: "What the site loads and stores",
      body: (
        <>
          <p>
            Your browser downloads the FilaShift app, printer profiles, fonts and filament price lists from filashift.com only. We don't use
            analytics, advertising, tracking pixels, social widgets or cookies, and the site doesn't contact other companies' servers while you use
            it.
          </p>
          <p>
            So FilaShift can load quickly and work offline, your browser keeps a copy of the app's own files (code, profiles, icons and price lists)
            in its built-in app cache, using a "service worker". This cache holds only FilaShift's files, never your projects, and nothing about you.
            It contains no identifier and isn't used to recognize you. You can remove it at any time by clearing site data for filashift.com in your
            browser settings, or by uninstalling the app if you installed it. Your language choice is remembered in your browser's local storage and
            never sent to us.
          </p>
        </>
      ),
    },
    {
      h: "Server logs",
      body: (
        <p>
          Our web server is set up not to keep visitor access logs. Like any website, your internet (IP) address is visible to the server while it
          delivers a page. The server's system logs may briefly record technical errors so we can keep the site running. They are not used to
          identify or track visitors and are deleted automatically within 30 days.
        </p>
      ),
    },
    {
      h: "Problem reports",
      body: (
        <>
          <p>If you send a report through "Report a problem", we receive:</p>
          <ul>
            <li>what you type</li>
            <li>the optional model link</li>
            <li>your email address, if you give one</li>
            <li>the page you were on</li>
            <li>the time it was sent</li>
            <li>
              only if you leave the "Include conversion details" box ticked, a short summary of the conversion: file name, source and target printer,
              plate and filament counts, warnings, and your browser's user-agent string (browser, version and operating system)
            </li>
          </ul>
          <p>
            We never receive the file itself. To stop spam, the server briefly holds your IP address in memory to limit how many reports can be sent.
            It isn't saved with your report.
          </p>
          <p>
            We use reports only to investigate and fix problems and, if you gave an email address, to reply to you. We don't add you to any mailing
            list and we don't sell or share reports for marketing. Reports are stored on our server in the United States (hosted by DigitalOcean) and
            read by our staff. To help us sort and summarize reports, we also use an AI assistant service (Perplexity) that processes report contents
            on our behalf under its business terms. It doesn't use them to train its models. Reports are deleted automatically after 12 months, or
            sooner if you ask.
          </p>
          <p>
            Sending a report is entirely optional. If you don't want to use the form, you can email us instead. Please don't include sensitive
            personal information in a report.
          </p>
        </>
      ),
    },
    {
      h: "Email",
      body: (
        <p>
          If you email <Mailto />, we use your message and address only to answer you. We keep the conversation for as long as needed to help you,
          and no longer than 12 months after it ends unless the law requires otherwise.
        </p>
      ),
    },
    {
      h: "Store and affiliate links",
      body: (
        <p>
          Filament prices come from brand stores' public product listings, which we collect on our own server. When you click a store or Amazon link
          you leave FilaShift, and that store's own privacy policy applies. Some links are affiliate links ({AFFILIATES}). After you click one, the
          store or its affiliate network may set its own cookie so it can credit FilaShift with a commission if you buy, at no extra cost to you.
          FilaShift doesn't receive your name, order or payment details from stores. Offers are listed by price, not by whether we earn a
          commission. As an Amazon Associate, FilaShift earns from qualifying purchases.
        </p>
      ),
    },
    {
      h: "Do Not Track",
      body: (
        <p>
          FilaShift doesn't track visitors over time or across other websites, and doesn't let third parties do so on our pages, so there is no
          tracking for a "Do Not Track" or Global Privacy Control signal to turn off. We treat every visitor the same way whether or not the signal
          is on. Stores you visit through our links follow their own policies.
        </p>
      ),
    },
    {
      h: "Creators page",
      body: (
        <p>
          Designers can ask to be listed on our <Link href="/creators">Creators</Link> page. We publish only the name and profile link the designer
          gives us, with their permission, and remove them when asked.
        </p>
      ),
    },
    {
      h: "Your choices and rights",
      body: (
        <>
          <p>
            You can ask us to show you, correct or delete any report or email you sent us. Just email <Mailto /> and tell us roughly when you sent
            it. We reply within 30 days. If you are in the European Economic Area or the UK, you also have the right to:
          </p>
          <ul>
            <li>object to or restrict our use of your information</li>
            <li>receive a copy in a portable format</li>
            <li>complain to your local data protection authority (in the UK, the Information Commissioner's Office)</li>
          </ul>
          <p>
            Our legal basis for handling reports and emails is our legitimate interest in fixing problems with FilaShift and answering people who
            contact us. For the Creators page, it is the designer's consent. We don't make automated decisions about you. We don't sell or "share"
            personal information as those terms are used in US state privacy laws.
          </p>
        </>
      ),
    },
    {
      h: "Security",
      body: (
        <p>
          The site uses HTTPS. Reports are kept on a server that only our staff can access. No system is perfectly secure, so please keep reports
          free of anything sensitive.
        </p>
      ),
    },
    {
      h: "Children",
      body: (
        <p>
          FilaShift is a general-audience tool and isn't directed to children under 13. Children under 13 should not send reports or emails with
          personal information. If you're a parent and believe your child sent us information, email us and we'll delete it.
        </p>
      ),
    },
    {
      h: "Changes to this policy",
      body: (
        <p>
          If we change this policy, we'll update the date at the top of this page. If a change is significant, for example if we start collecting
          new information, we'll also show a notice on the FilaShift home page for at least 30 days before it takes effect. Changes apply only to
          information collected after they take effect, unless you agree otherwise.
        </p>
      ),
    },
    {
      h: "Contact",
      body: (
        <p>
          Questions about privacy, or a request to see or delete a report: <Mailto />, or by mail to {ENTITY}, {PLACE}.
        </p>
      ),
    },
  ];
}

export function termsSections(lang: Lang): Sec[] {
  if (lang === "es") return TERMS_ES();
  return [
    {
      h: "About these terms",
      body: (
        <p>
          FilaShift (filashift.com) is a free tool from {ENTITY} ("we", "us"), a subsidiary of Jackson Consolidated Group of Companies LLC. These
          terms cover your use of the filashift.com website. By using the site you agree to them. If you don't agree, please don't use the site. Our{" "}
          <Link href="/privacy">Privacy</Link> page explains how we handle information.
        </p>
      ),
    },
    {
      h: "Check before you print",
      body: (
        <p>
          Converted projects are a best effort. Printers, slicer versions and filaments differ, so{" "}
          <strong>always open the converted project in your slicer and check the preview, temperatures, speeds and supports before printing.</strong>{" "}
          A "Slicer-tested" badge means a sample project converted for that printer sliced without errors in the named slicer version; it is not a
          guarantee for your file. You're responsible for what you print and for operating your printer safely, following its manufacturer's
          instructions. Never leave a printer running unattended if its manufacturer advises against it.
        </p>
      ),
    },
    {
      h: "Your files and designers' rights",
      body: (
        <p>
          Only convert files you are allowed to use. Converting a model doesn't change its license. Follow the designer's terms, including any
          non-commercial or no-remix conditions, and credit the designer when you share it.
        </p>
      ),
    },
    {
      h: "Fair use of the site",
      body: (
        <>
          <p>Please don't misuse FilaShift. That means no:</p>
          <ul>
            <li>interfering with or overloading the site</li>
            <li>trying to get around rate limits</li>
            <li>sending spam or unlawful content through "Report a problem"</li>
            <li>using the site to break the law or infringe anyone's rights</li>
          </ul>
          <p>We may block access that harms the site or other users.</p>
        </>
      ),
    },
    {
      h: "Prices, stores and affiliate links",
      body: (
        <>
          <p>
            Filament prices, stock and discounts are collected from stores' public listings about four times a day. They may be out of date or
            wrong, and they don't include shipping or tax. The store's checkout price is the one that counts. FilaShift doesn't sell anything. Your
            purchase is between you and the store, and the store's terms apply.
          </p>
          <p>
            Some store links and discount codes are affiliate links or codes: if you buy after using one, FilaShift may earn a commission at no extra
            cost to you. Offers are sorted by price, not by commission. As an Amazon Associate, FilaShift earns from qualifying purchases.
          </p>
        </>
      ),
    },
    {
      h: "Open source",
      body: (
        <p>
          The FilaShift software is free software licensed under the GNU Affero General Public License version 3 (AGPL-3.0). You can get the complete
          source code <Source />. Printer and filament presets are derived from OrcaSlicer and Bambu Studio, also under AGPL-3.0. Nothing in these
          terms limits the rights the AGPL gives you to use, study, change and share the software. These terms only cover the website we run.
        </p>
      ),
    },
    {
      h: "Trademarks",
      body: (
        <p>
          Bambu Lab, MakerWorld, Printables, PrusaSlicer, Snapmaker, Flashforge, Creality, Prusa, Elegoo, Anycubic, Qidi, Amazon and other product and
          store names are trademarks of their owners. We use them only to describe compatibility and where products are sold. FilaShift isn't
          affiliated with or endorsed by them, except as an affiliate of the stores named on our Privacy page. The FilaShift name and the JTS emblem
          belong to {ENTITY}.
        </p>
      ),
    },
    {
      h: "Copyright complaints",
      body: (
        <>
          <p>
            If you believe something on FilaShift, such as a link on our Creators page, infringes your copyright, send a notice to our designated
            agent:
          </p>
          <ul>
            <li>
              Copyright Agent, {ENTITY}, {PLACE}
            </li>
            <li>
              <Mailto /> (subject: "Copyright notice")
            </li>
          </ul>
          <p>Include:</p>
          <ul>
            <li>the work you say is infringed</li>
            <li>where the material is on our site</li>
            <li>your contact details</li>
            <li>a statement that you believe in good faith the use isn't authorized</li>
            <li>a statement, under penalty of perjury, that your notice is accurate and that you are the owner or are authorized to act for the owner</li>
            <li>your physical or electronic signature</li>
          </ul>
          <p>We'll remove material that is the subject of a valid notice. We may also remove repeat infringers.</p>
        </>
      ),
    },
    {
      h: "No warranty",
      body: (
        <p>
          FILASHIFT IS PROVIDED FREE, "AS IS" AND "AS AVAILABLE". TO THE FULLEST EXTENT THE LAW ALLOWS, WE MAKE NO WARRANTIES OF ANY KIND, WHETHER
          EXPRESS OR IMPLIED, INCLUDING ANY IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY OR NON-INFRINGEMENT. We
          don't promise that the site will always be available or error-free, or that conversions or prices will be correct.
        </p>
      ),
    },
    {
      h: "Limits on our liability",
      body: (
        <>
          <p>
            TO THE FULLEST EXTENT THE LAW ALLOWS, WE ARE NOT LIABLE FOR FAILED PRINTS, DAMAGED PRINTERS OR OTHER EQUIPMENT, WASTED MATERIAL OR TIME,
            LOST DATA, OR ANY INDIRECT, INCIDENTAL, SPECIAL OR CONSEQUENTIAL LOSS ARISING FROM YOUR USE OF THE SITE OR OF STORES WE LINK TO. Where we
            are liable anyway, our total liability is limited to US$50.
          </p>
          <p>
            Some states and countries don't allow the exclusion or limitation of certain warranties or damages, so some of the above may not apply to
            you. Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that can't
            be limited by law. If you're a consumer, nothing here takes away rights you have under the consumer laws where you live.
          </p>
        </>
      ),
    },
    {
      h: "Changes, governing law and disputes",
      body: (
        <>
          <p>
            We may update these terms. The date above shows the latest version, and significant changes will also be announced on the home page for
            at least 30 days. If you keep using the site after a change takes effect, the new terms apply.
          </p>
          <p>
            These terms are governed by the laws of the State of Wisconsin, USA, without regard to conflict-of-law rules. Any dispute will be heard in
            the state or federal courts located in Waukesha County, Wisconsin. However, if you're a consumer living outside the USA, you keep the
            protection of the mandatory laws of your country and may bring a claim in your local courts. Please contact us first: most problems can
            be sorted out by email.
          </p>
          <p>If any part of these terms can't be enforced, the rest still applies. If we don't enforce a term right away, that isn't a waiver.</p>
        </>
      ),
    },
    {
      h: "Contact",
      body: (
        <p>
          Questions about these terms: <Mailto />.
        </p>
      ),
    },
  ];
}

const ES_NOTE: Sec = {
  h: "Versión en español",
  body: (
    <p>
      Esta traducción se ofrece para tu comodidad. Si hay alguna diferencia entre esta versión y la versión en inglés, prevalece la versión en
      inglés, salvo que la ley de tu país exija otra cosa.
    </p>
  ),
};

function PRIVACY_ES(): Sec[] {
  return [
    ES_NOTE,
    {
      h: "Quiénes somos",
      body: (
        <p>
          FilaShift está operado por {ENTITY}, una sociedad de responsabilidad limitada de Wisconsin y filial de Jackson Consolidated Group of
          Companies LLC, {PLACE}. Somos responsables de la pequeña cantidad de información personal descrita a continuación (según la legislación
          europea y del Reino Unido, somos el "responsable del tratamiento"). Contacto: <Mailto />.
        </p>
      ),
    },
    {
      h: "Tus archivos 3MF se quedan en tu dispositivo",
      body: (
        <p>
          <strong>La conversión se hace por completo en tu navegador.</strong> Tus archivos de proyecto se leen, convierten y guardan en tu propio
          ordenador o teléfono. Nunca se suben a FilaShift ni a nadie más, y no podemos verlos.
        </p>
      ),
    },
    {
      h: "Qué carga y guarda el sitio",
      body: (
        <>
          <p>
            Tu navegador descarga la aplicación FilaShift, los perfiles de impresoras, las fuentes y las listas de precios de filamento solo desde
            filashift.com. No usamos analítica, publicidad, píxeles de seguimiento, widgets sociales ni cookies, y el sitio no contacta con servidores
            de otras empresas mientras lo usas.
          </p>
          <p>
            Para que FilaShift cargue rápido y funcione sin conexión, tu navegador guarda una copia de los archivos propios de la aplicación (código,
            perfiles, iconos y listas de precios) en su caché de aplicaciones integrada, mediante un "service worker". Esta caché contiene solo los
            archivos de FilaShift, nunca tus proyectos ni nada sobre ti. No contiene ningún identificador y no se usa para reconocerte. Puedes
            eliminarla en cualquier momento borrando los datos del sitio filashift.com en la configuración del navegador, o desinstalando la
            aplicación si la instalaste. Tu elección de idioma se recuerda en el almacenamiento local del navegador y nunca se nos envía.
          </p>
        </>
      ),
    },
    {
      h: "Registros del servidor",
      body: (
        <p>
          Nuestro servidor web está configurado para no guardar registros de acceso de visitantes. Como en cualquier sitio web, tu dirección de
          internet (IP) es visible para el servidor mientras entrega una página. Los registros del sistema pueden anotar brevemente errores técnicos
          para mantener el sitio en marcha. No se usan para identificar ni seguir a los visitantes y se eliminan automáticamente en un plazo de 30
          días.
        </p>
      ),
    },
    {
      h: "Informes de problemas",
      body: (
        <>
          <p>Si envías un informe mediante "Informar de un problema", recibimos:</p>
          <ul>
            <li>lo que escribas</li>
            <li>el enlace opcional al modelo</li>
            <li>tu dirección de correo, si la das</li>
            <li>la página en la que estabas</li>
            <li>la hora de envío</li>
            <li>
              solo si dejas marcada la casilla "Incluir detalles de la conversión", un breve resumen de la conversión: nombre del archivo, impresora de
              origen y de destino, número de placas y filamentos, avisos y la cadena de agente de usuario de tu navegador (navegador, versión y sistema
              operativo)
            </li>
          </ul>
          <p>
            Nunca recibimos el archivo. Para evitar el spam, el servidor guarda brevemente tu dirección IP en memoria para limitar cuántos informes se
            pueden enviar. No se guarda con tu informe.
          </p>
          <p>
            Usamos los informes solo para investigar y corregir problemas y, si diste un correo, para responderte. No te añadimos a ninguna lista de
            correo y no vendemos ni compartimos informes con fines de marketing. Los informes se guardan en nuestro servidor en Estados Unidos
            (alojado por DigitalOcean) y los lee nuestro personal. Para ayudarnos a clasificar y resumir los informes, también usamos un servicio de
            asistente de IA (Perplexity) que procesa su contenido en nuestro nombre según sus condiciones empresariales. No los usa para entrenar sus
            modelos. Los informes se eliminan automáticamente a los 12 meses, o antes si lo pides.
          </p>
          <p>
            Enviar un informe es totalmente opcional. Si no quieres usar el formulario, puedes escribirnos por correo. No incluyas información
            personal sensible en un informe.
          </p>
        </>
      ),
    },
    {
      h: "Correo electrónico",
      body: (
        <p>
          Si escribes a <Mailto />, usamos tu mensaje y tu dirección solo para responderte. Conservamos la conversación el tiempo necesario para
          ayudarte y no más de 12 meses después de que termine, salvo que la ley exija otra cosa.
        </p>
      ),
    },
    {
      h: "Enlaces a tiendas y de afiliado",
      body: (
        <p>
          Los precios de filamento provienen de los listados públicos de productos de las tiendas de las marcas, que recopilamos en nuestro propio
          servidor. Al hacer clic en un enlace a una tienda o a Amazon sales de FilaShift y se aplica la política de privacidad de esa tienda.
          Algunos enlaces son de afiliado ({AFFILIATES}). Tras hacer clic en uno, la tienda o su red de afiliados puede instalar su propia cookie
          para atribuir a FilaShift una comisión si compras, sin coste adicional para ti. FilaShift no recibe tu nombre, pedido ni datos de pago.
          Las ofertas se ordenan por precio, no por si ganamos comisión. Como afiliado de Amazon, FilaShift obtiene ingresos por las compras
          adscritas que cumplen los requisitos aplicables.
        </p>
      ),
    },
    {
      h: "Do Not Track",
      body: (
        <p>
          FilaShift no sigue a los visitantes a lo largo del tiempo ni entre sitios web, ni permite que terceros lo hagan en nuestras páginas, así que
          no hay seguimiento que una señal "Do Not Track" o Global Privacy Control tenga que desactivar. Tratamos igual a todos los visitantes, con o
          sin la señal. Las tiendas que visites desde nuestros enlaces siguen sus propias políticas.
        </p>
      ),
    },
    {
      h: "Página de creadores",
      body: (
        <p>
          Los diseñadores pueden pedir aparecer en nuestra página de <Link href="/creators">Creadores</Link>. Publicamos solo el nombre y el enlace al
          perfil que nos da el diseñador, con su permiso, y los retiramos cuando nos lo pide.
        </p>
      ),
    },
    {
      h: "Tus opciones y derechos",
      body: (
        <>
          <p>
            Puedes pedirnos ver, corregir o eliminar cualquier informe o correo que nos hayas enviado. Escríbenos a <Mailto /> e indica
            aproximadamente cuándo lo enviaste. Respondemos en un plazo de 30 días. Si estás en el Espacio Económico Europeo o en el Reino Unido,
            también tienes derecho a:
          </p>
          <ul>
            <li>oponerte a nuestro uso de tu información o limitarlo</li>
            <li>recibir una copia en un formato portátil</li>
            <li>reclamar ante tu autoridad local de protección de datos (en España, la Agencia Española de Protección de Datos)</li>
          </ul>
          <p>
            La base jurídica para tratar informes y correos es nuestro interés legítimo en corregir problemas de FilaShift y responder a quien nos
            contacta. Para la página de creadores, es el consentimiento del diseñador. No tomamos decisiones automatizadas sobre ti. No vendemos ni
            "compartimos" información personal en el sentido de las leyes de privacidad de los estados de EE. UU.
          </p>
        </>
      ),
    },
    {
      h: "Seguridad",
      body: (
        <p>
          El sitio usa HTTPS. Los informes se guardan en un servidor al que solo accede nuestro personal. Ningún sistema es totalmente seguro, así que
          no incluyas nada sensible en los informes.
        </p>
      ),
    },
    {
      h: "Menores",
      body: (
        <p>
          FilaShift es una herramienta para el público general y no está dirigida a menores de 13 años. Los menores de 13 años no deben enviar
          informes ni correos con información personal. Si eres madre, padre o tutor y crees que tu hijo nos envió información, escríbenos y la
          eliminaremos.
        </p>
      ),
    },
    {
      h: "Cambios en esta política",
      body: (
        <p>
          Si cambiamos esta política, actualizaremos la fecha al principio de la página. Si el cambio es importante, por ejemplo si empezamos a
          recopilar información nueva, también mostraremos un aviso en la página de inicio de FilaShift durante al menos 30 días antes de que entre en
          vigor. Los cambios solo se aplican a la información recopilada después de su entrada en vigor, salvo que aceptes otra cosa.
        </p>
      ),
    },
    {
      h: "Contacto",
      body: (
        <p>
          Preguntas sobre privacidad o solicitudes para ver o eliminar un informe: <Mailto />, o por correo postal a {ENTITY}, {PLACE}.
        </p>
      ),
    },
  ];
}

function TERMS_ES(): Sec[] {
  return [
    ES_NOTE,
    {
      h: "Sobre estas condiciones",
      body: (
        <p>
          FilaShift (filashift.com) es una herramienta gratuita de {ENTITY} ("nosotros"), filial de Jackson Consolidated Group of Companies LLC.
          Estas condiciones regulan tu uso del sitio web filashift.com. Al usar el sitio las aceptas. Si no estás de acuerdo, no uses el sitio. Nuestra
          página de <Link href="/privacy">Privacidad</Link> explica cómo tratamos la información.
        </p>
      ),
    },
    {
      h: "Revisa antes de imprimir",
      body: (
        <p>
          Los proyectos convertidos se hacen lo mejor posible. Las impresoras, las versiones de laminador y los filamentos varían, así que{" "}
          <strong>
            abre siempre el proyecto convertido en tu laminador y revisa la vista previa, las temperaturas, las velocidades y los soportes antes de
            imprimir.
          </strong>{" "}
          La insignia "Probado en laminador" significa que un proyecto de muestra convertido para esa impresora se laminó sin errores en la versión
          de laminador indicada; no es una garantía para tu archivo. Eres responsable de lo que imprimes y de usar tu impresora de forma segura,
          siguiendo las instrucciones del fabricante. No dejes nunca una impresora funcionando sin vigilancia si el fabricante lo desaconseja.
        </p>
      ),
    },
    {
      h: "Tus archivos y los derechos de los diseñadores",
      body: (
        <p>
          Convierte solo archivos que tengas permiso para usar. Convertir un modelo no cambia su licencia. Sigue las condiciones del diseñador,
          incluidas las de uso no comercial o sin remezclas, y menciona al diseñador cuando lo compartas.
        </p>
      ),
    },
    {
      h: "Uso razonable del sitio",
      body: (
        <>
          <p>No hagas un mal uso de FilaShift. Es decir, no:</p>
          <ul>
            <li>interfieras con el sitio ni lo sobrecargues</li>
            <li>intentes saltarte los límites de uso</li>
            <li>envíes spam o contenido ilícito mediante "Informar de un problema"</li>
            <li>uses el sitio para infringir la ley o los derechos de nadie</li>
          </ul>
          <p>Podemos bloquear el acceso que perjudique al sitio o a otros usuarios.</p>
        </>
      ),
    },
    {
      h: "Precios, tiendas y enlaces de afiliado",
      body: (
        <>
          <p>
            Los precios, la disponibilidad y los descuentos de filamento se recopilan de los listados públicos de las tiendas unas cuatro veces al día.
            Pueden estar desactualizados o ser incorrectos, y no incluyen envío ni impuestos. El precio que cuenta es el de la caja de la tienda.
            FilaShift no vende nada. Tu compra es entre tú y la tienda, y se aplican las condiciones de la tienda.
          </p>
          <p>
            Algunos enlaces y códigos de descuento son de afiliado: si compras después de usar uno, FilaShift puede ganar una comisión sin coste
            adicional para ti. Las ofertas se ordenan por precio, no por comisión. Como afiliado de Amazon, FilaShift obtiene ingresos por las compras
            adscritas que cumplen los requisitos aplicables.
          </p>
        </>
      ),
    },
    {
      h: "Código abierto",
      body: (
        <p>
          El software de FilaShift es software libre con licencia GNU Affero General Public License versión 3 (AGPL-3.0). Puedes obtener el código
          fuente completo <Source es />. Los perfiles de impresoras y filamentos derivan de OrcaSlicer y Bambu Studio, también con licencia AGPL-3.0.
          Nada en estas condiciones limita los derechos que la AGPL te da para usar, estudiar, modificar y compartir el software. Estas condiciones
          solo regulan el sitio web que gestionamos.
        </p>
      ),
    },
    {
      h: "Marcas",
      body: (
        <p>
          Bambu Lab, MakerWorld, Printables, PrusaSlicer, Snapmaker, Flashforge, Creality, Prusa, Elegoo, Anycubic, Qidi, Amazon y otros nombres de
          productos y tiendas son marcas de sus titulares. Solo los usamos para describir la compatibilidad y dónde se venden los productos. FilaShift
          no está afiliado a ellos ni cuenta con su respaldo, salvo como afiliado de las tiendas indicadas en nuestra página de Privacidad. El nombre
          FilaShift y el emblema JTS pertenecen a {ENTITY}.
        </p>
      ),
    },
    {
      h: "Reclamaciones de derechos de autor",
      body: (
        <>
          <p>
            Si crees que algo en FilaShift, como un enlace de nuestra página de creadores, infringe tus derechos de autor, envía un aviso a nuestro
            agente designado:
          </p>
          <ul>
            <li>
              Copyright Agent, {ENTITY}, {PLACE}
            </li>
            <li>
              <Mailto /> (asunto: "Copyright notice")
            </li>
          </ul>
          <p>Incluye:</p>
          <ul>
            <li>la obra que consideras infringida</li>
            <li>dónde está el material en nuestro sitio</li>
            <li>tus datos de contacto</li>
            <li>una declaración de que crees de buena fe que el uso no está autorizado</li>
            <li>
              una declaración, bajo pena de perjurio, de que tu aviso es exacto y de que eres el titular o estás autorizado para actuar en su nombre
            </li>
            <li>tu firma física o electrónica</li>
          </ul>
          <p>Retiraremos el material objeto de un aviso válido. También podemos retirar a infractores reincidentes.</p>
        </>
      ),
    },
    {
      h: "Sin garantía",
      body: (
        <p>
          FILASHIFT SE OFRECE GRATIS, "TAL CUAL" Y "SEGÚN DISPONIBILIDAD". EN LA MEDIDA MÁXIMA PERMITIDA POR LA LEY, NO OFRECEMOS GARANTÍAS DE NINGÚN
          TIPO, EXPRESAS O IMPLÍCITAS, INCLUIDAS LAS GARANTÍAS IMPLÍCITAS DE COMERCIABILIDAD, IDONEIDAD PARA UN FIN DETERMINADO, EXACTITUD O NO
          INFRACCIÓN. No prometemos que el sitio esté siempre disponible o libre de errores, ni que las conversiones o los precios sean correctos.
        </p>
      ),
    },
    {
      h: "Límites de nuestra responsabilidad",
      body: (
        <>
          <p>
            EN LA MEDIDA MÁXIMA PERMITIDA POR LA LEY, NO SOMOS RESPONSABLES DE IMPRESIONES FALLIDAS, IMPRESORAS U OTROS EQUIPOS DAÑADOS, MATERIAL O
            TIEMPO DESPERDICIADO, PÉRDIDA DE DATOS NI DE NINGÚN DAÑO INDIRECTO, INCIDENTAL, ESPECIAL O CONSECUENTE DERIVADO DE TU USO DEL SITIO O DE
            LAS TIENDAS A LAS QUE ENLAZAMOS. Si aun así fuéramos responsables, nuestra responsabilidad total se limita a 50 dólares estadounidenses.
          </p>
          <p>
            Algunos estados y países no permiten excluir o limitar ciertas garantías o daños, así que parte de lo anterior puede no aplicarse a ti. Nada
            en estas condiciones limita la responsabilidad por muerte o lesiones personales causadas por negligencia, por fraude ni por nada que la ley
            no permita limitar. Si eres consumidor, nada de esto te quita los derechos que te otorgan las leyes de consumo de tu país.
          </p>
        </>
      ),
    },
    {
      h: "Cambios, ley aplicable y disputas",
      body: (
        <>
          <p>
            Podemos actualizar estas condiciones. La fecha de arriba indica la versión más reciente, y los cambios importantes también se anunciarán en
            la página de inicio durante al menos 30 días. Si sigues usando el sitio después de que un cambio entre en vigor, se aplican las nuevas
            condiciones.
          </p>
          <p>
            Estas condiciones se rigen por las leyes del Estado de Wisconsin (EE. UU.), sin tener en cuenta sus normas sobre conflicto de leyes.
            Cualquier disputa se resolverá en los tribunales estatales o federales del condado de Waukesha, Wisconsin. No obstante, si eres un
            consumidor que vive fuera de EE. UU., conservas la protección de las leyes imperativas de tu país y puedes presentar una reclamación ante
            los tribunales de tu lugar de residencia. Contáctanos primero: la mayoría de los problemas se resuelven por correo.
          </p>
          <p>
            Si alguna parte de estas condiciones no puede aplicarse, el resto sigue vigente. Que no hagamos cumplir una condición de inmediato no
            supone una renuncia.
          </p>
        </>
      ),
    },
    {
      h: "Contacto",
      body: (
        <p>
          Preguntas sobre estas condiciones: <Mailto />.
        </p>
      ),
    },
  ];
}
