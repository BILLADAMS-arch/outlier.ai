B = {}

B['t078'] = dict(
 d="Collect and structure the publicly listed pricing of 25 competitors in one software category (for example email marketing platforms or project-management tools) into a comparison table with sources and access dates.",
 bg="Pricing pages change often and are laid out differently, so comparing them takes careful normalisation: per user or per account, monthly or annual, features included. Without sources and dates, a pricing table is not trustworthy.",
 pr="Build a normalised table of 25 vendors with plan names, prices, billing units, limits and key features, plus an evidence folder of dated screenshots.",
 si=["25 vendors in one category", "Normalisation to a common unit", "Screenshots with dates", "A short observations page"],
 so=["Contacting vendors", "Recommending a vendor"],
 st=["Pick one software category with at least 30 vendors (email marketing, help desk, project management or similar) and write a one-sentence definition and inclusion rules.", "List 25 vendors using public sources such as G2 or Capterra category pages and the vendors' own sites, ensuring variety of size.", "For each vendor open the public pricing page, capture a full-page screenshot with date and URL, and extract plan names, price, billing period, user or usage limits and three standout features.", "Normalise prices to US dollars per user per month billed annually and monthly, and note any conversion you made.", "Mark vendors that hide prices ('contact sales') and record what is publicly stated.", "Check 10 percent of the cells against the screenshots for accuracy and correct errors.", "Write observations: price ranges, common pricing models, typical entry price, and three gaps in the market.", "Compile the workbook with a sources tab and the screenshot folder."],
 ob=["Collect accurate public pricing", "Normalise it for comparison", "Document sources"],
 ip=[("Vendor pricing pages", "tasker", "", "Public pages you open yourself; record URL and date."), ("G2 software categories", "public", "https://www.g2.com/categories", "To find vendors in a category."), ("Capterra categories", "public", "https://www.capterra.com/categories/", "To find vendors in a category.")],
 dl=["Pricing comparison workbook (XLSX)", "Screenshot folder (zip)", "One-page observations (PDF)"],
 ac=["25 vendors each with a screenshot, URL and date", "Prices are normalised and the conversion is stated", "Hidden pricing is marked, not guessed", "A 10 percent accuracy check is recorded", "Observations are supported by the table"],
 ms=["After about 1.5 hours: category and vendor list", "After about 4 hours: data collected", "After about 5 hours: checks and observations submitted"],
 sb=["Upload the workbook, screenshots and PDF", "Name screenshots vendor_date.png", "State the date range of collection"],
 sk=["Define the category and vendors", "Collect pricing", "Normalise and check", "Observations"],
 wd=[("Pricing workbook and screenshots (zip)", "file")], tr=25,
)

B['t079'] = dict(
 d="Plan and take notes for 12 customer-discovery interviews as a practice exercise: you recruit 12 volunteers from your own contacts or community (with consent) to talk about how they plan their weekly meals, take structured notes and produce an insights summary. No customer data from any real company is involved.",
 bg="Discovery interviews reveal problems customers actually have, but only if the notes capture what was said rather than what the interviewer hoped to hear. Note-takers use a consistent template, record exact quotes and separate observations from interpretation.",
 pr="Schedule and complete 12 interviews of 20 minutes, produce consistent notes for each and synthesise the main themes with evidence.",
 si=["Recruitment message and consent text", "Scheduling log and reminders", "Twelve interview notes with quotes", "A themes summary and recording index"],
 so=["Conducting interviews for a client", "Paid recruitment"],
 st=["Write a short recruitment message and a consent note explaining the purpose, that recording is optional and that data will be anonymised and deleted after the exercise.", "Find 12 volunteers, schedule them with a free scheduling link, send reminders and keep a log of status.", "Prepare the interview guide with seven open questions on meal planning (last time, tools, frustrations, workarounds, what they would pay for) and a note-taking template with sections for facts, quotes, emotions and follow-ups.", "Interview each volunteer for 20 minutes (voice call), asking for permission to record, and take notes live in the template.", "Within 24 hours clean the notes, mark exact quotes in quotation marks and keep interpretation in a separate column.", "Code the notes with tags for problems, tools and workarounds, and count how many participants mention each.", "Write the insights summary of five themes with a count, two quotes each and one open question for follow-up.", "Build the recording index with file names, duration and consent status, and delete the personal identifiers from the shared documents."],
 ob=["Run discovery interviews ethically", "Capture accurate notes", "Synthesise themes with evidence"],
 ip=[("Interview volunteers", "tasker", "", "Recruit your own volunteers with informed consent; never use anyone's private data without permission."), ("The Mom Test (summary of principles)", "public", "https://www.momtestbook.com", "Guidance on asking good discovery questions."), ("Nielsen Norman Group: user interviews", "public", "https://www.nngroup.com/articles/user-interviews/", "Technique guidance.")],
 dl=["Interview notes for all 12 (DOCX or XLSX)", "Scheduling log and consent text (XLSX and PDF)", "Insights summary (PDF)", "Recording index (XLSX)"],
 ac=["12 interviews completed with consent documented", "Quotes are exact and separate from interpretation", "Each theme is supported by counts and quotes", "Personal identifiers are removed from the shared documents", "The guide's questions are open and non-leading"],
 ms=["After about 2 hours: guide and recruitment", "After about 5 hours: interviews under way", "After about 6 hours: all notes and summary submitted"],
 sb=["Upload the four deliverables", "Use participant codes (P01 to P12)", "Do not include names or contact details"],
 sk=["Prepare guide and consent", "Recruit and schedule", "Interview and take notes", "Synthesise themes"],
 wd=[("Notes and summary (zip)", "file"), ("Scheduling log and index (zip)", "file")],
)

