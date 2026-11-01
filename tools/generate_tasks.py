#!/usr/bin/env python3
"""Generates data/tasks.json (seed data for the marketplace).
Run from the repo root: python3 tools/generate_tasks.py
Images are referenced by line number in tools/unsplash_verified.txt: every id there
was fetched and returned an HTTP 200 image, and was checked by eye for relevance."""
import json, datetime, re
from collections import Counter

TODAY = datetime.date(2026, 11, 1)
VERIFIED = [l.strip() for l in open("tools/unsplash_verified.txt") if l.strip()]
E, I, H, X = "Easy", "Intermediate", "Hard", "Expert"

# slug: (name, fontawesome icon, [indexes into VERIFIED], [rows])
# row: title | difficulty | $/h | est. hours | skills | description | deliverables
CATS = {
"software": ("Software Development", "fa-code", [0,2,51], """
Fix Failing Unit Tests in a Python Package|Easy|22|3|Python,Pytest,Git|Repair a handful of failing unit tests in a small open Python library after a dependency upgrade.|Passing test suite; short changelog note
Build a REST Endpoint with Validation|Intermediate|38|6|Node.js,REST APIs,SQL|Add a documented CRUD endpoint with input validation and pagination to an existing Express service.|Pull request with tests; OpenAPI snippet
Refactor a Legacy Java Module|Hard|68|14|Java,Refactoring,Unit Testing|Untangle a 3,000-line Java class into cohesive services without changing behaviour.|Refactored module; regression test report
Implement Role-Based Access Control|Hard|78|16|Security,TypeScript,PostgreSQL|Design and implement roles, permissions and audit logging for a multi-tenant admin panel.|RBAC implementation; migration scripts; docs
Optimise Slow PostgreSQL Queries|Hard|85|12|PostgreSQL,Query Tuning,Indexing|Profile the 20 slowest queries of a SaaS product and cut their latency with indexes and rewrites.|Benchmark before/after report; migrations
Design an Event-Driven Microservice Architecture|Expert|120|30|System Design,Kafka,Kubernetes|Break a monolith into event-driven services with a safe, staged migration plan.|Architecture document; reference service; runbook
Build a High-Throughput Rust Ingestion Service|Expert|155|40|Rust,Distributed Systems,Observability|Write a Rust service that ingests 50k events per second with back-pressure and full tracing.|Production-ready service; load-test results
""".strip().splitlines()),
"web-mobile": ("Web & Mobile Development", "fa-mobile-screen", [1,3,20], """
Convert a Static Mockup into Responsive HTML/CSS|Easy|18|4|HTML,CSS,Responsive Design|Turn a supplied Figma mockup into a clean, mobile-first landing page.|HTML/CSS files; cross-browser screenshots
Add Form Validation to a React Signup Flow|Easy|24|3|React,JavaScript,Accessibility|Add accessible client-side validation and error messages to an existing signup form.|Pull request; validation test cases
Build a Shopify Theme Customisation|Intermediate|32|8|Shopify,Liquid,CSS|Customise a Shopify theme with a product bundle section and a size-guide modal.|Theme code; install notes
Create a Cross-Platform Flutter Booking Screen|Intermediate|45|10|Flutter,Dart,State Management|Implement a calendar booking flow with offline caching in an existing Flutter app.|Flutter module; widget tests
Improve Core Web Vitals for an E-commerce Site|Hard|72|15|Performance,JavaScript,Lighthouse|Raise LCP, CLS and INP scores into the good range on a 5,000-SKU shop.|Audit report; implemented fixes; metrics comparison
Build Offline-First Sync for a React Native App|Hard|84|24|React Native,SQLite,Conflict Resolution|Add background sync with conflict resolution to a field-service mobile app.|Sync engine; test matrix; documentation
Lead an iOS App Security and Release Hardening|Expert|110|20|Swift,iOS Security,App Store Review|Harden an iOS app (keychain, certificate pinning, jailbreak checks) ahead of an App Store resubmission.|Hardened build; security checklist
""".strip().splitlines()),
"design": ("Graphic Design & Branding", "fa-palette", [5,43,49], """
Design Social Media Post Templates|Easy|17|4|Canva,Typography,Social Media|Create ten on-brand Instagram and LinkedIn post templates a small team can reuse.|Editable templates; export pack
Create a Podcast Cover and Banner Set|Easy|20|3|Illustration,Adobe Photoshop,Layout|Design podcast artwork in the sizes required by major directories.|Cover art in required sizes; source files
Design a Logo and Mini Brand Kit|Intermediate|34|10|Logo Design,Adobe Illustrator,Colour Theory|Create a logo, colour palette and type pairings for a new local business.|Logo files (SVG/PNG); one-page brand sheet
Produce a 20-Page Investor Pitch Deck|Intermediate|42|12|Presentation Design,Figma,Data Visualisation|Turn rough notes into a polished pitch deck with custom charts.|Deck (PPTX and PDF); source file
Design a Packaging System for a Food Brand|Hard|65|20|Packaging Design,Adobe Illustrator,Print Production|Design labels and boxes for a six-flavour product line with print-ready dielines.|Print-ready artwork; mock-ups
Build a Design System in Figma|Hard|80|30|Figma,Design Systems,Accessibility|Create tokens, components and documentation for a SaaS product with 40+ components.|Figma library; usage guidelines
Lead a Full Rebrand for a Regional Retailer|Expert|105|50|Brand Strategy,Identity Design,Stakeholder Management|Run workshops and deliver strategy, identity and guidelines for a 30-store retailer.|Brand strategy; identity system; guidelines book
""".strip().splitlines()),
"marketing": ("Digital Marketing & SEO", "fa-bullhorn", [6,57,11], """
Schedule and Publish a Month of Social Posts|Easy|14|6|Social Media,Scheduling,Copy Editing|Load 30 approved posts into a scheduling tool with correct hashtags and links.|Scheduled calendar; QA checklist
Keyword Research for a Blog Cluster|Easy|23|5|SEO,Ahrefs,Spreadsheets|Find 60 low-competition keywords grouped into topic clusters.|Keyword spreadsheet with intent and difficulty
Write and Set Up an Email Welcome Sequence|Intermediate|35|8|Email Marketing,Copywriting,Mailchimp|Write and configure a five-email onboarding automation.|Email copy; configured automation
Run a Technical SEO Audit|Intermediate|48|10|Technical SEO,Screaming Frog,Google Search Console|Crawl a 2,000-page site and prioritise fixes by impact.|Audit report; prioritised fix list
Plan and Optimise Google Ads Campaigns|Hard|62|15|Google Ads,Conversion Tracking,Analytics|Restructure search campaigns and cut cost per acquisition by testing ads and bids.|Campaign structure; weekly reports
Build a Marketing Attribution Model|Hard|88|20|GA4,SQL,Attribution|Compare first-touch, last-touch and data-driven attribution for a B2B funnel.|Attribution dashboard; recommendations memo
Define a Go-To-Market Strategy for a SaaS Launch|Expert|118|30|Positioning,Pricing,Growth Strategy|Craft positioning, pricing and a 90-day launch plan for a new SaaS product.|GTM strategy document; launch plan
""".strip().splitlines()),
"writing": ("Content Writing & Copywriting", "fa-pen-nib", [38,40,18], """
Write Product Descriptions for an Online Store|Easy|13|5|Copywriting,SEO Basics,Attention to Detail|Write 40 unique, benefit-led product descriptions from supplied specs.|40 descriptions in a spreadsheet
Proofread and Edit a Company Newsletter|Easy|19|2|Proofreading,Style Guides,English Grammar|Proofread four newsletters for grammar, tone and consistency.|Tracked-changes copy; style notes
Write SEO Blog Articles on Personal Finance|Intermediate|30|8|Long-form Writing,SEO,Research|Produce four 1,500-word researched articles with sources.|Four articles; source list
Create Customer Case Studies|Intermediate|40|10|Interviewing,Storytelling,B2B Writing|Interview customers and write three polished case studies.|Three case studies; quote approvals
Write Landing Page Copy That Converts|Hard|60|10|Conversion Copywriting,A/B Testing,Messaging|Write and test headline and body variants for a SaaS landing page.|Final copy; test plan; results summary
Ghostwrite Executive Thought-Leadership Articles|Hard|75|14|Ghostwriting,Business Writing,Interviewing|Capture a CEO's voice for six bylined articles on industry trends.|Six articles; voice guide
Edit a Technical White Paper on Climate Finance|Expert|92|25|Developmental Editing,Climate Finance,Technical Writing|Substantively edit a 40-page white paper for structure, evidence and clarity.|Edited manuscript; editorial letter
""".strip().splitlines()),
"data": ("Data Entry & Data Analysis", "fa-chart-column", [7,12,8], """
Transcribe Business Cards into a Spreadsheet|Easy|11|4|Data Entry,Typing,Attention to Detail|Enter 300 scanned business cards into a structured spreadsheet.|Clean spreadsheet; error log
Clean and Deduplicate a Customer List|Easy|18|5|Excel,Data Cleaning,Deduplication|Standardise and de-duplicate a 20,000-row CRM export.|Cleaned file; change summary
Build an Excel Sales Dashboard|Intermediate|33|8|Excel,Pivot Tables,Data Visualisation|Create a monthly sales dashboard with slicers and KPI tiles.|Excel workbook; user guide
Write SQL Reports for Operations|Intermediate|46|10|SQL,Reporting,Data Modelling|Write and schedule ten reporting queries against a warehouse schema.|Query library; documentation
Build a Power BI Executive Dashboard|Hard|66|18|Power BI,DAX,Data Modelling|Model sales and inventory data and publish a drill-down executive dashboard.|PBIX file; refresh schedule
Design an A/B Test Analysis Framework|Hard|82|16|Statistics,Python,Experiment Design|Create a reusable framework for sample sizing, significance and reporting.|Python package; methodology note
Build a Demand Forecasting Model|Expert|98|30|Time Series,Python,Forecasting|Develop and validate a weekly demand forecast across 500 SKUs.|Model; backtesting report; deployment notes
""".strip().splitlines()),
"virtual-assistance": ("Virtual Assistance & Administration", "fa-headset", [10,50,33], """
Organise a Shared Inbox and Folder System|Easy|12|4|Email Management,Organisation,Google Workspace|Sort a backlog of emails into labels and create a lightweight filing system.|Organised inbox; one-page process guide
Book Travel for a Small Team Offsite|Easy|16|3|Travel Planning,Budgeting,Communication|Research and book flights and lodging for eight people within budget.|Itinerary; cost sheet
Manage Calendar and Meeting Scheduling|Intermediate|26|10|Scheduling,Calendly,Time Zones|Coordinate meetings across three time zones for two executives.|Managed calendar; weekly summary
Prepare Expense Reports and Receipts|Intermediate|28|6|Expensify,Bookkeeping Basics,Spreadsheets|Reconcile receipts and file monthly expense reports.|Submitted reports; reconciliation log
Set Up a Notion Operations Workspace|Hard|52|12|Notion,Process Design,Documentation|Build a Notion workspace with SOPs, CRM and project tracking for a 15-person company.|Configured workspace; training video
Coordinate a Virtual Conference Back Office|Hard|58|20|Event Coordination,Zoom Webinars,Vendor Management|Run registration, speaker logistics and attendee support for a 500-person online event.|Event run sheet; post-event report
Serve as Chief-of-Staff Support for a Founder|Expert|90|40|Executive Support,Confidentiality,Operations|Manage priorities, board prep and investor updates for a startup founder.|Weekly briefings; board materials
""".strip().splitlines()),
"customer-support": ("Customer Support", "fa-headphones", [34,31,45], """
Answer Live Chat for an Online Shop|Easy|12|8|Customer Service,Live Chat,Typing Speed|Handle shipping and returns chats using approved macros.|Shift log; escalation notes
Triage and Tag Support Tickets|Easy|15|5|Zendesk,Triage,Attention to Detail|Tag and route a backlog of 1,200 tickets using a taxonomy.|Tagged tickets; taxonomy feedback
Write a Help-Centre Knowledge Base|Intermediate|29|12|Technical Writing,Zendesk Guide,Screenshots|Write 25 help articles with screenshots from real customer questions.|25 articles; style checklist
Provide Bilingual Email Support|Intermediate|31|10|Bilingual Support,Email,De-escalation|Resolve customer emails in English and Spanish within SLA.|Resolved tickets; CSAT report
Design Support Macros and Workflows|Hard|55|10|Zendesk,Automation,Process Design|Cut handling time by building macros, triggers and views.|Configured workflows; time-savings report
Handle Escalated Billing Disputes|Hard|60|12|Billing,De-escalation,Stripe|Resolve complex subscription billing disputes with finance.|Case resolutions; root-cause summary
Build a Customer Support QA Programme|Expert|95|20|QA Frameworks,Coaching,Analytics|Create scorecards, calibration sessions and coaching loops for a 40-agent team.|QA scorecards; calibration playbook
""".strip().splitlines()),
"translation": ("Translation & Transcription", "fa-language", [9,16,13], """
Transcribe Podcast Episodes|Easy|14|6|Transcription,Typing,Audio Editing|Produce clean verbatim transcripts for four 40-minute episodes.|Four transcripts with timestamps
Subtitle Short Marketing Videos|Easy|18|4|Subtitling,Timing,Aegisub|Create timed English subtitles for ten 60-second videos.|SRT files; QC pass
Translate Website Copy (EN to ES)|Intermediate|30|8|Spanish,Localisation,Copy Editing|Translate and adapt a 6,000-word website for Latin American audiences.|Translated strings; glossary
Medical Transcription Review|Intermediate|36|8|Medical Terminology,Proofreading,HIPAA Awareness|Review and correct automated clinical transcripts.|Corrected transcripts; error notes
Legal Document Translation (DE to EN)|Hard|62|15|German,Legal Terminology,Translation|Translate commercial contracts with exact legal terminology.|Translated contracts; translator notes
Localise a Mobile App into Three Languages|Hard|70|20|Localisation,CAT Tools,QA Testing|Localise UI strings and test them in context in French, Japanese and Portuguese.|Localised builds; QA report
Simultaneous Interpretation for a Virtual Summit|Expert|98|12|Interpretation,Subject Expertise,Remote Tools|Interpret live for a two-day finance summit with a preparation glossary.|Live interpretation; glossary
""".strip().splitlines()),
"video-photo": ("Video Editing & Photography", "fa-film", [35,37,36], """
Edit a Product Photo Set|Easy|19|5|Lightroom,Retouching,Colour Correction|Colour-correct and crop 150 product photos on a white background.|Edited images in web and print sizes
Create Short-Form Video Clips from a Webinar|Easy|22|6|Premiere Pro,Captioning,Social Video|Cut a one-hour webinar into twelve vertical clips with captions.|Twelve captioned clips
Edit a Corporate Explainer Video|Intermediate|38|12|DaVinci Resolve,Motion Graphics,Storytelling|Edit and polish a 3-minute explainer with titles, music and voiceover.|Final video; project file
Real Estate Photo Editing and HDR Blending|Intermediate|35|8|Photoshop,HDR,Perspective Correction|Blend bracketed exposures and fix perspective on 80 property photos.|80 delivered images
Colour Grade a Short Documentary|Hard|68|16|Colour Grading,DaVinci Resolve,Colour Management|Grade 25 minutes of mixed-camera footage to a consistent cinematic look.|Graded master; LUTs
Produce Motion Graphics for a Product Launch|Hard|78|20|After Effects,Motion Design,Sound Design|Design a 45-second animated launch film with branded lower-thirds.|Final animation; source project
Direct and Edit a Brand Documentary Series|Expert|100|60|Directing,Editing,Project Management|Direct interviews and edit a four-part brand documentary.|Four episodes; delivery masters
""".strip().splitlines()),
"accounting": ("Accounting & Bookkeeping", "fa-calculator", [19,56,39], """
Categorise Transactions in QuickBooks|Easy|18|6|QuickBooks,Bookkeeping,Attention to Detail|Categorise three months of bank transactions for a small business.|Categorised ledger; query list
Reconcile Monthly Bank Statements|Easy|23|4|Reconciliation,Excel,Accounting Basics|Reconcile bank and credit-card accounts for a six-month backlog.|Reconciliation reports
Prepare Monthly Management Accounts|Intermediate|40|10|Financial Reporting,Xero,Excel|Produce P&L, balance sheet and a commentary for a 12-person firm.|Management pack
Set Up Accounts Payable Automation|Intermediate|46|12|AP Automation,Dext,Process Design|Configure invoice capture and approval workflows.|Configured workflow; SOP
Build a 3-Statement Financial Model|Hard|75|24|Financial Modelling,Excel,Forecasting|Build a linked P&L, balance sheet and cash-flow model with scenarios.|Excel model; assumptions document
Perform a Sales Tax Nexus Review|Hard|88|15|Sales Tax,Compliance,Research|Review multi-state nexus exposure for an online seller.|Nexus memo; registration plan
Lead a Due-Diligence Financial Review|Expert|145|40|Due Diligence,CPA,M&A Analysis|Analyse quality of earnings and working capital for an acquisition target.|Due-diligence report; adjustments schedule
""".strip().splitlines()),
"research-consulting": ("Research & Business Consulting", "fa-magnifying-glass-chart", [26,14,47], """
Compile a Competitor Pricing Table|Easy|16|5|Desk Research,Spreadsheets,Attention to Detail|Collect and structure public pricing for 25 competitors.|Pricing spreadsheet; sources
Schedule and Take Notes for Customer Interviews|Easy|21|6|Interview Support,Note-taking,Coordination|Schedule and take notes for 12 customer-discovery interviews.|Notes; recordings index
Market Sizing for a New Product Category|Intermediate|42|12|Market Research,TAM/SAM/SOM,Excel|Estimate market size with bottom-up and top-down methods.|Market sizing model; memo
Run a User Survey and Report Findings|Intermediate|45|14|Survey Design,Statistics,Reporting|Design, field and analyse a 500-respondent survey.|Survey instrument; analysis report
Build an Operational Efficiency Diagnostic|Hard|80|20|Process Mapping,Lean,Analytics|Map workflows and quantify waste across fulfilment operations.|Diagnostic report; roadmap
Develop a Pricing Strategy for a Subscription Business|Hard|88|25|Pricing,Competitive Analysis,Modelling|Test pricing tiers using willingness-to-pay data and propose a structure.|Pricing recommendation; model
Advise on Market-Entry Strategy for Southeast Asia|Expert|150|40|Strategy,Market Entry,Executive Communication|Assess markets, regulation and partners and recommend an entry path.|Board-ready strategy deck; financials
""".strip().splitlines()),
"ai-ml": ("AI & Machine Learning", "fa-brain", [23,24,52], """
Label Images for an Object Detection Dataset|Easy|14|8|Data Labelling,Attention to Detail,Annotation Tools|Draw bounding boxes on 1,500 street-scene images following guidelines.|Labelled dataset; QA sample
Rate Chatbot Responses for Quality|Easy|20|6|Critical Reading,Rubric Scoring,English|Rate and rank AI responses against a helpfulness and safety rubric.|Completed ratings; edge-case notes
Write Prompt Test Suites for an LLM Feature|Intermediate|40|10|Prompt Engineering,Testing,Python|Create a regression suite of prompts and expected behaviours.|Test suite; evaluation script
Fine-tune a Text Classifier|Intermediate|50|14|Python,Hugging Face,Evaluation|Fine-tune and evaluate a classifier for support-ticket routing.|Trained model; evaluation report
Build a Retrieval-Augmented Generation Pipeline|Hard|88|25|RAG,Vector Databases,Python|Build a document Q&A system with chunking, retrieval and citations.|Working pipeline; evaluation harness
Design an LLM Evaluation and Red-Teaming Programme|Expert|130|30|LLM Evaluation,Red Teaming,Safety|Define metrics and adversarial tests for a customer-facing assistant.|Evaluation plan; findings report
Architect an MLOps Platform for Model Deployment|Expert|175|60|MLOps,Kubernetes,Model Monitoring|Design CI/CD, feature stores and drift monitoring for production models.|Architecture; reference implementation
""".strip().splitlines()),
"education": ("Education & Online Tutoring", "fa-graduation-cap", [25,41,48], """
Tutor High-School Algebra Online|Easy|20|10|Algebra,Tutoring,Patience|Run one-to-one video sessions for a Year 10 student.|Session notes; progress summary
Grade Short-Answer Quizzes with a Rubric|Easy|15|6|Grading,Subject Knowledge,Consistency|Grade 200 short-answer responses against a published rubric.|Graded responses; moderation notes
Create a Reading-Comprehension Worksheet Pack|Intermediate|28|8|Curriculum Design,Writing,Pedagogy|Write 20 levelled worksheets with answer keys.|Worksheet pack; answer keys
Coach Students for the SAT Maths Section|Intermediate|42|12|SAT Prep,Maths,Coaching|Deliver structured coaching using diagnostics and practice tests.|Study plan; score tracking
Design an Online Course Module in Python|Hard|64|20|Instructional Design,Python,Video Production|Plan and build a four-lesson module with exercises and assessments.|Course module; assessments
Develop an Adaptive Maths Assessment Bank|Hard|72|22|Assessment Design,Psychometrics,Maths|Write and calibrate 300 questions tagged by skill and difficulty.|Question bank; calibration report
Design a University Curriculum for Data Science|Expert|110|40|Curriculum Design,Data Science,Accreditation|Design a 12-course sequence aligned to industry needs.|Curriculum map; syllabi
""".strip().splitlines()),
"engineering": ("Engineering & Technical Services", "fa-gears", [27,28,30], """
Convert Hand Sketches to Technical Drawings|Easy|21|6|Technical Drawing,AutoCAD,Dimensioning|Redraw 15 hand-sketched parts as clean 2D drawings.|DWG and PDF drawings
Write Equipment Maintenance Checklists|Easy|18|5|Technical Writing,Maintenance,Safety|Create preventive-maintenance checklists for common plant equipment.|Checklist pack
Prepare a Bill of Materials for a Product|Intermediate|35|8|BOM Management,Sourcing,Excel|Compile a costed BOM with alternates for a consumer device.|Costed BOM; sourcing notes
Create a 3D-Printable Part Design|Intermediate|42|10|Fusion 360,DFM,3D Printing|Design a part for FDM printing and validate fit with tolerances.|CAD model; STL; test report
Finite Element Analysis of a Bracket|Hard|78|14|FEA,SolidWorks,Materials|Run stress and fatigue analysis and recommend design changes.|FEA report; revised CAD
Design an Electrical Control Panel|Hard|72|18|Electrical Design,PLC,Standards|Produce schematics, layouts and a parts list for a conveyor control panel.|Schematics; panel layout; BOM
Lead Safety and Failure Analysis for Industrial Equipment|Expert|120|30|FMEA,Reliability,Root-Cause Analysis|Conduct FMEA and root-cause analysis for repeat failures on a production line.|FMEA report; corrective-action plan
""".strip().splitlines()),
"sales": ("Sales & Business Development", "fa-handshake", [46,17,13], """
Build a Prospect List from Public Sources|Easy|15|6|Lead Research,LinkedIn,Spreadsheets|Compile 400 verified prospects matching an ideal-customer profile.|Prospect list with contact sources
Update CRM Records and Follow-Up Tasks|Easy|17|5|HubSpot,Data Hygiene,Communication|Clean and update 600 CRM records and schedule follow-ups.|Updated CRM; summary
Write Cold Outreach Sequences|Intermediate|34|8|Outbound Sales,Copywriting,Sequencing|Write and test a four-step outbound sequence for two personas.|Sequences; test results
Qualify Inbound Leads by Phone|Intermediate|30|12|Discovery Calls,CRM,Objection Handling|Call and qualify inbound leads using a BANT checklist.|Qualified leads; call notes
Build a Partnership Programme|Hard|70|20|Partnerships,Negotiation,Business Cases|Identify partners, draft terms and run outreach for a channel programme.|Programme plan; partner pipeline
Create a Sales Enablement Playbook|Hard|76|18|Sales Enablement,Messaging,Competitive Intelligence|Write battlecards, talk tracks and objection-handling guides.|Playbook; battlecards
Structure Enterprise Deals and Negotiate Contracts|Expert|135|30|Enterprise Sales,Negotiation,Contracting|Lead commercial structuring and negotiation on large enterprise opportunities.|Deal structures; negotiated terms
""".strip().splitlines()),
"hr": ("Human Resources & Recruitment", "fa-people-group", [15,42,54], """
Screen Resumes Against a Job Scorecard|Easy|16|6|Resume Screening,Fairness,Spreadsheets|Screen 150 applications and shortlist against a structured scorecard.|Shortlist; screening log
Schedule Interviews and Coordinate Candidates|Easy|14|5|Scheduling,Communication,ATS|Coordinate panels and candidate communications across time zones.|Interview schedule; candidate updates
Write Job Descriptions and Careers Page Copy|Intermediate|30|8|Employer Branding,Writing,Inclusive Language|Write six inclusive job descriptions and a careers page.|Six job ads; careers copy
Source Passive Candidates for Engineering Roles|Intermediate|40|12|Sourcing,Boolean Search,Outreach|Source and engage 60 senior engineers using targeted outreach.|Candidate pipeline; response metrics
Design Structured Interview Kits|Hard|58|14|Interview Design,Competency Frameworks,Calibration|Create question banks and scoring guides for five roles.|Interview kits; interviewer training
Run a Compensation Benchmarking Study|Hard|74|18|Compensation,Data Analysis,HRIS|Benchmark 40 roles and propose pay bands.|Salary bands; methodology memo
Design a Performance Management and Promotion Framework|Expert|105|30|Performance Management,Org Design,Change Management|Build levelling, review cycles and promotion criteria for a 300-person company.|Framework; manager toolkit
""".strip().splitlines()),
"cybersecurity": ("Cybersecurity", "fa-shield-halved", [22,21,53], """
Review Phishing Reports and Classify Threats|Easy|22|6|Phishing Analysis,Email Headers,Incident Triage|Classify and document 200 reported suspicious emails.|Classification log; trends summary
Write Security Awareness Training Content|Intermediate|35|10|Security Awareness,Instructional Design,Writing|Create four short role-based security training modules.|Training modules; quizzes
Plan an MFA and SSO Rollout|Intermediate|50|10|Identity Management,Okta,Change Management|Plan and document an MFA and SSO rollout for a 200-person company.|Rollout plan; user guides
Perform a Web Application Penetration Test|Hard|85|24|Penetration Testing,OWASP,Burp Suite|Test a customer portal against the OWASP Top 10 and report vulnerabilities.|Pen-test report; retest results
Conduct a Cloud Security Posture Review (AWS)|Hard|88|20|AWS,IAM,Cloud Security|Review IAM, networking and logging; produce a risk-ranked remediation plan.|Review report; remediation backlog
Lead an Incident Response Readiness Exercise|Expert|150|20|Incident Response,Tabletop Exercises,Forensics|Run a tabletop exercise and rewrite playbooks for ransomware scenarios.|Exercise report; updated playbooks
Design a Zero-Trust Architecture Roadmap|Expert|180|40|Zero Trust,Network Security,Security Architecture|Design a phased zero-trust roadmap for a hybrid enterprise.|Architecture; phased roadmap; business case
""".strip().splitlines()),
"project-management": ("Project Management", "fa-diagram-project", [55,44,4], """
Maintain a Project Task Board and Status Reports|Easy|19|8|Jira,Reporting,Communication|Keep a Jira board current and send weekly status updates.|Weekly reports; clean board
Take Meeting Minutes and Track Action Items|Easy|15|6|Note-taking,Organisation,Follow-up|Capture decisions and actions for a weekly steering meeting.|Minutes; action tracker
Build a Project Plan and Gantt Chart|Intermediate|36|8|MS Project,Scheduling,Risk Management|Create a milestone plan with dependencies and a risk register.|Project plan; RAID log
Facilitate Agile Sprint Ceremonies|Intermediate|44|12|Scrum,Facilitation,Coaching|Run planning, reviews and retrospectives for a new product team.|Sprint reports; retro actions
Coordinate a Cross-Functional Product Launch|Hard|72|20|Programme Management,Stakeholder Management,Launch Planning|Coordinate marketing, engineering and support through a launch.|Launch plan; go/no-go checklists
Recover a Delayed IT Implementation|Hard|85|24|Recovery Planning,Vendor Management,Risk Management|Re-baseline a delayed ERP implementation and restore stakeholder confidence.|Recovery plan; weekly governance pack
Set Up a Programme Management Office|Expert|115|40|PMO,Governance,Portfolio Management|Design PMO standards, tooling and reporting for a 50-project portfolio.|PMO playbook; dashboard
""".strip().splitlines()),
"architecture-cad": ("Architecture & CAD Design", "fa-compass-drafting", [29,47,12], """
Digitise Floor Plans in AutoCAD|Easy|20|6|AutoCAD,Drafting,Scale Drawings|Redraw 10 paper floor plans as clean layered DWG files.|DWG and PDF plans
Create Furniture Layouts for Interior Concepts|Easy|23|5|SketchUp,Space Planning,Interior Design|Produce furniture layouts for three apartment types.|Layout plans; renders
Produce 3D Architectural Renders|Intermediate|40|12|3ds Max,V-Ray,Lighting|Create six photorealistic exterior and interior renders.|Six high-resolution renders
Model a Residential Building in Revit|Intermediate|50|20|Revit,BIM,Construction Documents|Model a two-storey house with schedules and sheets.|Revit model; sheets
Prepare Permit Drawing Sets|Hard|66|18|Building Codes,Construction Documents,AutoCAD|Prepare code-compliant permit drawings for a small commercial fit-out.|Permit set; code notes
Run BIM Clash Detection and Coordination|Hard|82|16|Navisworks,BIM Coordination,MEP|Coordinate architectural, structural and MEP models and resolve clashes.|Clash reports; resolution log
Design a Mixed-Use Masterplan with Sustainability Targets|Expert|130|50|Masterplanning,Sustainable Design,Parametric Design|Develop concept masterplan options with daylight and energy analysis.|Masterplan; analysis report
""".strip().splitlines()),
}

