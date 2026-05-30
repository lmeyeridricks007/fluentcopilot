export const header = '// ─── Shop notices (14) ──────────────────────────────────────────────────────'
export const category = 'shop_notices'
export const items = [
  {
    introNl: 'Lees deze winkelmededeling.',
    readHintEn: 'Read the store notice.',
    passageNl:
      'Supermarkt De Linde, Hoofdstraat 22: vanwege inventaris is de winkel op dinsdag 14 mei gesloten. Woensdag opent de winkel weer om 08:00 uur. Online bestellen blijft mogelijk; afhalen kan vanaf woensdag vanaf 10:00 bij ingang B.',
    passageEn:
      'Supermarket De Linde, Hoofdstraat 22: due to stocktaking the shop is closed on Tuesday 14 May. On Wednesday the shop opens again at 8:00 a.m. Online ordering remains possible; collection from Wednesday from 10:00 at entrance B.',
    questionNl: 'Wanneer is de winkel dicht?',
    questionEn: 'When is the shop closed?',
    options: [
      { id: 'a', label: 'Op dinsdag 14 mei de hele dag.' },
      { id: 'b', label: 'Alleen op woensdagochtend tot 10:00.' },
      { id: 'c', label: 'Elke dag in mei na 20:00 uur.' },
      { id: 'd', label: 'De mededeling noemt geen sluitingsdag.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees dit prijskaartje in de kledingwinkel.',
    readHintEn: 'Read this price tag in the clothing store.',
    passageNl:
      'Winterjassen: van €129,95 voor €79,95. Actie geldig tot en met zondag. Ruilen kan binnen veertien dagen met bon en kaartje. Sale-artikelen worden niet teruggenomen in contanten, alleen tegoedbon of omruilen.',
    passageEn:
      'Winter coats: from €129.95 for €79.95. Offer valid until Sunday. Exchange within fourteen days with receipt and tag. Sale items are not refunded in cash, only store credit or exchange.',
    questionNl: 'Wat is volgens de tekst niet mogelijk bij sale-artikelen?',
    questionEn: 'What is not possible for sale items according to the text?',
    options: [
      { id: 'a', label: 'Omruilen binnen veertien dagen met bon.' },
      { id: 'b', label: 'Contant geld terugkrijgen.' },
      { id: 'c', label: 'Een tegoedbon ontvangen.' },
      { id: 'd', label: 'Ruilen met kaartje en bon.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de mededeling bij de kassa.',
    readHintEn: 'Read the notice at the checkout.',
    passageNl:
      'Let op: pinbetaling alleen boven €1. Bij kleinere bedragen graag contactloos of contant. Zelfscankassa 1 t/m 4 is vandaag buiten gebruik door onderhoud. Gebruik kassa 5 bij de ingang van de versafdeling.',
    passageEn:
      'Note: PIN payment only above €1. For smaller amounts please use contactless or cash. Self-checkout 1–4 is out of use today due to maintenance. Use checkout 5 at the entrance to the fresh section.',
    questionNl: 'Welke kassa moet u gebruiken volgens de mededeling?',
    questionEn: 'Which checkout must you use according to the notice?',
    options: [
      { id: 'a', label: 'Zelfscankassa 3 bij de hoofdingang.' },
      { id: 'b', label: 'Kassa 5 bij de versafdeling.' },
      { id: 'c', label: 'Alleen contant bij kassa 1.' },
      { id: 'd', label: 'Elke kassa behalve de versafdeling.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de folder van de bouwmarkt.',
    readHintEn: 'Read the DIY store flyer.',
    passageNl:
      'Bouwmarkt Fix-All: gratis bezorging bij bestellingen vanaf €75 binnen 15 km. Bestel voor woensdag 18:00, dan bezorgen wij op vrijdag. Grote artikelen zoals tegels alleen op afspraak; bel de klantenservice op 088-1234567.',
    passageEn:
      'DIY store Fix-All: free delivery on orders from €75 within 15 km. Order before Wednesday 6:00 p.m., then we deliver on Friday. Large items such as tiles by appointment only; call customer service on 088-1234567.',
    questionNl: 'Vanaf welk bedrag is bezorging gratis?',
    questionEn: 'From what amount is delivery free?',
    options: [
      { id: 'a', label: 'Vanaf €50 binnen heel Nederland.' },
      { id: 'b', label: 'Vanaf €75 binnen 15 km.' },
      { id: 'c', label: 'Alleen bij tegels op afspraak.' },
      { id: 'd', label: 'Bezorging is nooit gratis volgens de folder.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees het bord bij de ingang van de markt.',
    readHintEn: 'Read the sign at the market entrance.',
    passageNl:
      'Weekmarkt centrum: zaterdag 08:00-16:00 uur op het Plein. Honden aan de lijn. Geen fietsen op het plein tussen 07:00 en 17:00. Standplaatsen voor groente en brood aan de noordzijde; kleding aan de oostkant bij de fontein.',
    passageEn:
      'Town centre market: Saturday 8:00 a.m.–4:00 p.m. on the square. Dogs on a lead. No bicycles on the square between 7:00 a.m. and 5:00 p.m. Stalls for vegetables and bread on the north side; clothing on the east side by the fountain.',
    questionNl: 'Wat is niet toegestaan op het plein volgens het bord?',
    questionEn: 'What is not allowed on the square according to the sign?',
    options: [
      { id: 'a', label: 'Honden aan de lijn meenemen.' },
      { id: 'b', label: 'Fietsen tussen 07:00 en 17:00.' },
      { id: 'c', label: 'Groente kopen aan de noordzijde.' },
      { id: 'd', label: 'De markt op zaterdag bezoeken.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de mededeling in de drogist.',
    readHintEn: 'Read the notice in the drugstore.',
    passageNl:
      'Drogist Gezond+: vanaf 1 juni zijn plastic tasjes niet meer gratis. Een herbruikbare tas kost €0,25. Medicijnen zonder recept blijven achter de balie; neem een wachtnummer. De apotheekhoek is open tot 18:30 op werkdagen.',
    passageEn:
      'Drugstore Gezond+: from 1 June plastic bags are no longer free. A reusable bag costs €0.25. Non-prescription medicines remain behind the counter; take a queue number. The pharmacy corner is open until 6:30 p.m. on weekdays.',
    questionNl: 'Hoeveel kost een herbruikbare tas?',
    questionEn: 'How much does a reusable bag cost?',
    options: [
      { id: 'a', label: 'Gratis bij elke aankoop.' },
      { id: 'b', label: '€0,25 per tas.' },
      { id: 'c', label: '€1,00 alleen op zaterdag.' },
      { id: 'd', label: 'De prijs staat niet in de tekst.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees het briefje op de deur van de bakker.',
    readHintEn: 'Read the note on the bakery door.',
    passageNl:
      'Vandaag gesloten wegens familiefeest. Morgen gewoon open van 07:00 tot 17:00. Bestelde taarten kunt u ophalen bij de achterdeur aan de Kerkstraat tussen 10:00 en 12:00. Bel bij vragen naar 06-12345678.',
    passageEn:
      'Closed today due to a family celebration. Tomorrow open as usual from 7:00 a.m. to 5:00 p.m. Ordered cakes can be collected at the back door on Kerkstraat between 10:00 a.m. and 12:00 noon. Call 06-12345678 with questions.',
    questionNl: 'Waar kunt u bestelde taarten vandaag ophalen?',
    questionEn: 'Where can you collect ordered cakes today?',
    options: [
      { id: 'a', label: 'Aan de voordeur op het Plein de hele dag.' },
      { id: 'b', label: 'Bij de achterdeur aan de Kerkstraat tussen 10:00 en 12:00.' },
      { id: 'c', label: 'Alleen morgen bij de kassa.' },
      { id: 'd', label: 'Taarten worden vandaag niet uitgegeven.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de actieposter in de elektronicawinkel.',
    readHintEn: 'Read the promotion poster in the electronics store.',
    passageNl:
      'MediaWorld: koop een wasmachine en krijg gratis bezorging en installatie t/m 30 juni. Garantie twee jaar; uitbreiden naar vijf jaar kost €49. Oude apparaten nemen wij gratis mee als u het nieuwe apparaat laat bezorgen.',
    passageEn:
      'MediaWorld: buy a washing machine and get free delivery and installation until 30 June. Two-year warranty; extend to five years for €49. We take old appliances free if you have the new one delivered.',
    questionNl: 'Wat krijgt u gratis bij aankoop van een wasmachine volgens de poster?',
    questionEn: 'What do you get free when buying a washing machine according to the poster?',
    options: [
      { id: 'a', label: 'Vijf jaar garantie zonder meerprijs.' },
      { id: 'b', label: 'Bezorging en installatie tot 30 juni.' },
      { id: 'c', label: 'Een tweede wasmachine halve prijs.' },
      { id: 'd', label: 'Alleen afhalen in de winkel, geen service.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees het bord bij de uitgang van het tuincentrum.',
    readHintEn: 'Read the sign at the garden centre exit.',
    passageNl:
      'Tuincentrum Groen & Zo: grote planten alleen vervoeren met eigen aanhanger of bezorgservice (vanaf €15). Kleine potten passen in de auto. Parkeerplaats P3 is voor laden; maximaal 30 minuten. Bon tonen bij de slagboom.',
    passageEn:
      'Garden centre Groen & Zo: large plants only with your own trailer or delivery service (from €15). Small pots fit in the car. Car park P3 is for loading; maximum 30 minutes. Show receipt at the barrier.',
    questionNl: 'Waar moet u laden volgens het bord?',
    questionEn: 'Where must you load according to the sign?',
    options: [
      { id: 'a', label: 'Op parkeerplaats P3 met bon bij de slagboom.' },
      { id: 'b', label: 'Alleen achter de hoofdingang zonder tijdslimiet.' },
      { id: 'c', label: 'Op P1 voor maximaal twee uur gratis.' },
      { id: 'd', label: 'Laden is overal op het terrein toegestaan.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees de mededeling bij de servicebalie.',
    readHintEn: 'Read the notice at the service desk.',
    passageNl:
      'Winkel Stadshart: ruilen zonder bon alleen bij identieke producten en binnen 48 uur. Met bon: veertien dagen. Schoenen die gedragen zijn buiten de winkel worden niet geruild. Klachten? Vul een formulier in bij balie 2 op de eerste verdieping.',
    passageEn:
      'Stadshart store: exchange without receipt only for identical products and within 48 hours. With receipt: fourteen days. Shoes worn outside the shop are not exchanged. Complaints? Fill in a form at desk 2 on the first floor.',
    questionNl: 'Waar vult u een klachtenformulier in?',
    questionEn: 'Where do you fill in a complaint form?',
    options: [
      { id: 'a', label: 'Bij balie 2 op de eerste verdieping.' },
      { id: 'b', label: 'Bij elke kassa op de begane grond.' },
      { id: 'c', label: 'Alleen online via de webshop.' },
      { id: 'd', label: 'Bij de schoenenafdeling zonder formulier.' },
    ],
    correctOptionIds: ['a'],
  },
  {
    introNl: 'Lees het scherm bij de broodafdeling.',
    readHintEn: 'Read the screen at the bread section.',
    passageNl:
      'Vers gebakken: bruin brood om 11:30 en 15:00. Croissants om 09:00 en 14:00. Vooraf bestellen kan via de app tot twee uur voor het bakmoment. Zonder bestelling: wie het eerst komt, het eerst maalt bij drukte.',
    passageEn:
      'Freshly baked: brown bread at 11:30 a.m. and 3:00 p.m. Croissants at 9:00 a.m. and 2:00 p.m. Pre-order via the app up to two hours before baking time. Without order: first come, first served when busy.',
    questionNl: 'Hoe laat zijn croissants vers volgens het scherm?',
    questionEn: 'When are croissants fresh according to the screen?',
    options: [
      { id: 'a', label: 'Om 11:30 en 15:00 uur.' },
      { id: 'b', label: 'Om 09:00 en 14:00 uur.' },
      { id: 'c', label: 'Alleen na vooraf bestellen via de app.' },
      { id: 'd', label: 'De tekst noemt geen tijden voor croissants.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de poster bij de kassa van de kringloopwinkel.',
    readHintEn: 'Read the poster at the thrift shop checkout.',
    passageNl:
      'Kringloop De Meeuw: vandaag 50% korting op alle boeken en speelgoed. Meubels zijn uitgezonderd. Betalen kan met pin of contant; creditcard niet. Donaties in goede staat graag voor 16:00 aan de achterzijde.',
    passageEn:
      'Thrift shop De Meeuw: today 50% off all books and toys. Furniture excluded. Pay by debit or cash; no credit card. Donations in good condition please before 4:00 p.m. at the rear.',
    questionNl: 'Waar brengt u donaties volgens de poster?',
    questionEn: 'Where do you bring donations according to the poster?',
    options: [
      { id: 'a', label: 'Aan de kassa op de begane grond.' },
      { id: 'b', label: 'Voor 16:00 aan de achterzijde.' },
      { id: 'c', label: 'Alleen op maandag bij de manager.' },
      { id: 'd', label: 'Donaties worden niet meer aangenomen.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees het bord bij de viskraam.',
    readHintEn: 'Read the sign at the fish stall.',
    passageNl:
      'Viskraam Noordzee: verse haring alleen op vrijdag en zaterdag. Voor bestellingen vanaf €30: bel een dag van tevoren. Zonder bestelling wacht u in de rij aan de kraam op de Vismarkt. Pin alleen; geen contant onder €5.',
    passageEn:
      'Fish stall Noordzee: fresh herring only on Friday and Saturday. For orders from €30: call one day in advance. Without order wait in the queue at the stall on Vismarkt. Debit only; no cash under €5.',
    questionNl: 'Op welke dagen is verse haring verkrijgbaar?',
    questionEn: 'On which days is fresh herring available?',
    options: [
      { id: 'a', label: 'Elke werkdag tot 18:00 uur.' },
      { id: 'b', label: 'Alleen op vrijdag en zaterdag.' },
      { id: 'c', label: 'Alleen na telefonische bestelling van €30.' },
      { id: 'd', label: 'De tekst vermeldt geen dagen voor haring.' },
    ],
    correctOptionIds: ['b'],
  },
  {
    introNl: 'Lees de mededeling bij de bloemist.',
    readHintEn: 'Read the notice at the florist.',
    passageNl:
      'Bloemist Flora: valentijnsboeketten ophalen op 13 februari tussen 14:00 en 18:00. Zonder reserveringsnummer geen afhalen. Bezorging op 14 februari is vol; alleen nog afhalen in de winkel. Neem uw bevestigingsmail mee.',
    passageEn:
      'Florist Flora: collect Valentine bouquets on 13 February between 2:00 p.m. and 6:00 p.m. No collection without reservation number. Delivery on 14 February is full; only collection in shop. Bring your confirmation email.',
    questionNl: 'Wat moet u meenemen om een boeket op te halen?',
    questionEn: 'What must you bring to collect a bouquet?',
    options: [
      { id: 'a', label: 'Alleen contant geld voor de restbetaling.' },
      { id: 'b', label: 'Uw bevestigingsmail en reserveringsnummer.' },
      { id: 'c', label: 'Een eigen vaas van minimaal 30 cm.' },
      { id: 'd', label: 'Niets; afhalen kan zonder afspraak de hele dag.' },
    ],
    correctOptionIds: ['b'],
  },
]
