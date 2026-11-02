B = {}

B['t050'] = dict(
 d="Practise live chat support for a fictional online shop by answering 30 scripted shipping and returns chats using only the approved macros and policy in this brief. You write each reply, choose the right macro, personalise it, and log when a chat must be escalated.",
 bg="Live chat customers expect fast, accurate, friendly answers. Macros keep replies consistent and quick, but a macro pasted without reading the customer's message feels robotic and sometimes gives the wrong answer. Knowing when to escalate matters as much as answering.",
 pr="Reply to 30 chat transcripts (supplied in part in the case data) correctly within policy, using personalised macros, and log escalations with the reason.",
 si=["Replies to 30 chats covering shipping, returns, damaged items and order changes", "Macro selection and personalisation", "Escalation notes", "A shift log"],
 so=["Issuing refunds or accessing real accounts", "Changing the policy"],
 st=["Read the policy and the macro list in the case data and summarise each rule in your own words in a one-page cheat sheet.", "For each chat, identify the customer's real question, their emotion and any order data in the message before choosing a macro.", "Write the reply: greeting by name, acknowledgement, the answer taken from the policy, the next step and a closing line, personalising the macro in at least one sentence.", "Handle the six special cases: late delivery beyond 10 days, a damaged item, an address change after shipping, return window expired by a day, a customer who is angry, and a request outside the policy.", "Decide escalation: any request involving refunds over $100, legal threats, safety issues or repeated contact goes to an escalation note with a summary of facts and what you already told the customer.", "Check each reply for accuracy against the policy and for tone (no blame, no jargon) using a four-point checklist.", "Track your handling time estimate per chat and the macro used in the shift log.", "Write a feedback note of three macros that confused customers and how you would improve them."],
 ob=["Answer correctly and kindly", "Use macros with judgement", "Escalate when needed"],
 ip=[("Shop policy, macros and chat scripts", "illustrative", "", "Fictional shop supplied below."), ("Zendesk customer service tips", "public", "https://www.zendesk.com/blog/customer-service-skills/", "Reference for tone.")],
 cd="""Shop (fictional): Pebble & Pine, online home goods. Policy: standard shipping 3-7 business days; returns within 30 days of delivery, unused, free return label for faulty items; refunds in 5-7 business days; address changes only before the order ships; damaged items need a photo.
Macros: M1 Shipping time, M2 Return steps, M3 Damaged item, M4 Order change, M5 Delay apology.
Chat 1 (sample): 'Hi, order #2231 was supposed to be here last week and tracking has not moved for 5 days. I need it for a gift on Friday.' Chat 2: 'The mug arrived chipped. Can I just get my money back?' Chat 3: 'You people are useless!! Third time I am asking about my return!!' (30 chats in total follow this style.)""",
 dl=["Replies for all 30 chats (DOCX or XLSX)", "Shift log with macro used and escalation flags (XLSX)", "Escalation notes and the feedback note (DOCX)"],
 ac=["Every reply matches the policy", "Replies are personalised and under 120 words", "Escalations follow the stated rules and include a fact summary", "Tone checklist is completed for each chat", "The feedback note names three macros and specific improvements"],
 ms=["After about 3 hours: cheat sheet and first 15 replies", "After about 6 hours: all 30 replies", "After about 8 hours: log and notes submitted"],
 sb=["Upload the files", "Number replies to match the chats", "Use the macro codes in the log"],
 sk=["Learn policy and macros", "Answer the 30 chats", "Escalation notes", "Shift log and feedback"],
 wd=[("Replies and log (zip)", "file")],
)