TIER = lambda r: "Beginner" if r < 25 else "Intermediate" if r < 50 else "Advanced" if r < 90 else "Expert" if r < 140 else "Specialist"
EXP = {E: "No prior professional experience required", I: "1–2 years of practical experience", H: "3–5 years of professional experience", X: "7+ years of specialised experience"}
SKILL_LVL = {E: "Basic familiarity", I: "Working proficiency", H: "Strong proficiency", X: "Deep, proven expertise"}
RANGES = {E: (10, 25), I: (25, 50), H: (50, 90), X: (90, 200)}

cats, tasks, n = [], [], 0
for cslug, (cname, cicon, imgs, rows) in CATS.items():
    img_ids = [VERIFIED[i] for i in imgs]
    cats.append({"id": cslug, "name": cname, "icon": cicon, "images": img_ids})
    for r in rows:
        title, diff, rate, hrs, skills, desc, deliv = [x.strip() for x in r.split("|")]
        rate, hrs = int(rate), int(hrs)
        lo, hi = RANGES[diff]
        assert lo <= rate <= hi, (title, diff, rate)
        skills = [s.strip() for s in skills.split(",")]
        posted = TODAY - datetime.timedelta(days=(n * 7) % 90)
        deadline = None if n % 5 == 4 else TODAY + datetime.timedelta(days=14 + (n * 11) % 60)
        neg = diff in (H, X) and n % 2 == 0
        tasks.append({
            "id": f"t{n+1:03d}", "title": title, "category": cslug,
            "image": img_ids[n % len(img_ids)],
            "difficulty": diff, "hourlyRate": rate, "currency": "USD",
            "rateType": "negotiable" if neg else "fixed",
            "estimatedHours": hrs, "experience": EXP[diff],
            "skills": skills, "summary": desc,
            "description": f"{desc} This is a {diff.lower()}-level engagement ({EXP[diff].lower()}). Work is remote and you set your own schedule within the deadline.",
            "responsibilities": [
                "Review the brief and confirm scope, inputs and success criteria before starting",
                desc,
                "Check your work against the requirements and respond to reviewer feedback promptly",
            ],
            "deliverables": [d.strip() for d in deliv.split(";")],
            "qualifications": [EXP[diff]] + [f"{SKILL_LVL[diff]} in {s}" for s in skills[:3]] + ["Reliable internet access and clear written communication"],
            "applyInstructions": "Submit a short note describing relevant experience and your availability. " + ("You may propose a different hourly rate; the reviewer will confirm the final rate before work starts." if neg else "The listed rate is fixed and non-negotiable."),
            "postedAt": posted.isoformat(), "deadline": deadline.isoformat() if deadline else None,
            "status": "published",
        })
        n += 1

json.dump({"version": 1, "categories": cats, "tasks": tasks}, open("data/tasks.json", "w"), indent=1, ensure_ascii=False)
print(len(tasks), "tasks;", len(cats), "categories")
print(Counter(t["difficulty"] for t in tasks))
print(Counter(TIER(t["hourlyRate"]) for t in tasks))
print("rate range", min(t["hourlyRate"] for t in tasks), max(t["hourlyRate"] for t in tasks))
