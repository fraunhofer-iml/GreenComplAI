-- Zwei Join-Tabellen, die seit dem ersten Schema existierten und von nichts
-- geschrieben und von nichts gelesen wurden. Vor dem Drop nachgesehen: in
-- Entwicklungs-, Test- und E2E-Datenbank stand jeweils null Zeilen drin, was zu
-- erwarten war, weil kein Code sie je befüllt hat.
--
-- Warum nicht befüllen statt löschen: sie hätten dieselbe Tatsache ein drittes
-- Mal gehalten — neben dem Snapshot-jsonb und den denormalisierten Spalten
-- dpps.product_id / dpps.economic_operator_id. Genau daraus entsteht Drift;
-- G20 hat dasselbe Muster bei den Produkt-Identifiern gerade beseitigt, wo
-- zwei Schreibpfade auseinanderlaufen konnten.
--
-- Das Mehr-Akteur-Modell der Norm (Hersteller, Importeur, Händler mit Rollen
-- und Gültigkeitszeiträumen) kommt mit G27 zurück — dann in der Form, die es
-- dort braucht, statt als vorweggenommene Vermutung aus dem ersten Entwurf.
--
-- CASCADE trifft hier nur die Fremdschlüssel und Indizes dieser beiden
-- Tabellen; auf sie zeigt nichts.

DROP TABLE "dpp_economic_operators" CASCADE;--> statement-breakpoint
DROP TABLE "dpp_products" CASCADE;