B['t051'] = dict(
 d="Tag and route a backlog of 1,200 customer messages using the public Banking77 dataset (real-style banking customer queries labelled with 77 intents) and a taxonomy you design from it. You assign each message to a category and priority, measure your accuracy against the labels and propose improvements.",
 bg="Support teams spend a large share of their time reading and routing messages. A clear taxonomy sends each message to the right team the first time, shows what customers need most and exposes confusing categories.",
 pr="Map the 77 intents to a taxonomy of 8 to 12 categories with routing rules, tag 1,200 messages, and report accuracy and the most confusing categories.",
 si=["Taxonomy and routing rules", "Tagging of 1,200 messages", "Accuracy check against the dataset labels", "Recommendations"],
 so=["Training a model", "Real customer data"],
 st=["Open the Banking77 dataset on Hugging Face and read the dataset card; export or load at least 1,200 test or train messages in a spreadsheet.", "List the 77 intent labels and group them into 8 to 12 categories (for example card issues, transfers, top-ups, account access), writing a one-line definition of each.", "Define for each category the team that handles it, the default priority and one example message.", "Without looking at the label, tag the first 300 messages by reading them; then compare to the dataset labels mapped to your categories.", "Record disagreements and decide whether the message, the category definition or your reading was at fault; revise the taxonomy once.", "Tag the remaining 900 messages, applying the revised taxonomy and a priority (urgent for fraud, blocked card or missing money).", "Compute accuracy by category and a confusion list of the five most confused pairs, with example messages.", "Write the taxonomy feedback: categories to merge, split or rename, and any messages that cannot be classified."],
 ob=["Create a usable taxonomy", "Tag consistently", "Learn from disagreements"],
 ip=[("Banking77 dataset", "public", "https://huggingface.co/datasets/PolyAI/banking77", "Public dataset of banking customer queries with intent labels."), ("Zendesk: ticket tagging best practice", "public", "https://www.zendesk.com/blog/", "Background on tagging.")],
 dl=["Taxonomy and routing rules (XLSX)", "Tagged messages with priority (XLSX or CSV)", "Accuracy and feedback report (PDF)"],
 ac=["1,200 messages tagged with category and priority", "The taxonomy has 8 to 12 categories each with a definition and an owner team", "Accuracy is reported overall and by category", "The five most confused pairs are listed with examples", "Fraud and money-loss messages are flagged urgent"],
 ms=["After about 1.5 hours: data and taxonomy draft", "After about 3 hours: first 300 and revision", "After about 5 hours: all tagged and report submitted"],
 sb=["Upload the files", "Keep message IDs from the dataset", "State the dataset split used"],
 sk=["Build the taxonomy", "Tag the first 300 and compare", "Tag the remaining messages", "Report accuracy and recommendations"],
 wd=[("Tagged data and taxonomy (zip)", "file"), ("Feedback report (PDF)", "file")], tr=1200,
)

B['t052'] = dict(
 d="Write 25 help-centre articles with annotated screenshots for a real open-source application of your choice (for example Audacity or LibreOffice Writer), from questions that real users ask on its public forum. You produce articles that follow a style checklist and can be published in a help-centre tool.",
 bg="Good help articles reduce support tickets: they start from the customer's question, give the shortest route to the answer and use screenshots to remove doubt. Many support teams also measure article quality with a simple checklist.",
 pr="Collect 25 genuine questions from a public forum, write one article per question with steps and screenshots, and pass each through the style checklist.",
 si=["25 articles of 150 to 400 words with titles phrased as questions", "Annotated screenshots for at least 20 of them", "A style checklist per article", "A table of contents grouped by topic"],
 so=["Publishing to a live help centre", "Translating the articles"],
 st=["Choose the application and read its forum or Q&A pages (for example the Audacity forum or ask.libreoffice.org), noting the date and licence of any material you quote.", "Collect 25 recurring questions, group them into five topics and write each question in plain language as the article title.", "Follow the structure: one-sentence answer, numbered steps (each with one action), expected result, and a 'if this did not work' section.", "Reproduce each procedure yourself in the application and take screenshots with a consistent size, then annotate with numbered callouts.", "Write alt text for each screenshot and keep steps independent of the screenshots.", "Run the checklist on every article: title is a question, no more than eight steps, active voice, UI labels in bold exactly as shown, no unexplained jargon.", "Test two articles with another person who has not used the application and record where they got stuck, then revise.", "Create the table of contents and a short style guide describing the conventions you used."],
 ob=["Answer real questions", "Make steps verifiable", "Keep a consistent style"],
 ip=[("An open-source app and its public forum", "tasker", "", "For example Audacity (https://forum.audacityteam.org) or LibreOffice (https://ask.libreoffice.org); record the source of each question."), ("Google developer documentation style guide", "public", "https://developers.google.com/style", "Style reference.")],
 dl=["25 articles (DOCX or Markdown, in a zip)", "Screenshots (PNG, in the same zip)", "Style checklist results (XLSX)", "Table of contents and short style guide (PDF)"],
 ac=["Every procedure was reproduced by the writer", "Articles follow the structure and the checklist passes for each", "At least 20 articles have annotated screenshots with alt text", "UI labels match the application exactly", "A usability test result is recorded for two articles"],
 ms=["After about 3 hours: questions and structure", "After about 8 hours: all drafts", "After about 12 hours: screenshots, checks and TOC submitted"],
 sb=["Upload one zip plus the checklist and style guide", "Name the app and version", "Credit any quoted forum text"],
 sk=["Collect questions", "Write articles", "Screenshots", "Checklist and testing"],
 wd=[("Articles and screenshots (zip)", "file"), ("Checklist and style guide (zip)", "file")],
)

