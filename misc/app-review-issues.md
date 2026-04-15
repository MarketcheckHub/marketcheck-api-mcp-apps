## Test & Review: VIN Market Report
- type: task
- priority: 2
- labels: testing, consumer, ready
---
Test with real API key at http://localhost:4005/apps/vin-market-report/dist/index.html
- [ ] Input form: VIN, price, miles, ZIP fields work correctly
- [ ] Output: deal score gauge, price prediction, depreciation chart, comparables carousel, history timeline
- [ ] Data accuracy: predicted prices match expectations, comparables are relevant
- [ ] Error handling: invalid VIN, missing fields, API errors

---

## Test & Review: Car Search & Compare
- type: task
- priority: 2
- labels: testing, consumer
---
Test with real API key at http://localhost:4005/apps/car-search-compare/dist/index.html
- [ ] Input form: VIN entry for comparison
- [ ] Output: side-by-side spec table, price position indicators, feature diff
- [ ] Data accuracy: decoded specs correct, price predictions reasonable
- [ ] Error handling: invalid VINs, single VIN input

---

## Test & Review: Car Search
- type: task
- priority: 2
- labels: testing, consumer, ready
---
Test with real API key at http://localhost:4005/apps/car-search-app/dist/index.html
- [ ] Input form: make, model, year, body type, price range, miles range, ZIP, radius
- [ ] Output: SERP card grid with photos, deal badges, filter sidebar, pagination
- [ ] Vehicle detail modal: specs, photos, dealer info
- [ ] NLP search: natural language queries resolve correctly
- [ ] Error handling: empty results, API errors

---

## Test & Review: Deal Evaluator
- type: task
- priority: 2
- labels: testing, consumer
---
Test with real API key at http://localhost:4005/apps/deal-evaluator/dist/index.html
- [ ] Input form: VIN, asking price, miles, ZIP
- [ ] Output: Buy/Negotiate/Pass gauge, predicted vs asking price bar, comparables table
- [ ] Negotiation leverage points display
- [ ] Price history timeline
- [ ] Error handling: missing asking price, invalid VIN

---

## Test & Review: Incentive-Adjusted Deal Evaluator
- type: task
- priority: 2
- labels: testing, consumer
---
Test with real API key at http://localhost:4005/apps/incentive-adjusted-deal-eval/dist/index.html
- [ ] Input form: VIN, asking price, miles, ZIP
- [ ] Output: sticker vs out-of-pocket waterfall chart, incentive badges
- [ ] Incentive cards: cash back, APR, lease display correctly
- [ ] Deal gauge adjusted for incentives
- [ ] Error handling: VIN with no incentives

---

## Test & Review: Trade-In Estimator
- type: task
- priority: 2
- labels: testing, consumer, ready
---
Test with real API key at http://localhost:4005/apps/trade-in-estimator/dist/index.html
- [ ] Input form: VIN, miles, ZIP, condition
- [ ] Output: 3-tier value gauge (private party / trade-in / cash)
- [ ] Range bars display correctly
- [ ] Sold comparable evidence table populated
- [ ] Condition adjustment factors work
- [ ] Error handling: invalid VIN, missing mileage

---

## Test & Review: Used Car Market Index
- type: task
- priority: 2
- labels: testing, consumer, ready, enterprise-api
---
Test with real API key at http://localhost:4005/apps/used-car-market-index/dist/index.html
- [ ] Input: geography selector (national / state)
- [ ] Output: index ticker display, segment indices, top movers table, sector heatmap
- [ ] Geographic comparison works
- [ ] Enterprise API: requires sold summary access
- [ ] Error handling: API subscription errors

---

## Test & Review: OEM Incentives Explorer
- type: task
- priority: 2
- labels: testing, consumer
---
Test with real API key at http://localhost:4005/apps/oem-incentives-explorer/dist/index.html
- [ ] Input form: make, model, ZIP, compare makes
- [ ] Output: incentive cards (cash back, APR, lease), amounts, terms, expiration
- [ ] Multi-brand comparison columns work
- [ ] Filter by offer type
- [ ] Error handling: make with no incentives

---

