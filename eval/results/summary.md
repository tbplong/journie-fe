# Journie evaluation (2026-11-08T15:25:37.445Z)

## A. Constraint extraction (POST /chat)

Model `gemini-3.5-flash-lite`, prompt `semantic-v3`. 62/62 queries answered; 0 failed after retries. Latency mean 5246 ms, p50 1811 ms, p95 38772 ms; 1.02 calls per query.

| Field | Queries | Precision | Recall | F1 | Exact match |
|---|---|---|---|---|---|
| Interests (model fields) | 29 | 94.6% | 100.0% | 97.2% | 93.1% |
| Exclusions (model fields) | 20 | 94.4% | 85.0% | 89.5% | 80.0% |
| Must-visit names (model fields) | 14 | 100.0% | 86.7% | 92.9% | 85.7% |
| Exclusions (as the app shows them) | 20 | 90.9% | 100.0% | 95.2% | 90.0% |
| Must-visit names (as the app shows them) | 14 | 100.0% | 86.7% | 92.9% | 85.7% |

| Scalar | Stated in text (accuracy) | Not stated (correctly empty) |
|---|---|---|
| Days | 20/20 (100.0%) | 2/2 (100.0%) |
| Budget (VND) | 17/17 (100.0%) | 3/3 (100.0%) |

Disagreements with the labels: 12 (listed in `extraction.json`, field `misses`). Labels were written by one annotator and have not been independently checked.

## B. Itinerary hard constraints (retrieval + planner vs. retrieval order only)

62/62 scenarios ran. Planner time mean 9 ms, p95 33 ms. Both systems are laid out and checked with the same clock and travel model.

| Measure | Journie planner | Backend order, no planner |
|---|---|---|
| All hard constraints kept | 62/62 (100.0%, 95% CI 94.2%–100.0%) | 14/62 (22.6%, 95% CI 14.0%–34.4%) |
| Scenarios with a stop open-hours violation | 0.0% | 56.5% |
| Scenarios running past the day end | 0.0% | 43.5% |
| Scenarios with a place closed that weekday | 0.0% | 17.7% |
| Scenarios over budget | 0.0% | 8.1% |
| Scenarios with an excluded place | 0.0% | 1.6% |
| Scenarios with more than 3 meals in a day | 0.0% | 53.2% |
| Scenarios with a repeated place | 0.0% | 0.0% |
| Must-visit coverage | 100.0% (10 scenarios) | 100.0% (10 scenarios) |
| Share of stops matching a requested interest | 78.0% (23 scenarios) | 92.5% (22 scenarios) |
| Stops per scenario | 13.4 | 13.1 |
| Day fullness (stops / cap) | 98.9% | 96.8% |
| Travel minutes per stop | 9.1 | 21.3 |
| Waiting minutes per stop | 0.4 | 10.6 |
| Spend as share of budget | 30.0% | 54.6% |

Paired: planner only kept all constraints in 48, baseline only in 0, both in 14, neither in 0.
