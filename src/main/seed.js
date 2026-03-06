/**
 * Embeds sample data for first-launch seeding.
 * Called from database.js  - receives the already-initialised better-sqlite3 instance.
 */

function seedSampleData(db) {
  // ── Projects ──
  const projectColors = {
    'ETL Pipeline':   '#3b82f6',
    'Data Quality':   '#10b981',
    'Reporting':      '#f59e0b',
    'Infrastructure': '#8b5cf6',
    'Meetings':       '#ec4899',
  };

  const insertProject = db.prepare('INSERT OR IGNORE INTO projects (name, color) VALUES (?, ?)');
  for (const [name, color] of Object.entries(projectColors)) {
    insertProject.run(name, color);
  }

  const projectIds = {};
  for (const row of db.prepare('SELECT id, name FROM projects').all()) {
    projectIds[row.name] = row.id;
  }

  // ── Tags ──
  const tagDefs = {
    'pipeline':      '#3b82f6',
    'spark':         '#f97316',
    'azure':         '#0ea5e9',
    'incident':      '#ef4444',
    'documentation': '#8b5cf6',
    'optimization':  '#10b981',
    'sprint':        '#ec4899',
    'demo':          '#f59e0b',
  };

  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)');
  for (const [name, color] of Object.entries(tagDefs)) {
    insertTag.run(name, color);
  }

  const tagIds = {};
  for (const row of db.prepare('SELECT id, name FROM tags').all()) {
    tagIds[row.name] = row.id;
  }

  const insertEntryTag = db.prepare('INSERT OR IGNORE INTO entry_tags (entry_date, tag_id) VALUES (?, ?)');

  // ── Holidays ──
  const holidays = [
    { date: '2026-01-01', label: 'New Year\'s Day' },
    { date: '2026-01-17', label: 'Saturday' },
    { date: '2026-01-18', label: 'Sunday' },
    { date: '2026-01-19', label: 'Martin Luther King Jr. Day' },
    { date: '2026-01-26', label: 'Republic Day (India)' },
    { date: '2026-02-14', label: 'Valentine\'s Day' },
  ];

  const insertHoliday = db.prepare('INSERT OR IGNORE INTO holidays (date, label) VALUES (?, ?)');
  for (const h of holidays) {
    insertHoliday.run(h.date, h.label);
  }

  // ── Task Templates ──
  const templates = [
    {
      name: 'Daily Standup',
      tasks: [
        { text: 'Review yesterday\'s progress', projectId: null },
        { text: 'Update Jira board', projectId: null },
        { text: 'Team standup call (15 min)', projectId: projectIds['Meetings'] },
        { text: 'Check pipeline alerts from overnight runs', projectId: projectIds['Data Quality'] },
      ],
      recurring: true,
    },
    {
      name: 'Sprint Planning',
      tasks: [
        { text: 'Sprint planning session', projectId: projectIds['Meetings'] },
        { text: 'Review and prioritize backlog', projectId: null },
        { text: 'Estimate story points', projectId: null },
        { text: 'Update sprint board', projectId: null },
        { text: 'Send sprint goals to stakeholders', projectId: projectIds['Meetings'] },
      ],
      recurring: false,
    },
    {
      name: 'Data Pipeline Deploy',
      tasks: [
        { text: 'Run pre-deployment tests', projectId: projectIds['Data Quality'] },
        { text: 'Terraform plan  - verify infra changes', projectId: projectIds['Infrastructure'] },
        { text: 'Deploy notebooks to production workspace', projectId: projectIds['ETL Pipeline'] },
        { text: 'Trigger dry run with sample data', projectId: projectIds['ETL Pipeline'] },
        { text: 'Verify Great Expectations checks pass', projectId: projectIds['Data Quality'] },
        { text: 'Update runbook and notify stakeholders', projectId: projectIds['Meetings'] },
      ],
      recurring: false,
    },
    {
      name: 'Month-End Close',
      tasks: [
        { text: 'Verify all pipelines ran successfully', projectId: projectIds['Data Quality'] },
        { text: 'Run monthly close aggregation notebook', projectId: projectIds['Reporting'] },
        { text: 'Reconcile totals with Finance team', projectId: projectIds['Reporting'] },
        { text: 'Generate monthly summary report', projectId: projectIds['Reporting'] },
        { text: 'Archive monthly data snapshot', projectId: projectIds['Infrastructure'] },
        { text: 'Send close confirmation to stakeholders', projectId: projectIds['Meetings'] },
      ],
      recurring: false,
    },
  ];

  const insertTemplate = db.prepare(
    'INSERT OR IGNORE INTO task_templates (name, tasks_json, recurring) VALUES (?, ?, ?)'
  );
  for (const t of templates) {
    insertTemplate.run(t.name, JSON.stringify(t.tasks), t.recurring ? 1 : 0);
  }

  // ── Helpers ──
  const insertEntry = db.prepare(`
    INSERT OR REPLACE INTO entries (date, log_content, tomorrows_plan, created_at, updated_at)
    VALUES (?, ?, ?, datetime(?), datetime(?))
  `);
  const insertTask = db.prepare(`
    INSERT INTO tasks (entry_date, text, completed, position, time_spent, project_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  function addDay(date, log, plan, tasks, tags) {
    const ts = `${date}T09:00:00`;
    insertEntry.run(date, log, plan, ts, ts);
    tasks.forEach((t, i) => {
      const status = t.status || (t.done ? 'done' : 'todo');
      insertTask.run(date, t.text, t.done ? 1 : 0, i, t.time || 0, t.project ? projectIds[t.project] : null, status);
    });
    if (tags) {
      for (const tagName of tags) {
        if (tagIds[tagName]) {
          insertEntryTag.run(date, tagIds[tagName]);
        }
      }
    }
  }

  // ════════════════════  JANUARY 2026  ════════════════════

  addDay('2026-01-02',
    `<p>First working day of 2026. Light day  - most of the team still on PTO.</p>
<p>Caught up on emails and Slack. Read through the <strong>Q1 Finance Data Platform roadmap</strong> shared by Ankit before the break. Major initiative: migrate the legacy batch ETL from on-prem SQL Server to <strong>Azure Data Factory + Databricks</strong>.</p>
<p>Set up my local dev environment  - pulled latest repos, updated Python packages, verified Azure CLI access.</p>
<blockquote><p>Key goal for Q1: Build a real-time transaction ingestion pipeline and retire the nightly batch job by end of March.</p></blockquote>`,
    `<p>Review the existing ETL codebase in detail  - understand all the stored procedures and SSIS packages.</p>
<p>Set up project board in Jira for the migration work.</p>`,
    [
      { text: 'Read Q1 roadmap document', done: true, time: 2700, project: 'Meetings' },
      { text: 'Set up local dev environment', done: true, time: 3600, project: 'Infrastructure' },
      { text: 'Verify Azure CLI and Databricks access', done: true, time: 1800, project: 'Infrastructure' },
      { text: 'Review email backlog', done: true, time: 1200, project: 'Meetings' },
    ],
    ['azure', 'pipeline']
  );

  addDay('2026-01-05',
    `<p>Full team back today. <strong>Sprint planning</strong> in the morning  - 2-hour session with Ankit (Tech Lead), Priya (Analytics Lead) and Ravi (DBA).</p>
<p>Sprint 1 focus areas:</p>
<ul><li>Document the existing SSIS-based ETL for transaction data</li><li>Spike on Azure Data Factory vs. custom Spark jobs</li><li>Set up the CI/CD pipeline for the new Databricks workspace</li></ul>
<p>Afternoon: Started deep-diving into the <strong>SSIS packages</strong>  - there are 47 packages handling transaction, settlement, and reconciliation data. Some of them haven't been modified since 2019.</p>
<p>Found 3 packages that silently swallow errors  - no logging, no alerts. Flagged to Ravi.</p>`,
    `<p>Continue SSIS package documentation  - focus on the transaction ingestion flow.</p>
<p>Start drafting the ADF pipeline architecture diagram.</p>`,
    [
      { text: 'Sprint 1 planning session', done: true, time: 7200, project: 'Meetings' },
      { text: 'Document SSIS packages  - transaction flow', done: true, time: 10800, project: 'ETL Pipeline' },
      { text: 'Flag error-swallowing packages to Ravi', done: true, time: 900, project: 'Data Quality' },
      { text: 'Set up Jira board for migration project', done: true, time: 2400, project: 'Meetings' },
      { text: 'Start ADF architecture diagram', done: false, time: 1800, project: 'ETL Pipeline' },
    ],
    ['sprint', 'documentation', 'pipeline']
  );

  addDay('2026-01-06',
    `<p>Focused day on documentation and architecture.</p>
<p>Mapped out the full <strong>transaction data lineage</strong>  - from source systems (Core Banking, Payment Gateway, Card Processor) through SSIS to the data warehouse. Created a detailed Mermaid diagram.</p>
<p>Had a 30-min call with the <strong>Card Processor team</strong> to understand their API. They're moving to a streaming model (Kafka) in Q2  - perfect timing for us.</p>
<p>Drafted the <strong>ADF pipeline architecture</strong>:</p>
<ol><li>Ingest from 3 source systems via ADF Copy Activity</li><li>Land in ADLS Gen2 (Bronze layer)</li><li>Transform in Databricks (Silver → Gold)</li><li>Serve to Power BI and downstream APIs</li></ol>`,
    `<p>Review architecture with Ankit. Get feedback before spiking.</p>
<p>Start the Databricks workspace Terraform setup.</p>`,
    [
      { text: 'Map transaction data lineage end-to-end', done: true, time: 14400, project: 'ETL Pipeline' },
      { text: 'Call with Card Processor team about API', done: true, time: 1800, project: 'Meetings' },
      { text: 'Draft ADF pipeline architecture (Bronze/Silver/Gold)', done: true, time: 7200, project: 'ETL Pipeline' },
      { text: 'Update confluence with data lineage diagram', done: true, time: 2400, project: 'ETL Pipeline' },
    ],
    ['pipeline', 'azure', 'documentation']
  );

  addDay('2026-01-07',
    `<p>Architecture review with Ankit  - he approved the bronze/silver/gold lakehouse approach from <span data-type="backlink" data-date="2026-01-06"></span>. Suggested adding a <strong>data quality gate</strong> between Bronze → Silver using Great Expectations.</p>
<p>Started <strong>Terraform setup</strong> for the Databricks workspace:</p>
<ul><li>Created the resource group and ADLS Gen2 storage account</li><li>Configured the Databricks workspace with Unity Catalog</li><li>Set up service principal for ADF ↔ Databricks auth</li></ul>
<p>Hit a snag with Unity Catalog metastore  - turned out we needed a separate storage account for the metastore root. Fixed by EOD.</p>
<p>Team standup: Priya asked about the reporting layer timeline. Told her Gold tables should be ready for Power BI by end of Sprint 3 (Feb 6).</p>`,
    `<p>Finish Terraform  - add CI/CD pipeline in Azure DevOps.</p>
<p>Start coding the Bronze ingestion notebook in Databricks.</p>`,
    [
      { text: 'Architecture review with Ankit', done: true, time: 3600, project: 'Meetings' },
      { text: 'Terraform  - Databricks workspace + ADLS Gen2', done: true, time: 14400, project: 'Infrastructure' },
      { text: 'Fix Unity Catalog metastore storage issue', done: true, time: 3600, project: 'Infrastructure' },
      { text: 'Configure service principal for ADF-Databricks auth', done: true, time: 2700, project: 'Infrastructure' },
      { text: 'Team standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['azure', 'spark']
  );

  addDay('2026-01-08',
    `<p>Big progress day!</p>
<p>Finalized the <strong>Terraform IaC</strong>  - all infra is now code-managed. Added an Azure DevOps pipeline that runs <code>terraform plan</code> on PR and <code>terraform apply</code> on merge to main.</p>
<p>Started coding the first <strong>Bronze ingestion notebook</strong>  - pulling transaction data from Core Banking SQL Server via ADF and landing as Delta tables in ADLS.</p>
<p>Key design decisions:</p>
<ul><li>Partition by <code>transaction_date</code> (daily partitions)</li><li>Use <strong>merge</strong> (upsert) pattern for late-arriving records</li><li>Schema evolution enabled via Delta's <code>mergeSchema</code> option</li></ul>
<p>Ravi shared the transaction table DDL  - 42 columns. Need to map data types carefully for Spark.</p>`,
    `<p>Complete the Bronze notebook for Core Banking transactions.</p>
<p>Start the Silver transformation logic  - business rules for status mapping.</p>`,
    [
      { text: 'Finalize Terraform + Azure DevOps CI/CD', done: true, time: 7200, project: 'Infrastructure' },
      { text: 'Code Bronze ingestion notebook  - Core Banking txns', done: true, time: 14400, project: 'ETL Pipeline' },
      { text: 'Map 42-column DDL to Spark schema', done: true, time: 3600, project: 'ETL Pipeline' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['spark', 'pipeline']
  );

  addDay('2026-01-09',
    `<p>Sprint review and retro in the afternoon.</p>
<p>Morning: Completed the Core Banking <strong>Bronze notebook</strong>. Ran it against the dev SQL Server  - ingested 2.3M transaction records into Delta. Performance: 4 min 22 sec. Pretty good for initial run.</p>
<p>Started the <strong>Silver transformation notebook</strong>:</p>
<ul><li>Status code mapping (20+ codes → 5 business categories)</li><li>Currency conversion lookups</li><li>Deduplication logic for duplicate settlement records</li></ul>
<p>Sprint 1 retro highlights:</p>
<ul><li>Good: Infrastructure is fully automated, architecture is solid</li><li>Improve: Need access to production-like data volumes for perf testing</li><li>Action: Ravi to provision a read replica for us</li></ul>`,
    `<p>Continue Silver transformations  - tackle the currency conversion and dedup logic.</p>`,
    [
      { text: 'Complete Bronze notebook  - test with 2.3M records', done: true, time: 7200, project: 'ETL Pipeline' },
      { text: 'Start Silver transformation notebook', done: true, time: 10800, project: 'ETL Pipeline' },
      { text: 'Sprint 1 review & retro', done: true, time: 5400, project: 'Meetings' },
      { text: 'Document Bronze layer schema in Confluence', done: true, time: 1800, project: 'ETL Pipeline' },
    ],
    ['sprint', 'spark', 'pipeline']
  );

  addDay('2026-01-10',
    `<p><strong>Production Emergency  - called in at 7 AM</strong></p>
<p>The legacy nightly batch job (SSIS Package #12  - Settlement Reconciliation) <strong>failed</strong> after processing 800K of 1.2M records. Root cause: the source system pushed a schema change overnight  - added 2 new columns without notifying us.</p>
<p>Fix:</p>
<ol><li>Updated the SSIS package to handle the new columns (added as pass-through)</li><li>Re-ran the batch from the failure checkpoint</li><li>Verified reconciliation totals with the Ops team</li></ol>
<p>Batch completed at 11:30 AM. All settlement reports generated on time.</p>
<blockquote><p>This is exactly why we need the new pipeline  - the legacy system is fragile and has zero schema evolution support. Delta Lake handles this natively.</p></blockquote>`,
    `<p>File an incident report. Push for the source system team to implement schema change notifications.</p>`,
    [
      { text: 'Diagnose SSIS Package #12 failure', done: true, time: 3600, project: 'ETL Pipeline' },
      { text: 'Fix schema mismatch  - add new columns', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Re-run batch from checkpoint, verify totals', done: true, time: 7200, project: 'Data Quality' },
      { text: 'Notify Ops team  - settlement reports OK', done: true, time: 900, project: 'Meetings' },
    ],
    ['incident', 'pipeline']
  );

  addDay('2026-01-12',
    `<p>Sprint 2 kickoff. Filed the incident report from Saturday's outage on <span data-type="backlink" data-date="2026-01-10"></span>  - <strong>INC-4821</strong>.</p>
<p>Sprint 2 goals:</p>
<ul><li>Complete Silver transformation layer</li><li>Build Gold aggregation tables for Finance reporting</li><li>Set up Great Expectations data quality checks</li><li>Start Payment Gateway ingestion</li></ul>
<p>Spent the afternoon on <strong>Silver transformation</strong>  - implemented the currency conversion logic using ECB daily exchange rates. Tricky part: handling weekends/holidays where rates aren't published (use last available rate).</p>
<p>Paired with Priya on understanding the <strong>finance reporting requirements</strong>  - she needs daily P&L breakdowns by product line, region, and currency.</p>`,
    `<p>Finish currency conversion in Silver. Start deduplication logic.</p>
<p>Meeting with source system team about schema change process.</p>`,
    [
      { text: 'Sprint 2 planning', done: true, time: 5400, project: 'Meetings' },
      { text: 'File incident report INC-4821', done: true, time: 2400, project: 'Meetings' },
      { text: 'Implement currency conversion in Silver layer', done: true, time: 12600, project: 'ETL Pipeline' },
      { text: 'Pair with Priya on reporting requirements', done: true, time: 3600, project: 'Reporting' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['sprint', 'spark']
  );

  addDay('2026-01-13',
    `<p>Deep technical day. Tackled the <strong>deduplication challenge</strong> in settlement data.</p>
<p>Problem: Payment Gateway sends duplicate settlement records when a retry occurs. They share the same <code>txn_reference</code> but different <code>settlement_id</code>. Need to keep only the latest by <code>processed_timestamp</code>.</p>
<p>Solution: Used a <strong>window function</strong> approach in Spark:</p>
<pre><code>window_spec = Window.partitionBy("txn_reference").orderBy(col("processed_timestamp").desc())
df = df.withColumn("rn", row_number().over(window_spec)).filter("rn = 1").drop("rn")</code></pre>
<p>Also met with the <strong>Source System team</strong> about the schema change from Saturday. They agreed to:</p>
<ul><li>Notify 48 hours before any schema changes</li><li>Publish schema versions in a shared registry</li></ul>`,
    `<p>Set up Great Expectations for Bronze → Silver quality gate.</p>
<p>Start Payment Gateway ingestion notebook.</p>`,
    [
      { text: 'Implement deduplication logic for settlement data', done: true, time: 10800, project: 'ETL Pipeline' },
      { text: 'Write unit tests for dedup window function', done: true, time: 5400, project: 'Data Quality' },
      { text: 'Meeting with Source System team  - schema change process', done: true, time: 3600, project: 'Meetings' },
      { text: 'Code review Ravi\'s DB migration scripts', done: true, time: 2700, project: 'Infrastructure' },
    ],
    ['spark', 'optimization']
  );

  addDay('2026-01-14',
    `<p>Set up <strong>Great Expectations</strong> as our data quality framework.</p>
<p>Configured expectations for the Bronze → Silver transition:</p>
<ul><li>No null values in <code>transaction_id</code>, <code>amount</code>, <code>currency</code></li><li>Amount > 0 for all debit transactions</li><li>Valid currency codes (ISO 4217)</li><li>Date ranges within expected bounds (no future dates)</li><li>Unique constraint on <code>transaction_id</code> after dedup</li></ul>
<p>Integrated GE into the Databricks notebook  - runs automatically after Silver transformation. On failure, sends a Slack alert to #data-platform-alerts.</p>
<p>Also started the <strong>Payment Gateway Bronze ingestion</strong>  - similar pattern to Core Banking but via REST API instead of SQL. Using ADF's REST connector with pagination support.</p>`,
    `<p>Complete Payment Gateway ingestion. Test GE expectations with edge cases.</p>`,
    [
      { text: 'Set up Great Expectations framework in Databricks', done: true, time: 10800, project: 'Data Quality' },
      { text: 'Configure 12 data quality expectations', done: true, time: 5400, project: 'Data Quality' },
      { text: 'Slack alert integration for GE failures', done: true, time: 2700, project: 'Data Quality' },
      { text: 'Start Payment Gateway Bronze ingestion', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['pipeline', 'azure']
  );

  addDay('2026-01-15',
    `<p>Completed the <strong>Payment Gateway ingestion</strong> pipeline. The API returns paginated JSON  - max 1000 records per page. Implemented a parameterized ADF pipeline that:</p>
<ol><li>Calls the API with date range parameters</li><li>Handles pagination via <code>next_page_token</code></li><li>Lands raw JSON in ADLS Bronze layer</li><li>Flattens nested JSON to Delta table via Databricks</li></ol>
<p>Tested with 3 months of historical data  - 450K payment records ingested in 8 minutes. Good throughput.</p>
<p>Afternoon: Started working on the <strong>Gold aggregation tables</strong>. First table: <code>gold_daily_transaction_summary</code>  - aggregates Silver txns by date, product, region, currency. This is what Priya's Power BI dashboards will consume.</p>`,
    `<p>Complete Gold daily summary table. Start Gold P&L breakdown table.</p>
<p>Sprint review prep.</p>`,
    [
      { text: 'Complete Payment Gateway Bronze ingestion + pagination', done: true, time: 14400, project: 'ETL Pipeline' },
      { text: 'Test with 450K historical records', done: true, time: 3600, project: 'Data Quality' },
      { text: 'Start Gold daily transaction summary table', done: true, time: 7200, project: 'Reporting' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['pipeline', 'spark']
  );

  addDay('2026-01-16',
    `<p>Sprint 2 midpoint. Good velocity so far.</p>
<p>Completed the <strong>Gold daily transaction summary</strong> table and started the <strong>Gold P&L breakdown</strong>. The P&L logic is complex  - need to join transaction data with the chart of accounts, apply fee schedules, and calculate net revenue per product line.</p>
<p>Had a 1:1 with Ankit. He's happy with progress. Mentioned that the <strong>CFO wants a demo</strong> of the new dashboards by end of January. Priya and I need to have at least the daily summary dashboard ready.</p>
<p>Code review session with the team  - reviewed Ravi's stored procedure migration scripts. Found a bug in the month-end close procedure where it wasn't handling leap year correctly for Feb 29 calculations. Good catch  - would have been invisible until 2028.</p>`,
    `<p>Martin Luther King Day on Monday  - off. Tuesday: focus on P&L Gold table.</p>`,
    [
      { text: 'Complete Gold daily transaction summary table', done: true, time: 7200, project: 'Reporting' },
      { text: 'Start Gold P&L breakdown table', done: true, time: 10800, project: 'Reporting' },
      { text: '1:1 with Ankit  - CFO demo timeline', done: true, time: 1800, project: 'Meetings' },
      { text: 'Code review  - found leap year bug', done: true, time: 3600, project: 'Data Quality' },
      { text: 'Sprint midpoint standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['sprint', 'demo']
  );

  addDay('2026-01-20',
    `<p>Back after the long weekend. Dove straight into the <strong>P&L Gold table</strong>.</p>
<p>The chart of accounts mapping was the hard part  - Finance uses a 6-level hierarchy (Company → Business Unit → Department → Cost Center → Account → Sub-Account). Had to build a recursive CTE-style flattening in Spark.</p>
<p>Also discovered that the fee schedule data lives in an <strong>Excel file on SharePoint</strong>. Priya manually updates it monthly. This needs to be automated  - added it to the backlog.</p>
<p>End of day: P&L Gold table is working for 3 of 5 product lines. Remaining 2 (Card Processing and FX Trading) have special fee structures that need separate logic.</p>`,
    `<p>Complete P&L for Card Processing and FX Trading.</p>
<p>Start connecting Gold tables to Power BI via Direct Lake mode.</p>`,
    [
      { text: 'Build chart of accounts hierarchy flattening', done: true, time: 10800, project: 'ETL Pipeline' },
      { text: 'Implement P&L logic for 3 product lines', done: true, time: 10800, project: 'Reporting' },
      { text: 'Log backlog item  - automate fee schedule from SharePoint', done: true, time: 900, project: 'Meetings' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['spark', 'optimization']
  );

  addDay('2026-01-21',
    `<p>Cracked the <strong>Card Processing fee structure</strong>  - it uses a tiered pricing model based on monthly volume bands. Implemented a UDF in PySpark that applies the correct fee tier based on cumulative monthly volume.</p>
<p><strong>FX Trading P&L</strong> was even more complex  - involves unrealized P&L from open positions valued at daily close rates. Built a position-level valuation table that joins with ECB rates.</p>
<p>All 5 product lines now have P&L calculations working!</p>
<p>Afternoon: Connected the Gold Delta tables to <strong>Power BI via Direct Lake mode</strong>. Priya tested queries  - sub-second response on daily summaries. She's excited.</p>`,
    `<p>Work with Priya to finalize the CFO demo dashboard layout.</p>
<p>Start the Card Processor source ingestion pipeline.</p>`,
    [
      { text: 'Implement Card Processing tiered fee logic', done: true, time: 7200, project: 'Reporting' },
      { text: 'Build FX Trading P&L with position valuation', done: true, time: 10800, project: 'Reporting' },
      { text: 'Connect Gold tables to Power BI Direct Lake', done: true, time: 5400, project: 'Reporting' },
      { text: 'Test Power BI queries with Priya', done: true, time: 2700, project: 'Reporting' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['spark', 'demo']
  );

  addDay('2026-01-22',
    `<p>Started building the <strong>Card Processor ingestion pipeline</strong>  - third and final source system.</p>
<p>Card Processor uses <strong>SFTP file drops</strong>  - daily CSV files with settlement data. Created an ADF pipeline that:</p>
<ul><li>Monitors the SFTP folder via a tumbling window trigger</li><li>Picks up new files, validates file naming convention</li><li>Copies to ADLS Bronze, archives the original</li><li>Triggers Databricks transformation notebook</li></ul>
<p>The CSV files are pipe-delimited (not comma) and have inconsistent quoting. Wrote a custom parser to handle edge cases.</p>
<p>Paired with Priya on the <strong>CFO dashboard</strong>  - she built a clean executive summary page with daily transaction volumes, revenue breakdown by product, and month-over-month trends. Looks sharp.</p>`,
    `<p>Complete Card Processor Silver transformation. Add GE quality checks for the new source.</p>`,
    [
      { text: 'Build Card Processor SFTP ingestion pipeline', done: true, time: 14400, project: 'ETL Pipeline' },
      { text: 'Write custom pipe-delimited CSV parser', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Pair with Priya on CFO dashboard design', done: true, time: 3600, project: 'Reporting' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['pipeline', 'azure']
  );

  addDay('2026-01-23',
    `<p>Sprint 2 review and retro.</p>
<p>Completed the <strong>Card Processor Silver transformation</strong>  - maps card types, merges with merchant master data, applies interchange fee calculations.</p>
<p>Added <strong>Great Expectations checks</strong> for Card Processor data:</p>
<ul><li>Card number format validation (masked  - last 4 digits only)</li><li>Merchant ID exists in master data</li><li>Settlement amount matches expected interchange fee range</li></ul>
<p>Sprint 2 retro:</p>
<ul><li>Good: All 3 source systems ingesting, Gold tables ready, Power BI connected</li><li>Improve: Need to add monitoring/alerting for ADF pipeline failures</li><li>Action: Set up Azure Monitor alerts + Slack webhook</li></ul>
<p>CFO demo confirmed for <span data-type="backlink" data-date="2026-01-29"></span>. Priya and I will present together.</p>`,
    `<p>Monday: Set up ADF monitoring. Start end-to-end testing with production-like data volumes.</p>`,
    [
      { text: 'Complete Card Processor Silver transformation', done: true, time: 7200, project: 'ETL Pipeline' },
      { text: 'Add GE quality checks for Card Processor', done: true, time: 5400, project: 'Data Quality' },
      { text: 'Sprint 2 review & retro', done: true, time: 5400, project: 'Meetings' },
      { text: 'Confirm CFO demo date with stakeholders', done: true, time: 900, project: 'Meetings' },
    ],
    ['sprint', 'demo']
  );

  addDay('2026-01-27',
    `<p>Performance optimization day. Attacked the <strong>Silver layer bottleneck</strong>.</p>
<p>Root cause: The currency rate lookup table (350K rows  - daily rates x 160 currencies x 6 years) was being broadcast-joined, but it's too large for broadcast. Spark was spilling to disk.</p>
<p>Fix: <strong>Bucketed join</strong>  - partitioned both tables by <code>currency_code</code> and <code>rate_date</code>. Also added a date-range filter before the join to limit to the processing window.</p>
<p>Results after optimization:</p>
<ul><li>Full 28M record backfill: <strong>47 min → 14 min</strong></li><li>Daily incremental run: <strong>~2 min</strong> for ~150K records</li></ul>
<p>Also ran a <strong>data reconciliation</strong> against the legacy warehouse  - numbers match within 0.01% (rounding differences in currency conversion). Priya validated the totals.</p>`,
    `<p>CFO demo prep with Priya. Polish dashboards, prepare talking points.</p>`,
    [
      { text: 'Fix broadcast join bottleneck  - implement bucketed join', done: true, time: 10800, project: 'ETL Pipeline' },
      { text: 'Re-run performance test  - 47 min → 14 min', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Data reconciliation vs legacy warehouse', done: true, time: 7200, project: 'Data Quality' },
      { text: 'Priya validated reconciliation totals', done: true, time: 1800, project: 'Reporting' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['optimization', 'spark']
  );

  addDay('2026-01-28',
    `<p>CFO demo prep day  - demo is tomorrow <span data-type="backlink" data-date="2026-01-29"></span>. Spent the morning with <strong>Priya polishing the Power BI dashboards</strong>:</p>
<ul><li>Executive summary with key KPIs (daily volume, revenue, transaction count)</li><li>Product-level P&L breakdown with drill-down</li><li>Regional heat map of transaction activity</li><li>Month-over-month trend analysis</li></ul>
<p>Created a backup slide deck in case Power BI has issues during the live demo.</p>
<p>Afternoon: Ran the full pipeline one more time. <strong>Everything clean</strong>  - all Great Expectations checks passed, Gold tables updated, dashboards refreshed. Ready for tomorrow.</p>
<p>Also wrote the <strong>runbook for month-end close</strong>  - step-by-step guide for running the pipeline during the Jan 31 close cycle.</p>`,
    `<p>CFO demo at 2 PM. Month-end close prep.</p>`,
    [
      { text: 'Polish Power BI dashboards with Priya', done: true, time: 10800, project: 'Reporting' },
      { text: 'Create backup demo slide deck', done: true, time: 3600, project: 'Reporting' },
      { text: 'Final end-to-end pipeline run  - all green', done: true, time: 5400, project: 'Data Quality' },
      { text: 'Write month-end close runbook', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['demo', 'documentation']
  );

  addDay('2026-01-29',
    `<p><strong>CFO Demo Day!</strong></p>
<p>Demo at 2 PM with CFO (Rajesh), VP Finance (Meera), and the whole data platform team.</p>
<p>Priya walked through the dashboards; I explained the technical architecture and data freshness (from T+1 batch to near-real-time capability by Q2).</p>
<p><strong>Feedback from CFO:</strong></p>
<ul><li>"This is a massive improvement over the Excel reports we've been getting"</li><li>Wants <strong>automated daily email</strong> of the P&L summary → added to backlog</li><li>Asked about <strong>anomaly detection</strong>  - can we flag unusual transaction patterns? → Q2 initiative</li><li>Approved budget for additional Databricks capacity for production</li></ul>
<p>Team celebration at Starbucks after. Good morale boost.</p>
<p>Evening: Started prepping for <strong>month-end close on Saturday (Jan 31)</strong>. Verified all pipeline schedules, tested manual trigger procedures.</p>`,
    `<p>Month-end close preparation. Ensure all pipelines are scheduled correctly for Jan 31.</p>
<p>Add CFO's email report request to Sprint 4 backlog.</p>`,
    [
      { text: 'CFO demo presentation', done: true, time: 7200, project: 'Meetings' },
      { text: 'Log CFO feedback  - email reports, anomaly detection', done: true, time: 1800, project: 'Meetings' },
      { text: 'Prep for month-end close', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Verify pipeline schedules for Jan 31', done: true, time: 3600, project: 'ETL Pipeline' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['demo']
  );

  addDay('2026-01-30',
    `<p>Sprint 3 review. Last working day before month-end.</p>
<p>Final checks on all pipelines:</p>
<ul><li>Core Banking ingestion  - running on schedule</li><li>Payment Gateway  - API connection healthy</li><li>Card Processor  - SFTP monitored, today's file ingested</li><li>Great Expectations  - all 34 checks passing</li><li>Gold tables refreshed  - Power BI dashboards up to date</li></ul>
<p>Added a <strong>month-end specific Gold table</strong>  - <code>gold_monthly_close_summary</code> that aggregates the entire month's data with final adjustments. This table only refreshes on the last business day of the month.</p>
<p>Sprint 3 retro: Best sprint yet. Pipeline is stable, data quality is high, CFO is happy. Team morale is great.</p>`,
    `<p>Month-end close on Saturday. Monitor pipelines from home. Be on-call.</p>`,
    [
      { text: 'Final pipeline health checks  - all green', done: true, time: 5400, project: 'Data Quality' },
      { text: 'Build gold_monthly_close_summary table', done: true, time: 10800, project: 'Reporting' },
      { text: 'Sprint 3 review & retro', done: true, time: 5400, project: 'Meetings' },
      { text: 'Set up on-call schedule for weekend', done: true, time: 900, project: 'Infrastructure' },
    ],
    ['sprint', 'pipeline']
  );

  // ════════════════════  FEBRUARY 2026  ════════════════════

  addDay('2026-02-02',
    `<p>Month-end close went <strong>smoothly</strong> over the weekend! All pipelines ran on schedule. No failures. The monthly close summary was generated automatically  - Priya confirmed the numbers match Finance's internal reconciliation. Great result after the CFO demo on <span data-type="backlink" data-date="2026-01-29"></span>.</p>
<p>Sprint 4 kickoff. Focus areas:</p>
<ul><li>Automated daily P&L email for CFO</li><li>Historical data migration (complete backfill of 2024-2025 data)</li><li>Pipeline monitoring dashboard</li><li>Performance tuning for larger workloads</li></ul>
<p>Started the <strong>automated email report</strong>  - using Azure Logic Apps to pull data from the Gold layer, render an HTML email, and send to the CFO distribution list at 7 AM daily.</p>
<p>Interesting challenge: Finance wants the email to include a <strong>comparison column</strong> showing same-day-prior-month figures. Requires a self-join on the Gold table.</p>`,
    `<p>Complete the automated email pipeline. Start historical backfill for 2025.</p>`,
    [
      { text: 'Sprint 4 planning', done: true, time: 3600, project: 'Meetings' },
      { text: 'Post-month-end review  - everything green', done: true, time: 2700, project: 'Data Quality' },
      { text: 'Start automated daily P&L email via Logic Apps', done: true, time: 12600, project: 'Reporting' },
      { text: 'Design month-over-month comparison logic', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['sprint', 'azure']
  );

  addDay('2026-02-03',
    `<p>Completed the <strong>automated daily email</strong> pipeline. CFO received the first test email at 7:15 AM. Feedback: "Love it. Can we add a sparkline chart?"  - added to nice-to-have list.</p>
<p>Started the <strong>historical backfill</strong> for 2025. This is a big job  - 12 months of transaction data from all 3 sources. Strategy:</p>
<ol><li>Run one month at a time to manage cluster costs</li><li>Use a parameterized notebook with <code>start_date</code> and <code>end_date</code></li><li>Validate each month's totals against the legacy warehouse before moving to the next</li></ol>
<p>Completed Jan-Mar 2025 backfill today. Numbers reconcile perfectly. 48M records ingested.</p>
<p>Met with Ravi about the <strong>production deployment plan</strong>  - we need a separate Databricks workspace for production. Terraform is ready, just need the subscription quota approved.</p>`,
    `<p>Continue backfill  - Apr-Jun 2025. Follow up on production subscription quota.</p>`,
    [
      { text: 'Complete + test automated daily email to CFO', done: true, time: 7200, project: 'Reporting' },
      { text: 'Historical backfill  - Jan-Mar 2025 (48M records)', done: true, time: 14400, project: 'ETL Pipeline' },
      { text: 'Validate backfill against legacy warehouse', done: true, time: 5400, project: 'Data Quality' },
      { text: 'Meet Ravi  - production deployment plan', done: true, time: 2700, project: 'Infrastructure' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['pipeline', 'spark']
  );

  addDay('2026-02-04',
    `<p>Backfill continues. Completed <strong>Apr-Jun 2025</strong>  - another 52M records. Running total: 100M records in the lakehouse.</p>
<p>Hit an issue with the <strong>Payment Gateway API</strong> for historical data  - their API only serves 90 days of history. For older data, they export a bulk CSV from their database. Coordinate with their team for the export.</p>
<p>Started building the <strong>pipeline monitoring dashboard</strong> in Power BI:</p>
<ul><li>Pipeline run history (success/fail/duration)</li><li>Data freshness indicators (last successful run per source)</li><li>Data quality trend (GE check pass rate over time)</li><li>Cost tracking (Databricks DBU consumption)</li></ul>
<p>This will be our ops dashboard  - displayed on the team's wall monitor.</p>`,
    `<p>Continue backfill  - Jul-Sep 2025. Payment Gateway bulk export coordination.</p>`,
    [
      { text: 'Historical backfill  - Apr-Jun 2025 (52M records)', done: true, time: 14400, project: 'ETL Pipeline' },
      { text: 'Coordinate Payment Gateway bulk history export', done: true, time: 2700, project: 'Meetings' },
      { text: 'Build pipeline monitoring dashboard  - 4 panels', done: true, time: 10800, project: 'Reporting' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['pipeline']
  );

  addDay('2026-02-05',
    `<p>Completed <strong>Jul-Sep 2025 backfill</strong> (55M records). Also ingested the Payment Gateway bulk CSV for Jan-Sep 2025 historical data that their team sent overnight. Had to write a separate notebook to process the bulk format (different schema than the API response).</p>
<p>Running total: <strong>155M records</strong> in the lakehouse across all sources.</p>
<p>Performance observation: The daily Gold aggregation is now slower with more historical data. The <code>gold_daily_transaction_summary</code> table rebuild takes 12 minutes instead of 3. Need to switch to <strong>incremental refresh</strong> instead of full rebuild.</p>
<p>Implemented <strong>incremental Gold refresh</strong>:</p>
<ul><li>Only processes new/modified records since last run</li><li>Uses Delta table's <code>_commit_timestamp</code> for change detection</li><li>Daily run now takes ~45 seconds regardless of total data size</li></ul>`,
    `<p>Complete final backfill months (Oct-Dec 2025). Deploy incremental refresh to all Gold tables.</p>`,
    [
      { text: 'Historical backfill  - Jul-Sep 2025 (55M records)', done: true, time: 10800, project: 'ETL Pipeline' },
      { text: 'Process Payment Gateway bulk CSV export', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Implement incremental Gold refresh pattern', done: true, time: 10800, project: 'ETL Pipeline' },
      { text: 'Test incremental run  - 12 min → 45 sec', done: true, time: 3600, project: 'Data Quality' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['optimization', 'spark']
  );

  addDay('2026-02-06',
    `<p>Sprint 4 review. Completed the final backfill months  - <strong>Oct-Dec 2025</strong>. Full year of 2025 data is now in the lakehouse.</p>
<p>Total dataset: <strong>~210M transaction records</strong> spanning Jan 2025 – Jan 2026.</p>
<p>Applied incremental refresh to all Gold tables. Daily pipeline end-to-end now runs in <strong>under 5 minutes</strong> for all 3 sources combined.</p>
<p>Sprint 4 retro highlights:</p>
<ul><li>Good: Historical backfill complete, CFO email running daily, monitoring dashboard live</li><li>Good: Zero production incidents this sprint!</li><li>Improve: Need to think about disaster recovery  - what if ADLS goes down?</li><li>Action: Design DR strategy for Sprint 5</li></ul>
<p>Ankit shared that <strong>leadership approved the Kafka streaming initiative</strong> for Q2  - we'll move from T+1 batch to near-real-time. Exciting!</p>`,
    `<p>Wrap up documentation. Tag backfill completion milestone. Enjoy the weekend!</p>`,
    [
      { text: 'Complete final backfill  - Oct-Dec 2025', done: true, time: 10800, project: 'ETL Pipeline' },
      { text: 'Apply incremental refresh to all Gold tables', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Sprint 4 review & retro', done: true, time: 5400, project: 'Meetings' },
      { text: 'Update architecture docs with final design', done: true, time: 3600, project: 'ETL Pipeline' },
      { text: 'Tag milestone  - historical migration complete', done: true, time: 900, project: 'Meetings' },
    ],
    ['sprint', 'documentation']
  );

  addDay('2026-02-07',
    `<p><strong>Production Alert  - 6 AM Saturday</strong></p>
<p>PagerDuty alert: <strong>Payment Gateway daily file not received</strong>. SFTP monitor triggered after the 5 AM SLA window passed with no file.</p>
<p>Investigation:</p>
<ol><li>Checked SFTP  - no file dropped. Not on our side.</li><li>Called Payment Gateway on-call (Vikram)  - their nightly export job crashed due to a <strong>disk space issue</strong> on their export server</li><li>They freed up space and re-ran at 8 AM</li><li>File arrived at 8:47 AM  - 127K records</li><li>Manually triggered our pipeline  - processed in 3 minutes</li><li>Verified data quality  - all GE checks passed</li></ol>
<p>Impact: Settlement report delayed by 4 hours. Finance team notified. No financial impact.</p>
<p>Added a secondary detection: if no file by 6 AM, auto-send a courtesy email to Payment Gateway ops team asking for ETA.</p>`,
    `<p>File incident report for the SFTP delay. Add proactive alerting for late files.</p>`,
    [
      { text: 'Investigate Payment Gateway SFTP file missing', done: true, time: 3600, project: 'Data Quality' },
      { text: 'Coordinate with Payment Gateway on-call', done: true, time: 5400, project: 'Meetings' },
      { text: 'Manually trigger pipeline after late file arrival', done: true, time: 1800, project: 'ETL Pipeline' },
      { text: 'Verify data quality  - all checks passed', done: true, time: 1800, project: 'Data Quality' },
      { text: 'Add proactive late-file alerting', done: true, time: 3600, project: 'Infrastructure' },
    ],
    ['incident']
  );

  addDay('2026-02-09',
    `<p>Sprint 5 kickoff. Filed the incident report for Saturday's SFTP delay on <span data-type="backlink" data-date="2026-02-07"></span>  - <strong>INC-4903</strong>.</p>
<p>Sprint 5 focus:</p>
<ul><li>Disaster Recovery strategy design</li><li>Production workspace deployment</li><li>Data catalog setup (Unity Catalog tags + descriptions)</li><li>Prepare for Kafka streaming PoC (Q2 initiative)</li></ul>
<p>Started designing the <strong>DR strategy</strong>:</p>
<ul><li>ADLS Gen2: Geo-redundant storage (GRS) enabled  - automatic replication to paired region</li><li>Databricks: Terraform-managed  - can recreate workspace in minutes</li><li>Delta tables: Time travel enabled (30-day retention)  - can restore any point in time</li><li>ADF: ARM template export  - can redeploy all pipelines programmatically</li></ul>
<p>RTO target: 30 minutes. RPO target: 1 hour. Should be achievable with current architecture.</p>`,
    `<p>Complete DR runbook. Start production workspace Terraform deployment.</p>`,
    [
      { text: 'Sprint 5 planning', done: true, time: 3600, project: 'Meetings' },
      { text: 'File incident report INC-4903', done: true, time: 1800, project: 'Meetings' },
      { text: 'Design DR strategy  - GRS + time travel + Terraform', done: true, time: 14400, project: 'Infrastructure' },
      { text: 'Define RTO/RPO targets with Ankit', done: true, time: 2700, project: 'Meetings' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['azure', 'documentation']
  );

  addDay('2026-02-10',
    `<p>Started deploying the <strong>production Databricks workspace</strong>. Subscription quota was approved last week.</p>
<p>Terraform deployment:</p>
<ul><li>Production resource group + ADLS Gen2 with GRS</li><li>Databricks workspace with Unity Catalog</li><li>Service principals for ADF + monitoring</li><li>Key Vault for secrets management</li><li>Network security  - private endpoints for ADLS + Databricks</li></ul>
<p>Migrated all notebooks from dev to production workspace. Set up <strong>Git integration</strong>  - production notebooks pull from the <code>main</code> branch only. No manual edits allowed in prod.</p>
<p>Started the <strong>data catalog</strong> work  - adding column-level descriptions, PII tags, and business glossary terms to all Delta tables via Unity Catalog. This is for compliance (the audit team has been asking).</p>
<p>End of day: Production ADF pipelines are configured and ready for a dry run tomorrow.</p>`,
    `<p>Run production dry run with today's data. Complete data catalog tagging.</p>
<p>Start Kafka streaming PoC research  - evaluate Confluent vs. Azure Event Hubs.</p>`,
    [
      { text: 'Terraform deploy  - production Databricks workspace', done: true, time: 14400, project: 'Infrastructure' },
      { text: 'Migrate notebooks to production + Git integration', done: true, time: 5400, project: 'Infrastructure' },
      { text: 'Set up Key Vault for production secrets', done: true, time: 3600, project: 'Infrastructure' },
      { text: 'Start Unity Catalog data tagging', done: false, time: 5400, project: 'Data Quality' },
      { text: 'Configure production ADF pipelines', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['azure', 'pipeline']
  );

  // ════════════════════  FEBRUARY (continued)  ════════════════════

  addDay('2026-02-11',
    `<p>Production dry run day. Triggered the full ADF pipeline with yesterday's data against the new Databricks workspace.</p>
<p>Results:</p>
<ul><li>All 12 notebooks executed successfully</li><li>Bronze → Silver → Gold transformations completed in <strong>47 minutes</strong> (vs. 3.5 hours on the old SSIS pipeline)</li><li>Great Expectations validation: 100% pass</li><li>Data catalog tagging: 85% complete</li></ul>
<p>One hiccup: the <code>customer_address</code> PII column wasn't masked in the Silver layer. Fixed with a dynamic view using <code>CASE WHEN is_current_user_data_owner()</code>.</p>`,
    `<p>Complete data catalog tagging (remaining 15%). Start Kafka streaming research.</p>`,
    [
      { text: 'Run production dry run  - ADF + Databricks', done: true, time: 10800, project: 'ETL Pipeline' },
      { text: 'Validate dry run output  - GE checks pass', done: true, time: 3600, project: 'Data Quality' },
      { text: 'Fix PII masking for customer_address column', done: true, time: 5400, project: 'Data Quality' },
      { text: 'Continue data catalog tagging (85% done)', done: false, time: 3600, project: 'Data Quality' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['azure', 'pipeline']
  );

  addDay('2026-02-12',
    `<p>Completed the <strong>Unity Catalog data tagging</strong>  - all 48 tables now have column descriptions, PII tags, and business glossary terms. Compliance team signed off.</p>
<p>Started the <strong>Kafka streaming research</strong>. Evaluated two options:</p>
<ol><li><strong>Confluent Cloud</strong>  - managed Kafka, schema registry, connectors. Higher cost but less operational burden.</li><li><strong>Azure Event Hubs with Kafka protocol</strong>  - native Azure integration, cheaper, but fewer connector options.</li></ol>
<p>Leaning toward Confluent for the CDC use case. Their Debezium-based connectors are production-ready. Set up a trial cluster to run benchmarks tomorrow.</p>`,
    `<p>Run Kafka throughput benchmarks on Confluent trial. Compare latency with Event Hubs.</p>`,
    [
      { text: 'Complete Unity Catalog data tagging  - all 48 tables', done: true, time: 7200, project: 'Data Quality' },
      { text: 'Research Confluent Cloud vs. Azure Event Hubs', done: true, time: 10800, project: 'ETL Pipeline' },
      { text: 'Set up Confluent Cloud trial cluster', done: true, time: 3600, project: 'Infrastructure' },
      { text: 'Compliance team sign-off on data catalog', done: true, time: 1800, project: 'Meetings' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['azure', 'documentation']
  );

  addDay('2026-02-13',
    `<p>Kafka benchmark day. Ran throughput and latency tests on the Confluent trial cluster.</p>
<p>Results:</p>
<ul><li><strong>Confluent Cloud:</strong> 50K messages/sec sustained, p99 latency 12ms</li><li><strong>Event Hubs (Kafka mode):</strong> 30K messages/sec, p99 latency 45ms</li></ul>
<p>Confluent is the clear winner for our real-time use case. Wrote up a cost comparison  - $2,100/month for Confluent vs. $1,400/month for Event Hubs. The performance difference justifies the cost.</p>
<p>Shared the recommendation with Ankit. He wants to present to the VP next week for budget approval.</p>`,
    `<p>Prepare Kafka platform recommendation deck for VP presentation.</p>`,
    [
      { text: 'Run Confluent Cloud throughput benchmark  - 50K msg/sec', done: true, time: 7200, project: 'ETL Pipeline' },
      { text: 'Run Event Hubs benchmark  - 30K msg/sec', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Write cost comparison document', done: true, time: 5400, project: 'Reporting' },
      { text: 'Review benchmark results with Ankit', done: true, time: 2700, project: 'Meetings' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['spark', 'optimization']
  );

  addDay('2026-02-16',
    `<p>Sprint 5 kickoff. Key objectives:</p>
<ul><li>Get Confluent Cloud approved and provisioned</li><li>Build the first CDC connector for Core Banking transactions</li><li>Start the streaming consumer pipeline in Databricks</li></ul>
<p>Prepared the <strong>Kafka platform recommendation deck</strong> for Ankit's VP presentation on Wednesday. Includes architecture diagram, benchmark results, cost breakdown, and risk assessment.</p>
<p>Also set up the <strong>Confluent Cloud dev environment</strong>  - created topics for each source system, configured schema registry with Avro schemas based on our existing table definitions.</p>`,
    `<p>Finalize recommendation deck. Start building the CDC connector for Core Banking.</p>`,
    [
      { text: 'Sprint 5 planning session', done: true, time: 5400, project: 'Meetings' },
      { text: 'Prepare Kafka recommendation deck', done: true, time: 10800, project: 'Reporting' },
      { text: 'Set up Confluent Cloud dev environment', done: true, time: 7200, project: 'Infrastructure' },
      { text: 'Create Avro schemas for source tables', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['sprint', 'azure']
  );

  addDay('2026-02-17',
    `<p>Started building the <strong>Core Banking CDC connector</strong> using Debezium. This captures row-level changes from the source SQL Server and publishes to our Confluent topic.</p>
<p>Configuration was straightforward  - Debezium has a native SQL Server connector. Challenges:</p>
<ul><li>Had to enable CDC on 8 source tables in SQL Server (required DBA coordination with Ravi)</li><li>Schema evolution: using Avro with backward compatibility in schema registry</li><li>Key serialization: composite keys for the <code>transactions</code> table needed custom config</li></ul>
<p>By end of day, the connector was capturing inserts and updates on the dev instance. Deletes need soft-delete handling  - adding a <code>_deleted</code> flag column to the Delta table.</p>`,
    `<p>Test CDC connector with production-like data volume. Handle soft deletes.</p>`,
    [
      { text: 'Build Debezium CDC connector for Core Banking', done: true, time: 14400, project: 'ETL Pipeline' },
      { text: 'Coordinate with Ravi to enable CDC on source tables', done: true, time: 3600, project: 'Meetings' },
      { text: 'Configure Avro schema evolution strategy', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Handle soft-delete pattern for Delta Lake', done: false, time: 3600, project: 'ETL Pipeline' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['pipeline', 'spark']
  );

  addDay('2026-02-18',
    `<p>Confluent Cloud budget <strong>approved</strong>! Ankit presented yesterday, VP gave the green light. $2,100/month is within the team's cloud budget.</p>
<p>Provisioned the <strong>production Confluent cluster</strong>  - dedicated tier in the same Azure region as our Databricks workspace. Set up:</p>
<ul><li>Production topics with 12 partitions each</li><li>ACLs and service accounts for the CDC connector and consumer</li><li>Schema registry with production schemas</li><li>Monitoring via Confluent Control Center</li></ul>
<p>Finished the <strong>soft-delete handling</strong>  - using a <code>MERGE INTO</code> statement in Databricks to flag deleted rows instead of physically removing them. This preserves audit trail.</p>`,
    `<p>Deploy CDC connector to production Confluent cluster. Start building the streaming consumer.</p>`,
    [
      { text: 'Provision production Confluent cluster', done: true, time: 7200, project: 'Infrastructure' },
      { text: 'Configure production ACLs and service accounts', done: true, time: 5400, project: 'Infrastructure' },
      { text: 'Set up Confluent Control Center monitoring', done: true, time: 3600, project: 'Infrastructure' },
      { text: 'Implement soft-delete MERGE INTO pattern', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['azure', 'pipeline']
  );

  addDay('2026-02-19',
    `<p>Built the <strong>Spark Structured Streaming consumer</strong>  - reads from Confluent Cloud topic, deserializes Avro, applies transformations, and writes to Delta Lake.</p>
<p>Architecture:</p>
<ul><li>Source: Confluent Cloud topic <code>core-banking.transactions</code></li><li>Processing: Spark Structured Streaming with trigger interval of 30 seconds</li><li>Sink: Delta Lake table <code>silver.transactions_streaming</code></li><li>Checkpointing in ADLS for exactly-once semantics</li></ul>
<p>Initial testing on dev  - processing ~3K events/sec. Need to tune for the 15K target.</p>
<p>Ravi reported that CDC is capturing about 200K rows/day from Core Banking. This aligns with our capacity planning.</p>`,
    `<p>Performance tune the streaming consumer. Add Great Expectations validation layer.</p>`,
    [
      { text: 'Build Spark Structured Streaming consumer pipeline', done: true, time: 14400, project: 'ETL Pipeline' },
      { text: 'Configure ADLS checkpointing for exactly-once', done: true, time: 3600, project: 'Infrastructure' },
      { text: 'Initial performance test  - 3K events/sec', done: true, time: 5400, project: 'Data Quality' },
      { text: 'Review CDC volume metrics with Ravi', done: true, time: 1800, project: 'Meetings' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['spark', 'pipeline']
  );

  addDay('2026-02-20',
    `<p>Performance tuning day for the streaming consumer. Made several improvements:</p>
<ul><li>Increased Spark executor count from 2 to 4</li><li>Tuned <code>maxOffsetsPerTrigger</code> to batch more messages per micro-batch</li><li>Optimized Delta Lake compaction  - auto-optimize + Z-ordering on <code>transaction_date</code></li></ul>
<p>Results: <strong>8K events/sec</strong> sustained. Still short of the 15K target but much better. Need to investigate if the bottleneck is Spark deserialization or Delta writes.</p>
<p>Added a <strong>Great Expectations validation layer</strong> on the streaming output  - checks run every hour on the latest partition. Validations: null checks, range checks, referential integrity with dimension tables.</p>`,
    `<p>Continue performance tuning. Target 15K events/sec by end of next week.</p>`,
    [
      { text: 'Performance tune streaming consumer  - 8K events/sec', done: true, time: 10800, project: 'ETL Pipeline' },
      { text: 'Optimize Delta Lake compaction + Z-ordering', done: true, time: 5400, project: 'ETL Pipeline' },
      { text: 'Add Great Expectations validation to streaming output', done: true, time: 7200, project: 'Data Quality' },
      { text: 'Profile Spark bottleneck  - deserialization vs. writes', done: false, time: 3600, project: 'ETL Pipeline' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['spark', 'optimization']
  );

  addDay('2026-02-23',
    `<p>Week 2 of the streaming sprint. Focus on hitting the <strong>15K events/sec</strong> throughput target.</p>
<p>Found the bottleneck  - Avro deserialization was single-threaded in the consumer. Switched to using <strong>Confluent's Spark Avro integration</strong> which parallelizes deserialization across partitions. Also increased topic partitions from 6 to 12.</p>
<p>New results: <strong>14.2K events/sec</strong>  - almost there! The remaining gap is likely Delta write contention. Will try adaptive query execution and smaller file sizes.</p>
<p>Priya shared her <strong>anomaly detection prototype</strong>  - a statistical model that flags unusual transaction volumes per merchant. Uses IQR-based outlier detection on the streaming data. Very promising!</p>`,
    `<p>Push for 15K target. Review Priya's anomaly detection model in detail.</p>`,
    [
      { text: 'Fix Avro deserialization bottleneck  - parallel processing', done: true, time: 10800, project: 'ETL Pipeline' },
      { text: 'Increase topic partitions from 6 to 12', done: true, time: 3600, project: 'Infrastructure' },
      { text: 'Performance test  - 14.2K events/sec achieved', done: true, time: 5400, project: 'Data Quality' },
      { text: 'Review Priya\'s anomaly detection prototype', done: true, time: 3600, project: 'Data Quality' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['spark', 'optimization']
  );

  addDay('2026-02-24',
    `<p>Hit the target! <strong>15.3K events/sec</strong> sustained throughput after enabling adaptive query execution and reducing Delta file target size to 64MB.</p>
<p>Ran a 4-hour stress test with production-volume data. Results:</p>
<ul><li>Zero data loss (checkpointing + exactly-once semantics working)</li><li>P99 end-to-end latency: 45 seconds (source change → available in Delta)</li><li>Memory usage stable at 70% across executors</li></ul>
<p>The streaming pipeline is ready for the parallel run against the batch system. Planning to start Phase 1 on March 2nd.</p>
<p>Afternoon: Sprint 5 review  - demo'd the full streaming pipeline to the team and stakeholders. Ankit called it "the most impressive demo this quarter."</p>`,
    `<p>Prepare the parallel run plan. Document the streaming architecture for the ops team.</p>`,
    [
      { text: 'Achieve 15.3K events/sec  - target met!', done: true, time: 7200, project: 'ETL Pipeline' },
      { text: 'Run 4-hour stress test  - zero data loss', done: true, time: 14400, project: 'Data Quality' },
      { text: 'Sprint 5 review  - streaming pipeline demo', done: true, time: 5400, project: 'Meetings' },
      { text: 'Start parallel run planning document', done: false, time: 1800, project: 'ETL Pipeline' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['spark', 'demo', 'sprint']
  );

  addDay('2026-02-25',
    `<p>Documentation and planning day. Wrote the <strong>parallel run plan</strong>  - a detailed document covering:</p>
<ul><li>Scope: Core Banking transactions only (Phase 1)</li><li>Duration: 1 week (March 2-6)</li><li>Success criteria: 99.95% data match between batch and streaming</li><li>Rollback plan: disable streaming consumer, continue with batch</li><li>Monitoring: dedicated Grafana dashboard for comparison metrics</li></ul>
<p>Also documented the full <strong>streaming architecture</strong> for the ops team  - infrastructure diagram, runbook, alerting thresholds, and escalation procedures.</p>
<p>Ravi completed the <strong>disaster recovery testing</strong> for the streaming infrastructure  - successfully failed over to the secondary region and back.</p>`,
    `<p>Finalize parallel run plan with team. Set up comparison monitoring dashboard.</p>`,
    [
      { text: 'Write parallel run plan document', done: true, time: 10800, project: 'ETL Pipeline' },
      { text: 'Document streaming architecture for ops', done: true, time: 7200, project: 'Infrastructure' },
      { text: 'Review DR testing results with Ravi', done: true, time: 3600, project: 'Infrastructure' },
      { text: 'Set up Grafana comparison dashboard', done: false, time: 3600, project: 'Reporting' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['documentation', 'pipeline']
  );

  addDay('2026-02-26',
    `<p>Last prep day before the parallel run. Set up the <strong>Grafana comparison dashboard</strong>  - side-by-side view of batch and streaming outputs with real-time diff metrics.</p>
<p>Dashboard panels:</p>
<ul><li>Row count comparison (batch vs. streaming per hour)</li><li>Total amounts comparison</li><li>Hash-based row match percentage</li><li>Streaming consumer lag (should be <30 sec)</li><li>Alert panel for any discrepancies >0.05%</li></ul>
<p>Ran a final end-to-end test with both systems. Everything looks good. Team is confident for Monday's parallel run start.</p>
<p>Friday retro: Sprint 5 was our best sprint yet. All major deliverables completed, streaming pipeline ready for production validation.</p>`,
    `<p>March 2: Start Phase 1 parallel run. Monitor closely on Day 1.</p>`,
    [
      { text: 'Build Grafana comparison dashboard', done: true, time: 10800, project: 'Reporting' },
      { text: 'Run final end-to-end test', done: true, time: 5400, project: 'Data Quality' },
      { text: 'Team readiness check for parallel run', done: true, time: 2700, project: 'Meetings' },
      { text: 'Sprint 5 retro', done: true, time: 3600, project: 'Meetings' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings' },
    ],
    ['sprint', 'pipeline']
  );

  // ════════════════════  RECENT DAYS  - show Kanban statuses  ════════════════════

  addDay('2026-02-27',
    `<p>Kafka streaming PoC is progressing well. Today focused on the <strong>consumer application</strong>  - reading from the transaction topic and writing to Delta Lake in near-real-time.</p>
<p>Key decisions:</p>
<ul><li>Using <strong>Spark Structured Streaming</strong> with Delta Lake sink</li><li>Trigger interval: 30 seconds (micro-batch)</li><li>Checkpoint location in ADLS for exactly-once semantics</li><li>Schema registry integration for Avro deserialization</li></ul>
<p>The consumer is processing ~5,000 events/sec in dev. Production target is 15K/sec. Need to tune partition count and executor sizing.</p>
<p>Also started writing the <strong>Kafka migration runbook</strong>  - side-by-side comparison of batch vs. streaming for each source system.</p>`,
    `<p>Performance tune the Kafka consumer for 15K events/sec target.</p>
<p>Complete migration runbook and review with Ankit.</p>`,
    [
      { text: 'Build Spark Structured Streaming consumer', done: true, time: 14400, project: 'ETL Pipeline', status: 'done' },
      { text: 'Configure Delta Lake sink with checkpointing', done: true, time: 5400, project: 'ETL Pipeline', status: 'done' },
      { text: 'Integrate schema registry for Avro deserialization', done: true, time: 7200, project: 'ETL Pipeline', status: 'done' },
      { text: 'Performance test  - 5K events/sec achieved', done: true, time: 3600, project: 'Data Quality', status: 'done' },
      { text: 'Start Kafka migration runbook', done: false, time: 3600, project: 'ETL Pipeline', status: 'in_progress' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings', status: 'done' },
    ],
    ['spark', 'pipeline', 'documentation']
  );

  addDay('2026-02-28',
    `<p><strong>End of February</strong>. Month-end close #2 with the new pipeline. Smooth as expected.</p>
<p>Morning: Completed the <strong>Kafka migration runbook</strong>. Reviewed with Ankit  - he approved the phased cutover plan:</p>
<ol><li>Phase 1 (Mar 2-6): Run streaming and batch in parallel for Core Banking</li><li>Phase 2 (Mar 9-13): Validate parity, disable batch if clean</li><li>Phase 3 (Mar 16-20): Repeat for Payment Gateway and Card Processor</li><li>Phase 4 (Mar 23-27): Full streaming, decommission SSIS packages</li></ol>
<p>Afternoon: Month-end close  - all automated. Gold summary generated, CFO email sent, Finance confirmed totals. Zero manual intervention needed.</p>
<p>Sprint 6 retro: Kafka PoC successful, production pipeline stable, team velocity at an all-time high.</p>`,
    `<p>March 2: Start Phase 1  - parallel run for Core Banking streaming.</p>
<p>Prepare the team for the cutover week.</p>`,
    [
      { text: 'Complete Kafka migration runbook', done: true, time: 7200, project: 'ETL Pipeline', status: 'done' },
      { text: 'Review cutover plan with Ankit', done: true, time: 3600, project: 'Meetings', status: 'done' },
      { text: 'Month-end close  - automated, zero intervention', done: true, time: 5400, project: 'Reporting', status: 'done' },
      { text: 'Sprint 6 review & retro', done: true, time: 5400, project: 'Meetings', status: 'done' },
      { text: 'Verify all GE checks pass on monthly data', done: true, time: 2700, project: 'Data Quality', status: 'done' },
    ],
    ['sprint', 'pipeline']
  );

  // ── Today and upcoming: show in_progress and todo statuses for Kanban demo ──

  addDay('2026-03-02',
    `<p><strong>Phase 1 begins</strong>  - parallel run of batch + streaming for Core Banking transactions. Following the cutover plan approved on <span data-type="backlink" data-date="2026-02-28"></span>.</p>
<p>Enabled the Kafka producer on the Core Banking source system (their team deployed the CDC connector using Debezium). First events flowing into our topic by 10 AM.</p>
<p>Set up the <strong>comparison framework</strong>  - a daily reconciliation job that compares streaming output vs. batch output. Both land in separate Delta tables; a validation notebook checks row counts, total amounts, and hash-based row matching.</p>
<p>Day 1 results: <strong>99.97% match</strong>. The 0.03% gap is from 12 records that arrived via streaming but hadn't been picked up by the nightly batch yet (timing difference). Expected and acceptable.</p>
<p>Also onboarded the team on the new <strong>streaming monitoring dashboard</strong>  - shows consumer lag, throughput, error rates, and checkpoint progress in real-time.</p>`,
    `<p>Continue parallel run. Monitor streaming lag and data consistency.</p>
<p>Start documenting the SSIS decommission checklist.</p>`,
    [
      { text: 'Enable Kafka CDC producer on Core Banking', done: true, time: 7200, project: 'ETL Pipeline', status: 'done' },
      { text: 'Build batch vs. streaming comparison framework', done: true, time: 10800, project: 'Data Quality', status: 'done' },
      { text: 'Day 1 parallel run  - 99.97% match', done: true, time: 3600, project: 'Data Quality', status: 'done' },
      { text: 'Set up streaming monitoring dashboard', done: true, time: 5400, project: 'Reporting', status: 'done' },
      { text: 'Team onboarding on streaming ops', done: true, time: 2700, project: 'Meetings', status: 'done' },
      { text: 'Start SSIS decommission checklist', done: false, time: 1800, project: 'ETL Pipeline', status: 'in_progress' },
    ],
    ['pipeline', 'spark']
  );

  addDay('2026-03-03',
    `<p>Day 2 of parallel run (started <span data-type="backlink" data-date="2026-03-02"></span>). Streaming consistency looking great  - <strong>100% match</strong> with batch for yesterday's data (the timing gap from Day 1 resolved itself).</p>
<p>Morning focus: <strong>Tuning the streaming consumer</strong> for production throughput. Increased partition count from 6 to 12, added a second executor. Now handling <strong>12K events/sec</strong> sustained  - close to the 15K target.</p>
<p>Working on the <strong>SSIS decommission checklist</strong>  - documenting every package, its schedule, dependencies, and the streaming equivalent. 47 packages total, 23 already have streaming replacements.</p>`,
    `<p>Continue parallel run validation from <span data-type="backlink" data-date="2026-03-02"></span>. Finish SSIS decommission checklist.</p>
<p>Start Payment Gateway CDC connector design with their team.</p>`,
    [
      { text: 'Validate Day 2 parallel run  - 100% match', done: true, time: 3600, project: 'Data Quality', status: 'done' },
      { text: 'Tune streaming consumer  - 12K events/sec', done: true, time: 7200, project: 'ETL Pipeline', status: 'done' },
      { text: 'Continue SSIS decommission checklist (23/47 done)', done: false, time: 5400, project: 'ETL Pipeline', status: 'in_progress' },
      { text: 'Design Payment Gateway CDC connector', done: false, time: 0, project: 'ETL Pipeline', status: 'todo' },
      { text: 'Review Priya\'s anomaly detection prototype', done: false, time: 0, project: 'Data Quality', status: 'todo' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings', status: 'done' },
      { text: 'Update streaming ops runbook', done: false, time: 0, project: 'Infrastructure', status: 'todo' },
    ],
    ['pipeline', 'spark', 'optimization']
  );

  addDay('2026-03-04',
    `<p>Day 3 of parallel run. Streaming consistency remains at <strong>100% match</strong> for the third consecutive day. The comparison dashboard is green across the board.</p>
<p>Major progress on the <strong>SSIS decommission checklist</strong>  - documented 35 out of 47 packages. The remaining 12 are for Payment Gateway and Card Processor (Phase 3).</p>
<p>Kicked off the <strong>Payment Gateway CDC connector design</strong> with their team. Their source system uses PostgreSQL, so we'll use the Debezium PostgreSQL connector instead of the SQL Server one. They need to enable logical replication on their end  - estimated 2 days of work.</p>
<p>Priya's anomaly detection model flagged a real issue today  - a merchant had a 400% spike in transaction volume. Turned out to be a legitimate flash sale, but great that the alert fired. We're tuning the sensitivity thresholds.</p>`,
    `<p>Continue parallel run. Push SSIS checklist past 40/47. Follow up with Payment Gateway team on logical replication.</p>`,
    [
      { text: 'Validate Day 3 parallel run  - 100% match', done: true, time: 2700, project: 'Data Quality', status: 'done' },
      { text: 'SSIS decommission checklist  - 35/47 documented', done: true, time: 7200, project: 'ETL Pipeline', status: 'done' },
      { text: 'Payment Gateway CDC connector design session', done: true, time: 5400, project: 'Meetings', status: 'done' },
      { text: 'Investigate anomaly detection alert  - merchant spike', done: true, time: 3600, project: 'Data Quality', status: 'done' },
      { text: 'Tune anomaly detection sensitivity thresholds', done: false, time: 1800, project: 'Data Quality', status: 'in_progress' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings', status: 'done' },
    ],
    ['pipeline', 'optimization']
  );

  addDay('2026-03-05',
    `<p>Day 4 of parallel run  - <strong>100% match continues</strong>. Ankit reviewed the comparison metrics and is confident we can disable the batch pipeline for Core Banking next week (Phase 2).</p>
<p>Finished the SSIS decommission checklist for Core Banking: <strong>38/47 packages</strong> now documented with streaming replacements. The remaining 9 are exclusively for Payment Gateway and Card Processor.</p>
<p>Drafted the <strong>batch-to-streaming cutover runbook</strong>:</p>
<ol><li>Disable the ADF trigger for the Core Banking batch pipeline</li><li>Verify streaming consumer is processing normally</li><li>Wait 24 hours and validate Gold layer data</li><li>Archive SSIS packages (don't delete yet  - keep for 90 days)</li><li>Update monitoring alerts to remove batch pipeline checks</li></ol>
<p>Payment Gateway team confirmed they'll have logical replication enabled by Friday. We can start their CDC connector next week.</p>`,
    `<p>Day 5 of parallel run. If clean, prepare for Phase 2 cutover on Monday.</p>
<p>Finalize the cutover runbook and get Ankit's sign-off.</p>`,
    [
      { text: 'Validate Day 4 parallel run  - 100% match', done: true, time: 2700, project: 'Data Quality', status: 'done' },
      { text: 'Complete SSIS checklist for Core Banking (38/47)', done: true, time: 5400, project: 'ETL Pipeline', status: 'done' },
      { text: 'Draft batch-to-streaming cutover runbook', done: true, time: 7200, project: 'ETL Pipeline', status: 'done' },
      { text: 'Follow up with Payment Gateway on replication setup', done: true, time: 1800, project: 'Meetings', status: 'done' },
      { text: 'Review comparison dashboard with Ankit', done: true, time: 2700, project: 'Meetings', status: 'done' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings', status: 'done' },
    ],
    ['pipeline', 'documentation']
  );

  addDay('2026-03-06',
    `<p>Day 5 of parallel run  - final validation day. <strong>5 consecutive days of 100% data match</strong> between streaming and batch. The Phase 1 parallel run is a complete success.</p>
<p>Ankit signed off on the <strong>cutover runbook</strong>. Phase 2 starts Monday: we'll disable the Core Banking batch pipeline and go full streaming.</p>
<p>Morning meeting with the VP  - he's impressed with the migration progress. Asked us to present a company-wide demo at the monthly engineering all-hands next Thursday.</p>
<p>Started preparing the <strong>all-hands demo</strong>  - architecture walkthrough, live metrics dashboard, and before/after comparison (3.5 hours batch → 45 seconds streaming).</p>
<p>Payment Gateway team confirmed logical replication is live on their PostgreSQL instance. We can start building their CDC connector Monday.</p>`,
    `<p>Monday: Execute Phase 2 cutover  - disable Core Banking batch. Start Payment Gateway CDC connector.</p>
<p>Prepare demo slides for Thursday all-hands.</p>`,
    [
      { text: 'Validate Day 5 parallel run  - 100% match, phase complete', done: true, time: 3600, project: 'Data Quality', status: 'done' },
      { text: 'Get cutover runbook sign-off from Ankit', done: true, time: 2700, project: 'Meetings', status: 'done' },
      { text: 'VP meeting  - migration progress update', done: true, time: 3600, project: 'Meetings', status: 'done' },
      { text: 'Start preparing all-hands demo', done: false, time: 5400, project: 'Reporting', status: 'in_progress' },
      { text: 'Verify Payment Gateway logical replication is live', done: true, time: 1800, project: 'Infrastructure', status: 'done' },
      { text: 'Plan Phase 2 cutover steps for Monday', done: false, time: 0, project: 'ETL Pipeline', status: 'todo' },
      { text: 'Daily standup', done: true, time: 900, project: 'Meetings', status: 'done' },
    ],
    ['pipeline', 'demo']
  );
}

module.exports = { seedSampleData };