B['t080'] = dict(
 d="Estimate the size of the US market for a new product category (reusable water-bottle refill stations in airports and universities is the case) with a top-down and a bottom-up model built from public data, reconciled into a TAM, SAM and SOM.",
 bg="Market sizing is only useful when the logic is transparent: each input has a source, and two independent methods that roughly agree give confidence. Founders and investors use TAM, SAM and SOM to judge ambition and focus.",
 pr="Build an Excel model of TAM, SAM and SOM with two methods, a sensitivity table and a memo, using only cited public data.",
 si=["Top-down using industry or government data", "Bottom-up using counts of venues, units and price", "Reconciliation and sensitivity", "A two-page memo"],
 so=["Primary research", "Business plan"],
 st=["Define the product, the customer, the price assumption and the market boundaries in a half-page scope.", "Gather public data: counts of US airports (FAA), universities (NCES IPEDS), the number of students and passengers, and market figures for water-dispensing equipment from public reports or press releases.", "Build the bottom-up model: number of target sites times units per site times annual price, with a column for source and a confidence level.", "Build the top-down model: start from a broader market (for example commercial water-dispenser spend) and apply filters with sources.", "Reconcile the two estimates and explain the gap and which you trust more.", "Define SAM (segments reachable in the first three years) and SOM (realistic share given the sales capacity), with assumptions on adoption and capacity.", "Run a sensitivity analysis on the three most influential inputs and show a tornado chart.", "Write the two-page memo summarising the sizes, logic, key uncertainties and the next research to reduce them."],
 ob=["Build a transparent market model", "Triangulate two methods", "Present uncertainty honestly"],
 ip=[("US university counts (NCES IPEDS)", "public", "https://nces.ed.gov/ipeds/", "Official higher-education statistics."), ("FAA airport data", "public", "https://www.faa.gov/airports/planning_capacity/passenger_allcargo_stats/passenger", "Passenger boarding counts."), ("US Census economic data", "public", "https://www.census.gov/programs-surveys/economic-census.html", "Industry data.")],
 dl=["Market sizing model (XLSX)", "Memo (PDF, two pages)"],
 ac=["Every input has a source and a confidence rating", "Top-down and bottom-up estimates are shown side by side with the gap explained", "TAM, SAM and SOM are clearly defined and nested", "Sensitivity shows the three most influential inputs", "The memo states the biggest uncertainties"],
 ms=["After about 3 hours: scope and data", "After about 8 hours: both models", "After about 12 hours: memo submitted"],
 sb=["Upload the XLSX and PDF", "Use one tab per method", "List all sources with dates"],
 sk=["Define scope", "Collect data", "Bottom-up and top-down models", "Sensitivity and memo"],
 wd=[("Model (XLSX)", "file"), ("Memo (PDF)", "file")],
)

