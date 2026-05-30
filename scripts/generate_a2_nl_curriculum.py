#!/usr/bin/env python3
"""Generate full nl-NL A2 curriculum JSON (72 lessons, 9 units, manifest)."""
from __future__ import annotations

import json
import os
import sys
from datetime import date

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)
from a2_learner_content import build_rich_steps, catalog_title_for_lesson
from a2_curriculum_schema import (
    GRAMMAR_SPINE_IDS,
    apply_common_error_tags_to_self_check,
    apply_integration_script_to_input_step,
    a2_band_for_unit_index,
    can_do_outcomes_for_lesson,
    enrich_lesson_steps,
    grammar_primary_for_lesson,
    thematic_grammar_bank,
    validate_grammar_examples_touch_expected_lemmas,
)
from a2_grammar_modules import GRAMMAR_PRIMARY_LABELS

ROOT = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "data",
    "curriculum",
    "nl-NL",
    "A2",
)

ROT_ODD = list("AABDFCHA")  # u01,u03,u05,u07,u09
ROT_EVEN = list("AABEGCHC")

UNITS = [
    {
        "id": "a2-u01",
        "title": "People & daily rhythm",
        "summary": "Introduce yourself and others, talk about routines, time, and simple plans in Dutch daily life.",
        "topic": "Daily life & people",
        "objectives_can_do": [
            "Exchange basic personal information and describe family or household in simple terms",
            "Talk about typical weekday and weekend routines using present tense",
            "Ask and answer about time, appointments, and simple future plans",
            "Use polite forms (u/jij) appropriately in short service-style exchanges",
            "Understand short spoken or written messages about schedules if vocabulary is familiar",
            "React appropriately to simple social questions about habits and preferences",
        ],
        "grammar_focus": [
            "present tense (weak verbs, common irregulars: zijn, hebben, gaan)",
            "word order in main clauses and yes/no questions",
            "separable verbs in present (opstaan, meenemen)",
            "expressions with te + infinitive (te laat zijn)",
        ],
        "vocabulary_domains": ["identity", "family", "time", "routines", "plans"],
        "culture_note": "Many Dutch people plan social visits in advance; spontaneous dropping by is less common than in some cultures.",
    },
    {
        "id": "a2-u02",
        "title": "Food & shopping",
        "summary": "Shop for food, ask about products, pay, and express preferences and dietary needs.",
        "topic": "Food & shopping",
        "objectives_can_do": [
            "Ask for items and quantities in a supermarket, market, or bakery",
            "Understand prices, offers, and simple labels on packaging",
            "Say what you like or avoid (allergies, vegetarian) in simple sentences",
            "Handle basic checkout phrases and payment methods",
            "Read a short shopping list or recipe instruction at A2 level",
            "Make a simple complaint or request (e.g. wrong product) politely",
        ],
        "grammar_focus": [
            "modal verbs: willen, kunnen, mogen (polite requests)",
            "measure words and containers (een kilo, een pak, een fles)",
            "comparatives (goedkoper, lekkerder) in short opinions",
            "imperatives for shopping (Geeft u mij …, Mag ik …)",
        ],
        "vocabulary_domains": ["groceries", "quantities", "tastes", "payments", "diet"],
        "culture_note": "Supermarkets like Albert Heijn and Jumbo are widespread; many people bring their own bags (statiegeld bottles returned to machines).",
    },
    {
        "id": "a2-u03",
        "title": "Housing & neighbourhood",
        "summary": "Describe your home, talk to neighbours, and handle simple housing and building issues.",
        "topic": "Home & neighbourhood",
        "objectives_can_do": [
            "Describe rooms, furniture, and rental basics (huur, borg) in simple Dutch",
            "Ask a neighbour or landlord for help with a small problem",
            "Understand short notices about building rules or maintenance",
            "Give simple directions inside a flat or small building",
            "Fill in basic fields on a housing-related form with support",
            "Express likes/dislikes about living area and facilities",
        ],
        "grammar_focus": [
            "prepositions of place (naast, boven, achter, tussen)",
            "er + locative (er is, er zijn)",
            "possessive pronouns (mijn, jouw, zijn/haar, ons)",
            "simple passive-style signs (niet roken, verboden toegang)",
        ],
        "vocabulary_domains": ["rooms", "furniture", "rent", "neighbours", "repairs"],
        "culture_note": "Flats often share a central staircase (portiek); quiet hours (rust) after 22:00 are common in building rules.",
    },
    {
        "id": "a2-u04",
        "title": "Transport & city",
        "summary": "Use public transport, ask for directions, and deal with delays and appointments in town.",
        "topic": "Travel & city",
        "objectives_can_do": [
            "Buy or check-in for train, bus, tram, or metro travel in the Netherlands",
            "Ask for and understand simple directions and changes",
            "Explain you are late or early and reschedule in short messages",
            "Read departure boards and simple travel apps with support",
            "Describe a city trip or commute in a few connected sentences",
            "Handle a simple ticket or gate problem with help phrases",
        ],
        "grammar_focus": [
            "motion verbs + preposition (naar, met, van … naar …)",
            "connectors: eerst, daarna, totdat (simple sequences)",
            "future with gaan + infinitive for plans",
            "time clauses with als, wanneer (basic)",
        ],
        "vocabulary_domains": ["OV", "tickets", "directions", "delays", "appointments"],
        "culture_note": "Nationwide OV-chipkaart or contactless check-in/out is standard; forgetting to check out can charge a higher fare.",
    },
    {
        "id": "a2-u05",
        "title": "Health & body",
        "summary": "Describe symptoms, use GP and pharmacy phrases, and follow simple health advice.",
        "topic": "Health",
        "objectives_can_do": [
            "Name common body parts and mild symptoms in Dutch",
            "Make a short appointment request with a huisartsenpraktijk",
            "Understand simple instructions from a GP assistant or pharmacist",
            "Ask for over-the-counter medicine with basic constraints",
            "Describe pain level and duration in simple phrases",
            "React appropriately to advice (rust, water drinken, paracetamol)",
        ],
        "grammar_focus": [
            "reflexive verbs (zich voelen, zich wassen)",
            "modal zullen for soft advice (Je zult moeten …) — recognition",
            "past tense recognition (ik had pijn) for narratives",
            "polite requests with zou … kunnen",
        ],
        "vocabulary_domains": ["symptoms", "body", "GP", "pharmacy", "advice"],
        "culture_note": "The huisarts (GP) is the usual first contact; emergency line 112 is for life-threatening situations; pharmacies (apotheek) advise on dosage.",
    },
    {
        "id": "a2-u06",
        "title": "Work & study",
        "summary": "Talk about jobs, schedules, and simple workplace or study communication.",
        "topic": "Work & study",
        "objectives_can_do": [
            "Describe your job or studies and typical tasks in simple Dutch",
            "Ask and answer about breaks, shifts, and deadlines",
            "Write or say a very short polite email or app message to a colleague",
            "Understand short instructions in a familiar work/study context",
            "Talk about skills and goals with basic phrases (ik wil leren …)",
            "Accept or suggest a short meeting time",
        ],
        "grammar_focus": [
            "infinitive clauses with om … te for purpose",
            "separable verbs in work context (meeting inplannen, doorgeven)",
            "present perfect recognition (ik heb … gedaan) for experience",
            "formal address in email openings (Geachte …, Met vriendelijke groet)",
        ],
        "vocabulary_domains": ["workplace", "study", "email", "schedule", "skills"],
        "culture_note": "Work emails often start with Goedemorgen/Goedemiddag + name; lunch breaks are commonly around 30 minutes; part-time work is frequent.",
    },
    {
        "id": "a2-u07",
        "title": "Admin & services",
        "summary": "Handle gemeente, bank, and post situations with simple scripted Dutch.",
        "topic": "Services & admin",
        "objectives_can_do": [
            "Ask what documents you need for a simple gemeente appointment",
            "Understand basic instructions at a service desk (nummer trekken, wachten)",
            "Request a duplicate card or change of address in simple phrases",
            "Read short official letters or emails with familiar vocabulary",
            "Make a short phone script for identification and purpose",
            "Ask someone to repeat or speak more slowly in Dutch",
        ],
        "grammar_focus": [
            "conditional polite forms (Ik zou graag … willen)",
            "passive-like bureaucratic phrases (wordt verwerkt) — recognition",
            "relative clauses with die/dat (very short)",
            "numbers and dates in official contexts",
        ],
        "vocabulary_domains": ["gemeente", "ID", "bank", "post", "appointments"],
        "culture_note": "Many gemeenten use DigiD for online services; without DigiD you often need to visit in person with ID and proof of address.",
    },
    {
        "id": "a2-u08",
        "title": "Social & leisure",
        "summary": "Invite friends, talk about hobbies, and share simple opinions about films, sport, and free time.",
        "topic": "Leisure & opinions",
        "objectives_can_do": [
            "Invite, accept, or decline invitations with reasons",
            "Talk about hobbies and weekend plans in connected sentences",
            "Give simple likes/dislikes about music, sport, or TV",
            "Ask follow-up questions in informal chat (En jij?)",
            "Understand short event posters or social media posts",
            "Suggest a time and place for meeting friends",
        ],
        "grammar_focus": [
            "want, omdat for reasons (simple clauses)",
            "graag, liever for preferences",
            "diminutives in informal speech (biertje, filmpje) — recognition/production",
            "tag questions and fillers (toch?, hè?) — careful use",
        ],
        "vocabulary_domains": ["hobbies", "events", "opinions", "friends", "media"],
        "culture_note": "Splitting the bill (iedereen betaalt voor zich) is common among friends; birthdays are often celebrated with coffee and cake at work.",
    },
    {
        "id": "a2-u09",
        "title": "Culture & integration context",
        "summary": "Explore Dutch holidays, school touchpoints, etiquette, and institutions at A2 depth.",
        "topic": "Culture & society",
        "objectives_can_do": [
            "Name major Dutch holidays and what people typically do",
            "Understand basics of primary school routines and parent contact (rough picture)",
            "Adjust tone for direct but polite Dutch communication in familiar settings",
            "Describe one or two civic habits (cycling, calendars, punctuality) simply",
            "Understand short texts about traditions without exam-specific copying",
            "Ask respectful questions about local customs",
        ],
        "grammar_focus": [
            "impersonal constructions (men …, je … as 'one')",
            "present tense narratives about customs",
            "fixed expressions for holidays and greetings",
            "contrast: formal/informal in public settings",
        ],
        "vocabulary_domains": ["holidays", "school", "etiquette", "institutions", "traditions"],
        "culture_note": "This unit foregrounds situated cultural knowledge; every lesson links language to real Netherlands contexts.",
    },
]


