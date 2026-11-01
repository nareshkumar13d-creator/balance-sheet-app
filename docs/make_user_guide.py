"""Builds User_Guide.pdf (the guide for clients).   python make_user_guide.py   (needs:  pip install reportlab)
   The text is in this file, the pictures are in docs/img (made from the running app). Edit, run, commit the new PDF."""
import json, os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Image, Table, TableStyle, KeepTogether, PageBreak

HERE = os.path.dirname(os.path.abspath(__file__))
VERSION = json.load(open(os.path.join(HERE, '..', 'package.json')))['version']
GREEN = colors.HexColor('#1f5c4a'); LIGHT = colors.HexColor('#eef2ef'); GREY = colors.HexColor('#555555'); WARN = colors.HexColor('#8a1c10')

H1 = ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=20, textColor=GREEN, spaceAfter=6, leading=24)
H2 = ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=13.5, textColor=GREEN, spaceBefore=12, spaceAfter=5, leading=17)
P = ParagraphStyle('p', fontName='Helvetica', fontSize=10.5, leading=14.5, spaceAfter=5, alignment=TA_LEFT)
LI = ParagraphStyle('li', parent=P, leftIndent=14, bulletIndent=2, spaceAfter=2.5)
NOTE = ParagraphStyle('note', parent=P, backColor=LIGHT, borderPadding=(5, 6, 5, 6), spaceBefore=4, spaceAfter=9)
CAP = ParagraphStyle('cap', parent=P, fontSize=9, textColor=GREY, spaceAfter=8)

