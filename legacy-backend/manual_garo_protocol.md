# GΛRO PROTOCOL V1: SYSTEM MANUAL

> "Chaos without control is just noise. GΛRO VIBE is the conductor."

## The Ecosystem Overview
The application is not just a bunch of pages. It is a **Tri-State System** connecting 3 distinct roles. Everything is synchronized via the central database (Supabase).

---

### ROLE 1: THE RAIDER (User)
*The attendee who wants to collect memories and level up.*

*   **Entry Point:** `.../onboarding.html` (The "Vibe Check")
*   **Key Action 1: SYNC (Login)**
    *   They create a "Neural ID" (Wallet).
    *   This ID is their permanent record.
*   **Key Action 2: INJECT (Mint)**
    *   When they see a Stage QR or click "Inject", they hold the button.
    *   **Behind the Scenes:** The server mints an NFT + Records it in the Database.
*   **The Reward: THE CORE (Dashboard)**
    *   They visit `.../dashboard.html`.
    *   Their "Core" grows based on the database count.
    *   They get an "Entry Pass" (QR) generated from their ID.

### ROLE 2: THE GATEKEEPER (Door Staff)
*The security checking people in.*

*   **Entry Point:** `.../scanner.html`
*   **The Tool:** A camera that reads "Entry Pass" QRs.
*   **The Logic:**
    1.  Scans User QR.
    2.  Asks Database: "Does this ID have the Genesis NFT?"
    3.  **GREEN:** "ACCESS GRANTED" (Plays Sound + Logs to DB).
    4.  **RED:** "DENIED" (Logs to DB).

### ROLE 3: THE OVERSEER (You/Garo)
* The puppet master watching it all.*

*   **Entry Point:** `.../godmode.html`
*   **The Eye:**
    *   Watches the Database in **REAL TIME**.
    *   When a Raider injects -> You see it instantly.
    *   When a Gatekeeper scans -> You see it instantly.
*   **The Baton:**
    *   You type "EVENT_IBIZA" and click "GENERATE".
    *   A massive QR appears on the stage screen.
    *   Raiders scan it to trigger the "Injection" flow for THAT specific event.

---

## The "Flow of Life" (Example Scenario)

1.  **Preparation:**
    *   You open **God Mode**. Type "SECRET_PARTY_VN".
    *   A QR appears on your laptop. You project it on the wall.

2.  **The Event:**
    *   **User A** arrives.
    *   **Staff** scans User A with **Scanner**.
    *   *System Check:* "Does User A have ID?" -> YES -> **BEEP (Green)**.
    *   **You (Admin)** see: `[SCAN] ACCESS GRANTED: User A` on God Mode.

3.  **The Climax:**
    *   User A sees the projected QR. Scans it.
    *   User A holds "INJECT". Phone vibrates.
    *   **You (Admin)** see: `[INJECT] NEW MEMORY SECURED: User A` on God Mode.
    *   User A checks Dashboard. Their "Vibe Core" has leveled up to Level 2.

**Result:** A complete, closed loop of digital-physical interaction.
