B = {}

B['t071'] = dict(
 d="Categorise three months of bank transactions for a fictional small business in QuickBooks Online's free test company (or a free alternative such as Wave). The 180 transactions are supplied as illustrative data, and the chart of accounts and rules are given in the brief.",
 bg="Bookkeeping accuracy depends on consistent categories. Mistakes in categorisation distort profit and tax reports, and the best practice is to apply rules consistently, mark uncertain items for the owner and never guess silently.",
 pr="Categorise 180 transactions to the supplied chart of accounts, create bank rules for recurring items, and produce a query list for transactions that cannot be classified.",
 si=["180 transactions categorised", "Bank rules for recurring vendors", "A query list for unclear items", "A summary of expenses by category"],
 so=["Filing tax returns", "Payroll"],
 st=["Read the chart of accounts and the policy notes in the case data, and write a one-page cheat sheet of which vendors map to which accounts.", "Set up a free test company (QuickBooks sandbox, Wave or a spreadsheet) with the chart of accounts and import the transaction CSV.", "Categorise recurring items first (software subscriptions, rent, utilities) and create bank rules to apply them automatically.", "Categorise the remaining transactions one by one, and split mixed items where the description shows more than one purpose.", "Mark owner draws, loan payments and transfers correctly so they do not appear as expenses, and check that transfers between accounts balance.", "Create the query list for items you cannot classify (vague descriptions, large unusual amounts) with the question you would ask the owner.", "Run the profit and loss for the three months and review it for odd categories (for example meals larger than rent).", "Reconcile the total of categorised transactions to the bank statement total and record the check."],
 ob=["Categorise consistently", "Handle transfers and owner draws correctly", "Flag uncertainty instead of guessing"],
 ip=[("Chart of accounts and transactions", "illustrative", "", "Fictional business supplied below."), ("QuickBooks Online test drive", "public", "https://quickbooks.intuit.com/test-drive-company/", "Free sample company."), ("Wave accounting", "public", "https://www.waveapps.com", "Free accounting software.")],
 cd="""Business (fictional): Riverbend Bike Repair. Chart of accounts: Sales, Parts purchases (COGS), Rent, Utilities, Software, Insurance, Meals, Vehicle, Bank fees, Owner draw, Loan payment, Uncategorised.
Transactions (sample of 180): 09/02 VELO PARTS LTD -412.60 | 09/03 SQUARE DEPOSIT +1,240.00 | 09/04 CITY POWER -86.15 | 09/05 TRANSFER TO SAVINGS -500.00 | 09/06 COFFEE HUT -14.20 | 09/09 JS SMITH -300.00 (no note) | 09/10 MONTHLY ACCT FEE -12.00.
Notes: Square deposits are sales net of fees; transfers to savings are not expenses.""",
 dl=["Categorised transaction file (CSV or XLSX)", "Bank rules list (XLSX)", "Query list and summary report (PDF)"],
 ac=["All 180 transactions have a category from the chart of accounts", "Transfers and owner draws are not counted as expenses", "Rules exist for recurring vendors", "The query list explains every unclear item", "Categorised totals reconcile to the statement totals"],
 ms=["After about 2 hours: setup and rules", "After about 4.5 hours: all categorised", "After about 6 hours: reconciliation and report submitted"],
 sb=["Upload the files", "State the software used", "Use the original transaction ID column"],
 sk=["Set up and rules", "Categorise transactions", "Query list", "Reconcile and report"],
 wd=[("Categorised ledger (XLSX)", "file"), ("Query list and report (PDF)", "file")], tr=180,
)