B['t081'] = dict(
 d="Design, run and analyse a survey of at least 100 respondents (the 500 target is scaled to what a volunteer can recruit) about remote-work habits, using a free survey tool and an ethical recruitment plan. You deliver the instrument, the cleaned data, an analysis and a report with limits stated.",
 bg="Surveys fail through leading questions, bad scales and unrepresentative samples. A good survey has a clear research question, tested wording and an analysis plan written before the data arrive.",
 pr="Deliver a 12-question survey, a pilot with at least 10 people, responses from at least 100 volunteers, cleaned data, an analysis with confidence intervals and a report.",
 si=["Research questions and analysis plan", "Survey design and pilot", "Data cleaning", "Analysis with confidence intervals", "Report"],
 so=["Paid panels", "Collecting sensitive personal data"],
 st=["Write three research questions about remote-work habits (for example time spent in meetings, tools used, and satisfaction) and an analysis plan listing the tests you will run.", "Draft 12 questions using clear wording and balanced scales; avoid double-barrelled and leading questions, and include a screening and demographic items.", "Build the survey in Google Forms, Typeform or LimeSurvey with an informed-consent screen and no personal identifiers.", "Pilot it with at least 10 people, time it, and revise questions that confused them.", "Distribute it ethically through your own networks and public communities that allow such posts, recording the channels used, and aim for at least 100 valid responses.", "Clean the data: remove duplicates and straight-liners, handle missing values and document each rule.", "Analyse: descriptive statistics with 95 percent confidence intervals, cross-tabs by group and at least one hypothesis test, with effect sizes.", "Write the report with the method, sample description and limits, the findings in charts and a section on what the data cannot tell."],
 ob=["Design valid questions", "Collect and clean data responsibly", "Report findings with their limits"],
 ip=[("Survey respondents", "tasker", "", "Recruit volunteers yourself with informed consent."), ("Pew Research Center: questionnaire design", "public", "https://www.pewresearch.org/our-methods/u-s-surveys/questionnaire-design/", "Good practice for wording."), ("Google Forms", "public", "https://forms.google.com", "Free survey tool.")],
 dl=["Survey instrument (PDF)", "Cleaned anonymised data (CSV)", "Analysis (XLSX or notebook)", "Report (PDF)"],
 ac=["At least 100 valid responses and a documented pilot of 10", "Questions have no leading or double-barrelled wording (checklist attached)", "Analysis follows the plan and reports confidence intervals", "Cleaning rules are documented", "The report states sampling limits and does not over-claim"],
 ms=["After about 3 hours: design and pilot", "After about 8 hours: data collection", "After about 12 hours: analysis and report submitted"],
 sb=["Upload the four deliverables", "Remove all personal identifiers", "State collection dates and channels"],
 sk=["Plan and design", "Pilot and revise", "Collect and clean", "Analyse and report"],
 wd=[("Instrument, data and analysis (zip)", "file"), ("Report (PDF)", "file")],
)