## Test & Review: Incentive Deal Finder
- type: task
- priority: 2
- labels: testing, consumer
---
Test with real API key at http://localhost:4005/apps/incentive-deal-finder/dist/index.html
- [ ] Input: makes (defaults to top 10), ZIP
- [ ] Output: ranked deal list across all brands, filter by type
- [ ] Sortable by amount
- [ ] Brand badges, expiration countdown
- [ ] Error handling: no incentives found

---

## Test & Review: UK Market Explorer
- type: task
- priority: 2
- labels: testing, consumer, uk
---
Test with real API key at http://localhost:4005/apps/uk-market-explorer/dist/index.html
- [ ] Input: make, model, year, postal code, radius, price range
- [ ] Output: search results in GBP, filter sidebar
- [ ] Sold context overlay
- [ ] Error handling: UK API availability

---

## Test & Review: Lot Pricing Dashboard
- type: task
- priority: 2
- labels: testing, dealer, enterprise-api
---
Test with real API key at http://localhost:4005/apps/lot-pricing-dashboard/dist/index.html
- [ ] Input: dealer ID, ZIP, state
- [ ] Output: inventory table with market price gaps, aging heatmap, DOM alerts
- [ ] Body type mix chart, stocking hot list
- [ ] Floor plan burn calculator
- [ ] Error handling: invalid dealer ID

---

## Test & Review: Stocking Intelligence
- type: task
- priority: 2
- labels: testing, dealer, enterprise-api
---
Test with real API key at http://localhost:4005/apps/stocking-intelligence/dist/index.html
- [ ] Input: state, ZIP
- [ ] Output: demand heatmap, buy/avoid recommendation cards
- [ ] Segment analysis (SUV vs Sedan vs Truck)
- [ ] Avg price and DOM by segment
- [ ] Error handling: state with limited data

---

## Test & Review: Pricing Transparency Report
- type: task
- priority: 2
- labels: testing, dealer
---
Test with real API key at http://localhost:4005/apps/pricing-transparency-report/dist/index.html
- [ ] Input: VIN, miles, ZIP
- [ ] Output: professional report layout, vehicle specs header, predicted price bar
- [ ] Active comparable grid, sold comparable grid
- [ ] Printable/shareable format
- [ ] Error handling: invalid VIN

---

## Test & Review: Dealer Inventory Fit Scorer
- type: task
- priority: 2
- labels: testing, dealer
---
Test with real API key at http://localhost:4005/apps/dealer-inventory-fit-scorer/dist/index.html
- [ ] Input: comma-separated VINs, dealer ID, ZIP
- [ ] Output: fit score cards per VIN, match indicators
- [ ] Price tier alignment, recommended vs skip badges
- [ ] Error handling: invalid VINs batch

---

## Test & Review: Dealer Conquest Analyzer
- type: task
- priority: 2
- labels: testing, dealer, enterprise-api
---
Test with real API key at http://localhost:4005/apps/dealer-conquest-analyzer/dist/index.html
- [ ] Input: dealer ID, ZIP, radius, state
- [ ] Output: gap analysis chart, conquest opportunity cards
- [ ] Demand-weighted recommendations, competitive heat map
- [ ] Error handling: dealer with no inventory

---

## Test & Review: UK Dealer Pricing
- type: task
- priority: 2
- labels: testing, dealer, uk
---
Test with real API key at http://localhost:4005/apps/uk-dealer-pricing/dist/index.html
- [ ] Input: UK dealer ID, make
- [ ] Output: inventory table, market positioning, price gap indicators
- [ ] Aging analysis, sold comparison overlay
- [ ] Error handling: UK API availability

---

## Test & Review: Deal Finder
- type: task
- priority: 2
- labels: testing, dealer, coming-soon
---
Coming Soon app — review How to Build guide at http://localhost:4005/app/deal-finder/
- [ ] Guide page loads correctly with API flow diagram
- [ ] Input parameters documented
- [ ] API endpoints detailed with params and returns
- [ ] Copy Page button works
- [ ] Screenshot displays

---

## Test & Review: Appraiser Workbench
- type: task
- priority: 2
- labels: testing, appraiser
---
Test with real API key at http://localhost:4005/apps/appraiser-workbench/dist/index.html
- [ ] Input: VIN, miles, ZIP
- [ ] Output: retail/wholesale price bars, active comps table, sold comps table
- [ ] Price history chart, vehicle specs panel
- [ ] Error handling: VIN decode failures

---

