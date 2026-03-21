# Requirements Document

## Introduction

An AI-powered flashcard learning app built for a hackathon. Users photograph physical notes or documents, which are scanned and digitized by AI into flashcards automatically sorted into topic modules. Users can then start a voice-based quiz session powered by real-time AI speech, where the AI quizzes them on their cards. Each card accumulates a knowledge score so the system can surface weak topics. Authentication is handled via Civic.ai, the app is hosted on Vercel, and Users can request Canva-generated explanation presentations for topics they're struggling with via Canva MCP. The UI is built with React, Vite, Tailwind CSS, and shadcn/ui components across all screens.

## Glossary

- **App**: The AI-powered flashcard quizzer web application
- **User**: An authenticated person using the App
- **Flashcard**: A digitized question/answer card derived from a scanned image
- **Module**: A topic-based grouping of Flashcards
- **Knowledge_Score**: A numeric value (0–100) assigned to each Flashcard representing the User's recall strength
- **Quiz_Session**: A voice-driven interactive session where the AI quizzes the User on Flashcards from a chosen Module
- **Scanner**: The AI component responsible for processing uploaded images into Flashcards
- **Classifier**: The AI component responsible for assigning Flashcards to Modules
- **Quiz_Engine**: The component that drives Quiz_Session logic and scoring
- **Speech_Service**: The ElevenLabs real-time speech integration layer
- **Auth_Service**: The Civic.ai authentication integration layer
- **Image_Service**: The AI component responsible for generating contextual images for quiz questions
- **Image_Quiz**: A text and visual-based quiz session that uses AI-generated images alongside dynamically generated questions

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a User, I want to sign in securely, so that my Flashcards and progress are private and persistent.

#### Acceptance Criteria

1. WHEN a User attempts to access the App without an active session, THE Auth_Service SHALL redirect the User to the Civic.ai authentication flow.
2. WHEN a User completes the Civic.ai authentication flow successfully, THE Auth_Service SHALL create an authenticated session and redirect the User to their dashboard.
3. IF the Civic.ai authentication flow fails, THEN THE Auth_Service SHALL display a descriptive error message and allow the User to retry.
4. WHEN a User signs out, THE Auth_Service SHALL invalidate the session and redirect the User to the sign-in page.

---

### Requirement 2: Image Capture and Flashcard Digitization

**User Story:** As a User, I want to photograph my notes or documents, so that the App can automatically create Flashcards from them.

#### Acceptance Criteria

1. THE App SHALL accept image uploads in JPEG, PNG, and WEBP formats up to 20MB per file.
2. WHEN a User uploads an image, THE Scanner SHALL extract text and identify question/answer pairs from the image using AI vision.
3. WHEN the Scanner completes extraction, THE App SHALL present the extracted Flashcards to the User for review before saving.
4. IF the Scanner cannot extract any recognizable content from an image, THEN THE Scanner SHALL notify the User with a descriptive message and discard the upload.
5. WHEN a User confirms the extracted Flashcards, THE App SHALL persist the Flashcards to the User's account.

---

### Requirement 3: Automatic Topic Classification

**User Story:** As a User, I want my Flashcards sorted into topic Modules automatically, so that I can study by subject without manual organization.

#### Acceptance Criteria

1. WHEN a Flashcard is saved, THE Classifier SHALL assign it to an existing Module whose topic matches the Flashcard content.
2. WHEN no existing Module matches a new Flashcard's content, THE Classifier SHALL create a new Module with an AI-generated topic label and assign the Flashcard to it.
3. THE App SHALL display all Modules on the User's dashboard, each showing the Module name and the count of Flashcards it contains.
4. WHEN a User manually reassigns a Flashcard to a different Module, THE App SHALL update the Flashcard's Module assignment and persist the change.

---

### Requirement 4: Flashcard Management

**User Story:** As a User, I want to view, edit, and delete my Flashcards, so that I can keep my study material accurate and up to date.

#### Acceptance Criteria

1. THE App SHALL display all Flashcards within a selected Module, showing the question side by default.
2. WHEN a User selects a Flashcard, THE App SHALL toggle the display between the question side and the answer side.
3. WHEN a User edits a Flashcard's question or answer text, THE App SHALL validate that neither field is empty and persist the updated content.
4. IF a User submits an edit with an empty question or answer field, THEN THE App SHALL display a validation error and prevent saving.
5. WHEN a User deletes a Flashcard, THE App SHALL remove it from the Module and recalculate the Module's aggregate Knowledge_Score.

---

### Requirement 5: Knowledge Scoring

**User Story:** As a User, I want each Flashcard to have a knowledge score, so that I can identify which topics I need to study more.

#### Acceptance Criteria

1. THE App SHALL initialize each new Flashcard with a Knowledge_Score of 0.
2. WHEN a User answers a Flashcard correctly during a Quiz_Session, THE Quiz_Engine SHALL increase the Flashcard's Knowledge_Score by a value between 1 and 10, proportional to response confidence.
3. WHEN a User answers a Flashcard incorrectly during a Quiz_Session, THE Quiz_Engine SHALL decrease the Flashcard's Knowledge_Score by a value between 1 and 10, proportional to response confidence, with a minimum value of 0.
4. THE App SHALL display the Knowledge_Score for each Flashcard within the Module view.
5. THE App SHALL display a Module-level aggregate score calculated as the mean Knowledge_Score of all Flashcards in the Module.

---

### Requirement 6: Voice Quiz Session

