#!/usr/bin/env python3
"""Generate the Counterfly hackathon deck as a self-contained PDF."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    NextPageTemplate,
    PageTemplate,
    PageBreak,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.pdfbase import pdfmetrics

pdfmetrics.registerFontFamily(
    "Helvetica",
    normal="Helvetica",
    bold="Helvetica-Bold",
    italic="Helvetica-Oblique",
    boldItalic="Helvetica-BoldOblique",
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "Counterfly-Deck.pdf"

INK = colors.HexColor("#eaffff")
MUTED = colors.HexColor("#7f8ca8")
ACCENT = colors.HexColor("#0ff")
MAGENTA = colors.HexColor("#ff4a82")
AMBER = colors.HexColor("#ff9636")
PANEL = colors.HexColor("#0d1528")
PANEL_ALT = colors.HexColor("#111c36")
BG = colors.HexColor("#000000")


def cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)

    canvas.setStrokeColor(ACCENT)
    canvas.setLineWidth(1)
    canvas.rect(18 * mm, 16 * mm, A4[0] - 36 * mm, A4[1] - 32 * mm)

    # Brand mark: official cyber fruit-fly logo.
    cx = A4[0] / 2
    logo_path = ROOT / "assets" / "logo.png"
    if logo_path.exists():
        logo_size = 96 * mm
        canvas.drawImage(
            str(logo_path),
            cx - logo_size / 2,
            A4[1] - 22 * mm - logo_size,
            width=logo_size,
            height=logo_size,
            mask="auto",
        )

    canvas.setFont("Helvetica-Bold", 18)
    canvas.setFillColor(INK)
    canvas.drawCentredString(cx, 52 * mm, "A Counterfactual-History Engine for RWA Risk")
    canvas.setFont("Helvetica", 11)
    canvas.setFillColor(MUTED)
    canvas.drawCentredString(cx, 45 * mm, "BUIDL CTC 2026 Fall | RWA Track | Attestcoin Protocol")
    canvas.restoreState()


def page_decor(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setStrokeColor(PANEL_ALT)
    canvas.setLineWidth(0.6)
    canvas.line(20 * mm, A4[1] - 18 * mm, A4[0] - 20 * mm, A4[1] - 18 * mm)
    canvas.setFont("Courier", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 10 * mm, "COUNTERFLY | BUIDL CTC 2026 FALL")
    canvas.drawRightString(A4[0] - 20 * mm, 10 * mm, f"{doc.page}")
    canvas.restoreState()


styles = {
    "title": ParagraphStyle(
        "title",
        fontName="Courier-Bold",
        fontSize=21,
        leading=26,
        textColor=INK,
        spaceAfter=4 * mm,
    ),
    "kicker": ParagraphStyle(
        "kicker",
        fontName="Courier-Bold",
        fontSize=10,
        leading=14,
        textColor=ACCENT,
        spaceAfter=2 * mm,
    ),
    "body": ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=10.5,
        leading=16,
        textColor=INK,
        spaceAfter=3 * mm,
    ),
    "bullet": ParagraphStyle(
        "bullet",
        leftIndent=8 * mm,
        bulletIndent=2 * mm,
        spaceAfter=1.6 * mm,
    ),
}

styles["bullet"].parent = styles["body"]
styles["muted"] = ParagraphStyle(
    "muted",
    parent=styles["body"],
    textColor=MUTED,
)


def P(text, style="body"):
    return Paragraph(text, styles[style])


def bullet(text):
    return Paragraph(
        f'<bullet bulletColor="#0ff" bulletFontName="Helvetica-Bold">-</bullet>{text}',
        styles["bullet"],
    )


def panel_table(rows):
    table = Table(rows, colWidths=[58 * mm, 112 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PANEL),
                ("BOX", (0, 0), (-1, -1), 0.5, PANEL_ALT),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, PANEL_ALT),
                ("TEXTCOLOR", (0, 0), (-1, -1), INK),
                ("FONTNAME", (0, 0), (0, -1), "Courier-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("LEADING", (0, 0), (-1, -1), 12),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def section(kicker, title, body=None):
    flow = [P(kicker.upper(), "kicker"), P(title, "title")]
    if body:
        flow.append(P(body))
    return flow


story = []

story.extend(
    section(
        "The problem",
        "On-chain RWA is transparent about ownership, but opaque about risk.",
        "Tokenized real-world assets promise trustless transparency, yet the critical decisions "
        "- valuation, loan-to-value, default and liquidation - still come from a centralized "
        "appraiser or a black-box ML model. That trusted third party is exactly the failure mode "
        "tokenization was meant to remove.",
    )
)
story.append(bullet("A single appraiser can be wrong, captured, slow or unavailable."))
story.append(bullet("A lender cannot audit why the system says 12.4% default risk."))
story.append(bullet("Proprietary risk models cannot be forked, replayed or reproduced."))
story.append(Spacer(1, 4 * mm))
story.append(PageBreak())

story.extend(
    section(
        "The insight",
        "A biological connectome is now a forkable, reproducible computational object.",
        "MaleCNS v1.0 exposes the complete adult male fruit-fly central nervous system as "
        "machine-readable data: about 166,700 neurons, 25.6 million directed connections and "
        "124 million synaptic contacts. Instead of trusting a rating agency, anyone can load the "
        "same graph, apply the same dynamics and re-run the same experiment.",
    )
)
story.append(Spacer(1, 4 * mm))

story.extend(
    section(
        "What Counterfly does",
        "It does not predict the future. It replays verified history and alternative futures.",
        "Counterfly turns the connectome into a deterministic stress-testing primitive for RWA. "
        "It answers: what would this biological decision network have done under a rate shock, a "
        "missed payment, or a hazard? The answer becomes a reproducible risk action, not a "
        "proprietary score.",
    )
)

story.append(
    panel_table(
        [
            ["Attest", "Attestcoin ProofBuilder + BlockProver verify a Sepolia RWA event on CC3."],
            ["Replay", "The verified history and one counterfactual scenario replay through the connectome."],
            ["Commit", "The action is EIP-712 signed and committed to the Counterfly ASC on CC3."],
            ["Write-back", "A relayer bridge issues adjustLtv / requestLiquidation to a Sepolia action contract."],
        ]
    )
)
story.append(Spacer(1, 5 * mm))
story.append(PageBreak())

story.extend(
    section(
        "Innovation",
        "Three things make it memorable.",
    )
)
story.append(bullet("<b>Reproducible biological oracle:</b> the risk engine is an open 166,700-neuron graph, not a company."))
story.append(bullet("<b>Counterfactual-history engine:</b> risk is an auditable replay of verified history and alternative scenarios, not a forecast."))
story.append(bullet("<b>Cypherpunk by design:</b> verification over authority. No operator can unilaterally falsify the input or the outcome."))
story.append(Spacer(1, 5 * mm))
story.append(PageBreak())

story.extend(
    section(
        "Attestcoin depth",
        "Read, replay and ASC commit use the native SDK; write-back is an explicit relayer bridge.",
        "The core decision loop is native: ProofBuilder and BlockProver attest the source event, the "
        "ASC stores the signed decision on CC3, and the relayer issues the cross-chain instruction. "
        "Native Attestcoin writability is still in third-party testing on CC3 testnet, so "
        "worker/src/writability.ts keeps the outbox/inbox interface ready while worker/src/relay.ts "
        "provides the auditable production fallback.",
    )
)

story.append(
    panel_table(
        [
            ["Read", "ProofBuilder + BlockProver precompile"],
            ["Compute", "Deterministic MaleCNS replay, hash-pinned and open-source"],
            ["ASC commit", "CounterflyASC stores EIP-712 decision on CC3"],
            ["Write-back", "Relayer bridge -> Sepolia RwaAction"],
        ]
    )
)
story.append(Spacer(1, 5 * mm))
story.append(PageBreak())

story.extend(
    section(
        "Reproducibility",
        "Same graph + same scenario + same seed = same decision.",
        "Every replay is pinned by a graph hash and scenario hash. The demo ships a single-click "
        "recommended run: full MaleCNS v1.0 + RATE_SHOCK magnitude 0.8, which lands on LIQUIDATE. "
        "The worker, dashboard and contracts are all in one repository with CI.",
    )
)

story.append(
    panel_table(
        [
            ["Neurons", "166,700"],
            ["Directed edges", "25,582,938"],
            ["Synaptic contacts", "124,177,617"],
            ["Recommended demo", "MaleCNS v1.0 / RATE_SHOCK 0.8 -> LIQUIDATE"],
        ]
    )
)
story.append(Spacer(1, 5 * mm))
story.append(PageBreak())

story.extend(
    section(
        "Deployment",
        "Everything is live on testnet.",
    )
)
story.append(
    panel_table(
        [
            ["CounterflyASC (CC3)", "0x04bbB94463a0e97f63Df7912af02AB33Ad622ef2"],
            ["RwaAction (Sepolia)", "0x4a1c9031ab8f736C4fEc8488b1294928EEE99817"],
            ["Demo", "https://counterfly.vercel.app"],
            ["Fallback", "http://144.91.75.120:8786"],
        ]
    )
)
story.append(Spacer(1, 5 * mm))
story.append(PageBreak())

story.extend(
    section(
        "Why it scores",
        "A direct answer to the RWA trust gap, built on Attestcoin.",
        "Counterfly maps the official scoring dimensions to a single coherent demo: a meaningful "
        "Attestcoin integration, a genuinely original RWA idea, a working testnet deployment, and a "
        "reproducible open-source pipeline. The only asset left is a short demo video.",
    )
)

doc = BaseDocTemplate(
    str(OUT),
    pagesize=A4,
    leftMargin=20 * mm,
    rightMargin=20 * mm,
    topMargin=22 * mm,
    bottomMargin=16 * mm,
    title="Counterfly - BUIDL CTC 2026 Fall",
    author="Counterfly",
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="deck")
doc.addPageTemplates(
    [
        PageTemplate(id="cover", frames=[frame], onPage=cover),
        PageTemplate(id="body", frames=[frame], onPage=page_decor),
    ]
)

story = [NextPageTemplate("body"), PageBreak()] + story

doc.build(story)
print(f"Wrote {OUT}")