def archetype_for(unit_index: int, lesson_index: int) -> str:
    u = unit_index + 1
    rot = ROT_ODD if u % 2 == 1 else ROT_EVEN
    return rot[lesson_index]


def catalog_type_for(arch: str, lesson_index: int, unit_index: int) -> str:
    if arch == "D":
        return "listening"
    if arch == "H":
        return "quiz"
    if arch == "B":
        return "grammar"
    if arch == "F":
        return "grammar"
    if arch == "E":
        return "vocabulary"
    if arch == "C":
        return "dialogue"
    if arch == "G":
        return "dialogue"
    return "dialogue"  # A


def primary_skills_for(arch: str) -> list[str]:
    m = {
        "A": ["listening", "reading"],
        "B": ["speaking", "writing"],
        "C": ["listening", "reading", "speaking"],
        "D": ["listening"],
        "E": ["reading"],
        "F": ["writing"],
        "G": ["speaking"],
        "H": ["culture", "reading"],
    }
    return m[arch]


def duration_minutes(arch: str) -> int:
    return {"D": 24, "E": 23, "F": 22, "G": 22, "H": 20}.get(arch, 21)


def time_split(arch: str, total: int) -> tuple[int, int, int, int]:
    """warm_up, presentation, practice, check — sum ~= total"""
    if arch == "D":
        return 2, 9, 9, 4
    if arch == "E":
        return 2, 8, 9, 4
    if arch in "FG":
        return 2, 7, 10, 3
    if arch == "H":
        return 2, 6, 8, 4
    return 2, 7, 9, 3