B['t072'] = dict(
 d="Reconcile a six-month backlog of bank and credit-card statements for a fictional business using supplied illustrative statements and ledger exports. You match every item, identify timing differences and errors, and prepare six monthly reconciliation reports.",
 bg="A reconciliation proves that the books agree with the bank. Differences usually come from timing (outstanding cheques, deposits in transit), bank fees not yet recorded or keying errors. Unreconciled differences are a classic warning sign.",
 pr="Produce six month-end reconciliations for two accounts that end with a zero unexplained difference, with a list of adjusting entries.",
 si=["Reconciliation of one bank and one credit-card account for six months", "Outstanding items and adjusting entries", "A summary of recurring problems", "A review checklist"],
 so=["Posting in a live accounting system", "Audit"],
 st=["Open the statements and ledger exports in the case data and set up one workbook with a tab per account and month.", "For each month start from the statement ending balance, add deposits in transit, subtract outstanding payments and compare the adjusted bank balance with the ledger balance.", "Tick each statement line against the ledger line using date, amount and reference, marking matched items.", "List unmatched items on each side and classify them: timing difference, bank fee or interest not yet recorded, error in the ledger or unknown.", "Prepare adjusting journal entries (debits and credits) for fees, interest and errors, with explanation.", "Check opening balances equal the prior month's closing and that no item is cleared twice.", "Calculate the unexplained difference for each month (it must be zero after adjustments) and investigate any residual.", "Summarise the recurring problems and recommend controls (for example weekly reconciliation or bank feed)."],
 ob=["Reconcile each month to zero", "Explain each difference", "Prepare adjusting entries"],
 ip=[("Statements and ledger extracts", "illustrative", "", "Fictional data supplied below."), ("AccountingCoach: bank reconciliation", "public", "https://www.accountingcoach.com/bank-reconciliation/explanation", "Method.")],
 cd="""Account (fictional): Riverbend Bike Repair checking account. September statement ending balance $14,820.55. Ledger balance at 30 Sep $15,640.10.
Deposits in transit: $1,050.00 deposited 29 Sep, cleared 2 Oct. Outstanding cheques: #1048 $610.00, #1051 $239.55. Bank fee $18.00 not in ledger. Interest $4.10 not in ledger. Suspected error: ledger shows $1,480.00 but the statement shows $1,408.00 for a customer deposit (transposition).
(Five more months follow the same format in the supplied files.)""",
 dl=["Reconciliation workbook (XLSX), one tab per month and account", "Adjusting journal entries (XLSX)", "Summary and recommendations (PDF)"],
 ac=["Each month's adjusted bank balance equals the adjusted ledger balance", "Outstanding items are carried forward correctly", "Adjusting entries balance (debits equal credits)", "The transposition error is identified and corrected", "Recommendations refer to observed problems"],
 ms=["After about 1.5 hours: workbook and first two months", "After about 3 hours: all six months", "After about 4 hours: entries and summary submitted"],
 sb=["Upload the XLSX and PDF", "Use the same layout for each month", "State any assumption made"],
 sk=["Set up the workbook", "Reconcile months", "Adjusting entries", "Summary and controls"],
 wd=[("Reconciliation workbook (XLSX)", "file"), ("Summary (PDF)", "file")],
)

