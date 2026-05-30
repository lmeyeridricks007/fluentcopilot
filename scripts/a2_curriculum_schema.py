# ruff: noqa: E501
"""A2 nl-NL curriculum schema helpers: grammar spine IDs, step metadata, thematic grammar banks."""
from __future__ import annotations

# IDs must match docs/curriculum/a2-grammar-spine.md
GRAMMAR_SPINE_IDS: frozenset[str] = frozenset(
    {
        "a2.1-present-tense",
        "a2.1-main-clause-word-order",
        "a2.1-separable-verbs",
        "a2.1-modals-requests",
        "a2.1-imperatives-service",
        "a2.1-comparatives-opinions",
        "a2.1-er-locative",
        "a2.1-possessives",
        "a2.2-motion-and-prepositions",
        "a2.2-future-gaan",
        "a2.2-time-clauses-basic",
        "a2.2-reflexives-health",
        "a2.2-perfectum-short",
        "a2.2-om-te-purpose",
        "a2.3-polite-conditional",
        "a2.3-relative-die-dat",
        "a2.3-subordinate-want-omdat",
        "a2.3-preferences-graag",
        "a2.3-formal-email-register",
        "a2.3-impersonal-men",
        "a2.3-culture-register",
    }
)

# Per unit, 8 lessons → primary spine id (stable lesson index order)
GRAMMAR_PRIMARY_BY_LESSON: list[list[str]] = [
    # u01 People & daily rhythm — A2.1
    [
        "a2.1-present-tense",
        "a2.1-main-clause-word-order",
        "a2.1-separable-verbs",
        "a2.1-present-tense",
        "a2.1-main-clause-word-order",
        "a2.1-separable-verbs",
        "a2.1-present-tense",
        "a2.1-main-clause-word-order",
    ],
    # u02 Food & shopping
    [
        "a2.1-modals-requests",
        "a2.1-imperatives-service",
        "a2.1-comparatives-opinions",
        "a2.1-modals-requests",
        "a2.1-imperatives-service",
        "a2.1-comparatives-opinions",
        "a2.1-modals-requests",
        "a2.1-comparatives-opinions",
    ],
    # u03 Housing
    [
        "a2.1-er-locative",
        "a2.1-possessives",
        "a2.1-er-locative",
        "a2.1-possessives",
        "a2.1-er-locative",
        "a2.1-possessives",
        "a2.1-er-locative",
        "a2.1-possessives",
    ],
    # u04 Transport — A2.2
    [
        "a2.2-motion-and-prepositions",
        "a2.2-future-gaan",
        "a2.2-time-clauses-basic",
        "a2.2-motion-and-prepositions",
        "a2.2-future-gaan",
        "a2.2-time-clauses-basic",
        "a2.2-motion-and-prepositions",
        "a2.2-future-gaan",
    ],
    # u05 Health
    [
        "a2.2-reflexives-health",
        "a2.2-perfectum-short",
        "a2.2-reflexives-health",
        "a2.2-perfectum-short",
        "a2.2-reflexives-health",
        "a2.2-perfectum-short",
        "a2.2-reflexives-health",
        "a2.2-perfectum-short",
    ],
    # u06 Work
    [
        "a2.2-om-te-purpose",
        "a2.2-perfectum-short",
        "a2.2-om-te-purpose",
        "a2.3-formal-email-register",
        "a2.2-om-te-purpose",
        "a2.2-perfectum-short",
        "a2.2-om-te-purpose",
        "a2.3-formal-email-register",
    ],
    # u07 Admin — A2.3
    [
        "a2.3-polite-conditional",
        "a2.3-relative-die-dat",
        "a2.3-polite-conditional",
        "a2.3-relative-die-dat",
        "a2.3-polite-conditional",
        "a2.3-formal-email-register",
        "a2.3-polite-conditional",
        "a2.3-relative-die-dat",
    ],
    # u08 Social
    [
        "a2.3-subordinate-want-omdat",
        "a2.3-preferences-graag",
        "a2.3-subordinate-want-omdat",
        "a2.3-preferences-graag",
        "a2.3-subordinate-want-omdat",
        "a2.3-preferences-graag",
        "a2.3-subordinate-want-omdat",
        "a2.3-preferences-graag",
    ],
    # u09 Culture
    [
        "a2.3-culture-register",
        "a2.3-impersonal-men",
        "a2.3-culture-register",
        "a2.3-impersonal-men",
        "a2.3-culture-register",
        "a2.3-impersonal-men",
        "a2.3-culture-register",
        "a2.3-impersonal-men",
    ],
]