def vocab_slice(unit_index: int, lesson_index: int, arch: str) -> list[str]:
    base = [
        ["kennismaken", "collega", "familie", "rooster", "weekend", "afspraak", "punctual", "ochtendritueel", "slaap", "ontbijt", "pendelen", "agenda"],
        ["boodschappen", "bonuskaart", "kassa", "bon", "pinnen", "contant", "vegetarisch", "notenallergie", "aanbieding", "vers", "diepvries", "mandje"],
        ["huur", "borg", "sleutel", "buren", "lift", "kelder", "dak", "lek", "klusjesman", "huisregels", "afvalscheiding", "parkeerplaats"],
        ["OV-chipkaart", "inchecken", "uitchecken", "vertraging", "spoor", "perron", " overstap", "fietsenstalling", "route", "kaartje", "dienstregeling", "metro"],
        ["huisarts", "spoed", "koorts", "hoofdpijn", "keel", "neus", "verkouden", "apotheek", "recept", "paracetamol", "rust", "afspraak"],
        ["collega", "vergadering", "deadline", "pauze", "dienst", "rooster", "stage", "opleiding", "werkgever", "salaris", "thuiswerken", "inbox"],
        ["gemeente", "paspoort", "verblijfsvergunning", "DigiD", "afspraak", "loket", "wachtrij", "bankpas", "rekening", "overschrijving", "postpakket", "handtekening"],
        ["uitnodigen", "afzeggen", "sporten", "koor", "museum", "bioscoop", "festival", "vriendengroep", "chatgroep", "voorstel", "afspraak", "gezellig"],
        ["Koningsdag", "Sinterklaas", "kerst", "oud en nieuw", "basisschool", "ouderspreekuur", "directheid", "fietsen", "agenda", "borrel", "traditie", "integratie"],
    ][unit_index]
    # rotate by lesson for variety
    n = len(base)
    start = (lesson_index * 3) % n
    out = [base[(start + i) % n] for i in range(12)]
    return out[: 12 if arch in "AFE" else 10]


def learner_objective_can_do(unit_index: int, arch: str) -> str:
    theme = UNITS[unit_index]["title"].lower()
    by_arch = {
        "A": f"understand short input about {theme}, notice useful chunks, and answer gist/detail questions",
        "B": f"produce accurate sentence patterns about {theme} using controlled substitution and drills",
        "C": f"complete a small real-world task about {theme} (fix a message, choose replies, short role-card)",
        "D": f"follow a longer listening clip about {theme}, catching details, numbers, and speaker intentions",
        "E": f"read an authentic-style text about {theme} and extract both gist and specific information",
        "F": f"write a short practical message about {theme} using a model, gaps, and a final checklist",
        "G": f"use structured speaking frames about {theme} (text-first) to hold a short exchange",
        "H": f"connect language about {theme} to situated Netherlands context and apply it in a short task",
    }
    return by_arch[arch]


