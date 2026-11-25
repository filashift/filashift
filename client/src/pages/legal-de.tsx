// German translation of the Privacy policy and Terms of use. The English version in legal.tsx controls;
// keep the sections in step with it.
import { Link } from "wouter";
import { AFFILIATES, ENTITY, Mailto, PLACE, Source } from "./legal-common";
import type { Sec } from "./legal";

const DE_NOTE: Sec = {
  h: "Deutsche Fassung",
  body: (
    <p>
      Diese Übersetzung dient Ihrer Bequemlichkeit. Weicht diese Fassung von der englischen Fassung ab, ist die englische Fassung maßgeblich,
      sofern das Recht Ihres Landes nichts anderes vorschreibt.
    </p>
  ),
};

export function PRIVACY_DE(): Sec[] {
  return [
    DE_NOTE,
    {
      h: "FilaShift fragen: private Hilfe für Besucher",
      body: <p>Der Assistent gleicht ab, was Sie eingeben oder einfügen, und durchsucht dazu die FilaShift-Anleitungen auf Ihrem Gerät. Wenn Ihr Browser bereits ein kompatibles lokales KI-Modell hat, können Sie es bitten, einen Treffer zu erklären. Keine der beiden Optionen sendet Ihre Frage an FilaShift oder an einen externen KI-Anbieter. Der Assistent kann Ihr Projekt oder Ihren Konvertierungsbericht nicht automatisch lesen. FilaShift speichert keinen Chatverlauf; beim Schließen des Assistenten wird sein Text gelöscht. Das Senden einer Problemmeldung ist ein separater Vorgang, der unten beschrieben ist.</p>,
    },
    {
      h: "Wer wir sind",
      body: (
        <p>
          FilaShift wird betrieben von {ENTITY}, einer Limited Liability Company nach dem Recht von Wisconsin und Tochtergesellschaft der Jackson
          Consolidated Group of Companies LLC, {PLACE}. Wir sind für die wenigen unten beschriebenen personenbezogenen Daten verantwortlich (nach
          europäischem und britischem Recht sind wir der „Verantwortliche“). Kontakt: <Mailto />.
        </p>
      ),
    },
    {
      h: "Ihre 3MF-Dateien bleiben auf Ihrem Gerät",
      body: (
        <p>
          <strong>Die Konvertierung findet vollständig in Ihrem Browser statt.</strong> Ihre Projektdateien werden auf Ihrem eigenen Computer oder
          Smartphone gelesen, konvertiert und gespeichert. Sie werden nie an FilaShift oder an andere hochgeladen, und wir können sie nicht sehen.
        </p>
      ),
    },
    {
      h: "Was die Website lädt und speichert",
      body: (
        <>
          <p>
            Ihr Browser lädt die App, die Profile, die Schriften und die Preise ausschließlich von filashift.com. Wir verwenden keine Analysedienste,
            Werbung, Tracking-Pixel oder Cookies von Dritten. Wenn Sie eine Seite öffnen, neu laden oder zu ihr wechseln, erhöht eine leere Anfrage
            einen täglichen Zähler für die gesamte Website. Er speichert nur das UTC-Datum und die Gesamtzahl der Aufrufe, keine IP-Adressen,
            Seitenadressen, Verweisquellen, Besucherkennungen oder Projektinformationen. Er zählt keine einzelnen Personen. Wir verzichten auf die
            Zählung, wenn Do Not Track oder Global Privacy Control aktiviert ist.
          </p>
          <p>
            Damit FilaShift schnell lädt und offline funktioniert, bewahrt Ihr Browser mithilfe eines „Service Workers“ eine Kopie der eigenen
            Dateien der App (Code, Profile, Symbole und Preislisten) in seinem integrierten App-Cache auf. Dieser Cache enthält nur die Dateien von
            FilaShift, nie Ihre Projekte und nichts über Sie. Er enthält keine Kennung und wird nicht verwendet, um Sie wiederzuerkennen. Sie können
            ihn jederzeit entfernen, indem Sie in den Browsereinstellungen die Websitedaten für filashift.com löschen oder die App deinstallieren,
            falls Sie sie installiert haben. Ihre Sprach- und Designauswahl wird im lokalen Speicher Ihres Browsers gespeichert und nie an uns
            gesendet. Wenn Sie auf der Seite mit den Filamentpreisen „Diese Suche beobachten“ nutzen, werden dort außerdem die Suchfilter, der zu diesem
            Zeitpunkt niedrigste Preis pro kg und das Speicherdatum aufbewahrt, nur auf diesem Gerät, damit die Seite Ihnen zeigen kann, wenn es günstiger
            wird. Die Preisprüfung nutzt dieselbe öffentliche Preisliste, die alle herunterladen; über Ihre beobachteten Suchen wird nichts an uns
            gesendet. Entfernen Sie sie auf dieser Seite mit „Entfernen“ oder „Alle löschen“ oder indem Sie die Websitedaten löschen.
          </p>
        </>
      ),
    },
    {
      h: "Serverprotokolle",
      body: (
        <p>
          Unser Webserver ist so eingerichtet, dass er keine Zugriffsprotokolle von Besuchern speichert. Wie bei jeder Website ist Ihre
          Internetadresse (IP-Adresse) für den Server sichtbar, während er eine Seite ausliefert. Die Systemprotokolle des Servers können kurzzeitig
          technische Fehler festhalten, damit wir die Website am Laufen halten können. Sie werden nicht zur Identifizierung oder Verfolgung von
          Besuchern verwendet und innerhalb von 30 Tagen automatisch gelöscht.
        </p>
      ),
    },
    {
      h: "Problemmeldungen",
      body: (
        <>
          <p>Wenn Sie über „Problem melden“ eine Meldung senden, erhalten wir:</p>
          <ul>
            <li>was Sie eingeben</li>
            <li>den optionalen Modell-Link</li>
            <li>Ihre E-Mail-Adresse, falls Sie eine angeben</li>
            <li>die Seite, auf der Sie waren</li>
            <li>den Zeitpunkt des Versands</li>
            <li>
              nur wenn das Kästchen „Konvertierungsdetails mitsenden“ angehakt bleibt, eine kurze Zusammenfassung der Konvertierung: Dateiname,
              Quell- und Zieldrucker, Anzahl der Druckplatten und Filamente, Warnungen sowie die User-Agent-Kennung Ihres Browsers (Browser, Version
              und Betriebssystem)
            </li>
          </ul>
          <p>
            Wenn Sie „Drucker anfragen“ nutzen, erhalten wir nur die Druckermarke und das Modell, die Sie eingeben, den optionalen Slicer und die
            Notiz, die Seite, auf der Sie waren, und den Zeitpunkt des Versands. Dieses Formular hat kein E-Mail-Feld. Wir nutzen Druckeranfragen
            nur, um zu entscheiden, welche Drucker wir hinzufügen; ansonsten werden sie wie Problemmeldungen gespeichert, verarbeitet und gelöscht,
            wie unten beschrieben.
          </p>
          <p>
            Die Datei selbst erhalten wir nie. Um Spam zu verhindern, hält der Server Ihre IP-Adresse kurzzeitig im Arbeitsspeicher, um zu begrenzen,
            wie viele Meldungen gesendet werden können. Sie wird nicht mit Ihrer Meldung gespeichert.
          </p>
          <p>
            Wir verwenden Meldungen nur, um Probleme zu untersuchen und zu beheben, und, falls Sie eine E-Mail-Adresse angegeben haben, um Ihnen zu
            antworten. Wir nehmen Sie in keine Mailingliste auf und verkaufen oder teilen Meldungen nicht zu Marketingzwecken. Meldungen werden auf
            unserem Server in den USA gespeichert (gehostet von DigitalOcean) und von unseren Mitarbeitenden gelesen. Um Meldungen zu sortieren und
            zusammenzufassen, nutzen wir außerdem einen KI-Assistenzdienst (Perplexity), der den Inhalt der Meldungen in unserem Auftrag gemäß seinen
            Geschäftsbedingungen verarbeitet. Er verwendet sie nicht zum Training seiner Modelle. Meldungen werden nach 12 Monaten automatisch
            gelöscht, oder früher, wenn Sie es wünschen.
          </p>
          <p>
            Das Senden einer Meldung ist völlig freiwillig. Wenn Sie das Formular nicht nutzen möchten, können Sie uns stattdessen eine E-Mail
            schreiben. Bitte nehmen Sie keine sensiblen personenbezogenen Daten in eine Meldung auf.
          </p>
        </>
      ),
    },
    {
      h: "E-Mail",
      body: (
        <p>
          Wenn Sie an <Mailto /> schreiben, verwenden wir Ihre Nachricht und Adresse nur, um Ihnen zu antworten. Wir bewahren die Unterhaltung so
          lange auf, wie es nötig ist, um Ihnen zu helfen, und nicht länger als 12 Monate nach ihrem Ende, sofern das Gesetz nichts anderes
          verlangt.
        </p>
      ),
    },
    {
      h: "Shop- und Affiliate-Links",
      body: (
        <p>
          Filamentpreise stammen aus den öffentlichen Produktangeboten der Markenshops, die wir auf unserem eigenen Server erfassen. Wenn Sie auf
          einen Shop- oder Amazon-Link klicken, verlassen Sie FilaShift, und es gilt die Datenschutzerklärung des jeweiligen Shops. Einige Links
          sind Affiliate-Links ({AFFILIATES}). Nach einem Klick kann der Shop oder sein Affiliate-Netzwerk ein eigenes Cookie setzen, um FilaShift
          bei einem Kauf eine Provision gutzuschreiben, ohne Mehrkosten für Sie. FilaShift erhält von Shops weder Ihren Namen noch Bestell- oder
          Zahlungsdaten. Angebote werden nach Preis sortiert, nicht danach, ob wir eine Provision erhalten. Als Amazon-Partner verdient FilaShift an
          qualifizierten Verkäufen.
        </p>
      ),
    },
    {
      h: "Do Not Track",
      body: (
        <p>
          FilaShift verfolgt Besucher weder über längere Zeit noch über Websites hinweg. Außerdem verzichten wir auf die anonyme tägliche Zählung,
          wenn Ihr Browser Do Not Track oder Global Privacy Control signalisiert. Shops, die Sie über unsere Links besuchen, folgen ihren eigenen
          Richtlinien.
        </p>
      ),
    },
    {
      h: "Seite „Ersteller“",
      body: (
        <p>
          Designer können darum bitten, auf unserer Seite <Link href="/creators">Ersteller</Link> aufgeführt zu werden. Wir veröffentlichen mit
          ihrer Erlaubnis nur den Namen und den Profil-Link, den uns der Designer gibt, und entfernen sie auf Wunsch.
        </p>
      ),
    },
    {
      h: "Ihre Wahlmöglichkeiten und Rechte",
      body: (
        <>
          <p>
            Sie können verlangen, dass wir Ihnen jede Meldung oder E-Mail, die Sie uns gesendet haben, zeigen, sie berichtigen oder löschen.
            Schreiben Sie einfach an <Mailto /> und nennen Sie ungefähr den Zeitpunkt des Versands. Wir antworten innerhalb von 30 Tagen. Wenn Sie
            sich im Europäischen Wirtschaftsraum oder im Vereinigten Königreich befinden, haben Sie außerdem das Recht,
          </p>
          <ul>
            <li>der Verwendung Ihrer Daten zu widersprechen oder sie einschränken zu lassen</li>
            <li>eine Kopie in einem übertragbaren Format zu erhalten</li>
            <li>sich bei Ihrer zuständigen Datenschutzbehörde zu beschweren (im Vereinigten Königreich beim Information Commissioner's Office)</li>
          </ul>
          <p>
            Unsere Rechtsgrundlage für die Bearbeitung von Meldungen und E-Mails ist unser berechtigtes Interesse, Probleme mit FilaShift zu beheben
            und Personen zu antworten, die uns kontaktieren. Für die Seite „Ersteller“ ist es die Einwilligung des Designers. Wir treffen keine
            automatisierten Entscheidungen über Sie. Wir verkaufen oder „teilen“ keine personenbezogenen Daten im Sinne der Datenschutzgesetze der
            US-Bundesstaaten.
          </p>
        </>
      ),
    },
    {
      h: "Sicherheit",
      body: (
        <p>
          Die Website verwendet HTTPS. Meldungen werden auf einem Server aufbewahrt, auf den nur unsere Mitarbeitenden zugreifen können. Kein System
          ist vollkommen sicher; nehmen Sie daher bitte nichts Sensibles in Meldungen auf.
        </p>
      ),
    },
    {
      h: "Kinder",
      body: (
        <p>
          FilaShift ist ein Werkzeug für ein allgemeines Publikum und richtet sich nicht an Kinder unter 13 Jahren. Kinder unter 13 Jahren sollten
          keine Meldungen oder E-Mails mit personenbezogenen Daten senden. Wenn Sie ein Elternteil sind und glauben, dass Ihr Kind uns Daten gesendet
          hat, schreiben Sie uns, und wir löschen sie.
        </p>
      ),
    },
    {
      h: "Änderungen dieser Erklärung",
      body: (
        <p>
          Wenn wir diese Erklärung ändern, aktualisieren wir das Datum oben auf dieser Seite. Bei einer wesentlichen Änderung, zum Beispiel wenn wir
          neue Daten erheben, zeigen wir außerdem mindestens 30 Tage vor ihrem Inkrafttreten einen Hinweis auf der FilaShift-Startseite an.
          Änderungen gelten nur für Daten, die nach ihrem Inkrafttreten erhoben werden, sofern Sie nicht etwas anderes vereinbaren.
        </p>
      ),
    },
    {
      h: "Kontakt",
      body: (
        <p>
          Fragen zum Datenschutz oder der Wunsch, eine Meldung einzusehen oder zu löschen: <Mailto /> oder per Post an {ENTITY}, {PLACE}.
        </p>
      ),
    },
  ];
}

export function TERMS_DE(): Sec[] {
  return [
    DE_NOTE,
    {
      h: "Über diese Bedingungen",
      body: (
        <p>
          FilaShift (filashift.com) ist ein kostenloses Werkzeug von {ENTITY} („wir“, „uns“), einer Tochtergesellschaft der Jackson Consolidated
          Group of Companies LLC. Diese Bedingungen regeln Ihre Nutzung der Website filashift.com. Mit der Nutzung der Website stimmen Sie ihnen zu.
          Wenn Sie nicht zustimmen, nutzen Sie die Website bitte nicht. Unsere Seite <Link href="/privacy">Datenschutz</Link> erklärt, wie wir mit
          Daten umgehen.
        </p>
      ),
    },
    {
      h: "Vor dem Drucken prüfen",
      body: (
        <p>
          Konvertierte Projekte entstehen nach bestem Bemühen. Drucker, Slicer-Versionen und Filamente unterscheiden sich, daher{" "}
          <strong>
            öffnen Sie das konvertierte Projekt immer in Ihrem Slicer und prüfen Sie Vorschau, Temperaturen, Geschwindigkeiten und Stützstrukturen
            vor dem Drucken.
          </strong>{" "}
          Ein Abzeichen „Slicer-getestet“ bedeutet, dass ein für diesen Drucker konvertiertes Beispielprojekt in der genannten Slicer-Version
          ohne Fehler gesliced wurde; es ist keine Garantie für Ihre Datei. Sie sind für das verantwortlich, was Sie drucken, und dafür, Ihren
          Drucker sicher und nach den Anweisungen des Herstellers zu betreiben. Lassen Sie einen Drucker nie unbeaufsichtigt laufen, wenn der
          Hersteller davon abrät.
        </p>
      ),
    },
    {
      h: "Ihre Dateien und die Rechte der Designer",
      body: (
        <p>
          Konvertieren Sie nur Dateien, die Sie verwenden dürfen. Das Konvertieren eines Modells ändert nichts an seiner Lizenz. Halten Sie sich an
          die Bedingungen des Designers, einschließlich etwaiger Einschränkungen zu nicht-kommerzieller Nutzung oder Remixen, und nennen Sie den
          Designer, wenn Sie das Modell teilen.
        </p>
      ),
    },
    {
      h: "Faire Nutzung der Website",
      body: (
        <>
          <p>Bitte missbrauchen Sie FilaShift nicht. Das bedeutet insbesondere nicht:</p>
          <ul>
            <li>die Website stören oder überlasten</li>
            <li>versuchen, Ratenbegrenzungen zu umgehen</li>
            <li>über „Problem melden“ Spam oder rechtswidrige Inhalte senden</li>
            <li>die Website nutzen, um gegen Gesetze zu verstoßen oder Rechte anderer zu verletzen</li>
          </ul>
          <p>Wir können Zugriffe sperren, die der Website oder anderen Nutzern schaden.</p>
        </>
      ),
    },
    {
      h: "Preise, Shops und Affiliate-Links",
      body: (
        <>
          <p>
            Filamentpreise, Verfügbarkeit und Rabatte werden etwa viermal täglich aus den öffentlichen Angeboten der Shops erfasst. Sie können veraltet
            oder falsch sein und enthalten weder Versand noch Steuern. Maßgeblich ist der Preis an der Kasse des Shops. FilaShift verkauft nichts. Ihr
            Kauf ist eine Sache zwischen Ihnen und dem Shop, und es gelten die Bedingungen des Shops.
          </p>
          <p>
            Einige Shop-Links und Rabattcodes sind Affiliate-Links oder -Codes: Wenn Sie nach ihrer Nutzung kaufen, kann FilaShift eine Provision
            erhalten, ohne Mehrkosten für Sie. Angebote werden nach Preis sortiert, nicht nach Provision. Als Amazon-Partner verdient FilaShift an
            qualifizierten Verkäufen.
          </p>
        </>
      ),
    },
    {
      h: "Open Source",
      body: (
        <p>
          Die FilaShift-Software ist freie Software unter der GNU Affero General Public License Version 3 (AGPL-3.0). Den vollständigen Quellcode
          erhalten Sie <Source lang="de" />. Die Drucker- und Filamentprofile stammen aus OrcaSlicer und Bambu Studio, ebenfalls unter AGPL-3.0.
          Nichts in diesen Bedingungen schränkt die Rechte ein, die Ihnen die AGPL zur Nutzung, Untersuchung, Änderung und Weitergabe der Software
          gibt. Diese Bedingungen betreffen nur die Website, die wir betreiben.
        </p>
      ),
    },
    {
      h: "Marken",
      body: (
        <p>
          Bambu Lab, MakerWorld, Printables, PrusaSlicer, Snapmaker, Flashforge, Creality, Prusa, Elegoo, Anycubic, Qidi, Amazon und andere Produkt-
          und Shopnamen sind Marken ihrer jeweiligen Inhaber. Wir verwenden sie nur, um die Kompatibilität und die Bezugsquellen von Produkten zu
          beschreiben. FilaShift ist mit ihnen weder verbunden noch wird es von ihnen unterstützt, außer als Affiliate-Partner der auf unserer Seite
          Datenschutz genannten Shops. Der Name FilaShift und das JTS-Emblem gehören {ENTITY}.
        </p>
      ),
    },
    {
      h: "Urheberrechtsbeschwerden",
      body: (
        <>
          <p>
            Wenn Sie glauben, dass etwas auf FilaShift, etwa ein Link auf unserer Seite „Ersteller“, Ihr Urheberrecht verletzt, senden Sie eine
            Mitteilung an unseren benannten Vertreter:
          </p>
          <ul>
            <li>
              Copyright Agent, {ENTITY}, {PLACE}
            </li>
            <li>
              <Mailto /> (Betreff: „Copyright notice“)
            </li>
          </ul>
          <p>Geben Sie an:</p>
          <ul>
            <li>das Werk, das Ihrer Ansicht nach verletzt wird</li>
            <li>wo sich das Material auf unserer Website befindet</li>
            <li>Ihre Kontaktdaten</li>
            <li>eine Erklärung, dass Sie in gutem Glauben annehmen, dass die Nutzung nicht genehmigt ist</li>
            <li>
              eine Erklärung unter Strafandrohung für Meineid (penalty of perjury), dass Ihre Mitteilung zutrifft und dass Sie der Rechteinhaber sind
              oder in seinem Namen handeln dürfen
            </li>
            <li>Ihre physische oder elektronische Unterschrift</li>
          </ul>
          <p>Wir entfernen Material, das Gegenstand einer gültigen Mitteilung ist. Wiederholte Rechtsverletzer können wir ebenfalls ausschließen.</p>
        </>
      ),
    },
    {
      h: "Keine Gewährleistung",
      body: (
        <p>
          FILASHIFT WIRD KOSTENLOS, „WIE BESEHEN“ UND „WIE VERFÜGBAR“ BEREITGESTELLT. SOWEIT GESETZLICH ZULÄSSIG, ÜBERNEHMEN WIR KEINERLEI
          AUSDRÜCKLICHE ODER STILLSCHWEIGENDE GEWÄHRLEISTUNG, EINSCHLIESSLICH STILLSCHWEIGENDER GEWÄHRLEISTUNGEN DER MARKTGÄNGIGKEIT, DER EIGNUNG
          FÜR EINEN BESTIMMTEN ZWECK, DER RICHTIGKEIT ODER DER NICHTVERLETZUNG VON RECHTEN. Wir versprechen nicht, dass die Website immer verfügbar
          oder fehlerfrei ist oder dass Konvertierungen oder Preise korrekt sind.
        </p>
      ),
    },
    {
      h: "Beschränkung unserer Haftung",
      body: (
        <>
          <p>
            SOWEIT GESETZLICH ZULÄSSIG, HAFTEN WIR NICHT FÜR FEHLGESCHLAGENE DRUCKE, BESCHÄDIGTE DRUCKER ODER ANDERE GERÄTE, VERSCHWENDETES MATERIAL
            ODER VERLORENE ZEIT, VERLORENE DATEN ODER MITTELBARE, BEILÄUFIGE, BESONDERE ODER FOLGESCHÄDEN, DIE AUS IHRER NUTZUNG DER WEBSITE ODER DER
            VON UNS VERLINKTEN SHOPS ENTSTEHEN. Soweit wir dennoch haften, ist unsere Gesamthaftung auf 50 US-Dollar begrenzt.
          </p>
          <p>
            Einige Bundesstaaten und Länder erlauben den Ausschluss oder die Beschränkung bestimmter Gewährleistungen oder Schäden nicht, sodass
            einiges davon für Sie möglicherweise nicht gilt. Nichts in diesen Bedingungen beschränkt die Haftung für fahrlässig verursachten Tod oder
            Personenschäden, für Betrug oder für alles andere, was gesetzlich nicht beschränkt werden kann. Wenn Sie Verbraucher sind, nimmt Ihnen
            nichts hiervon Rechte, die Sie nach dem Verbraucherrecht Ihres Wohnorts haben.
          </p>
        </>
      ),
    },
    {
      h: "Änderungen, anwendbares Recht und Streitigkeiten",
      body: (
        <>
          <p>
            Wir können diese Bedingungen aktualisieren. Das Datum oben zeigt die neueste Fassung, und wesentliche Änderungen werden außerdem
            mindestens 30 Tage lang auf der Startseite angekündigt. Wenn Sie die Website nach Inkrafttreten einer Änderung weiter nutzen, gelten die
            neuen Bedingungen.
          </p>
          <p>
            Diese Bedingungen unterliegen dem Recht des Bundesstaats Wisconsin, USA, unter Ausschluss der Kollisionsnormen. Für Streitigkeiten sind
            die bundesstaatlichen oder Bundesgerichte im Waukesha County, Wisconsin, zuständig. Wenn Sie jedoch Verbraucher mit Wohnsitz außerhalb
            der USA sind, behalten Sie den Schutz der zwingenden Gesetze Ihres Landes und können vor Ihren örtlichen Gerichten klagen. Bitte
            kontaktieren Sie uns zuerst: Die meisten Probleme lassen sich per E-Mail lösen.
          </p>
          <p>
            Ist ein Teil dieser Bedingungen nicht durchsetzbar, gilt der Rest weiter. Wenn wir eine Bestimmung nicht sofort durchsetzen, ist das kein
            Verzicht.
          </p>
        </>
      ),
    },
    {
      h: "Kontakt",
      body: (
        <p>
          Fragen zu diesen Bedingungen: <Mailto />.
        </p>
      ),
    },
  ];
}
