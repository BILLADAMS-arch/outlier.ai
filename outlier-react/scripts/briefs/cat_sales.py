B = {}

B['t106'] = dict(
 d="Compile 400 verified prospects that match an ideal-customer profile for a fictional B2B product (scheduling software for dental practices) using only public sources such as practice websites and state dental board directories, with the source of every contact.",
 bg="Prospecting lists are only as good as their accuracy: wrong emails bounce, wrong titles waste calls. Using public business information responsibly also means respecting privacy and anti-spam rules (CAN-SPAM, GDPR where applicable).",
 pr="Build a list of 400 practices with decision-maker names, public business contact details and a fit score, with at least 95 percent verified against two sources.",
 si=["Ideal-customer profile and scoring rules", "400 prospects from public directories", "Verification of 10 percent against two sources", "A compliance note"],
 so=["Sending outreach", "Buying lists or scraping behind logins"],
 st=["Read the ICP in the case data and write the inclusion and exclusion rules and a scoring model (size, specialisation, software signals).", "Find public sources: state dental board licensee lookups, the American Dental Association find-a-dentist, practice websites and Google Maps listings, and record the terms of each.", "Collect prospects into a spreadsheet: practice name, address, website, public phone, practice size indicator, decision-maker name and title if listed, and the source URL.", "Use only business contact information (published practice emails or phone numbers) and exclude personal addresses.", "Verify a random 10 percent of the records against a second source and compute the accuracy rate.", "Score each prospect against the ICP and rank them into A, B and C tiers.", "Remove duplicates and check formatting (phone numbers, URLs).", "Write a short compliance note covering the sources, opt-out handling and the approach to personal data."],
 ob=["Build an accurate list that matches the ICP", "Cite sources", "Respect privacy and rules"],
 ip=[("ICP definition", "illustrative", "", "Fictional product supplied below."), ("State dental board licensee lookups", "tasker", "", "Public lookups; check each site's terms."), ("FTC CAN-SPAM guide", "public", "https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business", "Rules for business email.")],
 cd="""Product (fictional): ChairTime, scheduling software for dental practices. ICP: independent general or orthodontic practices in the US with 2 to 10 dentists, not part of a large DSO, with a website that shows online booking is missing or only a phone number.
Exclusions: dental service organisations, practices outside the US, hospitals. Scoring: +3 no online booking, +2 2 to 10 dentists, +2 website mentions new patients, +1 reviews over 50.""",
 dl=["Prospect spreadsheet with 400 rows (XLSX)", "Verification sample and accuracy (within the workbook)", "Compliance note (PDF)"],
 ac=["400 unique prospects matching the ICP", "Every record has a source URL", "Verified sample accuracy is at least 95 percent", "Only business contact information is used", "Scoring is applied consistently"],
 ms=["After about 1 hour: rules and sources", "After about 4 hours: 400 prospects", "After about 6 hours: verification and note submitted"],
 sb=["Upload the workbook and PDF", "Include the access date for each source", "Do not include personal emails"],
 sk=["ICP and rules", "Collect prospects", "Verify and score", "Compliance note"],
 wd=[("Prospect list (XLSX)", "file"), ("Compliance note (PDF)", "file")], tr=400,
)