def listening_slug(unit_index: int, lesson_index: int) -> str:
    # Stable slug pattern: a2_listen_{unit}_{lesson}
    return f"a2_listen_{unit_index + 1:02d}_{lesson_index + 1:02d}"


def build_listening_script_nl(unit_index: int, lesson_index: int) -> str:
    # One original script per unit (D lesson), ~45–90s; Netherlands contexts.
    scripts = [
        """Spreker 1: Hoi, ik ben Lisa. Ik woon hier sinds februari.
Spreker 2: Leuk! Ik heet Omar. Werk je in de buurt?
Spreker 1: Ja, ik werk vier dagen op kantoor. Vrijdag werk ik thuis.
Spreker 2: Ah, handig. Wat doe je meestal 's avonds?
Spreker 1: Ik kook, en daarna wandelen met de hond. En jij?
Spreker 2: Ik sport op dinsdag en donderdag. In het weekend slaap ik graag uit.""",
        """Verkoper: Goedemiddag, kan ik u helpen?
Klant: Ja, ik zoek lactosevrije melk en volkoren brood.
Verkoper: De melk staat in gangpad drie. Vers brood is bij de bakkerijbalie.
Klant: Prima. Heeft u ook notenvrije repen?
Verkoper: Ja, die liggen bij de snoep, onderaan het schap.
Klant: Dank u. Ik betaal contactloos.""",
        """Buurman: Hallo, ik woon boven u. Ik hoorde water in de badkamer.
Buurvrouw: O nee! Ik bel direct de verhuurder. Hebt u een foto van het plafond?
Buurman: Ja, ik stuur ze via de app. Misschien is de afvoer verstopt.
Buurvrouw: Bedankt voor het seintje. Ik ben vandaag thuis tot vijf uur.""",
        """Reiziger: Excuseer, welke tram gaat naar het museumplein?
Medewerker: Tram 2 of 12. U moet bij halte Spui overstappen.
Reiziger: Hoe laat vertrekt de volgende tram 2?
Medewerker: Over zeven minuten. Vergeet niet in te checken.
Reiziger: Dank u wel. Is er vertraging door werkzaamheden?
Medewerker: Nee, vandaag rijden ze normaal.""",
        """Assistent: Huisartsenpraktijk Noord, goedemorgen.
Patiënt: Goedemorgen, ik ben verkouden en mijn keel doet pijn sinds maandag.
Assistent: Heeft u koorts gemeten?
Patiënt: Gisteren 37,8. Ik hoest ook een beetje.
Assistent: Dokter kan u om 15:20 zien. Neem uw zorgpas mee.
Patiënt: Prima, dank u wel.""",
        """Collega A: Hé, heb je de agenda voor donderdag gezien?
Collega B: Ja, de vergadering is verplaatst naar 14:00.
Collega A: Oké. Kun je het conceptverslag vandaag nog mailen?
Collega B: Ik stuur het voor 17:00. Ik werk vanmiddag thuis.
Collega A: Top. Dan kijk ik het vanavond door.""",
        """Balie: Gemeente Utrecht, waarmee kan ik u helpen?
Inwoner: Ik wil een afspraak voor een ID-kaart. Wat moet ik meenemen?
Balie: Pasfoto, uw oude ID of geboorteakte, en bewijs van adres.
Inwoner: Kan ik online een tijd kiezen?
Balie: Ja, via de site met DigiD. Anders kan ik hier een nummer voor u printen.""",
        """Vriendin A: Zin om zaterdag naar de film te gaan?
Vriendin B: Ja, welke tijd?
Vriendin A: Om 19:30, bioscoop bij het station. Daarna drankje?
Vriendin B: Goed plan. Ik moet wel om 23:00 naar huis, want zondag vroeg op.
Vriendin A: Prima, ik reserveer twee kaartjes online.""",
        """Presentator: Vandaag: typische gewoontes rond feestdagen in Nederland.
Gast: Op kerst eten veel families warm met familie. Sinterklaas is vooral voor kinderen in december.
Presentator: En nieuwjaar?
Gast: Om middernacht proosten mensen, soms met oliebollen. In grote steden is vuurwerk populair, maar regels verschillen per gemeente.
Presentator: Dank voor de uitleg!""",
    ]
    return scripts[unit_index]


