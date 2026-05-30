# Learner-facing lesson step bodies for A2 nl-NL (no meta-authoring jargon in `activity`).
from __future__ import annotations

from a2_curriculum_schema import pronunciation_spotlight_block
from a2_grammar_modules import (
    STEP8_CULTURE_ENRICHMENT,
    four_skills_round_markdown,
    grammar_deep_dive_markdown,
    grammar_goal_one_line,
    pronunciation_tip_for_lesson,
)

# Friendly catalog / step labels by archetype (stable, not index-rotated)
ARCH_LEARNER_LABEL = {
    "A": "Listen & read",
    "B": "Patterns & drills",
    "C": "Real-life task",
    "D": "Listening",
    "E": "Reading",
    "F": "Writing",
    "G": "Speaking",
    "H": "Culture & context",
}

# Step 8 “Dutch culture insight”: four rotating angles per unit (lesson_index % 4).
UNIT_CULTURE_CLOSERS: list[tuple[str, str, str, str]] = [
    (  # u01 People & daily rhythm
        "Many Dutch people **plan social visits** a day or more ahead; dropping by unannounced is less common than in "
        "some cultures. A short app (*“Ben je vanavond thuis?”*) is normal and friendly.",
        "**Agenda culture** shows up in everyday language: *Hoe laat*, *afspraak*, and *in de pauze* pop up in offices "
        "and schools. Being a few minutes late usually gets a quick *Sorry, vertraging* rather than a long excuse.",
        "Weekend rhythm often mixes **chores, sport, and gezelligheid**: markets, terraces, or *een stukje fietsen*. "
        "Saying *Fijne weekend!* on Friday is standard in shops and at work.",
        "**Punctuality** for trains and classes is valued, but social time can be looser. *Ongeveer*, *rond*, and "
        "*een beetje later* help you sound natural when plans are soft.",
    ),
    (  # u02 Food & shopping
        "**Albert Heijn**, **Jumbo**, **Lidl**, and **Dirk** are everyday names; many people shop several times a week "
        "for fresh bread and veg. Bringing your own bag is normal; bottle returns (*statiegeld*) at the machine are "
        "part of the routine.",
        "At the bakery or cheese counter, **Dank u** / **Alstublieft** and clear eye contact go a long way. "
        "Staff may switch to *je* if you sound relaxed; mirroring their *u* / *je* is a safe habit.",
        "**Tikkie** (payment requests between friends) is everywhere after shared dinners or trips. Saying "
        "*Ik stuur je een Tikkie* is ordinary, not stingy.",
        "Markets and **weekly offers** (*aanbieding*, *1+1 gratis*) are small-talk fuel. Commenting on the weather "
        "while queuing is classic Dutch small talk.",
    ),
    (  # u03 Housing & neighbourhood
        "**Huisregels** and **rust na 22:00** appear in many flats; neighbours often solve small issues with a short "
        "chat before involving the landlord. A calm *Goedemorgen* in the stairwell goes a long way.",
        "**Waste sorting** colours differ by gemeente; wrong bags can mean the truck leaves them behind. When in "
        "doubt, ask *Welke kleur zak voor plastic hier?*",
        "Renting usually means **registration at the gemeente** (*inschrijven*) and sometimes a housing inspection "
        "checklist. Keeping photos of meter readings is a practical tip newcomers hear often.",
        "**Balkon rules** and shared laundry slots sound boring until you need them. The word *buren* covers "
        "everyone from best friends to people you only nod to.",
    ),
    (  # u04 Transport & city
        "**OV-chipkaart** and contactless check-in/out are standard; forgetting *uitchecken* can cost extra. "
        "*Vertraging* announcements are part of life; *De trein rijdt niet* is worth recognising by ear.",
        "Cyclists have strong norms: **bellen**, *rechts houden*, and not stopping on a busy bike path. "
        "Pedestrian zones (*voetgangersgebied*) still have bikes sometimes, so stay alert.",
        "Apps like **9292** or the NS planner are referenced constantly. Saying *Ik moet overstappen* is a very normal "
        "commuter sentence.",
        "In cities, **parking and blue zones** (*betaald parkeren*) confuse almost everyone once. Reading the small "
        "sign (*ma–za 09:00–21:00*) saves fines.",
    ),
    (  # u05 Health & body
        "The **huisarts** gatekeeps most care; for non-emergencies you often need that referral first. "
        "**112** is for life-threatening emergencies; *Huisartsenpost* handles urgent evenings/weekends in many regions.",
        "**Apotheek** staff explain *hoe vaak* and *met eten* patiently; repeating back dosage (*drie keer per dag*) "
        "shows you understood.",
        "Calling in sick (*ziek melden*) is usually short and factual: *Ik ben ziek vandaag* plus expected return if "
        "you know it. Long emotional explanations are less common than in some workplaces.",
        "Sport and **bewegen** are mainstream small talk. *Ik ga naar de fysio* or *Ik moet meer stappen* are easy "
        "ways to bond lightly.",
    ),
    (  # u06 Work & study
        "Emails often open with **Goedemorgen** / **Goedemiddag** + the name; closings use *Met vriendelijke groet* "
        "or a shorter *Groet* among close colleagues. Subject lines stay concrete.",
        "**Lunch** is often 30 minutes; some teams eat together, others at desks. *Mag ik iets te eten halen?* is a "
        "polite way to duck out.",
        "**Part-time** work is common; *vast* vs *tijdelijk* contracts matter for benefits. Asking *Hoeveel uur per "
        "week?* is normal when comparing jobs.",
        "**Hybrid** patterns (*thuiswerken*, *op kantoor*) show up in planning talk. *Laten we een Teams-link delen* "
        "reflects everyday office Dutch.",
    ),
    (  # u07 Services & admin
        "**DigiD** unlocks many gemeente tasks online; without it you queue with ID and proof of address. "
        "*Afspraak maken* beats walking in cold in many cities.",
        "At the desk, calm, short sentences win: *Ik wil me inschrijven* + documents ready. Staff may switch to "
        "English if they sense stress; answering partly in Dutch is still appreciated.",
        "**Paspoort**, **ID**, **BSN**, and **verblijfsvergunning** are vocabulary you hear in real queues. "
        "Photocopies (*kopie*) are sometimes needed even when you have scans.",
        "PostNL and **track-and-trace** texts are everyday reading practice. *Niet thuis?* often means a neighbour "
        "or pickup point (*afhaalpunt*).",
    ),
    (  # u08 Leisure & media
        "**Netflix**, **NPO**, and **podcasts** mix with *omroep* talk. Subtitles (*ondertiteling*) help learners; "
        "many Dutch people watch English shows with Dutch subs.",
        "**Verjaardagen** at work mean *taart* in the break room and a circle of handshakes or three kisses "
        "(region and generation vary). *Gefeliciteerd!* is your all-purpose word.",
        "Sports clubs (*vereniging*) and **vrijwilligerswerk** structure social life outside cities. *Lid worden* "
        "sometimes means intro evenings and modest fees.",
        "Weekend plans often include **terras**, **festival**, or *gewoon thuis*. *Zin om …?* is the casual invite "
        "you will hear constantly.",
    ),
    (  # u09 Culture & integration context
        "**Koningsdag** orange, **Sinterklaas** debates, and **kerst** traditions differ by family; curiosity beats "
        "assumptions. *Hoe vieren jullie …?* is a respectful opener.",
        "**Direct** feedback can sound blunt in Dutch but often aims at clarity, not rudeness. *Eerlijk gezegd* "
        "signals straight talk is coming.",
        "**Borrel** culture mixes work and neighbours: a drink, bitterballen, and going home on time. "
        "*Ik moet de trein halen* is an accepted exit line.",
        "Integration courses stress both **language** and **local habits**: waste rules, GP registration, and school "
        "communication. Asking *Wat is hier normaal?* shows respect and buys patience.",
    ),
]