B['t107'] = dict(
 d="Clean and update 600 CRM records and schedule follow-ups in a free HubSpot CRM using an illustrative contacts file that you import. You fix formats and duplicates, update lifecycle stages from supplied activity notes and create follow-up tasks.",
 bg="A CRM full of stale and duplicated records leads to missed follow-ups and embarrassing outreach. Data hygiene means consistent fields, one record per person and tasks that make the next step visible.",
 pr="Import 600 records, standardise and de-duplicate them, update stages and notes from the supplied activity log and create follow-up tasks with due dates, ending with a clean-up report.",
 si=["Import and field mapping", "Standardisation and duplicate merges", "Updates from an activity log", "Follow-up tasks and a report"],
 so=["Contacting any record", "Sales automation"],
 st=["Create a free HubSpot account (or another free CRM) and read the data rules in the case data.", "Generate the 600-record import file by running the pattern in the case data (names, companies, titles, emails with deliberate problems).", "Import with field mapping and record the number of records created and errors.", "Standardise: capitalisation, phone format, country, job titles into a short list, and email domains to lowercase.", "Find duplicates (same email or same name and company) and merge them, keeping the most complete record and logging each merge.", "Update the lifecycle stage and last contact date for 100 records from the activity log, adding notes.", "Create follow-up tasks for records meeting the rules in the case data (for example proposals sent more than 5 days ago) with due dates, priority and owner.", "Write the clean-up report with before and after counts of duplicates, missing fields and tasks created."],
 ob=["Make CRM data consistent", "Merge duplicates safely", "Create actionable follow-ups"],
 ip=[("Contact file pattern and activity log", "illustrative", "", "Invented contacts only; do not use real people's data."), ("HubSpot CRM free tools", "public", "https://www.hubspot.com/products/crm", "Free CRM."), ("HubSpot Academy: data hygiene", "public", "https://academy.hubspot.com", "Free training.")],
 cd="""Generate 600 rows (fixed random seed) with columns: first name, last name, company, title, email, phone, country, stage, last contact. Plant: 40 duplicate pairs (same email, different case), 30 phone numbers in mixed formats, 25 blank countries, 20 titles like 'VP sales', 'Vice President, Sales'.
Activity log (sample): 'Acme Co: sent proposal on Oct 20', 'Beta Ltd: call booked Nov 5', 'Gamma LLC: unresponsive after 3 attempts'.
Follow-up rule: proposal sent more than 5 days ago and stage not Closed -> task 'Follow up on proposal' due in 2 days, priority high.""",
 dl=["Cleaned contacts export (CSV)", "Merge log and task list (XLSX)", "Clean-up report with screenshots (PDF)"],
 ac=["No duplicate emails remain and every merge is logged", "Phone, country and title fields follow the rules", "100 records are updated from the log", "Tasks follow the rule and have due dates", "Report shows before and after counts"],
 ms=["After about 1.5 hours: import", "After about 3.5 hours: clean and merge", "After about 5 hours: updates, tasks and report submitted"],
 sb=["Upload the three files", "State the CRM used", "Use only the invented data"],
 sk=["Import data", "Standardise and de-duplicate", "Update stages and tasks", "Report"],
 wd=[("Cleaned data and logs (zip)", "file"), ("Report (PDF)", "file")], tr=600,
)

B['t108'] = dict(
 d="Write and test a four-step outbound email sequence for two buyer personas of a fictional product, 'TrackWell' (inventory software for independent bike shops), and design an experiment to compare variants. You write the emails, personalisation rules and the test plan, and analyse supplied illustrative response data.",
 bg="Cold outreach succeeds when it is relevant, short and honest about why the person is being contacted. Sequences test one variable at a time and judge on replies and positive replies, not opens, which are unreliable.",
 pr="Deliver two sequences of four emails each, personalisation fields, a test plan and an analysis of the supplied results.",
 si=["Persona definitions", "Eight emails with subject lines", "Personalisation and a compliance checklist", "Test plan and results analysis"],
 so=["Sending real emails", "Buying data"],
 st=["Read the product and personas in the case data and write for each persona the job to be done, the likely objection and the proof you can offer.", "Write email 1 (under 90 words, one idea, one question) for each persona using one specific personalisation field.", "Write emails 2 to 4: a value follow-up, a short case-study style note (using only illustrative proof labelled as such) and a polite breakup message.", "Create two subject line variants per email and the rule for choosing the first test.", "Add compliance elements: honest sender identity, a postal address and an opt-out line, per CAN-SPAM.", "Write the test plan: variable, sample size per arm, success metric (positive reply rate), duration and the stopping rule.", "Analyse the supplied results: compute reply and positive reply rates with confidence intervals and decide whether differences are meaningful.", "Write recommendations for the next iteration and what you would not conclude from the data."],
 ob=["Write relevant, short outreach", "Plan a valid test", "Interpret small samples carefully"],
 ip=[("TrackWell personas and results", "illustrative", "", "Fictional supplied below."), ("FTC CAN-SPAM guide", "public", "https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business", "Compliance."), ("Sample size calculator", "public", "https://www.evanmiller.org/ab-testing/sample-size.html", "Planning the test.")],
 cd="""Product (fictional): TrackWell, inventory software for independent bike shops. Personas: (1) Shop owner, 1 to 3 locations, pain: stock-outs and dead stock; (2) Operations manager at a 5-store chain, pain: manual reorders. Proof (illustrative): pilot shops cut stock-outs by 30% in 8 weeks.
Results (illustrative): Variant A subject 'Stock-outs at {{shop}}?' 400 sent, 18 replies, 6 positive. Variant B subject 'Quick question about reordering' 400 sent, 26 replies, 11 positive.""",
 dl=["Sequences and personalisation guide (DOCX)", "Test plan (PDF)", "Results analysis (XLSX)"],
 ac=["Each email is under 120 words with one call to action", "The compliance elements are present", "The test changes one variable at a time", "Confidence intervals are correct and the conclusion matches them", "Proof statements are labelled illustrative"],
 ms=["After about 3 hours: personas and emails", "After about 6 hours: plan and analysis", "After about 8 hours: submitted"],
 sb=["Upload the three deliverables", "Show formulas", "Mark placeholders in double braces"],
 sk=["Personas", "Write sequences", "Test plan", "Analyse results"],
 wd=[("Sequences and test plan (zip)", "file"), ("Analysis (XLSX)", "file")],
)