## Test & Review: Comparables Explorer
- type: task
- priority: 2
- labels: testing, appraiser
---
Test with real API key at http://localhost:4005/apps/comparables-explorer/dist/index.html
- [ ] Input: VIN or make/model, year, ZIP, radius
- [ ] Output: price distribution histogram, scatter plot (price vs miles)
- [ ] Active/sold comp tables, stats summary
- [ ] Price prediction overlay when VIN provided
- [ ] Error handling: make/model with no results

---

## Test & Review: Depreciation Analyzer
- type: task
- priority: 2
- labels: testing, appraiser, enterprise-api
---
Test with real API key at http://localhost:4005/apps/depreciation-analyzer/dist/index.html
- [ ] Input: make, state
- [ ] Output: depreciation curves, value retention rankings
- [ ] Segment comparison charts, annual depreciation rates
- [ ] Error handling: enterprise API subscription

---

## Test & Review: Market Trends Dashboard
- type: task
- priority: 2
- labels: testing, appraiser, enterprise-api
---
Test with real API key at http://localhost:4005/apps/market-trends-dashboard/dist/index.html
- [ ] Input: state
- [ ] Output: price trend charts, volume bars, segment market share
- [ ] Top movers, regional comparison
- [ ] Error handling: enterprise API subscription

---

## Test & Review: Group Operations Center
- type: task
- priority: 2
- labels: testing, dealership-group, enterprise-api
---
Test with real API key at http://localhost:4005/apps/group-operations-center/dist/index.html
- [ ] Input: dealer IDs (comma-separated), state
- [ ] Output: store-by-store cards, combined group metrics
- [ ] Demand overlay per location
- [ ] Error handling: multiple dealer IDs parsing

---

## Test & Review: Inventory Balancer
- type: task
- priority: 2
- labels: testing, dealership-group, enterprise-api
---
Test with real API key at http://localhost:4005/apps/inventory-balancer/dist/index.html
- [ ] Input: dealer IDs, state
- [ ] Output: transfer recommendation cards, supply/demand heatmap
- [ ] Mismatch alerts, transfer ROI estimate
- [ ] Error handling: single location only

---

## Test & Review: Location Benchmarking
- type: task
- priority: 2
- labels: testing, dealership-group, enterprise-api
---
Test with real API key at http://localhost:4005/apps/location-benchmarking/dist/index.html
- [ ] Input: dealer IDs, state
- [ ] Output: ranking table, radar charts
- [ ] Market alignment scores
- [ ] Error handling: insufficient locations

---

## Test & Review: Group Health Scorecard
- type: task
- priority: 2
- labels: testing, dealership-group, coming-soon, enterprise-api
---
Coming Soon app — review How to Build guide at http://localhost:4005/app/group-health-scorecard/
- [ ] Guide page loads correctly with API flow diagram
- [ ] Health score methodology documented (0-100 bands)
- [ ] Copy Page button works
- [ ] Screenshot displays

---

## Test & Review: Underwriting Decision Support
- type: task
- priority: 2
- labels: testing, lender
---
Test with real API key at http://localhost:4005/apps/underwriting-decision-support/dist/index.html
- [ ] Input: VIN, miles, ZIP, loan amount
- [ ] Output: collateral value banner, LTV gauge, retail vs wholesale bars
- [ ] Depreciation trajectory chart, sold comp evidence
- [ ] Risk factors displayed
- [ ] Error handling: missing loan amount

---

## Test & Review: Portfolio Risk Monitor
- type: task
- priority: 2
- labels: testing, lender, enterprise-api
---
Test with real API key at http://localhost:4005/apps/portfolio-risk-monitor/dist/index.html
- [ ] Input: state
- [ ] Output: portfolio value index, segment risk heatmap
- [ ] Concentration analysis, depreciation trend overlay
- [ ] Error handling: enterprise API subscription

---

## Test & Review: Lender Portfolio Stress Test
- type: task
- priority: 2
- labels: testing, lender
---
Test with real API key at http://localhost:4005/apps/lender-portfolio-stress-test/dist/index.html
- [ ] Input: comma-separated VINs, ZIP
- [ ] Output: portfolio value waterfall, stress scenario sliders
- [ ] Segment breakdown, at-risk loan list, LTV distribution
- [ ] Error handling: large VIN batch

---