B['t073'] = dict(
 d="Prepare a monthly management accounts pack for a fictional 12-person consultancy using supplied trial balance data: profit and loss, balance sheet, cash summary, and a written commentary with variance explanations against budget and the previous month.",
 bg="Owners rely on management accounts to decide on hiring, pricing and cash. A pack is only useful if the numbers are right, comparisons are meaningful and the commentary explains why things changed, not just what changed.",
 pr="Produce a one-month pack with P&L versus budget and prior month, balance sheet, cash flow summary, KPIs and a two-page commentary.",
 si=["P&L, balance sheet and cash summary from a trial balance", "Budget and prior month variance analysis", "KPIs: gross margin, utilisation, debtor days, runway", "Written commentary"],
 so=["Statutory accounts or tax", "Bookkeeping adjustments beyond the ones listed"],
 st=["Study the trial balance, budget and prior-month data in the case data and check that the trial balance sums to zero.", "Map the accounts to the P&L and balance sheet lines and build the statements in Excel with formulas linked to a trial balance tab.", "Check that assets equal liabilities plus equity and that the P&L profit equals the movement in retained earnings.", "Prepare accruals and prepayments given in the notes (for example one month of rent prepaid) and show them as adjustments.", "Calculate variances against budget and the prior month in amount and percent, highlighting those over 10 percent and $2,000.", "Compute the KPIs (gross margin, utilisation, debtor days, cash runway) and a short cash bridge from opening to closing cash.", "Write the commentary: headline result, the three largest variances with reasons based on the notes, cash position and actions for the next month.", "Review the pack for consistency of numbers across pages and format it professionally."],
 ob=["Produce correct statements", "Explain variances", "Give owners decisions to make"],
 ip=[("Trial balance and notes", "illustrative", "", "Fictional firm supplied below."), ("AccountingCoach: financial statements", "public", "https://www.accountingcoach.com/financial-statements/explanation", "Concepts.")],
 cd="""Firm (fictional): Northbridge Advisory, 12 staff. October: revenue $182,400 (budget $175,000; September $168,900); salaries $96,500; contractors $14,200; rent $9,800 (includes $9,800 prepaid for November: adjust); software $4,300; travel $7,100 (budget $3,000: client trip); depreciation $1,200.
Balance sheet at 31 Oct (illustrative): cash $212,000; debtors $146,000; fixed assets $38,000; creditors $41,000; VAT and payroll liabilities $52,000; loan $60,000; equity balancing.
Notes: one-off client trip; a $15,000 invoice outstanding 75 days.""",
 dl=["Management accounts workbook (XLSX)", "Commentary and pack (PDF)"],
 ac=["Balance sheet balances and ties to the trial balance", "Variances are correct and explained with causes from the notes", "KPIs are defined and correct", "Prepaid adjustment is reflected", "Commentary is under two pages and ends with actions"],
 ms=["After about 3 hours: statements built", "After about 7 hours: variances and KPIs", "After about 10 hours: commentary and pack submitted"],
 sb=["Upload the XLSX and PDF", "Link formulas to the trial balance tab", "List any assumptions"],
 sk=["Build the statements", "Adjustments and checks", "Variances and KPIs", "Commentary and pack"],
 wd=[("Workbook (XLSX)", "file"), ("Management pack (PDF)", "file")],
)