B['t109'] = dict(
 d="Practise qualifying inbound leads by phone using a BANT checklist, with role-play calls: you run 12 recorded practice calls with volunteers following lead profiles provided in this brief, record call notes in a CRM template and score each lead.",
 bg="Qualification saves sales time by finding out whether a lead has budget, authority, need and timeline before a rep invests in a demo. Good discovery is conversational, not an interrogation, and notes must be factual so the next rep can use them.",
 pr="Complete 12 practice discovery calls of 10 minutes, qualify each lead, write structured notes and review your own calls against a rubric.",
 si=["Call guide with BANT questions", "12 role-play calls with consent and recordings", "CRM notes and lead scores", "Self-review of the calls"],
 so=["Calling real leads", "Closing sales"],
 st=["Read the lead profiles in the case data and write a call guide with an opening, a permission to ask questions, eight BANT questions in a natural order and a next-step close.", "Recruit volunteers (friends or classmates) to play the 12 leads and agree to record the calls.", "Run the calls of about 10 minutes; ask open questions, listen, and handle two objections per call as scripted.", "After each call write the notes in the template: need in the lead's words, budget range, authority and process, timeline, competitors and next step.", "Score each lead as A, B or C using the scoring rules and explain the score in one sentence.", "Review each recording against the rubric (rapport, questions, listening, objection handling, next step) and note one improvement.", "Summarise patterns across calls and a revised call guide.", "Compile the notes, scores and recordings index."],
 ob=["Run a conversational qualification", "Record factual notes", "Improve through review"],
 ip=[("Lead profiles and rubric", "illustrative", "", "Fictional leads supplied below."), ("HubSpot: BANT framework", "public", "https://blog.hubspot.com/sales/bant", "Method explanation."), ("Role-play volunteers", "tasker", "", "Recorded only with consent.")],
 cd="""Product (fictional): ChairTime scheduling software for dental practices, $199 per month.
Lead profiles (12; samples): 1 Dr Hale, owner of a 3-dentist practice, wants to cut no-shows, budget $150 to $250 per month, decides alone, wants to start next month. 2 Office manager at a 7-dentist practice, no budget authority, needs board approval, timeline 'next year'. 3 Dr Patel, curious only, using paper diary happily.
Scoring: A = need, budget and authority and timeline under 3 months; B = three of four; C = fewer.""",
 dl=["Call guide (DOCX)", "Call notes and scores (XLSX)", "Recordings index and self-review (PDF)", "Audio recordings (zip)"],
 ac=["12 calls completed with consent", "Notes capture all four BANT elements for each call", "Scores follow the rule", "Each self-review names a specific improvement", "The revised guide reflects the review"],
 ms=["After about 3 hours: guide and recruitment", "After about 9 hours: calls", "After about 12 hours: review submitted"],
 sb=["Upload the files", "Use first names only for volunteers", "Include the consent record"],
 sk=["Write the call guide", "Run 12 calls", "Notes and scores", "Review and revise"],
 wd=[("Notes, scores and guide (zip)", "file"), ("Recordings and review (zip)", "file")],
)

