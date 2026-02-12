# T1D Workout Planner - Project Context & Domain Logic

## 1. Core Purpose

This is a specialized workout generator for a Type 1 Diabetic runner targeting the **EcoTrail 16km (2026-06-13)**. The application generates training plans that sync directly to **Intervals.icu**, with a heavy focus on blood glucose management and aerobic base building. After it have been uploaded to Intervals, it gets synced with **Garmin connect** and can therefore be started from the user's **Garmin Forerunner 970**.

## 2. The User (Physiology & Context)

- **Max Heart Rate:** ~187 bpm.
- **Lactate Threshold HR (LTHR):** 169 bpm.
- **Current Status:** Building volume safely.
- **Key Constraint:** Managing glucose levels to avoid hypoglycemia during long efforts and hyperglycemia during intense efforts.

## 3. Domain Logic: T1D Fueling Strategy

We adhere to a specific **Three-Tier Strategy** based on intensity and duration.

### A. Easy & Recovery

- **Workouts:** Easy Runs, Bonus Easy.
- **Physiology:** Low intensity, glucose drops slowly.
- **Strategy:** `PUMP ON (-50%)` (Basal reduction).
- **Fuel:** Moderate (`fuelSteady` variable).

### B. Long Run (Endurance)

- **Workouts:** Long Runs (Sunday).
- **Physiology:** High calorie burn, requires active high-carb fueling.
- **Strategy:** `PUMP OFF` (Normal Basal). _Critical distinction: Do not reduce basal due to high carb intake._
- **Fuel:** High (`fuelSteady` variable, e.g., 10g/10m).

### C. Interval & Threshold (Anaerobic)

- **Workouts:** Tempo, Hills, Intervals.
- **Physiology:** Adrenaline/Cortisol triggers liver glucose dump. Glucose stays stable or rises.
- **Strategy:** `PUMP OFF` (Normal Basal).
- **Fuel:** Low (`fuelInterval` variable, e.g., 5g/10m).

## 4. Heart Rate Zones (Custom LTHR: 169)

Standard generic zones are too easy. We use custom zones derived from **LTHR (169 bpm)**.

- **Zone 1 / Warmup:** 122–135 bpm (72–80% LTHR).
- **Zone 2 / Steady (Long Run):** 130–142 bpm (77–84% LTHR). _Optimized for fat adaptation._
- **Zone 3-4 / Tempo:** 149–159 bpm (88–94% LTHR).
- **Zone 5 / Hard:** >160 bpm.

## 5. Intervals.icu Integration Rules (Strict)

To ensure the generated text is parsed correctly by the workout builder and displayed on the watch:

- **Duration:** ALWAYS use `m` (e.g., `10m`, `45m`). NEVER "min" or "mins".
- **Step Format:** `[Duration] [Min%]-[Max%] LTHR ([MinBPM]-[MaxBPM] bpm)`
- **Strategy Injection (CRITICAL):**
  - The Diabetes Strategy String MUST be prefixed to the **Warmup** step itself.
  - _Correct Format:_ `- [STRATEGY_STRING] [Duration] [Intensity]...`
- **Workout Naming:**
  - MUST include the **Suffix** (e.g., "eco16") for analysis filtering.
  - Long runs MUST contain "Long" (e.g., "Sun Long"). DO NOT use "LR".
  - Saturday runs MUST be named "Bonus Easy".

## 6. Full Workout Examples (Reference)

The generator MUST output descriptions matching these patterns exactly. Note the **Strategy String** appears twice: once in the header (for phone review) and once as a prefix to Warmup (for watch display).

### Example A: Interval Session (Tempo/Hills)

**Name:** `W05 Tue Tempo eco16`
**Description:**

```text
PUMP OFF - FUEL: 5g/10m

Warmup
- PUMP OFF - FUEL: 5g/10m 10m 72-80% LTHR (122-135 bpm)

Main set 3x
- 8m 88-94% LTHR (149-159 bpm)
- 2m 72-80% LTHR (122-135 bpm)

Cooldown
- 5m 72-80% LTHR (122-135 bpm)
Example B: Long Run (Steady)
Name: W05 Sun Long (12km) eco16
Description:

Plaintext
PUMP OFF - FUEL: 10g/10m (Trail)

Warmup
- PUMP OFF - FUEL: 10g/10m 10m 72-80% LTHR (122-135 bpm)

Main set
- 12km 77-84% LTHR (130-142 bpm)

Cooldown
- 5m 72-80% LTHR (122-135 bpm)
```