B['t082'] = dict(
 d="Map the workflow of an order-fulfilment operation and quantify waste, using a documented public case: the warehouse process described in open lean-manufacturing teaching cases and the supplied illustrative time-study data. You deliver a process map, a waste analysis and an improvement roadmap.",
 bg="Lean thinking classifies waste (waiting, motion, overproduction, defects and so on) and measures value-added time against total lead time. A diagnostic is only credible if the data are timed and the improvement estimates are traceable to them.",
 pr="Produce a value-stream map, a quantified waste analysis and a prioritised roadmap with expected savings for the supplied fulfilment case.",
 si=["Current-state value-stream map", "Waste analysis with time-study data", "Root-cause analysis for the top three wastes", "Roadmap with benefits and effort"],
 so=["Implementing changes", "Facility redesign"],
 st=["Read the case data and list the process steps from order receipt to dispatch, with the times provided.", "Draw the current-state value-stream map including cycle time, wait time, headcount and inventory between steps.", "Calculate lead time, value-added time and process efficiency (value-added divided by lead time).", "Classify each minute of non-value-added time into the eight wastes and total them in a Pareto chart.", "For the top three wastes run a five-whys and a fishbone analysis using the information in the case.", "Propose five improvements (for example batching pick routes, pre-labelling, a pull signal) and estimate the time saved using the case data with explicit assumptions.", "Draw the future-state map and compute the new lead time and efficiency.", "Prioritise improvements in an impact and effort matrix and write the roadmap with owners, sequence and measures of success."],
 ob=["Quantify waste with data", "Find root causes", "Prioritise improvements"],
 ip=[("Fulfilment case data", "illustrative", "", "Invented time-study data supplied below."), ("Lean Enterprise Institute: value stream mapping", "public", "https://www.lean.org/lexicon-terms/value-stream-mapping/", "Method reference."), ("ASQ: Pareto and fishbone tools", "public", "https://asq.org/quality-resources", "Quality tools.")],
 cd="""Operation (fictional): Crestline Fulfilment, 40 orders per hour average. Steps (cycle time / wait before step): order release 1 min / 0; pick 9 min / 35 min; pack 5 min / 22 min; label 2 min / 18 min; quality check 3 min / 12 min; dispatch staging 2 min / 60 min.
Observations (illustrative): 14% of orders need re-pick because of wrong location; label printer jams twice per shift (15 min each); pickers walk an average of 1.8 km per shift without batching; 5 pickers, 3 packers, 1 labeller.""",
 dl=["Value-stream maps, current and future (PDF)", "Waste analysis workbook (XLSX)", "Roadmap (PDF, two pages)"],
 ac=["Lead time and efficiency are calculated from the supplied data", "Wastes are classified with a Pareto chart", "Root-cause analysis is evidence-based", "Savings estimates show assumptions", "Roadmap is prioritised with measures"],
 ms=["After about 5 hours: current-state map and metrics", "After about 12 hours: wastes and root causes", "After about 17 hours: future state", "After about 20 hours: roadmap submitted"],
 sb=["Upload the three deliverables", "Show calculations in the workbook", "Mark assumptions"],
 sk=["Map current state", "Quantify waste", "Root-cause analysis", "Future state and roadmap"],
 wd=[("Maps and workbook (zip)", "file"), ("Roadmap (PDF)", "file")],
)

B['t083'] = dict(
 d="Develop a pricing structure for a fictional subscription business using willingness-to-pay data from a supplied illustrative survey and competitor pricing you collect. You apply a Van Westendorp price-sensitivity analysis, design three tiers and model revenue under each.",
 bg="Pricing affects revenue more than most levers. Van Westendorp's method finds an acceptable price range from four questions, and tier design then segments customers by value. Estimates are only as good as the sample, so limits must be stated.",
 pr="Deliver a recommended tier structure with prices, backed by price-sensitivity analysis of the supplied data and a revenue model with sensitivity.",
 si=["Van Westendorp analysis of the survey", "Competitor pricing scan of five rivals", "Three tiers and fences", "Revenue model and recommendation"],
 so=["Running pricing experiments with real customers", "Legal review"],
 st=["Read the case data and understand the product, segments and the survey structure (four price questions for 200 respondents).", "Compute the cumulative distributions for the four questions (too cheap, cheap, expensive, too expensive) and plot them to find the four intersection points.", "Interpret the range of acceptable prices and the optimal price point, and show results for the two segments (individuals and teams).", "Collect public pricing from five direct competitors with screenshots and dates.", "Design three tiers with clear fences (usage limits, features, support) and anchor prices using the analysis and competitor data.", "Model monthly revenue for the 3,000 expected subscribers under three tier mixes and show how revenue changes with a plus or minus 10 percent change in the price.", "State the limits: stated versus actual willingness to pay, sample bias and what test you would run to confirm.", "Write the recommendation with the tier table, rationale and expected revenue range."],
 ob=["Derive a defensible price range", "Design tiers that separate segments", "Model revenue under assumptions"],
 ip=[("Survey data", "illustrative", "", "Invented 200-respondent survey summarised below; you generate the full table from the stated distribution."), ("Competitor pricing pages", "tasker", "", "Collect publicly visible prices and note URL and date."), ("Van Westendorp price sensitivity meter (overview)", "public", "https://en.wikipedia.org/wiki/Van_Westendorp%27s_Price_Sensitivity_Meter", "Method explanation.")],
 cd="""Product (fictional): Quill Notes, a note-taking app. Survey (200 respondents; 120 individuals, 80 team users). Median answers (individuals): too cheap $2, cheap $4, expensive $9, too expensive $14 per month; team users: too cheap $4, cheap $7, expensive $14, too expensive $20.
Expected subscribers: 3,000 in year one, 70% individuals. Cost to serve: $1.20 per user per month.
Generate the full 200-row table by sampling each answer from a normal distribution with the above medians and a standard deviation of 25%, using a fixed seed, and state that it is simulated.""",
 dl=["Pricing analysis and model (XLSX)", "Recommendation (PDF, three pages)", "Competitor screenshots (zip)"],
 ac=["The four Van Westendorp curves and intersection points are correct for each segment", "Tiers have clear fences and prices inside the acceptable range", "The revenue model shows at least three tier-mix scenarios and a price sensitivity", "Competitor data have sources and dates", "The limits section is honest about stated willingness to pay"],
 ms=["After about 7 hours: analysis done", "After about 15 hours: tiers and model", "After about 25 hours: recommendation submitted"],
 sb=["Upload the XLSX, PDF and screenshots", "State the random seed used", "Show formulas"],
 sk=["Price sensitivity analysis", "Competitor scan", "Tier design", "Revenue model", "Recommendation"],
 wd=[("Analysis workbook (XLSX)", "file"), ("Recommendation (PDF)", "file")],
)

