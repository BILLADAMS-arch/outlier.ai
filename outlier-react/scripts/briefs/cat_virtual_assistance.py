B = {}

B['t043'] = dict(
 d="Organise a backlog of 60 illustrative emails for a fictional small business into labels and folders, and create a one-page filing process. You use a free Gmail or Outlook test account you create for the exercise, so no real person's mail is involved.",
 bg="A shared inbox becomes unmanageable when everything is read but nothing is filed or assigned. A simple label scheme, a few filters and a weekly routine are usually enough to make it manageable.",
 pr="Set up a label and folder structure, apply it to the 60 sample messages, add filters for recurring senders and document the process so a colleague could continue it.",
 si=["A test mailbox with the 60 sample messages", "Labels or folders, filters and stars or flags", "Triage of each message with an action", "A one-page process guide"],
 so=["Replying on behalf of anyone", "Using a real person's inbox"],
 st=["Create a free test mailbox and compose the 60 sample emails from the table in the case data (send them to yourself from a second free account), or import them from the supplied pattern.", "Group the messages by type and sender, and write a first label design with no more than eight top-level labels.", "Create the labels or folders with a consistent naming rule (for example 01-Action, 02-Waiting, 03-Reference, Clients/, Suppliers/, Finance/).", "Apply labels to all 60 messages, deciding for each: reply today, delegate, wait for someone, file or delete.", "Create at least four filters or rules for recurring senders (newsletters, invoices, calendar notices) and test each by sending a new message.", "Add a short template for the three most common replies, saved as drafts, and note when each is used.", "Reach a clean inbox state (only messages that need action remain) and take before and after screenshots.", "Write the one-page guide: the label list, the daily and weekly routine, the filter table and what to do with a new type of email."],
 ob=["Create a simple, usable structure", "Triage every message", "Document a repeatable routine"],
 ip=[("Sample message list", "illustrative", "", "Invented emails for a fictional bike shop supplied below as a pattern."), ("Gmail help: create labels and filters", "public", "https://support.google.com/mail/answer/118708", "Official instructions.")],
 cd="""Business (fictional): Greenway Bike Shop, 4 staff. Message types to create (about 60): customer repair enquiries (15), supplier invoices (10), supplier price lists (4), newsletters (10), calendar invites (6), bank and tax notices (5), internal staff notes (5), spam or unsolicited offers (5).
Examples: 'Repair quote request: Trek 520, chain slipping' | 'Invoice 4471 from Velo Parts Ltd, due Nov 20' | 'Weekly newsletter: Trade News' | 'Invite: Staff meeting Tue 9:00'.""",
 dl=["Before and after screenshots of the mailbox (PNG)", "Label and filter list (XLSX)", "One-page process guide (PDF)"],
 ac=["All 60 messages are labelled and the inbox holds only action items", "No more than eight top-level labels and a naming rule", "At least four filters tested and listed", "The guide explains the daily and weekly routine", "No real personal data is used"],
 ms=["After about 1.5 hours: mailbox and labels", "After about 3 hours: triage and filters", "After about 4 hours: guide submitted"],
 sb=["Upload the screenshots, XLSX and PDF", "Say which mail service you used", "List the filters in a table"],
 sk=["Create the sample mailbox", "Design labels", "Triage and file", "Filters and process guide"],
 wd=[("Screenshots and label list (zip)", "file"), ("Process guide (PDF)", "file")],
)