B['t053'] = dict(
 d="Resolve 24 English and Spanish customer emails within a service-level target, working from supplied illustrative messages and a bilingual policy. You write accurate, natural replies in the language of each customer and report response quality metrics.",
 bg="Bilingual support is more than translation: tone, formality and cultural expectations differ. Spanish customers expect a courteous register (usted), and a literal translation of an English macro can sound cold.",
 pr="Reply to 24 emails (12 English, 12 Spanish) within the SLA rules, applying the policy correctly and keeping a quality scorecard.",
 si=["24 replies", "Bilingual macro adjustments", "SLA tracking table", "Self-scored quality sheet"],
 so=["Phone support", "Translation of the policy documents"],
 st=["Read the SLA and policy in the case data: first reply within 4 business hours, resolution within 24 hours, and the refund and exchange rules.", "Sort the 24 emails by language, urgency and policy topic, and plan the order of reply by SLA risk.", "For each English email, draft a reply with acknowledgement, answer and next step; for each Spanish email write directly in Spanish in the usted form rather than translating an English draft.", "Check the idioms and tone of the Spanish replies for neutral Latin American usage, and avoid regionalisms.", "De-escalate the three upset customers using the acknowledge, apologise, act pattern and avoid defensive wording.", "Check each reply against the policy and complete the quality scorecard (accuracy, tone, grammar, completeness, one point each).", "Fill in the SLA table with simulated received and replied timestamps from the case and calculate the percentage within target.", "Write a short note on two phrases that do not translate well and the alternatives you used."],
 ob=["Answer in the customer's language and register", "Meet the SLA", "Maintain quality"],
 ip=[("Email set and policy", "illustrative", "", "Fictional company supplied below."), ("Real Academia Española: Diccionario", "public", "https://dle.rae.es", "Check Spanish usage.")],
 cd="""Company (fictional): Casa Verde Plants, online plant seller shipping to the US and Mexico. Policy: returns within 14 days; dead-on-arrival plants refunded with a photo within 48 hours; shipping time 5 to 8 days.
Emails (samples): EN: 'My fern arrived with brown leaves. I want a refund.' ES: 'Hola, mi pedido #4410 no ha llegado y ya pasaron 12 días.' ES: 'Quiero cambiar la maceta por una más grande, ¿se puede?' (24 in total follow this pattern.)
SLA: first reply 4 business hours, resolution 24 hours.""",
 dl=["24 replies (DOCX or XLSX)", "SLA and quality scorecard (XLSX)", "Language notes (DOCX, half a page)"],
 ac=["All replies follow the policy", "Spanish replies read naturally and use usted", "The SLA percentage is calculated correctly", "Upset customers receive an acknowledgement and a clear action", "Every reply is scored on the four-point scale"],
 ms=["After about 3 hours: triage and English replies", "After about 7 hours: Spanish replies", "After about 10 hours: scorecard and notes submitted"],
 sb=["Upload the files", "Label each reply with its email number and language", "Do not use machine translation without editing"],
 sk=["Triage and plan", "English replies", "Spanish replies", "Scorecard and SLA report"],
 wd=[("Replies and scorecard (zip)", "file")],
)

