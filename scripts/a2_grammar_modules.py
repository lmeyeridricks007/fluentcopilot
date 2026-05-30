# ruff: noqa: E501
"""Per-spine grammar deep-dives + four-skills block helpers for A2 lesson bodies."""
from __future__ import annotations

# Short label for review queue / step 1
GRAMMAR_PRIMARY_LABELS: dict[str, str] = {
    "a2.1-present-tense": "Present tense (regular + zijn/hebben/gaan)",
    "a2.1-main-clause-word-order": "Main clause vs yes/no question word order",
    "a2.1-separable-verbs": "Separable verbs in present (opstaan, meenemen)",
    "a2.1-modals-requests": "Modals for requests: willen, kunnen, mogen",
    "a2.1-imperatives-service": "Polite imperatives in shops (Neemt u …, Geeft u …)",
    "a2.1-comparatives-opinions": "Comparatives (beter, goedkoper, liever)",
    "a2.1-er-locative": "Er is / er zijn + place",
    "a2.1-possessives": "Possessives (mijn, jouw, onze)",
    "a2.2-motion-and-prepositions": "Motion + prepositions (naar, met, van … naar …)",
    "a2.2-future-gaan": "Future plans with gaan + infinitive",
    "a2.2-time-clauses-basic": "Time clauses with als / wanneer (simple)",
    "a2.2-reflexives-health": "Reflexive verbs (zich voelen, zich wassen)",
    "a2.2-perfectum-short": "Perfectum (hebben/zijn + voltooid deelwoord)",
    "a2.2-om-te-purpose": "Purpose with om … te",
    "a2.3-polite-conditional": "Polite requests with zou … willen/kunnen",
    "a2.3-relative-die-dat": "Short relative clauses (die / dat)",
    "a2.3-subordinate-want-omdat": "Reason clauses: want / omdat + word order",
    "a2.3-preferences-graag": "Preferences: graag, liever, ik vind … leuk",
    "a2.3-formal-email-register": "Formal e-mail openers and closings",
    "a2.3-impersonal-men": "General statements (men / je / veel mensen …)",
    "a2.3-culture-register": "Fixed phrases for traditions and comparison",
}


PRONUNCIATION_TIPS: tuple[str, ...] = (
    "**Pronunciation — g / ch:** practise *goed — licht — dag — nacht* with TTS; back *g* vs softer *ch*.",
    "**Pronunciation — ui / eu / ij:** round lips for *huis — leeuw*; *mijn* is one smooth glide.",
    "**Pronunciation — sch / sj:** *school* vs *sjabloon* — listen twice, then shadow.",
    "**Pronunciation — stress:** stress content words: *Ik wil een afspraak maken* (not every syllable equal).",
    "**Pronunciation — rhythm:** short chunks: *van de — naar het — met een* — run them together softly.",
    "**Pronunciation — final -n:** *eten, gaan* — don’t swallow the *-n* completely in careful speech.",
    "**Pronunciation — v / f:** *vandaag, vier* — light *v*, not English *w*.",
)


def pronunciation_tip_for_lesson(global_lesson_index: int) -> str:
    return PRONUNCIATION_TIPS[global_lesson_index % len(PRONUNCIATION_TIPS)]