# Expected theme lemmas per unit (subset of generator vocab_slice bases) — grammar examples should echo these.
EXPECTED_LEMMAS_PER_UNIT: list[list[str]] = [
    ["ontbijt", "rooster", "afspraak", "familie"],
    ["boodschappen", "kassa", "bonuskaart", "vegetarisch"],
    ["huur", "buren", "sleutel", "borg"],
    ["OV-chipkaart", "inchecken", "vertraging", "overstap"],
    ["huisarts", "apotheek", "verkouden", "koorts"],
    ["collega", "vergadering", "deadline", "thuiswerken"],
    ["gemeente", "DigiD", "afspraak", "paspoort"],
    ["uitnodigen", "bioscoop", "sporten", "vriendengroep"],
    ["Koningsdag", "traditie", "integratie", "borrel"],
]

# Hand-authored can-do outcomes for unit 1 (template); 8 lessons × 3 bullets
CAN_DO_OUTCOMES_U01: list[list[str]] = [
    [
        "Understand gist and one detail in a short dialogue about daily rhythm",
        "Recognise present-tense chunks about workdays and weekends",
        "Say or write one sentence about your own typical day",
    ],
    [
        "Produce clear yes/no questions about time and plans",
        "Swap subject and verb confidently in simple questions",
        "Ask one polite follow-up about someone else's schedule",
    ],
    [
        "Use a separable verb correctly in a short line about routines",
        "Hear or read where the particle goes in present tense",
        "Fix one word-order mistake in a given routine sentence",
    ],
    [
        "Follow a listening clip about people and habits with script support",
        "Note at least one time expression and who it refers to",
        "Paraphrase the situation in one English sentence",
    ],
    [
        "Scan a short authentic-style text for times and names",
        "Answer a detail question using words from the thread",
        "Post one appropriate short reply in Dutch (guided)",
    ],
    [
        "Write or type 4–6 sentences about your week using unit lemmas",
        "Include one question and one connector (en/maar/want)",
        "Self-check punctuation and polite openings",
    ],
    [
        "Hold a short text-based exchange using greeting and time frames",
        "Switch between informal **je** and careful **u** where appropriate",
        "Close with a natural Dutch leave-taking phrase",
    ],
    [
        "Name one Dutch habit around planning or punctuality",
        "Use **Mag ik vragen …?** in a respectful culture question",
        "Compare one point with your own country in plain English",
    ],
]


def grammar_primary_for_lesson(unit_index: int, lesson_index: int) -> str:
    return GRAMMAR_PRIMARY_BY_LESSON[unit_index][lesson_index]


def thematic_grammar_bank(unit_index: int, grammar_focus: list[str], voc: list[str], lesson_index: int) -> list[dict]:
    """Themed NL/EN examples per unit — avoids repeating the same generic trio everywhere."""
    # Pools: align with first three grammar_focus strings when possible
    pools = THEMATIC_GRAMMAR_POOLS[unit_index]
    out = []
    for i, gp in enumerate(grammar_focus[:3]):
        row = pools[i % len(pools)]
        # lightly rotate displayed examples with lesson_index
        n = len(row["examples_nl"])
        off = lesson_index % n
        ens = [row["examples_nl"][(off + j) % n] for j in range(min(2, n))]
        ees = [row["examples_en"][(off + j) % n] for j in range(min(2, n))]
        out.append({"point": gp, "examples_nl": ens, "examples_en": ees})
    # ensure at least one voc lemma appears in examples (tie-break)
    if voc:
        joined = " ".join(" ".join(x.get("examples_nl", [])) for x in out).lower()
        if not any(w.lower() in joined for w in voc[:6]):
            extra = voc[0]
            if out:
                out[0]["examples_nl"] = (out[0].get("examples_nl") or []) + [f"Ik praat vandaag over {extra}."]
                out[0]["examples_en"] = (out[0].get("examples_en") or []) + [f"Today I'm talking about {extra}."]
    return out