def reading_text_nl(unit_index: int, lesson_index: int) -> str:
    texts = [
        """[App-groep 'Buren flat 12']
Anouk: De lift is morgen tussen 9:00 en 11:00 uit voor onderhoud. Gebruik de trap als het kan.
Mehmet: Dank voor de melding!
Lisa: @Anouk Mag ik mijn wasmachine dan nog gebruiken? Ik hoor soms geluid.
Anouk: Ja, dat mag. Alleen geen zware meubels verplaatsen in die tijd.""",
        """[Supermarktfolder]
Weekaanbieding: 2 pakken melk voor €2,20. Bonus: appeltaart vers gebakken in de winkel.
Let op: zonder notenvariant beschikbaar bij de bakkerijbalie.
Openingstijden za: 08:00–21:00, zo: 10:00–20:00.""",
        """[Gemeentebord bij het station]
Fietsen plaatsen alleen in de rekken. Illegaal geparkeerde fietsen worden verwijderd.
OV-fiets reserveren via de app. Vergeet niet in en uit te checken.""",
        """[E-mail van sportvereniging]
Beste lid,
Training op dinsdag vervalt vanwege schoolactiviteiten in de hal. We trainen donderdag op hetzelfde tijdstip.
Groet,
Het bestuur""",
        """[Apotheekraam]
Vandaag gesloten tussen 13:00 en 14:00. Voor spoed buiten openingstijden: bel het huisartsenpostnummer op uw pas.
Paracetamol voor volwassenen: maximaal 4 gram per dag, tenzij de apotheker anders adviseert.""",
        """[Interne memo]
Collega's, de printer op de 2e verdieping doet het niet. Gebruik tot nader order de printer bij receptie.
Groet, Facilitair""",
        """[Brief van de bank]
Uw nieuwe pinpas is verstuurd. Activeer de pas in de app of bij de geldautomaat.
Verdachte transacties? Bel direct het nummer op de achterkant van uw pas.""",
        """[Evenementpagina]
Zomerfestival in het park: gratis toegang, foodtrucks vanaf 17:00. Muziek rond 19:00.
Let op: geen glas op het gras. Honden aan de lijn.""",
        """[Korte blog]
In Nederland vieren veel gezinnen Sinterklaas op 5 december met cadeautjes en gedichten. Sommige scholen organiseren een intocht in november.
Het is een feest voor kinderen, maar ook volwassenen doen soms mee met een surprise-avond.""",
    ]
    return texts[unit_index % len(texts)]


def writing_prompts_nl(unit_index: int) -> str:
    prompts = [
        "Schrijf een kort appje (4–5 zinnen) naar een collega: je bent 10 minuten te laat en je neemt koffie mee.",
        "Vul een e-mail aan de supermarkt: je mist een bon en vraagt vriendelijk om een kopie.",
        "Schrijf 5 zinnen over je buurt: wat vind je fijn, wat wil je verbeteren?",
        "Schrijf een bericht naar OV-service: je bent vergeten uit te checken en vraagt wat je moet doen.",
        "Schrijf een mailtje naar de huisartsenpraktijk: vraag om een controleafspraak volgende week.",
        "Schrijf een korte reactie op een collega: je kunt niet naar de vergadering en stelt een ander tijdstip voor.",
        "Schrijf een formele zin + 3 korte punten voor de gemeente: je meldt een adreswijziging.",
        "Schrijf een uitnodiging voor vrienden: filmavond op zaterdag, breng iets lekkers mee.",
        "Schrijf 6 zinnen over een Nederlandse traditie die je interessant vindt en waarom.",
    ]
    return prompts[unit_index]


def speaking_frames_nl(unit_index: int) -> str:
    return (
        "Rol A/B dialogues (text-first). Gebruik frames: "
        + [
            "A: Mag ik je iets vragen? B: Natuurlijk, … | A: Hoe laat …? B: Om …",
            "A: Wat vind je van …? B: Ik vind … want … | A: Zullen we …? B: Goed idee / Liever niet, want …",
            "A: Excuseer, waar is …? B: Ga rechtdoor, dan … | A: Dank je wel! B: Graag gedaan.",
            "A: Ik heb last van … B: Dan moet je misschien … | A: Moet ik een afspraak maken? B: Ja, bel …",
            "A: De trein heeft vertraging. B: Dan kunnen we … | A: Treffen we elkaar bij …? B: Prima.",
            "A: Kun je dit voor vrijdag sturen? B: Ik probeer het … | A: Hartelijk dank. B: Geen probleem.",
            "A: Ik wil mijn adres wijzigen. B: U heeft nodig: … | A: Kan het online? B: Ja, met …",
            "A: Zin om …? B: Ja, wanneer? | A: Hoe laat bij …? B: Prima, tot dan!",
            "A: Vertel iets over … in Nederland. B: Vaak … | A: Interessant! Mag ik doorvragen?",
        ][unit_index]
    )


def micro_outcomes(arch: str, unit_index: int) -> list[str]:
    return [
        f"I can recognise key words about {UNITS[unit_index]['title'].lower()} in short Dutch texts or audio.",
        "I can copy at least one useful chunk into a sentence about myself.",
        "I can finish most guided tasks in the lesson without peeking at translations on the second try.",
        "I can pass the quick self-check at the end of the lesson.",
        "I know what to revise tomorrow in two minutes or less.",
    ][:5]