B['t074'] = dict(
 d="Design and configure an accounts-payable automation workflow for a fictional company using a free tool trial (Dext, Zoho Expense, or a Google Workspace plus Zapier set-up). You build invoice capture, three-way matching rules, approval routing and an SOP, and test it on 15 sample invoices.",
 bg="Manual accounts payable causes late payments, duplicates and fraud risk. Automation of capture and approval reduces cost per invoice, but only when approval limits, segregation of duties and exception handling are designed carefully.",
 pr="Build a working workflow that captures invoices, extracts data, routes them by amount and department for approval, flags duplicates and posts to a ledger sheet, tested on 15 invoices, with an SOP.",
 si=["Invoice capture from email or upload", "Approval rules by amount and department", "Duplicate and exception handling", "SOP and test log"],
 so=["Making real payments", "ERP integration"],
 st=["Read the AP policy in the case data (approval thresholds, segregation of duties, payment terms) and draw the process flow.", "Choose a free tool or trial and create a capture route (a dedicated email address or upload folder).", "Prepare 15 sample invoices (generate PDFs from a template) including a duplicate, an invoice with a wrong total and one over the approval limit.", "Configure extraction fields (supplier, number, date, total, tax) and confirm that the data are read correctly or corrected.", "Create the approval routing: under $1,000 department head, $1,000 to $10,000 finance manager, over $10,000 two approvers, and ensure that the requester cannot approve their own.", "Add duplicate detection (supplier plus number plus amount) and exceptions queue handling.", "Run the 15 invoices through, record each outcome and time in the test log, and correct the configuration where results differ from the expected.", "Write the SOP with the process diagram, roles, controls and what to do when an invoice is disputed."],
 ob=["Automate capture and approval", "Build in controls", "Document and test"],
 ip=[("AP policy and test scenarios", "illustrative", "", "Fictional company supplied below."), ("Dext (receipt and invoice capture)", "public", "https://dext.com", "A free trial is available."), ("Zapier automation", "public", "https://zapier.com", "Free tier for workflows.")],
 cd="""Company (fictional): Cedar Ridge Supplies. AP policy: invoices over $1,000 need approval by finance manager; over $10,000 need CFO as well; payment terms net 30; requester cannot approve own purchase; duplicates (same supplier, number, amount) blocked.
Test invoices: 15 PDFs: 10 normal, 1 duplicate, 1 total mismatch (lines sum to $1,180 but total says $1,810), 1 over $10,000, 1 missing PO number, 1 from an unknown supplier.""",
 dl=["Configured workflow screenshots and export (zip)", "Test log with outcomes (XLSX)", "SOP with process diagram (PDF)"],
 ac=["All 15 test invoices are handled as expected by the policy", "The duplicate and mismatch are caught", "Segregation of duties is enforced", "The SOP explains roles and exceptions", "Test log lists the time per invoice"],
 ms=["After about 3 hours: process design and tool set-up", "After about 8 hours: workflow configured", "After about 12 hours: testing and SOP submitted"],
 sb=["Upload the files", "Name the tool and plan used", "Do not include real credentials or supplier data"],
 sk=["Process design", "Capture and extraction", "Approvals and controls", "Testing and SOP"],
 wd=[("Workflow evidence (zip)", "file"), ("SOP and test log (zip)", "file")],
)

B['t075'] = dict(
 d="Build a linked three-statement financial model (income statement, balance sheet, cash flow) in Excel for a real public company using its latest annual report from SEC EDGAR, with a five-year forecast and three scenarios. You document assumptions, include integrity checks and write a one-page summary.",
 bg="A three-statement model is the base of most valuation and planning work. It is only trustworthy if the balance sheet balances in every period, cash flows tie to the balance sheet and each assumption is traceable.",
 pr="Model a chosen mid-size public company (for example a US retailer or manufacturer with simple operations) from historical statements with a five-year forecast, base, upside and downside scenarios and a model-checks sheet.",
 si=["Three years of historical statements from a 10-K", "Five-year forecast with drivers", "Debt, interest and working capital schedules", "Scenario switch and checks sheet"],
 so=["Valuation (DCF)", "Investment recommendations"],
 st=["Choose a company with simple operations and download its latest Form 10-K from SEC EDGAR; record the company, filing date and URL.", "Enter three years of the income statement, balance sheet and cash flow statement as reported in a historicals tab, and check that totals match the filing.", "Compute historical ratios (growth, margins, days receivable, inventory and payable, capex percent of sales) to guide the assumptions.", "Build the assumptions sheet with drivers and a scenario selector (base, upside, downside) using CHOOSE or INDEX.", "Forecast the income statement from revenue growth, margins and tax; build schedules for working capital, property and equipment, and debt with interest on average balances (avoid circularity by using opening balances or switch).", "Link the balance sheet and derive the cash flow statement from the changes; set cash as the balancing line from the cash flow.", "Create the checks sheet: balance sheet balances, cash ties, net income ties, no negative cash, with a master check cell on every tab.", "Document each assumption and its rationale, and write a one-page summary of the three scenarios and the main sensitivities."],
 ob=["Build a linked, balancing model", "Make assumptions traceable", "Explain scenarios"],
 ip=[("SEC EDGAR company filings", "public", "https://www.sec.gov/edgar/search/", "Form 10-K annual reports."), ("Damodaran data and models", "public", "https://pages.stern.nyu.edu/~adamodar/", "Free templates and industry data.")],
 dl=["Excel model (XLSX)", "Assumptions document (PDF)", "One-page scenario summary (PDF)"],
 ac=["Historicals match the 10-K exactly", "The balance sheet balances in every forecast year in all scenarios", "Cash flow ties to the balance sheet cash", "All inputs are on the assumptions sheet with a rationale", "The summary compares the three scenarios and key sensitivities"],
 ms=["After about 6 hours: historicals and ratios", "After about 14 hours: forecast and schedules", "After about 20 hours: scenarios and checks", "After about 24 hours: documents submitted"],
 sb=["Upload the XLSX and PDFs", "State the company, filing and date", "No hard-coded numbers in formulas except in the inputs"],
 sk=["Enter historicals", "Assumptions and scenarios", "Forecast statements and schedules", "Checks", "Documentation and summary"],
 wd=[("Financial model (XLSX)", "file"), ("Assumptions and summary (zip)", "file")],
)