# Nine units × three rotating grammar rows (examples tie to unit theme)
THEMATIC_GRAMMAR_POOLS: list[list[dict]] = [
    [  # u01
        {
            "examples_nl": ["Ik werk vier dagen op kantoor.", "We hebben vanavond een afspraak bij vrienden."],
            "examples_en": ["I work four days in the office.", "We have an appointment with friends tonight."],
        },
        {
            "examples_nl": ["Ga je morgen naar je cursus?", "Hoe laat sta jij meestal op?"],
            "examples_en": ["Are you going to your class tomorrow?", "What time do you usually get up?"],
        },
        {
            "examples_nl": ["Ik ruim de keuken op na het eten.", "Zet je de wekker vroeg voor je rooster?"],
            "examples_en": ["I tidy the kitchen after dinner.", "Do you set the alarm early for your schedule?"],
        },
    ],
    [  # u02
        {
            "examples_nl": ["Ik wil graag halfvolle melk.", "Mag ik een bon, alstublieft?"],
            "examples_en": ["I'd like semi-skimmed milk.", "May I have a receipt, please?"],
        },
        {
            "examples_nl": ["Neemt u een mandje bij de ingang.", "Kiest u pin of contant?"],
            "examples_en": ["Take a basket at the entrance.", "Choose card or cash?"],
        },
        {
            "examples_nl": ["Deze kaas is iets goedkoper vandaag.", "Ik vind vers brood lekkerder dan uit de diepvries."],
            "examples_en": ["This cheese is a bit cheaper today.", "I prefer fresh bread to frozen."],
        },
    ],
    [  # u03
        {
            "examples_nl": ["Er is een kleine lek in de badkamer.", "Er zijn twee fietsenstallingen bij het flatgebouw."],
            "examples_en": ["There is a small leak in the bathroom.", "There are two bike sheds by the block."],
        },
        {
            "examples_nl": ["Onze huur is inclusief servicekosten.", "Jouw sleutel ligt op de keukentafel."],
            "examples_en": ["Our rent includes service charges.", "Your key is on the kitchen table."],
        },
        {
            "examples_nl": ["De buren wonen boven ons appartement.", "Ik bel de verhuurder over het plafond."],
            "examples_en": ["The neighbours live above our flat.", "I'm calling the landlord about the ceiling."],
        },
    ],
    [  # u04
        {
            "examples_nl": ["Ik ga met de bus naar het station.", "We reizen van Utrecht naar Amsterdam."],
            "examples_en": ["I'm taking the bus to the station.", "We're travelling from Utrecht to Amsterdam."],
        },
        {
            "examples_nl": ["We gaan morgen naar het museum.", "Ik ga vanavond uit eten met een vriend."],
            "examples_en": ["We're going to the museum tomorrow.", "I'm going out for dinner with a friend tonight."],
        },
        {
            "examples_nl": ["Als de trein vertraging heeft, stuur ik een appje.", "Wanneer je incheckt, vergeet niet uit te checken."],
            "examples_en": ["If the train is delayed, I'll send a text.", "When you check in, don't forget to check out."],
        },
    ],
    [  # u05
        {
            "examples_nl": ["Ik voel me vandaag niet zo goed.", "Je wast je handen voor het eten."],
            "examples_en": ["I don't feel so well today.", "You wash your hands before eating."],
        },
        {
            "examples_nl": ["Gisteren had ik koorts en een zere keel.", "Ik ben naar de huisartsenpraktijk gebeld."],
            "examples_en": ["Yesterday I had a fever and a sore throat.", "I called the GP practice."],
        },
        {
            "examples_nl": ["De assistent vraagt of ik paracetamol verdraag.", "Ik heb vandaag al drie liter water gedronken."],
            "examples_en": ["The assistant asks if I tolerate paracetamol.", "I've already drunk three litres of water today."],
        },
    ],
    [  # u06
        {
            "examples_nl": ["Ik bel om een afspraak te maken.", "We mailen om de deadline te bevestigen."],
            "examples_en": ["I'm calling to make an appointment.", "We're emailing to confirm the deadline."],
        },
        {
            "examples_nl": ["Ik heb het verslag gisteren afgerond.", "Ben je op tijd bij de vergadering gekomen?"],
            "examples_en": ["I finished the report yesterday.", "Did you get to the meeting on time?"],
        },
        {
            "examples_nl": ["Goedemorgen, ik werk vandaag thuis.", "Met vriendelijke groet, …"],
            "examples_en": ["Good morning, I'm working from home today.", "Kind regards, …"],
        },
    ],
    [  # u07
        {
            "examples_nl": ["Ik zou graag een afspraak willen voor een ID-kaart.", "Zou u dit formulier kunnen controleren?"],
            "examples_en": ["I'd like an appointment for an ID card.", "Could you check this form?"],
        },
        {
            "examples_nl": ["Het document dat u nodig heeft, staat online.", "De pasfoto die ik meeneem, is recent."],
            "examples_en": ["The document you need is online.", "The passport photo I'm bringing is recent."],
        },
        {
            "examples_nl": ["Ik moet mijn adres bij de gemeente wijzigen.", "Zonder DigiD loop ik naar het loket."],
            "examples_en": ["I have to change my address at the municipality.", "Without DigiD I go to the desk."],
        },
    ],
    [  # u08
        {
            "examples_nl": ["Ik ga mee naar de film, want ik heb zin.", "We blijven thuis, omdat het regent."],
            "examples_en": ["I'm coming to the film because I feel like it.", "We're staying home because it's raining."],
        },
        {
            "examples_nl": ["Ik ga liever met de fiets naar het station.", "We drinken graag koffie op het terras."],
            "examples_en": ["I'd rather cycle to the station.", "We like having coffee on the terrace."],
        },
        {
            "examples_nl": ["Zullen we zaterdag om half zeven afspreken?", "Ik nodig je uit voor een borrel."],
            "examples_en": ["Shall we meet Saturday at half past six?", "I'm inviting you for drinks."],
        },
    ],
    [  # u09
        {
            "examples_nl": ["Mag ik vragen hoe jullie Koningsdag vieren?", "In Nederland dragen sommige mensen oranje."],
            "examples_en": ["May I ask how you celebrate King's Day?", "In the Netherlands some people wear orange."],
        },
        {
            "examples_nl": ["Je spreekt hier vaak rustig aan bij de balie.", "Men plant sociale afspraken vaak een dag van tevoren."],
            "examples_en": ["Here people often address the desk calmly.", "People often plan social meetups a day ahead."],
        },
        {
            "examples_nl": ["Fijne feestdagen en tot volgend jaar!", "Integratie is taal én gewoontes leren."],
            "examples_en": ["Happy holidays and see you next year!", "Integration is language and learning habits."],
        },
    ],
]


