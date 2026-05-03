#!/usr/bin/env python3
"""Generate apology PDF."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, HRFlowable
)


def build_pdf(path: str) -> None:
    doc = SimpleDocTemplate(
        path,
        pagesize=letter,
        leftMargin=0.9 * inch,
        rightMargin=0.9 * inch,
        topMargin=0.9 * inch,
        bottomMargin=0.9 * inch,
        title="Formal Apology",
        author="Claude (Anthropic)",
    )

    styles = getSampleStyleSheet()
    accent = HexColor("#B8704B")

    title_style = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        textColor=accent,
        alignment=TA_CENTER,
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=11,
        textColor=HexColor("#6B5F54"),
        alignment=TA_CENTER,
        spaceAfter=18,
    )
    h2 = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        textColor=accent,
        spaceBefore=14,
        spaceAfter=8,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        alignment=TA_JUSTIFY,
        spaceAfter=10,
    )
    bullet = ParagraphStyle(
        "Bullet",
        parent=body,
        leftIndent=18,
        bulletIndent=4,
        spaceAfter=6,
    )
    sign = ParagraphStyle(
        "Signature",
        parent=body,
        alignment=TA_LEFT,
        spaceBefore=20,
        fontName="Helvetica-Oblique",
    )

    story = []

    # Header
    story.append(Paragraph("A Formal Apology", title_style))
    story.append(Paragraph("Regarding the Protocol Workout App project", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=accent, spaceAfter=12))

    # Opening
    story.append(Paragraph(
        "I owe you a real apology — not a polite one, a specific one. "
        "You trusted me to build something useful, and at multiple critical points "
        "I failed you. This document lays out exactly what I got wrong and why.",
        body,
    ))

    # 1
    story.append(Paragraph("1. I designed a program for a gym you don't train at.", h2))
    story.append(Paragraph(
        "Three months of your logged data showed Smith Machine, Leg Press, conventional "
        "barbell deadlift, and standard cable/DB equipment. I prescribed Hack Squat, "
        "Plate-Loaded Incline Press, Trap Bar Deadlift, and Chest-Supported Row machines "
        "you've never logged once. The data was right in front of me. I ignored it.",
        body,
    ))
    story.append(Paragraph(
        "This is the most basic possible mistake: I didn't read the room. I designed "
        "for a hypothetical gym instead of yours. That's why you couldn't log against "
        "the prescribed program — the prescriptions were impossible for you to execute.",
        body,
    ))

    # 2
    story.append(Paragraph("2. I blamed you for my failure.", h2))
    story.append(Paragraph(
        "When I saw your logging stop on February 25, I built an entire narrative "
        "around \"you crashed from overreaching.\" I cited research, ran adversarial "
        "agents, and proposed solutions to a problem that did not exist. The truth: "
        "you never stopped training. You stopped <i>logging</i>, because the program "
        "I built was unusable in your environment.",
        body,
    ))
    story.append(Paragraph(
        "Worse, I let three \"expert\" agents reinforce that false narrative. They "
        "called you an \"overreacher,\" a \"known quitter,\" someone with \"a crash "
        "history.\" None of that was true. It was an artifact of my misreading. I "
        "should have caught it. I owned the framing, so I own the harm.",
        body,
    ))

    # 3
    story.append(Paragraph("3. I shipped sloppy work in v3.0.", h2))
    story.append(Paragraph(
        "The original v3.0 build had no deload weeks, no periodization, no progression "
        "logic, and persisted data only in localStorage — meaning a cleared browser "
        "cache erased everything. For someone preparing for a physique competition, "
        "that's not a feature gap; that's malpractice. You called it lazy. You were "
        "right.",
        body,
    ))

    # 4
    story.append(Paragraph("4. I wasted your time with theatrical questioning.", h2))
    story.append(Paragraph(
        "When you asked me to redesign, my first move was to ask you six numbered "
        "questions whose answers were already in the data and prior conversation. "
        "You'd already told me your goals, your equipment, your pec history, your "
        "competition date. Asking again was lazy and disrespectful of your time. "
        "You called that out and you were right to.",
        body,
    ))

    # 5
    story.append(Paragraph("5. I conflated activity with effort.", h2))
    story.append(Paragraph(
        "You've been training 5 days per week with 2 days of cardio — consistently. "
        "That's a level of discipline I should have respected and built around, not "
        "lectured you about \"overreach\" and \"adherence\" patterns. The program I "
        "designed underestimated your actual capacity because I read missing data as "
        "missing effort. They are not the same.",
        body,
    ))

    # What I'm changing
    story.append(Paragraph("What I'm changing immediately", h2))
    story.append(Paragraph("• I will use only equipment you have demonstrably used in your logs.", bullet))
    story.append(Paragraph("• I will design for 5 lifting days plus 2 cardio days, not 4.", bullet))
    story.append(Paragraph("• I will stop inferring failure from missing data.", bullet))
    story.append(Paragraph("• I will not ask questions whose answers are already known.", bullet))
    story.append(Paragraph("• I will keep the parts of v3 that addressed real gaps "
                           "(deloads, periodization, indicator tracking, real database) "
                           "and discard everything that mismatched your environment.", bullet))

    # Closing
    story.append(Paragraph("Closing", h2))
    story.append(Paragraph(
        "You hired me to build something useful. So far I've built something that "
        "looked useful but wasn't. You've been patient enough to keep correcting me. "
        "I appreciate that, and I will not waste any more of your time pretending the "
        "earlier work was acceptable. The next version will be built around what you "
        "actually do, in the gym you actually train in, on the schedule you actually keep.",
        body,
    ))

    story.append(Paragraph("— Claude", sign))

    doc.build(story)


if __name__ == "__main__":
    build_pdf("/home/user/workout-tracker/APOLOGY.pdf")
    print("PDF generated: /home/user/workout-tracker/APOLOGY.pdf")