B['t044'] = dict(
 d="Research and plan travel for an eight-person team offsite to a US destination, within a stated budget, using public fare and lodging search tools. You build the itinerary and cost sheet without making any purchase: the output is a booking-ready plan with options.",
 bg="Group travel planning fails when costs are added up inconsistently, when arrival times do not match and when no one checks cancellation rules. A good plan gives options with total cost per person and the rules that matter.",
 pr="Plan flights and lodging for eight people from three origin cities to Denver for three nights in the next calendar quarter, keeping total cost within $9,600, and present two options with a recommendation.",
 si=["Flight options from three origins", "Lodging options for eight people (e.g. 4 rooms or two houses)", "Local transport plan and a cost sheet", "A recommendation with risks"],
 so=["Actually booking or paying", "Visa or international travel"],
 st=["Read the case data: travellers, home cities, dates window and constraints such as arrival no later than 3 p.m. on day one.", "Search flights from each origin on a public fare tool (Google Flights) for three date pairs and record price, airline, times, baggage and change rules; capture screenshots with the date.", "Choose the dates that fit all travellers best and put the final flight options into the cost sheet per person.", "Search lodging: compare two hotels and one vacation rental on location, room configuration, cancellation policy and total price including taxes and fees.", "Plan ground transport from the airport to the lodging and for the three days (shuttle, rideshare, or rental van) with cost estimates.", "Build the itinerary day by day with arrival times for each traveller and a buffer for delays.", "Compile the cost sheet with formulas: per person and total, with a 10 percent contingency, and check against the budget.", "Write a one-page recommendation comparing the two options and listing the three biggest risks (cancellation, delays, budget overrun) and how to reduce them."],
 ob=["Plan within budget", "Compare options fairly", "Show the rules that matter"],
 ip=[("Team and constraints", "illustrative", "", "Fictional team supplied below."), ("Google Flights", "public", "https://www.google.com/travel/flights", "Public fare search."), ("Google Travel hotels", "public", "https://www.google.com/travel/hotels", "Lodging comparison.")],
 cd="""Team (fictional): 8 people. Origins: Chicago (3), Austin (3), Seattle (2). Destination: Denver, 3 nights. Window: any Tuesday to Friday in the first quarter that is at least 6 weeks away.
Budget: $9,600 total ($1,200 per person) including flights, lodging, ground transport, excluding meals. Constraints: all must arrive by 3 p.m. on day one; no red-eye flights; two people need step-free access.""",
 dl=["Itinerary (PDF)", "Cost sheet with formulas (XLSX)", "Recommendation memo (PDF, one page)", "Evidence screenshots of fares and lodging (zip)"],
 ac=["Total cost for the recommended option is within budget with contingency shown", "All eight travellers arrive by the stated time", "Cancellation and baggage rules are recorded for each option", "Every price has a screenshot and date", "Accessibility needs are addressed in lodging"],
 ms=["After about 1 hour: constraints and dates", "After about 2.5 hours: flights and lodging options", "After about 3 hours: cost sheet and recommendation submitted"],
 sb=["Upload the PDFs, XLSX and screenshots", "Do not enter any payment details anywhere", "Note that prices change and state the date checked"],
 sk=["Read constraints and pick dates", "Research flights", "Research lodging and transport", "Cost sheet and recommendation"],
 wd=[("Itinerary and cost sheet (zip)", "file")],
)

