# Cognitive Canvas Agents

This document outlines the core "agents" or services that power the Cognitive Canvas application. Each agent is responsible for a specific part of the application's workflow, from capturing user input to displaying contextual results.

---

### 1. Authentication & Drive Agent

*   **Purpose:** Manages user authentication and access to Google Drive files. It ensures that the user is securely logged in before any other functionality is enabled.
*   **Technology:**
    *   Google Identity Services (GSI) for "Sign in with Google".
    *   Google API Client Library (GAPI) for JavaScript.
    *   OAuth 2.0 for authorization.
*   **Workflow:**
    1.  Presents the user with a "Sign in with Google" button.
    2.  Handles the credential response and decodes the JWT to get user profile information.
    3.  Initializes a token client and requests the `drive.readonly` scope.
    4.  Once authorized, it uses the Google Drive API (v3) to list files from the user's Drive.
    5.  Maps the fetched Drive files into the application's `LibraryItem` format.

---

### 2. Speech Recognition Agent

*   **Purpose:** Captures the user's voice in real-time and converts it into text transcripts.
*   **Technology:** Browser's native Web Speech API (`window.SpeechRecognition`).
*   **Workflow:**
    1.  Listens for the user to click the microphone button to start a session.
    2.  As the user speaks, it provides interim and final transcripts.
    3.  Once a final transcript is generated (e.g., after a pause in speech), it passes the text to the next agent in the chain for processing.
    4.  The `useSpeechRecognition` custom hook encapsulates this logic.

---

### 3. Gemini Search Query Agent

*   **Purpose:** Intelligently processes the raw text transcript to extract the most relevant keywords or concepts for searching. This avoids noisy searches based on filler words.
*   **Technology:** Google Gemini API (`gemini-2.5-flash` model).
*   **Workflow:**
    1.  Receives the final transcript from the Speech Recognition Agent.
    2.  Sends the transcript to the Gemini API with a prompt asking it to extract up to 3 main keywords.
    3.  The request specifies a JSON schema for the response, ensuring the output is a structured list of query strings.
    4.  Returns the extracted queries to the main application for the search agents to use.

---

### 4. Library Search Agent

*   **Purpose:** Searches the user's personal media library for items relevant to the generated search queries.
*   **Technology:** JavaScript filtering and searching logic.
*   **Workflow:**
    1.  Receives the search queries from the Gemini Agent.
    2.  Performs a case-insensitive search across a combined collection of:
        *   The local `mockLibrary` of static assets.
        *   The list of files fetched from the user's Google Drive.
    3.  The search checks the `title`, `description`, `content`, and `tags` of each item.
    4.  Returns a list of matching `SearchResult` items.

---

### 5. Web Search Agent (Simulated)

*   **Purpose:** Simulates a web search to find relevant images for the search queries, providing additional context beyond the user's personal library.
*   **Technology:** Lorem Picsum API for placeholder images.
*   **Workflow:**
    1.  Receives the search queries.
    2.  For each query term, it constructs a `SearchResult` object of type `image`.
    3.  It generates a URL pointing to `picsum.photos` using the search term as a seed, which provides a consistent but seemingly random image for that term.
    4.  This creates the illusion of a real-time web image search.
