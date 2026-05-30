/**
 * Extra prompt packs per task type + level. Merged with canonical {@link PROMPTS}
 * in `taskGenerator` so each task index can draw a different scenario for the same type.
 */
import type { ExamLevel, ExamTaskType } from './types'

export type ExamPromptVariantPack = {
  nl: string
  en: string
  hints?: string[]
  example?: string
  audioScriptNl?: string
  /** Short Dutch scenario heard before you speak (Part 1 / video proxy). */
  scenarioScriptNl?: string
}

export const EXAM_PROMPT_VARIANT_BANKS: Partial<
  Record<ExamTaskType, Partial<Record<ExamLevel, readonly ExamPromptVariantPack[]>>>
> = {
  practical_request: {
    A1: [
      {
        nl: 'Je bent bij de bakker. Vraag om twee bruine bolletjes.',
        en: 'At the bakery: politely ask for two brown rolls.',
        hints: ['Gebruik “twee” + “alstublieft”.'],
        example: 'Mag ik twee bruine bolletjes, alstublieft?',
      },
      {
        nl: 'Je bent in de trein. Vraag beleefd of dit stoelrij nummer 12 is.',
        en: 'On the train: politely ask if this is seat row 12.',
        hints: ['Korte vraag met “mag ik vragen”.'],
      },
      {
        nl: 'Je belt je vriend. Vraag of je morgenavond langs mag komen.',
        en: 'Call a friend: ask if you may visit tomorrow evening.',
        hints: ['Noem “morgenavond”.'],
      },
    ],
    A2: [
      {
        nl: 'Je belt de tandartspraktijk. Vraag om een controleafspraak volgende week.',
        en: 'Call the dentist: ask for a check-up appointment next week.',
        hints: ['Zeg kort wie je bent.', 'Noem “volgende week”.'],
        scenarioScriptNl:
          'U zit thuis met uw agenda. U moet binnenkort naar de tandarts en wilt een afspraak plannen.',
      },
      {
        nl: 'Je belt je sportschool. Vraag of je je lidmaatschap een maand kunt pauzeren.',
        en: 'Call your gym: ask to pause your membership for one month.',
        hints: ['Blijf beleefd en concreet.'],
        scenarioScriptNl: 'U belt de sportschool. U gaat een maand weg en wilt uw abonnement tijdelijk pauzeren.',
      },
      {
        nl: 'Je spreekt je buurman aan. Vraag rustig om minder geluid na elf uur ’s avonds.',
        en: 'Ask your neighbour calmly for less noise after eleven in the evening.',
        hints: ['Geen verwijt — wel een duidelijk verzoek.'],
        scenarioScriptNl: 'Het is laat. U hoort geluid van de buren en klopt vriendelijk aan om te praten.',
      },
      {
        nl: 'Je belt de klantenservice van je internetprovider. Zeg dat internet wegvalt en vraag om een monteur.',
        en: 'Call ISP support: say the internet drops out and ask for a technician.',
        hints: ['Noem het probleem + wat je wilt (monteur/bezoek).'],
        scenarioScriptNl: 'Thuis valt uw internet steeds weg. U belt de helpdesk van uw provider.',
      },
      {
        nl: 'Je bent bij de apotheek. Je medicijn is niet op voorraad. Vraag wat je nu het beste kunt doen.',
        en: 'At the pharmacy: your medicine is out of stock — ask what to do next.',
        scenarioScriptNl: 'Bij de apotheekbalie hoort u dat uw medicijn vandaag niet leverbaar is.',
      },
      {
        nl: 'Je belt een hotel. Vraag of late checkout tot veertien uur mogelijk is.',
        en: 'Call a hotel: ask if late checkout until 2 p.m. is possible.',
        scenarioScriptNl: 'U bent in een hotel en wilt de kamer langer houden dan gebruikelijk.',
      },
      {
        nl: 'Bij het station werkt je OV-chipkaart niet bij de poortjes. Vraag een medewerker om hulp.',
        en: 'Your travel card fails at the gates — ask staff for help.',
        scenarioScriptNl: 'Op het station piept uw kaart fout bij het inchecken; er staat een medewerker in de buurt.',
      },
      {
        nl: 'Op je werk: vraag je leidinggevende of je vrijdag een uur later mag beginnen.',
        en: 'At work: ask your manager if you may start one hour later on Friday.',
        scenarioScriptNl: 'Op kantoor heeft u een privéafspraak en wilt u uw starttijd op vrijdag aanpassen.',
      },
      {
        nl: 'Je belt de kinderopvang. Meld dat je kind vandaag ziek is en niet komt.',
        en: 'Call daycare: report that your child is sick today and will not attend.',
        scenarioScriptNl: 'Uw kind is ziek. U belt de opvang om te melden dat uw kind thuis blijft.',
      },
    ],
    B1: [
      {
        nl: 'Schrijf een korte, formele mail aan de VvE: je balkon lekt en je vraagt om inspectie.',
        en: 'Formal email to the owners’ association: balcony leaks — request an inspection.',
        hints: ['Onderwerp + probleem + gewenste actie.'],
      },
      {
        nl: 'Je belt een verzekeraar. Vraag schriftelijk om uitleg over een verhoogde premie.',
        en: 'Call an insurer: ask for a written explanation of a higher premium.',
      },
      {
        nl: 'Mail je opleiding: je wilt uitstel voor een deadline wegens ziekte thuis — bondig en zakelijk.',
        en: 'Email your course: request a deadline extension due to illness — concise and professional.',
      },
    ],
  },
  short_response: {
    A1: [
      {
        nl: 'Hoe ga je meestal naar school of werk? Eén of twee zinnen.',
        en: 'How do you usually get to school or work? One or two sentences.',
      },
      {
        nl: 'Wat eet je graag bij het ontbijt? Antwoord kort.',
        en: 'What do you like to eat for breakfast? Short answer.',
      },
    ],
    A2: [
      {
        nl: 'Wat doe je meestal in het weekend? Geef twee zinnen.',
        en: 'What do you usually do at the weekend? Two sentences.',
        scenarioScriptNl: 'In een korte clip vraagt iemand op straat: “Wat doe je graag in het weekend?”',
      },
      {
        nl: 'Wat is je favoriete gerecht? Leg in één zin uit waarom.',
        en: 'Favourite dish — one sentence why.',
        scenarioScriptNl: 'Twee vrienden praten over eten; u moet uw favoriet noemen.',
      },
      {
        nl: 'Beschrijf je wijk in twee zinnen (rustig, druk, groen…).',
        en: 'Describe your neighbourhood in two sentences.',
        scenarioScriptNl: 'U ziet beelden van een typische straat en hoort: “Hoe is uw buurt?”',
      },
      {
        nl: 'Noem een hobby en hoe vaak je die doet.',
        en: 'Name a hobby and how often you do it.',
        scenarioScriptNl: 'Op een sollicitatietraining vraagt de trainer om een korte hobby-introductie.',
      },
      {
        nl: 'Vertel kort over je laatste vakantie: waar en hoe was het?',
        en: 'Briefly describe your last holiday: where and how it was.',
        scenarioScriptNl: 'Collega’s praten bij de koffieautomaat over vakantie; u bent aan de beurt.',
      },
      {
        nl: 'Waarom woon je in deze stad? Eén of twee zinnen.',
        en: 'Why do you live in this city? One or two sentences.',
        scenarioScriptNl: 'Een buurvrouw vraagt nieuwsgierig waarom u juist hier bent komen wonen.',
      },
      {
        nl: 'Hoe ziet je ochtendroutine eruit voordat je weggaat naar werk of studie?',
        en: 'Your morning routine before leaving for work or study.',
        scenarioScriptNl: 'In een informele poll op werk vragen ze: “Hoe start jij je dag?”',
      },
    ],
    B1: [
      {
        nl: 'Leg uit welke gewoonte je productiviteit het meeste helpt — en waarom.',
        en: 'Which habit helps your productivity most — and why?',
        hints: ['Minstens twee argumenten.'],
      },
      {
        nl: 'Beschrijf een samenwerkingsprobleem dat je ooit had en hoe je het aanpakte.',
        en: 'A collaboration problem you once had and how you addressed it.',
      },
    ],
  },
  follow_up_response: {
    A1: [
      {
        nl: 'De ander zegt: “Ik vind Nederlands moeilijk.” Reageer vriendelijk.',
        en: 'They say Dutch is hard — respond kindly.',
      },
      {
        nl: 'De ander zegt: “Ik heb honger.” Reageer en stel iets voor.',
        en: 'They say they are hungry — respond and suggest something.',
      },
    ],
    A2: [
      {
        nl: 'Collega: “Ik heb de deadline niet gehaald.” Reageer ondersteunend en stel één concrete vervolgstap voor.',
        en: 'Colleague missed a deadline — supportive reply + one concrete next step.',
        scenarioScriptNl: 'Uw collega zucht en zegt zacht dat de deadline niet is gehaald.',
      },
      {
        nl: 'Buur: “De lift is weer kapot.” Geef een nuttige, rustige reactie.',
        en: 'Neighbour says the lift is broken again — calm, helpful response.',
        scenarioScriptNl: 'In de galerij zegt uw buurman gefrustreerd dat de lift het weer niet doet.',
      },
      {
        nl: 'Vriend: “Ik heb hoofdpijn en kan vanavond niet komen.” Reageer begripvol en bied een alternatief.',
        en: 'Friend cancels with a headache — understanding reply + alternative.',
        scenarioScriptNl: 'Uw vriend appt dat hij hoofdpijn heeft en vanavond niet kan.',
      },
      {
        nl: 'De ander: “Ik ben de bus mist.” Wat zeg je terug om te helpen?',
        en: 'They missed the bus — what do you say to help?',
        scenarioScriptNl: 'Iemand op het station zegt paniekerig dat hij de bus heeft gemist.',
      },
      {
        nl: 'De ander: “Het is veel te koud op kantoor.” Reageer natuurlijk en meelevend.',
        en: 'They say the office is too cold — natural, empathetic reply.',
        scenarioScriptNl: 'Een teamgenoot klaagt dat het op kantoor te koud is tijdens het overleg.',
      },
      {
        nl: 'De ander: “Ik twijfel of ik deze baan moet houden.” Geef geen preek; reageer kort en respectvol.',
        en: 'They doubt keeping their job — short, respectful response (no lecture).',
        scenarioScriptNl: 'Tijdens de lunch zegt uw collega dat ze twijfelt aan haar baan.',
      },
    ],
    B1: [
      {
        nl: 'Je manager zet je voorstel ter discussie in de vergadering. Reageer zakelijk en constructief.',
        en: 'Your manager challenges your proposal in a meeting — professional, constructive reply.',
      },
      {
        nl: 'Een klant zegt dat jullie service “teleurstellend” was. Herformuleer en bied een vervolgstap.',
        en: 'A client says your service was disappointing — rephrase and offer a follow-up.',
      },
    ],
  },
  roleplay: {
    A1: [
      {
        nl: 'Je bent bij de bushalte. Vraag wanneer de volgende bus naar het centrum gaat.',
        en: 'At the bus stop: ask when the next bus to the centre leaves.',
      },
    ],
    A2: [
      {
        nl: 'Je belt een restaurant om een tafel te reserveren voor zaterdag om 19:00 (twee personen).',
        en: 'Call a restaurant to book a table for Saturday 7 p.m. (two people).',
      },
      {
        nl: 'Je belt je werk: je bent ziek en meldt dat je vandaag niet komt.',
        en: 'Call work: you are sick and will not come in today.',
      },
      {
        nl: 'Je belt een vriend om een afspraak te verzetten naar volgende week.',
        en: 'Call a friend to reschedule a meet-up to next week.',
      },
    ],
    B1: [
      {
        nl: 'Je belt de gemeente: je parkeervergunning is foutief afgewezen — vraag om herbeoordeling.',
        en: 'Call the municipality: parking permit wrongly rejected — request a review.',
      },
    ],
  },
  describe_situation: {
    A2: [
      {
        nl: 'Er is een storing in de supermarkt: de kassa’s vallen uit. Beschrijf wat je ziet en wat je doet.',
        en: 'Supermarket checkout outage — describe what you see and what you do.',
      },
      {
        nl: 'Je komt te laat op een afspraak door een ongeluk op de route. Beschrijf de situatie kort.',
        en: 'Late for an appointment due to an incident on the route — describe briefly.',
      },
    ],
    B1: [
      {
        nl: 'Beschrijf een ethisch dilemma op het werk en hoe je het afweegt.',
        en: 'Describe an ethical dilemma at work and how you weigh it.',
      },
    ],
  },
  give_opinion: {
    A2: [
      {
        nl: 'Wat vind je van verplicht thuiswerken één dag per week? Mening + korte reden.',
        en: 'Opinion on mandatory work-from-home one day a week + short reason.',
      },
      {
        nl: 'Wat vind je van strengere regels voor elektrische steps in de stad?',
        en: 'Opinion on stricter rules for e-scooters in the city.',
      },
    ],
    B1: [
      {
        nl: 'Geef je mening over datacenter-uitbreidingen bij woonwijken — met minstens twee argumenten.',
        en: 'Opinion on data centre expansion near residential areas — at least two arguments.',
      },
    ],
  },
  justify_reason: {
    A2: [
      {
        nl: 'Waarom vind je lopen of fietsen beter dan de auto voor korte afstanden?',
        en: 'Why walking or cycling beats the car for short distances?',
      },
      {
        nl: 'Waarom zou je liever online cursussen volgen dan alleen klassikaal?',
        en: 'Why prefer online courses over classroom-only?',
      },
    ],
    B1: [
      {
        nl: 'Onderbouw waarom transparante loonbanden op de werkvloer kunnen helpen.',
        en: 'Justify why transparent pay bands can help at work.',
      },
    ],
  },
  listening_response_exam: {
    A1: [
      {
        audioScriptNl: 'Goedemorgen. De winkel opent vandaag een halfuur later, om half tien.',
        nl: 'Wanneer opent de winkel vandaag volgens de mededeling?',
        en: 'Listen, then say when the shop opens today according to the message.',
      },
      {
        audioScriptNl: 'Let op: tram twee stopt tijdelijk niet bij halte Museumplein. Stap over op tram vijf.',
        nl: 'Welke halte wordt overgeslagen en wat moet je doen?',
        en: 'Which stop is skipped and what should you do?',
      },
    ],
    A2: [
      {
        audioScriptNl:
          'Beste reizigers, door werkzaamheden rijdt metro lijn B niet tussen Station Zuid en Amstel. Neem bus 62 richting Amstel en stap daar over op metro B.',
        nl: 'Leg uit welk deel van de route niet met de metro gaat en hoe je toch aankomt.',
        en: 'Explain which part is not served by metro and how you can still get there.',
      },
      {
        audioScriptNl:
          'Uw vlucht vertrekt vanaf gate D12, niet D10. Boarding start twintig minuten voor vertrek.',
        nl: 'Noem de juiste gate en wat je over boarding moet weten.',
        en: 'State the correct gate and what you need to know about boarding.',
      },
      {
        audioScriptNl:
          'Let op fietsers: het fietspad langs het kanaal is vandaag afgesloten tot zeventien uur. Volg de omleiding via de Prinsengracht.',
        nl: 'Waarom is het pad dicht en welke omleiding noemen ze?',
        en: 'Why is the path closed and which detour do they mention?',
      },
    ],
    B1: [
      {
        audioScriptNl:
          'College van B&W besluit: vanaf volgende maand geldt een rookverbod op alle speelpleinen in de gemeente, met handhaving door toezichthouders.',
        nl: 'Vat het besluit samen en noem één praktisch gevolg voor ouders.',
        en: 'Summarize the decision and one practical consequence for parents.',
      },
    ],
  },
  read_aloud_exam: {
    A2: [
      {
        nl: 'Lees hardop: “De pakketbezorger belt vijf minuten van tevoren aan.” Leg daarna in één zin uit wat dat voor jou betekent.',
        en: 'Read aloud the sentence, then explain in one sentence what that means for you.',
      },
    ],
  },
  explain_process: {
    A2: [
      {
        nl: 'Leg uit hoe je een afspraak maakt via de website van de huisarts (grote lijnen).',
        en: 'Explain how you book a GP appointment via the practice website (main steps).',
      },
    ],
    B1: [
      {
        nl: 'Leg het stappenplan uit om een bezwaar tegen een boete in te dienen (hoofdlijnen).',
        en: 'Outline how to submit an objection to a fine.',
      },
    ],
  },
  compare_options: {
    B1: [
      {
        nl: 'Vergelijk een voltijdse baan met een deeltijdse baan in jouw sector; noem voor- en nadelen.',
        en: 'Compare full-time vs part-time work in your sector; pros and cons.',
      },
    ],
  },
  storytelling: {
    A2: [
      {
        nl: 'Vertel een kort verhaal over een keer dat je iets belangrijks bent vergeten.',
        en: 'Short story about a time you forgot something important.',
      },
    ],
  },
  sequencing: {
    A1: [
      {
        nl: 'Zet in de goede volgorde: boodschappen doen — koken — eten. Gebruik “eerst”, “daarna”, “ten slotte”.',
        en: 'Order: groceries — cook — eat. Use first / then / finally.',
      },
    ],
  },
}