B['t084'] = dict(
 d="Assess Southeast Asian markets for a fictional European consumer-electronics accessory brand, 'Nordlight', and recommend an entry path with a board-ready deck and financials. You use public data from the World Bank, ASEAN, national statistics offices and trade agencies.",
 bg="Market entry decisions combine market attractiveness, regulation, competition and the company's capabilities. The best advice ranks options with explicit criteria, states assumptions and shows the downside, not only the opportunity.",
 pr="Screen six countries, shortlist two, design an entry strategy (direct, distributor or marketplace), model five-year financials and present the recommendation in a deck.",
 si=["Country screening with scoring", "Regulatory and import requirements", "Partner and channel options", "Five-year financial model", "Board deck of 15 slides"],
 so=["Legal advice", "Contacting real partners"],
 st=["Read the company facts in the case data and define the decision criteria and weights (market size, growth, ease of doing business, competition, logistics).", "Collect public data for Indonesia, Vietnam, Thailand, Malaysia, the Philippines and Singapore: GDP per capita, internet and e-commerce penetration, population, import duties, World Bank Doing Business or successor indicators.", "Score each country and rank them, show the sensitivity of the ranking to the weights, and shortlist two.", "Research the regulatory requirements for the two (product standards, import licences, data protection where an app is involved) from official sources and list them.", "Compare three entry modes (marketplace such as Shopee or Lazada, local distributor, own subsidiary) on investment, control, speed and risk.", "Build the five-year model for the recommended path, with unit economics, marketing spend, working capital and a break-even year, with downside and upside cases.", "Identify the top five risks (currency, regulation, channel conflict and so on) and a mitigation for each.", "Create the 15-slide board deck with the recommendation, evidence and the decision requested, and an appendix of sources."],
 ob=["Rank markets objectively", "Recommend an entry mode", "Quantify the financial case and risks"],
 ip=[("Nordlight company facts", "illustrative", "", "Fictional company supplied below."), ("World Bank Open Data", "public", "https://data.worldbank.org", "Economic indicators."), ("ASEAN Stats", "public", "https://www.aseanstats.org", "Regional statistics."), ("Google, Temasek and Bain e-Conomy SEA report", "public", "https://economysea.withgoogle.com", "Regional digital economy data.")],
 cd="""Company (fictional): Nordlight, a Danish brand selling phone and laptop accessories (chargers, stands) at an average price of EUR 35, gross margin 55%. Sales EUR 28M, 80% Europe via e-commerce. Budget for entry: EUR 3M over three years. Constraints: no local presence; products need to meet local electrical safety standards.""",
 dl=["Board deck (PDF and PPTX, 15 slides)", "Scoring and financial model (XLSX)", "Regulatory and risk summary (PDF)"],
 ac=["Scoring criteria, weights and sources are explicit and the sensitivity is tested", "Regulatory requirements cite official sources", "Entry modes are compared on at least four criteria", "The model has base, upside and downside cases with a break-even year", "The deck gives a clear recommendation and decision request"],
 ms=["After about 8 hours: screening", "After about 20 hours: shortlist and entry modes", "After about 32 hours: financial model", "After about 40 hours: deck submitted"],
 sb=["Upload the deck, model and summary", "Cite every dataset and date", "Label forecasts as scenarios"],
 sk=["Screen countries", "Regulation and channels", "Entry mode comparison", "Financial model", "Board deck"],
 wd=[("Board deck (PDF and PPTX)", "file"), ("Model and summary (zip)", "file")],
)