B['t045'] = dict(
 d="Plan a two-week calendar for two fictional executives across three time zones (New York, London and Singapore), resolving the supplied meeting requests without conflicts and handling the awkward hours fairly. The scenario is invented, and you build it in a free calendar tool using test calendars.",
 bg="Scheduling across time zones is mostly about rules: protected focus time, fair rotation of inconvenient meeting hours and clear confirmation messages. Mistakes are expensive: a missed call with a client in Singapore.",
 pr="Schedule 18 requested meetings into two test calendars, flag the ones that cannot be satisfied, write the invitations and send a weekly summary.",
 si=["Two test calendars with working hours and preferences", "Scheduling of 18 requests", "Invitation text with time in each local time zone", "A weekly summary and conflict log"],
 so=["Contacting real people", "Booking real rooms or travel"],
 st=["Read the executives' preferences and the 18 requests in the case data and put them in a table with duration, attendees and urgency.", "Create two free test calendars and set working hours and time zones; add the fixed events (flights, recurring one-to-ones).", "Add protected focus blocks as defined (two mornings per week) and block holidays given in the case data.", "Compute the overlap windows for New York, London and Singapore and list the realistic slots in a small table.", "Schedule the requests in priority order, rotating the inconvenient slots between executives and recording the reason for each choice.", "For requests that cannot be met, propose the two nearest alternatives and write a short polite message.", "Write the invitation template with the time shown in all three time zones and a video link placeholder, and use it for each meeting.", "Produce the weekly summary for each executive (the next week's schedule, decisions needed) and a conflict log."],
 ob=["Schedule without conflicts", "Share inconvenient hours fairly", "Communicate times unambiguously"],
 ip=[("Executive preferences and meeting requests", "illustrative", "", "Fictional supplied below."), ("Time zone converter", "public", "https://www.timeanddate.com/worldclock/meeting.html", "Find overlap windows."), ("Google Calendar help", "public", "https://support.google.com/calendar", "Calendar features.")],
 cd="""Executives (fictional): A. Rivera (New York, prefers meetings 10:00 to 16:00 ET, no meetings before 9:00 ET) and B. Tan (Singapore, 09:00 to 18:00 SGT, protected Friday afternoons). Shared contact in London.
Requests (18, sample): 1 Weekly leadership sync 60 min (A, B, London), 2 Client call 45 min (A, client in London), 3 Board prep 90 min (A, B), 4 Vendor review 30 min (B), 5 Candidate interview 45 min (A)... remaining 13 follow the same format.
Focus time: A, Tue and Thu mornings; B, Mon and Wed mornings. Holidays in the fortnight: US Thanksgiving (Thu Nov 26), none for Singapore.
Fairness rule: no one takes more than two meetings outside their working hours in the fortnight.""",
 dl=["Calendar export or screenshots (PDF)", "Scheduling table with decisions and reasons (XLSX)", "Weekly summaries (PDF)"],
 ac=["No double bookings and focus blocks respected", "All times are correct in all three time zones (spot-checked)", "No executive has more than two out-of-hours meetings", "Unmet requests have two alternatives and a message", "Invitations are clear and unambiguous"],
 ms=["After about 3 hours: calendars and rules", "After about 7 hours: all requests scheduled", "After about 10 hours: summaries and log submitted"],
 sb=["Upload the PDFs and XLSX", "State the calendar tool used", "Include the table of overlap windows"],
 sk=["Capture rules and requests", "Compute overlaps", "Schedule meetings", "Write invitations and summaries"],
 wd=[("Schedule and decisions (zip)", "file"), ("Weekly summaries (PDF)", "file")],
)

B['t046'] = dict(
 d="Prepare monthly expense reports and reconcile receipts for a fictional small team. You are given 40 illustrative receipts (a table of transactions with amounts and categories) and a card statement, and you must match them, identify missing receipts and policy exceptions, and complete the reports.",
 bg="Expense reporting mistakes cause real cost: missing receipts, personal items claimed and duplicate submissions. A reconciliation compares what was spent (the card statement) to what is documented (receipts) and to the policy.",
 pr="Reconcile 40 card transactions to receipts, flag exceptions against the expense policy, and produce three employee expense reports and a reconciliation log.",
 si=["Matching statement lines to receipts", "Policy checks and exception log", "Three employee reports with categories and totals", "A reconciliation summary"],
 so=["Approving payments", "Tax advice"],
 st=["Read the expense policy in the case data and list its rules: per-diem limits, categories, receipt requirement over $25 and prohibited items.", "Load the card statement and the receipt table into a spreadsheet side by side, with a match status column.", "Match each statement line to a receipt using date, amount and merchant, and mark the unmatched lines on both sides.", "Check each matched item against the policy and write the exception (over limit, wrong category, alcohol, duplicate) with the rule cited.", "Allocate transactions to the three employees as given and build each employee's report by category with subtotals.", "Calculate totals and reconcile: statement total equals matched total plus unmatched total, and show the check formula.", "Write the follow-up messages needed (missing receipt requests) as short templates.", "Complete the summary page with counts, totals, exceptions and recommended actions."],
 ob=["Reconcile statement to receipts", "Apply the policy consistently", "Produce clear reports"],
 ip=[("Statement, receipts and policy", "illustrative", "", "Invented data in the case below."), ("IRS Publication 463 (travel, gift and car expenses)", "public", "https://www.irs.gov/publications/p463", "Background on documentation rules.")],
 cd="""Policy (fictional): receipts required for any item over $25; meals limit $60 per day; alcohol not reimbursable; categories: Travel, Meals, Software, Supplies, Other.
Statement lines (illustrative sample of 40): 
11/03 Skyline Cafe 18.40 | 11/03 Metro Rail 4.50 | 11/04 CloudDocs 29.00 | 11/05 Hotel Lumen 189.00 | 11/05 Bistro 9 74.20 (includes 12.00 wine) | 11/06 Office Mart 41.37 | 11/06 Office Mart 41.37 | ...
Receipts (illustrative sample): Skyline Cafe 18.40; CloudDocs 29.00; Hotel Lumen 189.00; Bistro 9 74.20 (itemised); Office Mart 41.37 (one receipt).
Employees: Dana (travel), Sam (software, supplies), Priya (meals, travel).""",
 dl=["Reconciliation workbook (XLSX)", "Three expense reports (PDF)", "Follow-up message templates (DOCX)"],
 ac=["Every statement line is matched or flagged", "Exceptions cite the policy rule", "The reconciliation formula balances to zero", "The duplicate transaction is found and flagged", "Reports show category subtotals per employee"],
 ms=["After about 2 hours: matching complete", "After about 4 hours: exceptions and reports", "After about 6 hours: summary submitted"],
 sb=["Upload the XLSX, PDFs and DOCX", "Keep original data untouched on a separate tab", "List open items"],
 sk=["Learn the policy", "Match statement and receipts", "Check exceptions", "Build reports and summary"],
 wd=[("Reconciliation workbook (XLSX)", "file"), ("Expense reports (PDF)", "file")],
)