# Full deep-dive blocks: rule (EN) + patterns (NL) + production (EN instructions)
_GRAMMAR_DEEP: dict[str, str] = {
    "a2.1-present-tense": """**Today's grammar — present tense (A2 core)**

**Rule (English):** Dutch present often looks like English *I work / we have*, but irregulars (*zijn, hebben, gaan*) and *jij* forms need attention.

**Patterns to copy (Dutch):**
• *Ik werk vandaag thuis.* · *Wij hebben een afspraak.* · *Ga je mee naar de supermarkt?*

**Produce (do now):**
1. Change *Ik werk* → *Wij werken* with the same time phrase.
2. Ask one yes/no question with the verb first: *Heb je …?* or *Ga je …?*""",
    "a2.1-main-clause-word-order": """**Today's grammar — statement vs question order**

**Rule:** In neutral statements the verb sits **after** the subject (*Ik ga morgen*). In yes/no questions the verb often moves **before** the subject (*Ga je morgen?*).

**Patterns:**
• *Ik bel je straks.* · *Bel je me straks?* · *We eten om zeven.* · *Eten jullie om zeven?*

**Produce:**
1. Turn *We gaan naar het station* into a question (verb first).
2. Turn *Kom je vanavond?* into a calm statement (subject + verb).""",
    "a2.1-separable-verbs": """**Today's grammar — separable verbs**

**Rule:** Many verbs split: **prefix** goes to the end in present main clauses (*Ik **sta** om zeven **op***).

**Patterns:**
• *Ik ruim de keuken op.* · *Zet je de wekker uit?* · *Bel je me later terug?*

**Produce:**
1. Put *opstaan* in a sentence about tomorrow morning (correct split).
2. Fix: *Ik opsta om zes* → correct order.""",
    "a2.1-modals-requests": """**Today's grammar — modals (requests & permission)**

**Rule:** *Willen* (want), *kunnen* (can), *mogen* (may) + infinitive at the end: *Ik **wil** graag **betalen***.

**Patterns:**
• *Mag ik een bon?* · *Kunt u me helpen?* · *Ik kan vandaag niet komen.*

**Produce:**
1. Ask permission with *Mag ik …?* for something you need in a shop.
2. Polite *Kunt u …* vs informal *Kun je …* — write one of each.""",
    "a2.1-imperatives-service": """**Today's grammar — polite imperatives (service Dutch)**

**Rule:** Staff often use *u* + verb: *Neemt u …*, *Wacht u even*. You mirror their *u* / *je*.

**Patterns:**
• *Neemt u een mandje.* · *Geeft u mij een kassabon.* · *Betaalt u contactloos.*

**Produce:**
1. Write one polite request you might hear at a counter.
2. Reply with *Ja, graag* or *Nee, dank u* appropriately.""",
    "a2.1-comparatives-opinions": """**Today's grammar — comparatives & short opinions**

**Rule:** *-er* often marks comparison (*goedkoper*, *beter*). *Dan* compares: *lekkerder **dan***.

**Patterns:**
• *Dit brood is verser.* · *Ik vind thee lekkerder dan koffie.*

**Produce:**
1. Compare two products in one Dutch sentence (*…er dan …*).
2. Say what you prefer this week using *Ik vind …*.""",
    "a2.1-er-locative": """**Today's grammar — *er* + place**

**Rule:** *Er is / er zijn* introduces existence; prepositions pin location (*in, op, naast*).

**Patterns:**
• *Er is een lift.* · *Er zijn twee fietsenstallingen.* · *De sleutel ligt op tafel.*

**Produce:**
1. Describe your home with *Er is …* / *Er zijn …*.
2. Add one place preposition (*naast de deur*).""",
    "a2.1-possessives": """**Today's grammar — possessives**

**Rule:** *mijn, jouw, zijn, haar, ons/onze, jullie* agree in a natural way with the following noun (*onze huur*).

**Patterns:**
• *Onze buren zijn rustig.* · *Jouw paspoort ligt in de la.*

**Produce:**
1. Two true sentences: *mijn …* and *onze / jullie …*.
2. Ask whose object it is: *Wiens … is dit?* (or *Van wie is …?*).""",
    "a2.2-motion-and-prepositions": """**Today's grammar — motion + prepositions**

**Rule:** *naar* (towards), *met* (by/with), *van … naar …* for routes.

**Patterns:**
• *Ik ga met de bus naar het centrum.* · *We fietsen van huis naar het station.*

**Produce:**
1. Describe one real trip with *van … naar …*.
2. Add *met de trein / met de auto*.""",
    "a2.2-future-gaan": """**Today's grammar — future with *gaan***

**Rule:** *gaan + infinitive* plans near future: *Ik **ga** morgen **werken***.

**Patterns:**
• *We gaan zaterdag naar de markt.* · *Ga je vanavond mee?*

**Produce:**
1. Three plans for next week with *gaan*.
2. One negative: *Ik ga niet …* + reason with *want*.""",
    "a2.2-time-clauses-basic": """**Today's grammar — *als* / *wanneer* (simple)**

**Rule:** Keep the first clause manageable: *Als ik laat ben, …* — main clause follows familiar word order.

**Patterns:**
• *Als het regent, blijf ik thuis.* · *Wanneer je klaar bent, stuur je een appje.*

**Produce:**
1. One *Als …, …* sentence about transport or work.
2. One *Wanneer …* sentence (keep both parts short).""",
    "a2.2-reflexives-health": """**Today's grammar — reflexives (body & health)**

**Rule:** *zich* changes with subject (*ik voel **me***, *je wast **je***).

**Patterns:**
• *Ik voel me niet goed.* · *Ik heb me verkouden.* · *Wast je handen alsjeblieft.*

**Produce:**
1. Say how you feel with *Ik voel me …*.
2. One sentence for a simple hygiene / health habit.""",
    "a2.2-perfectum-short": """**Today's grammar — perfectum (short)**

**Rule:** *hebben/zijn + voltooid deelwoord* for completed experiences: *Ik **heb** gewerkt*, *Ik **ben** gekomen*.

**Patterns:**
• *Gisteren heb ik boodschappen gedaan.* · *Ben je op tijd gekomen?*

**Produce:**
1. One sentence: what you did yesterday (*gisteren heb ik …*).
2. One question with *heb je …* or *ben je …*.""",
    "a2.2-om-te-purpose": """**Today's grammar — *om … te* (purpose)**

**Rule:** *Ik bel **om** een afspraak **te** maken.* Infinitive at the end.

**Patterns:**
• *We mailen om de tijd te bevestigen.* · *Ik kom om een vraag te stellen.*

**Produce:**
1. Why you call the gemeente or GP in one *om … te* sentence.
2. Second sentence with a different verb.""",
    "a2.3-polite-conditional": """**Today's grammar — softening with *zou***

**Rule:** *Ik zou graag … willen/kunnen* sounds careful at desks and on the phone.

**Patterns:**
• *Ik zou graag een afspraak willen.* · *Zou u dat kunnen herhalen?*

**Produce:**
1. One formal request with *Ik zou graag …*.
2. One follow-up: *Zou u … kunnen …?*""",
    "a2.3-relative-die-dat": """**Today's grammar — *die* / *dat* (short relatives)**

**Rule:** *Het formulier **dat** u nodig heeft* — *de pasfoto **die** u meeneemt*.

**Patterns:**
• *Het document dat online staat.* · *De bon die ik zoek.*

**Produce:**
1. Combine two short ideas with one *die/dat* clause.
2. Read aloud slowly — stress the noun, not every function word.""",
    "a2.3-subordinate-want-omdat": """**Today's grammar — *want* vs *omdat***

**Rule:** *want* keeps main word order in the second clause; *omdat* pushes the verb to the end (*omdat ik moe **ben***).

**Patterns:**
• *Ik blijf thuis, want ik ben ziek.* · *Ik blijf thuis, omdat ik ziek ben.*

**Produce:**
1. Same idea twice: once with *want*, once with *omdat* (keep it short).
2. Say which feels easier for you to hear in fast speech.""",
    "a2.3-preferences-graag": """**Today's grammar — *graag*, *liever*, opinions**

**Rule:** *Ik ga graag naar …* · *Ik ga liever met de fiets* — soft opinions without fighting.

**Patterns:**
• *Ik drink graag koffie.* · *Ik vind borrels gezellig.*

**Produce:**
1. *Ik ga liever … dan …* about weekend plans.
2. Invite someone with *Zin om …?* + time.""",
    "a2.3-formal-email-register": """**Today's grammar — formal e-mail frame**

**Rule:** *Geachte mevrouw/meneer*, concrete subject, *Met vriendelijke groet*.

**Patterns:**
• *Geachte mevrouw Jansen,* … *Met vriendelijke groet,*

**Produce:**
1. Write opening + one-line purpose + closing (placeholders ok).
2. Replace *Hoi* with a formal opener in a given line.""",
    "a2.3-impersonal-men": """**Today's grammar — general statements**

**Rule:** *In Nederland …* · *Veel mensen …* · *Je …* (one) — useful for culture talk without blaming.

**Patterns:**
• *In Nederland fietsen veel mensen.* · *Je spreekt hier rustig aan bij de balie.*

**Produce:**
1. One neutral sentence about a habit with *In Nederland …*.
2. One careful question: *Mag ik vragen of …?*""",
    "a2.3-culture-register": """**Today's grammar — culture chunks**

**Rule:** Fixed phrases beat abstract essays: *Mag ik vragen …?* · *Bij ons …* · *Hoe vieren jullie …?*

**Patterns:**
• *Eerlijk gezegd …* · *Ik wil geen gedoe maken, maar …*

**Produce:**
1. Ask one respectful question about a Dutch tradition.
2. Compare with *Bij ons is dat anders, want …* (short).""",
}