def can_do_outcomes_for_lesson(unit: dict, unit_index: int, lesson_index: int, arch: str) -> list[str]:
    if unit_index == 0:
        return CAN_DO_OUTCOMES_U01[lesson_index]
    obs = unit["objectives_can_do"]
    a = obs[lesson_index % len(obs)]
    b = obs[(lesson_index + 2) % len(obs)]
    arch_tail = {
        "A": "Follow a short exchange in this theme and reuse one chunk.",
        "B": "Apply the lesson grammar point in controlled drills.",
        "C": "Fix tone and clarity in a short real-life message.",
        "D": "Track details in a longer clip using the transcript.",
        "E": "Extract gist and one supporting detail from a short text.",
        "F": "Write a short practical message with a clear request.",
        "G": "Produce a short spoken or text dialogue with polite frames.",
        "H": "Link cultural context to memorisable Dutch phrases.",
    }.get(arch, "Complete the lesson tasks at A2 level.")
    out = [a, b, arch_tail]
    return out[:4]


def a2_band_for_unit_index(unit_index: int) -> str:
    if unit_index < 3:
        return "A2.1"
    if unit_index < 6:
        return "A2.2"
    return "A2.3"


def step_skill_focus(step_num: int, arch: str) -> str:
    if step_num == 1:
        return "mixed"
    if step_num == 2:
        return "speaking"
    if step_num == 3:
        if arch == "D":
            return "listening"
        if arch == "E":
            return "reading"
        if arch == "F":
            return "writing"
        if arch == "G":
            return "speaking"
        if arch == "B":
            return "grammar"
        return "mixed"
    if step_num == 4:
        return "grammar"
    if step_num == 5:
        return "mixed"
    if step_num == 6:
        if arch == "F":
            return "writing"
        if arch == "G":
            return "speaking"
        return "mixed"
    if step_num in (7, 8):
        return "review"
    return "mixed"