B['t110'] = dict(
 d="Build a partnership programme for a fictional SaaS product: partner types, tiers, economics, a sample partner agreement, a pipeline of 25 researched candidate partners from public sources and an outreach plan. Agreements are template drafts for illustration only.",
 bg="Partnerships extend reach but need clear economics and fit. Common failures are partners who sign but never sell, and terms that are too complex. A programme defines who the ideal partners are, what they get and how success is measured.",
 pr="Deliver a programme design (types, tiers, commissions, support), a model of partner economics, a template agreement outline, a 25-partner pipeline and an outreach sequence.",
 si=["Partner types and tiers", "Economics and a break-even model", "Agreement outline (not legal advice)", "Partner pipeline of 25 with research notes", "Outreach and onboarding plan"],
 so=["Contacting real companies", "Legal drafting of binding agreements"],
 st=["Read the product facts and goals in the case data and define the partner types (referral, reseller, integration, agency).", "Research how three public SaaS partner programmes are structured (for example HubSpot, Shopify and Xero) and summarise their tiers and incentives.", "Design the tiers with benefits, requirements and commission rates, and justify each using the product's margin.", "Build the economics model: average deal size, commission, onboarding cost per partner, expected deals per partner per year and the break-even number of partners.", "Write an outline of the partner agreement with the key clauses (scope, commission, term, data protection, termination) and mark that it needs legal review.", "Research 25 candidate partners from public sources (agency directories, marketplace listings) and score them on fit, reach and capability.", "Draft a three-step outreach sequence and an onboarding checklist for the first 30 days.", "Write the programme plan with metrics (partners signed, partner-sourced revenue) and a 12-month timeline."],
 ob=["Design a programme with sound economics", "Identify credible candidates", "Plan outreach and onboarding"],
 ip=[("Product facts", "illustrative", "", "Fictional product supplied below."), ("HubSpot Solutions Partner Program", "public", "https://www.hubspot.com/partners", "Example of a public programme."), ("Shopify Partners", "public", "https://www.shopify.com/partners", "Example programme.")],
 cd="""Product (fictional): Ledgerly, invoice reconciliation SaaS for small accounting firms. Price $120 per firm per month, gross margin 78%, average customer lifetime 30 months. Goal: 30% of new customers from partners within 18 months. Budget: $60,000 for the programme in year one.""",
 dl=["Programme design document (PDF)", "Economics model (XLSX)", "Agreement outline (DOCX)", "Partner pipeline (XLSX)", "Outreach sequence and onboarding checklist (DOCX)"],
 ac=["Commission rates are supported by the margin and break-even model", "The pipeline has 25 candidates with a source and a fit score", "The agreement outline is marked as needing legal review", "Public programmes are cited as comparisons", "Success metrics have targets"],
 ms=["After about 5 hours: research and design", "After about 11 hours: economics and agreement", "After about 16 hours: pipeline and outreach", "After about 20 hours: submitted"],
 sb=["Upload the five deliverables", "Cite the programmes you studied", "Mark invented numbers"],
 sk=["Research programmes", "Design tiers and economics", "Agreement outline", "Pipeline", "Outreach and onboarding"],
 wd=[("Programme document and model (zip)", "file"), ("Pipeline and outreach (zip)", "file")],
)

B['t111'] = dict(
 d="Write a sales enablement playbook with battlecards, talk tracks and objection-handling guides for a fictional product competing with three real public competitors. Competitor information comes only from public pricing pages, documentation and review sites, which you cite.",
 bg="Reps use enablement content in live calls, so it must be quick to scan, accurate and honest about competitors' strengths. Battlecards that exaggerate get ignored or cause legal and credibility problems.",
 pr="Deliver a playbook with three competitor battlecards, five persona talk tracks, 15 objection responses and a one-page quick reference, all with source citations.",
 si=["Three competitor battlecards from public information", "Talk tracks for five personas", "Fifteen objections with responses and proof", "A quick-reference card"],
 so=["Training delivery", "Pricing decisions"],
 st=["Read the product facts in the case data and choose three real public competitors in the category; record the sources you will use.", "Research each competitor's public pricing, features, ideal customers and reviews on G2 or Capterra, noting dates.", "Create each battlecard: overview, where they win, where we win, landmines to set, questions to ask, and proof with source links, avoiding disparaging language and unverifiable claims.", "Write talk tracks for five personas (owner, finance lead, IT lead, ops manager, end user) with the opening, discovery questions and value points.", "List 15 common objections (price, switching cost, missing features and so on) and write responses using the feel-felt-found or evidence-first structure.", "Check each claim against its source and mark claims that need legal or product review.", "Create the quick-reference card on one page.", "Review the playbook with a volunteer as a role-play reader and revise the most confusing parts."],
 ob=["Give reps accurate, scannable material", "Compare honestly with competitors", "Handle objections with evidence"],
 ip=[("Product facts", "illustrative", "", "Fictional product supplied below."), ("G2 and Capterra reviews", "public", "https://www.g2.com", "Public reviews."), ("Competitor websites and documentation", "tasker", "", "Use public pages and record URL and date.")],
 cd="""Product (fictional): Pulse Standup, async daily standups for remote teams, $4 per user per month, integrates with Slack and Teams, no video required. Strengths (illustrative): setup in 5 minutes, 14-day trial. Gaps (illustrative): no mobile app yet, limited reporting.""",
 dl=["Playbook (PDF)", "Three battlecards (PDF)", "Objection handling guide (DOCX)", "Quick reference (PDF)"],
 ac=["Every competitor claim cites a public source with a date", "Battlecards acknowledge competitor strengths", "Fifteen objections each have a response and a proof point", "No disparaging or unverifiable statements", "A role-play review is recorded"],
 ms=["After about 6 hours: research", "After about 13 hours: battlecards and talk tracks", "After about 18 hours: objections and quick reference submitted"],
 sb=["Upload the four deliverables", "Include a sources table", "Flag claims for legal review"],
 sk=["Research competitors", "Battlecards", "Talk tracks", "Objections and quick reference"],
 wd=[("Playbook and battlecards (zip)", "file"), ("Objections and quick reference (zip)", "file")],
)