def quiz_ideas_for_lesson(voc: list[str], arch: str) -> list[str]:
    w = voc[0] if voc else "werk"
    return [
        f'Self-check: choose the best reply to "Hoe gaat het?" (see step 7 in the lesson).',
        f'Gap-fill idea: write a sentence with **{w}** in the present tense.',
        "True/false: in Dutch yes/no questions the verb often comes before the subject.",
        "Say one new polite request starting with **Kunt u …** or **Mag ik …**.",
        "Paraphrase one Dutch line from the lesson input in your own English.",
    ]


def success_criteria_learner() -> str:
    return (
        "You can complete the step-7 self-check comfortably and produce at least one clear Dutch sentence "
        "about the lesson theme (spoken or written)."
    )


def build_lesson(unit_index: int, lesson_index: int) -> dict:
    arch = archetype_for(unit_index, lesson_index)
    uid = UNITS[unit_index]["id"]
    lid = f"{uid}-l{lesson_index + 1:02d}"
    title, desc = catalog_title_for_lesson(unit_index, lesson_index, arch, UNITS[unit_index]["title"].strip())
    topic = UNITS[unit_index]["topic"]
    total = duration_minutes(arch)
    w, pr, pa, ch = time_split(arch, total)
    # ensure sum
    s = w + pr + pa + ch
    if s != total:
        pa += total - s

    voc = vocab_slice(unit_index, lesson_index, arch)
    grammar = thematic_grammar_bank(
        unit_index, UNITS[unit_index]["grammar_focus"], voc, lesson_index
    )

    goal_plain = learner_objective_can_do(unit_index, arch)

    culture_in_step = (lesson_index == 0) and (unit_index < 8)  # u01-08: lesson 1 includes culture in focus
    if unit_index == 8:
        culture_in_step = True  # u09: culture thread in every lesson (focus extension)

    rot = ROT_ODD if (unit_index + 1) % 2 == 1 else ROT_EVEN
    listening_script = build_listening_script_nl(unit_index, lesson_index) if arch == "D" else None
    reading_txt = reading_text_nl(unit_index, lesson_index) if arch == "E" else None
    writing_p = writing_prompts_nl(unit_index) if arch == "F" else None
    speaking_fr = speaking_frames_nl(unit_index) if arch == "G" else None

    if lesson_index < 7:
        nxt_i = lesson_index + 1
        nxt_arch = archetype_for(unit_index, nxt_i)
        next_lesson_title, _ = catalog_title_for_lesson(
            unit_index, nxt_i, nxt_arch, UNITS[unit_index]["title"].strip()
        )
        next_t = (
            f"Next in this unit: **{next_lesson_title}** — "
            f"we keep building **{UNITS[unit_index]['title']}** with a new focus."
        )
    elif unit_index < 8:
        nu = UNITS[unit_index + 1]
        first_arch = archetype_for(unit_index + 1, 0)
        first_lesson_title, _ = catalog_title_for_lesson(
            unit_index + 1, 0, first_arch, nu["title"].strip()
        )
        next_t = (
            f"Next unit starts with **{first_lesson_title}**. "
            "You can preview the new words in Browse whenever you like."
        )
    else:
        next_t = "You reached the end of this A2 path — huge win. Mix review, scenarios, and real-life practice from here."

    gp = grammar_primary_for_lesson(unit_index, lesson_index)
    steps = build_rich_steps(
        unit_index,
        lesson_index,
        arch,
        goal_plain,
        culture_in_step,
        rot,
        UNITS[unit_index]["title"],
        voc,
        grammar,
        listening_script,
        reading_txt,
        writing_p,
        speaking_fr,
        UNITS[unit_index]["culture_note"],
        next_t,
        gp,
    )

    band = a2_band_for_unit_index(unit_index)
    enrich_lesson_steps(steps, arch, band, voc)
    apply_integration_script_to_input_step(steps, unit_index, lesson_index, arch)

    listening_id = listening_slug(unit_index, lesson_index) if arch == "D" else None
    content_refs = {
        "dialogue_scenario_code": f"{uid}_l{lesson_index + 1:02d}_dlg" if arch in "ABCG" else None,
        "listening_asset_id": listening_id,
        "notes": "Slow audio assumed for lines marked *slow* in builder CMS." if arch in "AD" else None,
    }

    content_outline: dict | None = None
    if arch == "D":
        content_outline = {"listening_script_nl": build_listening_script_nl(unit_index, lesson_index)}
    elif arch == "E":
        content_outline = {"reading_text_nl": reading_text_nl(unit_index, lesson_index)}
    elif arch == "F":
        content_outline = {"writing_prompts_nl": writing_prompts_nl(unit_index), "model_sentences_nl": ["Ik wil graag …", "Kunt u mij helpen met …?", "Alvast bedankt voor uw moeite."]}
    elif arch == "G":
        content_outline = {"speaking_frames_nl": speaking_frames_nl(unit_index)}

    catalog_type = catalog_type_for(arch, lesson_index, unit_index)

    meta = {
        "archetype": arch,
        "primary_skills": primary_skills_for(arch),
    }
    if arch == "G":
        meta["voice_optional"] = True

    obj_tail = goal_plain[0].lower() + goal_plain[1:] if goal_plain else ""
    lesson = {
        "id": lid,
        "unit_id": uid,
        "cefr_level": "A2",
        "locale": "nl-NL",
        "metadata": meta,
        "catalog": {
            "title": title,
            "description": desc,
            "topic": topic,
            "type": catalog_type,
            "durationMinutes": total,
            "isPremium": False,
        },
        "pedagogy": {
            "objective": f"By the end of this lesson, you can {obj_tail}",
            "can_do_outcomes": can_do_outcomes_for_lesson(
                UNITS[unit_index], unit_index, lesson_index, arch
            ),
            "grammar_primary": gp,
            "grammar_primary_label": GRAMMAR_PRIMARY_LABELS.get(gp, gp),
            "prior_lesson_ids": [],
            "target_vocabulary_lemmas": voc[:14],
            "grammar_points": grammar,
            "micro_outcomes": micro_outcomes(arch, unit_index),
        },
        "lesson_plan": {"warm_up_minutes": w, "presentation_minutes": pr, "practice_minutes": pa, "check_minutes": ch, "steps": steps},
        "assessment": {"quiz_ideas": quiz_ideas_for_lesson(voc, arch), "success_criteria": success_criteria_learner()},
        "content_refs": content_refs,
        "provenance": {
            "author": "curriculum_agent",
            "last_updated": str(date.today()),
            "sources_consulted": ["docs/curriculum/a2-multimodal-curriculum-design.md", "CEFR A2 illustrative descriptors"],
        },
    }
    if content_outline:
        lesson["content_outline"] = content_outline
    apply_common_error_tags_to_self_check(lesson, unit_index, lesson_index)
    return lesson