def culture_closer_for_lesson(unit_index: int, lesson_index: int) -> str:
    row = UNIT_CULTURE_CLOSERS[unit_index % len(UNIT_CULTURE_CLOSERS)]
    return row[lesson_index % 4]


# Model answers for step 2 warm-up prompt **Wat deed je gisteren?** (one per unit, thematic A2 Dutch).
WARM_UP_EXAMPLES = [
    (
        "Gisteren werkte ik tot vijf uur. Daarna fietste ik naar huis en kookte ik een eenvoudige maaltijd. "
        "'s Avonds las ik nog even en ging ik op tijd naar bed."
    ),
    (
        "Gisteren ging ik naar de supermarkt en kocht ik brood en groente. 's Middags maakte ik een salade "
        "en 's avonds at ik met een vriend in een klein restaurant."
    ),
    (
        "Gisteren belde ik de verhuurder over een klein probleem. Daarna deed ik boodschappen in de buurt "
        "en ruimde ik de keuken op."
    ),
    (
        "Gisteren nam ik de bus naar het centrum en wisselde ik één keer over. Ik was een beetje te laat, "
        "maar ik stuurde een appje: *Sorry, ik ben zo daar.*"
    ),
    (
        "Gisteren voelde ik me niet zo goed en bleef ik thuis. Ik dronk veel thee en rustte 's middags even. "
        "'s Avonds ging het al wat beter."
    ),
    (
        "Gisteren had ik een drukke dag op kantoor. Na het werk maakte ik aantekeningen voor een cursus "
        "en belde ik een collega kort."
    ),
    (
        "Gisteren ging ik naar de **gemeente** voor een afspraak. Daarna deed ik een kopie van een document "
        "en postte ik een brief."
    ),
    (
        "Gisteren keek ik een serie en las ik een artikel online. Later belde ik mijn zus en we spraken "
        "over het weekend."
    ),
    (
        "Gisteren sprak ik met een vriend over **Koningsdag** en Nederlandse tradities. We dronken koffie "
        "en wandelden een half uur door de buurt."
    ),
]


def archetype_slot_in_unit(rot: list[str], lesson_index: int, arch: str) -> int:
    """Which occurrence of this archetype in the unit (0-based)."""
    n = 0
    for i in range(lesson_index + 1):
        if rot[i] == arch:
            if i == lesson_index:
                return n
            n += 1
    return 0


def _fmt_dialogue(lines: list[tuple[str, str]]) -> str:
    out = []
    for who, text in lines:
        out.append(f"**{who}:** {text}")
    return "\n\n".join(out)