B['t076'] = dict(
 d="Review sales-tax nexus exposure for a fictional online seller across US states, using the post-Wayfair economic-nexus thresholds published by the states and the Streamlined Sales Tax Governing Board. You analyse the illustrative sales by state, determine where registration is required and prepare a memo and registration plan.",
 bg="Since South Dakota v. Wayfair (2018) states can require remote sellers to collect sales tax after crossing economic thresholds, commonly $100,000 in sales or 200 transactions. Thresholds, measurement periods and marketplace rules differ, so a state-by-state analysis is needed.",
 pr="Use the supplied annual sales data by state to decide in which of 15 states the seller has economic nexus, estimate the exposure and prepare a registration plan and a memo.",
 si=["Threshold analysis for 15 states", "Exposure estimate with a stated method", "Registration priority plan", "Memo with assumptions and limits"],
 so=["Filing returns or registering", "Tax advice (the memo is educational)"],
 st=["Read the case data and list the seller's facts: product type, marketplace versus direct sales, physical presence and the sales by state.", "Research each state's current economic nexus threshold and measurement period from its department of revenue website; record the URL and the date of access for each state.", "Compare the annual sales and transactions per state with the threshold and mark states as nexus, approaching (over 80 percent) or none.", "Handle marketplace sales: identify states where marketplace facilitators collect the tax so that the seller's own exposure is reduced.", "Estimate the exposure for each nexus state: taxable sales since the date the threshold was first crossed multiplied by the combined average rate, stating the rate source and the assumptions.", "Prioritise registration by exposure, by deadlines (some states require registration within a set number of days) and by the cost of compliance.", "Check product taxability (clothing or digital goods differ by state) for the three highest exposure states.", "Write the memo with the findings, exposure table, plan, assumptions and a clear statement of what you could not verify."],
 ob=["Identify nexus states correctly", "Quantify exposure", "Plan registration sensibly"],
 ip=[("Sales by state", "illustrative", "", "Fictional seller supplied below."), ("Streamlined Sales Tax: remote seller state guidance", "public", "https://www.streamlinedsalestax.org/", "State thresholds."), ("Tax Foundation: sales tax rates", "public", "https://taxfoundation.org/data/all/state/sales-tax-rates/", "Rate data.")],
 cd="""Seller (fictional): Hilltop Outdoor, sells camping gear through its own website. Annual sales (illustrative, state: sales $ / transactions): CA 212,000/1,450; TX 148,000/890; NY 96,000/610; WA 133,000/720; FL 74,000/430; IL 118,000/690; PA 101,500/540; OH 54,000/320; CO 86,000/470; GA 88,000/510; (5 more states follow the same format).
Marketplace: 20% of sales go through a marketplace that collects tax. No physical presence outside Oregon.""",
 dl=["Nexus analysis workbook with source URLs (XLSX)", "Memo and registration plan (PDF)"],
 ac=["Each state's threshold has a source URL and access date", "Nexus determination follows the threshold and measurement period of that state", "The exposure method is explicit and reproducible", "Marketplace sales are treated properly", "The memo states its limits and that it is not tax advice"],
 ms=["After about 5 hours: research on thresholds", "After about 10 hours: analysis and exposure", "After about 15 hours: memo submitted"],
 sb=["Upload the XLSX and PDF", "Include all source URLs", "Date the research"],
 sk=["Collect thresholds", "Nexus determination", "Exposure estimate", "Plan and memo"],
 wd=[("Analysis workbook (XLSX)", "file"), ("Memo (PDF)", "file")],
)