## Test & Review: EV Collateral Risk Monitor
- type: task
- priority: 2
- labels: testing, lender, enterprise-api
---
Test with real API key at http://localhost:4005/apps/ev-collateral-risk/dist/index.html
- [ ] Input: state
- [ ] Output: EV vs ICE depreciation comparison, powertrain risk heatmap
- [ ] Collateral value trends, segment analysis
- [ ] Error handling: enterprise API subscription

---

## Test & Review: Earnings Signal Dashboard
- type: task
- priority: 2
- labels: testing, analyst, enterprise-api
---
Test with real API key at http://localhost:4005/apps/earnings-signal-dashboard/dist/index.html
- [ ] Input: state
- [ ] Output: ticker-style signal cards, volume momentum charts
- [ ] Price trend indicators, sector comparison
- [ ] Error handling: enterprise API subscription

---

## Test & Review: Watchlist Monitor
- type: task
- priority: 2
- labels: testing, analyst, enterprise-api
---
Test with real API key at http://localhost:4005/apps/watchlist-monitor/dist/index.html
- [ ] Input: makes, state
- [ ] Output: watchlist cards with signal indicators, volume change alerts
- [ ] Price trend sparklines, market share shifts
- [ ] Error handling: enterprise API subscription

---

## Test & Review: Dealer Group Scorecard
- type: task
- priority: 2
- labels: testing, analyst, enterprise-api
---
Test with real API key at http://localhost:4005/apps/dealer-group-scorecard/dist/index.html
- [ ] Input: dealer IDs, state
- [ ] Output: scorecard comparison table, efficiency metrics
- [ ] Pricing power indicators, market share bars
- [ ] Error handling: enterprise API subscription

---

## Test & Review: OEM Stock Tracker
- type: task
- priority: 2
- labels: testing, analyst, coming-soon, enterprise-api
---
Coming Soon app — review How to Build guide at http://localhost:4005/app/oem-stock-tracker/
- [ ] Guide page loads correctly with API flow diagram
- [ ] Ticker mapping documented (F, GM, TM, TSLA etc.)
- [ ] BULLISH/BEARISH signal methodology explained
- [ ] Copy Page button works

---

## Test & Review: Pricing Power Tracker
- type: task
- priority: 2
- labels: testing, analyst, coming-soon, enterprise-api
---
Coming Soon app — review How to Build guide at http://localhost:4005/app/pricing-power-tracker/
- [ ] Guide page loads correctly with API flow diagram
- [ ] MSRP premium methodology documented
- [ ] Copy Page button works

---

## Test & Review: Market Share Analyzer
- type: task
- priority: 2
- labels: testing, analyst, coming-soon, enterprise-api
---
Coming Soon app — review How to Build guide at http://localhost:4005/app/market-share-analyzer/
- [ ] Guide page loads correctly with API flow diagram
- [ ] Basis point tracking methodology documented
- [ ] Copy Page button works

---

## Test & Review: Claims Valuation Workbench
- type: task
- priority: 2
- labels: testing, insurer, enterprise-api
---
Test with real API key at http://localhost:4005/apps/claims-valuation-workbench/dist/index.html
- [ ] Input: VIN, miles, ZIP, condition, damage severity
- [ ] Output: total loss / repair verdict, settlement range bar, FMV breakdown
- [ ] Comparable evidence grid, replacement vehicle options
- [ ] Error handling: invalid VIN, missing fields

---

## Test & Review: Insurance Premium Benchmarker
- type: task
- priority: 2
- labels: testing, insurer, enterprise-api
---
Test with real API key at http://localhost:4005/apps/insurance-premium-benchmarker/dist/index.html
- [ ] Output: replacement cost by segment, EV vs ICE comparison
- [ ] State-level risk heatmap, premium adequacy indicators
- [ ] Error handling: enterprise API subscription

---

## Test & Review: Brand Command Center
- type: task
- priority: 2
- labels: testing, manufacturer, enterprise-api
---
Test with real API key at http://localhost:4005/apps/brand-command-center/dist/index.html
- [ ] Input: my brands, state
- [ ] Output: brand vs competitor cards, market share bars, pricing power
- [ ] Volume momentum, segment share breakdown
- [ ] Error handling: enterprise API subscription

---