B['t047'] = dict(
 d="Build a Notion workspace for a fictional 15-person company, 'Brightfield Studio': standard operating procedures, a lightweight client CRM and project tracking, with templates, permissions and a short training video. You use a free Notion account and no real company data.",
 bg="Small companies lose time when knowledge lives in people's heads. A good Notion workspace is structured as a few linked databases with templates, clear ownership and a short guide, not a maze of pages.",
 pr="Deliver a working Notion workspace with three linked databases, five SOPs, role-based sharing and a five-minute training video.",
 si=["Teamspace structure and navigation", "Databases: Clients, Projects, Tasks with relations and rollups", "Five SOPs from a given process list", "Templates, views, permissions and a training video"],
 so=["Migrating real data", "Notion API integrations"],
 st=["Read the company description and process list in the case data and draw the structure (home page, three databases, SOP wiki) before building anything.", "Create the Clients, Projects and Tasks databases with the properties given, connect them with relations and add rollups for open tasks and budget used.", "Create views: board by status, calendar by due date, table by owner, and a 'My tasks' filtered view, and add database templates for a new project and a new client.", "Write five SOPs (client onboarding, project kick-off, weekly status report, invoice request, offboarding a contractor) with steps, owners and checklists, using one common SOP template.", "Build the home page with links, a team directory and a weekly agenda, and add a sidebar navigation consistent across pages.", "Set permissions: three groups (Admin, Team, Contractor), page-level sharing and a test by viewing as another user.", "Add sample data of 5 clients, 8 projects and 25 tasks (invented) and check that all rollups work.", "Record a five-minute training video that shows how to add a client, create a project from a template and use My tasks, and write a one-page quick guide."],
 ob=["Create a coherent knowledge and project system", "Make it easy to use through templates and views", "Train the team"],
 ip=[("Brightfield Studio description and process list", "illustrative", "", "Fictional company supplied below."), ("Notion help: databases and relations", "public", "https://www.notion.com/help/relations-and-rollups", "Official guidance.")],
 cd="""Brightfield Studio (fictional): 15-person design and web studio with 10 active clients.
Pain points: client details in email, tasks in chat, processes undocumented.
Required properties: Clients (name, industry, contact name, status, owner), Projects (name, client, status, start, due, budget, owner), Tasks (title, project, assignee, due, status, hours).
Roles: Admin (2), Team (10), Contractor (3, see only their projects).""",
 dl=["Notion workspace share link and a PDF export of key pages", "Training video (MP4 or link, about five minutes)", "One-page quick guide (PDF)"],
 ac=["Three databases are linked with working relations and rollups", "Five SOPs follow one template and have owners", "Permissions are demonstrated with at least one restricted page", "A new person can follow the quick guide to add a client and project", "The video covers the three tasks listed"],
 ms=["After about 4 hours: structure and databases", "After about 8 hours: views, templates and SOPs", "After about 12 hours: permissions, video and guide submitted"],
 sb=["Submit the share link in the notes, with view access", "Upload the PDF exports, guide and video", "Do not include real data"],
 sk=["Plan the structure", "Build databases and views", "Write SOPs", "Permissions", "Training video and guide"],
 wd=[("Workspace export and guide (zip)", "file"), ("Training video", "file")],
)