B['t077'] = dict(
 d="Perform a due-diligence financial review of a real public company's recent acquisition target scenario using only public filings: analyse quality of earnings and working capital for a company you choose from SEC EDGAR (small reporting companies work best), and produce a report and an adjustments schedule as if advising an acquirer. No private data is used.",
 bg="Acquirers look past reported profit to the earnings that will continue: one-off gains, aggressive revenue recognition and under-investment can all flatter the numbers. Working-capital analysis shows how much cash is tied up and whether the seasonality is understood.",
 pr="Analyse three years of public financial statements to produce an adjusted EBITDA bridge, a monthly or quarterly net working capital analysis from the quarterly filings and a red-flags list.",
 si=["Quality of earnings analysis from filings", "Adjusted EBITDA bridge and adjustments schedule", "Net working capital trend and peg proposal", "Debt-like items and red-flags report"],
 so=["Legal due diligence", "Valuation advice"],
 st=["Select a smaller reporting company with a simple business from SEC EDGAR, download its 10-K filings for three years and the latest four 10-Qs, and record the sources.", "Extract revenue, cost of sales, operating expenses, EBITDA and cash flow data into a workbook and reconcile to the reported totals.", "Search the notes and MD&A for non-recurring items (restructuring, impairments, litigation, gains on sale) and list candidate adjustments with the page references.", "Analyse revenue quality: concentration (customers over 10 percent), changes in recognition policy, deferred revenue and bad debt trends.", "Build the adjusted EBITDA bridge from reported to adjusted with each adjustment explained and rated for reliability.", "Calculate net working capital from the quarterly balance sheets, adjust for cash and debt-like items and show the trend, average and a proposed peg for a hypothetical deal.", "Identify debt-like items (leases, deferred compensation, unfunded pensions, tax liabilities) from the notes.", "Write the report with an executive summary, findings by area, a red-flags table rated high, medium or low, and the adjustments schedule."],
 ob=["Estimate sustainable earnings", "Understand working capital", "Report risks clearly"],
 ip=[("SEC EDGAR filings", "public", "https://www.sec.gov/edgar/search/", "10-K and 10-Q reports of public companies."), ("AICPA: quality of earnings concepts", "public", "https://www.aicpa-cima.com", "Reference material."), ("Financial statement analysis notes (CFA Institute)", "public", "https://www.cfainstitute.org", "Background on earnings quality.")],
 dl=["Due-diligence report (PDF, 15 to 25 pages)", "Workbook with the EBITDA bridge, adjustments and working capital (XLSX)"],
 ac=["Every adjustment has a page reference in the filing", "The EBITDA bridge reconciles from reported to adjusted", "Net working capital is calculated consistently each quarter", "At least five red flags are rated and justified", "The report states that only public information was used and the limits of that"],
 ms=["After about 10 hours: company selected and data extracted", "After about 22 hours: adjustments and revenue quality", "After about 32 hours: working capital and debt-like items", "After about 40 hours: report submitted"],
 sb=["Upload the report and workbook", "Cite every filing with date and page", "State clearly it is an educational exercise"],
 sk=["Select company and extract data", "Adjustments and EBITDA bridge", "Revenue quality", "Working capital and debt-like items", "Report"],
 wd=[("Due-diligence report (PDF)", "file"), ("Analysis workbook (XLSX)", "file")],
)