def grammar_deep_dive_markdown(grammar_primary: str) -> str:
    return _GRAMMAR_DEEP.get(
        grammar_primary,
        f"**Today's grammar focus:** `{grammar_primary}` — follow the themed examples below and copy one pattern aloud.",
    )


def grammar_goal_one_line(grammar_primary: str) -> str:
    return GRAMMAR_PRIMARY_LABELS.get(grammar_primary, grammar_primary)


def four_skills_round_markdown(
    arch: str,
    lemma: str,
    example_nl: str,
    listen_line: str,
    read_line: str,
    grammar_primary: str,
) -> str:
    """Appended to guided practice — every lesson gets L/R/W/S micro-tasks."""
    listen_target = listen_line.strip()[:200] if listen_line.strip() else example_nl
    read_target = read_line.strip()[:220] if read_line.strip() else example_nl
    g_short = grammar_goal_one_line(grammar_primary)
    return f"""
---

**All four skills — finish this lesson with these four micro-tasks**

🎧 **Listening:** Use TTS on this Dutch line (slow, then closer to natural): *{listen_target}*

📖 **Reading:** Read silently, then say the **main idea in one English sentence**: *{read_target}*

✍️ **Writing:** Write **one new Dutch sentence** that uses **{lemma}** and fits *{g_short}*.

🗣️ **Speaking:** Read your new sentence **aloud twice** — exaggerate stress the first time, normal the second.

*(If this lesson was already heavy on one skill, treat that skill as “extra reps” — the point is you always touch all four.)*
"""


