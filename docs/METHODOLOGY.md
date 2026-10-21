# Methodology and validation status

CalmPlan makes two kinds of claims. They have very different levels of evidence, and this
document keeps them separate.

> CalmPlan is a student scheduling tool, **not** a clinical instrument. "Burnout" here means a
> heuristic fatigue-and-overload index, not a diagnosis. If you are struggling, talk to a
> counsellor or doctor.

## 1. The burnout index (`src/lib/burnoutEngine.ts`): a hand-built heuristic

**What it is.** A transparent formula over four trailing inputs (study hours, sleep, current
energy, today's planned workload):

- *Workload ratio*: planned minutes ÷ daily target, clamped to 0.5–1.5.
- *Recovery ratio*: average sleep ÷ 8 h, clamped to 0.5–1.2.
- *Base index*: `(workload / recovery) × 35`.
- *Acute sleep penalty*: `+14` per hour under 7 h of last night's sleep.
- *Energy penalty*: `+6.5` per point under 6 on a 1–10 scale.

The score maps to three tiers: **sustainable**, **amber**, **red** (≥ 75, or ≤ 4.5 h sleep, or
energy ≤ 2).

**Evidence status.** The constants (35, 14, 6.5, the thresholds) were chosen by judgement.
**They have not been validated against any outcome data.** Nothing in this repository shows
they are the right values. The unit tests check that the formula behaves as designed, not that
the design is correct.

## 2. The Governor (`src/lib/governorEngine.ts`): rules, not a learned model

What it actually does today:

| Condition | Behaviour |
|---|---|
| Red tier | Daily study capacity multiplied by 0.5. |
| Red tier, **or** sleep < 5 h, **or** energy ≤ 3 | "Heavy" tasks (Deep Work, or difficulty Challenging / Very Hard) are removed from today's schedule and shown as postponed with a reason. |
| Any day | Work is split into 25 / 50-minute blocks, with a 10-minute recovery block after each block of 45 minutes or more. |
| Amber tier | Displays status only. **No restrictions are applied.** |

What it does **not** do: it does not rewrite stored deadlines. Postponing means "not scheduled
today", not "deadline moved".

## 3. Does confidence predict completion? (`src/lib/predictiveAnalytics.ts`)

This is the empirical part, and the part that most needs real data.

- **Question.** Does a 1–5 self-rated confidence at task creation predict whether the task is
  completed? Does adding the burnout index at creation improve the prediction?
- **Methods.** Pearson / point-biserial correlation with a Student's-t p-value, and a logistic
  regression implemented from scratch (batch gradient descent, binary cross-entropy), with
  k-fold cross-validated accuracy. No ML library is used, so every step can be inspected.
- **Honesty guards.** The module refuses to interpret correlations for n < 20 and reports
  "not significant" rather than a trend when p > 0.05.

**How it is used in the app.** Each user gets their own model, trained in the browser on their own logged tasks once they have at least 10 observations (`src/lib/personalizationEngine.ts`). Below that, the UI says it does not have enough data rather than showing a number. The Governor timeline then uses that model's predicted completion probability.

**Evidence status.** The method is implemented and unit-tested on synthetic data. **It has not
yet been run on a real, multi-user dataset**, so there is currently no empirical result to
report. Anything this module outputs for a single user early in their usage is noise.

## 4. Planned validation protocol

To turn this from "built" into "tested":

1. Recruit at least 15–20 students and log for at least 3 weeks each, with consent and no
   personally identifying data beyond a pseudonymous ID.
2. Hold out the last 20–30 % of each user's tasks as a test set (split by time, not randomly).
3. Report, against the majority-class baseline: accuracy, AUC, and calibration (do tasks rated
   confidence 4 complete about 80 % of the time?).
4. Test whether adding burnout index improves held-out performance over confidence alone.
5. Log how often users override the Governor. Frequent overrides indicate the thresholds are
   wrong or the interventions are unwelcome.
6. Publish the result in this document **even if the result is null.**

## Known limitations

- Fixed, non-personalised thresholds; no per-user baseline yet.
- Self-reported inputs are subjective and gameable; the index inherits that noise.
- Completion is a coarse outcome (a task can be completed badly, or abandoned for good
  reasons).
- Small-n, per-user models overfit easily.
- The Governor is paternalistic by design. Users should be able to see why an intervention
  fired and override it. Visible reasons exist; an explicit logged override is planned.