def write_manifest():
    path = os.path.join(ROOT, "manifest.json")
    data = {
        "schema_version": 1,
        "locale": "nl-NL",
        "instruction_locale": "en",
        "cefr_level": "A2",
        "title": "A2 Dutch — Multimodal everyday path (nl-NL)",
        "summary": "Nine thematic units (72 lessons) rotating input, pattern practice, extended listening/reading, writing/speaking studios, real-world tasks, and culture capsules. Aligned to CEFR A2 with explicit 8-phase lesson spine.",
        "unit_order": [f"a2-u{i:02d}" for i in range(1, 10)],
        "a2_bands": [
            {
                "band": "A2.1",
                "label": "Early A2 — survival expansion",
                "unit_ids": ["a2-u01", "a2-u02", "a2-u03"],
            },
            {
                "band": "A2.2",
                "label": "Mid A2 — independence",
                "unit_ids": ["a2-u04", "a2-u05", "a2-u06"],
            },
            {
                "band": "A2.3",
                "label": "Late A2 — confidence",
                "unit_ids": ["a2-u07", "a2-u08", "a2-u09"],
            },
        ],
        "exam_alignment_notes": "Themes echo common civic-integration domains using original scenarios only — not exam-specific wording.",
        "source_notes": "Author: curriculum generator script; original Dutch samples; pedagogy from a2-multimodal-curriculum-design.md; 2026-03-25.",
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


INTEGRATION_SCRIPTS_SUMMARY = [
    "Neighbour and rooster chat; kennismaken in informal Dutch.",
    "Albert Heijn-style checkout, dietary phrases, paying by card.",
    "Landlord and buren messages; housing repairs vocabulary.",
    "OV desk, delays, and simple rescheduling phrases.",
    "Huisarts phone scripts; pharmacy and symptom chunks.",
    "Colleague e-mail and meeting-time phrases.",
    "Gemeente desk and DigiD vocabulary; ID appointment flow.",
    "Invitations, preferences, and casual plans with friends.",
    "Holidays, schools, and polite directness — chunk-based Dutch.",
]


def write_units():
    band_prefix = {"A2.1": "Early A2 — ", "A2.2": "Mid A2 — ", "A2.3": "Late A2 — "}
    for i, u in enumerate(UNITS):
        lid = f"a2-u{i + 1:02d}"
        lesson_ids = [f"{lid}-l{j:02d}" for j in range(1, 9)]
        band = a2_band_for_unit_index(i)
        data = {
            "id": lid,
            "cefr_level": "A2",
            "locale": "nl-NL",
            "a2_band": band,
            "title": band_prefix[band] + u["title"],
            "summary": u["summary"],
            "objectives_can_do": u["objectives_can_do"],
            "integration_scripts_summary": INTEGRATION_SCRIPTS_SUMMARY[i],
            "grammar_focus": u["grammar_focus"],
            "vocabulary_domains": u["vocabulary_domains"],
            "lesson_ids": lesson_ids,
        }
        path = os.path.join(ROOT, "units", f"{lid}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")


def write_lessons():
    failed = []
    for ui in range(9):
        for li in range(8):
            les = build_lesson(ui, li)
            path = os.path.join(ROOT, "lessons", f"{les['id']}.json")
            try:
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(les, f, ensure_ascii=False, indent=2)
                    f.write("\n")
            except OSError as e:
                failed.append((path, str(e)))
    return failed


def validate():
    import glob

    lessons = glob.glob(os.path.join(ROOT, "lessons", "*.json"))
    assert len(lessons) == 72, len(lessons)
    unit_files = glob.glob(os.path.join(ROOT, "units", "*.json"))
    assert len(unit_files) == 9, len(unit_files)
    self_check_tagged_total = 0
    for p in lessons:
        with open(p, encoding="utf-8") as f:
            json.load(f)
    # cross-check ids
    for ui, u in enumerate(UNITS):
        uid = u["id"]
        with open(os.path.join(ROOT, "units", f"{uid}.json"), encoding="utf-8") as f:
            uj = json.load(f)
        for lid in uj["lesson_ids"]:
            lp = os.path.join(ROOT, "lessons", f"{lid}.json")
            assert os.path.isfile(lp), lid
            with open(lp, encoding="utf-8") as f:
                lj = json.load(f)
            assert lj["unit_id"] == uid
            assert lj["metadata"]["archetype"] in set("ABCDEFGH")
            allowed = {"vocabulary", "grammar", "dialogue", "listening", "quiz"}
            assert lj["catalog"]["type"] in allowed
            steps = lj["lesson_plan"]["steps"]
            assert len(steps) == 8
            for i, st in enumerate(steps):
                assert st.get("learner_title"), (lid, i)
                assert st.get("skill_focus"), (lid, i, "skill_focus")
                act = st.get("activity", "")
                assert len(act) > 80, (lid, i, "activity too short")
                if i == 3 and lj["metadata"]["archetype"] != "H":
                    assert "Today's grammar" in act, (lid, "language focus must embed grammar deep-dive")
                    assert "[Goal]" not in act and "Builder notes" not in act, (lid, i)
                    ill = st.get("illustration")
                    if ill is not None:
                        assert isinstance(ill, dict), (lid, i)
                        assert ill.get("src") and ill.get("alt"), (lid, i)
                        src = ill["src"]
                        if src.startswith("/"):
                            pub_root = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")
                            rel = src.lstrip("/")
                            assert os.path.isfile(os.path.join(pub_root, rel)), (lid, "missing file", src)
                        elif not (src.startswith("http://") or src.startswith("https://")):
                            raise AssertionError((lid, "illustration src must start with / or http(s)", src))
            g5 = steps[4]["activity"]
            assert "1 —" in g5 or "1)" in g5 or "**1 —" in g5, lid
            assert "All four skills" in g5, (lid, "four-skills block")
            st7 = steps[6]
            intr = st7.get("interaction")
            assert intr and intr.get("kind") == "self_check_quiz", (lid, "step7 interaction")
            items = intr.get("items") or []
            assert len(items) >= 4, (lid, len(items))
            ped = lj.get("pedagogy") or {}
            cds = ped.get("can_do_outcomes")
            assert cds and 2 <= len(cds) <= 4, (lid, "can_do_outcomes", cds)
            gp = ped.get("grammar_primary")
            assert gp in GRAMMAR_SPINE_IDS, (lid, "grammar_primary", gp)
            for it in items:
                if isinstance(it, dict) and it.get("common_error_tags"):
                    self_check_tagged_total += 1
            voc = ped.get("target_vocabulary_lemmas") or []
            gpts = ped.get("grammar_points") or []
            for w in validate_grammar_examples_touch_expected_lemmas(ui, voc, gpts):
                print("WARN:", lid, w)
    assert self_check_tagged_total >= 10, (
        f"expected >=10 self-check items with common_error_tags, got {self_check_tagged_total}"
    )


def write_bundle():
    """Single JSON bundle for frontend import (manifest + units + lessons)."""
    mpath = os.path.join(ROOT, "manifest.json")
    with open(mpath, encoding="utf-8") as f:
        manifest = json.load(f)
    units = []
    for uid in manifest["unit_order"]:
        with open(os.path.join(ROOT, "units", f"{uid}.json"), encoding="utf-8") as f:
            units.append(json.load(f))
    lessons = []
    for u in units:
        for lid in u["lesson_ids"]:
            with open(os.path.join(ROOT, "lessons", f"{lid}.json"), encoding="utf-8") as f:
                lessons.append(json.load(f))
    bundle = {"manifest": manifest, "units": units, "lessons": lessons}
    out = os.path.join(ROOT, "catalog.bundle.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(bundle, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    os.makedirs(os.path.join(ROOT, "units"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "lessons"), exist_ok=True)
    write_manifest()
    write_units()
    failed = write_lessons()
    if failed:
        print("FAILED", failed)
        return
    validate()
    write_bundle()
    print("OK: manifest, 9 units, 72 lessons, catalog.bundle.json")


if __name__ == "__main__":
    main()