def pic(name, width_mm=170):
    from PIL import Image as PI
    path = os.path.join(HERE, 'img', name); w, h = PI.open(path).size
    img = Image(path, width=width_mm * mm, height=width_mm * mm * h / w)
    t = Table([[img]], style=TableStyle([('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor('#b8c4bd')), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0)]))
    return t
def bullets(items): return [Paragraph(i, LI, bulletText='\u2022') for i in items]
def steps(items): return [Paragraph(i, LI, bulletText=str(n) + '.') for n, i in enumerate(items, 1)]

def footer(c, doc):
    c.saveState(); c.setFont('Helvetica', 8.5); c.setFillColor(GREY)
    c.drawString(20 * mm, 11 * mm, 'Balance Sheet - User Guide   (version %s)' % VERSION)
    c.drawRightString(190 * mm, 11 * mm, 'Page %d' % doc.page); c.restoreState()

doc = BaseDocTemplate(os.path.join(HERE, 'User_Guide.pdf'), pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=16 * mm, bottomMargin=20 * mm,
                      title='Balance Sheet - User Guide', author='Balance Sheet')
doc.addPageTemplates([PageTemplate(id='all', frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')], onPage=footer)])
S = []

# ---- title
logo = Image(os.path.join(HERE, '..', 'build', 'icon.png'), width=22 * mm, height=22 * mm)
S.append(Table([[logo, [Paragraph('Balance Sheet', H1), Paragraph('User Guide for the desktop program', ParagraphStyle('s', parent=P, fontSize=12, textColor=GREY))]]],
               colWidths=[28 * mm, 140 * mm], style=TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('LEFTPADDING', (0, 0), (-1, -1), 0)])))
S.append(Spacer(1, 4))
S.append(Paragraph('Balance Sheet makes the Balance Sheet, Trading &amp; Profit &amp; Loss account and schedules from the amounts you type. It works fully <b>offline</b> - your figures stay on your computer.', P))

S.append(Paragraph('1. Choose a format', H2))
S.append(Paragraph('The buttons at the top select the format of the statements. Each format keeps its own data, so you can switch without losing anything.', P))
S += bullets(['<b>Vertical (Schedule III)</b> - the vertical Balance Sheet and Profit &amp; Loss with Schedules and Depreciation.',
              '<b>Horizontal</b> - the traditional two-sided Balance Sheet and Trading &amp; P&amp;L account.',
              '<b>Annexure</b> - party-wise Annexures A, B, C ... and the Capital Account(s).'])
S.append(Paragraph('2. The screen', H2))
S.append(KeepTogether([pic('main.png'), Paragraph('Top row: the format buttons. Second row: the firm name, the file name (with <b>Unsaved</b> when something changed) and the buttons Open, Save, Logo, Export Excel, Export PDF and Help.', CAP)]))

S.append(Paragraph('3. Making a Balance Sheet - step by step', H2))
S += steps(['Choose the format and type the <b>Firm / Proprietor name</b>, address and the <b>Balance sheet date</b> (dd.mm.yyyy).',
            'Open the <b>Schedules</b> tab (Annexure: <b>Enter Data</b>). Type the amounts: capital, creditors, debtors, cash and bank, expenses, sales and so on. Use <b>Enter</b> to go to the next row.',
            'Open the <b>Balance Sheet</b> and <b>Profit &amp; Loss</b> tabs. They are filled in automatically from your schedules.',
            'Look at the bar just under the top buttons. If it is <font color="#8a1c10"><b>red</b></font>, the Balance Sheet does not tally - correct the amounts until the bar disappears.',
            '<b>Save</b> your work (Ctrl+S). Then export the statements as Excel or PDF for the client.'])
S.append(KeepTogether([pic('schedules.png'), Paragraph('The Schedules tab (Horizontal format). Use <b>+ Add row</b> to add a line. The Vertical format has two amount columns: this year and last year.', CAP)]))
S.append(Paragraph('Extra features in the Schedules tab: <b>Quantity and Unit</b> on the Sale, Purchase and Stock rows (a Quantity Details statement is made), and an optional <b>A/c group</b> box to give one product its own Trading account.', P))

S.append(Paragraph('4. Auditor / Signature details', H2))
S.append(Paragraph('Open the box <b>Auditor / Signature details</b> above the tabs and fill in the CA firm, FRN, partner name, membership number, UDIN, place and date. The Auditors\' report block is then printed under the Balance Sheet and the Profit &amp; Loss account, on screen, in Excel and in the PDF. Choose <b>No</b> in "Show signature block" to hide it.', P))
S.append(KeepTogether([pic('auditor.png'), Paragraph('The UDIN has 18 letters and digits, the FRN is 6 digits followed by a letter (for example 123456N) and the Membership number has 6 digits.', CAP)]))

S.append(Paragraph('5. Saving and opening', H2))
S += bullets(['<b>Save</b> (Ctrl+S) stores everything - firm details, amounts, added schedules - in one <b>.bsdata</b> file. The first time you choose the folder and name; after that Save updates the same file. <b>Save As</b> (Ctrl+Shift+S) makes a copy.',
              '<b>Open</b> (Ctrl+O) loads a saved file; the right format is chosen automatically. <b>File &gt; Open Recent</b> lists the last files. Double-clicking a .bsdata file in Windows opens it in this program.',
              'Every save keeps the previous version next to your file as <b>name.bsdata.bak</b>. If a file is ever damaged, rename the .bak file to .bsdata and open it.',
              '<b>Auto-save</b>: while you work a draft is stored every few seconds. After a crash or power cut the program offers <b>Restore unsaved work</b> the next time it starts.',
              'When you close the window with unsaved changes it asks: <b>Save</b>, <b>Don\'t save</b> or <b>Cancel</b>.'])

S.append(Paragraph('<b>Starting the next year</b> (Vertical format): click <b>Next year</b> in the file bar (or File &gt; Start next year). This year\'s figures move to the Previous Year column, the closing capital, depreciation (WDV), stock and quantities become the opening figures, and the new year starts blank. Save it under a new file name - last year\'s file is not changed. The same question appears if you move the Balance sheet date forward by one year. Horizontal and Annexure do not have this yet.', P))
S.append(Paragraph('6. Excel, PDF and printing', H2))
S += bullets(['<b>Export Excel</b> (Ctrl+E) makes a print-ready workbook with live formulas. Your firm logo (if added) is placed at the top left of each sheet. <b>Import Excel</b> (below the tabs) reloads a file that this program exported.',
              '<b>Export PDF</b> (Ctrl+Shift+E) saves the finished statements - Balance Sheet, Profit &amp; Loss and the annexures - as an A4 PDF with page numbers. <b>Print preview</b> (Ctrl+P) opens the same PDF in your PDF viewer, from where you can print. PDFs are always black on white, even if Windows uses a dark theme.',
              '<b>Logo</b>: click <b>Logo</b> in the file bar and choose a PNG or JPG picture. It is shown next to the firm name, saved with the data file and added to the Excel file. The <b>&times;</b> button removes it.'])

S.append(Paragraph('7. The coloured bar - checks', H2))
S.append(KeepTogether([pic('redbar.png', 150), Paragraph('The bar appears only when something needs a look. It never stops you from saving or exporting.', CAP)]))
S += bullets(['<font color="#8a1c10"><b>Red</b></font>: the Balance Sheet does not tally. The difference between Liabilities and Assets is shown.',
              '<b>Yellow</b>: a reminder - the firm name is empty, a date is missing or not in dd.mm.yyyy form, or the capital profit-sharing is not 100%.'])

S.append(Paragraph('8. Keyboard shortcuts', H2))
rows = [['Ctrl + S', 'Save'], ['Ctrl + Shift + S', 'Save As'], ['Ctrl + O', 'Open'], ['Ctrl + E', 'Export to Excel'], ['Ctrl + Shift + E', 'Export to PDF'],
        ['Ctrl + P', 'Print preview'], ['F1', 'Help'], ['Enter / Shift + Enter', 'Next / previous row in the same column of an amount grid'],
        ['Up / Down arrow (amount boxes)', 'Same as Shift+Enter / Enter']]
t = Table(rows, colWidths=[62 * mm, 108 * mm])
t.setStyle(TableStyle([('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 10), ('FONT', (1, 0), (1, -1), 'Helvetica', 10), ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, LIGHT]),
                       ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#b8c4bd')), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
S.append(t)

S.append(Paragraph('9. Help inside the program', H2))
S.append(Paragraph('Press <b>F1</b> or click <b>Help</b> for a short summary, a <b>Quick tour</b> of the screen, and this guide. The tour starts by itself the first time the program is opened.', P))

S.append(Paragraph('10. Installing and updates', H2))
S += bullets(['Run <b>BalanceSheet_Setup.exe</b> once. A shortcut is created on the desktop and in the Start menu.',
              'If Windows shows a blue <b>"Windows protected your PC"</b> message, click <b>More info</b> and then <b>Run anyway</b>. This happens with programs that are not code-signed yet.',
              'The program checks for a new version a few seconds after it starts when the computer is online. It asks before downloading and before installing. <b>Help &gt; Check for updates</b> does it on request. Save your work first.'])

S.append(Paragraph('11. Questions and answers', H2))
qa = [('The Balance Sheet bar is red.', 'The Assets and Liabilities totals differ. Check opening balances, the cash and bank figures and the stock; the bar shows the difference.'),
      ('I closed the program without saving.', 'Start it again - it offers to restore the unsaved work. Choose Restore.'),
      ('Excel export does not start.', 'Wait a few seconds; the file is prepared first and Windows then asks where to keep it.'),
      ('Where is my data?', 'In the .bsdata files you saved (and the .bak copies next to them). Nothing is sent over the internet.'),
      ('I opened an old .json file.', 'Old files still open. Save them once and they become .bsdata files.')]
for q, a in qa: S.append(KeepTogether([Paragraph('<b>%s</b>' % q, P), Paragraph(a, ParagraphStyle('a', parent=P, leftIndent=10, textColor=colors.HexColor('#333333')))]))

doc.build(S)
print('User_Guide.pdf written')