def step_listening_level(step_num: int, arch: str, band: str) -> str | None:
    if step_num != 3 or arch != "D":
        return None
    return {"A2.1": "slow", "A2.2": "natural_slow", "A2.3": "natural"}.get(band)


def enrich_lesson_steps(steps: list[dict], arch: str, band: str, voc: list[str]) -> None:
    """Mutates steps in place with skill_focus, optional listening_level, recycle_lemmas."""
    for st in steps:
        sn = int(st["step"])
        sf = step_skill_focus(sn, arch)
        st["skill_focus"] = sf
        ll = step_listening_level(sn, arch, band)
        if ll:
            st["listening_level"] = ll
        if sn in (2, 4, 6) and voc:
            st["recycle_lemmas"] = [voc[0], voc[min(3, len(voc) - 1)]]


PRONUNCIATION_SPOTLIGHT_LESSONS: set[tuple[int, int]] = {(0, 1), (3, 2), (6, 4)}


def pronunciation_spotlight_block(unit_index: int, lesson_index: int) -> str | None:
    if (unit_index, lesson_index) not in PRONUNCIATION_SPOTLIGHT_LESSONS:
        return None
    if unit_index == 0:
        return (
            "**Pronunciation spotlight — g / ch**\n\n"
            "Listen to the TTS, then repeat slowly: **goed — groot — licht — nacht**.\n"
            "Aim for a clear back-of-mouth **g** in *goed/groot* and a softer **ch** in *licht/nacht*.\n\n"
        )
    if unit_index == 3:
        return (
            "**Pronunciation spotlight — ui / eu / ij**\n\n"
            "Repeat: **huis — blauw — mijn — leeuw — reis**.\n"
            "Keep **ij** as one glide; round lips a little for **ui/eu**.\n\n"
        )
    if unit_index == 6:
        return (
            "**Pronunciation spotlight — sentence stress**\n\n"
            "Say: **Ik wil een AFspraak bij de gemeenTE.** — stress the content words, relax the small ones.\n"
            "Repeat twice: first exaggerated, then natural.\n\n"
        )
    return None