## Test & Review: Regional Demand Allocator
- type: task
- priority: 2
- labels: testing, manufacturer, enterprise-api
---
Test with real API key at http://localhost:4005/apps/regional-demand-allocator/dist/index.html
- [ ] Input: make
- [ ] Output: geographic demand heatmap, state ranking table
- [ ] Segment allocation recommendations, supply vs demand
- [ ] Error handling: enterprise API subscription

---

## Test & Review: 5 New Manufacturer Apps (Coming Soon)
- type: task
- priority: 3
- labels: testing, manufacturer, coming-soon
---
Review How to Build guides for all 5 new manufacturer apps:
- [ ] http://localhost:4005/app/oem-depreciation-tracker/ — guide loads, flow diagram correct, screenshot shows
- [ ] http://localhost:4005/app/ev-transition-monitor/ — guide loads, flow diagram correct, screenshot shows
- [ ] http://localhost:4005/app/model-contenting-analyzer/ — guide loads, flow diagram correct, screenshot shows
- [ ] http://localhost:4005/app/market-momentum-report/ — guide loads, flow diagram correct, screenshot shows
- [ ] http://localhost:4005/app/incentive-effectiveness-dashboard/ — guide loads, flow diagram correct, screenshot shows
- [ ] Copy Page button works on all 5

---

## Test & Review: Auction Lane Planner
- type: task
- priority: 2
- labels: testing, auction-house, enterprise-api
---
Test with real API key at http://localhost:4005/apps/auction-lane-planner/dist/index.html
- [ ] Input: state, ZIP
- [ ] Output: lane planning grid, reserve price suggestions
- [ ] Buyer targeting cards, demand-based lane ordering
- [ ] Error handling: enterprise API subscription

---

## Test & Review: Auction Arbitrage Finder
- type: task
- priority: 2
- labels: testing, auction-house
---
Test with real API key at http://localhost:4005/apps/auction-arbitrage-finder/dist/index.html
- [ ] Input: comma-separated VINs, ZIP
- [ ] Output: arbitrage cards sorted by spread, waterfall chart
- [ ] ROI estimates, deal type badges
- [ ] Error handling: invalid VINs

---

## Test & Review: 3 New Auction House Apps (Coming Soon)
- type: task
- priority: 3
- labels: testing, auction-house, coming-soon
---
Review How to Build guides:
- [ ] http://localhost:4005/app/auction-run-list-analyzer/ — guide loads, flow correct, screenshot shows
- [ ] http://localhost:4005/app/consignment-sourcer/ — guide loads, flow correct, screenshot shows
- [ ] http://localhost:4005/app/auction-dealer-targeting/ — guide loads, flow correct, screenshot shows
- [ ] Copy Page button works on all 3

---

## Test & Review: Wholesale Vehicle Router
- type: task
- priority: 2
- labels: testing, wholesaler
---
Test with real API key at http://localhost:4005/apps/wholesale-vehicle-router/dist/index.html
- [ ] Input: comma-separated VINs, ZIP
- [ ] Output: vehicle cards with specs, predicted values
- [ ] Dealer match rankings, routing recommendations
- [ ] Error handling: invalid VINs

---

## Test & Review: EV Market Monitor
- type: task
- priority: 2
- labels: testing, cross-segment, enterprise-api
---
Test with real API key at http://localhost:4005/apps/ev-market-monitor/dist/index.html
- [ ] Input: state
- [ ] Output: EV penetration gauge, EV vs ICE price comparison
- [ ] Adoption trend chart, segment breakdown
- [ ] Error handling: enterprise API subscription

---

## Test & Review: VIN History Detective
- type: task
- priority: 2
- labels: testing, cross-segment
---
Test with real API key at http://localhost:4005/apps/vin-history-detective/dist/index.html
- [ ] Input: VIN, miles, ZIP
- [ ] Output: timeline visualization, stepped-line price chart
- [ ] Red flag alerts, current value vs historical range
- [ ] Error handling: VIN with no history

---

## Test & Review: Market Anomaly Detector
- type: task
- priority: 2
- labels: testing, cross-segment
---
Test with real API key at http://localhost:4005/apps/market-anomaly-detector/dist/index.html
- [ ] Input: make, model, year, state
- [ ] Output: anomaly scatter plot, Z-score distribution
- [ ] Underpriced opportunity cards, overpriced alerts
- [ ] Error handling: narrow search with few results

---