**User Story:** As a User, I want to start a voice-based quiz on a Module, so that I can practice recall hands-free using conversational AI.

#### Acceptance Criteria

1. WHEN a User starts a Quiz_Session for a Module, THE Quiz_Engine SHALL select Flashcards prioritizing those with the lowest Knowledge_Score.
2. WHEN a Quiz_Session begins, THE Speech_Service SHALL greet the User by name and announce the Module topic using real-time synthesized speech.
3. WHILE a Quiz_Session is active, THE Speech_Service SHALL read each Flashcard question aloud and listen for the User's spoken response.
4. WHEN the User speaks a response, THE Quiz_Engine SHALL evaluate the response against the Flashcard answer and update the Knowledge_Score accordingly.
5. WHILE a Quiz_Session is active, THE App SHALL display the current Flashcard with a toggle allowing the User to show or hide the answer side.
6. WHEN a User requests to end the Quiz_Session, THE Quiz_Engine SHALL summarize the session results, including the number of cards reviewed and the Knowledge_Score changes, using synthesized speech.
7. IF the Speech_Service connection is interrupted during a Quiz_Session, THEN THE App SHALL notify the User and offer the option to resume or end the session.

---

### Requirement 7: Interactive Quiz Generator (Duolingo-style)

**User Story:** As a User, I want interactive quiz exercises beyond simple recall, so that I can engage with material in varied ways.

#### Acceptance Criteria

1. WHEN a User starts a Quiz_Session, THE Quiz_Engine SHALL generate at least three exercise types: free recall, multiple choice, and fill-in-the-blank.
2. WHEN generating a multiple-choice question, THE Quiz_Engine SHALL produce exactly four answer options, with one correct answer and three plausible distractors derived from other Flashcards in the same Module.
3. IF a Module contains fewer than four Flashcards, THEN THE Quiz_Engine SHALL generate distractor options using AI rather than sourcing them from existing Flashcards.
4. WHEN a User completes an exercise, THE Quiz_Engine SHALL provide immediate feedback indicating whether the response was correct and display the correct answer.

---

### Requirement 8: Canva Explanation Presentation via MCP

**User Story:** As a User, I want to request a visual explanation presentation for a Flashcard or topic I'm struggling with, so that I can get a clearer understanding through a Canva-generated presentation.

#### Acceptance Criteria

1. WHEN a User indicates they do not understand a Flashcard or topic, THE App SHALL offer an option to generate a "help me understand" presentation for that specific Flashcard or topic.
2. WHEN a User requests a help presentation, THE App SHALL invoke the Canva MCP integration via Civic to generate a presentation explaining the Flashcard or topic.
3. WHEN the Canva MCP integration returns a presentation, THE App SHALL provide the User with a link to view or edit the presentation in Canva.
4. IF the Canva MCP integration returns an error, THEN THE App SHALL notify the User with a descriptive message and allow the User to retry.

---

### Requirement 10: AI Image-Assisted Dynamic Quiz Mode

**User Story:** As a User, I want a text and visual-based quiz mode that shows AI-generated images alongside questions, so that I can reinforce recall through visual association without relying on voice.

#### Acceptance Criteria

1. WHEN a User starts an Image Quiz for a Module, THE Quiz_Engine SHALL generate a quiz question for each selected Flashcard using AI, distinct from the original Flashcard text.
2. WHEN a quiz question is presented, THE Image_Service SHALL generate a contextually relevant image for the question and display it alongside the question text.
3. WHILE an Image Quiz is active, THE App SHALL present questions and accept answers entirely through text-based UI controls, with no voice input or output required.
4. WHEN generating quiz questions, THE Quiz_Engine SHALL adapt subsequent questions based on the User's prior answers within the same session, prioritizing Flashcards with lower Knowledge_Scores.
5. WHEN a User submits an answer, THE Quiz_Engine SHALL evaluate the response against the Flashcard answer, display the correct answer with explanatory feedback, and update the Flashcard's Knowledge_Score.
6. IF THE Image_Service fails to generate an image for a question, THEN THE App SHALL display the question without an image and continue the quiz session uninterrupted.
7. WHEN a User completes an Image Quiz session, THE Quiz_Engine SHALL display a session summary showing the number of questions answered, correct responses, and Knowledge_Score changes.

---

### Requirement 11: UI Technology Constraints

**User Story:** As a developer, I want the UI built with React, Vite, and Tailwind CSS with shadcn/ui components, so that the app has a modern, beautiful, and consistent design foundation across all screens.

#### Acceptance Criteria

1. THE App SHALL implement all screens and UI components using React as the UI framework.
2. THE App SHALL use Tailwind CSS for utility-first styling and shadcn/ui for reusable components.
3. THE App SHALL use the purple accent theme with rounded elements for a modern aesthetic.
4. WHEN a new screen or UI component is added, THE App SHALL use shadcn/ui components (Button, Card, Badge, Progress, Input, Textarea, Spinner) with Tailwind CSS classes.

---

### Requirement 9: Hosting and Performance

**User Story:** As a User, I want the App to load quickly and remain available, so that I can study without interruption.

#### Acceptance Criteria

1. THE App SHALL be deployed on Vercel and serve all pages over HTTPS.
2. WHEN a User navigates to any page, THE App SHALL render the initial content within 3 seconds on a standard broadband connection.
3. WHILE a Quiz_Session is active, THE Speech_Service SHALL deliver synthesized speech with a latency of no more than 1 second from the time a question is triggered.