B['t048'] = dict(
 d="Plan the back-office operation for a fictional 500-person virtual conference, 'Remote Futures 2027': registration set-up, speaker logistics, attendee support, a run sheet and a post-event report template. Because no event is actually run, you create the operational plan and simulate the attendee-support workload using the supplied data.",
 bg="Virtual events fail in the back office: speakers who cannot find the link, attendees locked out, and no one who owns a problem during a live session. A clear run sheet with owners and contingencies is the main safeguard.",
 pr="Deliver the registration set-up guide, speaker logistics tracker, run sheet with contingencies, attendee support plan and post-event report template for a two-day, three-track event.",
 si=["Registration form and confirmation flow design", "Speaker onboarding and tech-check schedule", "Minute-by-minute run sheet for two days", "Support playbook with response templates and a staffing plan", "Post-event report template"],
 so=["Running a real event", "Platform procurement"],
 st=["Read the event facts in the case data and list the critical failure points for each stage (registration, speaker check-in, live sessions, support).", "Design the registration flow in a free tool (Google Forms or Eventbrite mock) with fields, confirmation email text, reminders at 7, 1 and 0 days and an accessibility request field.", "Create the speaker tracker with 24 invented speakers: status columns for contract, bio, slides, tech check, rehearsal and a deadline for each.", "Write the run sheet for both days: start times, session hosts, producers, backup speakers, break timings and who does what at each transition.", "Plan contingencies for five scenarios: speaker no-show, platform outage, audio failure, hostile attendee, and fire alarm at the host's home. Give a trigger, owner and action for each.", "Estimate support workload from the case numbers (tickets per 100 attendees) and decide staffing per hour, with a chart.", "Write ten response templates for common attendee problems (cannot log in, no audio, missed session, certificate request).", "Create the post-event report template with attendance, session ratings, support statistics and lessons learned sections."],
 ob=["Make the event run smoothly", "Anticipate failure", "Report after the event"],
 ip=[("Event facts and workload data", "illustrative", "", "Fictional event supplied below."), ("Zoom Events and webinar help", "public", "https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0067000", "Reference for typical platform features."), ("Event planning checklist (PMI)", "public", "https://www.pmi.org", "General planning reference.")],
 cd="""Event (fictional): Remote Futures 2027, 2 days, 3 parallel tracks, 24 speakers, 500 registered attendees across time zones; platform: a standard webinar tool.
Support data (illustrative, from a similar past event): 7 support tickets per 100 attendees on day one, mostly logins; 40% arrive in the first 30 minutes of the day; average handling time 6 minutes.
Staff: 1 event manager, 2 producers, 3 support agents (part time).""",
 dl=["Operations plan with registration guide and contingencies (PDF)", "Speaker tracker and run sheet (XLSX)", "Support playbook with templates (DOCX)", "Post-event report template (DOCX)"],
 ac=["The run sheet accounts for every minute of both days with owners", "Five contingencies each have trigger, owner and action", "Staffing is derived from the supplied workload numbers", "Templates are usable without editing except placeholders", "Registration flow shows all reminders and an accessibility field"],
 ms=["After about 6 hours: registration and tracker", "After about 13 hours: run sheet and contingencies", "After about 18 hours: support plan and templates", "After about 20 hours: report template and submission"],
 sb=["Upload the four deliverables", "Use consistent file names", "Mark all invented data as illustrative"],
 sk=["Registration design", "Speaker tracker", "Run sheet and contingencies", "Support plan and templates", "Report template"],
 wd=[("Operations plan and run sheet (zip)", "file"), ("Support playbook and report template (zip)", "file")],
)

