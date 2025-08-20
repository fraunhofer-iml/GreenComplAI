# Digital Product Passport UI (dpp-ui)

This project is a web-based user interface for managing and viewing Digital Product Passports (DPP). It appears to be built to interact with Asset Administration Shells (AAS), potentially using a BaSyx backend.

## Tech Stack

*   **React:** A JavaScript library for building user interfaces.
*   **React Router:** For declarative routing in the application.
*   **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.
*   **Material-UI (MUI):** A popular React UI framework for faster and easier web development.


## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   [Node.js](https://nodejs.org/) and npm (Node Package Manager)

### Installation

1.  Clone the repo:
    ```sh
    git clone
    ```
2.  Navigate to the project directory:
    ```sh
    cd dpp-ui
    ```
3.  Install NPM packages:
    ```sh
    npm install
    ```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode on port 3004.
Open [http://localhost:3004](http://localhost:3004) to view it in the browser.

The page will reload if you make edits. You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm build`

Builds the app for production to the `build` folder.
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes. Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Project Structure

*   **`public/`**: Contains the main `index.html` file and static assets like images and logos.
*   **`src/`**: Contains the main application source code.
    *   **`assets/`**: Static assets that are imported into components.
    *   **`components/`**: Reusable React components (e.g., AppBar, SideBar, data panels).
    *   **`css/`**: Global and component-specific CSS files.
    *   **`data/`**: Data models and schemas (e.g., Zod schemas for validation).
    *   **`service/`**: Services for handling API calls and business logic (e.g., `AASService`, `BaSyxFetchService`).
    *   **`util/`**: Utility functions.
    *   **`view/`**: Top-level view components that represent application pages (e.g., `Dashboard`, `LoginView`).
*   **`.env`**: Used for environment-specific variables (e.g., API endpoints). Make a copy named `.env.local` for your local configuration.