B['t112'] = dict(
 d="Structure a large enterprise software deal and plan the contract negotiation in a simulated case: you analyse a fictional customer's requirements and constraints, design the commercial structure, prepare a negotiation plan with concessions, and draft an issues list against a standard order form, using public contract templates as a base.",
 bg="Large deals are won on structure as well as price: term, ramp, payment schedule, service levels, liability caps and exit rights. Preparation means knowing what you can give, what you need and what the other side probably wants.",
 pr="Produce a deal structure proposal, a negotiation plan with BATNA and concession ladder, a contract issues list and a negotiation role-play record.",
 si=["Deal and customer analysis", "Commercial structure with three options", "Negotiation plan with BATNA and concession ladder", "Issues list on the order form and master terms", "A role-play with a partner and a debrief"],
 so=["Legal advice or actual contract drafting", "Executing contracts"],
 st=["Read the case data and list the customer's goals, constraints and likely objections, and our walk-away points.", "Design three commercial structures (for example a 3-year term with a ramp, a usage-based model, a pilot with conversion) with the price, margin and cash flow of each.", "Model each structure in a spreadsheet and compute the total contract value, net present value at 10 percent and margin.", "Write the negotiation plan: objectives, BATNA, a ranked list of issues, the concession ladder (what we give for what we get) and the opening position.", "Study public SaaS terms (for example the Common Paper standard agreements, which are open licence) and list the clauses most often negotiated: liability cap, data protection, SLA credits, termination for convenience, auto-renewal.", "Create the issues list for the order form with our position, fallback and rationale for each.", "Role-play a 45-minute negotiation with a volunteer playing the customer's procurement lead, record it, and keep notes of the trades made.", "Debrief: what worked, where you gave away value too early, and a final deal structure recommendation."],
 ob=["Create deal options with clear economics", "Prepare a disciplined negotiation", "Reflect on the practice"],
 ip=[("Deal facts", "illustrative", "", "Fictional customer supplied below."), ("Common Paper standard agreements (open licence)", "public", "https://commonpaper.com/standards/", "Public SaaS agreement templates."), ("Harvard PON: BATNA", "public", "https://www.pon.harvard.edu/daily/negotiation-skills-daily/what-is-batna-in-negotiation/", "Negotiation concept.")],
 cd="""Customer (fictional): Meridian Logistics, 4,000 employees, wants a procurement platform. Budget range $450k to $600k per year; needs SSO, 99.9% uptime, EU data residency; wants a 1-year opt-out. Our list price $720k per year, floor $510k, gross margin target 70%. Competitor has quoted $480k with a weaker feature set. Decision date: end of quarter.""",
 dl=["Deal structure model (XLSX)", "Negotiation plan (PDF)", "Issues list (XLSX)", "Role-play record and debrief (PDF) with recording (MP3)"],
 ac=["Three structures are modelled with NPV and margin", "The plan has a BATNA and a concession ladder with trade-offs, not just discounts", "The issues list gives a position and fallback for at least 12 clauses", "The role-play debrief shows specific moments and learnings", "The document states that it is not legal advice"],
 ms=["After about 6 hours: analysis and structures", "After about 15 hours: negotiation plan and issues", "After about 24 hours: role-play and debrief", "After about 30 hours: submitted"],
 sb=["Upload the deliverables", "Get consent from the role-play partner", "Do not use real customers' terms"],
 sk=["Analyse the deal", "Model structures", "Negotiation plan", "Issues list", "Role-play and debrief"],
 wd=[("Deal model and plan (zip)", "file"), ("Issues list and debrief (zip)", "file")],
)