B['t049'] = dict(
 d="Act as chief-of-staff support for a fictional start-up founder for one simulated month: you prioritise a backlog, prepare weekly briefings, draft board materials and an investor update, from supplied illustrative company data. All data and people are invented, and confidentiality practices are part of the exercise.",
 bg="A founder's scarcest resource is attention. A chief-of-staff turns a flood of requests into a short, ranked list, prepares the founder for each meeting and makes sure decisions are recorded and followed up.",
 pr="Produce four weekly briefings, a board meeting pack and one investor update from the supplied data, with an explicit prioritisation method and decision log.",
 si=["Prioritised weekly agenda from a 40-item backlog", "Four weekly briefings", "Board pack: metrics, narrative, decisions needed", "Investor update email", "Decision and action tracker"],
 so=["Making decisions on behalf of the founder", "Financial advice"],
 st=["Read the company facts and the backlog of 40 items in the case data, and write the founder's top three goals for the month.", "Score each backlog item on impact, urgency and effort (1 to 5), explain the formula, and produce a ranked list with the top ten.", "Write briefing 1: the week's priorities, meetings with context and desired outcome, three decisions needed and key risks, on a single page.", "Update the metrics table weekly from the data supplied (revenue, burn, runway, headcount, pipeline) and highlight changes of more than 10 percent.", "Write briefings 2 to 4, carrying forward unresolved decisions and noting what changed.", "Draft the board pack: a two-page narrative, metrics dashboard table, three decisions the board is asked to make and a risk list.", "Draft the investor update email in the standard format (highlights, lowlights, metrics, asks) with a tone note.", "Maintain the decision and action tracker with owner, due date and status, and include a confidentiality checklist describing how you handled sensitive material."],
 ob=["Turn noise into priorities", "Prepare the founder for decisions", "Communicate clearly to the board and investors"],
 ip=[("Company facts, metrics and backlog", "illustrative", "", "Fictional start-up supplied below."), ("First Round Review: investor update template", "public", "https://review.firstround.com/", "Reference for update structure.")],
 cd="""Company (fictional): Orbit Pay, B2B payments start-up, 22 employees, seed funded 14 months ago. Month metrics (illustrative): MRR $186k (previous $171k), burn $240k per month, cash $2.9M (runway 12 months), pipeline $1.1M, one enterprise deal due to close in week 3 ($90k annual).
Top goals: close seed extension, ship the new reconciliation feature, hire a head of sales.
Backlog sample: reply to journalist request; review pricing page; investor intro call; sign contractor agreement; prepare all-hands; security questionnaire for a prospect; ... (40 items in total, you create the rest in line with the company facts).""",
 dl=["Four weekly briefings (PDF)", "Board pack (PDF)", "Investor update (DOCX)", "Prioritisation and decision tracker (XLSX)"],
 ac=["Prioritisation method is explicit and the ranked list follows it", "Each briefing fits one page with decisions flagged", "Metrics in all documents match the data and the changes are correct", "The investor update has highlights, lowlights, metrics and asks", "The confidentiality checklist is complete"],
 ms=["After about 10 hours: priorities and briefing 1", "After about 25 hours: briefings 2 to 4", "After about 35 hours: board pack and investor update", "After about 40 hours: tracker and checklist submitted"],
 sb=["Upload the four deliverables", "Label every document 'Fictional training case'", "Cross-check all figures"],
 sk=["Prioritise the backlog", "Weekly briefings", "Board pack", "Investor update", "Decision tracker and confidentiality checklist"],
 wd=[("Briefings and board pack (zip)", "file"), ("Investor update and tracker (zip)", "file")],
)