B['t054'] = dict(
 d="Design macros, triggers and views that reduce handling time in a help desk, working in a free help-desk trial (Zendesk, Freshdesk or Help Scout free plan) with 40 sample tickets you create from the brief. You measure handling time before and after on a controlled task.",
 bg="Support teams repeat the same actions hundreds of times. Macros, triggers and well-designed views save time, but only if they are based on actual ticket patterns and are easy to maintain.",
 pr="Build at least eight macros, four triggers and five views and demonstrate a measurable reduction in handling time on 40 sample tickets.",
 si=["Analysis of ticket patterns", "Eight macros, four triggers, five views", "A before and after timing study", "A short maintenance guide"],
 so=["Integration with other systems", "Real customer data"],
 st=["Create a trial help-desk account and add 40 invented tickets from the categories in the case data (password reset, refund status, shipping delay, product how-to and similar).", "Analyse the ticket mix and list the five most frequent categories with the steps agents currently take for each.", "Time yourself handling 20 of the tickets without any automation and record the time for each in a table.", "Build the macros for the top categories, using placeholders for name, order and agent, and adding the right tags and status changes.", "Create triggers for auto-tagging by keyword, auto-acknowledgement, priority escalation for the word 'refund' over a set amount and notifications for tickets unanswered for 4 hours.", "Create views: my open tickets, unassigned, urgent, waiting on customer more than 3 days and solved this week.", "Time yourself handling the other 20 tickets (similar mix) using the new set, and compute the average time saved and the percentage reduction.", "Document each macro, trigger and view, with its purpose and a note on how to review it every quarter."],
 ob=["Save agent time with a measured result", "Build maintainable automation", "Document it"],
 ip=[("Ticket categories and policy", "illustrative", "", "Fictional shop supplied below."), ("Zendesk: macros and triggers help", "public", "https://support.zendesk.com/hc/en-us/articles/4408844187034", "Official guidance."), ("Freshdesk free plan", "public", "https://freshdesk.com", "An alternative free tool.")],
 cd="""Shop (fictional): Pebble & Pine. Ticket mix to create (40): password reset (8), order status (10), return request (8), damaged item (6), product how-to (5), billing question (3).
Rule examples: any message containing 'refund' with an amount above $100 gets priority High; tickets waiting on a customer for 3 days are reminded then closed after 7.""",
 dl=["Configuration document with all macros, triggers and views (PDF)", "Screenshots of the configuration (zip)", "Timing study (XLSX)"],
 ac=["At least eight macros, four triggers and five views work as described", "The timing study uses a comparable mix before and after", "The percentage time saved is calculated correctly", "Each item is documented", "The study states its limits (one person, 20 tickets per round)"],
 ms=["After about 2 hours: tickets created and baseline timed", "After about 6 hours: automation built", "After about 9 hours: second timing and documentation submitted"],
 sb=["Upload the PDF, screenshots and XLSX", "Name the help-desk tool and plan", "Do not upload real credentials"],
 sk=["Create sample tickets", "Baseline timing", "Build macros, triggers and views", "Re-time and document"],
 wd=[("Configuration and screenshots (zip)", "file"), ("Timing study (XLSX)", "file")],
)

B['t055'] = dict(
 d="Work through twelve illustrative billing disputes for a fictional subscription service and decide each case using the stated policy, the invoice and payment records provided, and Stripe's public dispute guidance. For each you write the resolution, the customer message and a root-cause summary.",
 bg="Billing disputes are costly: a chargeback costs the fee plus the amount and can harm the merchant's standing. Most disputes begin with confusion about renewals, proration or duplicate charges, so finding the root cause prevents more of them.",
 pr="Resolve 12 cases correctly, write a clear customer message for each and summarise the three biggest root causes with recommendations.",
 si=["12 case decisions with calculations", "Customer replies", "Root-cause summary", "Policy improvement proposals"],
 so=["Contacting real customers or accessing payment systems", "Legal advice"],
 st=["Read the subscription terms and billing policy in the case data and list how proration, renewals, refunds and failed payments work.", "For each case, rebuild the timeline of invoices and payments from the records and check for duplicates, wrong plan or expired cards.", "Calculate any proration or refund exactly, showing the formula and rounding to the cent.", "Decide the outcome (refund, partial credit, explanation or decline) and cite the policy clause.", "Write the customer reply: acknowledge, state what happened with the dates and amounts, give the outcome and what will happen next.", "For the two cases that may become chargebacks, prepare an evidence summary of the type Stripe asks for (customer communication, terms, usage).", "Summarise the root cause of each case in one sentence and group them into themes with counts.", "Recommend three process or policy changes that would prevent the top themes and estimate the share of cases each would address."],
 ob=["Decide each case fairly and correctly", "Communicate clearly", "Prevent repeat disputes"],
 ip=[("Policy and case files", "illustrative", "", "Fictional service supplied below."), ("Stripe: disputes and chargebacks", "public", "https://docs.stripe.com/disputes", "Dispute process."), ("Stripe: prorations", "public", "https://docs.stripe.com/billing/subscriptions/prorations", "How proration works.")],
 cd="""Service (fictional): StreamNote, a note-taking subscription: Basic $8 per month, Pro $15 per month, annual plans 10 months price. Policy: monthly plans non-refundable except duplicate or erroneous charges; annual plans refundable within 14 days; cancelling stops the next renewal; upgrades prorated daily.
Case 1 (sample): Customer upgraded from Basic to Pro on day 10 of a 30-day cycle and was charged $9.50; disputes the amount. Case 2: two charges of $15 on the same day for the same account. Case 3: annual plan $150 renewed on 3 Oct; customer asks refund on 25 Oct, saying no reminder email arrived (reminders were sent on 19 Sep, per log). (12 cases in total.)""",
 dl=["Case decisions and calculations (XLSX)", "Twelve customer replies (DOCX)", "Root-cause summary and recommendations (PDF)"],
 ac=["Calculations are correct to the cent and show formulas", "Each decision cites a policy clause", "Replies include dates, amounts and next steps", "The root-cause summary groups cases into themes with counts", "Recommendations are specific and linked to the themes"],
 ms=["After about 3 hours: timelines for all cases", "After about 7 hours: decisions and replies", "After about 12 hours: root-cause summary submitted"],
 sb=["Upload the three deliverables", "Reference cases by number", "Show every calculation"],
 sk=["Rebuild timelines", "Decide and calculate", "Write replies", "Root-cause summary"],
 wd=[("Decisions and replies (zip)", "file"), ("Root-cause summary (PDF)", "file")],
)