# Three variant dialogues per unit for archetype A (input); Netherlands Dutch, original.
A_DIALOGUES: list[list[str]] = [
    [  # u01 People
        _fmt_dialogue(
            [
                ("Sam", "Hoi! Ik heet Sam. Ik kom uit Berlijn en ik woon nu in Utrecht."),
                ("Mila", "Leuk! Ik ben Mila. Ik werk in een café en ik studeer 's avonds Nederlands."),
                ("Sam", "Wat doe jij meestal in het weekend?"),
                ("Mila", "Vaak fiets ik naar vrienden. Soms blijf ik thuis en kijk ik een serie."),
                ("Sam", "Ik ga graag naar de markt op zaterdag."),
                ("Mila", "Gezellig! Tot gauw, dan drinken we koffie."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Docent", "Goedemorgen. Wie wil eerst iets over zichzelf vertellen?"),
                ("Jin", "Ik werk vier dagen op kantoor. Op woensdag werk ik thuis."),
                ("Docent", "En hoe laat begin je meestal?"),
                ("Jin", "Om half negen. Ik drink eerst koffie en daarna check ik mijn e-mail."),
                ("Docent", "Dank je. Dat is een duidelijk ritme."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Moeder", "Lieverd, hoe laat ben je morgen thuis voor het eten?"),
                ("Tiener", "Rond half zeven, denk ik. Ik heb training."),
                ("Moeder", "Prima. We eten warm om zeven uur."),
                ("Tiener", "Oké. Mag ik daarna nog even huiswerk doen?"),
                ("Moeder", "Ja, maar om tien uur rust, goed?"),
            ]
        ),
    ],
    [  # u02 Food
        _fmt_dialogue(
            [
                ("Klant", "Goedemiddag. Waar vind ik de lactosevrije yoghurt?"),
                ("Medewerker", "Gangpad 5, rechts. Er is ook plantaardige kaas bij de koeling."),
                ("Klant", "Dank u. En heeft u deze week aanbieding op appels?"),
                ("Medewerker", "Ja, een kilo voor twee euro, bij de groente."),
                ("Klant", "Perfect. Dan neem ik ook een mandje."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Bakker", "Goedemorgen! Wat mag het zijn?"),
                ("Klant", "Twee bruine bolletjes en een croissant, alstublieft."),
                ("Bakker", "Wil je ze gesneden?"),
                ("Klant", "Nee, heel is goed. Betaal ik met pin?"),
                ("Bakker", "Ja hoor. Dat wordt drie euro vijftig."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Vriend", "Ik eet geen vlees meer. Weet jij een goed vegetarisch restaurant?"),
                ("Jij", "Ja, bij het station is een klein eethuis. Ze hebben ook vegan opties."),
                ("Vriend", "Top. Zullen we vrijdag om half zeven afspreken?"),
                ("Jij", "Prima. Ik reserveer even online."),
            ]
        ),
    ],
    [  # u03 Housing
        _fmt_dialogue(
            [
                ("Buur", "Hoi, ik ben nieuw hier. Mag ik de containers voor plastic vragen?"),
                ("Buurvrouw", "Zeker. Gele bak buiten, links van de ingang. Papier is blauw."),
                ("Buur", "Bedankt! En mag ik 's avonds stofzuigen?"),
                ("Buurvrouw", "Tot 22:00 is het meestal oké. Daarna liever rust."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Huurder", "Er zit een kleine lek bij het raam. Kunnen jullie iemand sturen?"),
                ("Verhuurder", "Stuur een foto via het portaal. We plannen een monteur deze week."),
                ("Huurder", "Oké. Moet ik thuis zijn?"),
                ("Verhuurder", "Nee, met een sleutelkluis kan het ook. We mailen een tijdslot."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Partner", "De slaapkamer is klein, maar het licht is fijn."),
                ("Jij", "Ja, en de keuken is nieuw. We missen alleen een boekenplank."),
                ("Partner", "Dan gaan we zaterdag naar de IKEA."),
                ("Jij", "Goed idee. Eerst ontbijt, daarna rijden we."),
            ]
        ),
    ],
    [  # u04 Transport
        _fmt_dialogue(
            [
                ("Reiziger", "Excuseer, welke bus gaat naar het ziekenhuis?"),
                ("Chauffeur", "Lijn 28, perron B. U moet bij 'Centrum' overstappen."),
                ("Reiziger", "Hoe duurt dat ongeveer?"),
                ("Chauffeur", "Met overstap een klein half uur. Vergeet niet in te checken."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Collega", "De trein heeft twintig minuten vertraging."),
                ("Jij", "Oei. Stuur je een app als je later bent?"),
                ("Collega", "Ja, ik kom rond tien over half. Start jij zonder mij?"),
                ("Jij", "Geen probleem. We bewaren een plek."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Vriendin", "Parkeer je hier of neem je de tram?"),
                ("Jij", "Tram 4. Er is weinig plek en parkeren is duur."),
                ("Vriendin", "Slim. We treffen elkaar bij de hoofdingang."),
            ]
        ),
    ],
    [  # u05 Health
        _fmt_dialogue(
            [
                ("Apotheker", "Goedemiddag. Waarmee kan ik helpen?"),
                ("Klant", "Ik heb hoofdpijn en een lichte koorts sinds gisteren."),
                ("Apotheker", "Paracetamol is geschikt. Drink genoeg water en rust."),
                ("Klant", "Moet ik naar de huisarts?"),
                ("Apotheker", "Bij hoge koorts of klachten langer dan drie dagen: bel uw huisarts."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Assistent", "Huisartsenpost, goedenavond."),
                ("Beller", "Mijn kind heeft koorts en wil niet eten."),
                ("Assistent", "Hoe oud is uw kind en sinds wanneer?"),
                ("Beller", "Zes jaar, sinds vanmiddag. 38,5 graden."),
                ("Assistent", "Bel uw eigen huisarts morgenochtend. Bij ademnood of bewusteloosheid: bel 112."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Patiënt", "Mijn keel doet zeer als ik slik."),
                ("Arts", "Open uw mond even… Het ziet er rood uit. Veel thee en rust."),
                ("Patiënt", "Mag ik sporten?"),
                ("Arts", "Liever deze week licht. Als het beter voelt, mag het weer."),
            ]
        ),
    ],
    [  # u06 Work
        _fmt_dialogue(
            [
                ("Manager", "Kunnen we de deadline naar vrijdag verschuiven?"),
                ("Jij", "Ja, als ik hulp krijg bij het testen."),
                ("Manager", "Dan vraag ik Lisa om mee te kijken. Stuur een korte update in Teams."),
                ("Jij", "Prima. Ik stuur vandaag nog een concept."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Collega", "Heb je zin om mee te lunchen?"),
                ("Jij", "Graag, maar ik heb om twaalf een call. Om half een?"),
                ("Collega", "Past. Dan pakken we iets bij de kantine."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Stagebegeleider", "Hoe vind je je eerste week?"),
                ("Stagiair", "Leuk, maar ik moet nog veel termen leren."),
                ("Stagebegeleider", "Vraag gerust. Schrijf onbekende woorden in je notities."),
            ]
        ),
    ],
    [  # u07 Admin
        _fmt_dialogue(
            [
                ("Balie", "Goedemorgen. U wilt inschrijven?"),
                ("Inwoner", "Ja, ik ben verhuisd. Wat heb ik nodig?"),
                ("Balie", "Identiteitsbewijs en een adresbewijs van de laatste drie maanden."),
                ("Inwoner", "Kan ik een afspraak online maken?"),
                ("Balie", "Ja, met DigiD op onze website. Anders help ik u hier."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Klant", "Ik heb een nieuwe pinpas nodig. De oude is kapot."),
                ("Bankmedewerker", "Geen probleem. Identiteitsbewijs, alstublieft. De nieuwe pas komt binnen vijf dagen."),
                ("Klant", "Moet ik mijn rekeningnummer weten?"),
                ("Bankmedewerker", "Nee, dat staat bij ons. U tekent hier even."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Postmedewerker", "Waar gaat dit pakket naartoe?"),
                ("Klant", "Naar Spanje. Hoeveel kost verzending?"),
                ("Postmedewerker", "Met track & trace is het veertien euro. Zonder trace goedkoper, maar langzamer."),
                ("Klant", "Dan neem ik trace. Het is een cadeau."),
            ]
        ),
    ],
    [  # u08 Social
        _fmt_dialogue(
            [
                ("Vriend", "Zin om zondag naar het museum te gaan?"),
                ("Jij", "Ja! Welk tijdstip?"),
                ("Vriend", "Om elf uur, dan is het rustig. Daarna koffie?"),
                ("Jij", "Perfect. Ik koop de tickets online."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Teamgenoot", "Hoe vond je de wedstrijd gisteren?"),
                ("Jij", "Spannend! De tweede helft was beter."),
                ("Teamgenoot", "Eens. Zullen we volgende week weer trainen?"),
                ("Jij", "Dinsdag past mij."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Nieuwe buur", "Hoi, ik woon nu op 3B. Ik geef zaterdag een klein feestje, rustig muziek."),
                ("Jij", "Leuk! Hoe laat ongeveer?"),
                ("Nieuwe buur", "Van vijf tot tien. Je bent welkom voor een drankje."),
            ]
        ),
    ],
    [  # u09 Culture
        _fmt_dialogue(
            [
                ("Gids", "Op Koningsdag dragen veel mensen oranje kleding."),
                ("Toerist", "Wat gebeurt er op straat?"),
                ("Gids", "Kinderen verkopen spullen op de vrijmarkt. Er is muziek en soms een optocht."),
                ("Toerist", "Moet ik contant geld meenemen?"),
                ("Gids", "Handig voor kleine aankopen. Veel kraampjes accepteren ook Tikkie."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Ouder", "Op de basisschool krijgen we berichten via de ouderapp."),
                ("Andere ouder", "Wij ook. Soms is er ouderavond over huiswerk."),
                ("Ouder", "En wie spreek je bij problemen?"),
                ("Andere ouder", "Eerst de leerkracht, daarna de directie. Alles rustig en direct."),
            ]
        ),
        _fmt_dialogue(
            [
                ("Trainer", "Nederlanders plannen graag. Een appje van tevoren is normaal."),
                ("Deelnemer", "En als ik iets last-minute afzeg?"),
                ("Trainer", "Geef het zo snel mogelijk door. 'Sorry, het lukt niet' is oké."),
            ]
        ),
    ],
]


# Archetype C — unit-themed “too blunt” messages (original Dutch).
C_TASK_MESSAGES: list[tuple[str, str]] = [
    (  # u01 work / classmates
        "Hoi, je bent steeds te laat op maandag. Fix dit.",
        "*Hi, you're always late on Monday. Fix this.*",
    ),
    (  # u02 shop
        "Jullie kaas was beschimmeld. Ik wil nu geld terug. Spoed.",
        "*Your cheese was mouldy. I want money back now. Urgent.*",
    ),
    (  # u03 housing / landlord
        "Hoi verhuurder, de verwarming doet het niet. Kom snel. Groet, Sam.",
        "*Hi landlord, the heating doesn't work. Come quickly. Cheers, Sam.*",
    ),
    (  # u04 travel
        "OV, mijn check-in was fout. Los het op. Ik betaal niet dubbel.",
        "*PT, my check-in was wrong. Fix it. I'm not paying double.*",
    ),
    (  # u05 health
        "Ik wil vandaag dokter. Zonder afspraak. Nu.",
        "*I want the doctor today. Without an appointment. Now.*",
    ),
    (  # u06 work
        "Stuur dat bestand vandaag. Geen excuses. Groet.",
        "*Send that file today. No excuses. Regards.*",
    ),
    (  # u07 admin
        "Gemeente, ik heb geen zin in wachten. Geef meteen een paspoort.",
        "*Municipality, I don't feel like waiting. Give a passport immediately.*",
    ),
    (  # u08 social
        "Kom om zeven. Geen discussie. Ik bepaal.",
        "*Come at seven. No discussion. I decide.*",
    ),
    (  # u09 culture
        "Leg uit waarom Nederland altijd gelijk heeft. Snel.",
        "*Explain why the Netherlands is always right. Quickly.*",
    ),
]


def _first_snippet_line(text: str | None) -> str:
    if not text:
        return ""
    cleaned = text.replace("**", "")
    for raw in cleaned.split("\n"):
        s = raw.strip()
        if len(s) > 12 and not s.startswith("|") and not s.startswith("*In "):
            return s[:220]
    return cleaned.strip()[:220]


def build_rich_steps(
    unit_index: int,
    lesson_index: int,
    arch: str,
    goal_plain: str,
    culture_in_focus: bool,
    rot: list[str],
    unit_title: str,
    voc: list[str],
    grammar: list[dict],
    listening_script: str | None,
    reading_text: str | None,
    writing_prompt_nl: str | None,
    speaking_hint: str | None,
    culture_note: str,
    next_lesson_teaser: str,
    grammar_primary: str,
) -> list[dict]:
    u = unit_title
    slot_a = archetype_slot_in_unit(rot, lesson_index, "A")
    vline = "\n".join(f"• **{w}**" for w in voc[:8])
    g_blocks = []
    for gp in grammar[:3]:
        ens = " / ".join(gp.get("examples_nl", [])[:2])
        ees = " / ".join(gp.get("examples_en", [])[:2])
        g_blocks.append(f"**{gp['point']}**\n• NL: {ens}\n• EN: {ees}")
    grammar_text = "\n\n".join(g_blocks) if g_blocks else ""

    w1 = voc[0] if voc else "werk"
    w2 = voc[1] if len(voc) > 1 else "huis"
    w3 = voc[2] if len(voc) > 2 else "vandaag"
    g1 = grammar[0]["examples_nl"][0] if grammar and grammar[0].get("examples_nl") else "Ik werk vandaag thuis."

    goal_sentence = goal_plain[0].upper() + goal_plain[1:] if goal_plain else ""
    ggoal = grammar_goal_one_line(grammar_primary)

    # --- Step 1 Goal ---
    step1 = {
        "step": 1,
        "learner_title": "Your goal",
        "activity": (
            "Welcome! This lesson is built in small steps so you always know where you are.\n\n"
            f"**What you'll be able to do:** {goal_sentence}\n\n"
            f"**Grammar thread today:** {ggoal} — you'll get explanations, examples, and production tasks in "
            "**Language focus** and **Guided practice**.\n\n"
            "Take your time — you can repeat any step. Try to say at least one Dutch sentence out loud today."
        ),
        "teacher_notes": "Keep under ~1 min; reassure anxious learners.",
        "visual_ascii": None,
    }

    # --- Step 2 Warm-up ---
    step2: dict = {
        "step": 2,
        "learner_title": "Warm-up",
        "activity": (
            f"Let's wake up vocabulary about **{u}**.\n\n"
            "Words you might use today:\n"
            f"{vline}\n\n"
            "**Your turn (1–2 short sentences, Dutch or mixed):**\n"
            "**Wat deed je gisteren?** — *What did you do yesterday?*\n\n"
            "If you only know a few words, that's fine — start there."
        ),
        "teacher_notes": "Accept partial Dutch; encourage gestures.",
        "visual_ascii": None,
        "example_response": WARM_UP_EXAMPLES[unit_index % len(WARM_UP_EXAMPLES)],
    }
    if unit_index == 0:
        step2["illustration"] = {
            "src": "/curriculum/nl-NL/A2/illustrations/u01-day-rhythm.svg",
            "alt": "Diagram of a day: morning (coffee), afternoon (work or study), evening (rest)",
            "width": 400,
            "height": 120,
        }
    elif unit_index == 3:
        step2["illustration"] = {
            "src": "/curriculum/nl-NL/A2/illustrations/u04-ov-route.svg",
            "alt": "Simple route from A to B with a transfer stop in the middle and OV label",
            "width": 400,
            "height": 132,
        }

    # --- Step 3 Input ---
    dlg_for_snip = ""
    if arch == "A":
        dlg = A_DIALOGUES[unit_index][slot_a % len(A_DIALOGUES[unit_index])]
        dlg_for_snip = dlg
        inp = (
            "**Listen & read** this short conversation. Read twice: first for gist, then for details.\n\n"
            f"{dlg}\n\n"
            "**Gist check:** Who are the people, and what is the situation?\n"
            "**Detail check:** Note one time phrase or place you recognise."
        )
    elif arch == "D" and listening_script:
        dlg_for_snip = listening_script
        inp = (
            "**Listening focus**\n\n"
            "Play the audio twice if you can (slow speed first is fine).\n\n"
            "**Transcript** (read along on the second listen):\n\n"
            f"{listening_script}\n\n"
            "**While you listen:** underline in your mind who wants what and any numbers you hear."
        )
    elif arch == "E" and reading_text:
        dlg_for_snip = reading_text
        inp = (
            "**Reading focus**\n\n"
            "Read this real-life style text slowly.\n\n"
            f"{reading_text}\n\n"
            "**After reading:** in one English sentence, what is this text mainly about?"
        )
    elif arch == "F":
        inp = (
            "**Model message (Dutch)**\n\n"
            "Subject: Vraag over bon\n\n"
            "Goedemiddag,\n\n"
            "Gisteren heb ik boodschappen gedaan bij uw winkel. "
            "Ik mis de bon in mijn tas. Kunt u een kopie mailen?\n\n"
            "Met vriendelijke groet,\n"
            "[jouw naam]\n\n"
            "**Notice:** polite opening, short problem, clear request, closing."
        )
        if writing_prompt_nl:
            inp += f"\n\n**Later you will write:** {writing_prompt_nl}"
    elif arch == "G":
        frames = speaking_hint or (
            "**A:** Mag ik je iets vragen? **B:** Natuurlijk.\n"
            "**A:** Hoe laat …? **B:** Om …\n"
        )
        inp = (
            "**Speaking setup (you can stay text-only)**\n\n"
            "You are practising short exchanges. Read both roles aloud, then swap.\n\n"
            f"{frames}\n\n"
            "Tip: add **alstublieft** / **dank u wel** in formal situations."
        )
    elif arch == "H":
        inp = (
            "**Culture snapshot — the Netherlands**\n\n"
            f"{culture_note}\n\n"
            "**Mini text (Dutch):**\n"
            "In veel appartementen staat een huisregel: na 22:00 rust op de gang. "
            "Buren lossen kleine problemen vaak eerst met een kort gesprek.\n\n"
            "*In many flats there is a rule: quiet in the corridor after 22:00. "
            "Neighbours often solve small issues with a short chat first.*"
        )
    elif arch == "B":
        inp = (
            "**Input — patterns**\n\n"
            "Below are sentences from this theme. They show word order you can copy.\n\n"
            f"{grammar_text}\n\n"
            "Read them aloud once, slowly."
        )
    elif arch == "C":
        nl_c, en_c = C_TASK_MESSAGES[unit_index % len(C_TASK_MESSAGES)]
        dlg_for_snip = nl_c
        inp = (
            "**Mini situation**\n\n"
            "You get a short message that sounds a bit too direct in Dutch. "
            "Your job in the next steps is to choose a polite fix.\n\n"
            "**Message (Dutch):**\n"
            f"{nl_c}\n\n"
            f"*{en_c}*\n\n"
            "We will upgrade the tone without changing the facts."
        )
    else:
        dlg = A_DIALOGUES[unit_index][lesson_index % 3]
        dlg_for_snip = dlg
        inp = (
            "**Listen & read**\n\n"
            f"{dlg}\n\n"
            "Underline any word you want to remember for later."
        )

    step3 = {
        "step": 3,
        "learner_title": "Listen & read" if arch in "ADE" else ("Model text" if arch == "F" else "Situation"),
        "activity": inp,
        "teacher_notes": "Optional slow audio for D/A.",
        "visual_ascii": None,
    }
    if arch == "D":
        step3["illustration"] = {
            "src": "/curriculum/nl-NL/A2/illustrations/listening-focus.svg",
            "alt": "Headphones icon suggesting focused listening before reading the transcript",
            "width": 320,
            "height": 100,
        }

    listen_snip = (
        _first_snippet_line(listening_script) if listening_script else _first_snippet_line(dlg_for_snip)
    )
    read_snip = _first_snippet_line(reading_text) if reading_text else _first_snippet_line(dlg_for_snip)
    if not listen_snip.strip():
        listen_snip = g1
    if not read_snip.strip():
        read_snip = g1

    global_lesson_i = unit_index * 8 + lesson_index
    pron_every = pronunciation_tip_for_lesson(global_lesson_i)
    extra_pron = pronunciation_spotlight_block(unit_index, lesson_index) or ""

    # --- Step 4 Focus ---
    culture_para = ""
    if culture_in_focus and arch != "H":
        culture_para = (
            f"\n\n**Culture tip:** {culture_note}\n"
            "*How does this compare with where you live? One sentence in your own words.*"
        )
    deep = grammar_deep_dive_markdown(grammar_primary) if arch != "H" else ""
    pron_block = f"**Pronunciation (listen + repeat)**\n{pron_every}\n"
    if extra_pron:
        pron_block += f"\n{extra_pron}\n"

    focus_body = ""
    if arch != "H":
        focus_body = (
            f"{deep}\n\n"
            f"{pron_block}\n"
            "**Language focus — patterns you can reuse**\n\n"
            f"{grammar_text}\n\n"
            "**Try this:** pick one Dutch sentence above and change only the time or the person "
            "(ik → wij / vandaag → morgen), **or** do the “Produce” task from the grammar box above.\n"
            f"{culture_para}"
        )
    if arch == "H":
        focus_body = (
            f"{pron_block}\n"
            "**Useful phrases for talking about customs**\n\n"
            "• **In Nederland …** — In the Netherlands …\n"
            "• **Bij ons …** — Where I'm from …\n"
            "• **Mag ik vragen …?** — May I ask …?\n\n"
            f"**Context:** {culture_note}\n\n"
            "**Say or write:** one respectful question you could ask a Dutch friend about a tradition."
        )
    step4 = {
        "step": 4,
        "learner_title": "Language focus",
        "activity": focus_body,
        "teacher_notes": "Max 2–3 patterns at A2.",
        "visual_ascii": None,
    }

    # --- Step 5 Guided practice (concrete tasks) ---
    guided_core = f"""**1 — Match** (say the pairs out loud)
• **{w1}** ↔ a word you connect with daily life
• **{w2}** ↔ a place or thing from this unit

**2 — Gap-fill**
Complete: Ik _____ om acht uur. *(opstaan → stem: Ik **sta** … **op**)*

**3 — Mini dialogue**
**A:** Hoe laat ben je klaar? **B:** Om half zes, denk ik.

**4 — Find the odd one**
Which word fits *least* with this unit: **{w3}**, **broodje**, **trein**? Why?

**5 — True / false**
Say **waar** or **niet waar**: "In Dutch, the verb often moves when you ask a yes/no question."

**6 — Your sentence**
Write one true sentence about yourself using **{w1}** or **{w2}**.

**7 — Transform**
Make this informal line a bit more formal: "Kun je me helpen?" → start with **Kunt u …**

**8 — Quick translation check**
"{g1}" — what does it mean in English (your own words)?"""

    if arch == "D":
        guided_core = f"""**1 — Before listening:** guess three words you might hear (write them).

**2 — Gist:** is this about work, family, travel, or shopping?

**3 — Numbers:** write every number or time you hear in the script.

**4 — Who:** who takes which action (choose: A / B / both)?

**5 — Polite or informal:** find one **u**-sentence and one **je/jij**-sentence.

**6 — Paraphrase:** in English, one sentence — what do they want?

**7 — Shadowing:** read one speaker's lines aloud with the transcript.

**8 — New chunk:** pick one phrase to use in your own week.

**Script reminder:**\n{listening_script or "(see transcript in previous step)"}"""

    if arch == "E" and reading_text:
        guided_core = f"""**1 — Headline:** give this thread a title in English (max 6 words).

**2 — Times:** list every time or date you see.

**3 — Who must do what?** One sentence in English.

**4 — Gap-fill from text:** "De lift is morgen … voor onderhoud." *(from context)*

**5 — Problem / solution:** what is the problem and what is suggested?

**6 — Word guess:** what might **onderhoud** mean?

**7 — True / false:** "Everyone is angry in this chat."

**8 — Your reply:** write one short Dutch sentence you could post in this group.

**Text:**\n{reading_text}"""

    if arch == "F":
        guided_core = """**1 — Label the parts:** opening / problem / request / closing in the model email.

**2 — Gap-fill:** Met vriendelijke ______, [naam].

**3 — Politeness:** choose softer Dutch: **Ik wil** → **Ik zou graag willen** in one sentence.

**4 — Combine:** Link with **want**: *Ik bel morgen, want ik ben vandaag druk.*

**5 — Shorten:** remove three words without losing the message.

**6 — Checklist tick:** subject line clear? closing present?

**7 — Your details:** replace [naam] and add one real detail from your life.

**8 — Read aloud:** read your draft slowly."""

    if arch == "G":
        guided_core = """**1 — Choral read:** read role A, then B, then swap.

**2 — Slot-fill:** **A:** Mag ik …? **B:** **Natuurlijk**, …

**3 — Add one polite word** to each turn.

**4 — Branch:** B says "Helaas, ik kan niet." — how does A answer kindly?

**5 — Write three lines** at the gemeente desk (text only).

**6 — Opinion:** **Ik vind … leuk, want …** finish it.

**7 — Invite:** suggest a time with **Zullen we … om …?**

**8 — Self-check:** did you use **u** where needed?"""

    if arch == "C":
        guided_core = """**1 — Tone:** which line feels too blunt for a landlord?

**2 — Rewrite opening** with **Goedemiddag** + **met vriendelijke groet** at the end.

**3 — Add one sentence** with the reason: *want de verwarming uitvalt bij kou.*

**4 — Choose best closing:** A) Groetjes B) Met vriendelijke groet C) Doei

**5 — Word order:** fix: *Ik wil graag een afspraak morgen.*

**6 — Scenario match:** pick phrase: **Ik meld een storing.**

**7 — Read aloud** your improved message.

**8 — Check:** is the request clear in one glance?"""

    if arch == "H":
        guided_core = f"""**1 — Match:** Koningsdag — orange / Sinterklaas — December gifts / kerst — family meal (discuss).

**2 — Institution:** where do you register an address? *(hint: **gemeente**)*

**3 — Sort:** "Direct can still be polite" — **waar / niet waar**?

**4 — Gist:** what is **rust** on a building notice about?

**5 — Reflect:** one difference between your country and NL (English ok).

**6 — Gap-fill:** In Nederland fietsen veel mensen, _____ het is plat.

**7 — Scenario:** friend cancels last minute — what do many Dutch people appreciate?

**8 — Your question in Dutch:** **Mag ik vragen hoe …?** finish it.

**Culture reminder:** {culture_note}"""

    guided_core += four_skills_round_markdown(arch, w1, g1, listen_snip, read_snip, grammar_primary)

    step5 = {
        "step": 5,
        "learner_title": "Guided practice",
        "activity": guided_core,
        "teacher_notes": "Mix modalities; at least 6 tasks — all concrete above.",
        "visual_ascii": None,
    }

    # --- Step 6 Freer ---
    bank = "\n".join(f"• {w}" for w in voc[:12])
    freer = (
        "**Phrase bank (use freely)**\n"
        f"{bank}\n\n"
        "**Your task:** Write or say **4–6 short sentences** in Dutch about this unit theme.\n"
        "Rules: include **at least one question** and one connector (**en**, **maar**, or **want**).\n\n"
        "**Example starter (you can change it):**\n"
        f"Vandaag … Ik wil … **want** … **En jij?**"
    )
    if arch == "F":
        freer = (
            f"**Writing task**\n\n{writing_prompt_nl or 'Write a polite e-mail in Dutch (6–8 sentences).'}\n\n"
            "**Phrase bank:**\n"
            f"{bank}\n\n"
            "**Checklist before you finish:**\n"
            "• Clear subject or first line\n• Polite greeting\n• Short paragraphs\n• **Met vriendelijke groet** + name"
        )
    if arch == "G":
        freer = (
            "**Speaking task (text is fine — voice optional)**\n\n"
            "Write a **6-line** dialogue between you and a neighbour or colleague. "
            "Use the frames from step 3 and at least three words from the bank.\n\n"
            f"**Phrase bank:**\n{bank}"
        )

    step6 = {
        "step": 6,
        "learner_title": "Your turn — freer practice",
        "activity": freer,
        "teacher_notes": "Encourage intelligibility over perfection.",
        "visual_ascii": None,
    }

    # --- Step 7 Check (interactive in app via interaction.self_check_quiz) ---
    step7 = {
        "step": 7,
        "learner_title": "Check your learning",
        "activity": (
            "**Quick self-check**\n\n"
            "Try each question, then tap **Check answer**. The correct answer stays hidden until you submit.\n\n"
            "**Tip:** Say Dutch options out loud if that helps.\n\n"
            "**Afterwards:** If three or more felt easy, open **Quiz** for a short recap. "
            "If not, go back to **Guided practice** once more."
        ),
        "teacher_notes": "Rendered with interactive UI when interaction is present.",
        "visual_ascii": None,
        "interaction": {
            "kind": "self_check_quiz",
            "items": [
                {
                    "id": "q1",
                    "type": "multiple_choice",
                    "prompt": "Pick the best reply when someone says **Hoe gaat het?**",
                    "options": [
                        {"id": "a", "label": "Tot ziens"},
                        {"id": "b", "label": "Goed, dank je!"},
                        {"id": "c", "label": "Graag gedaan"},
                    ],
                    "correctOptionId": "b",
                    "feedbackCorrect": "Nice — this is a natural, friendly reply.",
                    "feedbackIncorrect": "**Tot ziens** is goodbye; **Graag gedaan** fits after *dank je*. After *Hoe gaat het?* people often say how they feel, e.g. **Goed, dank je!**",
                },
                {
                    "id": "q2",
                    "type": "gap_fill",
                    "prompt": "Complete: **Ik ___ Nederlands sinds januari.**",
                    "hint": "Present tense of *leren* (to learn), 1st person singular.",
                    "acceptableAnswers": ["leer", "ik leer"],
                    "answerDisplay": "leer",
                    "feedbackCorrect": "Yes — *Ik leer Nederlands sinds januari.*",
                    "feedbackIncorrect": "The present of *leren* (ik-form) is **leer**.",
                },
                {
                    "id": "q3",
                    "type": "multiple_choice",
                    "prompt": "Which opening sounds **more formal** when you talk to a stranger or in a shop?",
                    "options": [
                        {"id": "kun", "label": "Kun je me helpen?"},
                        {"id": "kunt", "label": "Kunt u me helpen?"},
                    ],
                    "correctOptionId": "kunt",
                    "feedbackCorrect": "Right — **u** + verb form (*Kunt u…*) is the usual polite pattern.",
                    "feedbackIncorrect": "**Kunt u** with *u* is more formal; **Kun je** is fine with friends.",
                },
                {
                    "id": "q4",
                    "type": "true_false",
                    "prompt": "In Dutch, yes/no questions often put the **verb before the subject** (e.g. *Ga je mee?*).",
                    "correct": True,
                    "feedbackCorrect": "Correct — verb-first order is typical for yes/no questions.",
                    "feedbackIncorrect": "This is **true**: many yes/no questions start with the verb.",
                },
                {
                    "id": "q5",
                    "type": "reflect",
                    "prompt": f"Say or write **one new sentence** using **{w1}**.",
                    "exampleAnswer": f"Example: *Ik wil graag {w1} met mijn nieuwe buren.* (adjust to your situation.)",
                },
            ],
        },
    }

    # --- Step 8 Bridge ---
    culture_closer = culture_closer_for_lesson(unit_index, lesson_index)
    culture_pack = STEP8_CULTURE_ENRICHMENT[unit_index % len(STEP8_CULTURE_ENRICHMENT)]
    step8 = {
        "step": 8,
        "learner_title": "Before you go",
        "activity": (
            "**Nice work.**\n\n"
            f"{next_lesson_teaser}\n\n"
            "**2-minute revision:** skim the phrase bank from step 6 once more.\n\n"
            "When you're ready, open **Quiz** for a compact recap — or **Flashcards** for the lemmas.\n\n"
            "**Dutch culture insight**\n\n"
            f"{culture_closer}"
            f"{culture_pack}"
            "*Optional reflection:* In one English sentence, what feels similar or different where you live?"
        ),
        "teacher_notes": "Link to next lesson id in CMS when wired.",
        "visual_ascii": None,
    }

    return [step1, step2, step3, step4, step5, step6, step7, step8]


# Engaging subtitle lines per archetype (8 each); pick by unit + lesson so titles vary in a unit.
ARCH_ENGAGING: dict[str, tuple[str, ...]] = {
    "A": (
        "Catch real Dutch in short, friendly chats",
        "Who said what? Listen, read, respond",
        "Mini-dialogues from everyday life",
        "Gist first—then hunt the details",
        "The voices you meet on an ordinary day",
        "Ears and eyes on realistic turns",
        "Names, places & plans in context",
        "Conversation routines you can reuse",
    ),
    "B": (
        "Grammar patterns you will reuse tomorrow",
        "Verb & chunk practice that sticks",
        "Word order without the headache",
        "Drills that prep you for freer speech",
        "Tidy sentences—step by small step",
        "Forms you will hear again and again",
        "Quick-fire patterns on the bus",
        "From fixed lines to flexible Dutch",
    ),
    "C": (
        "Fix a polite message—real stakes",
        "Choose tone: blunt or buffered?",
        "Small real-world fixes, Dutch style",
        "The right line in the right channel",
        "Requests, tweaks, one clear goal",
        "When manners matter as much as grammar",
        "A task you could send today",
        "Polite endings that land well",
    ),
    "D": (
        "Audio deep dive—numbers & intent",
        "Slow it down; catch every clue",
        "Who wants what? Train your ear",
        "Natural speed: you have the script",
        "Listen twice—trust the second pass",
        "Details you only hear if you wait",
        "Voices, fillers, real rhythm",
        "From gist to proof in one clip",
    ),
    "E": (
        "Read threads & signs like a local",
        "Scan fast—then nail the point",
        "Real text: chats, notes, blurbs",
        "Words-on-the-wall Dutch",
        "Skim for gist; zoom for facts",
        "Short reads, useful chunks",
        "Everyday genres in the wild",
        "When the message is not a textbook",
    ),
    "F": (
        "Emails & apps: polite & clear",
        "Model first—then make it yours",
        "Openings, closings, the bit between",
        "Write something you could hit send on",
        "Tone down drama; tone up clarity",
        "Six lines that feel Dutch-professional",
        "Requests that do not sound rude",
        "Edit until it reads effortless",
    ),
    "G": (
        "Dialogue frames for real encounters",
        "Text-first speaking—build courage",
        "Lines for the desk, door, or street",
        "Scripts you can loosen later",
        "Role A / B until it feels easy",
        "Polite swaps you will use weekly",
        "Confidence in short turns",
        "Say it out loud—then shorten it",
    ),
    "H": (
        "Holidays, habits & what is normal here",
        "Institutions: how things usually work",
        "Unspoken rules you will bump into",
        "Culture, not trivia—why it matters",
        "Ask better questions about NL life",
        "Compare without judging—useful prep",
        "Traditions vary; curiosity wins",
        "Etiquette that saves awkward moments",
    ),
}


def catalog_title_for_lesson(unit_index: int, lesson_index: int, arch: str, unit_full_title: str) -> tuple[str, str]:
    """Return (title, description). Title is short—unit name lives on the path, not repeated here."""
    label = ARCH_LEARNER_LABEL[arch]
    variants = ARCH_ENGAGING[arch]
    engaging = variants[(unit_index + lesson_index) % len(variants)]
    title = f"{label} · {engaging}"
    desc = (
        f"{engaging} · A2 {label.lower()} in “{unit_full_title}”: Dutch you can use the same week, "
        "guided steps, and a short check at the end."
    )
    return title, desc