def integration_script_paragraph(unit_index: int, lesson_index: int, arch: str) -> str | None:
    """Extra real-life script + gloss + micro listen task (per band coverage)."""
    if unit_index == 1 and lesson_index == 0 and arch == "A":
        return (
            "\n\n---\n\n**Script — Albert Heijn (checkout)**\n\n"
            "| Dutch | English |\n|-------|--------|\n| Mag ik een bon, alstublieft? | May I have a receipt, please? |\n"
            "| Ik pin graag contactloos. | I'd like to pay contactless. |\n"
            "| Statiegeld flesjes, alstublieft. | Bottle deposit refund, please. |\n\n"
            "**Listen task:** play TTS on the Dutch column once, then cover the English and say what each line means.\n"
        )
    if unit_index == 4 and lesson_index == 3 and arch == "D":
        return (
            "\n\n---\n\n**Script — huisarts phone (fragments)**\n\n"
            "*Assistent:* Huisartsenpraktijk De Linde, goedemiddag.\n"
            "*Patiënt:* Goedemiddag, ik wil graag een afspraak. Ik ben al drie dagen verkouden.\n\n"
            "**Gloss:** *praktijk* = practice · *verkouden* = having a cold.\n"
            "**Listen task:** note one symptom and the politeness chunk you hear.\n"
        )
    if unit_index == 6 and lesson_index == 3 and arch == "D":
        return (
            "\n\n---\n\n**Script — gemeente desk**\n\n"
            "*Inwoner:* Goedemorgen, ik zou graag een afspraak willen voor een ID-kaart.\n"
            "*Balie:* Zeker. Heeft u DigiD? Zo niet, dan maak ik hier een nummer voor u.\n\n"
            "**Listen task:** what does the clerk ask first?\n"
        )
    return None


def apply_pronunciation_to_focus_step(steps: list[dict], unit_index: int, lesson_index: int) -> None:
    block = pronunciation_spotlight_block(unit_index, lesson_index)
    if not block:
        return
    for st in steps:
        if int(st["step"]) == 4:
            st["activity"] = block + st.get("activity", "")
            break


def apply_integration_script_to_input_step(
    steps: list[dict], unit_index: int, lesson_index: int, arch: str
) -> None:
    para = integration_script_paragraph(unit_index, lesson_index, arch)
    if not para:
        return
    for st in steps:
        if int(st["step"]) == 3:
            st["activity"] = st.get("activity", "") + para
            break


TAG_ROTATION = [
    ["polite_register"],
    ["verb_position"],
    ["article"],
    ["word_order"],
    ["modal_choice"],
    ["word_order", "polite_register"],
    ["verb_position", "article"],
    ["modal_choice", "word_order"],
]


def apply_common_error_tags_to_self_check(lesson: dict, unit_index: int, lesson_index: int) -> None:
    """Tag a rotating subset of self-check items for mistake-oriented review (≥10 across catalog when combined)."""
    steps = (lesson.get("lesson_plan") or {}).get("steps") or []
    for st in steps:
        intr = st.get("interaction")
        if not isinstance(intr, dict) or intr.get("kind") != "self_check_quiz":
            continue
        items = intr.get("items")
        if not isinstance(items, list):
            continue
        seed = unit_index * 8 + lesson_index
        for i, it in enumerate(items):
            if not isinstance(it, dict):
                continue
            if it.get("type") == "reflect":
                continue
            tags = TAG_ROTATION[(seed + i) % len(TAG_ROTATION)]
            if tags:
                it["common_error_tags"] = tags


def validate_grammar_examples_touch_expected_lemmas(
    unit_index: int, voc: list[str], grammar: list[dict]
) -> list[str]:
    """Return warning strings if themed examples barely overlap unit lemmas."""
    warnings: list[str] = []
    expected = [x.lower() for x in EXPECTED_LEMMAS_PER_UNIT[unit_index]]
    joined = " ".join(
        " ".join(str(x).lower() for x in (g.get("examples_nl") or [])) for g in grammar
    )
    hits = sum(1 for w in expected if w in joined)
    if hits < 1 and voc:
        hits_v = sum(1 for w in voc[:8] if w.lower() in joined)
        if hits_v < 1:
            warnings.append(f"unit {unit_index}: grammar examples may be off-theme (lemma overlap low)")
    return warnings