B['t056'] = dict(
 d="Design a QA programme for a 40-agent customer support team: scorecards, a sampling plan, calibration sessions and a coaching loop. You use public datasets of support conversations (such as Twitter customer support data) to test your scorecard on real examples and produce the complete playbook.",
 bg="Support QA fails when scorecards are long, reviewers disagree and feedback arrives weeks late. A good programme defines quality in observable behaviours, measures reviewer agreement and links scores to coaching.",
 pr="Deliver a QA playbook: scorecards for chat and email, sampling method, calibration process with a measured agreement target, coaching templates and reporting dashboard design.",
 si=["Scorecards with weighted criteria", "Sampling plan for 40 agents", "Calibration exercise with inter-rater agreement", "Coaching framework and reports"],
 so=["Implementing the programme in a live team", "Software procurement"],
 st=["Define quality for the team in five dimensions (accuracy, resolution, tone, process, compliance) and write observable behaviours for each.", "Build the scorecards for chat and email with weights, automatic fail items and a 100-point scale, keeping to 12 criteria or fewer.", "Download a public sample of customer support conversations (for example the Customer Support on Twitter dataset) and select 30 conversations to use as test material.", "Have yourself and a second reviewer score 10 conversations independently, calculate agreement (percentage and Cohen's kappa) and identify the ambiguous criteria.", "Revise the criteria wording to resolve disagreement and re-score a second set to show improved agreement.", "Design the sampling plan: number of reviews per agent per month by tenure, extra sampling after a poor score, and a method for choosing random conversations.", "Create the coaching loop: how scores become a coaching topic, a 1-to-1 template, a development plan and a follow-up check after two weeks.", "Design the reporting pack with metrics by agent, team and criterion, trends and a calibration summary, and write the calibration session agenda."],
 ob=["Define and measure quality", "Make reviewers consistent", "Link QA to coaching"],
 ip=[("Customer Support on Twitter dataset", "public", "https://www.kaggle.com/datasets/thoughtvector/customer-support-on-twitter", "Public conversations for test material (free Kaggle account needed)."), ("Cohen's kappa explanation (scikit-learn)", "public", "https://scikit-learn.org/stable/modules/generated/sklearn.metrics.cohen_kappa_score.html", "Agreement statistic.")],
 dl=["QA playbook (PDF)", "Scorecards and sampling plan (XLSX)", "Calibration results (XLSX)", "Coaching templates (DOCX)"],
 ac=["Scorecards have observable criteria with weights summing to 100", "Agreement is measured before and after revision with both figures reported", "The sampling plan states the volume per agent and the reasoning", "Coaching templates link a score to a specific action", "Public data are used only as stated by the dataset licence"],
 ms=["After about 4 hours: dimensions and scorecards", "After about 10 hours: calibration test", "After about 16 hours: sampling, coaching and reporting", "After about 20 hours: playbook submitted"],
 sb=["Upload the four deliverables", "Cite the dataset and its licence", "Keep personal handles from the dataset out of your documents"],
 sk=["Define quality and scorecards", "Calibration exercise", "Sampling plan", "Coaching loop and reporting", "Playbook"],
 wd=[("Playbook (PDF)", "file"), ("Scorecards and calibration (zip)", "file")],
)