## Test & Review: UK Market Trends
- type: task
- priority: 2
- labels: testing, cross-segment, uk
---
Test with real API key at http://localhost:4005/apps/uk-market-trends/dist/index.html
- [ ] Input: make
- [ ] Output: UK market overview, price trend charts (GBP)
- [ ] Active vs sold comparison, segment analysis
- [ ] Error handling: UK API availability

---

## Test & Review: Auto Journalist Briefing
- type: task
- priority: 2
- labels: testing, auto-media, enterprise-api
---
Test with real API key at http://localhost:4005/apps/auto-journalist-briefing/dist/index.html
- [ ] No input required
- [ ] Output: headline data points, make ranking cards, segment trends
- [ ] Geographic price map, quotable stat blocks
- [ ] Error handling: enterprise API subscription

---

## Test & Review: Fleet Lifecycle Manager
- type: task
- priority: 2
- labels: testing, fleet-manager
---
Test with real API key at http://localhost:4005/apps/fleet-lifecycle-manager/dist/index.html
- [ ] Input: comma-separated VINs, ZIP
- [ ] Output: fleet valuation summary, per-vehicle depreciation cards
- [ ] Replacement candidate list, lifecycle timeline
- [ ] Error handling: large fleet batch

---

## Test & Review: Rental Fleet Valuator
- type: task
- priority: 2
- labels: testing, rental
---
Test with real API key at http://localhost:4005/apps/rental-fleet-valuator/dist/index.html
- [ ] Input: comma-separated VINs, ZIP
- [ ] Output: fleet valuation table, mileage-adjusted values
- [ ] Rotation timing recommendations, depreciation rate cards
- [ ] Error handling: invalid VINs

---

## Test & Review: Territory Pipeline
- type: task
- priority: 2
- labels: testing, lender-sales, enterprise-api
---
Test with real API key at http://localhost:4005/apps/territory-pipeline/dist/index.html
- [ ] Input: ZIP, radius, state
- [ ] Output: dealer prospect list, inventory size indicators
- [ ] Floor plan opportunity scores, territory map
- [ ] Error handling: enterprise API subscription

---

## Test & Review: 3 New Lender Sales Apps (Coming Soon)
- type: task
- priority: 3
- labels: testing, lender-sales, coming-soon
---
Review How to Build guides:
- [ ] http://localhost:4005/app/floor-plan-opportunity-scanner/ — guide loads, flow correct, screenshot shows
- [ ] http://localhost:4005/app/dealer-intelligence-brief/ — guide loads, flow correct, screenshot shows
- [ ] http://localhost:4005/app/subprime-opportunity-finder/ — guide loads, flow correct, screenshot shows
- [ ] Copy Page button works on all 3

---

## Test & Review: 7 Chat Demo Apps
- type: task
- priority: 2
- labels: testing, chat-demos, ready
---
Review all 7 chat demo apps:
- [ ] http://localhost:4005/apps/chat-vercel-ai/dist/index.html — loads, chat UI renders
- [ ] http://localhost:4005/apps/chat-copilotkit/dist/index.html — loads, copilot sidebar renders
- [ ] http://localhost:4005/apps/chat-assistant-ui/dist/index.html — loads, branded chat UI renders
- [ ] http://localhost:4005/apps/chat-sdk-bot/dist/index.html — loads, multi-platform UI renders
- [ ] http://localhost:4005/apps/chat-chainlit/dist/index.html — loads, step visualization renders
- [ ] http://localhost:4005/apps/chat-streamlit/dist/index.html — loads, simple chat renders
- [ ] http://localhost:4005/apps/chat-langchain/dist/index.html — loads, reasoning chain renders

---

## Test & Review: Gallery Homepage
- type: task
- priority: 1
- labels: testing, gallery
---
Review gallery at http://localhost:4005/
- [ ] Hero section shows 68 apps, 16 segments
- [ ] All 16 segment groups render with correct app counts
- [ ] "How to build?" links work on all cards
- [ ] "Coming Soon" badge on Launch button for non-ready apps
- [ ] Ready apps (VIN Market Report, Trade-In, Market Index, Car Search, 7 chats) have "Launch App" button
- [ ] Category nav filters work
- [ ] Theme toggle (light/dark) works
- [ ] API key banner works
- [ ] Screenshot thumbnails load for all apps
- [ ] Share buttons work