STEP8_CULTURE_ENRICHMENT: list[str] = [
    # u01 — people & rhythm
    (
        "\n\n**Phrases to steal (Dutch → English)**\n\n"
        "| Dutch | English |\n|-------|--------|\n"
        "| *Ben je vanavond thuis?* | Are you home tonight? |\n"
        "| *Zullen we een afspraak maken?* | Shall we set a time? |\n"
        "| *Sorry, ik ben een beetje te laat.* | Sorry, I'm a little late. |\n\n"
        "**Mini dialogue**\n\n"
        "**A:** Hé, heb je zin om zaterdag koffie te drinken?\n"
        "**B:** Ja, leuk! Hoe laat ongeveer?\n"
        "**A:** Rond elf uur bij het station?\n"
        "**B:** Prima, ik stuur je morgen een appje.\n\n"
        "**Say or write:** Invite someone for coffee using *Zullen we …* or *Heb je zin om …*.\n\n"
    ),
    # u02 — shopping
    (
        "\n\n**Phrases — supermarket & paying**\n\n"
        "| Dutch | English |\n|-------|--------|\n"
        "| *Mag ik een bon, alstublieft?* | May I have a receipt, please? |\n"
        "| *Ik pin graag contactloos.* | I'd like to pay contactless. |\n"
        "| *Waar vind ik de lactosevrije melk?* | Where do I find lactose-free milk? |\n\n"
        "**Mini dialogue**\n\n"
        "**Klant:** Goedemiddag, ik zoek volkoren brood en kaas zonder noten.\n"
        "**Medewerker:** De kaas is bij de toonbank; het brood ligt in gangpad twee.\n"
        "**Klant:** Dank u. Ik betaal bij zelfscankassa vier.\n\n"
        "**Say or write:** Ask where one product is using *Waar vind ik …?*\n\n"
    ),
    # u03 — housing
    (
        "\n\n**Phrases — landlord & neighbours**\n\n"
        "| Dutch | English |\n|-------|--------|\n"
        "| *Ik wil een storing melden.* | I want to report a fault. |\n"
        "| *Kunt u kijken naar het plafond?* | Could you look at the ceiling? |\n"
        "| *Tot welke tijd is het stil in het portiek?* | Until what time is it quiet in the stairwell? |\n\n"
        "**Mini dialogue**\n\n"
        "**Buur:** Goedemorgen, ik hoorde water in de badkamer.\n"
        "**Jij:** O nee, ik bel de verhuurder en stuur u een foto.\n"
        "**Buur:** Dank je, ik ben tot vijf uur thuis.\n\n"
        "**Say or write:** One polite line to report a small problem at home.\n\n"
    ),
    # u04 — transport
    (
        "\n\n**Phrases — OV & delays**\n\n"
        "| Dutch | English |\n|-------|--------|\n"
        "| *Excuseer, welke tram gaat naar …?* | Excuse me, which tram goes to …? |\n"
        "| *Ik moet overstappen bij …* | I have to transfer at … |\n"
        "| *Er is vertraging door werkzaamheden.* | There is a delay due to engineering works. |\n\n"
        "**Mini dialogue**\n\n"
        "**Reiziger:** Hoe laat vertrekt de volgende bus naar het ziekenhuis?\n"
        "**Medewerker:** Over zes minuten, halte twee. Vergeet niet in te checken.\n\n"
        "**Say or write:** Say you are late and will send an app using *Sorry, ik heb vertraging*.\n\n"
    ),
    # u05 — health
    (
        "\n\n**Phrases — GP & pharmacy**\n\n"
        "| Dutch | English |\n|-------|--------|\n"
        "| *Ik wil graag een afspraak maken.* | I'd like to make an appointment. |\n"
        "| *Ik ben verkouden sinds maandag.* | I've had a cold since Monday. |\n"
        "| *Hoe vaak moet ik deze pillen innemen?* | How often should I take these pills? |\n\n"
        "**Mini dialogue**\n\n"
        "**Assistent:** Huisartsenpraktijk Noord, goedemiddag.\n"
        "**Patiënt:** Goedemiddag, ik heb last van mijn keel en lichte koorts.\n"
        "**Assistent:** Dokter kan u om 16:10 zien. Neem uw zorgpas mee.\n\n"
        "**Say or write:** Name one symptom + duration in Dutch.\n\n"
    ),
    # u06 — work
    (
        "\n\n**Phrases — e-mail & office**\n\n"
        "| Dutch | English |\n|-------|--------|\n"
        "| *Goedemorgen, ik werk vandaag thuis.* | Good morning, I'm WFH today. |\n"
        "| *Kunt u het concept vandaag nog sturen?* | Could you send the draft today? |\n"
        "| *Met vriendelijke groet,* | Kind regards, |\n\n"
        "**Mini dialogue**\n\n"
        "**A:** Kun je donderdag om 10:00 vergaderen?\n"
        "**B:** Helaas niet; kan het om 14:00?\n"
        "**A:** Prima, ik stuur een Teams-uitnodiging.\n\n"
        "**Say or write:** Reschedule one meeting in one polite Dutch sentence.\n\n"
    ),
    # u07 — gemeente / admin
    (
        "\n\n**Phrases — gemeente desk**\n\n"
        "| Dutch | English |\n|-------|--------|\n"
        "| *Ik zou graag een afspraak willen.* | I'd like an appointment. |\n"
        "| *Welke documenten heb ik nodig?* | Which documents do I need? |\n"
        "| *Kan ik dit online met DigiD?* | Can I do this online with DigiD? |\n\n"
        "**Mini dialogue**\n\n"
        "**Balie:** Goedemorgen, waarmee kan ik u helpen?\n"
        "**Inwoner:** Ik wil me inschrijven op dit adres. Wat moet ik laten zien?\n"
        "**Balie:** Paspoort, huurcontract en een bankafschrift van de afgelopen maand.\n\n"
        "**Say or write:** Ask what you need to bring for one appointment.\n\n"
    ),
    # u08 — social
    (
        "\n\n**Phrases — invites & Dutch directness**\n\n"
        "| Dutch | English |\n|-------|--------|\n"
        "| *Zin om zaterdag iets te drinken?* | Fancy a drink on Saturday? |\n"
        "| *Eerlijk gezegd, ik heb geen zin.* | Honestly, I don't feel like it. |\n"
        "| *Geen probleem, tot een andere keer.* | No problem, another time. |\n\n"
        "**Mini dialogue**\n\n"
        "**A:** Film om 20:00 — ga je mee?\n"
        "**B:** Liever niet vanavond, ik ben moe. Volgende week wel?\n"
        "**A:** Top, dan plannen we woensdag.\n\n"
        "**Say or write:** Decline one invite politely with a short reason.\n\n"
    ),
    # u09 — culture / school touchpoint
    (
        "\n\n**Phrases — school & integration tone**\n\n"
        "| Dutch | English |\n|-------|--------|\n"
        "| *Mag ik een afspraak met de leerkracht?* | May I have an appointment with the teacher? |\n"
        "| *Mijn kind heeft moeite met huiswerk.* | My child struggles with homework. |\n"
        "| *Hoe meld ik mijn kind ziek?* | How do I report my child sick? |\n\n"
        "**Mini dialogue**\n\n"
        "**Ouder:** Goedemiddag, ik bel over de ouderavond volgende week.\n"
        "**School:** Zeker. De avond begint om 19:30; u krijgt een link per e-mail.\n\n"
        "**Say or write:** Ask one respectful question about a Dutch tradition with *Mag ik vragen …?*\n\n"
    ),
]
